import type { LogNodeConfig, ExecutionContext } from "@repo/types";
import { BaseNodeExecutor } from "../node-executor";
import { logger } from "../logger";

export class LogNode extends BaseNodeExecutor {
  readonly nodeType = "LOG";

  async execute(
    input: unknown,
    config: LogNodeConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const { level = "info", prefix = "" } = config;
    const message = prefix ? `${prefix}: ${JSON.stringify(input)}` : JSON.stringify(input);

    switch (level) {
      case "debug":
        logger.debug(message, { input });
        break;
      case "warn":
        logger.warn(message, { input });
        break;
      case "error":
        logger.error(message, { input });
        break;
      case "info":
      default:
        logger.info(message, { input });
    }

    return input;
  }
}