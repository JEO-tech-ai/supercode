import React from 'react';
import { Box, Text, Newline } from 'ink';
import type { Session, Todo } from '../../core/types';
import type { AgentName, TaskStatus } from '../../services/agents/types';

interface AgentStatus {
  name: AgentName;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

interface DashboardProps {
  session: Session;
  todos: Todo[];
  agents: AgentStatus[];
  logs: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ session, todos, agents, logs }) => {
  const isULW = session.mode === 'ultrawork';
  const accentColor = isULW ? 'yellow' : 'blue';

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor={accentColor}>
      <Box justifyContent="space-between">
        <Box>
          <Text color={accentColor} bold>🪙 SuperCoin Dashboard</Text>
          <Text dimColor> | </Text>
          <Text color={isULW ? 'yellow' : 'cyan'}>{isULW ? 'ULTRAWORK MODE' : 'NORMAL MODE'}</Text>
        </Box>
        <Box>
          <Text dimColor>Session: </Text>
          <Text>{session.id.slice(0, 8)}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
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
      </Box>

      <Newline />

      <Box>
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

      <Newline />

      <Box flexDirection="column" borderStyle="single" borderColor="dimColor" paddingX={1}>
        <Text dimColor bold>System Logs</Text>
        {logs.slice(-5).map((log, i) => (
          <Text key={i} dimColor wrap="truncate-end">
            {log}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'completed': return 'green';
    case 'in_progress': return 'blue';
    case 'failed': return 'red';
    case 'cancelled': return 'dimColor';
    default: return 'white';
  }
}

function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '⏳';
    case 'failed': return '❌';
    case 'cancelled': return '🚫';
    default: return '○';
  }
}

export default Dashboard;
