import type { NodeExecutedEvent, WorkflowCompletedEvent } from "@repo/types";
import type { RedisClient } from "../connections/redis";

export interface ProgressPublisher {
  publishNodeExecuted(workflowId: string, event: NodeExecutedEvent): Promise<void>;
  publishWorkflowCompleted(workflowId: string, event: WorkflowCompletedEvent): Promise<void>;
}

export class RedisProgressPublisher implements ProgressPublisher {
  constructor(private readonly redis: RedisClient) {}

  async publishNodeExecuted(workflowId: string, event: NodeExecutedEvent): Promise<void> {
    await this.redis.publish(
      `workflow:${workflowId}:progress`,
      JSON.stringify({
        type: "node-executed",
        data: event,
      })
    );
  }

  async publishWorkflowCompleted(workflowId: string, event: WorkflowCompletedEvent): Promise<void> {
    await this.redis.publish(
      `workflow:${workflowId}:progress`,
      JSON.stringify({
        type: "workflow-completed",
        data: event,
      })
    );
  }
}
