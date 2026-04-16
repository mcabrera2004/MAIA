# Frontend Integration Guide — Asistente Educativo IA

Context for the frontend agent building the UI for this educational RAG chatbot.
The backend is a FastAPI + LangGraph app where **professors** upload course material and
**students** chat with an AI that automatically retrieves relevant documents per subject.

---

## Project Overview

This is a demo for two subjects: **Historia** and **Derecho Informático**.

- A **profesor** logs in → uploads documents for their subject → the AI uses them in student chats
- An **alumno** logs in → sees both subject chats → asks questions → AI retrieves docs from that subject only
- RAG is **automatic**: the AI decides when to call the knowledge retriever internally. No frontend action needed.

---

## Infrastructure & Ports

| Service | Port | Relevant to Frontend? |
|---|---|---|
| **FastAPI App** | `8000` | ✅ YES — all API calls go here |
| **PostgreSQL + pgvector** | `5432` | ❌ No — internal only |
| **Prometheus** | `9090` | ❌ No — metrics only |
| **Grafana** | `3000` | ❌ No — dashboards only |

> The frontend communicates **exclusively** with port `8000`.

```
Base URL:    http://localhost:8000/api/v1
Swagger UI:  http://localhost:8000/docs        ← great for manual testing
ReDoc:       http://localhost:8000/redoc
```

---

## User Roles

There are two roles in the system:

| Role | What they can do |
|---|---|
| `alumno` | Register, login, create sessions, chat |
| `profesor` | Everything above + upload/delete documents |

The role is set at **registration** and returned on **login**. The frontend must use it to decide which UI to show.

---

## Authentication

The API uses **JWT Bearer tokens**. There are **two distinct token types** — do not mix them:

| Token Type | Obtained from | Used for |
|---|---|---|
| **User Token** | `/auth/login` or `/auth/register` | Managing sessions, uploading documents |
| **Session Token** | `/auth/session` | Chatting (all `/chatbot/*` endpoints) |

All protected endpoints require:
```
Authorization: Bearer <TOKEN>
```

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "role": "alumno"
}
```

`role` must be `"alumno"` or `"profesor"`. Defaults to `"alumno"` if omitted.

Password requirements: min 8 chars, uppercase, lowercase, number, special character.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "alumno",
  "token": {
    "access_token": "<USER_TOKEN>",
    "token_type": "bearer",
    "expires_at": "2026-05-14T20:00:00Z"
  }
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass1!&grant_type=password
```

**Response:**
```json
{
  "access_token": "<USER_TOKEN>",
  "token_type": "bearer",
  "expires_at": "2026-05-14T20:00:00Z",
  "role": "alumno"
}
```

> ⚠️ The login response includes `role`. Store it — the frontend uses it to decide which screen to show (professor dashboard vs student chat list).

---

## Available Subjects

### List Subjects (public — no auth required)

```http
GET /api/v1/knowledge/subjects
```

**Response:**
```json
[
  { "name": "historia" },
  { "name": "derecho informatico" }
]
```

This is the **source of truth** for subjects. Use this endpoint to populate subject selectors in the UI. Do not hardcode the list.

> Currently configured subjects for this demo: **historia** and **derecho informatico**.
> Sessions can only be created with these exact values.

---

## Sessions

A **session** = a chat room for a specific subject. The `subject` field is the RAG filter.
Sessions persist conversation history via LangGraph checkpointing (the backend remembers past messages).

### Create Session

```http
POST /api/v1/auth/session
Authorization: Bearer <USER_TOKEN>
Content-Type: application/x-www-form-urlencoded

subject=historia
```

