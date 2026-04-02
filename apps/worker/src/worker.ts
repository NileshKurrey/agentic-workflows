import { Worker } from "bullmq";
import { createClient } from "redis";
import { ExecutionEngine } from "@repo/engine";
import type { NodeExecutedEvent, WorkflowCompletedEvent } from "@repo/types";

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

redis.connect();

const engine = new ExecutionEngine();

const worker = new Worker("workflow", async (job) => {
  const workflow = job.data;
  const workflowId = workflow.id;

  // Callback to publish node execution events to Redis pub/sub
  const onNodeExecuted = async (event: NodeExecutedEvent) => {
    await redis.publish(
      `workflow:${workflowId}:progress`,
      JSON.stringify({
        type: "node-executed",
        data: event,
      })
    );
  };

  // Callback to publish workflow completion event
  const onWorkflowCompleted = async (event: WorkflowCompletedEvent) => {
    await redis.publish(
      `workflow:${workflowId}:progress`,
      JSON.stringify({
        type: "workflow-completed",
        data: event,
      })
    );
  };

  // Execute workflow with callbacks
  await engine.run(workflow, {
    onNodeExecuted,
    onWorkflowCompleted,
  });
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

console.log("Worker started, listening for workflow jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
});
