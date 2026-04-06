import { and, eq } from "drizzle-orm";
import type { NodeExecutedEvent, WorkflowExecutionResult } from "@repo/types";
import type { Database } from "../client";
import { nodeResults, workflowExecutions } from "../schema";

export interface QueueExecutionInput {
  runId: string;
  workflowId: string;
}

export class ExecutionStore {
  constructor(private readonly db: Database) {}

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
}
