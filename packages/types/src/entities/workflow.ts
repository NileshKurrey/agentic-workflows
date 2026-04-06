import type { WorkflowNode } from "./node";

export type WorkflowRunStatus = "PENDING" | "RUNNING" | "FAILED" | "COMPLETED";

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowRunStatus;
}