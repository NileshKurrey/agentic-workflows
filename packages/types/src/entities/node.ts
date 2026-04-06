export type NodeType =
  | "TRIGGER"
  | "HTTP"
  | "LOG"
  | "AI"
  | "CONDITIONAL"
  | "FUNCTION";

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

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  input?: unknown;
  policy?: NodeExecutionPolicy;
}