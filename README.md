# Retro Gym Tracker

A modern, cyberpunk-styled fitness companion built with React Native, Expo, and SQLite. Designed for serious gym enthusiasts who want a beautiful, fast, and fully-featured offline experience for tracking strength training, cardio sessions, and workout programs with a unique retro terminal aesthetic.

---

## Table of Contents
- [Overview](#overview)
- [Core Features](#core-features)
- [Cardio Capabilities](#cardio-capabilities)
- [Program Management](#program-management)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Data Import/Export](#data-importexport)
- [Notifications](#notifications)
- [Contributing](#contributing)

---

## Overview
Retro Gym Tracker is a comprehensive cross-platform mobile fitness app that combines strength training, cardio workouts, and program management in one sleek package. With its distinctive neon-green terminal UI, robust offline capabilities, and advanced session persistence, it's built for fitness enthusiasts who demand both style and substance.

---

## Core Features

### 🏋️ **Strength Training**
- **Workout History:** Log, view, search, and filter all past workouts with comprehensive stats
- **Real-time Session Tracking:** Live workout sessions with rest timers and background persistence
- **Exercise Management:** Extensive pre-loaded exercise database plus custom exercise creation
- **Progress Visualization:** Interactive line graphs showing weight progression and performance trends
- **Set Tracking:** Track weight, reps, rest duration, and detailed notes for every set
- **Smart Rest Timers:** Configurable rest periods with push notifications

### 📊 **Analytics & Progress**
- **Detailed Statistics:** Comprehensive workout analytics and performance metrics
- **Attendance Calendar:** Visual calendar showing workout consistency and streaks
- **Progress Charts:** Beautiful SVG-based charts tracking strength gains over time
- **Workout Reports:** Generate and export detailed workout summaries
- **Performance Tracking:** Monitor volume, intensity, and frequency patterns

### 🎯 **Templates & Organization**
- **Workout Templates:** Create, edit, and reuse custom workout templates
- **Template Categories:** Organize by type (strength, cardio, flexibility) and difficulty
- **Favorites System:** Quick access to frequently used templates
- **Template Sharing:** Import/export templates for sharing with others

---

## Cardio Capabilities

### 🏃 **HIIT Training**
- **Quick HIIT Sessions:** Customizable work/rest intervals with round tracking
- **Real-time Timers:** Live countdown with visual progress indicators
- **Smart Scheduling:** Pre-calculated session schedules with phase transitions
- **Background Persistence:** Sessions continue running when app is backgrounded
- **Audio Notifications:** Sound alerts for work/rest transitions

### 🚶 **Walk-Run Intervals**
- **Custom Intervals:** Adjustable run/walk durations and lap counts
- **Phase Tracking:** Real-time tracking of current lap and phase
- **Progress Visualization:** Live progress bars showing session completion
- **Flexible Configuration:** Customizable parameters for all fitness levels

### 📱 **Session Management**
- **Pause/Resume:** Full session control with accurate time tracking
- **Early Completion:** Option to finish sessions early with confirmation
- **Session Recovery:** Automatic recovery of interrupted sessions on app restart
- **History Integration:** All cardio sessions saved to workout history

---

## Program Management

### 📅 **Structured Programs**
- **Multi-Week Programs:** Create comprehensive training programs spanning multiple weeks
- **Program Templates:** Build programs using existing workout templates
- **Progress Tracking:** Monitor program completion percentage and current status
- **Flexible Scheduling:** Assign specific workouts to each day of the week
- **Rest Day Management:** Built-in rest day scheduling and tracking

### 🎯 **Program Features**
- **Active Program Tracking:** Set and track your current active program
- **Program Editor:** Visual program builder with drag-and-drop interface
- **Day-by-Day Planning:** Detailed workout planning for each program day
- **Program Analytics:** Track adherence and completion statistics
---

## Tech Stack
- **Frontend:** React Native 0.79.5, Expo 53.0, TypeScript
- **Database:** SQLite with Drizzle ORM for type-safe database operations
- **Navigation:** Expo Router for file-based routing
- **State Management:** React Context with custom hooks for session management
- **Notifications:** Expo Notifications for rest timers and cardio alerts
- **Data Parsing:** PapaParse for CSV import functionality
- **Charts & Visualization:** react-native-svg for custom progress charts
- **UI Components:** Custom retro-themed components with neon styling
- **Fonts:** Custom cyberpunk fonts (Orbitron, VT323, Share Tech Mono)

---

## Architecture
- **App Structure:**
  - `app/` — Main screens with file-based routing (history, cardio, program, etc.)
  - `components/` — Reusable UI components (charts, cards, modals)
  - `services/` — Business logic and data access layer
  - `hooks/` — Custom React hooks for session management and persistence
  - `db/` — Database schema, migrations, and client configuration
  - `context/` — React Context providers for global state
  - `styles/` — Centralized theming and design tokens
  - `scripts/` — Database utilities and development tools

- **Data Flow:**
  - SQLite database with Drizzle ORM for type-safe queries
  - Background session persistence for workout and cardio continuity
  - Real-time UI updates through React Context and hooks
  - Offline-first architecture with optional data export

---

## Setup & Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sxhail/retro-gym-tracker.git
   cd retro-gym-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   ```bash
   node scripts/buildDb.js
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```

5. **Run on device/emulator:**
   ```bash
   # iOS
   npx expo run:ios
   
   # Android
   npx expo run:android
   ```

---

## Usage

### 💪 **Strength Training**
- **Start New Workout:** Tap 'New Workout' to begin a lifting session
- **Add Exercises:** Browse the extensive exercise database or create custom exercises
- **Track Sets:** Log weight, reps, and rest time for each set
- **Rest Timers:** Use built-in rest timers with notification alerts
- **Save Session:** Complete and save workouts to history

### 🏃 **Cardio Sessions**
- **Choose Cardio Type:** Select HIIT or Walk-Run intervals
- **Configure Session:** Set work/rest intervals, rounds, or laps
- **Start Training:** Begin session with real-time progress tracking
- **Background Support:** Session continues even when app is backgrounded
- **Completion:** Finish early or complete full session

### 📊 **Progress Tracking**
- **View History:** Browse all past workouts with detailed filtering
- **Analyze Progress:** View interactive charts showing strength gains
- **Track Consistency:** Use the attendance calendar to monitor workout frequency
- **Generate Reports:** Export workout data and progress summaries

### 📅 **Program Management**
- **Create Programs:** Build multi-week structured training programs
- **Follow Programs:** Set active programs and track daily workouts
- **Monitor Progress:** View program completion and adherence statistics

---

## Data Import/Export

### 📥 **CSV Import**
- **Supported Formats:** Import from STRONG app and other fitness platforms
- **Smart Mapping:** Automatic exercise name matching and normalization
- **Data Validation:** Robust duplicate handling and data integrity checks
- **User Confirmation:** Review and edit new exercises before import
- **Flexible Parsing:** Handles various CSV formats and column structures

### 📤 **Data Export**
- **Workout Reports:** Generate detailed workout summaries and progress reports
- **Data Sharing:** Export workout data for backup or sharing
- **Format Options:** Multiple export formats for compatibility

---

## Notifications

### 🔔 **Smart Notifications**
- **Rest Timer Alerts:** Automatic notifications when rest periods complete
- **Cardio Phase Changes:** Audio/visual alerts for HIIT and interval transitions
- **Session Reminders:** Configurable workout reminder notifications
- **Background Support:** Notifications work even when app is backgrounded
- **iOS Integration:** Native iOS notification support with `expo-notifications`

### ⚙️ **Notification Features**
- **Customizable Timing:** Adjust notification timing for different workout types
- **Session Management:** Auto-cancel notifications when sessions end or are cancelled
- **Permission Handling:** Seamless permission requests and handling
- **Reliability:** Robust notification scheduling and delivery system

---

## Contributing

We welcome contributions! Here's how you can help make Retro Gym Tracker even better:

1. **Fork the repository** and create your feature branch:
   ```bash
   git checkout -b feature/YourAmazingFeature
   ```

2. **Make your changes** following the existing code style and architecture

3. **Test thoroughly** on both iOS and Android if possible

4. **Commit your changes** with descriptive messages:
   ```bash
   git commit -m 'Add some amazing feature'
   ```

5. **Push to your branch**:
   ```bash
   git push origin feature/YourAmazingFeature
   ```

6. **Open a Pull Request** with a clear description of your changes

### 🎯 **Areas We'd Love Help With**
- New cardio workout types (rowing, cycling, etc.)
- Advanced analytics and progress tracking
- Cloud sync and backup features
- Accessibility improvements
- Performance optimizations
- Bug fixes and testing

### 💡 **Feature Ideas**
- Apple Health / Google Fit integration
- Wearable device support
- Social features and workout sharing
- Advanced program templates
- Machine learning for workout recommendations

---

## License & Contact

**License:** MIT License - feel free to use, modify, and distribute

**Contact:** For questions, suggestions, or just to share your gains, reach out through GitHub issues or discussions.

**Built with 💪 for the fitness community**

