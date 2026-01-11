import React, { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import { getSessionManager } from "../../core/session/manager";
import { getTodoManager } from "../../services/agents/todo-manager";
import { getAgentRegistry } from "../../services/agents/registry";
import { getBackgroundManager } from "../../services/agents/background";
import type { Session, Todo } from "../../core/types";
import type { AgentName } from "../../services/agents/types";

interface AgentStatus {
  name: AgentName;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export const LiveDashboard: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const update = () => {
      const sessionManager = getSessionManager();
      const currentSession = sessionManager.getCurrent();
      
      if (currentSession) {
        setSession({
            id: currentSession.sessionId,
            workdir: currentSession.context.workdir,
            model: currentSession.context.model,
            messages: [],
            startedAt: currentSession.createdAt,
            mode: currentSession.mode as "normal" | "ultrawork" | undefined,
            loop: currentSession.loop ? {
                iteration: currentSession.loop.iteration,
                maxIterations: currentSession.loop.maxIterations,
                stagnantCount: currentSession.loop.stagnantCount,
                lastPendingHash: currentSession.loop.lastPendingHash,
            } : undefined,
        });
      }

      const todoManager = getTodoManager();
      setTodos(todoManager.list());

      const registry = getAgentRegistry();
      const backgroundManager = getBackgroundManager();
      const tasks = backgroundManager.listTasks(currentSession?.sessionId);
      
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
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!session) {
    return null;
  }

  return <Dashboard session={session} todos={todos} agents={agents} logs={logs} />;
};
