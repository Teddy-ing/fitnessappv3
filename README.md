# Workout App

A free, privacy-first workout tracking app that adapts to you over time.

## Vision

**"The more you use it, the more it adapts to you—while staying 100% private."**

Unlike other workout apps, this app:
- Is **completely free** (with optional donation/cheap AI features)
- Uses **on-device ML** to learn your patterns (data never leaves your phone)
- Has a **modern UI** inspired by Hevy's design
- Uses **low-friction logging** inspired by Strong's "1-click = 3 actions" flow
- Supports **warmup/stretching tracking** (a gap in the market)
- Is **open source** for full transparency

## Tech Stack

- **Framework:** React Native + Expo
- **Language:** TypeScript
- **State Management:** TBD (Zustand or Redux)
- **Local Database:** TBD (expo-sqlite or WatermelonDB)
- **On-device ML:** TBD (TensorFlow Lite or custom)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (installed automatically via npx)
- Android Studio (for Android development) or Expo Go app

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (requires macOS)
npm run ios

# Run on web
npm run web
```

## Project Structure

```
workout-app/
├── .agent/                 # AI agent knowledge & workflows
│   ├── knowledge/          # Project documentation
│   └── workflows/          # Development procedures
├── src/
│   ├── components/         # Reusable UI components
│   ├── screens/            # Full-screen views
│   ├── services/           # Business logic, data access
│   ├── models/             # Data types and entities
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation configuration
│   ├── theme/              # Colors, typography, spacing
│   └── utils/              # Helper functions
├── assets/                 # Images, fonts, etc.
├── App.tsx                 # App entry point
├── app.json                # Expo configuration
└── package.json            # Dependencies
```

## Features (Planned)

### MVP (v1.0)
- [ ] Core workout logging
- [ ] Exercise database
- [ ] Template system
- [ ] Basic analytics
- [ ] Export (CSV, JSON)

### v1.1
- [ ] On-device ML autocomplete
- [ ] Workout day predictions
- [ ] Import from competitors

### v1.2+
- [ ] Cloud backup (Google/iCloud)
- [ ] AI chatbot (paid tier)
- [ ] Advanced analytics

## Contributing

This is an open source project. Contributions are welcome!

## License

MIT License - See LICENSE file for details.
