# Undercover Pro PWA

A modern, offline-first PWA implementation of the popular social deduction game "Undercover", inspired by Duolingo's design system.

## Features

- **Offline-First**: Works without an internet connection after the first load.
- **P2P Synchronization**: Uses `BroadcastChannel` (for same-device/browser testing) and can be easily extended to WebRTC. Ideally designed for local play.
- **Massive Database**: 1000+ word pairs categorized by difficulty.
- **Smooth Animations**: Framer Motion for high-quality transitions and interactions.
- **Responsive Design**: Mobile-first approach with safe-area support.
- **No Login**: Instant play with anonymous nicknames and avatars.

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context + `useReducer`
- **Sync**: `BroadcastChannel` for local synchronization simulation (perfect for passing the phone or multi-tab testing). *Note: For true multi-device play over the internet without a backend, a WebRTC signaling server would be needed, but this version focuses on the "Pass and Play" or "Local Network" architecture where possible.*

## Setup & Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    npm start
    ```

## How to Play

1.  **Create a Room**: One player creates a room and shares the link (or room code) with others.
2.  **Join**: Other players enter their nickname and join.
3.  **Lobby**: Wait for everyone to be ready (minimum 4 players recommended).
4.  **Reveal**: Each player secretly views their word.
5.  **Debate**: Discuss and try to find the impostor without revealing your word too obviously.
6.  **Vote**: Eliminate the suspect.
7.  **Result**: See if the Civilians won or if the Impostor survived!

## Technologies

- Next.js
- Tailwind CSS
- Framer Motion
- Lucide React
- Canvas Confetti
- Next-PWA