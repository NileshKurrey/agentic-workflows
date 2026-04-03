import type { WorkflowQueue } from "../queue/workflow-queue";

export interface WorkflowRunResponse {
  status: "queued";
  runId: string;
  jobId: string | undefined;
}

export class WorkflowRunService {
  constructor(private readonly workflowQueue: WorkflowQueue) {}

  async queueRun(workflow: { id: string; [key: string]: unknown }): Promise<WorkflowRunResponse> {
    const runId = `${workflow.id}-${Date.now()}`;

    const job = await this.workflowQueue.add("execute", workflow, {
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

  async getRunStatus(runId: string): Promise<{ runId: string; jobId: string | undefined; state: string } | null> {
    const job = await this.workflowQueue.getJob(runId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      runId,
      jobId: job.id?.toString(),
      state,
    };
  }
}
