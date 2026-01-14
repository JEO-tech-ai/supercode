import React, { useEffect, useState, useRef } from "react";
import { Box, Text } from "ink";
import Dashboard from "./Dashboard";
import { getSessionManager } from "../../core/session";
import { getTodoManager } from "../../services/agents/todo-manager";
import { getAgentRegistry } from "../../services/agents/registry";
import { getBackgroundManager } from "../../services/agents/background";
import type { Session, Todo } from "../../core/types";
import type { AgentName } from "../../services/agents/types";
import logger from "../../shared/logger";

interface AgentStatus {
  name: AgentName;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

const LiveDashboard: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const updateDashboard = () => {
    const sessionManager = getSessionManager();
    const currentSession = sessionManager.getCurrent();
    
    if (currentSession) {
      setSession({
        id: currentSession.id,
        workdir: currentSession.workdir,
        model: currentSession.model,
        messages: currentSession.messages || [],
        startedAt: currentSession.startedAt,
        mode: currentSession.mode,
        loop: currentSession.loop,
      });
    }

    const todoManager = getTodoManager();
    setTodos(todoManager.list());

    const registry = getAgentRegistry();
    const backgroundManager = getBackgroundManager();
    const tasks = backgroundManager.listTasks(currentSession?.id);
    
    const agentNames = registry.listNames();
    const agentStatuses: AgentStatus[] = agentNames.map(name => {
        const activeTask = tasks.find(t => t.agent === name && t.status === 'in_progress');
        const failedTask = tasks.find(t => t.agent === name && t.status === 'failed');
        const completedTask = tasks.find(t => t.agent === name && t.status === 'completed');
        
        let status: AgentStatus['status'] = 'idle';
        if (activeTask) status = 'running';
        else if (failedTask) status = 'failed';
        else if (completedTask) status = 'completed';
        
        return {
          name,
          status
        };
      });
      
      setAgents(agentStatuses);
      
      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] Dashboard updated`;
      setLogs(prev => [...prev.slice(-9), newLog]);
    };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  useEffect(() => {
    updateDashboard();
    const timer = setInterval(updateDashboard, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKey = (key: string) => {
      if (key === 'q' || key === 'escape') {
        process.exit(0);
      }
      if (key === 'p' || key === ' ') {
        togglePause();
      }
    };

    process.stdin.on('data', (data: Buffer) => {
      const key = data.toString();
      handleKey(key);
    });
  }, []);

  if (!session) {
    return (
      <Box flexDirection="column">
        <Text>No active session. Run a prompt first to see dashboard.</Text>
      </Box>
    );
  }

  const isULW = session.mode === 'ultrawork';
  const accentColor = isULW ? 'yellow' : 'blue';

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text color={accentColor} bold>🪙 SuperCoin Dashboard</Text>
          <Text dimColor> | </Text>
          <Text color={isULW ? 'yellow' : 'cyan'}>{isULW ? 'ULTRAWORK' : 'NORMAL'}</Text>
        </Box>
        <Box>
          <Text dimColor>Session: </Text>
          <Text>{session.id.slice(0, 8)}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" marginTop={1}>
        <Text dimColor>Dir: </Text>
        <Text italic>{session.workdir}</Text>
        <Text dimColor> | Model: </Text>
        <Text color="magenta">{session.model}</Text>
        {session.loop && (
          <>
            <Text dimColor> | Iter: </Text>
            <Text color="green">{session.loop.iteration}/{session.loop.maxIterations}</Text>
          </>
        )}
        <Text dimColor> | Press P to pause, Q to quit</Text>
      </Box>

      <Box flexDirection="row">
        <Box flexDirection="column" width="60%">
          <Text bold underline>Tasks</Text>
          {todos.length === 0 ? (
            <Text dimColor>No tasks yet.</Text>
          ) : (
            todos.map((todo) => (
              <Box key={todo.id}>
                <Text color={getStatusColor(todo.status)}>
                  {getStatusIcon(todo.status)}
                </Text>
                <Text> {todo.content}</Text>
              </Box>
            ))
          )}
        </Box>

        <Box flexDirection="column" width="40%" paddingLeft={2}>
          <Text bold underline>Agents</Text>
          {agents.map((agent) => (
            <Box key={agent.name}>
              <Text color={agent.status === 'running' ? 'green' : 'dimColor'}>
                ●
              </Text>
              <Text> {agent.name}</Text>
              <Text dimColor> ({agent.status})</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box flexDirection="row" marginTop={1}>
        <Text bold underline>System Logs</Text>
        <Text dimColor> | Status: {isPaused ? 'PAUSED' : 'RUNNING'}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="dimColor" paddingX={1} marginTop={1}>
        <Text dimColor bold>Logs (last 10)</Text>
        {logs.length === 0 ? (
          <Text dimColor>No logs yet.</Text>
        ) : (
          logs.map((log, i) => (
            <Text key={i} dimColor>
              {log}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
};

function getStatusColor(status: Todo['status']): string {
  switch (status) {
    case 'completed': return 'green';
    case 'in_progress': return 'blue';
    case 'failed': return 'red';
    case 'cancelled': return 'dimColor';
    default: return 'white';
  }
}

function getStatusIcon(status: Todo['status']): string {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '⏳';
    case 'failed': return '❌';
    case 'cancelled': return '🚫';
    default: return '○';
  }
}

export default LiveDashboard;
