export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class NodeExecutionError extends WorkflowError {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly nodeType: string,
    context?: Record<string, unknown>
  ) {
    super(message, "NODE_EXECUTION_ERROR", { nodeId, nodeType, ...context });
    this.name = "NodeExecutionError";
  }
}

export class NodeNotFoundError extends WorkflowError {
  constructor(nodeType: string) {
    super(`Unsupported node type: ${nodeType}`, "NODE_NOT_FOUND", { nodeType });
    this.name = "NodeNotFoundError";
  }
}

export class WorkflowValidationError extends WorkflowError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "WORKFLOW_VALIDATION_ERROR", context);
    this.name = "WorkflowValidationError";
  }
}

export class HttpNodeError extends NodeExecutionError {
  constructor(
    message: string,
    nodeId: string,
    public readonly statusCode?: number,
    public readonly url?: string
  ) {
    super(message, nodeId, "HTTP", { statusCode, url });
    this.name = "HttpNodeError";
  }
}
