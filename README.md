# Roamly 🌍

> *Every child deserves to be heard.*

Roamly is a daily companion app for nonverbal and autistic children and their caregivers. Built with love for Eden and Zeal — and every child who struggles to communicate.

---

## What is Roamly?

Roamly gives nonverbal and neurologically disabled children a voice. Every interaction works without reading a single word. Every screen is completable in under three taps. Every design decision was shaped by ABA and speech therapy research.

The app has four modes and a real-time caregiver dashboard.

---

## The Four Modes

### 🗓 My Day — AI-Powered Visual Routine
The child's day is a visual path of illustrated steps. Each task has a picture and a label. Tap to complete, it lights up with a soft animation, and the path advances. Text-to-speech reads each step aloud on tap.

Caregivers generate the routine by describing the day in plain English — Gemini AI produces a personalized schedule instantly based on the child's age, communication level, and therapeutic focus areas.

Also includes a **Potty Log** and **Health Log** so caregivers can track daily health events directly from the child's device.

### 💬 How I Feel — Emotion Check-in
A soft animated world where each island represents an emotion — sunny for happy, stormy for angry, rainy for sad, volcano for overwhelmed. The child taps the island that matches how they feel. Two simple follow-up questions. Done in under 30 seconds. No words needed.

### 🗣 My Voice — AAC Sentence Builder
A full Augmentative and Alternative Communication board with 200+ words across 9 categories: Core, People, Actions, Feelings, Places, Food, Objects, Social, Numbers, and Body Parts. Children tap picture cards to build sentences which are spoken aloud. Caregivers can add custom words (family names, specific objects) under any category, PIN protected.

### 🎮 Play & Learn — Therapeutic Games
Three games that build real skills:
- **Memory Lights** — a 3x3 Simon-style memory game that assesses working memory. Best score saved per child.
- **Fix It!** — grammar correction with Gemini-generated questions adapted to the child's age and communication level.
- **What's Next?** — sequence completion across time, seasons, routines, and feelings. Candy Crush-style praise and streak rewards.

### 🎨 My Place — Personalization
The child builds their own avatar, picks an ambient music track (soft piano, lo-fi, ocean waves, forest birds, lullaby, nature sounds), and makes the app feel like theirs. Music persists across all screens.

---

## Caregiver Dashboard

