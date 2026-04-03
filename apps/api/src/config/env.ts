export interface ApiEnv {
  port: number;
  redisHost: string;
  redisPort: number;
  workflowQueueName: string;
}

export function getApiEnv(): ApiEnv {
  return {
    port: Number.parseInt(process.env.PORT ?? "4000", 10),
    redisHost: process.env.REDIS_HOST ?? "localhost",
    redisPort: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
    workflowQueueName: process.env.WORKFLOW_QUEUE_NAME ?? "workflow",
  };
}
