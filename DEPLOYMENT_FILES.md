# Deployment Files Reference

This document describes all deployment-related files created for production deployment of Leaflink to DigitalOcean.

---

## 📋 Main Documentation Files

### [INSTALL.md](./INSTALL.md) - **READ THIS FIRST**
Comprehensive step-by-step deployment guide covering:
- Prerequisites and preparation
- Environment setup
- Docker Compose configuration for production
- Nginx reverse proxy setup
- SSL/TLS certificate configuration with Certbot
- Database initialization
- Service management and monitoring
- Troubleshooting guide
- Backup and recovery procedures
- Scaling considerations

**Audience:** DevOps engineers, system administrators

**Time to read:** 20-30 minutes

---

### [QUICKSTART.md](./QUICKSTART.md) - **For Experienced DevOps**
Quick reference guide for engineers familiar with Docker/Linux:
- 10-minute TL;DR setup
- File reference table
- Common task commands
- Troubleshooting quick table
- Port mapping reference

**Audience:** Experienced DevOps engineers

**Time to read:** 5 minutes

---

## 🐳 Docker & Compose Files

### [docker-compose.prod.yml](./docker-compose.prod.yml)
**Production-ready Docker Compose configuration**

Features:
- Optimized port mappings (8081 for Nginx instead of 5020)
- Health checks on all services
- Persistent PostgreSQL volume
- Secure pgAdmin access (localhost only on port 5051)
- Container networking with internal network
- Alpine base image for PostgreSQL (smaller footprint)
- Restart policies configured
- Optimized for 1 GB RAM droplets

Usage:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### [docker-compose.yml](./docker-compose.yml)
**Original development Compose file**

Keep for:
- Local development
- Reference of service definitions
- Can be updated with production settings from .prod.yml

---

## 🔧 Configuration Files

### [.env.example](./.env.example)
**Environment variables template**

