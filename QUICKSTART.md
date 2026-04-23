# Quick Start - Leaflink Production Deployment

> **Jump-in guide for experienced DevOps engineers. Full details in [INSTALL.md](./INSTALL.md)**

## TL;DR - 10 Minute Setup

### 1. Clone & Configure
```bash
cd /var/www
git clone https://github.com/yourusername/leaflink.git
cd leaflink

# Generate secrets
openssl rand -hex 32  # SECRET_KEY
openssl rand -base64 16  # DB passwords

# Create .env
cp .env.example .env
# Edit with your values
nano .env
```

### 2. Database Setup
```bash
# Start database first
docker-compose up -d db
sleep 10

# Initialize schema
docker-compose exec -T db psql -U $(grep DB_USER .env | cut -d= -f2) -d $(grep DB_NAME .env | cut -d= -f2) < backend/db_setup.sql
```

### 3. Start Services
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Or update your docker-compose.yml with production settings
# docker-compose up -d

# Verify
docker-compose ps
```

### 4. Configure Nginx & SSL
```bash
# Copy Nginx config
sudo cp nginx/leaflink.garden.conf /etc/nginx/sites-available/leaflink.garden

# Enable site
sudo ln -s /etc/nginx/sites-available/leaflink.garden /etc/nginx/sites-enabled/leaflink.garden

# Test & reload
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot certonly --nginx -d leaflink.garden -d www.leaflink.garden

# Verify Nginx was updated automatically
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Test & Deploy
```bash
curl -I https://leaflink.garden  # Should return 200
# Then open browser to https://leaflink.garden
```

---

## File Reference

| File | Purpose |
|------|---------|
| `INSTALL.md` | Full deployment guide with troubleshooting |
| `.env.example` | Template for environment variables |
| `docker-compose.prod.yml` | Production-ready Compose config |
| `deploy.sh` | Interactive deployment helper script |
| `nginx/leaflink.garden.conf` | Production Nginx reverse proxy config |

---

## Common Tasks

### View Logs
```bash
docker-compose logs -f backend   # Backend only
docker-compose logs -f           # All services
```

### Restart Services
```bash
docker-compose restart           # All services
docker-compose restart backend   # Specific service
```

### Backup Database
```bash
docker-compose exec -T db pg_dump -U $(grep DB_USER .env | cut -d= -f2) $(grep DB_NAME .env | cut -d= -f2) > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Update Code
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Access pgAdmin
```bash
# SSH tunnel from your local machine
ssh -L 5051:127.0.0.1:5051 user@droplet_ip

# Then visit http://localhost:5051 locally
# Credentials: Check PGADMIN_EMAIL and PGADMIN_PASSWORD in .env
```

---

## Troubleshooting

| Issue | Command |
|-------|---------|
| Backend won't start | `docker-compose logs backend` |
| DB connection error | `docker-compose logs db && docker-compose ps db` |
| 502 Gateway Error | `docker-compose logs nginx && docker-compose ps` |
| Certificate issues | `sudo certbot certificates && sudo certbot renew --dry-run` |

---

## Port Mapping

| Service | Internal | External | Access |
|---------|----------|----------|--------|
| Frontend | 5173 | Docker-only | Via Nginx |
| Backend | 8000 | Docker-only | Via Nginx |
| Nginx | 80 | 8081 | From host Nginx |
| pgAdmin | 80 | 5051 | SSH tunnel only |
| PostgreSQL | 5432 | Docker-only | Via containers |

---

## Environment Variables Required

```
DB_USER
DB_PASSWORD
DB_NAME
DATABASE_URL
PGADMIN_EMAIL
PGADMIN_PASSWORD
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
GOOGLE_CLIENT_ID (if using auth)
GOOGLE_CLIENT_SECRET (if using auth)
GOOGLE_REDIRECT_URI (if using auth)
```

---

## Next Steps

1. ✅ Deploy to DigitalOcean (you are here)
2. Monitor logs regularly
3. Set up automated backups
4. Monitor disk usage
5. Plan for scaling (managed DB, separate servers)

For detailed information, see [INSTALL.md](./INSTALL.md)
