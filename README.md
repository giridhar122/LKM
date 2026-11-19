# LKM SmartDesk — Industrial AI Ticket Management Platform

**Organization:** LKM (in collaboration with Auralytic Technologies Pvt Ltd)  
**System:** AI-Powered Messaging-Based Issue Reporting and Ticket Management Platform  
**Target Environment:** Shop Floor Machinery, Manufacturing Lines, and Industrial Offices

---

## 1. Executive Summary

**LKM SmartDesk** is a modern, enterprise-grade industrial issue reporting and ticket management system. It bridges factory shop-floor operators and plant maintenance supervisors by allowing operational issues to be reported via **ordinary conversational WhatsApp or Telegram messages**.

An AI Operations Engine (powered by **Google Gemini**) extracts structured ticket data from natural-language messages in real-time, automatically detects the responsible department and priority, generates a sequential ticket ID (`LKM-YYYY-00001`), alerts the reporting employee via instant confirmation, and provides plant supervisors with a comprehensive role-based web dashboard.

---

## 2. Confirmed Technology Stack

| Tier | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Angular 18+** with TypeScript | Robust Single Page Application (SPA) architecture |
| **UI Framework** | **Bootstrap 5.3** + Bootstrap Icons | Clean industrial SaaS theme, responsive layouts, data tables |
| **Analytics & Charts** | **Chart.js** | Department loads, 7-day influx trends, priority distribution |
| **Backend API** | **Python 3.11** + **FastAPI** | High-performance asynchronous REST API framework |
| **Database** | **MySQL 8.0** | Relational database with foreign keys, indexes, and sequences |
| **ORM & Migrations**| **SQLAlchemy 2.0** + **PyMySQL** + **Alembic** | Connection pooling and versioned schema migrations |
| **AI Intelligence** | **Google Gemini API** (`gemini-2.5-flash`) | Structured JSON extraction, confidence scoring, supervisor review flag |
| **Messaging** | **Telegram Bot API** & **WhatsApp Cloud API** | Real Telegram Bot (long-polling / webhook) & Meta WhatsApp Cloud API |
| **Security & RBAC** | **JWT (Bearer)** + **Bcrypt** | Role-based authorization (`ADMIN`, `SUPERVISOR`, `DEPARTMENT_OWNER`) |

---

## 3. System Workflow Architecture

```
Employee WhatsApp Message ("Machine 04 stopped working on production floor")
                    │
                    ▼
          WhatsApp Cloud API (Meta)
                    │
                    ▼
          FastAPI Webhook: /api/v1/whatsapp/webhook
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
HMAC Signature Verification    Message Deduplication Check (provider_message_id)
                                 │
                                 ▼
                     Employee Identification (Phone Lookup)
                                 │
                                 ▼
                   Gemini AI Issue Intelligence
                   - Department: Maintenance
                   - Priority: Critical
                   - Asset: Machine 04
                   - Location: Production Floor
                   - Confidence Score: 0.96
                                 │
                                 ▼
                  Ticket Generation Engine (LKM-2026-00001)
                                 │
                                 ▼
                     MySQL 8.0 Persistent Storage
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                                                   ▼
WhatsApp Confirmation Alert                      Angular Supervisor Portal
("Hello! Your issue LKM-2026-00001...")          - Executive KPI Dashboard
                                                 - Ticket Triage & Resolution
                                                 - Department Rules & Employee Directory
                                                 - MIS Reports & CSV/Excel Export
```

---

## 4. Database Schema (MySQL 8.0)

The normalized database schema consists of 9 tables:

1. **`departments`**: Code (`PROD`, `MAINT`, `QUAL`, `PURCH`, `STORES`, `HR`, `ACCT`, `IT`), name, description, owner, JSON classification keywords.
2. **`users`**: System users with role-based access (`ADMIN`, `SUPERVISOR`, `DEPARTMENT_OWNER`), bcrypt password hashes.
3. **`employees`**: Shop floor and office workforce with registered WhatsApp phone numbers (E.164).
4. **`tickets`**: Master ticket records with sequential numbers (`LKM-2026-XXXXX`), issue description, category, priority, asset, location, status, and AI confidence metadata.
5. **`messages`**: Inbound/outbound message audit log with unique index on `provider_message_id` for deduplication.
6. **`ticket_history`**: Audit trail logging every status progression, priority change, and supervisor comment.
7. **`attachments`**: Media images and files attached to tickets.
8. **`notifications`**: WhatsApp dispatch log tracking delivery status (`SENT`, `SIMULATED`, `FAILED`).
9. **`ai_classifications`**: Audit trail of every Gemini AI prompt, response, confidence score, and extracted JSON payload.