`subject` must match one of the values from `GET /knowledge/subjects` (lowercase). Returns 400 if invalid.

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "",
  "subject": "historia",
  "token": {
    "access_token": "<SESSION_TOKEN>",
    "token_type": "bearer",
    "expires_at": "2026-05-14T20:00:00Z"
  }
}
```

> ⚠️ Store `session_id` and `token.access_token` separately. The session token is what gets passed to all `/chatbot/*` calls.

### List All Sessions (for a user)

```http
GET /api/v1/auth/sessions
Authorization: Bearer <USER_TOKEN>
```

**Response:** Array of session objects, each with `session_id`, `name`, `subject`, `token`.

### Rename a Session

```http
PATCH /api/v1/auth/session/{session_id}/name
Authorization: Bearer <SESSION_TOKEN>
Content-Type: application/x-www-form-urlencoded

name=Mi clase de Historia
```

### Delete a Session

```http
DELETE /api/v1/auth/session/{session_id}
Authorization: Bearer <SESSION_TOKEN>
```

---

## Chat

All chat endpoints use the **SESSION TOKEN** (not the user token).

### Standard Chat (request/response)

```http
POST /api/v1/chatbot/chat
Authorization: Bearer <SESSION_TOKEN>
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "¿Cuáles fueron las causas de la Revolución Francesa?" }
  ]
}
```

> Only include the **latest user message**. The backend stores the full history via the
> session checkpointer — never re-send previous messages.

**Response:**
```json
{
  "messages": [
    { "role": "user", "content": "¿Cuáles fueron las causas de la Revolución Francesa?" },
    { "role": "assistant", "content": "Las principales causas fueron... [Fragmento 1 - La Revolución Francesa]" }
  ]
}
```

The assistant response may cite document fragments like `[Fragmento 1 - Título]` — this is the RAG working.

### Streaming Chat (SSE — recommended for UX)

```http
POST /api/v1/chatbot/chat/stream
Authorization: Bearer <SESSION_TOKEN>
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Explícame la Revolución Francesa" }
  ]
}
```

**Response:** `text/event-stream` — each event is a JSON chunk:
```
data: {"content": "Las princip", "done": false}
data: {"content": "ales causas...", "done": false}
data: {"content": "", "done": true}
```

Use `fetch` with `ReadableStream`. Stop consuming when `done: true`.

**Example (fetch + ReadableStream):**
```javascript
const response = await fetch('/api/v1/chatbot/chat/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  const lines = text.split('\n').filter(l => l.startsWith('data:'));
  for (const line of lines) {
    const chunk = JSON.parse(line.slice(5));
    if (chunk.done) break;
    appendToChat(chunk.content); // render incrementally
  }
}
```

### Get Chat History

```http
GET /api/v1/chatbot/messages
Authorization: Bearer <SESSION_TOKEN>
```

### Clear Chat History

```http
DELETE /api/v1/chatbot/messages
Authorization: Bearer <SESSION_TOKEN>
```

---

## Knowledge Base (Document Ingestion) — Professor Only

> ⚠️ These endpoints are **restricted to `profesor` role**. Alumnos receive `403 Forbidden`.

Use the **USER TOKEN** (not session token).

### Upload Text Content

```http
POST /api/v1/knowledge/ingest/text
Authorization: Bearer <USER_TOKEN>   ← must be a profesor's token
Content-Type: application/json

{
  "content": "La Revolución Francesa comenzó en 1789...",
  "subject": "historia",
  "title": "Unidad 3 — Revolución Francesa",
  "source": "apuntes_clase_1"
}
```

`subject` must be one of the available subjects (validated server-side).

**Response:**
```json
{
  "message": "Document ingested successfully",
  "subject": "historia",
  "title": "Unidad 3 — Revolución Francesa",
  "chunks_created": 3
}
```

### Upload a File

```http
POST /api/v1/knowledge/ingest/file
Authorization: Bearer <USER_TOKEN>
Content-Type: multipart/form-data

file=<binary>
subject=historia
title=Apuntes Unidad 3
```

Allowed file types: `.txt`, `.md`, `.pdf`.

**Response:** Same format as text ingestion.

### Delete All Documents for a Subject

```http
DELETE /api/v1/knowledge/documents/{subject}
Authorization: Bearer <USER_TOKEN>
```

**Response:**
```json
{ "message": "All documents for subject 'historia' have been deleted" }
```

---

## Authorization Matrix

| Action | Alumno | Profesor |
|---|---|---|
| Register / Login | ✅ | ✅ |
| GET /knowledge/subjects | ✅ (public) | ✅ (public) |
| Create / list sessions | ✅ | ✅ |
| Chat (RAG) | ✅ | ✅ |
| Upload documents | ❌ 403 | ✅ |
| Delete documents | ❌ 403 | ✅ |

---

## Utility Endpoints

```http
GET /               → API info + links to docs
GET /health         → Health check with DB status: {"status":"healthy","components":{...}}
GET /api/v1/health  → Same from versioned router
```

---

## Complete Flow for the Demo

### Profesor flow

```
1. Open app → click "Ingresar como profesor"
2. Login / Register with role="profesor" → store USER_TOKEN + role
3. See subject dashboard: Historia | Derecho Informático
4. Upload documents for each subject
   POST /knowledge/ingest/file  subject=historia  (or /ingest/text)
5. Done — AI will use those docs when students chat
```

### Alumno flow

```
1. Open app → click "Ingresar como alumno"
2. Login / Register with role="alumno" → store USER_TOKEN + role
3. See two chat buttons: "Historia" and "Derecho Informático"
4. Click a subject → create a session
   POST /auth/session  subject=historia  → store SESSION_TOKEN
5. Chat in that session
   POST /chatbot/chat  (with SESSION_TOKEN)
   → AI uses RAG internally — retrieves only Historia docs
6. Click the other subject → create another session
   POST /auth/session  subject=derecho informatico  → new SESSION_TOKEN
   → completely isolated: different RAG scope, different history
```

---

## Token Storage Strategy

```javascript
// After login:
localStorage.setItem('userToken', data.access_token);
localStorage.setItem('userRole', data.role);  // "alumno" or "profesor"

// After creating a session:
localStorage.setItem(`session_${subject}`, JSON.stringify({
  sessionId: data.session_id,
  sessionToken: data.token.access_token,
  subject: data.subject,
}));
```

Suggested: keep one session per subject per user — create it lazily (first time they open that subject's chat), then reuse it on subsequent visits.

---

## Constraints & Limits

| Constraint | Value |
|---|---|
| Max message length | 3,000 characters |
| Rate limit — chat | 100 req/min (dev) |
| Rate limit — stream | 100 req/min (dev) |
| Rate limit — ingest text | 20 req/min |
| Rate limit — ingest file | 10 req/min |
| Rate limit — login | 100 req/min (dev) |
| Token expiry | 30 days |
| Supported file types | `.txt`, `.md`, `.pdf` |
| Valid subjects | `historia`, `derecho informatico` |

---

## CORS

In development, all origins are allowed (`*`). No proxy configuration needed for local dev.

---

## Verified Working (tested end-to-end)

The following flow was tested and confirmed working:

1. ✅ Profesor registers with `role: "profesor"`
2. ✅ Profesor ingests a text document for `subject: "historia"`
3. ✅ Alumno registers with `role: "alumno"`
4. ✅ Alumno creates session with `subject: "historia"`
5. ✅ Alumno chats — AI retrieves the ingested fragment and cites it in the response
6. ✅ RAG isolation confirmed — filtering by subject works correctly
