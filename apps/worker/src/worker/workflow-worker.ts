import { Worker, type WorkerOptions } from "bullmq";
import { ExecutionEngine } from "@repo/engine";
import type { Workflow } from "@repo/types";
import type { ProgressPublisher } from "../services/progress-publisher";

interface Dependencies {
  queueName: string;
  workerOptions: WorkerOptions;
  engine: ExecutionEngine;
  progressPublisher: ProgressPublisher;
}

export function createWorkflowWorker(deps: Dependencies): Worker {
  const worker = new Worker(
    deps.queueName,
    async (job) => {
      const workflow = job.data as Workflow;
      const workflowId = workflow.id;

      await deps.engine.run(workflow, {
        onNodeExecuted: async (event) => {
          await deps.progressPublisher.publishNodeExecuted(workflowId, event);
        },
        onWorkflowCompleted: async (event) => {
          await deps.progressPublisher.publishWorkflowCompleted(workflowId, event);
        },
      });
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
