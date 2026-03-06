export type NodeType =
  | "TRIGGER_MANUAL"
  | "API"
  | "AI"
  | "CONDITIONAL"

export type WorkflowRunStatus =
  | "PENDING"
  | "RUNNING"
  | "FAILED"
  | "COMPLETED"

export interface WorkflowNode{
  id: string
  type: NodeType
  name: string
  config: any
}

export interface Workflow{
  id: string
  name: string
  nodes: WorkflowNode[]
  status: WorkflowRunStatus
}

export interface executionContext {
  workflowId: string
  nodeId: string
  input: any
  config: any
}
