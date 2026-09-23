# Student Management – React + Node + TypeScript with 2-Level Encryption

Login & Student Registration app with full CRUD where **every student field is encrypted twice** —
once in the browser and once on the server — before it is stored in MongoDB.

---

## Tech Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 18, TypeScript, Vite, Axios, crypto-js |
| Backend   | Node.js, Express 4, TypeScript, Mongoose, Zod (validation), JWT, bcryptjs |
| Database  | MongoDB |
| Crypto    | Layer 1: AES-256-CBC (crypto-js, browser) · Layer 2: AES-256-GCM (Node `crypto`, server) |

---

## Folder Structure

```
task-react-node-typescript/
 ┣ client/                         React frontend
 ┃ ┣ src/
 ┃ ┃ ┣ api/
 ┃ ┃ ┃ ┣ http.ts                   Axios instance, JWT interceptor, error helper
 ┃ ┃ ┃ ┗ studentApi.ts             Encrypt → call API → decrypt
 ┃ ┃ ┣ components/
 ┃ ┃ ┃ ┣ LoginForm.tsx
 ┃ ┃ ┃ ┣ StudentForm.tsx           Create + Edit (reused)
 ┃ ┃ ┃ ┣ StudentList.tsx
 ┃ ┃ ┃ ┗ Dashboard.tsx
 ┃ ┃ ┣ utils/
 ┃ ┃ ┃ ┣ crypto.ts                 Layer-1 (frontend) encryption
 ┃ ┃ ┃ ┗ validation.ts
 ┃ ┃ ┣ types.ts
 ┃ ┃ ┣ App.tsx
 ┃ ┃ ┗ main.tsx
 ┣ server/                         Node + Express backend
 ┃ ┣ src/
 ┃ ┃ ┣ config/        env.ts, db.ts
 ┃ ┃ ┣ controllers/   studentController.ts
 ┃ ┃ ┣ middleware/    auth.ts, validate.ts, error.ts
 ┃ ┃ ┣ models/        Student.ts
 ┃ ┃ ┣ routes/        studentRoutes.ts
 ┃ ┃ ┣ utils/         crypto.ts      Layer-2 (backend) encryption
 ┃ ┃ ┣ validators/    studentValidators.ts
 ┃ ┃ ┣ app.ts
 ┃ ┃ ┗ server.ts
 ┗ README.md
```

---

## Setup Instructions

**Prerequisites:** Node.js 18+ and MongoDB running locally (or a MongoDB Atlas URI).

### 1. Backend

```bash
cd server
cp .env.example .env        # then edit the secrets
npm install
npm run dev                 # http://localhost:5000/api
```

`server/.env`

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_crud
SERVER_ENC_KEY=<long random string>      # Layer-2 key, backend only
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

`client/.env`

```
VITE_API_URL=http://localhost:5000/api
VITE_CLIENT_ENC_KEY=<different random string>   # Layer-1 key
```

> The two keys **must be different**. The server never knows the client key and the client never knows the server key.

### 3. Use it

1. Open http://localhost:5173 → **Register here** → fill the form.
2. Login with that email & password.
3. Dashboard: add, list, search, edit and delete students.
4. Expand **“Show raw API response”** at the bottom to see that the API returns ciphertext.

Production build: `npm run build` in both folders, then `npm start` in `server/`.

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST   | `/api/register`    | – | Create student |
| POST   | `/api/login`       | – | Login, returns JWT |
| GET    | `/api/students`    | JWT | Get all students |
| PUT    | `/api/student/:id` | JWT | Update student (only changed fields) |
| DELETE | `/api/student/:id` | JWT | Delete student |
| GET    | `/api/health`      | – | Health check |

Errors are always JSON: `{ "message": "...", "errors"?: { field: [..] } }` with proper status codes
(400 validation, 401 auth, 404 not found, 409 duplicate email, 500 server).

---

## How Encryption Is Implemented

