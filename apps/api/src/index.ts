import express from "express";
import { getApiEnv } from "./config/env";
import { createRedisConnection } from "./connections/redis";
import { createWorkflowQueue } from "./queue/workflow-queue";
import { createWorkflowRouter } from "./routes/workflow-routes";
import { SseProgressService } from "./services/sse-progress-service";
import { WorkflowRunService } from "./services/workflow-run-service";

async function bootstrap(): Promise<void> {
  const env = getApiEnv();
  const app = express();

  app.use(express.json());

  const redis = createRedisConnection(env.redisHost, env.redisPort);
  await redis.connect();

  const workflowQueue = createWorkflowQueue(env.workflowQueueName, {
    connection: {
      host: env.redisHost,
      port: env.redisPort,
    },
  });

  const workflowRunService = new WorkflowRunService(workflowQueue);
  const sseProgressService = new SseProgressService(redis);

  app.use(
    createWorkflowRouter({
      workflowRunService,
      sseProgressService,
    })
  );

  app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
    console.log("POST /run - Create workflow job");
    console.log("GET /run/:runId/events - Stream workflow progress (SSE)");
    console.log("GET /run/:runId/status - Get job status");
  });

  process.on("SIGTERM", async () => {
    await workflowQueue.close();
    await redis.quit();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap API", error);
  process.exit(1);
});
