// Mock data for Memento MVP — Paris dummy itinerary + sample trips/destinations

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.1.0&auto=format&fit=crop&w=2400&q=80";
// Paris cityscape with Eiffel — used on landing hero

export const PARIS_TRIP = {
  id: "trip-paris-001",
  title: "Paris in Spring",
  destination: "Paris, France",
  cover:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
  startDate: "Apr 12, 2026",
  endDate: "Apr 16, 2026",
  duration: "5 days",
  travelers: "2 adults",
  travelerType: ["Culture Seeker", "Food Lover"],
  tripType: "City Break",
  budget: "$3,200",
  spent: "$2,840",
  centerLat: 48.8566,
  centerLng: 2.3522,
  vibe: "Romantic, slow-paced, café mornings & gallery afternoons",
  summary:
    "A handcrafted five-day journey through Paris designed for a couple who values art, pastry, and unhurried evenings. Hotels positioned in Le Marais for walkability. Includes one Sunday-museum-free day to savor neighborhoods.",
  smartHacks: [
    {
      id: "hack-1",
      title: "Skip the Louvre line",
      saves: "Saves 2 hours",
      detail:
        "Enter via Porte des Lions and book the 9:00 AM slot. 80% emptier than the pyramid entrance.",
      type: "time",
    },
    {
      id: "hack-2",
      title: "Hotel in Le Marais",
      saves: "Saves $180",
      detail:
        "Same 4-star feel, 12-min walk to most landmarks, half the price of Champs-Élysées area.",
      type: "money",
    },
    {
      id: "hack-3",
      title: "Navigo Easy Pass",
      saves: "Saves $42",
      detail:
        "Beats single tickets for any 5+ day stay. Works across metro, bus, RER zones 1–2.",
      type: "money",
    },
    {
      id: "hack-4",
      title: "Free Sunday museums",
      saves: "Saves $36",
      detail:
        "First Sunday of the month, 14 national museums are free. We've timed Day 4 around this.",
      type: "money",
    },
  ],
  days: [
    {
      day: 1,
      date: "Apr 12, Sun",
      title: "Arrival & Le Marais wandering",
      summary:
        "Land, drop bags, walk off jet lag in the prettiest corner of Paris.",
      activities: [
        {
          id: "a-1-1",
          time: "14:00",
          duration: "45 min",
          title: "Check in — Hôtel Jules & Jim",
          category: "Stay",
          location: "11 Rue des Gravilliers, Le Marais",
          lat: 48.8635,
          lng: 2.3534,
          cost: "$210/night",
          icon: "bed",
          image:
            "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80",
          notes: "Boutique hotel, courtyard fireplace, walking distance to everything.",
        },
        {
          id: "a-1-2",
          time: "15:30",
          duration: "1.5 hr",
          title: "Place des Vosges & Marais stroll",
          category: "Walk",
          location: "Place des Vosges, 4e",
          lat: 48.8554,
          lng: 2.3658,
          cost: "Free",
          icon: "footprints",
          image:
            "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80",
          notes: "Oldest planned square in Paris. Loop through Rue des Rosiers afterwards.",
        },
        {
          id: "a-1-3",
          time: "19:00",
          duration: "2 hr",
          title: "Dinner at Chez Janou",
          category: "Dining",
          location: "2 Rue Roger Verlomme",
          lat: 48.8553,
          lng: 2.366,
          cost: "$95 for 2",
          icon: "utensils",
          image:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
          notes: "Provençal bistro. Order the chocolate mousse — they hand you the bowl.",
        },
      ],
    },
    {
      day: 2,
      date: "Apr 13, Mon",
      title: "Louvre & Tuileries golden hour",
      summary: "Art-heavy morning, café-lined afternoon, sunset over the Seine.",
      activities: [
        {
          id: "a-2-1",
          time: "08:30",
          duration: "30 min",
          title: "Pastry breakfast — Du Pain et des Idées",
          category: "Dining",
          location: "34 Rue Yves Toudic",
          lat: 48.8703,
          lng: 2.3635,
          cost: "$14",
          icon: "coffee",
          image:
            "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
          notes: "Best escargot pistache in Paris. Get there before 9.",
        },
        {
          id: "a-2-2",
          time: "09:30",
          duration: "3 hr",
          title: "Louvre Museum — Skip-the-line",
          category: "Culture",
          location: "Rue de Rivoli, 1e",
          lat: 48.8606,
          lng: 2.3376,
          cost: "$22 pp",
          icon: "landmark",
          image:
            "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=1200&q=80",
          notes: "Use Porte des Lions entrance. Hit Denon wing first for Mona Lisa.",
        },
        {
          id: "a-2-3",
          time: "13:00",
          duration: "1 hr",
          title: "Lunch at Café Marly",
          category: "Dining",
          location: "Cour Napoléon",
          lat: 48.8624,
          lng: 2.3358,
          cost: "$60",
          icon: "utensils",
          image:
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
          notes: "Terrace overlooks the pyramid. Skip mains, do starters + wine.",
        },
        {
          id: "a-2-4",
          time: "17:30",
          duration: "1.5 hr",
          title: "Tuileries → Pont des Arts walk",
          category: "Walk",
          location: "Jardin des Tuileries",
          lat: 48.8634,
          lng: 2.3275,
          cost: "Free",
          icon: "footprints",
          image:
            "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80",
          notes: "Time it for golden hour — the Seine glows around 19:00 in April.",
        },
      ],
    },
    {
      day: 3,
      date: "Apr 14, Tue",
      title: "Montmartre & a quiet evening",
      summary:
        "Climb the hill, sketch outside Sacré-Cœur, dinner with a view.",
      activities: [
        {
          id: "a-3-1",
          time: "10:00",
          duration: "2 hr",
          title: "Montmartre & Sacré-Cœur",
          category: "Walk",
          location: "18e arrondissement",
          lat: 48.8867,
          lng: 2.3431,
          cost: "Free",
          icon: "mountain",
          image:
            "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&w=1200&q=80",
          notes: "Take the funicular up, walk down via Rue Lepic.",
        },
        {
          id: "a-3-2",
          time: "13:00",
          duration: "1.5 hr",
          title: "Lunch at Le Consulat",
          category: "Dining",
          location: "18 Rue Norvins",
          lat: 48.8865,
          lng: 2.3399,
          cost: "$70",
          icon: "utensils",
          image:
            "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
          notes: "Touristy but the duck confit is genuinely good. Sit outside.",
        },
        {
          id: "a-3-3",
          time: "20:00",
          duration: "2 hr",
          title: "Dinner at La Tour d'Argent (rooftop)",
          category: "Dining",
          location: "15 Quai de la Tournelle",
          lat: 48.8499,
          lng: 2.354,
          cost: "$280",
          icon: "wine",
          image:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
          notes: "Reserve 2 weeks ahead. Ask for window table — Notre-Dame view.",
        },
      ],
    },
    {
      day: 4,
      date: "Apr 15, Wed",
      title: "Versailles day-trip",
      summary: "Train out, gardens, mirror hall, picnic in the Trianon.",
      activities: [
        {
          id: "a-4-1",
          time: "08:30",
          duration: "45 min",
          title: "RER C → Versailles Château",
          category: "Transit",
          location: "Gare d'Austerlitz",
          lat: 48.8413,
          lng: 2.3653,
          cost: "$8 (Navigo)",
          icon: "train",
          notes: "Sit on the right side for views over the Seine.",
        },
        {
          id: "a-4-2",
          time: "10:00",
          duration: "4 hr",
          title: "Versailles Palace + Gardens",
          category: "Culture",
          location: "Place d'Armes, Versailles",
          lat: 48.8049,
          lng: 2.1204,
          cost: "$32 pp",
          icon: "landmark",
          image:
            "https://images.unsplash.com/photo-1583321500900-82807e458f3c?auto=format&fit=crop&w=1200&q=80",
          notes: "Hall of Mirrors first thing. Save 90 min for the gardens.",
        },
        {
          id: "a-4-3",
          time: "16:00",
          duration: "2 hr",
          title: "Petit Trianon picnic",
          category: "Walk",
          location: "Marie Antoinette's Estate",
          lat: 48.8158,
          lng: 2.1075,
          cost: "$25 (groceries)",
          icon: "salad",
          notes: "Pick up bread + cheese at the village before entering.",
        },
      ],
    },
    {
      day: 5,
      date: "Apr 16, Thu",
      title: "Slow morning & departure",
      summary: "One last croissant. One last view.",
      activities: [
        {
          id: "a-5-1",
          time: "09:00",
          duration: "1.5 hr",
          title: "Breakfast at Café de Flore",
          category: "Dining",
          location: "172 Bd Saint-Germain",
          lat: 48.854,
          lng: 2.3331,
          cost: "$45",
          icon: "coffee",
          image:
            "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
          notes: "Sit upstairs, ask for the booth Sartre used.",
        },
        {
          id: "a-5-2",
          time: "11:00",
          duration: "1 hr",
          title: "Sainte-Chapelle stained glass",
          category: "Culture",
          location: "8 Bd du Palais",
          lat: 48.8554,
          lng: 2.345,
          cost: "$13 pp",
          icon: "landmark",
          notes: "Go on a sunny morning — the 1,113 glass panels light up.",
        },
        {
          id: "a-5-3",
          time: "15:00",
          duration: "1 hr",
          title: "Taxi to CDG airport",
          category: "Transit",
          location: "Charles de Gaulle (CDG)",
          lat: 49.0097,
          lng: 2.5479,
          cost: "$65",
          icon: "plane",
          notes: "Book Bolt or G7 — flat-rate €60 from central Paris.",
        },
      ],
    },
  ],
};

