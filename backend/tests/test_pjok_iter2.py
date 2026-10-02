"""Iteration 2 regression tests for PJOK Super-App.

Covers only the NEW endpoints/features added in iteration 2:
  * GET /api/profile -> has_logo boolean
  * POST/GET/DELETE /api/profile/logo (object storage)
  * Logo-embedded exports: POST /api/generate/modul-ajar + /archives/{id}/export?format=docx|pdf
  * Journals CRUD (POST/GET/PUT/DELETE) with soft-delete + tanggal desc sort
  * PUT /api/classes/{id} replaces students (Edit Siswa)
  * GET /api/classes/{id}/recap math correctness
  * Malformed ObjectId on journals/classes/archives returns 400 (not 500)
"""
import io
import os
import struct
import uuid
import zlib
import pytest
import requests


# ---------------------------------------------------------------- helpers
def _tiny_png_bytes() -> bytes:
    """Return a valid minimal 1x1 PNG byte string (89 bytes)."""
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(ctype: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + ctype
            + data
            + struct.pack(">I", zlib.crc32(ctype + data) & 0xFFFFFFFF)
        )

    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"  # 1 scanline filter byte + RGB
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------------------------------------------------------------- profile logo
class TestProfileLogo:
    def test_profile_has_logo_flag_present(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/profile")
        assert r.status_code == 200
        d = r.json()
        assert "has_logo" in d, "GET /api/profile must include has_logo boolean"
        assert isinstance(d["has_logo"], bool)

    def test_logo_upload_get_delete_cycle(self, base_url):
        png = _tiny_png_bytes()
        # Upload
        up = requests.post(
            f"{base_url}/api/profile/logo",
            files={"file": ("logo.png", png, "image/png")},
            timeout=60,
        )
        assert up.status_code == 200, up.text
        assert up.json().get("ok") is True

        # has_logo should flip to True
        g = requests.get(f"{base_url}/api/profile", timeout=30)
        assert g.status_code == 200
        assert g.json().get("has_logo") is True

        # Download logo
        got = requests.get(f"{base_url}/api/profile/logo", timeout=60)
        assert got.status_code == 200
        assert got.content[:8] == b"\x89PNG\r\n\x1a\n", "stored content must be PNG"
        assert got.headers.get("content-type", "").startswith("image/")

        # Delete
        d = requests.delete(f"{base_url}/api/profile/logo", timeout=30)
        assert d.status_code == 200

        # has_logo should flip back
        g2 = requests.get(f"{base_url}/api/profile", timeout=30)
        assert g2.json().get("has_logo") is False

        # GET after delete -> 404
        g3 = requests.get(f"{base_url}/api/profile/logo", timeout=30)
        assert g3.status_code == 404

    def test_logo_oversize_rejected(self, base_url):
        big = b"x" * (5 * 1024 * 1024 + 100)
        r = requests.post(
            f"{base_url}/api/profile/logo",
            files={"file": ("big.png", big, "image/png")},
            timeout=120,
        )
        assert r.status_code == 400, r.text


# ---------------------------------------------------------------- export with embedded logo
class TestLogoEmbeddedExport:
    """One AI call -> both docx+pdf exports verified."""

    def test_modul_ajar_with_logo_embedded_in_exports(self, api_client, base_url):
        # Ensure a profile with kop fields + logo exists
        api_client.put(
            f"{base_url}/api/profile",
            json={
                "nama_guru": "TEST Logo Guru",
                "nip_guru": "19800101",
                "nama_sekolah": "SMPN TEST LOGO",
                "npsn": "99999999",
                "dinas": "DINAS TEST LOGO",
                "alamat_sekolah": "Jl TEST Logo",
                "tahun_ajaran": "2025/2026",
            },
        )
        up = requests.post(
            f"{base_url}/api/profile/logo",
            files={"file": ("logo.png", _tiny_png_bytes(), "image/png")},
            timeout=60,
        )
        assert up.status_code == 200, up.text

        body = {
            "jenjang": "SMP",
            "fase": "Fase D - Kelas 8",
            "materi": "TEST Logo Embed - Senam Lantai",
            "durasi": "2",
            "semester": "Ganjil",
        }
        r = api_client.post(f"{base_url}/api/generate/modul-ajar", json=body, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("meta", {}).get("logo") is True, "meta.logo must be true when logo exists"
        aid = d["id"]

        docx = requests.get(
            f"{base_url}/api/archives/{aid}/export", params={"format": "docx"}, timeout=120
        )
        assert docx.status_code == 200
        assert "wordprocessingml" in docx.headers.get("content-type", "")
        assert docx.content[:2] == b"PK"
        assert len(docx.content) > 2000

        pdf = requests.get(
            f"{base_url}/api/archives/{aid}/export", params={"format": "pdf"}, timeout=120
        )
        assert pdf.status_code == 200
        assert pdf.headers.get("content-type", "").startswith("application/pdf")
        assert pdf.content[:4] == b"%PDF"
        assert len(pdf.content) > 2000

        # cleanup
        api_client.delete(f"{base_url}/api/archives/{aid}")
        requests.delete(f"{base_url}/api/profile/logo", timeout=30)


# ---------------------------------------------------------------- journals CRUD
class TestJournalsCRUD:
    def test_journal_crud_and_sort_and_soft_delete(self, api_client, base_url):
        # Create 2 journals with different tanggal to verify sort
        j_old = api_client.post(
            f"{base_url}/api/journals",
            json={
                "tanggal": "2026-01-05",
                "nama_kelas": "TEST 8A",
                "materi": "TEST Older",
                "kegiatan": "warmup",
                "catatan": "ok",
            },
        )
        assert j_old.status_code == 200
        j_old = j_old.json()
        assert j_old.get("id")

        j_new = api_client.post(
            f"{base_url}/api/journals",
            json={
                "tanggal": "2026-01-20",
                "nama_kelas": "TEST 8A",
                "materi": "TEST Newer",
                "kegiatan": "praktik",
                "catatan": "mantap",
            },
        )
        assert j_new.status_code == 200
        j_new = j_new.json()

        # List: sort by tanggal desc
        lst = api_client.get(f"{base_url}/api/journals").json()
        ids = [j["id"] for j in lst]
        assert j_old["id"] in ids and j_new["id"] in ids
        # find positions
        pos_new = ids.index(j_new["id"])
        pos_old = ids.index(j_old["id"])
        assert pos_new < pos_old, f"newer tanggal must sort first, got new@{pos_new} old@{pos_old}"

        # Update
        upd = api_client.put(
            f"{base_url}/api/journals/{j_new['id']}",
            json={
                "tanggal": "2026-01-20",
                "nama_kelas": "TEST 8A",
                "materi": "TEST Newer UPDATED",
                "kegiatan": "praktik",
                "catatan": "mantap-upd",
            },
        )
        assert upd.status_code == 200
        assert upd.json().get("materi") == "TEST Newer UPDATED"

        # Soft delete j_new
        d = api_client.delete(f"{base_url}/api/journals/{j_new['id']}")
        assert d.status_code == 200
        lst2 = api_client.get(f"{base_url}/api/journals").json()
        assert j_new["id"] not in [j["id"] for j in lst2], "deleted journal must disappear"
        assert j_old["id"] in [j["id"] for j in lst2]

        # cleanup
        api_client.delete(f"{base_url}/api/journals/{j_old['id']}")


# ---------------------------------------------------------------- edit siswa
class TestEditSiswa:
    def test_put_class_replaces_students(self, api_client, base_url):
        cr = api_client.post(
            f"{base_url}/api/classes",
            json={
                "nama_kelas": f"TEST EditSiswa {uuid.uuid4().hex[:6]}",
                "jenjang": "SMP",
                "fase": "Fase D",
                "tahun_ajaran": "2025/2026",
                "students": [
                    {"nama": "TEST Andi", "no_absen": "1"},
                    {"nama": "TEST Budi", "no_absen": "2"},
                    {"nama": "TEST Citra", "no_absen": "3"},
                ],
            },
        )
        assert cr.status_code == 200
        c = cr.json()
        cid = c["id"]

        new_students = [
            {"nama": "TEST Dewi", "no_absen": "1"},
            {"nama": "TEST Eka", "no_absen": "2"},
        ]
        put = api_client.put(
            f"{base_url}/api/classes/{cid}",
            json={
                "nama_kelas": c["nama_kelas"],
                "jenjang": "SMP",
                "fase": "Fase D",
                "tahun_ajaran": "2025/2026",
                "students": new_students,
            },
        )
        assert put.status_code == 200
        got = api_client.get(f"{base_url}/api/classes/{cid}").json()
        assert len(got["students"]) == 2, f"students must be replaced, got {got['students']}"
        names = sorted([s["nama"] for s in got["students"]])
        assert names == ["TEST Dewi", "TEST Eka"]

        api_client.delete(f"{base_url}/api/classes/{cid}")


# ---------------------------------------------------------------- recap math
class TestRecap:
    def test_recap_math_and_shape(self, api_client, base_url):
        # Create class with 2 students
        cr = api_client.post(
            f"{base_url}/api/classes",
            json={
                "nama_kelas": f"TEST Recap {uuid.uuid4().hex[:6]}",
                "students": [
                    {"nama": "TEST Rina", "no_absen": "1"},
                    {"nama": "TEST Sari", "no_absen": "2"},
                ],
            },
        )
        c = cr.json()
        cid = c["id"]

        # Session 1: Rina H, Sari S
        s1 = api_client.post(
            f"{base_url}/api/classes/{cid}/attendance",
            json={
                "tanggal": "2026-01-10",
                "materi": "s1",
                "records": [
                    {"nama": "TEST Rina", "status": "H"},
                    {"nama": "TEST Sari", "status": "S"},
                ],
            },
        )
        assert s1.status_code == 200
        # Session 2: Rina A, Sari S
        s2 = api_client.post(
            f"{base_url}/api/classes/{cid}/attendance",
            json={
                "tanggal": "2026-01-12",
                "materi": "s2",
                "records": [
                    {"nama": "TEST Rina", "status": "A"},
                    {"nama": "TEST Sari", "status": "S"},
                ],
            },
        )
        assert s2.status_code == 200

        rec = api_client.get(f"{base_url}/api/classes/{cid}/recap")
        assert rec.status_code == 200
        d = rec.json()
        assert d["total_sessions"] == 2
        assert d["class_name"] == c["nama_kelas"]
        assert "students" in d and len(d["students"]) == 2

        rina = next(s for s in d["students"] if s["nama"] == "TEST Rina")
        sari = next(s for s in d["students"] if s["nama"] == "TEST Sari")

        # Rina: 1 H out of 2 -> 50
        assert rina["counts"] == {"H": 1, "S": 0, "I": 0, "A": 1, "K3": 0}, rina
        assert rina["hadir"] == 1
        assert rina["total"] == 2
        assert rina["hadir_pct"] == 50

        # Sari: 0 H out of 2 -> 0
        assert sari["counts"] == {"H": 0, "S": 2, "I": 0, "A": 0, "K3": 0}, sari
        assert sari["hadir_pct"] == 0

        api_client.delete(f"{base_url}/api/classes/{cid}")

    def test_recap_zero_sessions(self, api_client, base_url):
        cr = api_client.post(
            f"{base_url}/api/classes",
            json={
                "nama_kelas": f"TEST RecapZero {uuid.uuid4().hex[:6]}",
                "students": [{"nama": "TEST X", "no_absen": "1"}],
            },
        )
        cid = cr.json()["id"]
        d = api_client.get(f"{base_url}/api/classes/{cid}/recap").json()
        assert d["total_sessions"] == 0
        assert d["students"][0]["hadir_pct"] == 0
        api_client.delete(f"{base_url}/api/classes/{cid}")


# ---------------------------------------------------------------- malformed id -> 400
class TestMalformedIds:
    MALFORMED = "not-a-valid-id"

    def test_journal_update_malformed(self, api_client, base_url):
        r = api_client.put(
            f"{base_url}/api/journals/{self.MALFORMED}",
            json={"tanggal": "2026-01-01"},
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    def test_journal_delete_malformed(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/journals/{self.MALFORMED}")
        assert r.status_code == 400

    def test_class_get_malformed(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/classes/{self.MALFORMED}")
        assert r.status_code == 400

    def test_class_update_malformed(self, api_client, base_url):
        r = api_client.put(
            f"{base_url}/api/classes/{self.MALFORMED}",
            json={"nama_kelas": "x", "students": []},
        )
        assert r.status_code == 400

    def test_class_delete_malformed(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/classes/{self.MALFORMED}")
        assert r.status_code == 400

    def test_class_recap_malformed(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/classes/{self.MALFORMED}/recap")
        assert r.status_code == 400

    def test_class_attendance_malformed(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/classes/{self.MALFORMED}/attendance",
            json={"tanggal": "2026-01-01", "materi": "", "records": []},
        )
        assert r.status_code == 400

    def test_archive_get_malformed(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/archives/{self.MALFORMED}")
        assert r.status_code == 400

    def test_archive_export_malformed(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/archives/{self.MALFORMED}/export")
        assert r.status_code == 400

    def test_archive_delete_malformed(self, api_client, base_url):
        r = api_client.delete(f"{base_url}/api/archives/{self.MALFORMED}")
        assert r.status_code == 400
