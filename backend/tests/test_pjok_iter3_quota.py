"""Iteration 3 — Verify generate_markdown now maps LLM quota/budget errors to HTTP 402
with the exact Indonesian 'saldo habis' message, instead of the old generic 503.

EMERGENT_LLM_KEY budget is intentionally exhausted during this test iteration, so
every /api/generate/* endpoint should hit the quota branch and return 402.
"""
import pytest
import requests


EXPECTED_MSG = (
    "Saldo AI (Universal Key) habis. Buka Profile \u2192 Manage plan "
    "\u2192 Universal Key \u2192 Add Balance untuk menambah saldo, lalu coba lagi."
)


def _assert_quota_response(resp: requests.Response, endpoint: str):
    assert resp.status_code == 402, (
        f"{endpoint}: expected 402 (quota exhausted), got {resp.status_code}. "
        f"Body: {resp.text[:400]}"
    )
    body = resp.json()
    detail = body.get("detail", "")
    assert detail == EXPECTED_MSG, (
        f"{endpoint}: expected exact Indonesian saldo-habis message. "
        f"Got detail={detail!r}"
    )


class TestAIQuotaErrorMapping:
    """Each generator must return 402 + exact Indonesian saldo-habis detail."""

    def test_generate_modul_ajar_returns_402_quota(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/generate/modul-ajar",
            json={
                "jenjang": "SMP",
                "fase": "Fase D",
                "materi": "TEST Quota Sepak Bola",
                "durasi": "2",
                "semester": "Ganjil",
            },
            timeout=120,
        )
        _assert_quota_response(r, "POST /api/generate/modul-ajar")

    def test_generate_soal_returns_402_quota(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/generate/soal",
            json={
                "jenjang": "SMP",
                "fase": "Fase D",
                "topik": "TEST Quota Bola Voli",
                "jumlah": "5",
                "level": "C2",
                "bentuk": "PG",
            },
            timeout=120,
        )
        _assert_quota_response(r, "POST /api/generate/soal")

    def test_generate_rubrik_returns_402_quota(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/generate/rubrik",
            json={"jenjang": "SMP", "cabang": "TEST Quota Senam"},
            timeout=120,
        )
        _assert_quota_response(r, "POST /api/generate/rubrik")

    def test_generate_kktp_returns_402_quota(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/generate/kktp",
            json={"jenjang": "SMP", "fase": "Fase D", "cp": "TEST Quota CP"},
            timeout=120,
        )
        _assert_quota_response(r, "POST /api/generate/kktp")

    def test_at_least_one_generator_returns_402(self, api_client, base_url):
        """Guard-rail: review_request says 'Verify at least one generator returns 402'."""
        r = api_client.post(
            f"{base_url}/api/generate/rubrik",
            json={"jenjang": "SMA", "cabang": "TEST Guardrail"},
            timeout=120,
        )
        assert r.status_code == 402
        assert "Saldo AI" in r.json().get("detail", "")