export const SAMPLE_TRIPS = [
  {
    id: "trip-paris-001",
    title: "Paris in Spring",
    destination: "Paris, France",
    dates: "Apr 12 – 16, 2026",
    cover:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    days: 5,
    status: "upcoming",
  },
  {
    id: "trip-tokyo-001",
    title: "Tokyo Cherry Blossoms",
    destination: "Tokyo, Japan",
    dates: "Mar 28 – Apr 5, 2026",
    cover:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80",
    days: 9,
    status: "draft",
  },
  {
    id: "trip-lisbon-001",
    title: "Lisbon long weekend",
    destination: "Lisbon, Portugal",
    dates: "Feb 14 – 17, 2026",
    cover:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
    days: 4,
    status: "past",
  },
  {
    id: "trip-bali-001",
    title: "Bali wellness retreat",
    destination: "Ubud, Bali",
    dates: "Nov 4 – 11, 2025",
    cover:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    days: 8,
    status: "past",
  },
];

export const DESTINATIONS = [
  {
    name: "Tokyo",
    country: "Japan",
    tagline: "Neon nights & quiet shrines",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80",
    trips: 12340,
  },
  {
    name: "Lisbon",
    country: "Portugal",
    tagline: "Pastel hills, salt air",
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
    trips: 8210,
  },
  {
    name: "Marrakech",
    country: "Morocco",
    tagline: "Spice, silk, sun-baked walls",
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=80",
    trips: 5430,
  },
  {
    name: "Kyoto",
    country: "Japan",
    tagline: "Temples, tea, and torii",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
    trips: 9870,
  },
  {
    name: "Santorini",
    country: "Greece",
    tagline: "Whitewash & deep blue",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    trips: 14200,
  },
  {
    name: "Reykjavik",
    country: "Iceland",
    tagline: "Glaciers, geysers, green skies",
    image:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1200&q=80",
    trips: 3420,
  },
  {
    name: "New York",
    country: "USA",
    tagline: "The city that doesn't sit still",
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
    trips: 22100,
  },
  {
    name: "Bali",
    country: "Indonesia",
    tagline: "Rice terraces & slow mornings",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    trips: 11020,
  },
];

