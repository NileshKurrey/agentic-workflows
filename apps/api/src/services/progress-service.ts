import type { Response } from "express";
import type { Container } from "../di/core/container";
import { DEPENDENCIES } from "../di/core/container";
import type { RedisClient } from "../connections/redis";

export class ProgressService {
  private readonly redis: RedisClient;

  constructor(container: Container) {
    this.redis = container.get<RedisClient>(DEPENDENCIES.REDIS);
  }

  async streamRunProgress(runId: string, response: Response): Promise<void> {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("Access-Control-Allow-Origin", "*");

    const workflowId = runId.split("-").slice(0, -1).join("-");
    const subscriber = this.redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(`workflow:${workflowId}:progress`, (message) => {
      response.write(`data: ${message}\n\n`);

      try {
        const event = JSON.parse(message) as { type?: string };

        if (event.type === "workflow-completed") {
          response.end();
          subscriber.unsubscribe().catch(console.error);
          subscriber.quit().catch(console.error);
        }
      } catch {
        response.end();
        subscriber.unsubscribe().catch(console.error);
        subscriber.quit().catch(console.error);
      }
    });

    response.write(`data: ${JSON.stringify({ type: "connected", runId })}\n\n`);

    response.req?.on("close", async () => {
      try {
        await subscriber.unsubscribe();
        await subscriber.quit();
      } catch {
        // Client disconnected before cleanup completed.
      }
    });
  }
}
