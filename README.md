# Node.js Express API with JWT Authentication

A scalable, production-ready Node.js Express API with JWT authentication, built with TypeScript and following best practices.

## Features

- 🔐 JWT Authentication (Register, Login)
- 🛡️ Security (Helmet, CORS, bcrypt)
- ✅ Input Validation (Zod)
- 🏗️ Layered Architecture (Controllers → Services → Models)
- 🔥 Hot Reload (nodemon + ts-node)
- 📝 TypeScript Strict Mode

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_super_secret_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Public Routes

- `GET /health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Routes (Requires JWT)

- `GET /api/users/profile` - Get user profile

## Example Usage

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get Profile (with token)

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production build

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod
- **Security**: Helmet, CORS

## Project Structure

```
src/
├── config/         # Environment configuration
├── controllers/    # Request handlers
├── middlewares/    # Express middlewares
├── models/         # Data models
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Helper functions
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## License

ISC
