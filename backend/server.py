from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Fail fast with clear messages if required env vars are missing
_REQUIRED_ENV = ["MONGO_URL", "DB_NAME", "GOOGLE_AI_KEY", "SUPABASE_JWT_SECRET"]
for _key in _REQUIRED_ENV:
    if not os.environ.get(_key):
        raise RuntimeError(f"Required environment variable '{_key}' is not set. Check your .env file.")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
# Provider keys — only needed when the corresponding provider is active
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
# Supabase JWT secret — used to verify access tokens locally (no outbound HTTP call)
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
EXPORT_WEBHOOK_URL = os.environ.get("EXPORT_WEBHOOK_URL")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")

# LLM model config — override via env vars for A/B testing or provider switching
LLM_PRIMARY_PROVIDER = os.environ.get("LLM_PRIMARY_PROVIDER", "gemini")
LLM_PRIMARY_MODEL = os.environ.get("LLM_PRIMARY_MODEL", "gemini-2.5-flash")
LLM_FALLBACK_PROVIDER = os.environ.get("LLM_FALLBACK_PROVIDER", "openai")
LLM_FALLBACK_MODEL = os.environ.get("LLM_FALLBACK_MODEL", "gpt-4o")
LLM_INTAKE_PROVIDER = os.environ.get("LLM_INTAKE_PROVIDER", "gemini")
LLM_INTAKE_MODEL = os.environ.get("LLM_INTAKE_MODEL", "gemini-2.5-flash")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()


app = FastAPI(title="Memento API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ---------------------------- Models ----------------------------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_name: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime


class IntakeData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    destination: str
    dates: Optional[str] = "Flexible"
    group: Optional[str] = "2 adults"
    travelerType: Optional[List[str]] = []
    tripType: Optional[str] = "City Break"
    budget: Optional[str] = "Flexible"


class GenerateTripRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    intake: IntakeData
    guest_session_id: Optional[str] = None


class ClaimGuestRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    guest_session_id: str


class EditTripRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message: str


class SaveItemRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    type: str
    location: Optional[str] = ""
    image: Optional[str] = ""
    activity_id: Optional[str] = None
    trip_id: Optional[str] = None
    guest_session_id: Optional[str] = None


class ExportTripRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str
    guest_session_id: Optional[str] = None


# ---------------------------- Auth helpers ----------------------------

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
) -> Optional[Dict[str, Any]]:
    """Read session from httpOnly cookie. Return user dict or None."""
    token = session_token
    if not token:
        return None

    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None

    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None

    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return user


async def require_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
) -> Dict[str, Any]:
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ---------------------------- Health ----------------------------