Contains all required variables with explanations:
- Database credentials (`DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- PostgreSQL settings
- pgAdmin credentials
- FastAPI JWT settings (`SECRET_KEY`, `ALGORITHM`)
- Google OAuth credentials (if using)

**Usage:**
```bash
cp .env.example .env
nano .env  # Edit with your actual values
```

**Important:** Never commit `.env` to git!

---

### [nginx/leaflink.garden.conf](./nginx/leaflink.garden.conf)
**Production Nginx reverse proxy configuration**

Features:
- HTTP to HTTPS redirect
- Strong SSL/TLS settings
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Gzip compression
- Rate limiting (50 req/s, 100 burst for API)
- Request logging
- Upstream proxy to Docker Nginx (port 8081)
- Static asset caching headers
- Sensitive file protection

**Installation:**
```bash
sudo cp nginx/leaflink.garden.conf /etc/nginx/sites-available/leaflink.garden
sudo ln -s /etc/nginx/sites-available/leaflink.garden /etc/nginx/sites-enabled/leaflink.garden
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 Deployment Scripts

### [deploy.sh](./deploy.sh)
**Interactive deployment and management script**

Interactive menu with options:
1. **Full deployment** - Build images, start services, initialize database
2. **Start services** - docker-compose up
3. **Stop services** - docker-compose down
4. **Restart services** - docker-compose restart
5. **View logs** - Real-time log streaming
6. **Check service status** - docker-compose ps
7. **Initialize database** - Run schema setup
8. **Backup database** - Create timestamped SQL dump

**Features:**
- Color-coded output
- Error handling with exit codes
- Environment validation
- Prerequisites checking (Docker, Docker Compose, .env file)

**Usage:**
```bash
chmod +x deploy.sh
./deploy.sh
```

---

### [health-check.sh](./health-check.sh)
**Production health monitoring and status check script**

Checks performed:
- Container running status (all 4 services)
- HTTP endpoint responses (Nginx and HTTPS)
- Database connectivity and size
- SSL certificate validity and expiration
- Disk space usage (warns at 80%, critical at 90%)
- Docker resource usage (CPU, memory)
- Logs results to `/var/log/leaflink/health_check.log`

**Features:**
- Color-coded output
- Automatic logging
- Alert thresholds
- Detailed Docker stats

**Usage:**
```bash
chmod +x health-check.sh
./health-check.sh

# Run periodically with cron
*/15 * * * * /var/www/leaflink/health-check.sh
```

---

## 📊 Architecture Overview

### Container Setup (Docker Compose)
```
┌─────────────────────────────────┐
│   leaflink_postgres_data        │ (Volume)
└─────────────────────────────────┘
          ▲
          │
    ┌─────┴─────┐
    │ leaflink_db │ (PostgreSQL:15)
    └─────┬─────┘
          │
    ┌─────┴──────────┬──────────────┐
    │                │              │
┌────┴──────┐  ┌─────┴────┐  ┌──────┴─────┐
│ leaflink  │  │ leaflink │  │ leaflink   │
│ backend   │  │ frontend │  │ pgadmin    │
│ (FastAPI) │  │ (React)  │  │ (admin)    │
└────┬──────┘  └─────┬────┘  └──────┬─────┘
     │                │              │
     └────────┬───────┴──────────────┘
              │
         ┌────┴────────┐
         │ leaflink_   │
         │ nginx       │
         │ (container) │
         └────┬────────┘
              │
              ▼
         Port 8081
         (Host)
              │
              ▼
   ┌──────────────────────┐
   │  /etc/nginx/sites-   │  (System Nginx)
   │   available/         │
   │ leaflink.garden.conf │
   └──────────┬───────────┘
              │
          ┌───┴────┐
          │         │
      Port 80   Port 443
    (HTTP)      (HTTPS + SSL)
```

### Port Mapping Reference
| Service | Internal | External | Purpose |
|---------|----------|----------|---------|
| PostgreSQL | 5432 | None | DB only |
| pgAdmin | 80 | 5051 | Admin UI (localhost only) |
| Backend | 8000 | None | API (Docker-only) |
| Frontend | 5173 | None | Web UI (Docker-only) |
| Nginx (Docker) | 80 | 8081 | Container proxy |
| System Nginx | - | 80/443 | HTTPS reverse proxy |

---

## 🚢 Deployment Process Summary

### Quick Path (10 minutes)
1. Clone repo → `cd /var/www/leaflink`
2. Create `.env` with secrets → `cp .env.example .env && nano .env`
3. Initialize database → `docker-compose up -d db && sleep 10 && docker-compose exec -T db psql ... < backend/db_setup.sql`
4. Start services → `docker-compose up -d`
5. Configure Nginx → `sudo cp nginx/leaflink.garden.conf /etc/nginx/sites-available/`
6. Get SSL cert → `sudo certbot certonly --nginx -d leaflink.garden`
7. Test → `curl https://leaflink.garden`

### Full Path (with explanation)
Follow [INSTALL.md](./INSTALL.md) step-by-step

---

## 🔐 Security Considerations

### Implemented
- ✅ HTTPS/TLS with modern cipher suites
- ✅ HTTP→HTTPS redirect
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ pgAdmin restricted to localhost only
- ✅ Database credentials in .env (not in code)
- ✅ Firewall allows only 80/443 to host
- ✅ Rate limiting on API endpoints
- ✅ Sensitive file protection in Nginx

### Recommended Additional Steps
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable automated backups to S3
- [ ] Set up uptime monitoring
- [ ] Configure DDoS protection
- [ ] Implement API key authentication
- [ ] Use secrets management (HashiCorp Vault, etc.)
- [ ] Enable VPN for admin access
- [ ] Set up intrusion detection

---

## 📞 Support & Documentation

| Topic | File |
|-------|------|
| Full setup guide | [INSTALL.md](./INSTALL.md) |
| Quick reference | [QUICKSTART.md](./QUICKSTART.md) |
| Project architecture | [AGENTS.md](./AGENTS.md) |
| Local development | [README.md](./README.md) |
| Backend settings | `backend/src/settings.py` |

---

## 🔄 Maintenance Tasks

### Daily
- Monitor logs: `docker-compose logs -f`
- Check disk space: `df -h`

### Weekly
- Run health check: `./health-check.sh`
- Review error logs: `docker-compose logs | grep ERROR`

### Monthly
- Database backup: `./deploy.sh` → Option 8
- Update system: `sudo apt update && sudo apt upgrade`
- Check SSL cert expiration: `./health-check.sh`

### Quarterly
- Review security headers
- Update Docker images: `docker-compose pull && docker-compose up -d`
- Test disaster recovery (restore from backup)

---

## 📝 Version Control

**Files to commit:**
- `INSTALL.md`
- `QUICKSTART.md`
- `docker-compose.prod.yml`
- `nginx/leaflink.garden.conf`
- `deploy.sh`
- `health-check.sh`
- `.env.example`
- This file (`DEPLOYMENT_FILES.md`)

**Files to NEVER commit:**
- `.env` (contains secrets)
- `docker-compose.override.yml` (local overrides)
- `postgres-data/` (database files)
- Nginx logs

---

## 🎯 Next Steps

1. **Read** [INSTALL.md](./INSTALL.md) completely
2. **Prepare** your DigitalOcean droplet
3. **Generate** secure credentials for `.env`
4. **Clone** this repository on your droplet
5. **Execute** deployment following INSTALL.md
6. **Monitor** with `./health-check.sh`
7. **Backup** regularly
8. **Update** documentation as you learn

---

**Created:** 2024-04-23  
**Last Updated:** 2024-04-23  
**Maintained by:** DevOps Team  
**Domain:** leaflink.garden
