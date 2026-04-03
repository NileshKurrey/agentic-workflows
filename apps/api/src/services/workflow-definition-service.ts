import type { Workflow, WorkflowEdge, WorkflowNode, WorkflowRunStatus } from "@repo/types";
import { WorkflowStore } from "@repo/db";

export interface CreateUserRequest {
  email: string;
  name?: string;
}

export interface CreateWorkflowRequest {
  userId: string;
  name: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
  status?: WorkflowRunStatus;
}

export class WorkflowDefinitionService {
  constructor(private readonly workflowStore: WorkflowStore) {}

  async createUser(input: CreateUserRequest): Promise<{ id: string; email: string; name: string | null }> {
    const existing = await this.workflowStore.getUserByEmail(input.email);

    if (existing) {
      return existing;
    }

    return this.workflowStore.createUser(input);
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