@api_router.get("/")
async def root():
    return {"message": "Memento API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get("timestamp"), str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


# ---------------------------- Auth routes ----------------------------

@api_router.post("/auth/session")
async def auth_session(
    request: Request,
    response: Response,
    body: Dict[str, Any],
):
    """Exchange a Supabase access_token for a server-side session cookie.
    Verifies the JWT locally using SUPABASE_JWT_SECRET — no outbound HTTP call.
    Optionally claims a guest_session_id's trips on first sign-in."""
    from jose import jwt as jose_jwt, JWTError

    access_token = body.get("access_token")
    guest_session_id = body.get("guest_session_id")
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token required")

    # Verify the Supabase JWT locally
    try:
        payload = jose_jwt.decode(
            access_token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    email = payload.get("email")
    user_metadata = payload.get("user_metadata", {})
    name = user_metadata.get("full_name") or user_metadata.get("name") or email
    picture = user_metadata.get("avatar_url") or user_metadata.get("picture")
    session_token = uuid.uuid4().hex

    if not email:
        raise HTTPException(status_code=502, detail="Token missing email claim")

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Store session (7 days)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Set httpOnly cookie — this is the sole credential mechanism for browsers.
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
    )

    # Claim guest trips if requested
    claimed = 0
    if guest_session_id:
        result = await db.trips.update_many(
            {"guest_session_id": guest_session_id, "user_id": None},
            {"$set": {"user_id": user_id, "guest_session_id": None}},
        )
        claimed = result.modified_count

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    # session_token intentionally omitted from response body — only in httpOnly cookie.
    return {"user": user_doc, "trips_claimed": claimed}


@api_router.get("/auth/me")
async def auth_me(user: Dict[str, Any] = Depends(require_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(
    request: Request,
    response: Response,
    session_token: Optional[str] = Cookie(default=None),
):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api_router.post("/auth/claim-guest")
async def claim_guest(
    body: ClaimGuestRequest,
    user: Dict[str, Any] = Depends(require_user),
):
    result = await db.trips.update_many(
        {"guest_session_id": body.guest_session_id, "user_id": None},
        {"$set": {"user_id": user["user_id"], "guest_session_id": None}},
    )
    return {"claimed": result.modified_count}


# ---------------------------- Trip generation (LLM) ----------------------------

ITINERARY_SYSTEM_PROMPT = """You are Memento — an expert travel planner that handcrafts personalized itineraries for travelers.

Given the traveler's intake data, generate a complete day-by-day itinerary.

Output ONLY valid minified JSON matching this exact schema (no markdown, no commentary):

{
  "title": "string — short evocative trip title, e.g. 'Paris in Spring'",
  "destination": "string — e.g. 'Paris, France'",
  "startDate": "string — e.g. 'Apr 12, 2026'",
  "endDate": "string — e.g. 'Apr 16, 2026'",
  "duration": "string — e.g. '5 days'",
  "travelers": "string — e.g. '2 adults'",
  "travelerType": ["string", ...],
  "tripType": "string",
  "budget": "string — e.g. '$2,500 – $3,500'",
  "spent": "string — estimated total, e.g. '$2,840'",
  "vibe": "string — one-line atmosphere description",
  "summary": "string — 2–3 sentence summary",
  "centerLat": number,
  "centerLng": number,
  "smartHacks": [
    {"id": "hack-1", "title": "string", "saves": "Saves $X / Saves N hours", "detail": "string", "type": "money|time"}
  ],
  "days": [
    {
      "day": 1,
      "date": "string e.g. 'Apr 12, Sun'",
      "title": "string",
      "summary": "string",
      "activities": [
        {
          "id": "a-1-1",
          "time": "string e.g. '14:00'",
          "duration": "string e.g. '1.5 hr'",
          "title": "string",
          "category": "Stay|Dining|Culture|Walk|Transit",
          "location": "string — short address/area",
          "lat": number,
          "lng": number,
          "cost": "string e.g. '$95 for 2'",
          "icon": "bed|utensils|coffee|landmark|train|plane|wine|mountain|footprints|salad",
          "notes": "string — quote-style local tip, 1 sentence"
        }
      ]
    }
  ]
}

Rules:
- Generate 3–7 activities per day depending on trip pace
- Include realistic addresses and accurate latitude/longitude for the destination
- Smart hacks: 3–5 items, mix of money & time savers, specific to the destination
- Use real, well-known venues. No made-up names
- Activity icons: 'bed' for hotels, 'utensils' for dinner, 'coffee' for breakfast/cafes, 'landmark' for sights/museums, 'train'/'plane' for transit, 'wine' for fine dining, 'mountain' for hikes, 'footprints' for walks, 'salad' for picnics/light lunch
- Currency in USD unless trip is in a USD-hostile country
- Respect the budget input — adjust hotel tier, dining cost
- Match traveler types to activity selection
"""


async def _call_google(model: str, system_prompt: str, user_prompt: str) -> str:
    from google import genai
    from google.genai import types
    g_client = genai.Client(api_key=GOOGLE_AI_KEY)
    response = await g_client.aio.models.generate_content(
        model=model,
        contents=user_prompt,
        config=types.GenerateContentConfig(system_instruction=system_prompt),
    )
    return response.text


async def _call_anthropic(model: str, system_prompt: str, user_prompt: str) -> str:
    import anthropic
    a_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    msg = await a_client.messages.create(
        model=model,
        max_tokens=8192,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return msg.content[0].text


async def _call_openai(model: str, system_prompt: str, user_prompt: str) -> str:
    import openai
    o_client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await o_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=8192,
    )
    return response.choices[0].message.content


async def _call_provider(provider: str, model: str, system_prompt: str, user_prompt: str) -> str:
    if provider == "gemini":
        return await _call_google(model, system_prompt, user_prompt)
    if provider == "anthropic":
        return await _call_anthropic(model, system_prompt, user_prompt)
    if provider == "openai":
        return await _call_openai(model, system_prompt, user_prompt)
    raise ValueError(f"Unknown LLM provider: {provider!r}")


async def call_llm(provider: str, model: str, intake: IntakeData) -> str:
    prompt = (
        f"Generate an itinerary for the following traveler intake.\n"
        f"Destination: {intake.destination}\n"
        f"Dates: {intake.dates}\n"
        f"Group: {intake.group}\n"
        f"Traveler type: {', '.join(intake.travelerType) if intake.travelerType else 'general'}\n"
        f"Trip type: {intake.tripType}\n"
        f"Budget: {intake.budget}\n\n"
        f"Output ONLY the JSON. No markdown fences."
    )
    return await _call_provider(provider, model, ITINERARY_SYSTEM_PROMPT, prompt)


def extract_json(raw: str) -> Dict[str, Any]:
    """Strip code fences and extract first valid JSON object from LLM output."""
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("```", 2)
        s = s[1] if len(s) > 1 else raw
        if s.lstrip().lower().startswith("json"):
            s = s.lstrip()[4:].lstrip()
        if "```" in s:
            s = s.split("```", 1)[0]
    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found in LLM response")
    decoder = json.JSONDecoder()
    obj, _ = decoder.raw_decode(s, start)
    return obj


@api_router.post("/trips/generate")
async def generate_trip(
    body: GenerateTripRequest,
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
):
    """Generate an itinerary via Gemini 2.5 Flash (primary) → Claude Sonnet 4.5 (fallback)."""
    user = await get_current_user(request, session_token)
    user_id = user["user_id"] if user else None
    guest_session_id = body.guest_session_id if not user_id else None

    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="user or guest_session_id required")

    raw = None
    used_model = None
    last_err = None
    attempts = [
        (LLM_PRIMARY_PROVIDER, LLM_PRIMARY_MODEL),
        (LLM_FALLBACK_PROVIDER, LLM_FALLBACK_MODEL),
    ]
    for provider, model in attempts:
        try:
            raw = await asyncio.wait_for(call_llm(provider, model, body.intake), timeout=90)
            used_model = f"{provider}/{model}"
            break
        except Exception as e:
            last_err = str(e)
            logging.exception("LLM call failed (%s/%s)", provider, model)
            continue

    if raw is None:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {last_err}")

    try:
        trip_json = extract_json(raw)
    except Exception as e:
        logging.error("JSON parse failed. Raw output:\n%s", raw[:2000])
        raise HTTPException(status_code=502, detail=f"LLM returned malformed JSON: {e}")

    trip_id = f"trip-{uuid.uuid4().hex[:10]}"

    doc = {
        "trip_id": trip_id,
        "user_id": user_id,
        "guest_session_id": guest_session_id,
        "model": used_model,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "trip": {**trip_json, "id": trip_id, "cover": None},
    }
    await db.trips.insert_one(doc)

    return {"trip_id": trip_id, "trip": doc["trip"], "model": used_model}


@api_router.post("/trips/generate/stream")
async def generate_trip_stream(
    body: GenerateTripRequest,
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
):
    """Same as /trips/generate but streams progress events via SSE."""
    user = await get_current_user(request, session_token)
    user_id = user["user_id"] if user else None
    guest_session_id = body.guest_session_id if not user_id else None
    if not user_id and not guest_session_id:
        raise HTTPException(status_code=400, detail="user or guest_session_id required")

    intake = body.intake
    dest = intake.destination or "your destination"
    vibe = ", ".join(intake.travelerType or []) or "your style"

    async def event_stream():
        def evt(payload: Dict[str, Any]) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        yield evt({"type": "status", "message": f"Researching {dest}..."})
        await asyncio.sleep(0.1)

        attempts = [
            (LLM_PRIMARY_PROVIDER, LLM_PRIMARY_MODEL),
            (LLM_FALLBACK_PROVIDER, LLM_FALLBACK_MODEL),
        ]
        timed_statuses = [
            (2.5, f"Mapping neighborhoods in {dest}..."),
            (6, f"Tuning for {vibe}..."),
            (12, "Drafting day-by-day plan..."),
            (22, "Layering smart hacks..."),
            (35, "Polishing the details..."),
            (55, "Almost there — final pass..."),
        ]

        raw = None
        used_model = None
        last_err = None
        for provider, model in attempts:
            task = asyncio.create_task(call_llm(provider, model, intake))
            start = asyncio.get_running_loop().time()
            idx = 0
            timed_out = False
            try:
                while not task.done():
                    await asyncio.sleep(0.6)
                    elapsed = asyncio.get_running_loop().time() - start
                    if idx < len(timed_statuses) and elapsed >= timed_statuses[idx][0]:
                        yield evt({"type": "status", "message": timed_statuses[idx][1]})
                        idx += 1
                    if elapsed > 90:
                        timed_out = True
                        task.cancel()
                        break
                if timed_out:
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                    last_err = "timeout"
                    continue
                raw = await task
                used_model = f"{provider}/{model}"
                break
            except asyncio.CancelledError:
                last_err = "timeout"
                continue
            except Exception as e:
                last_err = str(e)
                logging.exception("LLM stream call failed (%s/%s)", provider, model)
                yield evt({"type": "status", "message": "Switching model — retrying..."})
                continue
            finally:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

        if raw is None:
            yield evt({"type": "error", "detail": f"LLM unavailable: {last_err}"})
            return

        try:
            trip_json = extract_json(raw)
        except Exception as e:
            yield evt({"type": "error", "detail": f"Malformed LLM output: {e}"})
            return

        trip_id = f"trip-{uuid.uuid4().hex[:10]}"
        doc = {
            "trip_id": trip_id,
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "model": used_model,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "trip": {**trip_json, "id": trip_id, "cover": None},
        }
        await db.trips.insert_one(doc)
        yield evt({"type": "done", "trip_id": trip_id, "trip": doc["trip"], "model": used_model})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------- Trip CRUD ----------------------------

@api_router.get("/trips")
async def list_trips(
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    user = await get_current_user(request, session_token)
    if user:
        q = {"user_id": user["user_id"]}
    elif guest_session_id:
        q = {"guest_session_id": guest_session_id, "user_id": None}
    else:
        return {"trips": []}

    rows = await db.trips.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    summaries = []
    for r in rows:
        t = r.get("trip", {})
        summaries.append({
            "id": r["trip_id"],
            "title": t.get("title", "Untitled"),
            "destination": t.get("destination", ""),
            "dates": f"{t.get('startDate', '')} – {t.get('endDate', '')}".strip(" –"),
            "cover": t.get("cover"),
            "days": len(t.get("days", [])),
            "status": "draft",
            "created_at": r.get("created_at"),
        })
    return {"trips": summaries}


@api_router.get("/trips/{trip_id}")
async def get_trip(
    trip_id: str,
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    row = await db.trips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")

    user = await get_current_user(request, session_token)
    if row.get("user_id"):
        if not user or user["user_id"] != row["user_id"]:
            raise HTTPException(status_code=403, detail="Not your trip")
    else:
        if row.get("guest_session_id") != guest_session_id:
            raise HTTPException(status_code=403, detail="Not your trip")

    return row["trip"]


@api_router.delete("/trips/{trip_id}")
async def delete_trip(
    trip_id: str,
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    row = await db.trips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    user = await get_current_user(request, session_token)
    if row.get("user_id"):
        if not user or user["user_id"] != row["user_id"]:
            raise HTTPException(status_code=403, detail="Not your trip")
    else:
        if row.get("guest_session_id") != guest_session_id:
            raise HTTPException(status_code=403, detail="Not your trip")
    await db.trips.delete_one({"trip_id": trip_id})
    return {"ok": True}


# ---------------------------- Chat intake (LLM extractor) ----------------------------

INTAKE_SYSTEM_PROMPT = """You are Memento's intake assistant. Your job is to extract trip-planning data from a casual chat with the user, and propose the next short, friendly question to ask.

You will receive:
1. The conversation so far (user + assistant messages)
2. The current best-known intake state

You must respond with ONLY valid JSON (no markdown fences, no commentary) matching:

{
  "intake": {
    "destination": "string — city/region/country, cleanly formatted (e.g. 'Amalfi Coast' not 'a trip to the Amalfi Coast'). Empty string if unknown.",
    "dates": "string — natural date phrase (e.g. 'mid April 2026', 'next October', 'a week in spring'). 'Flexible' if unknown.",
    "group": "string — one of: 'Solo' | '2 adults' | 'Family with kids' | 'Friends (3-5)' | 'Friends (6+)'. Empty string if unknown.",
    "travelerType": ["array of: 'Explorer' | 'Food Lover' | 'Culture Seeker' | 'Adventure Seeker' | 'Wellness Traveller' | 'Luxury Traveller' | 'Party Animal'. Empty array if unknown."],
    "tripType": "string — one of: 'City Break' | 'Beach & Relaxation' | 'Honeymoon' | 'Road Trip' | 'Adventure' | 'Wellness Retreat' | 'Family Reunion' | 'Cruise' | 'Ski & Snow' | 'General Leisure'. Default 'City Break' if unclear.",
    "budget": "string — natural budget phrase (e.g. '$2,500', '$1k–$3k', 'mid-range'). 'Flexible' if unknown."
  },
  "next_question": "string — the next short, warm, single-sentence question to ask the user. Empty string if intake is complete enough to generate.",
  "complete": boolean — true if we have at least destination + group + traveler type or vibe; false otherwise.
}

Rules:
- Always carry forward existing values from current_intake unless the user has provided a new value.
- Extract aggressively: a single message like 'Goa for a week with my partner, food lovers, $2k' fills FOUR slots at once.
- Capitalize destinations properly ('kerala' → 'Kerala').
- Strip filler ('I want to go to Paris' → 'Paris').
- next_question must be single short sentence, conversational, never repeat what the user already answered.
- When complete=true, next_question can be a confirmation prompt like "Perfect — let me read this back to make sure I have it right."
- Never output anything other than the JSON object."""


class IntakeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    messages: List[Dict[str, str]]
    current_intake: Optional[Dict[str, Any]] = None


@api_router.post("/chat/intake")
async def chat_intake(body: IntakeRequest):
    """Cheap LLM call to parse free-text chat into structured intake.
    Sends opening context (first 2 msgs) + recent messages (last 10) to preserve
    early destination intent while keeping token cost bounded."""
    msgs = body.messages
    # Keep first 2 messages (opening context) + last 10 (recent interaction)
    if len(msgs) > 12:
        context_msgs = msgs[:2] + msgs[-10:]
    else:
        context_msgs = msgs

    convo_lines = []
    for m in context_msgs:
        role = m.get("role", "user")
        prefix = "User" if role == "user" else "Assistant"
        convo_lines.append(f"{prefix}: {m.get('content', '')[:800]}")
    convo_text = "\n".join(convo_lines)

    prompt = (
        f"Conversation so far:\n{convo_text}\n\n"
        f"Current intake state: {json.dumps(body.current_intake or {})}\n\n"
        f"Return the updated intake JSON now."
    )

    try:
        raw = await asyncio.wait_for(
            _call_provider(LLM_INTAKE_PROVIDER, LLM_INTAKE_MODEL, INTAKE_SYSTEM_PROMPT, prompt),
            timeout=20,
        )
    except Exception as e:
        logging.exception("Intake LLM failed")
        raise HTTPException(status_code=503, detail=f"Intake LLM failed: {e}")

    try:
        parsed = extract_json(raw)
    except Exception as e:
        logging.error("Intake JSON parse failed. Raw:\n%s", raw[:1000])
        raise HTTPException(status_code=502, detail=f"Malformed JSON: {e}")

    return parsed


# ---------------------------- Trip edit (conversational) ----------------------------
EDIT_SYSTEM_PROMPT = """You are Memento, editing an existing travel itinerary.

You will receive the current itinerary JSON and the user's edit request in plain English.
Apply the change with the lightest touch — preserve everything the user didn't ask to change.

Rules:
- Output ONLY valid JSON matching the same schema as the input itinerary
- No markdown fences, no commentary, no preamble
- Preserve activity IDs (a-X-Y) when possible; mint new ones for added activities
- Keep lat/lng accurate for any new venues
- If user asks to remove a day, renumber remaining days and dates accordingly
- Keep tone consistent with the existing itinerary's voice"""


async def call_edit_llm(provider: str, model: str, trip: Dict[str, Any], message: str) -> str:
    prompt = (
        f"Current itinerary JSON:\n{json.dumps(trip)[:14000]}\n\n"
        f"User's edit request: \"{message}\"\n\n"
        f"Return the full updated JSON only."
    )
    return await _call_provider(provider, model, EDIT_SYSTEM_PROMPT, prompt)


@api_router.post("/trips/{trip_id}/edit")
async def edit_trip(
    trip_id: str,
    body: EditTripRequest,
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    row = await db.trips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    user = await get_current_user(request, session_token)
    if row.get("user_id"):
        if not user or user["user_id"] != row["user_id"]:
            raise HTTPException(status_code=403, detail="Not your trip")
    else:
        if row.get("guest_session_id") != guest_session_id:
            raise HTTPException(status_code=403, detail="Not your trip")

    raw = None
    used_model = None
    last_err = None
    for provider, model in [
        (LLM_PRIMARY_PROVIDER, LLM_PRIMARY_MODEL),
        (LLM_FALLBACK_PROVIDER, LLM_FALLBACK_MODEL),
    ]:
        try:
            raw = await asyncio.wait_for(
                call_edit_llm(provider, model, row["trip"], body.message),
                timeout=90,
            )
            used_model = f"{provider}/{model}"
            break
        except Exception as e:
            last_err = str(e)
            logging.exception("Edit LLM failed (%s/%s)", provider, model)

    if raw is None:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {last_err}")

    try:
        new_trip = extract_json(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM returned malformed JSON: {e}")

    new_trip["id"] = trip_id
    new_trip["cover"] = row["trip"].get("cover")

    await db.trips.update_one(
        {"trip_id": trip_id},
        {"$set": {"trip": new_trip, "updated_at": datetime.now(timezone.utc).isoformat(), "last_model": used_model}},
    )
    return {"trip": new_trip, "model": used_model}


# ---------------------------- Share links ----------------------------

@api_router.post("/trips/{trip_id}/share")
async def create_share(
    trip_id: str,
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    row = await db.trips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    user = await get_current_user(request, session_token)
    if row.get("user_id"):
        if not user or user["user_id"] != row["user_id"]:
            raise HTTPException(status_code=403, detail="Not your trip")
    else:
        if row.get("guest_session_id") != guest_session_id:
            raise HTTPException(status_code=403, detail="Not your trip")

    token = uuid.uuid4().hex[:18]
    await db.shares.insert_one({
        "token": token,
        "trip_id": trip_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"token": token}


@api_router.get("/share/{token}")
async def read_share(token: str):
    s = await db.shares.find_one({"token": token}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Share not found")
    row = await db.trips.find_one({"trip_id": s["trip_id"]}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"trip": row["trip"], "shared_at": s.get("created_at")}


# ---------------------------- Saved items ----------------------------

@api_router.get("/saved")
async def list_saved(
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    user = await get_current_user(request, session_token)
    if user:
        q = {"user_id": user["user_id"]}
    elif guest_session_id:
        q = {"guest_session_id": guest_session_id, "user_id": None}
    else:
        return {"items": []}
    items = await db.saved_items.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items}


@api_router.post("/saved")
async def create_saved(
    body: SaveItemRequest,
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
):
    user = await get_current_user(request, session_token)
    user_id = user["user_id"] if user else None
    guest_id = body.guest_session_id if not user_id else None
    if not user_id and not guest_id:
        raise HTTPException(status_code=400, detail="user or guest_session_id required")

    item_id = f"saved-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": item_id,
        "user_id": user_id,
        "guest_session_id": guest_id,
        "title": body.title,
        "type": body.type,
        "location": body.location or "",
        "image": body.image or "",
        "activity_id": body.activity_id,
        "trip_id": body.trip_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saved_items.insert_one(doc)
    return {"item": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.delete("/saved/{item_id}")
async def delete_saved(
    item_id: str,
    request: Request,
    guest_session_id: Optional[str] = None,
    session_token: Optional[str] = Cookie(default=None),
):
    item = await db.saved_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    user = await get_current_user(request, session_token)
    if item.get("user_id"):
        if not user or user["user_id"] != item["user_id"]:
            raise HTTPException(status_code=403, detail="Not yours")
    else:
        if item.get("guest_session_id") != guest_session_id:
            raise HTTPException(status_code=403, detail="Not yours")
    await db.saved_items.delete_one({"id": item_id})
    return {"ok": True}


# ---------------------------- Export webhook ----------------------------

@api_router.post("/trips/{trip_id}/export")
async def export_trip(
    trip_id: str,
    body: ExportTripRequest,
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
):
    """Posts the full trip + recipient email to EXPORT_WEBHOOK_URL.
    Caller's downstream automation (Zapier/Make/n8n/etc) handles email delivery."""
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not EXPORT_WEBHOOK_URL:
        raise HTTPException(status_code=503, detail="Export webhook not configured")

    row = await db.trips.find_one({"trip_id": trip_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")

    user = await get_current_user(request, session_token)
    if row.get("user_id"):
        if not user or user["user_id"] != row["user_id"]:
            raise HTTPException(status_code=403, detail="Not your trip")
    else:
        if row.get("guest_session_id") != body.guest_session_id:
            raise HTTPException(status_code=403, detail="Not your trip")

    # Ensure a share token exists so the email can include a public link
    share = await db.shares.find_one({"trip_id": trip_id}, {"_id": 0})
    if not share:
        token = uuid.uuid4().hex[:18]
        await db.shares.insert_one({
            "token": token,
            "trip_id": trip_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        token = share["token"]

    payload = {
        "email": body.email,
        "trip": row["trip"],
        "share_url": f"{FRONTEND_BASE_URL}/share/{token}",
        "share_token": token,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": "memento",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as h:
            r = await h.post(EXPORT_WEBHOOK_URL, json=payload)
        webhook_status = r.status_code
    except Exception as e:
        logging.exception("Export webhook failed")
        raise HTTPException(status_code=502, detail=f"Webhook delivery failed: {e}")

    await db.exports.insert_one({
        "trip_id": trip_id,
        "email": body.email,
        "webhook_status": webhook_status,
        "share_token": token,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": webhook_status < 400, "share_token": token, "webhook_status": webhook_status}


# ---------------------------- Booking prices (mock provider) ----------------------------

_ACTIVITY_ID_RE = re.compile(r'^[a-zA-Z0-9_\-]{1,64}$')
_MAX_PRICE_IDS = 50


def _mock_price(activity_id: str) -> Dict[str, Any]:
    h = sum(ord(c) for c in activity_id)
    base = 18 + (h * 7) % 240
    return {
        "price_usd": base,
        "label": f"${base}",
        "provider": ["Booking.com", "GetYourGuide", "Tiqets", "Tripadvisor"][h % 4],
        "rating": round(3.8 + (h % 12) * 0.1, 1),
        "reviews": 120 + (h * 3) % 4500,
    }


@api_router.get("/booking/prices")
async def booking_prices(ids: str):
    """Return live-looking prices for a comma-separated list of activity ids."""
    raw_ids = [x.strip() for x in ids.split(",") if x.strip()]
    if len(raw_ids) > _MAX_PRICE_IDS:
        raise HTTPException(status_code=400, detail=f"Maximum {_MAX_PRICE_IDS} IDs per request")
    out = {}
    for aid in raw_ids:
        if not _ACTIVITY_ID_RE.match(aid):
            continue
        out[aid] = _mock_price(aid)
    return {"prices": out}


# ---------------------------- App wiring ----------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_BASE_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
