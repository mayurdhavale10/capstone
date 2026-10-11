# RoadIQ — AI Road Intelligence & Pavement Management System

RoadIQ is an AI-powered road infrastructure intelligence platform designed for municipal corporations, public works departments, and highway authorities. It provides computer-vision-based distress detection, ASTM D6433 Pavement Condition Index (PCI) lifecycle analysis, geospatial road inventory mapping, and contractor defect liability auditing.

---

## 🌟 Key Features

- **Computer Vision Pavement Distress Detection:** Automatic detection of potholes, alligator (fatigue) cracks, transverse cracks, and rutting via Roboflow AI inference.
- **Pavement Lifecycle Degradation Curve:** Real-time comparison of observed pavement health against standard AASHTO design lifecycle trajectories.
- **Site Condition & Risk Correlation:** Analyzes the interplay between side drainage conditions, seasonal waterlogging, subgrade soil types (such as Black Cotton soil), and traffic axle loads.
- **Contractor Warranty & Defect Liability Auditing:** Automatically flags premature failures within the Defect Liability Period (DLP) and generates defect notice recommendations for zero-cost public fund recovery.
- **Geospatial GIS Mapping:** Visualizes road networks and PCI color codes with interactive Leaflet markers.
- **Comparative Multi-Corridor Analytics:** Side-by-side time-series degradation tracking, distress frequency counts, and prioritized maintenance allocation.
- **Role-Based Access Control (RBAC):** Tiered permissions for `ADMIN`, `INSPECTOR`, and `VIEWER` users.

---

## 📚 Complete System Documentation & Architecture

For in-depth service descriptions, role permission matrices, data schemas, and Mermaid sequence & ER diagrams, see:
👉 **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)**

---

## 🚀 Quickstart

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/mayurdhavale10/capstone.git
cd capstone
npm install
```

### 3. Database Initialization
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@roadiq.com` | `admin123` |
| **Inspector** | `inspector@roadiq.com` | `inspect123` |
| **Viewer** | `viewer@roadiq.com` | `view123` |

*(Quick-login buttons are also provided on the sign-in screen)*

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript
- **Database & ORM:** Prisma 6 with SQLite (`dev.db`) / PostgreSQL
- **Authentication:** NextAuth.js v5 (Auth.js) Credentials Provider
- **Mapping:** Leaflet.js & React-Leaflet
- **Data Visualization:** Recharts
- **Icons & Styling:** Lucide React & Vanilla CSS Design Tokens
