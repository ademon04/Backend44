Noms Backend

Modular compliance automation platform for Mexican Environmental and Safety Standards (NOMs) and EPA methods. Built with Node.js, Express, and MongoDB.

![Tests](https://github.com/ademon04/Backend44/actions/workflows/tests.yml/badge.svg)

What This Is
Environmental compliance in Mexico requires companies to measure and report against a set of Official Mexican Standards (NOMs) — covering noise levels, lighting, electrical grounding resistance, and volatile organic compounds in industrial emissions.
This backend automates the full compliance workflow: from field data collection and instrument calibration tracking, to complex regulatory calculations and report generation. Each NOM is an independent module with its own database, calculation engine, and test suite.
The calculation engines are the core of this system. They replicate, formula by formula, the exact calculations defined in each standard — reverse-engineered from real field Excel reports used by certified environmental laboratories.

Stack

Node.js v24+ / Express 4.x
MongoDB with Mongoose 8.x — multi-database pool (one DB per NOM)
Winston — structured logging with daily rotation
Jest + Supertest — 463 tests across 15 suites
Helmet + express-rate-limit — production security hardening
JWT + bcryptjs — role-based authentication


Architecture
The system follows a strict layered architecture across all modules:
routes → middleware → service → repository → model
Each NOM module is self-contained:
src/modules/
├── epa-18/       # EPA Method 18-1994 — VOC measurement in stacks
├── nom022/       # NOM-022-STPS-2015 — Electrical grounding resistance
├── nom025/       # NOM-025-STPS-2008 — Workplace illumination
├── nom081/       # NOM-081-SEMARNAT-1994 — Environmental noise
└── nom011/       # NOM-011-STPS-2001 — Occupational noise
Each module has its own MongoDB database, calculation service, CRUD endpoints, and independent test suite — so adding a new NOM never touches existing ones.

Calculation Engines
EPA Method 18-1994 (VOC in industrial stacks)
13 chained formulas replicating the EPA M18 method:

Two-stage data flow: field measurement → laboratory analysis
Status tracking across workflow stages
Validated against real certified lab reports

NOM-025 (Illumination)

Lux correction factor lookup via closest-match calibration table
Independent kf_plano calculation per measurement plane
Fixed u_relativa constant extracted from calibration certificates
Reverse-engineered from field Excel files used by certified inspectors

NOM-081 (Environmental Noise)

Energetic averaging across measurement points
NEQ divisor correction
Nff formula validated against reference lab report

NOM-022 (Electrical Grounding)

Resistance-to-ground calculations per measurement point
Multi-instrument support (terrómetro + multímetro)


Test Coverage
Test Suites: 15 passed, 15 total
Tests:       463 passed, 463 total
Time:        11.6s
Each module has unit tests, edge case tests, and end-to-end tests covering the full calculation pipeline.

Project Structure
backend_44/
├── src/
│   ├── config/          # DB connection, Winston logger
│   ├── connections/     # Multi-DB pool (one connection per NOM)
│   ├── middleware/      # JWT auth, centralized error handler
│   ├── models/          # Shared schemas (empresa, firma, usuario)
│   ├── modules/         # NOM modules (self-contained)
│   ├── routes/          # Auth routes
│   └── services/        # Auth service
├── tests/               # Jest test suites per module
├── scripts/             # Interactive CLI scripts for equipment setup
├── logs/                # Daily rotating logs (auto-generated)
├── App.js               # Express app (no listen)
└── server.js            # Entry point

Database Architecture
Each NOM writes to its own MongoDB database via a shared connection pool:
DatabaseContentsappUsers, global confignom025Illumination studiesnom081Noise studiesnom022Grounding resistance studiesepa18VOC measurement campaigns

Getting Started
Prerequisites: Node.js v24+, MongoDB running on localhost:27017
bashgit clone https://github.com/your-username/backend44.git
cd backend_44
npm install
cp .env.example .env   # fill in your values
npm run dev
Run tests:
bashnpm test
Server runs at http://localhost:3000.

API Endpoints
Health
GET /health
NOM-022 (Grounding)
GET    /api/nom022/terrometros
POST   /api/nom022/terrometros
POST   /api/nom022/estudios
POST   /api/nom022/estudios/:id/pozos
POST   /api/nom022/estudios/:id/calcular
NOM-025 (Illumination)
GET    /api/nom025/luxometros
POST   /api/nom025/estudios
POST   /api/nom025/estudios/:id/calcular
NOM-081 (Noise)
GET    /api/nom081/sonometros
POST   /api/nom081/estudios
POST   /api/nom081/estudios/:id/calcular

Security
LayerImplementationHeadershelmetRate limiting100 req/15min (all routes), 30 req/15min (study creation)AuthenticationJWT with role verificationPasswordsbcryptjs (salt 10)

Equipment Setup (CLI)
Interactive scripts to register calibrated instruments:
bashnode scripts/crear-luxometro-nom025.js
node scripts/crear-sonometro-nom081.js
node scripts/crear-terrometro-nom022.js
node scripts/crear-multimetro-nom022.js

NOM Roadmap
StandardDescriptionStatusEPA M18-1994VOC in industrial stacks✅ CompleteNOM-022-STPS-2015Electrical grounding resistance✅ CompleteNOM-025-STPS-2008Workplace illumination✅ CompleteNOM-081-SEMARNAT-1994Environmental noise✅ CompleteNOM-011-STPS-2001Occupational noise✅ Complete23 more NOMsPending⏳

Environment Variables
envNODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3000