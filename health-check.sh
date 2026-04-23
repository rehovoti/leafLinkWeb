#!/bin/bash
# Production Status & Health Check Script for Leaflink
# Run periodically to monitor system health

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/leaflink/health_check.log"

# Ensure log directory exists
mkdir -p /var/log/leaflink

# Functions
log_check() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_container_status() {
    local container=$1
    if docker inspect "$container" > /dev/null 2>&1; then
        if [ "$(docker inspect -f '{{.State.Running}}' "$container")" = "true" ]; then
            print_success "$container is running"
            log_check "SUCCESS: $container is running"
            return 0
        else
            print_error "$container is stopped"
            log_check "ERROR: $container is stopped"
            return 1
        fi
    else
        print_error "$container does not exist"
        log_check "ERROR: $container does not exist"
        return 1
    fi
}

check_http_endpoint() {
    local url=$1
    local expected_code=$2
    local name=$3

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ]; then
        print_success "$name responded with $response"
        log_check "SUCCESS: $name responded with $response"
        return 0
    else
        print_error "$name returned $response (expected $expected_code)"
        log_check "ERROR: $name returned $response (expected $expected_code)"
        return 1
    fi
}

check_disk_space() {
    print_header "Disk Space Usage"
    
    # Check root filesystem
    local root_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo "Root filesystem: ${root_usage}% used"
    
    if [ "$root_usage" -gt 90 ]; then
        print_error "Disk usage critical (${root_usage}%)"
        log_check "ERROR: Disk usage critical (${root_usage}%)"
        return 1
    elif [ "$root_usage" -gt 80 ]; then
        print_warning "Disk usage high (${root_usage}%)"
        log_check "WARNING: Disk usage high (${root_usage}%)"
        return 2
    else
        print_success "Disk usage normal (${root_usage}%)"
        log_check "SUCCESS: Disk usage normal (${root_usage}%)"
        return 0
    fi
}

check_docker_resources() {
    print_header "Docker Resource Usage"
    
    # Check Docker disk usage
    local docker_usage=$(docker system df | tail -1 | awk '{print $4}' | sed 's/[^0-9]*//g')
    echo "Docker disk usage: $docker_usage MB"
    log_check "INFO: Docker disk usage: $docker_usage MB"
    
    # Show container stats
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep leaflink
}

check_database_health() {
    print_header "Database Health"
    
    source .env 2>/dev/null || { print_error "Could not source .env"; return 1; }
    
    # Check if database is responding
    if docker-compose exec -T db pg_isready -U $DB_USER > /dev/null 2>&1; then
        print_success "Database is responding"
        log_check "SUCCESS: Database is responding"
        
        # Check database size
        local db_size=$(docker-compose exec -T db psql -U $DB_USER -d $DB_NAME -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tail -1)
        echo "Database size: $db_size"
        log_check "INFO: Database size: $db_size"
        
        return 0
    else
        print_error "Database is not responding"
        log_check "ERROR: Database is not responding"
        return 1
    fi
}

check_ssl_certificate() {
    print_header "SSL Certificate Status"
    
    CERT_FILE="/etc/letsencrypt/live/leaflink.garden/cert.pem"
    
    if [ -f "$CERT_FILE" ]; then
        # Get expiration date
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
        EXPIRY_DATE=$(date -d "$EXPIRY" +%s 2>/dev/null || date -jf "%b %d %T %Z %Y" "$EXPIRY" +%s)
        NOW=$(date +%s)
        DAYS_LEFT=$(( ($EXPIRY_DATE - $NOW) / 86400 ))
        
        echo "Certificate valid until: $EXPIRY"
        echo "Days remaining: $DAYS_LEFT"
        
        if [ "$DAYS_LEFT" -lt 7 ]; then
            print_error "SSL certificate expires in $DAYS_LEFT days!"
            log_check "ERROR: SSL certificate expires in $DAYS_LEFT days"
            return 1
        elif [ "$DAYS_LEFT" -lt 30 ]; then
            print_warning "SSL certificate expires in $DAYS_LEFT days"
            log_check "WARNING: SSL certificate expires in $DAYS_LEFT days"
            return 2
        else
            print_success "SSL certificate valid for $DAYS_LEFT days"
            log_check "SUCCESS: SSL certificate valid for $DAYS_LEFT days"
            return 0
        fi
    else
        print_error "Certificate file not found"
        log_check "ERROR: Certificate file not found"
        return 1
    fi
}

main() {
    print_header "Leaflink Production Health Check - $TIMESTAMP"
    
    local overall_status=0
    
    # Check containers
    print_header "Container Status"
    check_container_status "leaflink_db" || overall_status=1
    check_container_status "leaflink_backend" || overall_status=1
    check_container_status "leaflink_frontend" || overall_status=1
    check_container_status "leaflink_nginx" || overall_status=1
    
    # Check HTTP endpoints
    print_header "HTTP Endpoints"
    check_http_endpoint "http://localhost:8081" "200" "Local Nginx proxy" || overall_status=1
    check_http_endpoint "https://leaflink.garden" "200" "Production URL" || overall_status=1
    
    # Check database
    check_database_health || overall_status=1
    
    # Check SSL certificate
    check_ssl_certificate || overall_status=1
    
    # Check disk space
    check_disk_space || overall_status=1
    
    # Check Docker resources
    check_docker_resources
    
    # Summary
    print_header "Health Check Summary"
    
    if [ "$overall_status" = "0" ]; then
        print_success "All systems operational"
        log_check "SUMMARY: All systems operational"
    else
        print_error "Some issues detected - review above"
        log_check "SUMMARY: Some issues detected"
    fi
    
    echo ""
    echo "Full log: $LOG_FILE"
    echo ""
    
    return $overall_status
}

# Run main function
main