```
 SAVE (Create / Update)
 ┌──────────── Browser ────────────┐      ┌──────────── Server ────────────┐      ┌── MongoDB ──┐
 │ "Rahul"                         │      │                                │      │             │
 │   └─ AES-256-CBC (client key) ──┼────► │ "iv:cipher1"                   │      │             │
 │        = "iv:cipher1"   Layer 1 │ HTTP │   └─ AES-256-GCM (server key) ─┼────► │ "iv.tag.c2" │
 └─────────────────────────────────┘      │        = "iv.tag.cipher2"  L2  │      │             │
                                          └────────────────────────────────┘      └─────────────┘

 READ (Get students)
 MongoDB "iv.tag.c2" ──► Server removes Layer 2 only ──► API returns "iv:cipher1"
                                                   ──► Browser removes Layer 1 ──► "Rahul"
```

### Layer 1 – Frontend (`client/src/utils/crypto.ts`)
- **AES-256-CBC** using crypto-js, key = SHA-256(`VITE_CLIENT_ENC_KEY`).
- A **random 16-byte IV** per value, so the same input never produces the same ciphertext.
- Format: `base64(iv):base64(ciphertext)`.
- Applied to all 7 profile fields: Full Name, Email, Phone, DOB, Gender, Address, Course.

### Layer 2 – Backend (`server/src/utils/crypto.ts`)
- **AES-256-GCM** using Node’s built-in `crypto`, key derived from `SERVER_ENC_KEY`.
- Random 12-byte IV + **auth tag** → if anyone tampers with the DB value, decryption fails.
- Format: `base64(iv).base64(authTag).base64(ciphertext)`.
- On read the server decrypts **only** this layer and sends Layer-1 ciphertext to the client.

### Email lookup without plain email (blind index)
Encrypted values are random every time, so you can’t query `find({ email })`. Instead:
1. Frontend sends `emailHash = SHA-256(lowercase email)`.
2. Server stores `emailIndex = HMAC-SHA256(serverKey, emailHash)` with a **unique index**.
3. Login and duplicate-email checks use `emailIndex`. The server never sees the email in plain text.

### Password
Passwords are **hashed with bcrypt**, not encrypted — a password should never be decryptable.
It is sent over the request body (use HTTPS in production) only so the server can hash / compare it,
is validated for strength, stored with `select: false`, and never returned by any API.

### What MongoDB actually stores

```json
{
  "_id": "66f1...",
  "fullName": "8SZHp+WNaEbJAqMS.0oV8VkOFsAHRZ3fvhyFqFw==.lecZmG6cnHvVpiIRuVPi...",
  "email": "k2mV...",
  "emailIndex": "3f9c1b...e7",
  "password": "$2a$10$Qm...",
  "createdAt": "...", "updatedAt": "..."
}
```

---

## Validation

- **Frontend:** email format, 10-digit Indian mobile (6-9 start), name letters only, DOB not in future & age ≥ 15,
  address 10–200 chars, gender/course from list, strong password (8+ chars, upper, lower, number, special) + confirm password.
- **Backend (Zod):** every profile field must be valid Layer-1 ciphertext, emailHash must be SHA-256 hex,
  password strength re-checked, `email` + `emailHash` must come together on update, ObjectId check on `:id`.

## Other Highlights

- JWT-protected CRUD routes, auto-logout on 401, token stored in localStorage.
- Same `StudentForm` for create & edit; update sends **only changed fields**.
- Client-side search (possible only because decryption happens on the client).
- Central error handler + `asyncHandler` (no repeated try/catch), duplicate-key (11000) handling,
  same error for wrong email/password (no user enumeration).

## Security Notes / Trade-offs

- `VITE_*` variables are bundled into the frontend JS, so Layer 1 protects data in transit and from the
  backend/DB side, but it is not secret from someone inspecting the browser bundle. In a real product
  the client key would be per-user (e.g. derived from the password) or managed via a KMS.
- Any logged-in student can manage all students (assignment treats the dashboard as an admin view).
  Role-based access (admin / student) would be the next step.



