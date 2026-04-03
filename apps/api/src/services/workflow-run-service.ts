import type { WorkflowQueue } from "../queue/workflow-queue";
import { WorkflowStore } from "@repo/db";
import type { WorkflowExecutionJob } from "@repo/types";

export interface WorkflowRunResponse {
  status: "queued";
  runId: string;
  jobId: string | undefined;
}

export class WorkflowRunService {
  constructor(
    private readonly workflowQueue: WorkflowQueue,
    private readonly workflowStore: WorkflowStore,
  ) {}

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

  async getRunStatus(
    runId: string,
  ): Promise<{ runId: string; jobId: string | undefined; state: string; executionStatus?: string } | null> {
    const job = await this.workflowQueue.getJob(runId);
    const execution = await this.workflowStore.getExecutionByRunId(runId);

    if (!job && !execution) {
      return null;
    }

    const state = job ? await job.getState() : "not-found";

    return {
      runId,
      jobId: job?.id?.toString(),
      state,
      executionStatus: execution?.status,
    };
  }
}
