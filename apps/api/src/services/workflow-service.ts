import type { Workflow, WorkflowEdge, WorkflowNode, WorkflowRunStatus } from "@repo/types";
import type { Container } from "../di/core/container";
import type { WorkflowStore } from "@repo/db";

export interface CreateWorkflowRequest {
  userId: string;
  name: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
  status?: WorkflowRunStatus;
}

export class WorkflowService {
  private readonly workflowStore: WorkflowStore;

  constructor(container: Container) {
    this.workflowStore = container.get<WorkflowStore>("workflowStore");
  }

  async createWorkflow(input: CreateWorkflowRequest): Promise<{ id: string }> {
    return this.workflowStore.createWorkflow({
      userId: input.userId,
      name: input.name,
      status: input.status,
      nodes: input.nodes,
      edges: input.edges ?? [],
    });
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.workflowStore.getWorkflowById(workflowId);
  }
}
