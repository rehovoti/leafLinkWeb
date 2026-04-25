#!/bin/bash
# Deploy script for Leaflink on DigitalOcean

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}\n"; }
print_error() { echo -e "${RED}✗ $1${NC}\n"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}\n"; }

COMPOSE_CMD=()

detect_compose() {
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD=(docker-compose)
    else
        print_error "Docker Compose is not installed."
        exit 1
    fi
}

compose() {
    "${COMPOSE_CMD[@]}" "$@"
}

wait_for_database() {
    print_header "Waiting For Database"
    for i in {1..60}; do
        if compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER"' >/dev/null 2>&1; then
            print_success "Database is ready"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    print_error "Database failed to become ready in 60 seconds"
    return 1
}

main() {
    print_header "Leaflink Deployment Script"

    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux. Current: $OSTYPE"
        exit 1
    fi

    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed."
        exit 1
    fi
    print_success "Docker is installed"

    detect_compose
    print_success "Using compose command: ${COMPOSE_CMD[*]}"

    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        echo "Create it first using .env.example"
        exit 1
    fi
    print_success ".env file found"

    if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "nginx" ]; then
        print_error "Required directories not found. Run this from repository root."
        exit 1
    fi
    print_success "Project structure verified"

    echo "What would you like to do?"
    echo "1) Full deployment (build + db init + start app)"
    echo "2) Start app services (backend/frontend/nginx)"
    echo "3) Stop all services"
    echo "4) Restart app services"
    echo "5) View logs"
    echo "6) Check service status"
    echo "7) Initialize database"
    echo "8) Backup database"
    echo "9) Start pgAdmin (tools profile)"
    echo "10) Stop pgAdmin"
    echo ""
    read -r -p "Enter choice [1-10]: " choice

    case "$choice" in
        1) deploy_full ;;
        2) deploy_start ;;
        3) deploy_stop ;;
        4) deploy_restart ;;
        5) deploy_logs ;;
        6) deploy_status ;;
        7) init_database ;;
        8) backup_database ;;
        9) start_pgadmin ;;
        10) stop_pgadmin ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

deploy_full() {
    print_header "Full Deployment"

    print_header "Step 1: Build Images"
    compose build
    print_success "Images built"

    print_header "Step 2: Start Database"
    compose up -d db
    wait_for_database

    print_header "Step 3: Initialize Database"
    init_database

    print_header "Step 4: Start App Services"
    compose up -d backend frontend nginx
    print_success "App services started"

    deploy_status

    echo -e "${GREEN}Deployment complete.${NC}"
    echo "Access your application at: https://leaflink.garden"
}

deploy_start() {
    print_header "Starting App Services"
    compose up -d backend frontend nginx
    print_success "App services started"
    deploy_status
}

deploy_stop() {
    print_header "Stopping All Services"
    compose down
    print_success "Services stopped"
}

deploy_restart() {
    print_header "Restarting App Services"
    compose restart backend frontend nginx
    print_success "App services restarted"
    deploy_status
}

deploy_logs() {
    echo -e "\n${BLUE}Choose logs:${NC}"
    echo "1) All services"
    echo "2) Backend"
    echo "3) Frontend"
    echo "4) Nginx"
    echo "5) Database"
    echo ""
    read -r -p "Enter choice [1-5]: " log_choice

    case "$log_choice" in
        1) compose logs -f ;;
        2) compose logs -f backend ;;
        3) compose logs -f frontend ;;
        4) compose logs -f nginx ;;
        5) compose logs -f db ;;
        *) print_error "Invalid choice" ;;
    esac
}

deploy_status() {
    print_header "Service Status"
    compose ps
    echo ""
    echo "Leaflink container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep leaflink || true
}

init_database() {
    print_header "Initialize Database Schema"

    print_warning "This applies backend/db_setup.sql to the current database."
    read -r -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Database initialization cancelled"
        return 0
    fi

    compose up -d db
    wait_for_database

    compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/db_setup.sql
    print_success "Database schema initialized"

    echo -e "${BLUE}Tables created:${NC}"
    compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"'
}

backup_database() {
    print_header "Database Backup"

    local backup_file="leaflink_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Backing up database to: $backup_file"

    compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$backup_file"

    local size
    size=$(du -h "$backup_file" | cut -f1)
    print_success "Database backup created (${size}): $backup_file"
}

start_pgadmin() {
    print_header "Start pgAdmin"
    compose --profile tools up -d pgadmin
    print_success "pgAdmin started on 127.0.0.1:5051"
}

stop_pgadmin() {
    print_header "Stop pgAdmin"
    compose stop pgadmin || true
    print_success "pgAdmin stopped"
}

main
