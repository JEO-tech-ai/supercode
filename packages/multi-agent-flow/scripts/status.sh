#!/bin/bash
# Multi-Agent Port Communication System - Status Check
# Usage: ./status.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_DIR/.pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Multi-Agent System Status${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to check agent status
check_agent() {
    local name=$1
    local port=$2

    local status="${RED}●${NC}"
    local pid="N/A"
    local health="${RED}unhealthy${NC}"

    # Check PID
    if [ -f "$PID_DIR/${name}.pid" ]; then
        pid=$(cat "$PID_DIR/${name}.pid")
        if kill -0 "$pid" 2>/dev/null; then
            status="${GREEN}●${NC}"
        fi
    fi

    # Check health endpoint
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        health="${GREEN}healthy${NC}"
    fi

    printf "  $status %-15s Port: %-5s PID: %-8s Health: %s\n" "$name" "$port" "$pid" "$health"
}

echo -e "${BLUE}Agent Status:${NC}"
echo ""
check_agent "orchestrator" 8000
check_agent "writer" 8001
check_agent "reviewer" 8002
check_agent "tester" 8003
check_agent "analyzer" 8004

echo ""
echo -e "${BLUE}========================================${NC}"

# Check all agents health via orchestrator
echo -e "\n${BLUE}Full Health Check via Orchestrator:${NC}"
curl -s http://localhost:8000/api/orchestrator/health_all 2>/dev/null | python3 -m json.tool 2>/dev/null || echo -e "${RED}Orchestrator not available${NC}"
