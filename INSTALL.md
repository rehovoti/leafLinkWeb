# Leaflink Deployment Guide - DigitalOcean

This guide deploys leaflink on a 1 GB DigitalOcean droplet with host Nginx + Docker Compose.

Target environment:
- Ubuntu 22.04 LTS
- Docker + Docker Compose plugin installed
- Host Nginx installed
- UFW allows 22, 80, 443
- Domain: leaflink.garden

## Important Notes Before You Start

- This repository now includes:
  - `docker-compose.yml` as the default production stack
  - `docker-compose.dev.yml` for development
- Production stack uses non-dev processes only:
  - Backend runs uvicorn without `--reload`
  - Frontend is built once and served as static files by Nginx
  - pgAdmin is optional and disabled by default (Compose profile `tools`)

## Step 1: Clone Repository

```bash
cd /var/www
git clone <YOUR_REPO_URL> leaflink
cd leaflink
```

If your droplet repo still has only `docker-compose.prod.yml`, normalize once:

```bash
[ -f docker-compose.yml ] || mv docker-compose.prod.yml docker-compose.yml
```

## Step 2: Create `.env`

```bash
cat > .env << 'ENVEOF'
DB_USER=leaflink_user
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_NAME=leaflink_db
DATABASE_URL=postgresql://leaflink_user:CHANGE_ME_DB_PASSWORD@db:5432/leaflink_db

PGADMIN_EMAIL=admin@leaflink.garden
PGADMIN_PASSWORD=CHANGE_ME_PGADMIN_PASSWORD

SECRET_KEY=CHANGE_ME_SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

GOOGLE_CLIENT_ID=CHANGE_ME_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=CHANGE_ME_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://leaflink.garden/api/auth/callback
ENVEOF
```

Generate secrets:

```bash
openssl rand -hex 32      # SECRET_KEY
openssl rand -base64 24   # DB_PASSWORD
openssl rand -base64 24   # PGADMIN_PASSWORD
```

Then replace `CHANGE_ME_*` in `.env`.

## Step 3: Build Production Images

```bash
docker compose build
```

## Step 4: Start Database and Initialize Schema

Start database only:

```bash
docker compose up -d db
```

Wait for readiness:

```bash
docker compose ps
docker compose logs --tail=80 db
```

Initialize schema (robust form that does not rely on host shell env expansion):

```bash
docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/db_setup.sql
```

Verify tables:

```bash
docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"'
```

## Step 5: Start App Services

```bash
docker compose up -d backend frontend nginx
```

Check status:

```bash
docker compose ps
docker compose logs --tail=120 backend
docker compose logs --tail=120 nginx
```

Expected ports in production:
- `leaflink_nginx` exposed on `8081` (host)
- backend/frontend are internal-only
- pgAdmin is not running by default

Optional: start pgAdmin only when needed:

```bash
docker compose --profile tools up -d pgadmin
```

## Step 6: Configure Host Nginx (HTTP First)

Create host vhost file:

```bash
sudo nano /etc/nginx/sites-available/leaflink.garden
```

Use HTTP-only config first:

```nginx
upstream leaflink_app {
    server 127.0.0.1:8081;
}

server {
    listen 80;
    server_name leaflink.garden www.leaflink.garden;

    location / {
        proxy_pass http://leaflink_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/leaflink.garden /etc/nginx/sites-enabled/leaflink.garden
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Issue SSL Certificate

```bash
sudo certbot --nginx -d leaflink.garden -d www.leaflink.garden
```

Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager -l
```

## Step 8: Validate Deployment

```bash
curl -I http://127.0.0.1:8081
curl -I https://leaflink.garden
curl -I https://leaflink.garden/api/users
```

If API endpoint auth/business logic changes later, use logs for validation:

```bash
docker compose logs --tail=150 backend
docker compose logs --tail=150 nginx
```

## Step 9: Operations

View running services:

```bash
docker compose ps
```

Restart app services:

```bash
docker compose restart backend frontend nginx
```

Update deployment:

```bash
git pull
docker compose build
docker compose up -d
```

Database backup:

```bash
docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > leaflink_backup_$(date +%Y%m%d_%H%M%S).sql
```

Database restore:

```bash
docker compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < leaflink_backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### Droplet becomes unresponsive (high CPU/RAM)

Use DigitalOcean web console, then:

```bash
cd /var/www/leaflink
docker compose down
```

If still overloaded, stop all containers quickly:

```bash
docker stop $(docker ps -q)
```

Add 2 GB swap (recommended for 1 GB droplet):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Nginx reload fails with certificate error

Cause: 443 block references cert files before certbot created them.

Fix:
1. Keep host config HTTP-only first.
2. Run `certbot --nginx ...`.
3. Reload Nginx after certbot success.

### `psql: role "-d" does not exist`

Cause: `${DB_USER}` was empty in host shell.

Fix: use the container-env-safe command from Step 4.

### 502 from host Nginx

```bash
docker compose ps
docker compose logs --tail=120 nginx
docker compose logs --tail=120 backend
curl -I http://127.0.0.1:8081
```

## Quick Checklist

- [ ] DNS for `leaflink.garden` points to droplet IP
- [ ] `.env` created with real secrets
- [ ] `docker compose build` successful
- [ ] DB schema initialized
- [ ] App services running (`docker compose ps`)
- [ ] Host Nginx HTTP-only config loaded first
- [ ] Certbot run successfully
- [ ] HTTPS and `/api` routes reachable
