# 🛡️ KIT Guardian — Voice-First AI Campus Assistant
> **Knotopian Institute of Technology (KIT)**  
> *Tagline:* **Your campus. Your voice. Your next move.**

KIT Guardian is a full-stack, voice-first intelligent campus assistant connecting prospective students, enrolled undergraduates, and faculty advisors with real-time college operations through natural spoken and typed dialogue.

---

## 🌟 Key Differentiator — KIT Academic Guardian
### *Know Before You Miss.*
Under Anna University and Knotopian Institute of Technology regulations, students must maintain a **mandatory 75% overall attendance** to appear for End Semester Examinations. Falling into the **65% - 74% condonation zone** requires medical justification and Principal approval; falling **below 65% results in immediate detention**.

The **Academic Guardian** combines:
1. **Live CGPA & Standing Arrears** tracking
2. **Weekly Timetable Mapping** down to individual periods
3. **Examination Calendar Conflict Detection** (Continuous Internal Assessment alerts)
4. **Attendance What-If Simulation Engine**:
   $$\text{Projected Attendance} = \frac{\text{Attended Classes}}{\text{Held Classes} + \text{Additional Missed Classes}} \times 100$$
5. **Recovery Calculator**: Computes the exact number of consecutive classes a student must attend to restore their attendance to 75%.

---

## 🏗️ Technical Architecture

### 1. Frontend (`Frontend/`)
- **Framework:** React 19 + Vite
- **Routing:** React Router DOM (Role-guarded routes for Visitor, Student, and Teacher)
- **Styling & UI:** Custom Theme System with persistent Dark/Light mode toggle (Midnight Navy & Warm Clean Light)
- **Animations:** Framer Motion (Interactive Voice Orb, pulsing ripples, ambient state transitions)
- **Icons:** Lucide React
- **Network:** Axios client configured with HttpOnly session cookies

### 2. Backend (`Backend/`)
- **Runtime:** Node.js (v26 LTS) + Express
- **API Engine:** Direct integration with official Knotopian College API (`https://ht.knowvally.com`)
- **Persistence:** Built-in zero-dependency `node:sqlite` database (`Backend/data/guardian.db`) for conversations, messages, and action logs
- **Session Security:** Backend-managed HttpOnly, Secure, SameSite cookies storing JWT tokens (no sensitive tokens in `localStorage`)
- **Safety & Idempotency:** Role-based authorization middleware, input validation, and unique `Idempotency-Key` headers on consequential actions

### 3. Voice & AI Intelligence
- **AI Core:** Amazon Bedrock Runtime SDK
  - **Reasoning Model:** Amazon Nova Pro (`amazon.nova-pro-v1:0`)
  - **Voice Model:** Amazon Nova 2.5 Sonic (`amazon.nova-sonic-v1:0`)
  - **Speech Synthesis:** Amazon Polly (`Kajal` Neural Voice, Indian English) / Transcribe
  - **Autonomous Engine Fallback:** Built-in multi-turn tool calling engine that executes live college operations even if AWS credentials are not yet supplied or in offline test environments.

---

## 🔑 Test Credentials (Password for all: `Kit@2026`)

| Role | Username | Department | Description |
| :--- | :--- | :--- | :--- |
| **Student** | `arjun` | CSE-2A | 2nd Year, 8.2 CGPA, 0 Arrears, 76% Attendance (Borderline) |
| **Student** | `priya` | CSE-2A | 2nd Year, 9.1 CGPA, 0 Arrears, 92% Attendance (Distinction) |
| **Student** | `kavya` | CSE-2A | 2nd Year, 7.8 CGPA, 1 Arrear, 72% Attendance (Condonation Zone) |
| **Student** | `rahul` | CSE-2A | 2nd Year, 7.1 CGPA, 0 Arrears, 78% Attendance |
| **Teacher** | `lakshmi` | CSE | Class Advisor for CSE-2A (Leave & OD Approvals) |
| **Teacher** | `senthil` | CSE | Faculty for Operating Systems |

---

## 🚀 Quick Start Guide

### 1. Clone & Configure Environment
```bash
# Clone the repository
cd KIT-Voice-Assistant

# Configure Backend environment
cp .env.example Backend/.env
```

### 2. Start the Backend Server
```bash
cd Backend
npm install
npm start
# Server starts on http://localhost:5000
```

### 3. Start the Frontend Application
```bash
cd ../Frontend
npm install
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## ⚙️ Environment Variables (`Backend/.env`)

```env
# College Backend API
COLLEGE_API_BASE_URL=https://ht.knowvally.com
COLLEGE_PARTICIPANT_KEY=your_participant_key_here

# AWS Bedrock & Polly Credentials (Optional - Fallback Engine Active)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
NOVA_REASONING_MODEL_ID=amazon.nova-pro-v1:0
NOVA_VOICE_MODEL_ID=amazon.nova-sonic-v1:0

# Database & Security
DATABASE_URL=./data/guardian.db
JWT_SECRET=kit_guardian_jwt_secret_key_2026_super_secure

# App Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173
```

> **Note on `COLLEGE_PARTICIPANT_KEY`:**  
> When `COLLEGE_PARTICIPANT_KEY` is provided in `Backend/.env`, the backend connects directly to the live `https://ht.knowvally.com` server. When testing without a live participant key, the backend's schema-compliant local engine ensures judges can immediately test all 25+ tools, student logins, What-If simulations, and teacher approvals without failure.

---

## 📋 Implemented Pages & Features

1. **Public Homepage (`/`)**
   - Hero banner: *"Your future starts with a conversation."*
   - Real-time College Info & Today's Academic Date
   - Live Course Catalog with Fees, Seat Matrix & 12th Cutoffs
   - Online Admission Application Modal with validation & Idempotency Key
   - Downloadable Official Documents & Student Handbook

2. **Unified Login (`/login`)**
   - Single sign-in for students and faculty
   - Show/Hide password toggle
   - One-click Test Account quick-fill pills

3. **Student Workspace (`/student`)**
   - Personalized student greeting & academic standing badges
   - Central Voice Assistant Orb with multi-state animations
   - Voice audio playback controls and live transcript view

4. **KIT Academic Guardian (`/student/academic-guardian`)**
   - Real-time CGPA, Standing Arrears, and Placement Eligibility
   - Interactive Attendance What-If Absence Simulator (1, 2, 3, 5 days)
   - Timetable period mapping & Continuous Internal Assessment conflict detection
   - 75% rule evaluation and recovery class calculator
   - Subject-wise attendance sheet with progress indicators

5. **Leave & OD Requests (`/student/requests`)**
   - Pre-validation of absence requests against exam schedules and 75% rules
   - Request history with approval status & advisor comments
   - Cancellation of pending/approved requests before commencement

6. **Placement Drives (`/student/placements`)**
   - Live drive listings (Zoho, ThoughtWorks, Bosch) with CGPA cutoffs
   - Automated eligibility verification against student records
   - 1-click registration with confirmation

7. **Faculty Workspace (`/teacher` & `/teacher/approvals`)**
   - Pending Leave & OD Approval Queue
   - 1-click Approval with optional endorsement comment
   - Rejection modal with mandatory justification
   - Class attendance sheets with risk filters (`/teacher/classes`)

8. **Persistent Conversation History (`/history`)**
   - SQLite backed transcript logs with timestamps
   - Reopen and continue conversations in the assistant

