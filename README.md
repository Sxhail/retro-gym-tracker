# Protocol

A modern, retro-styled workout tracking app built with React Native, Expo, and SQLite. Designed for fitness enthusiasts who want a beautiful, fast, and customizable experience for logging workouts, visualizing progress, and importing data from other platforms.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [CSV Import](#csv-import)
- [Extensibility](#extensibility)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [Contact](#contact)

---

## Overview
Retro Gym Tracker is a cross-platform mobile app for tracking workouts, visualizing progress, and managing exercise templates. It features a retro/neon UI, robust data import/export, and a focus on user experience and extensibility.

---

## Features
- **Workout History:** Log, view, and search all past workouts with detailed stats.
- **Progress Visualization:** Interactive line graphs for weight progression per exercise.
- **Exercise Management:** Add, edit, and auto-categorize exercises with muscle group and equipment tags.
- **Workout Templates:** Create and reuse custom workout templates.
- **CSV Import:** Seamlessly import workout data from the STRONG app or other sources, with auto-mapping and user confirmation for new exercises.
- **Data Integrity:** Robust duplicate handling, normalization, and error feedback.
- **Modern UI:** Retro/neon theme, responsive layout, and smooth navigation.
- **Offline Support:** All data is stored locally using SQLite.

---

## Tech Stack
- **Frontend:** React Native, Expo, TypeScript
- **Database:** SQLite (via Drizzle ORM)
- **CSV Parsing:** PapaParse
- **UI Libraries:** React Native Paper, react-native-svg
- **Navigation:** Expo Router
- **State Management:** React Context, useState, useEffect

---

## Architecture
- **App Structure:**
  - `app/` — Main screens (history, progress, templates, etc.)
  - `components/` — Reusable UI components (charts, cards, etc.)
  - `db/` — SQLite schema, client, and seed data
  - `services/` — Data access and business logic
  - `styles/` — Theme and design tokens
  - `scripts/` — DB build and test scripts
- **Data Flow:**
  - All user data is stored in SQLite and accessed via Drizzle ORM.
  - CSV import logic normalizes, maps, and inserts data with user confirmation.
  - UI updates in real-time after data changes.

---

## Setup & Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/gymtracker.git
   cd gymtracker/retro
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up the database:**
   ```sh
   node scripts/buildDb.js
   ```
4. **Start the app:**
   ```sh
   npx expo start
   ```
5. **(Optional) Run tests:**
   ```sh
   npm test
   ```

---

## Usage
- **Log Workouts:** Tap 'New Workout' to start logging sets and exercises.
- **View History:** Browse, search, and filter all past workouts in the History tab.
- **Visualize Progress:** Go to the Progress tab to see interactive charts for each exercise.
- **Import CSV:**
  - Tap 'IMPORT CSV' in the History screen.
  - Select a CSV file (e.g., exported from STRONG app).
  - Review and confirm new exercises, edit tags if needed.
  - Confirm import and view your data instantly.
- **Manage Templates:** Create, edit, and use workout templates for faster logging.

---

## CSV Import
- **Supported Format:**
  - Columns: Date, Workout Name, Duration (e.g., '1h 20m'), Exercise Name, Set Order, Weight, Reps, Distance, Seconds
  - Handles extra/unused columns gracefully.
- **Normalization:**
  - All exercise names are trimmed and lowercased for matching.
  - Duration is parsed from human-readable strings to seconds for accurate display.
- **Duplicate Handling:**
  - Existing exercises are detected and not duplicated.
  - Sets with 0kg and 0 reps are skipped.
- **User Confirmation:**
  - New exercises are auto-tagged and can be edited before import.
  - Import summary and error feedback provided.

---

## Extensibility
- **Add New Features:** Modular architecture makes it easy to add new screens, analytics, or integrations.
- **Custom Themes:** Easily swap or extend the retro/neon theme in `styles/theme.ts`.
- **Data Export:** (Planned) Export workouts and progress to CSV or other formats.
- **Cloud Sync:** (Planned) Integrate with cloud storage for backup and multi-device support.

---

## Contributing
1. Fork the repo and create your feature branch (`git checkout -b feature/YourFeature`)
2. Commit your changes (`git commit -am 'Add new feature'`)
3. Push to the branch (`git push origin feature/YourFeature`)
4. Open a Pull Request

---

## iOS Local Notifications

- Implemented with `expo-notifications` (iOS only). Permissions and handler are set at app start.
- Cardio HIIT and Walk/Run: all transitions and a final completion notification are pre-scheduled when the session starts.
- Lift rest timer: a notification is scheduled at the start of each rest to fire at rest completion.
- Ending/canceling a session cancels pending notifications to avoid irrelevant alerts.

