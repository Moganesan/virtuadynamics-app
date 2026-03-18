# VirtuaDynamics API Server

Backend API for the VirtuaDynamics health monitoring and drone management platform. Built with Express.js, MongoDB, and Socket.IO for real-time updates.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Real-time:** Socket.IO
- **Environment:** dotenv

## Getting Started

### Prerequisites

- Node.js
- MongoDB running locally (or a remote URI)

### Installation

```bash
cd server
npm install
```

### Environment Variables

Create a `.env` file in the `server/` directory:

```
MONGODB_URI=mongodb://localhost:27017/virtuadynamics
JWT_SECRET=your_secret_key
PORT=3000
```

### Run

```bash
# Production
npm start

# Development (with hot reload)
npm run dev
```

The server starts on `http://localhost:3000` by default. The database is auto-seeded with sample data on first run if empty.

## Authentication

Most endpoints require a JWT token. Obtain one via `POST /api/auth/session` and include it in subsequent requests as:

```
Authorization: Bearer <token>
```

## API Endpoints

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/session` | No | Exchange VirtuaLogin user for a JWT token |
| POST | `/api/auth/logout` | Yes | Logout / clear token |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Get own profile with health data |
| PUT | `/api/users/me` | Update health data (height/weight) |
| DELETE | `/api/users/me` | Delete own account |

### Vitals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vitals` | List own vitals (supports `limit` & `offset` query params) |
| GET | `/api/vitals/latest` | Get most recent vital record |
| GET | `/api/vitals/:id` | Get a specific vital record |
| POST | `/api/vitals` | Create a vitals record (required: `heartRate`, `bloodOxygen`) |
| PUT | `/api/vitals/:id` | Update a vital record |
| DELETE | `/api/vitals/:id` | Delete a vital record |

### Drones

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/drones` | List all drones (optional `status` filter: standby, active, charging, offline) |
| GET | `/api/drones/:id` | Get a specific drone |
| POST | `/api/drones` | Add a new drone (required: `name`) |
| PUT | `/api/drones/:id` | Update drone details |
| PATCH | `/api/drones/:id/status` | Quick status update |
| DELETE | `/api/drones/:id` | Delete a drone |

### Incidents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/incidents` | List incidents (optional `severity` filter, supports `limit` & `offset`) |
| GET | `/api/incidents/:id` | Get a specific incident |
| POST | `/api/incidents` | Create an incident (required: `anomalyType`, `severity`; optional: `recordingUrl` for call recording MP3) |
| PUT | `/api/incidents/:id` | Update an incident |
| PATCH | `/api/incidents/:id/severity` | Quick severity update (critical, warning, resolved) |
| DELETE | `/api/incidents/:id` | Delete an incident |

### Contacts (Emergency)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | List own emergency contacts |
| GET | `/api/contacts/:id` | Get a specific contact |
| POST | `/api/contacts` | Add an emergency contact (required: `name`, `phone`; optional: `role`) |
| PUT | `/api/contacts/:id` | Update a contact |
| DELETE | `/api/contacts/:id` | Delete a contact |

### Devices (Smart Rings)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/devices` | List own paired devices |
| GET | `/api/devices/:id` | Get a specific device |
| POST | `/api/devices` | Pair a new device (required: `name`) |
| PUT | `/api/devices/:id` | Update device info |
| PATCH | `/api/devices/:id/status` | Connect/disconnect (disconnected, scanning, connected) |
| DELETE | `/api/devices/:id` | Unpair and delete a device |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Get notification settings |
| PUT | `/api/notifications` | Replace all notification settings |
| PATCH | `/api/notifications/:key` | Toggle a single setting (emergencyAlerts, vitalWarnings, droneStatusUpdates, weeklyHealthReports) |

## Socket.IO

The server exposes a Socket.IO instance for real-time events. Clients can connect and join a user-specific room:

```js
socket.emit("join", userId);
```

## Project Structure

```
server/
├── config/         # Database connection
├── data/           # Seed data
├── middleware/      # Auth middleware
├── models/         # Mongoose schemas (User, Vital, Drone, Incident, EmergencyContact, Device, NotificationSettings)
├── routes/         # Express route handlers
├── index.js        # Entry point
└── package.json
```

## Postman

A Postman collection is included at `VirtuaDynamics.postman_collection.json` for easy API testing.
