"""Iter 4: Rubrik (3-tabel calculator) & Katrol (linear scaling) archive persistence tests.

Both modules are client-side calculators; the only backend touchpoint is
POST /api/archives (type=rubrik|katrol) + GET/DELETE verification.
"""
import pytest

PREFIX = "TEST_ITER4_"


class TestRubrikArchive:
    """POST /api/archives with type=rubrik (3-table markdown) + persistence check"""

    def test_create_rubrik_archive_and_verify(self, base_url, api_client):
        md = (
            "## Rubrik Penilaian — Senam Lantai\n\n"
            "> KKM: 75 · Total Skor Maksimal: 36\n\n"
            "### Tabel 1 — Rubrik Kriteria\n\n"
            "| Aspek | Bobot | Skor 1 (Kurang) | Skor 2 (Cukup) | Skor 3 (Baik) | Skor 4 (Sangat Baik) |\n|---|---|---|---|---|---|\n"
            "| Ketepatan Gerakan | 2 | a | b | c | d |\n\n"
            "### Tabel 2 — Lembar Penilaian Kelompok\n\n"
            "| Kelompok | Anggota | Total Skor Bobot | Nilai | Predikat | Status KKM |\n|---|---|---|---|---|---|\n"
            "| Kelompok 1 | 2 | 27/36 | 75 | C · Cukup | LULUS |\n\n"
            "### Tabel 3 — Rekap Nilai Akhir Individu\n\n"
            "| No | Nama | Kelompok | Nilai Kelompok | Nilai Individu | Nilai Akhir | Status |\n|---|---|---|---|---|---|---|\n"
            "| 1 | Andi | Kelompok 1 | 75 | 80 | 76.5 | LULUS |"
        )
        payload = {"type": "rubrik", "title": f"{PREFIX}Rubrik Senam", "markdown": md, "meta": {"show_kop": False}}
        r = api_client.post(f"{base_url}/api/archives", json=payload)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert "id" in data and "_id" not in data
        assert data["type"] == "rubrik"

        # GET to verify persistence
        g = api_client.get(f"{base_url}/api/archives/{data['id']}")
        assert g.status_code == 200
        doc = g.json()
        assert "Tabel 1 — Rubrik Kriteria" in doc["markdown"]
        assert "Tabel 2 — Lembar Penilaian Kelompok" in doc["markdown"]
        assert "Tabel 3 — Rekap Nilai Akhir Individu" in doc["markdown"]
        assert "27/36" in doc["markdown"] and "76.5" in doc["markdown"]

        # List filter by type=rubrik must include it
        l = api_client.get(f"{base_url}/api/archives?type=rubrik")
        assert l.status_code == 200
        assert any(a["id"] == data["id"] for a in l.json())

        # Cleanup (soft delete) → GET should 404
        d = api_client.delete(f"{base_url}/api/archives/{data['id']}")
        assert d.status_code == 200
        g2 = api_client.get(f"{base_url}/api/archives/{data['id']}")
        assert g2.status_code == 404


class TestKatrolArchive:
    """POST /api/archives with type=katrol (param table + rata-rata row) + persistence check"""

    def test_create_katrol_archive_and_verify(self, base_url, api_client):
        md = (
            "## Hasil Katrol Nilai (Linear Scaling)\n\n"
            "| Parameter | Nilai |\n|---|---|\n"
            "| Nilai Asli Terkecil | 40 |\n"
            "| Nilai Asli Terbesar | 85 |\n"
            "| Target Nilai Min (KKM) | 75 |\n"
            "| Target Nilai Max | 100 |\n\n"
            "| No | Nilai Asli | Nilai Katrol |\n|---|---|---|\n"
            "| 1 | 40 | 75 |\n| 2 | 55 | 83.3 |\n| 3 | 60 | 86.1 |\n| 4 | 72 | 92.8 |\n| 5 | 85 | 100 |\n"
            "|  | **Rata-Rata Kelas** | **87.4** |"
        )
        payload = {"type": "katrol", "title": f"{PREFIX}Katrol Nilai (5 data)", "markdown": md, "meta": {"show_kop": False}}
        r = api_client.post(f"{base_url}/api/archives", json=payload)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert data["type"] == "katrol"

        g = api_client.get(f"{base_url}/api/archives/{data['id']}")
        assert g.status_code == 200
        doc = g.json()
        assert "Rata-Rata Kelas" in doc["markdown"]
        assert "87.4" in doc["markdown"]
        assert "Nilai Asli Terkecil | 40" in doc["markdown"]

        l = api_client.get(f"{base_url}/api/archives?type=katrol")
        assert any(a["id"] == data["id"] for a in l.json())

        api_client.delete(f"{base_url}/api/archives/{data['id']}")
        assert api_client.get(f"{base_url}/api/archives/{data['id']}").status_code == 404


class TestHealth:
    """Sanity: API root still healthy"""

    def test_root(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert "PJOK" in r.json().get("message", "")
