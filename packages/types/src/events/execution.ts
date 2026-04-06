import type { FailedNode } from "../entities/execution";
import type { NodeType, NodeExecutionPolicy } from "../entities/node";
import type { WorkflowRunStatus } from "../entities/workflow";

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