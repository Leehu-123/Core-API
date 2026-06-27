# Core API — Company Management System

> Production-ready Core API built with NestJS, TypeScript, PostgreSQL, and Prisma. Designed as the single backend service for multiple internal company apps (Sale Manager, Stock Manager).

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Sale Manager   │     │  Stock Manager  │
│    App (:3001)  │     │    App (:3002)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ REST API
              ┌──────┴──────┐
              │   Core API  │
              │    (:3003)  │
              └──────┬──────┘
                     │ Prisma ORM
              ┌──────┴──────┐
              │ PostgreSQL  │
              │    (:5432)  │
              └─────────────┘
```

**Key principle:** Only Core API connects to PostgreSQL. Frontend apps call Core API via REST.

## ✨ Features

- 🔐 JWT Authentication with role-based & permission-based access control
- 🏢 Multi-company data isolation
- 📦 Products CRUD with search, pagination, soft delete
- 👥 Customers CRUD with search, pagination, soft delete
- 👤 User management with role assignment
- 📋 Comprehensive audit logging
- 💾 Automated daily PostgreSQL backup to Google Drive
- 🐳 Docker & Docker Compose (local + production)
- 📖 Swagger/OpenAPI documentation at `/docs`
- 🛡️ Security: Helmet, CORS, rate limiting, bcrypt
- ✅ ESLint + Prettier + Jest

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm 10+

### Local Setup (Without Docker)

1. **Clone and install:**
   ```bash
   cd core-api
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update `DATABASE_URL` to point to your local PostgreSQL:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/company_db
   JWT_SECRET=your-secret-key-here
   ```

3. **Run database migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Seed demo data:**
   ```bash
   npm run prisma:seed
   ```

5. **Start development server:**
   ```bash
   npm run start:dev
   ```

6. **Open Swagger:**
   Navigate to [http://localhost:3003/docs](http://localhost:3003/docs)

### Demo Login

| Email | Password |
|-------|----------|
| owner@example.com | ChangeMe123! |

## 🐳 Docker Setup

### Local Development with Docker

```bash
# Build and start
docker compose -f docker-compose.local.yml up -d --build

# Run migrations
docker compose -f docker-compose.local.yml exec core-api npx prisma migrate deploy

# Seed data
docker compose -f docker-compose.local.yml exec core-api npx prisma db seed

# View logs
docker compose -f docker-compose.local.yml logs -f core-api

# Stop
docker compose -f docker-compose.local.yml down
```

### Production Deployment with Docker

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.prod.yml exec core-api npx prisma migrate deploy

# Seed initial data (first time only)
docker compose -f docker-compose.prod.yml exec core-api npx prisma db seed
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `3003` |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `JWT_SECRET` | JWT signing secret | required |
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `BACKUP_ENABLED` | Enable automated backups | `false` |
| `BACKUP_TIME` | Backup time (HH:mm) | `02:00` |
| `BACKUP_TIMEZONE` | Backup timezone | `Asia/Bangkok` |
| `BACKUP_RETENTION_DAYS` | Days to keep backups | `30` |
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth client ID | — |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google OAuth client secret | — |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Google OAuth refresh token | — |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | Google Drive folder ID | — |
| `CORS_ORIGINS` | Comma-separated allowed origins | — |

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start production server |
| `npm run start:dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create and run migrations (dev) |
| `npm run prisma:deploy` | Deploy migrations (prod) |
| `npm run prisma:seed` | Seed database |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run backup:run` | Run manual backup |
| `npm run restore` | Restore from backup |

## 🔐 Authentication & Authorization

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/register-initial-company` | Public | Register new company |
| GET | `/auth/me` | JWT | Get current user |
| POST | `/auth/refresh` | JWT | Refresh token |
| POST | `/auth/logout` | JWT | Logout |

### Default Roles & Permissions

| Role | Permissions |
|------|-------------|
| owner | All permissions |
| admin | All permissions |
| sales | products.read, customers.read, customers.write |
| warehouse | products.read, products.write |
| viewer | *.read permissions |

## 💾 Google Drive Backup Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**

### Step 2: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
5. Save the **Client ID** and **Client Secret**

### Step 3: Generate Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the ⚙️ gear icon (Settings)
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In Step 1, select `https://www.googleapis.com/auth/drive.file`
6. Click **Authorize APIs** and grant access
7. In Step 2, click **Exchange authorization code for tokens**
8. Copy the **Refresh Token**

### Step 4: Configure Environment

```env
BACKUP_ENABLED=true
BACKUP_TIME=02:00
BACKUP_TIMEZONE=Asia/Bangkok
BACKUP_RETENTION_DAYS=30
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your-folder-id
```

### Step 5: Test Manual Backup

```bash
# Via npm script
npm run backup:run

# Via API (requires backups.write permission)
curl -X POST http://localhost:3003/backups/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔄 Restore from Backup

⚠️ **WARNING: Restore is destructive and will replace all data in the target database!**

```bash
# Download backup file from Google Drive first, then:
npm run restore -- ./backups/company_db_2024-01-15_02-00-00.sql.gz
```

The script will:
1. Show target database details
2. Ask for confirmation
3. Restore using pg_restore

## 🖥️ VPS Deployment Notes

### Minimum Requirements
- 1 vCPU, 2GB RAM, 20GB SSD
- Ubuntu 22.04+ or Debian 12+
- Docker & Docker Compose installed

### Deployment Steps

1. **Clone repository to VPS:**
   ```bash
   git clone <your-repo> /opt/core-api
   cd /opt/core-api
   ```

2. **Create production .env:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

3. **Start services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. **Run initial migration & seed:**
   ```bash
   docker compose -f docker-compose.prod.yml exec core-api npx prisma migrate deploy
   docker compose -f docker-compose.prod.yml exec core-api npx prisma db seed
   ```

5. **Configure Nginx SSL** (optional):
   - Install certbot on host
   - Generate SSL certificate
   - Update `docker/nginx/nginx.conf` with SSL configuration

### Firewall Configuration
```bash
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 22/tcp   # SSH
ufw enable
```

## 🔒 Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value (min 64 chars)
- [ ] Change default database passwords
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGINS` with specific domains
- [ ] PostgreSQL port NOT exposed publicly
- [ ] Enable HTTPS via Nginx
- [ ] Change demo user password after first login
- [ ] Configure firewall (UFW)
- [ ] Set up log rotation
- [ ] Enable Google Drive backup
- [ ] Test backup restore procedure
- [ ] Set up monitoring (optional: PM2, Prometheus)

## 📖 API Documentation

Full API documentation is available via Swagger UI:
- Local: [http://localhost:3003/docs](http://localhost:3003/docs)
- Production: `https://your-domain.com/docs`

## 📄 License

Private — Internal use only.
