#!/bin/bash
# Multi-Agent Port Communication System - Startup Script
# Usage: ./start-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_DIR/.pids"
LOG_DIR="$PROJECT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Multi-Agent Port Communication System${NC}"
echo -e "${BLUE}========================================${NC}"

# Create directories
mkdir -p "$PID_DIR" "$LOG_DIR"

# Function to start an agent
start_agent() {
    local name=$1
    local port=$2
    local module=$3

    echo -e "${YELLOW}Starting $name on port $port...${NC}"

    # Check if already running
    if [ -f "$PID_DIR/${name}.pid" ]; then
        local old_pid=$(cat "$PID_DIR/${name}.pid")
        if kill -0 "$old_pid" 2>/dev/null; then
            echo -e "${RED}$name is already running (PID: $old_pid)${NC}"
            return 1
        fi
    fi

    # Start the agent
    cd "$PROJECT_DIR/src"
    PYTHONPATH="$PROJECT_DIR/src" nohup python -m uvicorn "$module:app" \
        --host 0.0.0.0 \
        --port "$port" \
        > "$LOG_DIR/${name}.log" 2>&1 &

    local pid=$!
    echo "$pid" > "$PID_DIR/${name}.pid"

    # Wait for startup
    sleep 1

    # Check if started successfully
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}✓ $name started (PID: $pid, Port: $port)${NC}"
    else
        echo -e "${RED}✗ Failed to start $name${NC}"
        return 1
    fi
}

# Function to check health
check_health() {
    local name=$1
    local port=$2

    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ $name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name health check failed (HTTP: $response)${NC}"
        return 1
    fi
}

# Start all agents
echo -e "\n${BLUE}Starting agents...${NC}\n"

start_agent "orchestrator" 8000 "orchestrator.main"
start_agent "writer" 8001 "agents.writer.main"
start_agent "reviewer" 8002 "agents.reviewer.main"
start_agent "tester" 8003 "agents.tester.main"
start_agent "analyzer" 8004 "agents.analyzer.main"

# Wait for all agents to be ready
echo -e "\n${BLUE}Waiting for agents to be ready...${NC}\n"
sleep 3

# Health checks
echo -e "${BLUE}Running health checks...${NC}\n"

check_health "orchestrator" 8000
check_health "writer" 8001
check_health "reviewer" 8002
check_health "tester" 8003
check_health "analyzer" 8004

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}All agents started successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e ""
echo -e "Orchestrator API: http://localhost:8000/docs"
echo -e "Start workflow:   POST http://localhost:8000/api/orchestrator/start_workflow"
echo -e ""
echo -e "Logs directory:   $LOG_DIR"
echo -e "Stop all agents:  ./scripts/stop-all.sh"
