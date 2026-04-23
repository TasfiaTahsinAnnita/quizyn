# Quizyn Build Log

This file records all implementations, design decisions, and future plans for the Quizyn project.

## [2026-04-23] Initial Setup

### Implemented
- [x] Initialized Next.js project with TypeScript and App Router.
- [x] Chose **Vanilla CSS** for premium styling control.
- [x] Created `BUILD_LOG.md` to track progress.
- [x] **Database Schema**: Defined Prisma MySQL schema (Quizzes, Questions, Sessions).
- [x] **Library Setup**: Configured singleton Prisma client and Pusher instances.
- [x] **Dependency Fix**: Manually updated `package.json` with `bcrypt`, `next-auth`, and `pusher`.
- [x] **Authentication**: Setup NextAuth with Credentials provider (ready for MySQL).
- [x] **Host Dashboard**: Created the layout and integrated dynamic data fetching from MySQL.
- [x] **Quiz Creator**: Implemented a dynamic form and connected it to the backend API.
- [x] **API Routes**: Created POST and GET endpoints for quizzes and game sessions.
- [x] **Lobby System**: Built the real-time Host Lobby and Player Join logic using Pusher.
- [x] **GitHub Push**: Code pushed to `https://github.com/TasfiaTahsinAnnita/quizyn.git`.
- [/] **Finalizing Installation**: Syncing dependencies with `--legacy-peer-deps`.
- [ ] **Premium Design**: Define a vibrant color palette and custom components.
- [ ] **Auth**: Implement NextAuth for host accounts.

## Next Steps
1.  **Gameplay Engine**: Logic for the host to "Start Game" and cycle through questions.
2.  **Player View**: Real-time interface for players to see shapes and answer.
3.  **Leaderboard**: Real-time scoring and ranking between questions.

### Tech Stack Confirmed
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: MySQL (Free tier)
- **Real-time**: Pusher (Free tier)
- **Styling**: Vanilla CSS
- **Deployment**: Vercel
