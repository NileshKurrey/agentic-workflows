// Node Types
export type NodeType =
  | "TRIGGER"
  | "HTTP"
  | "LOG"
  | "AI"
  | "CONDITIONAL"
  | "FUNCTION"

// Workflow Status
export type WorkflowRunStatus =
  | "PENDING"
  | "RUNNING"
  | "FAILED"
  | "COMPLETED"

// Node Configurations
export interface HttpNodeConfig {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface LogNodeConfig {
  level?: "debug" | "info" | "warn" | "error";
  prefix?: string;
}

export interface TriggerNodeConfig {
  triggerType?: "manual" | "scheduled" | "webhook";
  schedule?: string;
}

export interface NodeExecutionPolicy {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  continueOnError?: boolean;
}

export type NodeConfig = HttpNodeConfig | LogNodeConfig | TriggerNodeConfig | Record<string, unknown>;

// Workflow Node
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  input?: unknown;
  policy?: NodeExecutionPolicy;
}

// Workflow Edge
export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

// Workflow
export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowRunStatus;
}

// Execution Types
export interface ExecutionContext {
  [nodeId: string]: ExecutionResult;
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface FailedNode {
  nodeId: string;
  nodeType: NodeType;
  error: string;
}

// Node Execution Events
export interface NodeExecutedEvent {
  workflowId: string;
  nodeId: string;
  nodeType: NodeType;
  success: boolean;
  attempts: number;
  duration: number;
  error?: string;
  timestamp: string;
}

export interface WorkflowCompletedEvent {
  workflowId: string;
  status: WorkflowRunStatus;
  failedNodes: FailedNode[];
  duration: number;
  error?: string;
  timestamp: string;
}

export type NodeExecutionEventCallback = (event: NodeExecutedEvent) => Promise<void>;
export type WorkflowCompletedEventCallback = (event: WorkflowCompletedEvent) => Promise<void>;

export interface WorkflowRunOptions {
  continueOnError?: boolean;
  defaultNodePolicy?: NodeExecutionPolicy;
  onNodeExecuted?: NodeExecutionEventCallback;
  onWorkflowCompleted?: WorkflowCompletedEventCallback;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: WorkflowRunStatus;
  context: ExecutionContext;
  failedNodes: FailedNode[];
  startTime: string;
  endTime: string;
  duration: number;
  error?: string;
}


