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
