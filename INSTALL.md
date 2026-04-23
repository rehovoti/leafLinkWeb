# Leaflink Deployment Guide - DigitalOcean

This guide walks you through deploying **leaflink** to a DigitalOcean droplet alongside an existing containerized site.

**Target Environment:**
- DigitalOcean Ubuntu 22.04 LTS Droplet
- 1 GB RAM, 1 vCPU, 25 GB SSD
- Docker & Docker Compose already installed
- Nginx already installed as reverse proxy for existing site
- Certbot & SSL already configured for existing domain
- Domain: `leaflink.garden`

---

## Prerequisites

Before starting, ensure:

1. **SSH access to your droplet** with sudo privileges
2. **Domain registered and DNS configured** to point `leaflink.garden` to your droplet's IP
3. **Existing Docker Compose site** running on port 8080 or different port
4. **Port 8081 available** on the droplet (for leaflink internal nginx)

---

## Step 1: Clone the Repository

SSH into your droplet and clone the leaflink repository:

```bash
cd /var/www
sudo git clone https://github.com/yourusername/leaflink.git
cd leaflink
sudo chown -R $USER:$USER .
```

---

## Step 2: Set Up Environment Variables

Create a `.env` file with production-grade secrets:

```bash
cat > .env << 'EOF'
# Database Configuration
DB_USER=leaflink_user
DB_PASSWORD=STRONG_PASSWORD_HERE_CHANGE_ME
DB_NAME=leaflink_db
DATABASE_URL=postgresql://leaflink_user:STRONG_PASSWORD_HERE_CHANGE_ME@db:5432/leaflink_db

# PostgreSQL & pgAdmin
PGADMIN_EMAIL=admin@leaflink.garden
PGADMIN_PASSWORD=STRONG_PGADMIN_PASSWORD_CHANGE_ME

# FastAPI JWT Settings
SECRET_KEY=your_super_secret_key_generate_with_openssl_rand_hex_32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Google OAuth (if using authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://leaflink.garden/api/auth/callback
EOF
```

**Generate secure random values:**

```bash
# Generate SECRET_KEY (32 bytes)
openssl rand -hex 32

# Generate DB_PASSWORD (16 bytes)
openssl rand -base64 16

# Generate PGADMIN_PASSWORD (16 bytes)
openssl rand -base64 16
```

**Replace all `CHANGE_ME` values in `.env` with the generated secrets.**

---

## Step 3: Configure docker-compose.yml for Production

Update the docker-compose.yml to use unique container names and change port mappings to avoid conflicts:

**Key changes:**
- Change internal nginx port from `5020` to `8081` (external, mapped to host)
- Move pgAdmin to port `5051` (internal only, not exposed in production)
- Use persistent database volume
- Remove development volume mounts from backend/frontend
- Add health checks

**Updated docker-compose.yml:**

```yaml
version: "3.8"

services:

  db:
    container_name: leaflink_db
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - leaflink_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    container_name: leaflink_pgadmin
    image: dpage/pgadmin4:latest
    restart: always
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD}
      - PGADMIN_CONFIG_PROXY_X_FOR_COUNT=1
      - PGADMIN_CONFIG_PROXY_X_PROTO_COUNT=1
    ports:
      - "127.0.0.1:5051:80"
    depends_on:
      db:
        condition: service_healthy
    # Note: pgAdmin only accessible locally; add SSH tunnel to access

  nginx:
    container_name: leaflink_nginx
    build:
      dockerfile: Dockerfile.dev
      context: ./nginx
    restart: always
    ports:
      - "8081:80"
    depends_on:
      - backend
      - frontend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    container_name: leaflink_backend
    build:
      dockerfile: Dockerfile.dev
      context: ./backend
    restart: always
    env_file:
      - .env
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    container_name: leaflink_frontend
    build:
      dockerfile: Dockerfile.dev
      context: ./frontend
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5173"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  leaflink_postgres_data:
    driver: local
```

Apply these changes:

```bash
# Backup original
cp docker-compose.yml docker-compose.yml.backup

# Update with production config
# (Apply the YAML changes shown above to docker-compose.yml)
```

---

## Step 4: Configure Nginx Reverse Proxy

Edit the main Nginx config to add a new upstream block for leaflink:

```bash
sudo nano /etc/nginx/sites-available/leaflink.garden
```

Add this configuration:

```nginx
upstream leaflink_backend {
    server 127.0.0.1:8081;
}

server {
    listen 80;
    server_name leaflink.garden www.leaflink.garden;

    # Redirect HTTP to HTTPS (will be configured after SSL setup)
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name leaflink.garden www.leaflink.garden;

    # SSL certificates will be configured by certbot
    ssl_certificate /etc/letsencrypt/live/leaflink.garden/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leaflink.garden/privkey.pem;

    # Recommended SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://leaflink_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API-specific headers
    location /api/ {
        proxy_pass http://leaflink_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/leaflink.garden /etc/nginx/sites-enabled/leaflink.garden

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 5: Set Up SSL Certificate with Certbot

Use certbot to generate an SSL certificate for `leaflink.garden`:

```bash
sudo certbot certonly --nginx -d leaflink.garden -d www.leaflink.garden
```

**Follow the certbot prompts:**
- Enter your email address
- Agree to terms
- Choose appropriate options

After successful completion, Nginx config is automatically updated. Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Initialize Database Schema

Before starting containers, ensure the database schema is initialized:

```bash
cd /var/www/leaflink

