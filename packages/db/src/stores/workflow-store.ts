import { asc, eq } from "drizzle-orm";
import type { NodeType, Workflow, WorkflowEdge, WorkflowNode, WorkflowRunStatus } from "@repo/types";
import type { Database } from "../client";
import { nodes, workflows } from "../schema";

export interface CreateWorkflowInput {
  userId: string;
  name: string;
  status?: WorkflowRunStatus;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export class WorkflowStore {
  constructor(private readonly db: Database) {}

  async createWorkflow(input: CreateWorkflowInput): Promise<{ id: string }> {
    const [createdWorkflow] = await this.db
      .insert(workflows)
      .values({
        userId: input.userId,
        name: input.name,
        status: input.status ?? "PENDING",
        edges: input.edges ?? [],
      })
      .returning({ id: workflows.id });

    if (input.nodes.length > 0) {
      await this.db.insert(nodes).values(
        input.nodes.map((node, index) => ({
          id: node.id,
          workflowId: createdWorkflow.id,
          name: node.name,
          type: node.type,
          config: node.config,
          input: node.input,
          policy: node.policy,
          position: index,
        })),
      );
    }

    return createdWorkflow;
  }

  async getWorkflowById(workflowId: string): Promise<Workflow | null> {
    const [workflowRow] = await this.db
      .select({
        id: workflows.id,
        name: workflows.name,
        status: workflows.status,
        edges: workflows.edges,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!workflowRow) {
      return null;
    }

    const nodeRows = await this.db
      .select({
        id: nodes.id,
        type: nodes.type,
        name: nodes.name,
        config: nodes.config,
        input: nodes.input,
        policy: nodes.policy,
      })
      .from(nodes)
      .where(eq(nodes.workflowId, workflowId))
      .orderBy(asc(nodes.position));

    return {
      id: workflowRow.id,
      name: workflowRow.name,
      status: this.toWorkflowStatus(workflowRow.status),
      edges: (workflowRow.edges ?? []) as WorkflowEdge[],
      nodes: nodeRows.map((row) => ({
        id: row.id,
        type: row.type as NodeType,
        name: row.name,
        config: (row.config ?? {}) as Record<string, unknown>,
        input: row.input,
        policy: (row.policy ?? undefined) as WorkflowNode["policy"],
      })),
    };
  }

  private toWorkflowStatus(status: string): WorkflowRunStatus {
    if (status === "PENDING" || status === "RUNNING" || status === "FAILED" || status === "COMPLETED") {
      return status;
    }

    return "PENDING";
  }
}
