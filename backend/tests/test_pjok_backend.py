"""Backend regression tests for PJOK Super-App.

Covers: health, profile (GET/PUT), AI generation (modul-ajar/soal/rubrik/kktp),
classes CRUD (soft delete), attendance (auto-resolve + K3 warnings),
archives (list/get/create/delete), export (pdf/docx/xlsx).
"""
import io
import os
import uuid
import pytest
import requests


# ---------------------------------------------------------------- health
class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("model") == "claude-sonnet-5-5"


# ---------------------------------------------------------------- profile
class TestProfile:
    def test_put_then_get_profile(self, api_client, base_url):
        payload = {
            "nama_guru": "TEST Budi Santoso",
            "nip_guru": "19800101",
            "nama_sekolah": "SMPN TEST 1",
            "npsn": "12345678",
            "dinas": "DINAS PENDIDIKAN TEST",
            "alamat_sekolah": "Jl. TEST No.1",
            "tahun_ajaran": "2025/2026",
        }
        r = api_client.put(f"{base_url}/api/profile", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["nama_guru"] == payload["nama_guru"]

        g = api_client.get(f"{base_url}/api/profile")
        assert g.status_code == 200
        got = g.json()
        for k, v in payload.items():
            assert got.get(k) == v, f"Field {k} not persisted"


# ---------------------------------------------------------------- AI generation
# Note: each endpoint is called exactly once to minimize credit use.
class TestGenerateModulAjar:
    def test_generate_modul_ajar(self, api_client, base_url):
        body = {
            "jenjang": "SMP",
            "fase": "Fase D - Kelas 8",
            "materi": "TEST Bola Voli - Passing Bawah",
            "durasi": "3",
            "semester": "Ganjil",
        }
        r = api_client.post(f"{base_url}/api/generate/modul-ajar", json=body, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("id")
        assert d.get("title", "").startswith("Modul Ajar")
        assert d.get("markdown"), "markdown must not be empty"
        assert len(d["markdown"]) > 100
        assert d.get("meta", {}).get("show_kop") is True
        pytest.generated_modul_id = d["id"]


class TestGenerateSoal:
    def test_generate_soal(self, api_client, base_url):
        body = {
            "jenjang": "SMP",
            "fase": "Fase D",
            "topik": "TEST Permainan Bola Besar",
            "jumlah": "3",
            "level": "LOTS",
            "bentuk": "Pilihan Ganda",
        }
        r = api_client.post(f"{base_url}/api/generate/soal", json=body, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["meta"].get("show_kop") is True
        assert d["meta"].get("show_identitas_siswa") is True
        assert "Naskah Soal" in d["title"]
        assert d.get("markdown")


class TestGenerateRubrik:
    def test_generate_rubrik(self, api_client, base_url):
        body = {"jenjang": "SMP", "cabang": "TEST Sepak Bola"}
        r = api_client.post(f"{base_url}/api/generate/rubrik", json=body, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["meta"].get("show_kop") is False
        # Tables expected in rubrik markdown
        assert "|" in d["markdown"], "rubrik markdown should contain tables"


class TestGenerateKKTP:
    def test_generate_kktp(self, api_client, base_url):
        body = {"jenjang": "SMP", "fase": "Fase D", "cp": "TEST Elemen Keterampilan Gerak"}
        r = api_client.post(f"{base_url}/api/generate/kktp", json=body, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["meta"].get("show_kop") is False
        assert d.get("markdown")


# ---------------------------------------------------------------- classes CRUD
class TestClassesCRUD:
    @pytest.fixture(scope="class")
    def created_class(self, api_client, base_url):
        body = {
            "nama_kelas": f"TEST Kelas 8A {uuid.uuid4().hex[:6]}",
            "jenjang": "SMP",
            "fase": "Fase D",
            "tahun_ajaran": "2025/2026",
            "students": [
                {"nama": "TEST Andi", "no_absen": "1"},
                {"nama": "TEST Budi", "no_absen": "2"},
                {"nama": "TEST Citra", "no_absen": "3"},
            ],
        }
        r = api_client.post(f"{base_url}/api/classes", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("id")
        assert d["nama_kelas"] == body["nama_kelas"]
        assert len(d["students"]) == 3
        yield d
        # cleanup soft delete
        api_client.delete(f"{base_url}/api/classes/{d['id']}")

    def test_list_classes_includes_created(self, api_client, base_url, created_class):
        r = api_client.get(f"{base_url}/api/classes")
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert created_class["id"] in ids

    def test_get_class(self, api_client, base_url, created_class):
        r = api_client.get(f"{base_url}/api/classes/{created_class['id']}")
        assert r.status_code == 200
        assert r.json()["nama_kelas"] == created_class["nama_kelas"]

    def test_update_class(self, api_client, base_url, created_class):
        updated = {
            "nama_kelas": created_class["nama_kelas"] + " (Updated)",
            "jenjang": "SMP",
            "fase": "Fase D",
            "tahun_ajaran": "2025/2026",
            "students": created_class["students"],
        }
        r = api_client.put(f"{base_url}/api/classes/{created_class['id']}", json=updated)
        assert r.status_code == 200
        g = api_client.get(f"{base_url}/api/classes/{created_class['id']}")
        assert g.json()["nama_kelas"].endswith("(Updated)")

    def test_soft_delete_class(self, api_client, base_url):
        # create a throwaway class to delete here
        body = {"nama_kelas": f"TEST Delete {uuid.uuid4().hex[:6]}", "students": []}
        c = api_client.post(f"{base_url}/api/classes", json=body).json()
        cid = c["id"]
        d = api_client.delete(f"{base_url}/api/classes/{cid}")
        assert d.status_code == 200
        g = api_client.get(f"{base_url}/api/classes/{cid}")
        assert g.status_code == 404
        lst = api_client.get(f"{base_url}/api/classes").json()
        assert cid not in [c["id"] for c in lst]


# ---------------------------------------------------------------- attendance
class TestAttendance:
    @pytest.fixture(scope="class")
    def cls(self, api_client, base_url):
        body = {"nama_kelas": f"TEST ATT {uuid.uuid4().hex[:6]}", "students": []}
        c = api_client.post(f"{base_url}/api/classes", json=body).json()
        yield c
        api_client.delete(f"{base_url}/api/classes/{c['id']}")

    def test_attendance_auto_resolution(self, api_client, base_url, cls):
        payload = {
            "tanggal": "2026-01-15",
            "materi": "TEST Bola Voli",
            "records": [
                {"nama": "Andi", "no_absen": "1", "status": ""},            # empty -> H + konfirmasi
                {"nama": "Budi", "no_absen": "2", "status": "S"},           # sakit -> warning
                {"nama": "Citra", "no_absen": "3", "status": "K3"},         # K3 -> warning
                {"nama": "Dewi", "no_absen": "4", "status": "H"},
                {"nama": "Eka", "no_absen": "5", "status": "A"},
                {"nama": "Fajar", "no_absen": "6", "status": "I"},
            ],
        }
        r = api_client.post(f"{base_url}/api/classes/{cls['id']}/attendance", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        # Summary counts
        summ = d.get("summary", {})
        assert summ.get("H") == 2, f"H count expected 2 (incl auto), got {summ}"
        assert summ.get("S") == 1
        assert summ.get("K3") == 1
        assert summ.get("A") == 1
        assert summ.get("I") == 1

        # Warnings for S & K3
        warnings = d.get("warnings", [])
        assert len(warnings) == 2, warnings
        joined = " | ".join(warnings)
        assert "Budi" in joined and "Citra" in joined
        assert "DIBERIKAN TUGAS AMATAN TEORI" in joined

        # Record fields
        andi = next(r for r in d["records"] if r["nama"] == "Andi")
        assert andi["status"] == "H"
        assert "Perlu Konfirmasi Guru" in andi["note"]
        budi = next(r for r in d["records"] if r["nama"] == "Budi")
        assert "DIBERIKAN TUGAS AMATAN TEORI" in budi["note"]
        citra = next(r for r in d["records"] if r["nama"] == "Citra")
        assert "DIBERIKAN TUGAS AMATAN TEORI" in citra["note"]

    def test_list_attendance(self, api_client, base_url, cls):
        r = api_client.get(f"{base_url}/api/classes/{cls['id']}/attendance")
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert len(lst) >= 1

    def test_attendance_class_not_found(self, api_client, base_url):
        # use a valid-looking but non-existent ObjectId
        fake = "507f1f77bcf86cd799439011"
        r = api_client.post(
            f"{base_url}/api/classes/{fake}/attendance",
            json={"tanggal": "2026-01-01", "materi": "x", "records": []},
        )
        assert r.status_code == 404


# ---------------------------------------------------------------- archives + export
class TestArchivesAndExport:
    @pytest.fixture(scope="class")
    def arch(self, api_client, base_url):
        body = {
            "type": "custom",
            "title": "TEST Arsip Export",
            "markdown": (
                "## A. Judul\n\nParagraf uji.\n\n"
                "| No | Nama | Nilai |\n|---|---|---|\n| 1 | Andi | 90 |\n| 2 | Budi | 85 |\n"
            ),
            "meta": {
                "show_kop": True, "dinas": "DINAS TEST", "nama_sekolah": "SMPN TEST",
                "alamat_sekolah": "Jl TEST", "npsn": "111", "nama_guru": "TEST",
                "tahun_ajaran": "2025/2026", "kelas_fase": "VIII", "materi": "Uji",
                "semester": "Ganjil",
            },
        }
        r = api_client.post(f"{base_url}/api/archives", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        yield d
        api_client.delete(f"{base_url}/api/archives/{d['id']}")

    def test_list_archives(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives")
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert arch["id"] in ids

    def test_list_archives_filter_type(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives", params={"type": "custom"})
        assert r.status_code == 200
        for a in r.json():
            assert a["type"] == "custom"

    def test_get_archive(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives/{arch['id']}")
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Arsip Export"

    def test_export_pdf(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives/{arch['id']}/export", params={"format": "pdf"})
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_export_docx(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives/{arch['id']}/export", params={"format": "docx"})
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "wordprocessingml" in ct
        # docx is a zip
        assert r.content[:2] == b"PK"

    def test_export_xlsx(self, api_client, base_url, arch):
        r = api_client.get(f"{base_url}/api/archives/{arch['id']}/export", params={"format": "xlsx"})
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct
        assert r.content[:2] == b"PK"

    def test_soft_delete_archive(self, api_client, base_url):
        body = {"type": "tmp", "title": "TEST tmp", "markdown": "x", "meta": {}}
        a = api_client.post(f"{base_url}/api/archives", json=body).json()
        d = api_client.delete(f"{base_url}/api/archives/{a['id']}")
        assert d.status_code == 200
        g = api_client.get(f"{base_url}/api/archives/{a['id']}")
        assert g.status_code == 404

    def test_get_archive_not_found(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/archives/507f1f77bcf86cd799439011")
        assert r.status_code == 404
