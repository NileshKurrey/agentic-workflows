export { createDatabase, createDatabaseClient, type Database, type DatabaseClient } from "./client";

// Main store export (replaces WorkflowStore)
export { Store } from "./store";
// Backward compatibility alias
export { Store as WorkflowStore } from "./store";

// Individual stores (new modular approach)
export { UserStore } from "./stores/user-store";
export { WorkflowStore as WorkflowRepository } from "./stores/workflow-store";
export { ExecutionStore } from "./stores/execution-store";

export {
  schema,
  users,
  usersRelations,
  nodes,
  nodesRelations,
  workflows,
  workflowsRelations,
  workflowExecutions,
  workflowExecutionsRelations,
  nodeResults,
  nodeResultsRelations,
} from "./schema";