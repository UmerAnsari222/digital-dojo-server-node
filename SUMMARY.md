# Digital Dojo Server

A gamified habit-building and challenge platform backend API for the Digital Dojo mobile app. Users complete daily/weekly habits and challenges to earn streaks, belts, and growth scores, inspired by martial arts belt progression.

## Tech Stack

| Category           | Technology                                                   |
| ------------------ | ------------------------------------------------------------ |
| Runtime            | Node.js, TypeScript                                          |
| Web Framework      | Express 5.x                                                  |
| ORM / Database     | Prisma 6.x / PostgreSQL                                      |
| Background Jobs    | BullMQ (Redis) + node-cron                                   |
| Auth               | JWT, bcrypt, Google OAuth2, Apple Sign In (JWKS)             |
| Subscriptions      | RevenueCat (cross-platform IAP)                              |
| Push Notifications | Firebase Admin SDK (FCM)                                     |
| Email              | Nodemailer (Gmail SMTP) + EJS templates                      |
| File Storage       | AWS S3 (presigned URLs)                                     |
| Video Streaming    | Cloudflare Stream                                            |
| Cache / Queue      | Redis (ioredis)                                              |
| Logging            | Winston + Morgan                                             |
| Deployment         | PM2, GitHub Actions (SSH deploy)                             |

## Architecture

Classic MVC-like layered architecture:

```
Routes (routing + auth middleware)
  -> Controllers (request handling, validation)
    -> Services (Apple/Google auth verification, Cloudflare)
    -> Utils (AWS S3, JWT, OTP, statistics, date helpers)
    -> Config (Prisma DB client, logger, mailer)

Background Jobs:
  BullMQ Queues + Workers (streaks, notifications, challenge skip, OTP, report mail)
  node-cron (growth score, consistency, challenge status, DB backup)

Webhooks:
  RevenueCat (subscription lifecycle)
  Cloudflare Stream (video processing status)
```

## Project Structure

```
src/
├── app.ts                  # Express server entry point
├── config/                 # Prisma client, env vars, logger, mailer
├── controllers/            # 20 route handler files
├── events/                 # EventEmitter bus
├── firebase/               # Firebase Admin SDK init
├── jobs/                   # BullMQ queues, producers, workers, scheduler
├── middlewares/            # JWT auth + global error handler
├── prisma/schema.prisma    # DB schema (18 models, 7 enums)
├── routes/                 # Express route definitions (20 files)
├── services/               # Apple/Google token verification, Cloudflare
├── types/                  # Constants + TypeScript type definitions
├── utils/                  # AWS S3, JWT, OTP, bcrypt, Subscription, stats, helpers
├── views/                  # EJS email templates (email.ejs, report-notification.ejs)
└── webhooks/               # RevenueCat & Cloudflare Stream webhooks
```

## Database Models (18)

- **User** - Core account with streaks, belts, growth scores, FCM tokens (multiple)
- **Habit / UserHabit** - Pre-defined and user-selected habits
- **Completion** - Daily completion records for habits & challenges
- **Challenge / DailyChallenge / WeeklyChallenge** - Challenge plans and instances
- **UserDailyChallenge / WeeklyChallengeCompletion** - User challenge states
- **Category** - Habit/challenge categorization
- **Belt / UserBelt** - Belt levels and user earnings
- **Circle / CircleChallenge / CircleChallengeParticipant** - Social groups
- **UserPreferences** - Notification preferences
- **Notification** - In-app notification records
- **Subscription** - Stripe subscription tracking (legacy)
- **SubscriptionRevenueCat** - RevenueCat cross-platform subscription tracking
- **Video / VideoView** - Reel/video records with view tracking, block status, reel type
- **ReelReport** - Content moderation reports against reels
- **Contact** - Contact-us messages

## API Endpoints

All under `/api/v1/`. Key groups:

- **Auth** - Register, login (email, Apple, Google), password reset
- **Profile** - Get/update profile, preferences, delete account
- **Habits** - CRUD for habits, weekly progress tracking
- **Completions** - Mark habits/challenges complete, belt/streak updates
- **Challenges** - Daily & weekly challenge management (admin + user)
- **Belts** - Belt CRUD (admin) + user progression
- **Streaks** - User streak & belt progress
- **Circles** - Social groups with challenges (subscription required)
- **Reels** - Video/social feed with cursor-based pagination (hides blocked/pending-report reels)
- **Report** - Reel reporting, admin review/resolve/block/unblock
- **Payments** - Stripe checkout session & webhook handling
- **Notifications** - List/delete push notifications
- **Dashboard** - Admin stats
- **Webhooks** - RevenueCat & Cloudflare Stream
- **Contact Us** - Message submission & admin management

## Background Jobs

- **Streak Reset** (midnight daily) - Resets streaks for users inactive >3 days
- **Weekly Challenge Skip** (midnight daily) - Auto-skips uncompleted weekly challenges
- **Daily Reminder** (4 AM) - Push notifications to opted-in users
- **Challenge Alert** (hourly) - Challenge reminder notifications
- **OTP Sending** - Queued via BullMQ with exponential backoff
- **Growth/Consistency Score** (nightly 2 AM EST) - Recalculates scores
- **Challenge Status** (every 10 min) - Transitions SCHEDULE -> RUNNING -> COMPLETED
- **DB Backup** (15th of month, 3 AM) - pg_dump to S3
- **Report Mail** (on demand) - Sends reel report email notifications to all admins

## Key Patterns

- All async/await with centralized error handling
- Prisma transactions for atomic operations (e.g., user + preferences)
- Timezone-aware challenge/streak logic via `date-fns-tz`
- Cursor-based pagination for feed endpoints
- BullMQ workers with exponential backoff and retries
- Firebase FCM tokens (multiple per user) cleaned on invalid send errors
- Free users limited to 3 habits; subscription unlocks unlimited + circles
- Reels feed hides blocked and pending-report content (content moderation)
- Top Snaps scored feed (views * recency decay over 24h)