Live at **[roamly-dashboard.vercel.app](https://roamly-dashboard.vercel.app)**

- Real-time emotion check-in history with visual timeline
- Weekly routine completion with progress bars per day
- Game performance tracking (memory, grammar, sequencing scores)
- Potty and health log history
- **Gemini AI insights** — ask any question about your child's week and get plain-English analysis with patterns, recommendations, and links to reputable resources (Autism Speaks, CDC, ABAI therapy finders)
- One-click PDF export of the full weekly report — ready to hand to an ABA therapist or doctor

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo |
| AI | Google Gemini 1.5 Flash API |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Dashboard | Next.js + Vercel |
| Icons | Phosphor Icons |
| Illustrations | Storyset (human-made SVGs only) |
| Music | Pixabay Music (royalty-free) |
| Audio | expo-audio |
| Speech | expo-speech (TTS on every interaction) |
| Navigation | React Navigation |
| Offline | AsyncStorage queue with sync on reconnect |

---

## Running the Mobile App

### Prerequisites
- Node.js 18+
- Expo CLI
- Expo Go app on your phone (Android or iOS)

### Setup

```bash
git clone https://github.com/BlissPhinehas/roamly.git
cd roamly
npm install --legacy-peer-deps
```

Create a `.env` file in the root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

Start the app:

```bash
npx expo start --lan
```

Scan the QR code with Expo Go on your phone.

### Download the APK (Android)

Download the latest Android APK directly from the EAS build page:

👉 **[expo.dev/accounts/blissphin/projects/roamly-app/builds](https://expo.dev/accounts/blissphin/projects/roamly-app/builds)**

1. Download the `.apk` file
2. Transfer to your Android phone
3. Go to Settings → Security → enable **Install from unknown sources**
4. Open the APK and install
5. Launch Roamly

---

## Running the Dashboard

```bash
git clone https://github.com/BlissPhinehas/roamly-dashboard.git
cd roamly-dashboard
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Or use the live deployment at **[roamly-dashboard.vercel.app](https://roamly-dashboard.vercel.app)**

---

## Database Setup (Supabase)

Create a new Supabase project and run the following SQL:

```sql
-- Children profiles
create table child (
  id uuid default gen_random_uuid() primary key,
  caregiver_id uuid references auth.users(id) on delete cascade,
  name text not null,
  avatar_config jsonb default '{}',
  theme text default 'default',
  music_pref text default 'piano',
  offline_queue jsonb default '[]',
  created_at timestamptz default now()
);

-- Daily routines
create table routine (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references child(id) on delete cascade,
  date date default current_date,
  steps jsonb default '[]',
  created_at timestamptz default now(),
  unique(child_id, date)
);

-- Emotion check-ins
create table emotion_checkin (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references child(id) on delete cascade,
  island text not null,
  follow_up jsonb default '{}',
  logged_at timestamptz default now()
);

-- Potty log
create table potty_log (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references child(id) on delete cascade,
  date date default current_date,
  logged_at timestamptz default now(),
  type text check (type in ('pee', 'poop')),
  constipation boolean default false,
  time text,
  notes text,
  created_at timestamptz default now()
);

-- Health log
create table health_log (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references child(id) on delete cascade,
  date date default current_date,
  logged_at timestamptz default now(),
  type text check (type in ('sickness', 'injury')),
  description text,
  severity int check (severity between 1 and 3),
  time text,
  created_at timestamptz default now()
);

-- Game performance logs
create table game_log (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references child(id) on delete cascade,
  date date default current_date,
  game_type text check (game_type in ('simon', 'fix', 'sequence')),
  score int default 0,
  best_score int default 0,
  accuracy int,
  logged_at timestamptz default now()
);

-- Enable RLS on all tables
alter table child enable row level security;
alter table routine enable row level security;
alter table emotion_checkin enable row level security;
alter table potty_log enable row level security;
alter table health_log enable row level security;
alter table game_log enable row level security;

-- RLS Policies
create policy "Caregivers manage their children" on child for all
  using (caregiver_id = auth.uid());

create policy "Caregivers manage routines" on routine for all
  using (child_id in (select id from child where caregiver_id = auth.uid()));

create policy "Caregivers manage emotion checkins" on emotion_checkin for all
  using (child_id in (select id from child where caregiver_id = auth.uid()));

create policy "Caregivers manage potty logs" on potty_log for all
  using (child_id in (select id from child where caregiver_id = auth.uid()));

create policy "Caregivers manage health logs" on health_log for all
  using (child_id in (select id from child where caregiver_id = auth.uid()));

create policy "Caregivers manage game logs" on game_log for all
  using (child_id in (select id from child where caregiver_id = auth.uid()));
```

---

## Design Principles

- **No reading required** — every interaction uses pictures, icons, and animations
- **Under 3 taps** — every screen completable in under three taps
- **80px minimum touch targets** — for children with motor control differences
- **Offline-first** — actions queue locally and sync when connection resumes
- **Therapeutic language** — all copy reflects ABA and speech therapy standards
- **Human-made illustrations only** — no AI-generated art, out of respect for artists
- **Color blindness support** — shapes used alongside colors throughout

---

## The Story

This app was built for my brothers **Eden and Zeal**, who have difficulty communicating. Every design decision — the illustrated emotion islands, the visual routine path, the AAC sentence builder — came from watching them navigate a world that wasn't designed for them.

Roamly is what I wish had existed for our family.

---

## What's Next

- AAC Learn mode — flashcard activities for emotion and vocabulary recognition
- Video support via Pexels for visual activity guides
- Google and Apple OAuth
- Therapist portal with multi-child management
- Making it free for every family that needs it

---

![My Journey](<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/164acb50-f20f-4805-9c86-31de08931b88" />
)
![Emotions](<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/6f78001c-bea5-4ddf-aa8b-3c6a06bcf029" />
)
![AAC Sentence Builder](<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/a0702537-b736-4c82-8e9f-c6bc8e65ffec" />
)
![Play and learn]<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/1d1b7697-01bb-40d3-b0fd-4c50b9f536a9" />
)
![Landing Page](<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/b5b465e9-98ba-46c6-b94c-70d58e573b0f" />
)
![Profile customization](<img width="674" height="1462" alt="image" src="https://github.com/user-attachments/assets/bfb72d63-cde3-48bb-b0bd-cbd2bb33a55c" />
)
---

## License

All rights reserved. Built with ❤️ at hackUMBC 2026.
