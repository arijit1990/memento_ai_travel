"""Memento Phase-2 backend regression tests.

Covers:
- Health endpoint
- Auth: /auth/me unauthenticated, /auth/session bogus, /auth/logout idempotent, /auth/me with seeded session
- Trips: generate (LLM, long timeout), list, get (own/wrong/non-existent), delete
"""

import os
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://journey-screens.preview.emergentagent.com").rstrip("/")
GUEST_SESSION_ID = f"guest_test_{uuid.uuid4().hex[:8]}"
LLM_TIMEOUT = 120  # seconds


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def seeded_session():
    """Seed a user + session_token directly into mongo using mongosh."""
    user_id = f"test-user-{int(time.time())}"
    token = f"test_session_{uuid.uuid4().hex}"
    email = f"test.user.{int(time.time())}@example.com"
    js = f"""
    use('test_database');
    db.users.insertOne({{
      user_id: '{user_id}',
      email: '{email}',
      name: 'Test User',
      picture: 'https://via.placeholder.com/150',
      created_at: new Date().toISOString()
    }});
    db.user_sessions.insertOne({{
      user_id: '{user_id}',
      session_token: '{token}',
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      created_at: new Date().toISOString()
    }});
    """
    res = subprocess.run(["mongosh", "--quiet", "--eval", js], capture_output=True, text=True, timeout=15)
    assert res.returncode == 0, f"mongosh seed failed: {res.stderr}"
    yield {"user_id": user_id, "token": token, "email": email}
    # cleanup
    cleanup = f"""
    use('test_database');
    db.users.deleteOne({{user_id: '{user_id}'}});
    db.user_sessions.deleteMany({{user_id: '{user_id}'}});
    db.trips.deleteMany({{user_id: '{user_id}'}});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", cleanup], capture_output=True, text=True, timeout=15)


# ---------- Health ----------

def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json() == {"message": "Memento API"}


# ---------- Auth ----------

def test_auth_me_unauthenticated(api):
    r = api.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_auth_session_bogus(api):
    r = api.post(f"{BASE_URL}/api/auth/session", json={"session_id": "bogus-id-xyz"})
    assert r.status_code == 401


def test_auth_logout_idempotent(api):
    r = api.post(f"{BASE_URL}/api/auth/logout")
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_auth_me_with_seeded_session(api, seeded_session):
    r = api.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {seeded_session['token']}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == seeded_session["user_id"]
    assert body["email"] == seeded_session["email"]


# ---------- Trips: list (guest) empty initially ----------

def test_trips_list_guest_empty(api):
    r = api.get(f"{BASE_URL}/api/trips", params={"guest_session_id": GUEST_SESSION_ID})
    assert r.status_code == 200
    assert r.json() == {"trips": []}


# ---------- Trip generation (LLM) — long timeout ----------

@pytest.fixture(scope="session")
def generated_trip(api):
    payload = {
        "intake": {
            "destination": "Lisbon, Portugal",
            "dates": "Apr 12-16, 2026",
            "group": "2 adults",
            "travelerType": ["Food Lover"],
            "tripType": "City Break",
            "budget": "$2,500",
        },
        "guest_session_id": GUEST_SESSION_ID,
    }
    r = api.post(f"{BASE_URL}/api/trips/generate", json=payload, timeout=LLM_TIMEOUT)
    return r


def test_generate_trip_status(generated_trip):
    if generated_trip.status_code == 503:
        pytest.fail(f"LLM unavailable (likely budget exceeded on EMERGENT_LLM_KEY): {generated_trip.text[:300]}")
    assert generated_trip.status_code == 200, generated_trip.text[:500]


def test_generate_trip_schema(generated_trip):
    if generated_trip.status_code != 200:
        pytest.skip("trip not generated")
    body = generated_trip.json()
    assert "trip_id" in body
    assert "trip" in body
    t = body["trip"]
    for k in ["title", "destination", "startDate", "endDate", "duration", "days", "smartHacks", "centerLat", "centerLng"]:
        assert k in t, f"missing field: {k}"
    assert isinstance(t["days"], list) and len(t["days"]) > 0
    # Validate first day's first activity has required fields
    a = t["days"][0]["activities"][0]
    for k in ["time", "duration", "title", "category", "location", "lat", "lng", "cost", "icon"]:
        assert k in a, f"activity missing field: {k}"


def test_trips_list_after_generate(api, generated_trip):
    if generated_trip.status_code != 200:
        pytest.skip("trip not generated")
    trip_id = generated_trip.json()["trip_id"]
    r = api.get(f"{BASE_URL}/api/trips", params={"guest_session_id": GUEST_SESSION_ID})
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()["trips"]]
    assert trip_id in ids


def test_get_trip_by_id_success(api, generated_trip):
    if generated_trip.status_code != 200:
        pytest.skip("trip not generated")
    trip_id = generated_trip.json()["trip_id"]
    r = api.get(f"{BASE_URL}/api/trips/{trip_id}", params={"guest_session_id": GUEST_SESSION_ID})
    assert r.status_code == 200
    body = r.json()
    assert body.get("id") == trip_id


def test_get_trip_wrong_guest_id(api, generated_trip):
    if generated_trip.status_code != 200:
        pytest.skip("trip not generated")
    trip_id = generated_trip.json()["trip_id"]
    r = api.get(f"{BASE_URL}/api/trips/{trip_id}", params={"guest_session_id": "wrong-guest-id-xyz"})
    assert r.status_code == 403


def test_get_trip_non_existent(api):
    r = api.get(f"{BASE_URL}/api/trips/non-existent")
    assert r.status_code == 404


# ---------- Phase 2.1: Bearer-token (Authorization header) flows ----------

def test_trips_list_authed_bearer(api, seeded_session):
    """GET /api/trips with Authorization: Bearer <token> returns user's trips list (initially empty)."""
    r = api.get(
        f"{BASE_URL}/api/trips",
        headers={"Authorization": f"Bearer {seeded_session['token']}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "trips" in body
    assert isinstance(body["trips"], list)


def test_generate_trip_authed_bearer(api, seeded_session):
    """POST /api/trips/generate with Bearer header — trip is associated with that user_id.

    Then GET /api/trips with the same Bearer token must include the new trip.
    """
    payload = {
        "intake": {
            "destination": "Lisbon, Portugal",
            "dates": "Apr 12-16, 2026",
            "group": "2 adults",
            "travelerType": ["Food Lover"],
            "tripType": "City Break",
            "budget": "$2,500",
        }
    }
    r = api.post(
        f"{BASE_URL}/api/trips/generate",
        json=payload,
        headers={"Authorization": f"Bearer {seeded_session['token']}"},
        timeout=LLM_TIMEOUT,
    )
    if r.status_code == 503:
        pytest.skip(f"LLM unavailable: {r.text[:200]}")
    assert r.status_code == 200, r.text[:500]
    trip_id = r.json()["trip_id"]
    assert trip_id

    # List trips for this authed user — should include new trip
    rl = api.get(
        f"{BASE_URL}/api/trips",
        headers={"Authorization": f"Bearer {seeded_session['token']}"},
    )
    assert rl.status_code == 200
    ids = [t["id"] for t in rl.json()["trips"]]
    assert trip_id in ids, f"Generated trip {trip_id} not found in authed user's trip list"

    # GET single trip with Bearer
    rg = api.get(
        f"{BASE_URL}/api/trips/{trip_id}",
        headers={"Authorization": f"Bearer {seeded_session['token']}"},
    )
    assert rg.status_code == 200
    assert rg.json().get("id") == trip_id


def test_delete_trip(api, generated_trip):
    if generated_trip.status_code != 200:
        pytest.skip("trip not generated")
    trip_id = generated_trip.json()["trip_id"]
    r = api.delete(f"{BASE_URL}/api/trips/{trip_id}", params={"guest_session_id": GUEST_SESSION_ID})
    assert r.status_code == 200
    assert r.json().get("ok") is True
    # verify gone
    r2 = api.get(f"{BASE_URL}/api/trips/{trip_id}", params={"guest_session_id": GUEST_SESSION_ID})
    assert r2.status_code == 404
