# College-Connect

A **full-stack** “college portal” for managing student clubs and events, with separate **student** and **admin** workflows. Built on Node.js/Express and MongoDB, and deployed as a serverless app on Vercel.

---

## Table of Contents

1.  [Features](#features)
2.  [Tech Stack](#tech-stack)
3.  [Project Structure](#project-structure)
4.  [Environment Variables](#environment-variables)
5.  [Getting Started](#getting-started)
    -   [Local Development](#local-development)
    -   [Vercel Deployment](#vercel-deployment)
6.  [Usage](#usage)
    -   [Authentication & Roles](#authentication--roles)
    -   [Student Pages](#student-pages)
    -   [Admin Pages](#admin-pages)
7.  [API Endpoints](#api-endpoints)
8.  [Contributing](#contributing)
9.  [License](#license)

---

## Features

-   **JWT-based** sign-in/sign-up with **role** (`student` or `admin`)
-   **Students** can:
    -   View upcoming events
    -   View approved clubs
    -   Create a new club (pending admin approval)
    -   Join approved clubs
-   **Admins** can:
    -   Create new events
    -   Approve or delete pending clubs
    -   View all clubs & events dashboards
-   Static HTML/CSS frontend under `public/`, served by Express
-   MongoDB Atlas as data store
-   Easy deployment via Vercel serverless functions

---

## Tech Stack

-   **Backend**: Node.js, Express, MongoDB (Mongoose)
-   **Auth**: JSON Web Tokens (JWT)
-   **Frontend**: Plain HTML, CSS, JavaScript (static)
-   **Deployment**: Vercel (serverless)
-   **Utilities**: `body-parser`, `cookie-parser`

---

## Project Structure

```
college-connect-main/
├── .gitignore
├── index.js          # Express app (exported for Vercel)
├── package.json
├── package-lock.json
├── vercel.json       # Vercel function config
├── .vscode/          # Editor settings
│   └── settings.json
└── public/
    ├── index.js      # Frontend script
    ├── pages/
    │   ├── home.html
    │   ├── register.html
    │   ├── admin_events.html
    │   ├── admin_clubs.html
    │   ├── students_events.html
    │   ├── students_club.html
    │   ├── signup_success.html
    │   ├── signup_failure.html
    │   ├── signin_success.html
    │   ├── signin_failure.html
    │   └── payment.html
    └── styles/
        └── login.css
```

---

## Environment Variables

Create a `.env` file (or configure in your Vercel dashboard) with:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```
**Note**: In production, never commit credentials—always use environment settings!

---

## Getting Started

### Local Development

1.  **Clone the repo**
    ```bash
    git clone [https://github.com/your-username/college-connect.git](https://github.com/your-username/college-connect.git)
    cd college-connect
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Add your environment variables** (see above).

4.  **(Optional) Modify `index.js` to listen on a port if running locally:**
    ```javascript
    // At bottom of index.js
    if (require.main === module) {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
    ```
5.  **Start the server**
    ```bash
    node index.js
    ```
6.  Open your browser at `http://localhost:3000`

### Vercel Deployment

1.  **Install the Vercel CLI:**
    ```bash
    npm i -g vercel
    ```
2.  **Login & deploy:**
    ```bash
    vercel login
    vercel
    ```
3.  **Configure your Environment Variables in the Vercel dashboard:**
    -   `MONGODB_URI`
    -   `JWT_SECRET`

---

## Usage

### Authentication & Roles

-   **Sign Up (`POST /sign_up`):** `name`, `email`, `phone`, `password`, `role`
-   **Sign In (`POST /sign_in`):** `email`, `password`, `role` → returns JWT
-   All protected routes require an `Authorization: Bearer <token>` header.

### Student Pages

-   **Home**: `/`
-   **Register**: `/register`
-   **View Events**: `/student_events` (loads approved events via `/events` API)
-   **View Clubs**: `/students_club` (loads via `/clubs` API)
-   **Create Club**: form posts to `/create_club`
-   **Join Club**: form posts to `/join_club`

### Admin Pages

-   **Events Dashboard**: `/admin_events`
    -   Create new events → `POST /admin_events`
-   **Clubs Dashboard**: `/admin_clubs`
    -   View pending clubs → `/pending_clubs`
    -   Approve club → `POST /admin/approve_club`
    -   Delete club → `POST /admin/delete_club`

---

## API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/events` | List all events |
| GET | `/clubs` | List approved clubs |
| GET | `/pending_clubs`| List clubs awaiting approval|
| POST | `/sign_up` | Register new user |
| POST | `/sign_in` | Authenticate & receive JWT |
| POST | `/create_club` | Student creates a new club |
| POST | `/join_club` | Student joins an approved club|
| POST | `/admin_events` | Admin creates a new event |
| POST | `/admin/approve_club`| Admin approves a pending club|
| POST | `/admin/delete_club`| Admin deletes a club |

---

## Contributing

1.  Fork the repo
2.  Create a new branch: `git checkout -b feat/YourFeature`
3.  Commit & push: `git push origin feat/YourFeature`
4.  Open a Pull Request – all feedback is welcome!

---

## License

This project is released under the MIT License. See `LICENSE` for details.
