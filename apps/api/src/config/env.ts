import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export interface ApiEnv {
  port: number;
  redisHost: string;
  redisPort: number;
  workflowQueueName: string;
  databaseUrl: string;
}

export function getApiEnv(): ApiEnv {
  return {
    port: Number.parseInt(process.env.PORT ?? "4000", 10),
    redisHost: process.env.REDIS_HOST ?? "localhost",
    redisPort: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
    workflowQueueName: process.env.WORKFLOW_QUEUE_NAME ?? "workflow",
    databaseUrl:
      process.env.DATABASE_URL ?? "postgres://workflows:workflows_password@localhost:5432/workflows_db",
  };
}
