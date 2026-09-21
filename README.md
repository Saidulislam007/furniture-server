# Furniture Server

Modular TypeScript, Express and MongoDB backend for the Atelier furniture application.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your MongoDB connection string.

3. Start development mode:

   ```bash
   npm run dev
   ```

   The development command uses Node watch mode with `tsx`, which supports the project's
   NodeNext `.js` import paths while executing the TypeScript source files.

4. Verify the production build:

   ```bash
   npm run build
   npm start
   ```

## Source Structure

- `src/config` — environment and MongoDB configuration
- `src/controllers` — request handlers and business logic
- `src/data` — MongoDB collections and shared data types
- `src/routes` — API route definitions
- `src/utils` — reusable helpers
- `src/index.ts` — Express setup and server entrypoint

## API Routes

### Users

- `GET /api/v1/users`
- `PATCH /api/v1/users/:id`

### Furniture

- `POST /api/v1/furniture`
- `GET /api/v1/furniture`
- `GET /api/v1/furniture/:id`
- `PATCH /api/v1/furniture/:id`
- `DELETE /api/v1/furniture/:id`

### Cart

- `POST /api/v1/cart`
- `GET /api/v1/cart/:userId`

### Deliveries

- `POST /api/v1/deliveries`
- `GET /api/v1/deliveries`
- `GET /api/v1/deliveries/:userId`
- `PATCH /api/v1/deliveries/:id`

### Reviews

- `GET /api/v1/reviews`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/:productId`

### Contact

- `POST /api/v1/contact`
- `GET /api/v1/contact`

The database remains `furniture-server`. Existing collection names, request payloads, responses and client API paths are preserved.
