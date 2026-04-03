import { ExecutionEngine } from "@repo/engine";
import { getWorkerEnv } from "./config/env";
import { createRedisConnection } from "./connections/redis";
import { RedisProgressPublisher } from "./services/progress-publisher";
import { createWorkflowWorker } from "./worker/workflow-worker";

async function bootstrap(): Promise<void> {
  const env = getWorkerEnv();
  const redis = createRedisConnection(env.redisHost, env.redisPort);
  await redis.connect();

  const progressPublisher = new RedisProgressPublisher(redis);
  const engine = new ExecutionEngine();
  const worker = createWorkflowWorker({
    queueName: env.workflowQueueName,
    workerOptions: {
      connection: {
        host: env.redisHost,
        port: env.redisPort,
      },
    },
    engine,
    progressPublisher,
  });

  console.log("Worker started, listening for workflow jobs...");

  process.on("SIGTERM", async () => {
    await worker.close();
    await redis.quit();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap worker", error);
  process.exit(1);
});
