# Labubu Reservation System

A computer lab reservation system for De La Salle University students and technicians. Built with Node.js, Express, MongoDB, and Handlebars.

## 🔗 Live Demo

**[https://ccapdev-s18-s19.onrender.com/](https://ccapdev-s18-s19.onrender.com/)**

## Prerequisites

- **Node.js** (v18 or later) — [https://nodejs.org](https://nodejs.org)
- **MongoDB Community Edition** — installed and running locally on the default port `27017`. [Download here](https://www.mongodb.com/try/download/community)

## Setup and Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/keifersy/CCAPDEV-S18-S19.git
   cd CCAPDEV-S18-S19
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Seed the database:**
   Populate MongoDB with initial sample data (5 users, 5 labs, and sample reservations):
   ```bash
   node seed.js
   ```
   You should see a success message confirming the records were created.

4. **Start the server:**
   ```bash
   npm start
   ```
   The console will display:
   ```
   Connected to MongoDB: labubu database
   Server is running on http://localhost:3000
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

## Test Accounts

After seeding, you can log in with these accounts:

| Email                                  | Password      | Role       |
|----------------------------------------|---------------|------------|
| `student@dlsu.edu.ph`                  | `password123` | Student    |
| `keifer_sy@dlsu.edu.ph`               | `keifer`      | Technician |
| `ralph_andrei_delrosario@dlsu.edu.ph`  | `ralph`       | Student    |
| `farrell_tadina@dlsu.edu.ph`          | `farrell`     | Student    |
| `zach_benedict_hallare@dlsu.edu.ph`   | `zach`        | Technician |

## Project Structure

```
CCAPDEV-S18-S19/
├── src/
│   ├── models/          # Mongoose schemas (User, Lab, Reservation)
│   ├── routes/          # Express route handlers
│   ├── views/           # Handlebars templates (.hbs)
│   │   └── layouts/     # Main layout template
│   └── public/          # Static assets (CSS, JS, images)
├── server.js            # Express server entry point
├── seed.js              # Database seeding script
└── package.json
```

## API Endpoints

REST API endpoints for data access:
- `GET /api/users` — Lists all users
- `GET /api/labs` — Lists all labs
- `GET /api/reservations` — Lists all reservations
- `POST /api/login` — Authenticate a user
- `POST /api/register` — Create a new account
- `POST /api/logout` — End the current session
