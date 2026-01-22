"""
Workflow Graph - DAG representation for parallel execution
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Set, Optional


class StepStatus(str, Enum):
    """Status of a step in the workflow graph"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class GraphNode:
    """A node in the workflow DAG"""
    name: str
    dependencies: List[str] = field(default_factory=list)
    status: StepStatus = StepStatus.PENDING
    agent: str = ""
    config: Dict = field(default_factory=dict)


class WorkflowGraph:
    """
    Directed Acyclic Graph (DAG) for workflow steps.

    Supports:
    - Dependency resolution
    - Parallel step identification
    - Topological ordering
    - Cycle detection
    """

    def __init__(self, workflow_config: Dict = None):
        """
        Initialize the workflow graph.

        Args:
            workflow_config: Configuration dict with 'steps' key
                Example:
                {
                    "steps": {
                        "Planner": {"dependencies": [], "agent": "opencode"},
                        "Writer": {"dependencies": ["Planner"], "agent": "codex"},
                        "Reviewer": {"dependencies": ["Writer"], "agent": "claude"},
                        "Tester": {"dependencies": ["Reviewer"], "agent": "codex"},
                        "Analyzer": {"dependencies": ["Tester"], "agent": "gemini"},
                    }
                }
        """
        self._nodes: Dict[str, GraphNode] = {}
        self._adjacency: Dict[str, Set[str]] = {}  # node -> dependents
        self._reverse_adjacency: Dict[str, Set[str]] = {}  # node -> dependencies

        if workflow_config:
            self._build_from_config(workflow_config)

    def _build_from_config(self, config: Dict):
        """Build graph from configuration"""
        steps = config.get("steps", {})

        for step_name, step_config in steps.items():
            dependencies = step_config.get("dependencies", [])
            agent = step_config.get("agent", "")

            self.add_node(step_name, dependencies, agent, step_config)

    def add_node(
        self,
        name: str,
        dependencies: List[str] = None,
        agent: str = "",
        config: Dict = None,
    ):
        """
        Add a node to the graph.

        Args:
            name: Step name
            dependencies: List of step names this depends on
            agent: Agent to execute this step
            config: Additional configuration
        """
        dependencies = dependencies or []

        self._nodes[name] = GraphNode(
            name=name,
            dependencies=dependencies,
            agent=agent,
            config=config or {},
        )

        # Initialize adjacency lists
        if name not in self._adjacency:
            self._adjacency[name] = set()
        if name not in self._reverse_adjacency:
            self._reverse_adjacency[name] = set()

        # Add edges
        for dep in dependencies:
            if dep not in self._adjacency:
                self._adjacency[dep] = set()
            self._adjacency[dep].add(name)
            self._reverse_adjacency[name].add(dep)

    def get_node(self, name: str) -> Optional[GraphNode]:
        """Get a node by name"""
        return self._nodes.get(name)

    def get_initial_steps(self) -> List[str]:
        """
        Get steps with no dependencies (entry points).

        Returns:
            List of step names that can start immediately
        """
        return [
            name for name, deps in self._reverse_adjacency.items()
            if not deps
        ]

    def get_ready_steps(self, completed: Set[str]) -> List[str]:
        """
        Get steps that are ready to execute.

        A step is ready if all its dependencies are completed.

        Args:
            completed: Set of completed step names

        Returns:
            List of step names ready to execute
        """
        ready = []
        for name, node in self._nodes.items():
            if node.status != StepStatus.PENDING:
                continue
            if all(dep in completed for dep in node.dependencies):
                ready.append(name)
        return ready

    def get_downstream_steps(self, step_name: str) -> List[str]:
        """
        Get steps that depend on the given step.

        Args:
            step_name: The step to check

        Returns:
            List of dependent step names
        """
        return list(self._adjacency.get(step_name, set()))

    def get_upstream_steps(self, step_name: str) -> List[str]:
        """
        Get steps that the given step depends on.

        Args:
            step_name: The step to check

        Returns:
            List of dependency step names
        """
        return list(self._reverse_adjacency.get(step_name, set()))

    def topological_sort(self) -> List[str]:
        """
        Get steps in topological order.

        Returns:
            List of step names in execution order

        Raises:
            ValueError: If graph has a cycle
        """
        # Kahn's algorithm
        in_degree = {name: len(deps) for name, deps in self._reverse_adjacency.items()}
        queue = [name for name, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)

            for dependent in self._adjacency.get(node, set()):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        if len(result) != len(self._nodes):
            raise ValueError("Workflow graph contains a cycle")

        return result

    def has_cycle(self) -> bool:
        """Check if the graph has any cycles"""
        try:
            self.topological_sort()
            return False
        except ValueError:
            return True

    def mark_completed(self, step_name: str):
        """Mark a step as completed"""
        if step_name in self._nodes:
            self._nodes[step_name].status = StepStatus.COMPLETED

    def mark_failed(self, step_name: str):
        """Mark a step as failed"""
        if step_name in self._nodes:
            self._nodes[step_name].status = StepStatus.FAILED

    def mark_running(self, step_name: str):
        """Mark a step as running"""
        if step_name in self._nodes:
            self._nodes[step_name].status = StepStatus.RUNNING

    def get_parallel_groups(self) -> List[List[str]]:
        """
        Get steps grouped by parallelization potential.

        Steps in the same group can be executed in parallel.

        Returns:
            List of groups, where each group is a list of step names
        """
        groups = []
        completed = set()
        remaining = set(self._nodes.keys())

        while remaining:
            # Find all steps that can run now
            group = [
                name for name in remaining
                if all(dep in completed for dep in self._nodes[name].dependencies)
            ]

            if not group:
                raise ValueError("Cannot progress - possible cycle")

            groups.append(group)
            completed.update(group)
            remaining -= set(group)

        return groups

    @classmethod
    def default_sequential(cls) -> "WorkflowGraph":
        """Create the default sequential workflow graph"""
        config = {
            "steps": {
                "Planner": {"dependencies": [], "agent": "opencode"},
                "Writer": {"dependencies": ["Planner"], "agent": "codex"},
                "Reviewer": {"dependencies": ["Writer"], "agent": "claude"},
                "Tester": {"dependencies": ["Reviewer"], "agent": "codex"},
                "Analyzer": {"dependencies": ["Tester"], "agent": "gemini"},
            }
        }
        return cls(config)

    @classmethod
    def with_parallel_analysis(cls) -> "WorkflowGraph":
        """
        Create a workflow with parallel analysis steps.

        SecurityAnalyzer and StyleChecker run in parallel after Writer.
        """
        config = {
            "steps": {
                "Planner": {"dependencies": [], "agent": "opencode"},
                "Writer": {"dependencies": ["Planner"], "agent": "codex"},
                "SecurityAnalyzer": {"dependencies": ["Writer"], "agent": "gemini"},
                "StyleChecker": {"dependencies": ["Writer"], "agent": "claude"},
                "Reviewer": {"dependencies": ["SecurityAnalyzer", "StyleChecker"], "agent": "claude"},
                "Tester": {"dependencies": ["Reviewer"], "agent": "codex"},
            }
        }
        return cls(config)

    def to_dict(self) -> Dict:
        """Convert graph to dictionary"""
        return {
            "steps": {
                name: {
                    "dependencies": node.dependencies,
                    "agent": node.agent,
                    "status": node.status.value,
                    "config": node.config,
                }
                for name, node in self._nodes.items()
            }
        }

    def __len__(self) -> int:
        return len(self._nodes)

    def __contains__(self, name: str) -> bool:
        return name in self._nodes
