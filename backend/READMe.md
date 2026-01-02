# ClearDeal AI — Backend

> **AI-powered real estate deal risk analysis for the US market**

ClearDeal AI analyzes real estate contracts to detect hidden risks, missing documents, unusual clauses, and state-specific compliance issues — all before a deal goes sideways.

This repository contains the **backend system** powering ClearDeal AI.

---

## 🧠 What ClearDeal AI Does

ClearDeal AI helps **real estate agents, brokers, and teams**:

* Detect risky or missing clauses in contracts
* Identify missing disclosures and addenda
* Understand *what could go wrong* in plain English
* Get a clear **Deal Risk Score (0–100)**
* Track how deal risk changes over time
* Generate shareable PDF risk reports
* Monitor brokerage-wide deal risk (premium)

The system combines **AI + deterministic rules + state-specific logic** to produce reliable, auditable results.

---

## 🏗️ Tech Stack

* **Backend:** Node.js + TypeScript
* **Framework:** Express / Fastify
* **Database:** PostgreSQL
* **ORM:** Prisma
* **AI:** OpenAI / Claude (pluggable)
* **Validation:** Zod
* **Auth:** JWT
* **PDF Reports:** Server-side generation

---

## ✨ Core Features

1. **Deal Risk Score (0–100)**
2. **Risk Explanations ("What could go wrong?")**
3. **State-Specific Rules (CA, TX, FL, NY, extensible)**
4. **Missing Document Detection**
5. **Unusual Clause Detection**
6. **Broker Safety Dashboard (Premium)**
7. **Pre-Offer Contract Scanning**
8. **Risk Change Tracking**
9. **Downloadable PDF Risk Reports**
10. **Usage-Based Billing**

---

## 🧩 System Architecture (High Level)

```
Request
  → Controller (HTTP only)
    → Service (business logic)
      → AI + Rules Engine
      → Risk Scoring
      → Database
      → Report Generation
```

Key design principles:

* AI is **sandboxed** and never writes directly to the database
* Rules are deterministic and auditable
* Services orchestrate logic
* Repositories handle data access only

---

## 📁 Backend Folder Structure

```
src/
├── server.ts
├── app.ts
│
├── config/          # Environment, AI, billing, scoring configs
├── controllers/     # HTTP layer (no business logic)
├── routes/          # API route definitions
├── services/        # Core business logic
├── repositories/    # Database access (Prisma only)
├── ai/              # AI clients, prompts, parsers
├── rules/           # Deterministic risk rules (incl. state rules)
├── scoring/         # Deal risk score engine
├── reports/         # PDF & report builders
├── middlewares/     # Auth, error handling, uploads
├── validators/      # Request validation (Zod)
├── jobs/            # Background & scheduled jobs
├── utils/           # Shared helpers
├── prisma/          # Prisma schema & migrations
├── types/           # Shared TypeScript types
└── tests/           # Unit, integration, e2e tests
```

---

## 🔥 Feature → Code Mapping

### Deal Risk Score

* `scoring/score.engine.ts`
* `services/riskScore.service.ts`

### Risk Explanations

* `ai/prompts/riskExplanation.prompt.ts`
* `services/riskAnalysis.service.ts`

### State-Specific Rules

* `rules/states/`
* `services/stateRules.service.ts`

### Missing Document Detection

* `services/documentCheck.service.ts`
* `rules/disclosure.rules.ts`

### Unusual Clause Detection

* `ai/prompts/unusualClause.prompt.ts`
* `rules/unusual.rules.ts`

### Broker Safety Mode

* `controllers/broker.controller.ts`
* `services/brokerSafety.service.ts`
* `jobs/brokerAlerts.job.ts`

### Risk History Tracking

* `riskHistory.repository.ts`
* `services/riskHistory.service.ts`

### PDF Risk Reports

* `reports/pdf.generator.ts`
* `reports/report.builder.ts`

### Usage-Based Billing

* `services/billing.service.ts`
* `jobs/usageTracking.job.ts`

---

## 🔁 Contract Scan Flow

1. Contract uploaded (PDF/DOC)
2. Text extracted
3. AI extracts clauses
4. Rules engine evaluates risks
5. Risk score calculated
6. Risk explanations generated
7. Results saved to database
8. PDF report generated (optional)

---

## 🔐 Authentication & Roles

* **Agent:** Scan contracts, view reports
* **Broker:** View team risk, alerts, analytics
* **Admin:** System management

Role checks are enforced via middleware.

---

## 💳 Billing Model

* Usage-based pricing
* Credits per scan
* Subscription tiers (Agent / Broker / Enterprise)
* AI usage tracked per organization

---

## 🚀 Getting Started

### 1. Install Dependencies

```
npm install
```

### 2. Setup Environment

```
cp .env.example .env
```

Configure:

* Database URL
* AI API keys
* JWT secret

### 3. Run Migrations

```
npx prisma migrate dev
```

### 4. Start Server

```
npm run dev
```

---

## 🧪 Testing

```
npm run test
```

Tests are organized by:

* Unit tests
* Integration tests
* End-to-end tests

---

## 🧭 Roadmap

* More US states
* MLS integrations
* Transaction coordinator workflows
* Broker analytics dashboard
* White-label offering

---

## ⚠️ Disclaimer

ClearDeal AI provides **risk analysis assistance only**.
It is **not legal advice**.
All users are encouraged to consult licensed professionals before making decisions.

---

## 🤝 Contributing

Contributions are welcome. Please follow the established architecture and coding standards.

---

## 📄 License

Proprietary — All rights reserved.