export const SAVED_ITEMS = [
  {
    id: "s-1",
    title: "Hôtel Jules & Jim",
    type: "Stay",
    location: "Le Marais, Paris",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s-2",
    title: "Du Pain et des Idées",
    type: "Café",
    location: "10e, Paris",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s-3",
    title: "Sacré-Cœur sunset",
    type: "Activity",
    location: "Montmartre, Paris",
    image:
      "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s-4",
    title: "La Tour d'Argent",
    type: "Restaurant",
    location: "5e, Paris",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
  },
];

export const SAMPLE_CHAT = [
  {
    id: "m-0",
    role: "ai",
    content:
      "Hi — I'm Memento. Tell me about the trip you're dreaming of, and I'll handcraft something just for you. Where are you thinking of going?",
  },
];

export const TRAVELER_TYPES = [
  "Explorer",
  "Food Lover",
  "Culture Seeker",
  "Adventure Seeker",
  "Wellness Traveller",
  "Luxury Traveller",
  "Party Animal",
];

export const TRIP_TYPES = [
  "City Break",
  "Beach & Relaxation",
  "Honeymoon",
  "Road Trip",
  "Adventure",
  "Wellness Retreat",
  "Family Reunion",
  "Cruise",
  "Ski & Snow",
  "General Leisure",
];

export const STATS = [
  { label: "Itineraries crafted", value: "184k" },
  { label: "Avg. time to plan", value: "78s" },
  { label: "Travelers love it", value: "4.9★" },
];
