import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { WorkflowQueue } from "../queue/workflow-queue";
import type { WorkflowStore } from "@repo/db";
import type { WorkflowExecutionJob } from "@repo/types";

export interface WorkflowRunResponse {
  status: "queued";
  runId: string;
  jobId: string | undefined;
}

export class ExecutionService {
  private readonly workflowQueue: WorkflowQueue;
  private readonly workflowStore: WorkflowStore;

  constructor(container: Container) {
    this.workflowQueue = container.get<WorkflowQueue>(DEPENDENCIES.WORKFLOW_QUEUE);
    this.workflowStore = container.get<WorkflowStore>("workflowStore");
  }

  async queueRun(workflowId: string): Promise<WorkflowRunResponse> {
    const workflow = await this.workflowStore.getWorkflowById(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const runId = `${workflow.id}-${Date.now()}`;
    const payload: WorkflowExecutionJob = {
      runId,
      workflowId: workflow.id,
    };

    await this.workflowStore.queueExecution({
      runId,
      workflowId: workflow.id,
    });

    const job = await this.workflowQueue.add("execute", payload, {
      jobId: runId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    return {
      status: "queued",
      runId,
      jobId: job.id?.toString(),
    };
  }

  async getRunStatus(runId: string): Promise<{ runId: string; status: string } | null> {
    return this.workflowStore.getExecutionByRunId(runId);
  }
}
