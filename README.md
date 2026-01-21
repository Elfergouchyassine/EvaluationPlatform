# Plateforme d'évaluation de programmation automatique

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Docker


##  Installation

**Frontend:**
```bash
cd codemirror-react
npm install
cd ..
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### Configure environment variables

Create `server/.env`:

```env
SONARQUBE_URL=http://localhost:9000
SONARQUBE_TOKEN=your_sonarqube_token_here
```

**How to get SonarQube token:**
1. Open `http://localhost:9000`
2. Login with `admin` / `root`
3. Go to **Profile** → **Security** → **Generate Tokens**
4. Copy the generated token starting with `squ_...`



### Start SonarQube with Docker

```bash
docker run -d --name sonarqube2 -p 9000:9000 \
  -v sonar_data:/opt/sonarqube/data \
  -v sonar_extensions:/opt/sonarqube/extensions \
  -v sonar_logs:/opt/sonarqube/logs \
  -v sonar_conf:/opt/sonarqube/conf \
  sonarqube:lts
```

Wait 2-3 minutes for SonarQube to start, then access:
- **URL:** `http://localhost:9000`
- **Username:** `admin`
- **Password:** `admin`


## Running the Application

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```

Backend will run on `http://localhost:5000`

**Terminal 2 - Frontend Application:**
```bash
cd codemirror-react
npm run dev
```

Frontend will run on `http://localhost:5173`

**Terminal 3 - SonarQube (if using Docker):**
```bash
# Already running in background, just verify:
docker ps | grep sonarqube
```

## Architecture

```
┌─────────────────────────────────────┐
│   React Frontend (5173)             │
│   - Code Editor (CodeMirror)        │
│   - Exercise Display                │
│   - Results & Analytics             │
└────────────────┬────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────┐
│   Node.js Backend (5000)            │
│   - Code Analysis                   │
│   - SonarQube Integration           │
│   - API Endpoints                   │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
   ┌─────────┐      ┌──────────────┐
   │Judge0   │      │SonarQube     │
   │(Online) │      │(Docker 9000) │
   └─────────┘      └──────────────┘
```

