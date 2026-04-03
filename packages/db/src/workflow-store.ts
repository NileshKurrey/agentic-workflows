import { and, asc, eq } from "drizzle-orm";
import type {
  NodeExecutedEvent,
  NodeType,
  Workflow,
  WorkflowEdge,
  WorkflowExecutionResult,
  WorkflowNode,
  WorkflowRunStatus,
} from "@repo/types";

import type { Database } from "./client";
import { nodeResults, nodes, workflowExecutions, workflows, users } from "./schema";

export interface CreateUserInput {
  email: string;
  name?: string;
}

export interface CreateWorkflowInput {
  userId: string;
  name: string;
  status?: WorkflowRunStatus;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface QueueExecutionInput {
  runId: string;
  workflowId: string;
}

export class WorkflowStore {
  constructor(private readonly db: Database) {}

  async createUser(input: CreateUserInput): Promise<{ id: string; email: string; name: string | null }> {
    const [created] = await this.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    return created;
  }

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
        }))
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

  async queueExecution(input: QueueExecutionInput): Promise<void> {
    const now = new Date();

    await this.db.insert(workflowExecutions).values({
      runId: input.runId,
      workflowId: input.workflowId,
      status: "PENDING",
      context: {},
      failedNodes: [],
      startTime: now,
      endTime: now,
      duration: 0,
    });
  }

  async markExecutionRunning(runId: string): Promise<void> {
    const now = new Date();

    await this.db
      .update(workflowExecutions)
      .set({
        status: "RUNNING",
        startTime: now,
      })
      .where(eq(workflowExecutions.runId, runId));
  }

  async saveNodeEvent(runId: string, event: NodeExecutedEvent): Promise<void> {
    const [execution] = await this.db
      .select({ id: workflowExecutions.id })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.runId, runId));

    if (!execution) {
      return;
    }

    await this.db.insert(nodeResults).values({
      executionId: execution.id,
      nodeId: event.nodeId,
      nodeType: event.nodeType,
      success: event.success,
      attempts: event.attempts,
      duration: event.duration,
      error: event.error,
      timestamp: new Date(event.timestamp),
    });
  }

  async completeExecution(runId: string, result: WorkflowExecutionResult): Promise<void> {
    await this.db
      .update(workflowExecutions)
      .set({
        status: result.status,
        context: result.context,
        failedNodes: result.failedNodes,
        error: result.error ?? null,
        startTime: new Date(result.startTime),
        endTime: new Date(result.endTime),
        duration: result.duration,
      })
      .where(eq(workflowExecutions.runId, runId));
  }

  async getExecutionByRunId(runId: string): Promise<{ runId: string; status: string } | null> {
    const [execution] = await this.db
      .select({ runId: workflowExecutions.runId, status: workflowExecutions.status })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.runId, runId));

    return execution ?? null;
  }

  async getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email));

    return user ?? null;
  }

  async getNodeResultForExecution(runId: string, nodeId: string): Promise<{ id: string } | null> {
    const [execution] = await this.db
      .select({ id: workflowExecutions.id })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.runId, runId));

    if (!execution) {
      return null;
    }

    const [result] = await this.db
      .select({ id: nodeResults.id })
      .from(nodeResults)
      .where(and(eq(nodeResults.executionId, execution.id), eq(nodeResults.nodeId, nodeId)));

    return result ?? null;
  }

  private toWorkflowStatus(status: string): WorkflowRunStatus {
    if (status === "PENDING" || status === "RUNNING" || status === "FAILED" || status === "COMPLETED") {
      return status;
    }

    return "PENDING";
  }
}
