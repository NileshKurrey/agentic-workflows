import type { NodeType } from "./node";
import type { WorkflowRunStatus } from "./workflow";

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