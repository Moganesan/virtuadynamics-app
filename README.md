# VirtuaDynamics

A React Native (Expo) healthcare monitoring mobile app with a Node.js/Express backend. Tracks vital signs in real time, dispatches emergency drones, records incidents, and manages emergency contacts.

## Tech Stack

- **Frontend:** React Native 0.81, Expo 54, TypeScript, Expo Router
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT authentication
- **Database:** MongoDB with Mongoose ODM — persistent storage with indexed time-series vitals
- **Real-time:** Socket.IO for live vital signs, drone status, and incident alerts
- **External Auth:** [VirtuaLogin](https://virtuagrid.com) — handles all user identity and profile management

## Architecture

User management is split between an external service and the local backend. Real-time data flows through Socket.IO alongside the REST API.

### VirtuaLogin (External API — `virtuagrid.com`)

All user identity and basic profile data is managed by VirtuaLogin:

| Feature | Endpoint |
|---------|----------|
| Signup | `POST /api/user/signup` |
| Signin | `POST /api/user/signin` |
| Request OTP | `POST /api/user/otp` |
| Verify OTP | `POST /api/user/otp/verify` |
| Verify Token | `POST /api/user/token/verify` |
| Reset Password | `POST /api/user/password/reset` |
| Change Password | `POST /api/user/change_password` |
| Create Profile | `POST /api/user/profile/create` |
| Update Profile | `PUT /api/user/profile/update` |
| Delete Profile | `DELETE /api/user/profile/delete` |
| Logout | `POST /api/user/logout` |

**Profile fields on VirtuaLogin:** `first_name`, `last_name`, `email`, `username`, `phone`, `date_of_birth`, `home_address`, `office_address`, `profile_picture`, `nickname`, `country`

Authenticated VirtuaLogin endpoints require security headers:
- `X-Authorization` — API token from signin
- `salt` — randomly generated 16-char alphanumeric string
- `authid`, `mainid`, `accountid` — from signin response
- `valueverifier` — MD5 hash computed from salt + seed_verifier
- `appid` — application ID

### Local Backend (`localhost:3000`)

The local backend stores health-specific and app-specific data in MongoDB:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/session` | POST | Exchange VirtuaLogin user for local JWT |
| `/api/auth/logout` | POST | Stateless logout |
| `/api/users/me` | GET | Get local health data (height, weight) |
| `/api/users/me` | PUT | Update health data (height, weight) |
| `/api/users/me` | DELETE | Delete local account |
| `/api/vitals` | GET/POST | Vital sign records |
| `/api/vitals/latest` | GET | Most recent vital record |
| `/api/vitals/:id` | GET/PUT/DELETE | Single vital record |
| `/api/drones` | GET/POST | Drone fleet management |
| `/api/drones/:id` | GET/PUT/DELETE | Single drone |
| `/api/drones/:id/status` | PATCH | Quick status update |
| `/api/incidents` | GET/POST | Incident records |
| `/api/incidents/:id` | GET/PUT/DELETE | Single incident |
| `/api/incidents/:id/severity` | PATCH | Quick severity update |
| `/api/contacts` | GET/POST | Emergency contacts |
| `/api/contacts/:id` | GET/PUT/DELETE | Single contact |
| `/api/devices` | GET/POST | Connected devices (smart rings) |
| `/api/devices/:id` | GET/PUT/DELETE | Single device |
| `/api/devices/:id/status` | PATCH | Quick status update |
| `/api/notifications` | GET/PUT | Notification preferences |
| `/api/notifications/:key` | PATCH | Toggle single setting |

## Real-time Communication (Socket.IO)

The app uses Socket.IO for live updates. The client connects on login and joins a user-specific room.

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join` | Client → Server | Join user-specific room for targeted events |
| `vitals:new` | Server → Client | New vital record created (user-scoped) |
| `vitals:updated` | Server → Client | Vital record updated (user-scoped) |
| `drones:new` | Server → Client | New drone added (broadcast) |
| `drones:updated` | Server → Client | Drone details updated (broadcast) |
| `drones:statusChanged` | Server → Client | Drone status changed (broadcast) |
| `drones:deleted` | Server → Client | Drone removed (broadcast) |
| `incidents:new` | Server → Client | New incident created (broadcast) |
| `incidents:severityChanged` | Server → Client | Incident severity updated (broadcast) |

**Targeting:** Vitals events are emitted to the specific user's room (`user:{userId}`). Drone and incident events are broadcast to all connected clients.

## Database (MongoDB)

### Collections

| Collection | Description | Key Indexes |
|------------|-------------|-------------|
| `users` | Local user records linked to VirtuaLogin | `externalUserId` (unique) |
| `vitals` | Heart rate, SpO2, temperature, blood pressure | `{ userId, recordedAt }` compound |
| `drones` | Drone fleet: name, status, location, battery | — |
| `incidents` | Anomaly records with severity and routing info | `{ userId, createdAt }` compound |
| `emergencycontacts` | Per-user emergency contacts | `userId` |
| `devices` | Smart ring devices | `userId` |
| `notificationsettings` | Per-user notification preferences | `userId` (unique) |

### Seed Data

On first startup, the server seeds the database with:
- 4 drones (Alpha, Beta, Gamma, Delta)
- 2 sample incidents (High Heart Rate, Low Blood Oxygen)

## Authentication Flow

```
1. User signs up / signs in via VirtuaLogin external API
2. VirtuaLogin returns: user_id, email, api_token, seed_verifier, account_id, user_profiles, etc.
3. App stores external session in AsyncStorage
4. App calls POST /api/auth/session on local backend with { externalUserId, email }
5. Local backend creates/finds user in MongoDB, returns local JWT
6. App connects Socket.IO and joins user-specific room for real-time updates
7. Local JWT used for health data, contacts, notifications, devices
8. External api_token + security headers used for profile updates on VirtuaLogin
```

## Project Structure

```
virtuadynamics/
├── app/
│   ├── _layout.tsx              # Root layout with AuthProvider
│   ├── index.tsx                # Splash / redirect
│   ├── signin.tsx               # Login screen
│   ├── signup.tsx               # Registration screen
│   ├── verify-otp.tsx           # OTP verification
│   ├── onboarding.tsx           # Onboarding flow
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom tab navigation
│       ├── dashboard.tsx        # Vitals, drones, SOS (real-time)
│       ├── monitoring.tsx       # Incident history (real-time)
│       └── settings.tsx         # Profile, contacts, notifications
├── components/ui/               # Reusable UI components
├── context/
│   └── AuthContext.tsx           # Auth state (external + local tokens + socket)
├── services/
│   ├── api.ts                   # API clients and service layer
│   └── socket.ts                # Socket.IO client (connect, disconnect, getSocket)
├── constants/
│   └── theme.ts                 # Color scheme
├── server/
│   ├── index.js                 # Express + Socket.IO server entry
│   ├── .env                     # Environment config (MongoDB URI, JWT secret, port)
│   ├── config/
│   │   └── db.js                # Mongoose connection handler
│   ├── data/
│   │   └── seed.js              # Seed drones and incidents on first run
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Vital.js             # Vital signs schema (indexed by userId + recordedAt)
│   │   ├── Drone.js             # Drone schema
│   │   ├── Incident.js          # Incident schema
│   │   ├── EmergencyContact.js  # Emergency contact schema
│   │   ├── Device.js            # Smart ring device schema
│   │   └── NotificationSettings.js # Notification preferences schema
│   ├── middleware/
│   │   └── auth.js              # JWT auth middleware
│   └── routes/
│       ├── auth.js              # Session exchange, logout
│       ├── users.js             # Health data (height, weight)
│       ├── vitals.js            # Vital sign records + real-time emit
│       ├── drones.js            # Drone management + real-time emit
│       ├── incidents.js         # Incident records + real-time emit
│       ├── contacts.js          # Emergency contacts
│       ├── devices.js           # Smart ring devices
│       └── notifications.js     # Notification preferences
└── server/virtualogin.json      # VirtuaLogin Postman collection
```

## API Service Layer (`services/api.ts`)

| Client | Purpose |
|--------|---------|
| `apiClient` | Unauthenticated external calls (signup, signin, OTP) |
| `authenticatedClient` | Bearer-token external calls (logout) |
| `virtuaLoginClient` | Fully authenticated external calls with security headers (profile CRUD, change password) |
| `localClient` | Unauthenticated local backend calls (session creation) |
| `localAuthClient` | JWT-authenticated local backend calls (health data, contacts, etc.) |

**Service objects:**
- `authService` — signup, signin, OTP, token verify, password reset, logout
- `externalProfileService` — create/update/delete profile, change password (VirtuaLogin)
- `settingsService` — health data, contacts, notifications, devices (local backend)
- `vitalsService` — CRUD for vital sign records (local backend)
- `dronesService` — drone fleet queries and status updates (local backend)
- `incidentsService` — incident records and severity updates (local backend)

## Get Started

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)
- Expo CLI

