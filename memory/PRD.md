# Memento — Smart AI Travel Planner (Frontend MVP)

## Original Problem Statement
Build the frontend for a web app called Memento, a smart travel planner app.
Goal: Create only the frontend screens and UI structure for an MVP.
Reference: mindtrip.ai for UI screens. Follow PRD + Tech Blueprint attachments.

## User Choices (gathered Feb 2026)
- **Backend**: Mock data + lightweight stub (no real AI for now)
- **Screens**: Full set (Landing, Chat, Itinerary, Trips, Explore, Saved, Settings, Auth)
- **Auth**: Static UI only (no real auth wired)
- **Visual direction**: Designer's call — editorial/emotional aesthetic
- **Sample destination**: Paris dummy itinerary

## Architecture
- **Stack**: CRA React 19 + Tailwind CSS + shadcn/ui + lucide-react + sonner + React Router v7
- **Theme**: Light editorial — warm beige (#FAF8F5), terracotta (#C85A40), espresso (#2D2823)
- **Fonts**: Playfair Display (headings, italic accents) + Outfit (body)
- **Layout**: Persistent left nav rail on desktop / bottom bar on mobile
- **Backend**: Untouched FastAPI/MongoDB template (no new backend work)

## Routes Implemented
| Route | Purpose |
|---|---|
| `/` | Landing — hero, stats, features, destinations, footer |
| `/chat` | Split-panel: chat thread (left) + itinerary preview (right) |
| `/chat/:sessionId` | Same as `/chat` |
| `/itinerary/:id` | Standalone full itinerary view |
| `/trips` | Grid of trip cards (4 sample + new-trip card) |
| `/explore` | Search + 8 destinations + 3 curated collections |
| `/saved` | Grid of bookmarked items |
| `/settings` | Profile / preferences / privacy |
| `/auth/login` | Split UI: image left, form right (SSO + email) |
| `/auth/signup` | Same pattern as login |

## Key Components
- `AppShell` + `NavRail` — persistent navigation
- `ChatThread` — bubbles, confirmation card, generating indicator
- `IntakeWizard` — 6-step quick form (destination → dates → group → traveler-type → trip-type → budget)
- `ItineraryPanel` — cover, stats, "the vibe", map preview, smart hacks, day-by-day
- `DayCard` / `ActivityCard` — collapsible days with rich activity entries
- `SmartHacksStrip` — clickable hack chips with toast confirmation
- `MapPreview` — CSS-only stylized map with terracotta numbered pins

## What's been implemented (Feb 2026)
- ✅ All 9 routes wired and rendering with data
- ✅ Dual-mode intake (chat + wizard) with toggle between modes
- ✅ Mock conversation flow → confirmation card → 2.4s generation simulation → live itinerary
- ✅ Paris 5-day dummy itinerary with 16 activities, 4 smart hacks, image-rich cards
- ✅ Custom CSS-only map preview (no Mapbox key needed)
- ✅ Responsive: desktop split-panel, mobile-friendly bottom-nav
- ✅ All interactive elements have `data-testid` attributes
- ✅ E2E tested (testing_agent_v3) — 100% frontend pass

## What's NOT implemented (deferred / out of scope)
- Real AI integration (LLM-driven itinerary generation)
- Real authentication (Google/Apple SSO buttons are static)
- Live affiliate booking links / price loading
- Persistent save / share-link backend
- Settings actually saving anywhere
- Social media preference learning, voice planning, gift recommender (Phase 2 in PRD)
- Mobile breakpoint testing (built responsive but not tested)

## P0 Backlog (next steps)
1. Wire LLM (GPT-5.2 / Claude 4.5 / Gemini 3) for real itinerary generation
2. Auth — Emergent Google Auth or JWT email/password
3. Trip persistence (MongoDB) + claim-on-save guest flow
4. Mapbox / Google Maps real map integration
5. Booking layer with affiliate deep-links

## P1 Backlog
- Smart Hacks ruleset DB (Europe + SE Asia per PRD)
- Conversational editing that mutates itinerary JSON
- Skeleton-loader price fetching
- Share link `/share/:token` read-only view

## P2 Backlog
- Social media learning, voice planning, gift recommender, multilingual support
