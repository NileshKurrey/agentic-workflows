export interface WorkerEnv {
  redisHost: string;
  redisPort: number;
  workflowQueueName: string;
}

export function getWorkerEnv(): WorkerEnv {
  return {
    redisHost: process.env.REDIS_HOST ?? "localhost",
    redisPort: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
    workflowQueueName: process.env.WORKFLOW_QUEUE_NAME ?? "workflow",
  };
}
