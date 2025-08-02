# Retro Gym App — Developer Overview

**Version:** 2.0.25  
**Tech Stack:** React Native + Expo · Expo Router · SQLite · React Context · TypeScript

---

## Table of Contents

1. [Introduction](#introduction)  
2. [Startup & Database Initialization](#startup--database-initialization)  
3. [Navigation & Routing](#navigation--routing)  
4. [Home Screen](#home-screen)  
5. [New Workout Flow](#new-workout-flow)  
   - [Exercise Catalog & Search](#exercise-catalog--search)  
   - [Adding & Managing Exercises](#adding--managing-exercises)  
   - [Custom Exercise Creation](#custom-exercise-creation)  
6. [Progress & Analysis](#progress--analysis)  
7. [State Management](#state-management)  
8. [Offline‑First Behavior](#offline‑first-behavior)  
9. [Build‑Time `exercises.json` → SQLite Pipeline](#build‑time-exercisesjson--sqlite-pipeline)  
10. [Styling & Theming](#styling--theming)  
11. [Putting It All Together](#putting-it-all-together)  

---

## Introduction

Retro Gym App is an **offline‑capable**, **ultra‑fast** workout tracker with a neon‑green, terminal‑inspired UI.  
Designed for gym‑goers who appreciate a **cyberpunk** aesthetic, it ships with a fully pre‑built exercises database and runs entirely on the device—no network needed.

---

## Startup & Database Initialization

1. **Font Loading**  
   - Loads custom monospaced, “CRT”‑style fonts via Expo’s Font API.  
   - Ensures zero flash of unstyled text.

2. **Bundled SQLite DB Copy**  
   - A pre‑built SQLite database (generated from `exercises.json`) is packaged as a static asset.  
   - On first launch (or after update), copy asset → device’s file system (`FileSystem.getInfoAsync` + `FileSystem.copyAsync`).  
   - All this happens _before_ rendering any screen, so users never see a “seeding” spinner on subsequent starts.

---

## Navigation & Routing

- **Expo Router** powers all navigation.  
- **Tab‑based** structure (e.g., Home / New Workout / Progress).  
- **Stack** navigation for drill‑in screens (e.g., Workout Detail, Exercise Detail, Progress Analysis).

\`\`\`text
┌───────────────────┐
│     Tabs (Root)   │
│  • Home           │
│  • New Workout    │
│  • Progress       │
└───────────────────┘
         │
         ▼
   Stack Screens
   • WorkoutDetail
   • ProgressAnalysis
   • CustomExerciseModal
\`\`\`

---

## Home Screen

- **Recent Workouts List**  
  - Card view: Title, Date, # of Exercises  
  - Tap card → Workout Detail

- **Primary Actions**  
  - **➔ Progress** → Overview & charts  
  - **+ New Workout** → Start session

- **Design Highlights**  
  - Neon‑green borders & text on dark background  
  - Subtle “CRT scanline” shader or overlay  

---

## New Workout Flow

### Exercise Catalog & Search

- **Search Bar** (monospaced placeholder: “Exercise name…”).  
- **Filter Chips**: Muscle groups, Equipment categories.  
- **Instant Results**: Synchronous SQLite `LIKE` queries via [expo-sqlite].

### Adding & Managing Exercises

- Tap “+” next to an exercise → adds to **Current Session List** (shown at top).  
- In-session list:  
  - Reorder via drag handle  
  - Remove via “–” icon  
  - Tap exercise → Edit Sets/Reps/Weights  

### Custom Exercise Creation

- If search yields no results, show option:  
  > “No matches. Add as custom exercise?”  
- On confirm:  
  - Insert new row into `exercises` table  
  - Create any new `muscle_groups` or `categories` if needed  
  - Immediately available in search and filter  

---

## Progress & Analysis

- **Progress Tab** shows overall lifting metrics.  
- **Per‑Exercise Charts**:  
  - Weight over Time (line chart)  
  - Max Gain & % Increase  
  - Session Count  

- Drill‑in for each exercise via a “📈” icon → **Progress Analysis** screen.

---

## State Management

- **React Context** (`WorkoutSessionContext`) holds:  
  - `currentExercises: Exercise[]`  
  - `sessionMeta: { date, id }`  
- Accessible across all screens—no prop drilling.  
- On **End Workout**, context flushes and writes session to local `workouts` table.

---

## Offline‑First Behavior

- Entire app logic (searching, filtering, CRUD) runs against local SQLite.  
- No network checks, no fetch calls—instantly responsive.  
- Future extension: sync sessions to cloud when online.

---

## Build‑Time `exercises.json` → SQLite Pipeline

1. **Source**: `/scripts/exercises.json`  
2. **Build Script** (`node scripts/buildDb.js`):  
   - Reads JSON, normalizes to tables: `exercises`, `muscle_groups`, `categories`, `exercise_muscle`, etc.  
   - Writes a pre‑populated `db/app.db` file.  
3. **Expo Asset**: `db/app.db` is copied into the bundle and referenced in `app.json`.  
4. **First Launch**: Copy asset to `FileSystem.documentDirectory` → open via `