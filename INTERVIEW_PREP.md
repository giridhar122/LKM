# LKM SmartDesk — Technical Interview Preparation Guide & Cheat Sheet

This guide provides technical explanations, architecture talking points, and answers to the top 10 questions your interviewer will ask.

---

## 1. The 30-Second Elevator Pitch (Start with this)

> *"LKM SmartDesk is an industrial AI-powered incident management platform built for manufacturing plants. It allows shop-floor operators to report machinery breakdowns, material shortages, and safety issues directly through ordinary conversational WhatsApp messages.*
>
> *Our backend—built with **FastAPI** and **SQLAlchemy**—receives the webhook, runs **Google Gemini AI** to extract the issue category, asset, location, and department, generates a concurrency-safe sequential ticket (`LKM-2026-00001`), and sends an automated WhatsApp confirmation back to the worker.*
>
> *Plant supervisors use an **Angular 18 & Bootstrap 5** dashboard to triage tickets, track SLA compliance, analyze downtime trends via **Chart.js**, and export MIS reports to Excel."*

---

## 2. System Architecture Summary

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Angular 18 (Standalone Components) | Reactive UI, Chart.js analytics, triage drawer, client-side offline store |
| **Backend** | Python 3.11 + FastAPI | Asynchronous REST APIs, HMAC webhook validation, background notifications |
| **Database** | MySQL 8.0 + SQLite Auto-Fallback | Normalized 9-table relational schema with ACID compliance and indexes |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`) | Structured JSON extraction, keyword fallback weighting, confidence scoring |
| **Messaging** | Meta Cloud API + Adapter Sandbox | Decoupled messaging provider abstraction (`BaseMessagingProvider`) |
| **Security** | JWT (Bearer Tokens) + Direct Bcrypt | Role-Based Access Control (`ADMIN`, `SUPERVISOR`, `DEPARTMENT_OWNER`) |

---

## 3. Top 10 Technical Interview Questions & Model Answers

### Q1: Why did you choose FastAPI over Flask or Django?
**Answer:**
> *"FastAPI is built on **Starlette** and **Pydantic**, providing native asynchronous (`async`/`await`) I/O. In an industrial plant where multiple webhooks and sensor alerts hit the server concurrently, FastAPI handles high-throughput I/O without blocking threads.*
> 
> *Additionally, Pydantic v2 automatically validates incoming request payloads and generates OpenAPI / Swagger documentation (`/docs`) out of the box."*

---

### Q2: How does the AI classification work, and what if the worker types something vague?
**Answer:**
> *"We use **Google Gemini API** (`gemini-2.5-flash`) with structured schema prompting. It returns a strict JSON object containing: `department`, `category`, `priority`, `asset`, `location`, and a `confidence_score` (between 0.0 and 1.0).*
>
> *If Gemini returns a confidence score below **0.75** (for example, if a worker texts 'Something seems odd on line 2'), the system automatically sets the `needs_review` flag to **True** and assigns it to the general Production queue with an **AI Review Badge**.*
>
> *If the external AI API is unreachable or rate-limited, our system gracefully falls back to a **Deterministic Keyword Engine** configured per department, ensuring zero downtime."*

---

### Q3: How do you prevent duplicate tickets if WhatsApp retries a webhook?
**Answer:**
> *"Meta's WhatsApp Cloud API uses an 'at-least-once' delivery guarantee, meaning network glitches can cause duplicate webhooks.*
> 
> *We enforce **Idempotency** at the database level: the `messages` table has a **unique database index** on `provider_message_id`. When a webhook arrives, we query for an existing message ID before creating a ticket. If it exists, the backend returns an immediate `200 OK` acknowledgment and skips ticket generation."*

---

### Q4: How is the ticket numbering sequence (`LKM-YYYY-00001`) generated safely without race conditions?
**Answer:**
> *"Ticket numbers follow the standard enterprise format: `LKM-{YEAR}-{5-digit-sequence}` (e.g., `LKM-2026-00001`).*
> 
> *To prevent race conditions when two operators text at the exact same millisecond, we use database-level transactional locks (`SELECT ... FOR UPDATE` in MySQL / atomic transaction in SQLite). We query the maximum sequence for the current year, increment it atomically within the database transaction, and commit."*

---

### Q5: What is your database architecture?
**Answer:**
> *"We designed a 3rd Normal Form (3NF) relational schema with 9 tables in SQLAlchemy 2.0:*
> 1. `departments` — 8 plant departments with JSON classification rules
> 2. `users` — Enterprise users with role-based access
> 3. `employees` — Shop floor workers mapped to verified WhatsApp phone numbers
> 4. `tickets` — Master incident entity with status, priority, and AI confidence
> 5. `messages` — Webhook audit logs with deduplication keys
> 6. `ticket_history` — Audit trail tracking all status transitions and supervisor notes
> 7. `attachments` — Incident photos and diagnostic files
> 8. `notifications` — WhatsApp message dispatch history
> 9. `ai_classifications` — Audit logs of prompts, responses, and token usage
>
> *Our database session manager has **automatic SQLite fallback**: if MySQL is unavailable, it automatically initializes a local SQLite database (`lkm_smartdesk.db`) without crashing."*

---

### Q6: How does authentication and Role-Based Access Control (RBAC) work?
**Answer:**
> *"Authentication uses **OAuth2 Password Bearer flow** with **JWT (JSON Web Tokens)** signed with HMAC-SHA256 and a 24-hour expiration.*
> 
> *Passwords are hashed using direct **Bcrypt** with salt. We define three strict roles:*
> * `ADMIN`: Full system configuration, department management, employee directory.
> * `SUPERVISOR`: Cross-department incident triage, priority overrides, and MIS reports.
> * `DEPARTMENT_OWNER`: Department-specific queue access (e.g., Maintenance Lead only manages machine repairs).
> 
> *In the Angular frontend, an **AuthGuard** and **JWT HTTP Interceptor** protect all routes and automatically attach the `Authorization: Bearer <token>` header to all API requests."*

---

### Q7: How does your WhatsApp Integration work in production vs development?
**Answer:**
> *"We implemented the **Adapter Pattern** via `BaseMessagingProvider`.*
> 
> *In production, it connects to **Meta WhatsApp Business Cloud API** (Graph API v20.0). When Meta delivers a webhook, our backend validates the `X-Hub-Signature-256` HMAC-SHA256 header using our app secret before processing.*
> 
> *For development and testing, we built an interactive **Simulation Sandbox**. It mimics the exact Meta webhook payload format, displays an interactive phone screen preview, and logs outgoing notifications in an audit log without incurring messaging costs."*

---

### Q8: Why did you use Angular 18 for the frontend?
**Answer:**
> *"Angular 18 provides an enterprise-grade framework with TypeScript, strict type safety, and **Standalone Components** (no messy NgModules).*
> 
> *We used Angular **Signals** (`computed` and `signal`) for reactive user state management, **Chart.js** for animated KPI visualizations, and implemented custom modal drawers for inspection and triage."*

---

### Q9: How does the live demo on GitHub Pages work without running localhost?
**Answer:**
> *"GitHub Pages is a static hosting platform. To allow an interviewer to test the full system independently on any device, we implemented a **Client-Side State Engine** in `api.service.ts`.*
> 
> *When hosted on GitHub Pages, the application runs our deterministic AI classification engine locally and persists tickets, status changes, and notification logs inside browser `localStorage`. You can simulate tickets, triage them, and export reports in real-time without needing a backend server running."*

---

### Q10: How does MIS reporting and data export work?
**Answer:**
> *"Our MIS module aggregates incident metrics:*
> * First-Response & Resolution SLAs
> * Department-wise ticket loads
> * Shift breakdown trends
> 
> *For CSV and Excel exports, our backend uses Python `openpyxl` / streaming CSV responses, while the Angular frontend uses authenticated Blob streams (`responseType: 'blob'`) to download formatted spreadsheets directly to the supervisor's computer."*

---

## 4. 3-Minute Live Interview Demonstration Script

Follow these 5 steps when screen sharing or showing the live link:

1. **Sign In (`/login`):**
   * Go to `https://giridhar122.github.io/LKM/`
   * Click the quick-fill button **Plant Supervisor** (`supervisor@lkm.com`) $\rightarrow$ Click **Sign In**.

2. **Demonstrate WhatsApp AI Simulation (`/simulator`):**
   * Click **WhatsApp Simulator** on the sidebar.
   * Click **Machine 04 Breakdown (Maintenance)** preset.
   * Click **Send Simulated WhatsApp Message**.
   * *Highlight to interviewer:* "Notice how Gemini AI identified this as an Equipment Failure, assigned Critical priority to Maintenance, generated sequential ticket `LKM-2026-00005`, and prepared the WhatsApp bot reply."

3. **Demonstrate Ticket Triage (`/tickets`):**
   * Click **Open in Tickets →**.
   * Show that the new ticket is immediately at the top of the table.
   * Click **Inspect** to open the side drawer.
   * Change status to **In Progress** and then **Resolved**, add a repair note (*"Replaced hydraulic seal"*), and save.
   * Show the **Audit History Timeline** tracking the supervisor's actions.

4. **Demonstrate Analytics Dashboard (`/dashboard`):**
   * Show the KPI counters and Chart.js graphs reflecting the newly resolved ticket.
   * Filter by **Maintenance** to demonstrate department isolation.

5. **Demonstrate MIS Report Export (`/reports`):**
   * Click **Export to Excel** to trigger the instant spreadsheet download.
