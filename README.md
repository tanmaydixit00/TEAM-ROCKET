# TEAM-ROCKET — MyDrive

A cloud file-storage application with a Node.js + Express + MongoDB backend and a vanilla HTML/CSS/JS frontend.

---

## Project Structure

```
TEAM-ROCKET/
├── backend/                  # Express.js API server
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── controllers/
│   │   └── authController.js # Authentication business logic
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   ├── models/
│   │   └── User.js           # Mongoose User schema
│   ├── routes/
│   │   ├── auth.js           # /api/auth routes
│   │   └── users.js          # /api/users routes
│   ├── server.js             # Express application entry point
│   ├── package.json
│   └── .env.example          # Environment variable template
│
└── frontend/                 # Static HTML/CSS/JS frontend
    ├── css/
    │   └── styles.css
    ├── js/
    │   ├── api.js            # Express API helper functions
    │   ├── auth.js           # Login / register logic (JWT)
    │   ├── main.js           # Dashboard app logic
    │   ├── storage.js        # Supabase file-storage manager
    │   ├── FileManager.js    # Firestore file-metadata manager
    │   └── config.js         # Firebase & Supabase configuration
    ├── index.html            # Dashboard page
    └── login.html            # Login / Sign-up page
```

---

## Backend Setup

### Prerequisites
- Node.js ≥ 16
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (free tier works)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/TEAM-ROCKET
JWT_SECRET=a_long_random_secret_string
JWT_EXPIRE=30d
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 3. Start the server

```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## API Reference

### Authentication

| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | `/api/auth/register`  | Public  | Register a new user      |
| POST   | `/api/auth/login`     | Public  | Login and receive a JWT  |
| POST   | `/api/auth/logout`    | Private | Logout (invalidate client token) |
| GET    | `/api/auth/me`        | Private | Get current user profile |

### Users

| Method | Endpoint         | Access  | Description          |
|--------|------------------|---------|----------------------|
| GET    | `/api/users/:id` | Private | Get user profile     |
| PUT    | `/api/users/:id` | Private | Update user profile  |
| DELETE | `/api/users/:id` | Private | Delete user account  |

### Example Requests

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"password123"}'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}'
```

**Protected route**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## Frontend Setup

The frontend is static HTML — no build step required.

1. Configure `frontend/js/config.js` with your Firebase and Supabase credentials.
2. Serve the `frontend/` directory with any static server:

```bash
npx http-server frontend/
# or open frontend/login.html directly in your browser
```

---

## Security

- Passwords are hashed with **bcryptjs** (salt rounds: 10)
- Authentication uses **JWT** (HS256, configurable expiry)
- CORS is restricted to `FRONTEND_URL`
- Input is validated at the model level (Mongoose validators)
- The `.env` file is excluded from version control via `.gitignore`

---

## License

MIT
