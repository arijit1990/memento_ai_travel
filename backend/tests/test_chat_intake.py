"""Phase 4 — /api/chat/intake LLM extractor tests.

Uses real gemini-2.5-flash via emergentintegrations. Each test makes 1 LLM call.
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://journey-screens.preview.emergentagent.com").rstrip("/")
TIMEOUT = 30


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _post_intake(api, messages, current_intake=None):
    return api.post(
        f"{BASE_URL}/api/chat/intake",
        json={"messages": messages, "current_intake": current_intake or {}},
        timeout=TIMEOUT,
    )


# ---------- Dense single-message extraction ----------

def test_intake_dense_message_extracts_all_fields(api):
    messages = [
        {"role": "ai", "content": "Where to?"},
        {
            "role": "user",
            "content": "thinking about a trip to the Amalfi Coast for two of us, mid-October, food lovers, around 3000 dollars",
        },
    ]
    r = _post_intake(api, messages)
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    assert "intake" in body and "next_question" in body and "complete" in body

    intake = body["intake"]
    # Destination should be cleaned (no "trip to the")
    assert "Amalfi" in intake.get("destination", ""), f"destination={intake.get('destination')}"
    assert "trip to" not in intake.get("destination", "").lower()

    # Dates contain October
    assert "october" in intake.get("dates", "").lower(), f"dates={intake.get('dates')}"

    # Group is "2 adults"
    assert "2 adults" in intake.get("group", "").lower() or "couple" in intake.get("group", "").lower(), (
        f"group={intake.get('group')}"
    )

    # Traveler type contains Food Lover
    tt = intake.get("travelerType") or []
    assert any("food" in t.lower() for t in tt), f"travelerType={tt}"

    # Budget mentions 3000 / 3,000
    budget = intake.get("budget", "")
    assert "3000" in budget.replace(",", "") or "3,000" in budget, f"budget={budget}"

    # Should be complete
    assert body["complete"] is True, f"complete={body['complete']}, intake={intake}"


# ---------- Single short message: capitalized + incomplete ----------

def test_intake_single_short_message_kerala(api):
    r = _post_intake(api, [{"role": "user", "content": "kerala"}])
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    intake = body["intake"]
    assert intake.get("destination") == "Kerala", f"destination={intake.get('destination')}"
    assert body["complete"] is False
    assert isinstance(body.get("next_question"), str) and len(body["next_question"]) > 0


# ---------- Multi-turn: carry forward existing intake ----------

def test_intake_multi_turn_carries_forward_destination(api):
    # Turn 2: user only adds group/vibe — destination must stay
    messages = [
        {"role": "ai", "content": "Where to?"},
        {"role": "user", "content": "Goa"},
        {"role": "ai", "content": "Lovely — who are you travelling with?"},
        {"role": "user", "content": "couple, food lovers, March"},
    ]
    current = {
        "destination": "Goa",
        "dates": "Flexible",
        "group": "",
        "travelerType": [],
        "tripType": "City Break",
        "budget": "Flexible",
    }
    r = _post_intake(api, messages, current_intake=current)
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    intake = body["intake"]
    # Destination MUST still be Goa
    assert "goa" in intake.get("destination", "").lower(), f"destination lost: {intake}"
    # New fields populated
    tt = intake.get("travelerType") or []
    assert any("food" in t.lower() for t in tt), f"travelerType={tt}"
    assert "march" in intake.get("dates", "").lower(), f"dates={intake.get('dates')}"


# ---------- Malformed input still returns sane response ----------

def test_intake_empty_messages_handled(api):
    """Empty messages — should return 200 with defaults OR 503 from LLM error path."""
    r = _post_intake(api, [])
    # Accept either 200 (LLM returned defaults) or 502/503 (parse/LLM failure path)
    assert r.status_code in (200, 502, 503), f"Unexpected status: {r.status_code} body={r.text[:300]}"
    if r.status_code == 200:
        body = r.json()
        assert "intake" in body
        assert "complete" in body


def test_intake_gibberish_message_handled(api):
    r = _post_intake(api, [{"role": "user", "content": "asdkjhqwe zxcvbnm 123"}])
    assert r.status_code in (200, 502, 503), f"Unexpected status: {r.status_code}"
    if r.status_code == 200:
        body = r.json()
        # Should not falsely claim complete on gibberish
        assert body["complete"] is False or body["intake"].get("destination", "") == ""


# ---------- Unicode destinations ----------

def test_intake_unicode_destination_tokyo(api):
    r = _post_intake(
        api,
        [{"role": "user", "content": "Tokyo, 日本 for 5 days in cherry blossom season, solo, $4000"}],
    )
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    dest = body["intake"].get("destination", "")
    assert "tokyo" in dest.lower() or "日本" in dest or "japan" in dest.lower(), f"destination={dest}"


def test_intake_unicode_destination_ile_de_re(api):
    r = _post_intake(
        api,
        [{"role": "user", "content": "Île de Ré, couple, summer, mid-range"}],
    )
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    body = r.json()
    dest = body["intake"].get("destination", "")
    # Accept either the unicode form or the ASCII fallback
    assert "ré" in dest.lower() or "re" in dest.lower() or "ile" in dest.lower(), f"destination={dest}"