# Start only the database service
docker-compose up -d db

# Wait for database to be ready
sleep 10

# Initialize schema
docker-compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} < backend/db_setup.sql

# Verify
docker-compose exec db psql -U ${DB_USER} -d ${DB_NAME} -c "\dt"
```

---

## Step 7: Start All Services

Build and start all containers:

```bash
cd /var/www/leaflink

# Build images (production mode)
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output:**
```
NAME                 STATUS              PORTS
leaflink_db          Up (healthy)        127.0.0.1:5432->5432/tcp
leaflink_pgadmin     Up                  127.0.0.1:5051->80/tcp
leaflink_nginx       Up (healthy)        0.0.0.0:8081->80/tcp
leaflink_backend     Up (healthy)        0.0.0.0:8000->8000/tcp
leaflink_frontend    Up (healthy)        0.0.0.0:5173->5173/tcp
```

---

## Step 8: Verify Deployment

Test the deployment:

```bash
# Check if HTTPS works
curl -I https://leaflink.garden

# Check API endpoint
curl -I https://leaflink.garden/api/users

# View container logs
docker-compose logs nginx
docker-compose logs backend
docker-compose logs frontend
```

Visit `https://leaflink.garden` in your browser. You should see the Leaflink application.

---

## Step 9: Access pgAdmin (Optional - Local Only)

pgAdmin is bound to `127.0.0.1:5051` for security. To access it:

**Option 1: SSH Port Forwarding**
```bash
ssh -L 5051:127.0.0.1:5051 your_droplet_user@your_droplet_ip
```

Then visit `http://localhost:5051` locally.

**Credentials:**
- Email: Value from `PGADMIN_EMAIL` in `.env`
- Password: Value from `PGADMIN_PASSWORD` in `.env`

---

## Monitoring & Logs

### View Real-Time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Check Service Health

```bash
# View container status
docker-compose ps

# Restart a service
docker-compose restart backend

# Rebuild and restart (after code changes)
docker-compose up -d --build
```

### Monitor Disk Usage

```bash
# Check Docker volume sizes
docker system df

# Prune unused data
docker system prune -a
```

---

## Backup Strategy

### Database Backup

```bash
# Create a backup
docker-compose exec db pg_dump -U ${DB_USER} ${DB_NAME} > leaflink_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T db psql -U ${DB_USER} ${DB_NAME} < leaflink_backup_20240423_120000.sql
```

### Volume Backup

```bash
# Backup PostgreSQL data volume
docker run --rm -v leaflink_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

---

## Updating & Redeploying

When you have new code to deploy:

```bash
cd /var/www/leaflink

# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Stop old containers and start new ones
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f
```

---

## Troubleshooting

### Backend Won't Start - Settings Error

If you see: `KeyError: GOOGLE_CLIENT_ID` or similar

**Fix:** Ensure all required environment variables are set in `.env`:
```bash
cat .env | grep -E "GOOGLE_|SECRET_KEY|DATABASE_URL"
```

### Database Connection Refused

```bash
# Check database logs
docker-compose logs db

# Verify DB is healthy
docker-compose exec db pg_isready -U ${DB_USER}

# Restart database
docker-compose restart db
docker-compose up -d backend
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
docker-compose ps backend

# View nginx logs
docker-compose logs nginx

# Check backend logs
docker-compose logs backend
```

### SSL Certificate Issues

```bash
# Verify certificate
sudo certbot certificates

# Renew certificate manually (auto-renewal should handle this)
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Port Already in Use

If port 8081 is in use by another service:

```bash
# Find what's using port 8081
lsof -i :8081

# Change port in docker-compose.yml
# ports:
#   - "8082:80"  # Changed from 8081 to 8082

# Update upstream in Nginx config
# upstream leaflink_backend {
#     server 127.0.0.1:8082;
# }
```

---

## Scaling Considerations

For future scaling beyond the 1 GB droplet:

1. **Consider a managed database** (DigitalOcean Managed PostgreSQL) to reduce droplet load
2. **Separate frontend and backend containers** to different droplets
3. **Use a CDN** for static assets
4. **Implement load balancing** with multiple backend instances
5. **Set up automated backups** through DigitalOcean dashboard

---

## Production Checklist

Before going live:

- [ ] Domain DNS configured to point to droplet
- [ ] SSL certificate installed and working
- [ ] Database initialized with schema
- [ ] Environment variables set securely
- [ ] Nginx reverse proxy configured
- [ ] All containers running and healthy
- [ ] HTTPS redirects working
- [ ] API endpoints responding correctly
- [ ] Firewall rules configured (allow 80, 443, deny 5432, 8081, etc.)
- [ ] Backup strategy documented and tested
- [ ] Logs monitored and rotating
- [ ] Health checks enabled on containers

---

## Support & Debugging

For detailed project information, see:
- [AGENTS.md](./AGENTS.md) - Architecture overview
- [README.md](./README.md) - Local development guide
- [Backend Settings](./backend/src/settings.py) - Configuration reference

For issues, check:
1. Container logs: `docker-compose logs <service>`
2. System logs: `journalctl -xe`
3. Nginx config: `sudo nginx -t`
4. PostgreSQL: `docker-compose exec db psql -U ${DB_USER} -d ${DB_NAME} -c "\dt"`
