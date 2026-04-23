#!/bin/bash
# Deploy script for Leaflink on DigitalOcean
# Run this on your droplet after cloning the repository

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}\n"
}

print_error() {
    echo -e "${RED}✗ $1${NC}\n"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}\n"
}

# Main deployment logic
main() {
    print_header "Leaflink Deployment Script"

    # Check if running on Linux
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux. You're on: $OSTYPE"
        exit 1
    fi

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        echo -e "Please create .env file first. Use .env.example as template:\n"
        echo "  cp .env.example .env"
        echo "  nano .env  # Edit with your values"
        exit 1
    fi
    print_success ".env file found"

    # Check if required directories exist
    if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "nginx" ]; then
        print_error "Required directories not found. Are you in the leaflink root directory?"
        exit 1
    fi
    print_success "Project structure verified"

    # Menu
    echo "What would you like to do?"
    echo "1) Full deployment (build + start + init DB)"
    echo "2) Start services only"
    echo "3) Stop services"
    echo "4) Restart services"
    echo "5) View logs"
    echo "6) Check service status"
    echo "7) Initialize database"
    echo "8) Backup database"
    echo ""
    read -p "Enter choice [1-8]: " choice

    case $choice in
        1)
            deploy_full
            ;;
        2)
            deploy_start
            ;;
        3)
            deploy_stop
            ;;
        4)
            deploy_restart
            ;;
        5)
            deploy_logs
            ;;
        6)
            deploy_status
            ;;
        7)
            init_database
            ;;
        8)
            backup_database
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

deploy_full() {
    print_header "Full Deployment"

    print_header "Step 1: Building Docker images"
    docker-compose build
    print_success "Images built"

    print_header "Step 2: Starting services"
    docker-compose up -d
    print_success "Services started"

    print_header "Step 3: Waiting for database to be ready"
    sleep 5
    for i in {1..30}; do
        if docker-compose exec -T db pg_isready -U $(grep DB_USER .env | cut -d= -f2) > /dev/null 2>&1; then
            print_success "Database is ready"
            break
        fi
        echo -n "."
        sleep 1
        if [ $i -eq 30 ]; then
            print_error "Database failed to start within 30 seconds"
            exit 1
        fi
    done

    print_header "Step 4: Initializing database"
    init_database

    print_header "Step 5: Checking service health"
    deploy_status

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}\n"
    echo "Access your application at:"
    echo -e "  ${BLUE}https://leaflink.garden${NC}\n"
    echo "To view logs:"
    echo -e "  ${BLUE}docker-compose logs -f${NC}\n"
}

deploy_start() {
    print_header "Starting Services"
    docker-compose up -d
    print_success "Services started"
    sleep 2
    deploy_status
}

deploy_stop() {
    print_header "Stopping Services"
    docker-compose down
    print_success "Services stopped"
}

deploy_restart() {
    print_header "Restarting Services"
    docker-compose restart
    print_success "Services restarted"
    sleep 2
    deploy_status
}

deploy_logs() {
    echo -e "\n${BLUE}Choose which logs to view:${NC}"
    echo "1) All services"
    echo "2) Backend only"
    echo "3) Frontend only"
    echo "4) Nginx only"
    echo "5) Database only"
    echo ""
    read -p "Enter choice [1-5]: " log_choice

    case $log_choice in
        1)
            docker-compose logs -f
            ;;
        2)
            docker-compose logs -f backend
            ;;
        3)
            docker-compose logs -f frontend
            ;;
        4)
            docker-compose logs -f nginx
            ;;
        5)
            docker-compose logs -f db
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

deploy_status() {
    print_header "Service Status"
    docker-compose ps
    echo ""
    echo "Container health:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep leaflink
}

init_database() {
    print_header "Initializing Database Schema"

    # Load environment variables
    source .env

    print_warning "This will reset the database schema if it already exists"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_warning "Database initialization cancelled"
        return
    fi

    # Run the schema setup script
    docker-compose exec -T db psql -U $DB_USER -d $DB_NAME < backend/db_setup.sql

    print_success "Database schema initialized"

    # Verify tables were created
    echo -e "${BLUE}Tables created:${NC}"
    docker-compose exec db psql -U $DB_USER -d $DB_NAME -c "\dt"
}

backup_database() {
    print_header "Database Backup"

    source .env

    BACKUP_FILE="leaflink_backup_$(date +%Y%m%d_%H%M%S).sql"

    echo "Backing up database to: $BACKUP_FILE"

    docker-compose exec -T db pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        print_success "Database backed up ($SIZE): $BACKUP_FILE"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

# Run main function
main
