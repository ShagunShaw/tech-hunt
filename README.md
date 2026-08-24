<div align="center">

# 🧭 Tech Hunt ⚡

### A technical treasure hunt game where teams think fast, move smart, and race the clock.

<p>
	<img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18 or newer">
	<img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
	<img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5">
	<img src="https://img.shields.io/badge/PostgreSQL-durable-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
	<img src="https://img.shields.io/badge/Redis-live%20state-DC382D?logo=redis&logoColor=white" alt="Redis">
	<img src="https://img.shields.io/badge/License-ISC-yellow" alt="ISC license">
</p>

</div>

> 🏁 **The mission:** build balanced teams, decode the route, solve technical challenges, and reach the final stage before time runs out.

## 🗺️ Table Of Contents

- [✨ What Is Tech Treck?](#-what-is-tech-treck)
- [🎮 Core Features](#-core-features)
- [🧩 How The Game Works](#-how-the-game-works)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [🗃️ Data Model](#️-data-model)
- [🚀 Quick Start](#-quick-start)
- [📡 API Overview](#-api-overview)
- [🧠 Complexity And Design](#-complexity-and-design)
- [🔐 Operational Notes](#-operational-notes)
- [🧪 Project Status](#-project-status)

## ✨ What Is Tech Treck?

Tech Treck is a backend API for a live, team-based technical treasure hunt. Participants register, receive a genre, form balanced teams, scan stage QR codes, solve questions across technical domains, use limited hints, and earn points as they progress through the game. Administrators manage the question bank and game themes, while a super-admin controls approvals, the game clock, scoring adjustments, disqualifications, and final results.

The project coordinates many concurrent participants, keeps the live game state in Redis, persists authoritative data in PostgreSQL, and uses a background worker to end the game automatically when the configured duration expires.

### 📊 At A Glance

| 🎯 Challenge | ⚙️ System Response |
| --- | --- |
| Many participants acting at once | Redis-backed transient state and throttled routes |
| Fair team formation | Genre-aware group validation before database commit |
| A hard event deadline | Redis game clock plus delayed BullMQ auto-end job |
| Different user responsibilities | JWT authentication and role-based access control |
| Flexible puzzle routes | Themes, ordered messages, questions, hints, and QR checkpoints |

<div align="center">

**Register** ➜ **Choose a genre** ➜ **Form a group** ➜ **Scan** ➜ **Solve** ➜ **Score** 🏆

</div>

## 🎮 Core Features

- **Google OAuth authentication** for participant registration/login, admin registration/login, and super-admin login.
- **Role-based access control** for `participant`, `admin`, and `super-admin` users.
- **Approval workflow** where new admins remain pending until a super-admin approves or rejects them.
- **Session-aware JWT authentication** with short-lived access tokens, refresh tokens, cookie support, and logout/session revocation.
- **Participant registration** with contact, college, department, and academic-year information.
- **Genre-based team formation** using the four event genres: `Earth`, `Stars`, `Sun`, and `Sky`.
- **Group lifecycle management** including creation, joining, aborting, completion progress, points, time taken, and disqualification.
- **Theme and message management** for the clues or instructions shown during each game path.
- **Question management** across six domains: `DSA`, `Web`, `AI/ML`, `Cybersecurity`, `Cloud&Devops`, and `BlockChain`.
- **Hints** that can be created and consumed per question/stage.
- **QR-driven gameplay** for starting a group, retrieving a question for a stage, and progressing through the hunt.
- **Live scoring** with level progress, point updates, extra points by reached level, and results retrieval.
- **Automatic and manual game ending**. BullMQ schedules an automatic end job; a super-admin can also end the game early.
- **Redis transient state** for the game clock, active gameplay counters, group/member state, hints, themes, and genre data.
- **PostgreSQL transactions** for important game-ending and group/result updates.
- **Rate limiting** with strict, moderate, and relaxed limits for sensitive, administrative, and gameplay routes.
- **Structured API responses and errors** through the local `ApiResponse` and `ApiError` utilities.
- **Email notification** after successful participant registration, with SMTP/Maileroo integration available in the email service.
- **Development and production logging** through Winston, with Axiom support in production.

## 🧩 How The Game Works

1. A participant uses Google registration and submits their event details.
2. The event team assigns or verifies a participant's physical genre card. The participant registers that genre through the group workflow.
3. A participant creates a group. Other participants join using the group identifier.
4. The backend validates group membership and genre constraints before the group is committed.
5. The super-admin starts the game. The start time, running flag, and configured duration are copied into Redis for fast checks on every gameplay request.
6. A group scans its start QR, then scans stage QR codes to retrieve the appropriate themed question.
7. The group can request hints and submit successful progress for points. A group that reaches level `6` has cleared all stages.
8. The game ends when the super-admin calls the end route or the BullMQ `autoEnd` job fires. Active groups are finalized, gameplay keys are cleaned up, and the running state is reset.
9. The super-admin can allocate extra points, disqualify groups, create special groups for remaining members, and fetch results.

## 🏗️ Architecture

```mermaid
flowchart LR
    A[🧑‍💻 Client / Frontend] --> B[⚡ Express API]
    B --> C[🔐 Google OAuth + JWT + RBAC]
    B --> D[(⚡ Redis live state)]
    B --> E[(🐘 PostgreSQL)]
    B --> F[📬 BullMQ queue]
    F --> G[🤖 Game worker]
    G --> D
    G --> E
```

### Main layers

- `src/routes`: HTTP route definitions and middleware composition.
- `src/controller`: Request validation, service invocation, and HTTP response handling.
- `src/service`: Domain logic for users, groups, questions, themes, games, and super-admin operations.
- `src/middlewares`: JWT verification, role authorization, game-running checks, and request throttling.
- `src/drizzle`: PostgreSQL connection, schema, migration runner, and generated migrations.
- `src/workers`: BullMQ workers, including automatic game termination and transient-state cleanup.
- `src/batchProcesses`: Queued/batched admin approval and deletion operations.
- `src/emailService`: Registration email delivery.

## 🛠️ Technology Stack

### Runtime and API

- Node.js with TypeScript and native ES modules
- Express 5
- `tsx` and Nodemon for development
- JSON and URL-encoded request parsing
- CORS with credential support

### Data and asynchronous processing

- PostgreSQL for durable event, identity, content, group, and result data
- Drizzle ORM for typed database access
- Drizzle Kit for schema migration generation and execution
- Redis for low-latency, temporary game state
- BullMQ for delayed background jobs backed by Redis

### Security and integrations

- Google OAuth 2.0 authorization-code flow
- JWT access and refresh tokens using HS256
- HTTP-only cookie authentication, with Authorization header support for access tokens
- Zod for validation and typed token payloads
- `express-rate-limit` for route throttling
- Nodemailer and Maileroo-compatible email delivery
- Winston and Axiom logging

## 🗃️ Data Model

The Drizzle schema defines the following PostgreSQL tables and enums:

- **`participant`**: Google identity, profile/event details, and persisted refresh-token sessions.
- **`admin`**: Admin identity, role, approval status, description, and sessions. A super-admin is represented by an approved admin record with role `superAdmin` in the database, while the application token role is `super-admin`.
- **`group`**: Team name, status, points, elapsed time, assigned theme, and maximum level reached.
- **`group_member`**: Participant-to-group relationship and genre assignment. Participant membership is unique and group deletion cascades to its members.
- **`game_config`**: The single event configuration row containing start time, running state, and duration in seconds.
- **`question`**: Question text, one or more accepted answers, domain, and hints.
- **`theme`**: A named game path with ordered message and question identifiers.
- **`theme_message`**: Ordered clue/message content associated with a theme.

Important enum values include:

- Group status: `active`, `disqualified`, `aborted`, `cleared`
- Approval status: `pending`, `approved`, `rejected`
- Levels: `0` through `6`, where `6` is the final cleared stage
- Academic year: `1st` to `5th`

## 📡 API Overview

The API is mounted at `http://localhost:3000/api/v1` by default. Protected routes accept the access token from the `accessToken` cookie or an `Authorization: Bearer <token>` header.

### Health

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API health |
| `GET` | `/api/v1/health` | Check API health through the user router |

### Authentication and users

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/auth/google/register` | Start participant Google registration |
| `GET` | `/auth/google/register/callback` | Complete participant Google registration handshake |
| `POST` | `/register` | Persist participant details from the Google registration token |
| `GET` | `/auth/google/login` | Start participant Google login |
| `GET` | `/auth/google/login/callback` | Complete participant login |
| `GET` | `/auth/google/admin/register` | Start admin registration |
| `GET` | `/auth/google/admin/register/callback` | Complete admin Google registration handshake |
| `POST` | `/admin/register` | Persist admin details; new admins start as pending |
| `GET` | `/auth/google/admin/login` | Start approved-admin login |
| `GET` | `/auth/google/admin/login/callback` | Complete admin login |
| `GET` | `/auth/google/superAdmin/login` | Start super-admin login |
| `GET` | `/auth/google/superAdmin/login/callback` | Complete super-admin login |
| `POST` | `/logout` | Revoke the current session for any authenticated role |

### Groups and gameplay

| Method | Path | Required role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/group/genre` | Participant | Register a genre |
| `POST` | `/group/create` | Participant | Create a group |
| `POST` | `/group/join` | Participant | Join an existing group |
| `PATCH` | `/group/abort/:groupId` | Participant | Abort a group while the game is running |
| `GET` | `/group/` | Super-admin | List groups with pagination |
| `GET` | `/game/startQR/:groupId` | Participant | Fetch the group's start message |
| `GET` | `/game/QR/:groupId` | Participant | Fetch a question for a theme and level |
| `GET` | `/game/hints/:groupId` | Participant | Request a hint for a level |
| `PATCH` | `/game/points/:groupId` | Participant | Advance scoring after a successful answer |

### Administration and content

| Method | Path | Required role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/super-admin/pendingAdmin` | Super-admin | List pending admin applications |
| `PATCH` | `/super-admin/manage/:adminId` | Super-admin | Approve or reject an admin |
| `GET` | `/super-admin/admins` | Admin or super-admin | List approved admins |
| `DELETE` | `/super-admin/admin/:adminId` | Super-admin | Delete an admin |
| `PATCH` | `/super-admin/startGame` | Super-admin | Start the game and schedule auto-end |
| `PATCH` | `/super-admin/endGame` | Super-admin | End the game explicitly |
| `PATCH` | `/super-admin/extraPoints` | Super-admin | Allocate level-based extra points |
| `PATCH` | `/super-admin/disqualify/:groupId` | Super-admin | Disqualify a group |
| `POST` | `/super-admin/specialGroup` | Super-admin | Create a group for remaining members |
| `GET` | `/super-admin/results` | Super-admin | Fetch final group results |
| `GET` | `/theme/` | Admin or super-admin | List themes |
| `POST` | `/theme/` | Admin or super-admin | Create a theme |
| `PATCH` | `/theme/:themeId` | Admin or super-admin | Update a theme |
| `DELETE` | `/theme/:themeId` | Admin or super-admin | Delete a theme |
| `GET` | `/theme/:themeId` | Admin or super-admin | List theme messages |
| `POST` | `/theme/message/:themeId` | Admin or super-admin | Add a theme message |
| `PATCH` | `/theme/message/:messageId` | Admin or super-admin | Update a theme message |
| `DELETE` | `/theme/message/:messageId` | Admin or super-admin | Delete a theme message |
| `POST` | `/theme/reorder/:themeId` | Admin or super-admin | Reorder theme messages |
| `POST` | `/question/` | Admin or super-admin | Add a question |
| `GET` | `/question/` | Admin or super-admin | List questions, optionally by domain and page |
| `PATCH` | `/question/:questionId` | Admin or super-admin | Update a question |
| `DELETE` | `/question/:questionId` | Admin or super-admin | Delete a question |
| `POST` | `/question/hints/:questionId` | Admin or super-admin | Add hints |
| `GET` | `/question/hints/:questionId` | Admin or super-admin | List hints |
| `PATCH` | `/question/hints/:questionId` | Admin or super-admin | Update hints |
| `DELETE` | `/question/hints/:questionId` | Admin or super-admin | Delete hints |

## 📋 Prerequisites

- Node.js suitable for the installed TypeScript/Express dependencies
- pnpm `10.29.2` or a compatible pnpm release
- Docker Desktop, if using the included PostgreSQL and Redis services
- A Google OAuth client configured for the callback URLs used by the application
- An SMTP or Maileroo account if registration emails are required

## 🚀 Quick Start

### 1️⃣ Install dependencies

```bash
pnpm install
```

### 2️⃣ Start infrastructure

```bash
docker compose up -d
```

The compose file starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- pgAdmin on `http://localhost:8000`

The development PostgreSQL credentials from `docker-compose.yml` are user `super_admin` and password `mysecretpassword`. The compose file does not create a database explicitly, so use the default database or create the database named in your connection string before migrating.

### 3️⃣ Configure environment variables

Create a `.env` file in the project root. Do not commit it.

```dotenv
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://super_admin:mysecretpassword@localhost:5432/postgres
REDIS_HOST=localhost
REDIS_PORT=6379

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_TOKEN_SECRET=replace-with-a-long-random-secret
GOOGLE_TOKEN_EXPIRY=10m

ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
REFRESH_TOKEN_EXPIRY=7d

EMAIL_USER=your-smtp-user
EMAIL_PASSWORD=your-smtp-password

# Optional production logging
AXIOM_DATASET_NAME=your-axiom-dataset
AXIOM_INGEST_TOKEN=your-axiom-token

# Optional Maileroo delivery settings
MAILEROO_API_KEY=your-maileroo-api-key
MAILEROO_DOMAIN_NAME=your-maileroo-domain
```

The Google callback URLs currently hardcoded by the controllers are:

```text
http://localhost:3000/api/v1/auth/google/register/callback
http://localhost:3000/api/v1/auth/google/admin/register/callback
http://localhost:3000/api/v1/auth/google/login/callback
http://localhost:3000/api/v1/auth/google/admin/login/callback
http://localhost:3000/api/v1/auth/google/superAdmin/login/callback
```

Register these URLs in the Google Cloud OAuth client before testing authentication.

### 4️⃣ Generate and apply migrations

```bash
pnpm db:generate
pnpm db:migrate
```

`db:generate` creates migration SQL from `src/drizzle/schema.ts`. `db:migrate` applies those migrations to `DATABASE_URL`.

### 5️⃣ Bootstrap required records

The application expects two operational records that are not automatically seeded:

1. An approved super-admin in the `admin` table.
2. One initial row in `game_config`.

Use SQL appropriate for your deployment. The exact Google subject (`googleId`) must match the super-admin's Google account:

```sql
INSERT INTO admin (name, email, "googleId", role, description, status)
VALUES (
	'Event Super Admin',
	'super-admin@example.com',
	'google-subject-id',
	'superAdmin',
	'Initial event super administrator',
	'approved'
);

INSERT INTO game_config ("startTime", "isRunning", duration)
VALUES (NULL, false, 7200);
```

The configured duration is stored in seconds. `7200` represents two hours; change it to match the event. Check the generated migration and live column names before running seed SQL in a new environment.

### 6️⃣ Run the API

```bash
pnpm dev
```

The API listens on `http://localhost:3000` by default. Verify it with:

```bash
curl http://localhost:3000/health
```

For a production-style build:

```bash
pnpm build
pnpm start
```

The application imports `src/workers/game.worker.ts` at startup, so the BullMQ worker runs in the same Node process as the API. Redis must be available whenever the API starts.

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the API with Nodemon and `tsx` |
| `pnpm build` | Compile TypeScript into `dist/` |
| `pnpm start` | Run the compiled application |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply Drizzle migrations |

## 🧠 Complexity And Design

### Redis and PostgreSQL responsibilities

PostgreSQL is the source of durable truth for users, content, group records, and results. Redis is used for state that is read frequently during the event, such as `game:isRunning`, `game:startTime`, `game:duration`, stage counters, hints, genre state, and group-member state. This avoids querying PostgreSQL for every QR scan, hint request, or game-clock check.

The design creates a consistency boundary: Redis state must be initialized when a game starts and cleared when it ends. The worker and explicit end route therefore update PostgreSQL and Redis together as part of the game lifecycle. A Redis outage affects live gameplay even if PostgreSQL remains available.

### Concurrent group formation

Team creation is more involved than a simple insert. Members can register genre information and then converge on a group. The group workflow uses Redis sets and temporary group/member keys to coordinate concurrent joins, enforce the expected genre composition, and avoid partially committed teams. PostgreSQL receives the durable group and membership records after validation succeeds.

This improves responsiveness during a busy event, but it also means TTLs, duplicate joins, abandoned groups, and Redis cleanup must be treated as first-class failure cases.

### Game clock and automatic termination

When a super-admin starts the game, the configured duration is copied to Redis and a delayed BullMQ job is scheduled. Gameplay middleware compares the current time against the Redis start time and duration. The worker finalizes still-active groups, marks the game as stopped, and removes transient gameplay keys in batches using Redis `SCAN` and `UNLINK`.

### Query and transaction behavior

The schema uses integer primary keys and foreign keys for efficient joins. Group membership is normalized in `group_member` instead of storing member IDs in an array on `group`. Critical multi-step operations use Drizzle transactions, and mutating queries use `returning()` where the result is needed to confirm affected rows.

### Security and abuse controls

Authentication combines Google identity, signed JWTs, persisted refresh-token sessions, and role checks. Access tokens can be sent as HTTP-only cookies or bearer tokens. Rate limits are applied according to route sensitivity: strict routes allow 20 requests/minute, moderate routes 30 requests/minute, and relaxed gameplay routes 100 requests/minute. Production deployments should use strong secrets, HTTPS, an explicit frontend origin, and a shared rate-limit strategy if multiple API instances are deployed.

## 🔐 Operational Notes

- Start Redis before the API. `src/index.ts` connects to Redis during startup.
- Apply migrations before making API requests.
- Seed the approved super-admin and `game_config` row before the first login or game start.
- Keep the API process and BullMQ worker connected to the same Redis instance.
- Use one active game configuration row. The application is built around a single live event.
- Treat the physical genre-card verification process as part of event operations; the backend cannot verify that a participant was physically shown the correct card.
- Admin registration is not immediate authorization. A super-admin must approve the admin before admin-only operations are available.
- Participant registration sends an email as part of the registration flow, so missing email-provider configuration can prevent a successful registration response.
- The current OAuth callback URLs are development URLs hardcoded in the controllers. Production deployments need environment-aware callback configuration before they can use a production domain.

## 🧪 Project Status And Extension Areas

This repository contains the backend foundation and event workflows. Before production use, consider adding automated tests for authentication, duplicate sessions, concurrent group joins, Redis failure/recovery, game-end idempotency, and answer validation. A production deployment should also add secret management, database backup/restore procedures, HTTPS and secure cookie configuration, health checks for PostgreSQL and Redis, and a documented seed/migration process.

## 📄 License

This project currently declares the ISC license in `package.json`.