---

## 5. Local Setup & Running Guide

### Prerequisites
- Python 3.11+
- Node.js v20+ & npm
- MySQL Server 8.0 (Service running on port 3306)

---

### Step A: Backend Setup

1. **Navigate to the backend directory:**
   ```powershell
   cd d:\LKM\backend
   ```

2. **Activate the Python virtual environment:**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

3. **Install dependencies (already installed during scaffolding):**
   ```powershell
   pip install -r requirements.txt email-validator
   ```

4. **Configure `.env` file:**
   Open `backend/.env` and update your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lkm_smartdesk

   # Set to True for offline testing without MySQL:
   USE_SQLITE_FALLBACK=False

   # Optional Google Gemini API key:
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Initialize Database & Seed Default Records:**
   ```powershell
   python -m app.database.init_db
   ```

6. **Start the FastAPI Backend Server:**
   ```powershell
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * Swagger Interactive API Documentation: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

---

### Step B: Frontend Setup

1. **Navigate to the frontend directory:**
   ```powershell
   cd d:\LKM\frontend
   ```

2. **Start the Angular Development Server:**
   ```powershell
   npm start
   ```
   * Web Portal URL: [http://localhost:4200](http://localhost:4200)

---

### Step C: Running with Docker Compose (Optional)

To spin up MySQL 8.0, the FastAPI backend, and the Angular frontend in containers:
```powershell
cd d:\LKM
docker-compose up --build
```

---

## 6. Default Demo Credentials

The database comes pre-seeded with 4 test accounts for local verification:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@lkm.com` | `AdminPassword123!` | Full system access, Department config, Reports |
| **Plant Supervisor**| `supervisor@lkm.com` | `Supervisor123!` | All tickets, Triage, Status updates, Reports |
| **Maintenance Lead**| `maint.lead@lkm.com` | `MaintLead123!` | Maintenance department tickets only |
| **Quality Lead** | `quality.lead@lkm.com` | `QualityLead123!` | Quality department tickets only |

---

## 7. WhatsApp Integration: Live API vs. Simulation Mode

### WhatsApp Simulation Sandbox (Zero-Cost Local Testing)
An interactive simulation sandbox is built directly into the Angular dashboard under **WhatsApp Sandbox** (`/simulator`):
1. Navigate to `/simulator` in the portal.
2. Click any of the quick industrial test prompts (e.g. *"Machine 04 stopped working on the production floor"*).
3. Click **Send Simulated WhatsApp Message**.
4. The live phone mockup shows the instantaneous AI extraction, the assigned department and priority, and the exact WhatsApp confirmation message returned to the employee.
5. All simulated deliveries are audited in the database with status `SIMULATED`.

### Connecting Meta WhatsApp Cloud API in Production
1. In [Meta Developer Portal](https://developers.facebook.com/), create a Business App and select **WhatsApp**.
2. Under **WhatsApp > Configuration**, set the Webhook URL:
   - Webhook URL: `https://your-domain.com/api/v1/whatsapp/webhook`
   - Verify Token: `lkm_smartdesk_webhook_verify_token_2026` (configurable in `.env`)
3. Subscribe to the `messages` webhook field.
4. Add your Meta credentials in `backend/.env`:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_APP_SECRET=abcdef...
   WHATSAPP_SIMULATION_MODE=False
   ```

---

## 8. Automated Testing Suite

The project includes an end-to-end Pytest suite verifying all 6 required industrial operational scenarios:

```powershell
cd d:\LKM\backend
.\.venv\Scripts\pytest.exe -v tests/test_e2e_scenarios.py
```

### Verified Scenarios:
- **Scenario 1:** Machine breakdown message $\to$ AI classifies as `Maintenance` / `Critical`, stores ticket in DB, dispatches confirmation.
- **Scenario 2:** Raw material shortage $\to$ Classified as `Purchase` / `High`, ticket generated.
- **Scenario 3:** Vague/unclear message (*"Something seems odd"*) $\to$ Confidence score drops, ticket flagged for supervisor review (`needs_review=True`).
- **Scenario 4:** Duplicate webhook event delivered twice with same `provider_message_id` $\to$ Deduplicated, second call returns `is_duplicate=True` without creating duplicate ticket.
- **Scenario 5:** Department owner updates ticket $\to$ Status updated to `In Progress`, audit history recorded, employee notification dispatched.
- **Scenario 6:** Unauthorized user attempts to access another department's tickets $\to$ Backend blocks access with `HTTP 403 Forbidden`.
