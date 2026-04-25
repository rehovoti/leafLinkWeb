#!/bin/bash
# Production Status & Health Check Script for Leaflink

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/leaflink/health_check.log"

if ! mkdir -p /var/log/leaflink 2>/dev/null; then
    LOG_FILE="$SCRIPT_DIR/health_check.log"
fi

COMPOSE_CMD=()

detect_compose() {
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD=(docker compose)
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD=(docker-compose)
    else
        echo "Docker Compose is not available"
        exit 1
    fi
}

compose() {
    "${COMPOSE_CMD[@]}" "$@"
}

log_check() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }

check_container_status() {
    local container=$1
    if docker inspect "$container" >/dev/null 2>&1; then
        if [ "$(docker inspect -f '{{.State.Running}}' "$container")" = "true" ]; then
            print_success "$container is running"
            log_check "SUCCESS: $container is running"
            return 0
        fi
        print_error "$container is stopped"
        log_check "ERROR: $container is stopped"
        return 1
    fi

    print_warning "$container not found (may be intentionally disabled)"
    log_check "WARNING: $container not found"
    return 0
}

check_http_endpoint() {
    local url=$1
    local expected=$2
    local name=$3

    local code
    code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$code" = "$expected" ]; then
        print_success "$name responded with $code"
        log_check "SUCCESS: $name responded with $code"
        return 0
    fi

    print_error "$name returned $code (expected $expected)"
    log_check "ERROR: $name returned $code (expected $expected)"
    return 1
}

check_disk_space() {
    print_header "Disk Space Usage"

    local root_usage
    root_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "Root filesystem: ${root_usage}% used"

    if [ "$root_usage" -gt 90 ]; then
        print_error "Disk usage critical (${root_usage}%)"
        log_check "ERROR: Disk usage critical (${root_usage}%)"
        return 1
    elif [ "$root_usage" -gt 80 ]; then
        print_warning "Disk usage high (${root_usage}%)"
        log_check "WARNING: Disk usage high (${root_usage}%)"
        return 0
    fi

    print_success "Disk usage normal (${root_usage}%)"
    log_check "SUCCESS: Disk usage normal (${root_usage}%)"
    return 0
}

check_docker_resources() {
    print_header "Docker Resource Usage"

    docker system df | sed -n '1,6p'
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep leaflink || true
    log_check "INFO: Collected Docker resource stats"
}

check_database_health() {
    print_header "Database Health"

    if compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER"' >/dev/null 2>&1; then
        print_success "Database is responding"
        log_check "SUCCESS: Database is responding"

        local db_size
        db_size=$(compose exec -T db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "SELECT pg_size_pretty(pg_database_size(current_database()));"' 2>/dev/null | tail -1)
        echo "Database size: $db_size"
        log_check "INFO: Database size: $db_size"
        return 0
    fi

    print_error "Database is not responding"
    log_check "ERROR: Database is not responding"
    return 1
}

check_ssl_certificate() {
    print_header "SSL Certificate Status"

    local cert_file="/etc/letsencrypt/live/leaflink.garden/cert.pem"
    if [ ! -f "$cert_file" ]; then
        print_error "Certificate file not found"
        log_check "ERROR: Certificate file not found"
        return 1
    fi

    local expiry expiry_date now days_left
    expiry=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    expiry_date=$(date -d "$expiry" +%s 2>/dev/null || date -jf "%b %d %T %Z %Y" "$expiry" +%s)
    now=$(date +%s)
    days_left=$(( (expiry_date - now) / 86400 ))

    echo "Certificate valid until: $expiry"
    echo "Days remaining: $days_left"

    if [ "$days_left" -lt 7 ]; then
        print_error "SSL certificate expires in $days_left days"
        log_check "ERROR: SSL certificate expires in $days_left days"
        return 1
    elif [ "$days_left" -lt 30 ]; then
        print_warning "SSL certificate expires in $days_left days"
        log_check "WARNING: SSL certificate expires in $days_left days"
        return 0
    fi

    print_success "SSL certificate valid for $days_left days"
    log_check "SUCCESS: SSL certificate valid for $days_left days"
    return 0
}

main() {
    detect_compose
    print_header "Leaflink Production Health Check - $TIMESTAMP"

    local overall_status=0

    print_header "Container Status"
    check_container_status "leaflink_db" || overall_status=1
    check_container_status "leaflink_backend" || overall_status=1
    check_container_status "leaflink_frontend" || overall_status=1
    check_container_status "leaflink_nginx" || overall_status=1

    print_header "HTTP Endpoints"
    check_http_endpoint "http://127.0.0.1:8081" "200" "Local Nginx proxy" || overall_status=1
    check_http_endpoint "https://leaflink.garden" "200" "Production URL" || overall_status=1

    check_database_health || overall_status=1
    check_ssl_certificate || overall_status=1
    check_disk_space || overall_status=1
    check_docker_resources

    print_header "Health Check Summary"
    if [ "$overall_status" = "0" ]; then
        print_success "All critical checks passed"
        log_check "SUMMARY: All critical checks passed"
    else
        print_error "One or more critical checks failed"
        log_check "SUMMARY: One or more critical checks failed"
    fi

    echo ""
    echo "Full log: $LOG_FILE"
    echo ""

    return "$overall_status"
}

main