### Setup

1. Install dependencies

   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. Configure the backend

   ```bash
   # server/.env (created automatically with defaults)
   MONGODB_URI=mongodb://localhost:27017/virtuadynamics
   JWT_SECRET=virtuadynamics_secret_key
   PORT=3000
   ```

3. Start MongoDB

   ```bash
   # macOS (Homebrew)
   brew services start mongodb/brew/mongodb-community

   # Or run directly
   mongod --dbpath /path/to/data
   ```

4. Start the local backend

   ```bash
   cd server && node index.js
   ```

   The server will connect to MongoDB, seed initial data (drones + incidents) on first run, and start listening on port 3000 with Socket.IO ready.

5. Start the app

   ```bash
   npx expo start
   ```

Open on [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), or a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Key Dependencies

**Frontend:**
- `expo-crypto` — MD5 hashing for VirtuaLogin `valueverifier` header
- `@react-native-async-storage/async-storage` — session persistence
- `expo-router` — file-based navigation
- `socket.io-client` — real-time communication with backend
- `react-native-reanimated` — animations
- `@shopify/react-native-skia` — canvas graphics
- `victory-native` — charting

**Backend:**
- `mongoose` — MongoDB ODM with schema validation
- `socket.io` — WebSocket server for real-time events
- `jsonwebtoken` — JWT authentication
- `dotenv` — environment variable management
