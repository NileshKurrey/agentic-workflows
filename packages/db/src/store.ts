import type { Database } from "./client";
import { UserStore } from "./stores/user-store";
import { WorkflowStore as WorkflowStoreImpl } from "./stores/workflow-store";
import { ExecutionStore } from "./stores/execution-store";
import type { CreateUserInput } from "./stores/user-store";
import type { CreateWorkflowInput } from "./stores/workflow-store";
import type { QueueExecutionInput } from "./stores/execution-store";
import type { NodeExecutedEvent, Workflow, WorkflowExecutionResult } from "@repo/types";

/**
 * Unified repository that delegates to individual stores
 * Maintains backward compatibility while organizing concerns
 */
export class Store {
  private readonly userStore: UserStore;
  private readonly workflowStore: WorkflowStoreImpl;
  private readonly executionStore: ExecutionStore;

  constructor(db: Database) {
    this.userStore = new UserStore(db);
    this.workflowStore = new WorkflowStoreImpl(db);
    this.executionStore = new ExecutionStore(db);
  }

  // User operations
  async createUser(input: CreateUserInput) {
    return this.userStore.createUser(input);
  }

  async updateUser(userId: string, input: Partial<{ email: string; name: string; isAdmin: boolean }>) {
    return this.userStore.updateUser(userId, input);
  }

  async getUserByEmail(email: string) {
    return this.userStore.getUserByEmail(email);
  }

  // Workflow operations
  async createWorkflow(input: CreateWorkflowInput) {
    return this.workflowStore.createWorkflow(input);
  }

  async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    return this.workflowStore.getWorkflowById(workflowId);
  }

  // Execution operations
  async queueExecution(input: QueueExecutionInput) {
    return this.executionStore.queueExecution(input);
  }

  async markExecutionRunning(runId: string) {
    return this.executionStore.markExecutionRunning(runId);
  }

  async saveNodeEvent(runId: string, event: NodeExecutedEvent) {
    return this.executionStore.saveNodeEvent(runId, event);
  }

  async completeExecution(runId: string, result: WorkflowExecutionResult) {
    return this.executionStore.completeExecution(runId, result);
  }

  async getExecutionByRunId(runId: string) {
    return this.executionStore.getExecutionByRunId(runId);
  }

  async getNodeResultForExecution(runId: string, nodeId: string) {
    return this.executionStore.getNodeResultForExecution(runId, nodeId);
  }
}
