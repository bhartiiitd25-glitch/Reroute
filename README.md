# PathShare MVP

A lean web application that lets users drop a destination pin, draw a preferred route on Google Maps (snapped to roads), and generate a shareable short link.

## Features

- 📍 **Drop Destination**: Click on the map to set your destination
- 🖊️ **Draw Route**: Draw custom routes that snap to roads using Google Roads API
- 🔗 **Share Links**: Generate short, shareable links with 24-hour expiration
- 📱 **Open in Google Maps**: Recipients can open the route directly in Google Maps
- 🔒 **Privacy-First**: Coordinates clamped to 6 decimals, no PII stored

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Google Maps JavaScript SDK + Roads API
- **Database**: Prisma with SQLite (easily switchable to PostgreSQL)
- **Testing**: Vitest with React Testing Library
- **Code Quality**: ESLint, Prettier

## Prerequisites

- Node.js 18+ and npm
- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Roads API

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Roads API
4. Create an API key under "Credentials"
5. (Recommended) Restrict the key:
   - For `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Restrict to your domain
   - For `GOOGLE_MAPS_API_KEY`: Restrict to IP addresses (your server)

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Google Maps API keys:

```env
# Database (no changes needed for local development)
DATABASE_URL="file:./dev.db"

# Google Maps API Key for client-side (Maps JavaScript API)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_api_key_here"

# Google Maps API Key for server-side (Roads API)
GOOGLE_MAPS_API_KEY="your_api_key_here"
```

**Note**: You can use the same API key for both if you haven't set up separate restrictions.

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Type check TypeScript

## Project Structure

```
bharti/
├── app/
│   ├── api/              # API routes
│   │   ├── share/        # Share creation and retrieval
│   │   └── snap-to-roads/# Roads API integration
│   ├── r/[id]/           # Share view page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── GoogleMapsLoader.tsx
│   └── MapComponent.tsx
├── lib/                  # Utilities
│   ├── polyline.ts       # Polyline encoding/decoding
│   ├── validation.ts     # Input validation
│   └── prisma.ts         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
└── __tests__/            # Test files
```

## Database Schema

```prisma
model Share {
  id              String   @id @default(cuid())
  destLat         Float
  destLng         Float
  encodedPolyline String
  note            String?
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([expiresAt])
}
```

## API Routes

### POST /api/share

Create a new share.

**Request Body**:
```json
{
  "destLat": 37.7749,
  "destLng": -122.4194,
  "encodedPolyline": "encoded_polyline_string",
  "note": "Optional note"
}
```

**Response**:
```json
{
  "id": "share_id",
  "url": "/r/share_id",
  "expiresAt": "2025-10-13T12:00:00Z"
}
```

### GET /api/share/[id]

Retrieve a share by ID.

**Response**:
```json
{
  "id": "share_id",
  "destLat": 37.7749,
  "destLng": -122.4194,
  "encodedPolyline": "encoded_polyline_string",
  "note": "Optional note",
  "expiresAt": "2025-10-13T12:00:00Z",
  "createdAt": "2025-10-12T12:00:00Z"
}
```

Returns `410 Gone` if expired, `404 Not Found` if doesn't exist.

### DELETE /api/share/expired

Hard delete expired shares (for cron jobs).

**Response**:
```json
{
  "deleted": 5,
  "message": "Deleted 5 expired share(s)"
}
```

### POST /api/snap-to-roads

Snap a path to roads using Google Roads API.

**Request Body**:
```json
{
  "path": [
    { "lat": 37.7749, "lng": -122.4194 },
    { "lat": 37.7849, "lng": -122.4294 }
  ]
}
```

**Response**:
```json
{
  "path": [
    { "lat": 37.7749, "lng": -122.4194 },
    { "lat": 37.7849, "lng": -122.4294 }
  ]
}
```

## Switching to PostgreSQL

To switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `DATABASE_URL` in `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pathshare"
```

3. Run migrations:

```bash
npx prisma generate
npx prisma db push
```

## Production Considerations

1. **Expired Share Cleanup**: Set up a cron job to call `DELETE /api/share/expired` daily
2. **Rate Limiting**: Add rate limiting to API routes to prevent abuse
3. **API Key Security**: Use separate restricted API keys for production
4. **Database**: Switch to PostgreSQL or another production-ready database
5. **Monitoring**: Add error tracking (e.g., Sentry) and analytics
6. **CDN**: Serve static assets through a CDN

## Security Features

- Coordinates clamped to 6 decimal places (~11cm precision)
- No PII stored
- 24-hour TTL on shares (default)
- Input validation on all API routes
- Server-side API key protection

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
