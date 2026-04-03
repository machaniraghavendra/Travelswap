# TravelSwap - Real-Time Last-Minute Ticket Reselling

TravelSwap is a full-stack platform for secure last-minute bus ticket resale.

## Tech Stack
- Backend: Java 21, Spring Boot, JPA, Spring Security, JWT
- Database: PostgreSQL
- Frontend: React 18 + Vite + React Router
- Live updates: SSE (Admin portal)

## Core Behavior
- One normal user account can both sell and buy tickets.
- Admin-only portal for system pulse, lifecycle events, and audit trails.
- System-generated selling price is based on fare and departure; user override must be lower or equal.
- Sellers can revoke available listings until purchased.
- Seller receives refund notification when buyer purchases.
- Users see personal sold trail, purchased history, upcoming trip highlight, and personal profit/loss metrics.

## Seed Users
- User 1: `seller@travelswap.com / Seller123`
- User 2: `buyer@travelswap.com / Buyer123`
- Admin: `admin@travelswap.com / Admin123`

## Run

### 1) PostgreSQL
```bash
cd C:\Users\RagavendraMachani\Documents\New project
docker compose up -d
```

### 2) Backend
```bash
cd backend
mvn spring-boot:run
```

### 3) Frontend
```bash
cd frontend
npm install
npm start
```

## Main API Groups

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/{sessionId}`

### Marketplace (Authenticated users)
- `POST /api/listings`
- `GET /api/listings`
- `GET /api/listings/{id}`
- `PATCH /api/listings/{id}/price`
- `POST /api/listings/{id}/purchase`
- `DELETE /api/listings/{id}` (revoke until purchased)
- `GET /api/summary`

### User Portal (Authenticated users)
- `GET /api/users/me/dashboard`
- `GET /api/users/me/listings`
- `GET /api/users/me/purchases`
- `GET /api/users/me/notifications`
- `PATCH /api/users/me/notifications/{notificationId}/read`

### Admin Portal (Admin only)
- `GET /api/providers`
- `GET /api/notifications`
- `GET /api/audit/logs`
- `GET /api/stream/listings?token=<accessToken>`

## SSE Error Note
The previous `HttpMessageNotWritableException` happened because JSON `ApiError` was being written when response type was `text/event-stream`.
This is handled now by returning empty-body error responses for stream requests and improving async stream error handling.