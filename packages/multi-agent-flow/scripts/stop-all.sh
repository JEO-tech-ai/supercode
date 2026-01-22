#!/bin/bash
# Multi-Agent Port Communication System - Shutdown Script
# Usage: ./stop-all.sh

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
echo -e "${BLUE}  Stopping Multi-Agent System${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to stop an agent
stop_agent() {
    local name=$1

    if [ -f "$PID_DIR/${name}.pid" ]; then
        local pid=$(cat "$PID_DIR/${name}.pid")

        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill -SIGTERM "$pid" 2>/dev/null

            # Wait for graceful shutdown
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 0.5
                count=$((count + 1))
            done

            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}Force killing $name...${NC}"
                kill -9 "$pid" 2>/dev/null
            fi

            echo -e "${GREEN}✓ $name stopped${NC}"
        else
            echo -e "${YELLOW}$name is not running${NC}"
        fi

        rm -f "$PID_DIR/${name}.pid"
    else
        echo -e "${YELLOW}No PID file for $name${NC}"
    fi
}

# Stop all agents in reverse order
stop_agent "analyzer"
stop_agent "tester"
stop_agent "reviewer"
stop_agent "writer"
stop_agent "orchestrator"

# Clean up PID directory
rm -rf "$PID_DIR"

echo -e "\n${GREEN}All agents stopped.${NC}"
