import type { HttpNodeConfig, ExecutionContext } from "@repo/types";
import { BaseNodeExecutor } from "../node-executor";
import { HttpNodeError } from "../errors";
import { logger } from "../logger";

export class HttpNode extends BaseNodeExecutor {
  readonly nodeType = "HTTP";

  async execute(
    input: unknown,
    config: HttpNodeConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    this.validateConfig(config, ["url", "method"]);

    const { url, method, headers, body, timeout = 30000 } = config;

    logger.info(`HTTP ${method} request to ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HttpNodeError(
          `HTTP request failed with status ${response.status}`,
          "http-node",
          response.status,
          url
        );
      }

      const data = await response.json();
      logger.info(`HTTP ${method} request completed`, { url, status: response.status });
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpNodeError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpNodeError(
          `HTTP request timed out after ${timeout}ms`,
          "http-node",
          undefined,
          url
        );
      }

      logger.error(`HTTP ${method} request failed`, {
        url,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new HttpNodeError(
        error instanceof Error ? error.message : "Unknown HTTP error",
        "http-node",
        undefined,
        url
      );
    }
  }
}