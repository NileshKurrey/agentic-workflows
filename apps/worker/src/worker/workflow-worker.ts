import { Worker, type WorkerOptions } from "bullmq";
import { ExecutionEngine } from "@repo/engine";
import { WorkflowStore } from "@repo/db";
import type { WorkflowExecutionJob, WorkflowExecutionResult } from "@repo/types";
import type { ProgressPublisher } from "../services/progress-publisher";

interface Dependencies {
  queueName: string;
  workerOptions: WorkerOptions;
  engine: ExecutionEngine;
  progressPublisher: ProgressPublisher;
  workflowStore: WorkflowStore;
}

export function createWorkflowWorker(deps: Dependencies): Worker {
  const worker = new Worker(
    deps.queueName,
    async (job) => {
      const payload = job.data as WorkflowExecutionJob;
      const workflow = await deps.workflowStore.getWorkflowById(payload.workflowId);

      if (!workflow) {
        throw new Error(`Workflow not found: ${payload.workflowId}`);
      }

      await deps.workflowStore.markExecutionRunning(payload.runId);

      let result: WorkflowExecutionResult;

      try {
        result = await deps.engine.run(workflow, {
          onNodeExecuted: async (event) => {
            await Promise.all([
              deps.progressPublisher.publishNodeExecuted(workflow.id, event),
              deps.workflowStore.saveNodeEvent(payload.runId, event),
            ]);
          },
          onWorkflowCompleted: async (event) => {
            await deps.progressPublisher.publishWorkflowCompleted(workflow.id, event);
          },
        });
      } catch (error) {
        const now = new Date();
        result = {
          workflowId: workflow.id,
          status: "FAILED",
          context: {},
          failedNodes: [],
          startTime: now.toISOString(),
          endTime: now.toISOString(),
          duration: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      await deps.workflowStore.completeExecution(payload.runId, result);
    },
    deps.workerOptions
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
  });

  return worker;
}
