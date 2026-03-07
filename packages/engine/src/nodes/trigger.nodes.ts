import type { TriggerNodeConfig, ExecutionContext } from "@repo/types";
import { BaseNodeExecutor } from "../node-executor";
import { logger } from "../logger";

export interface TriggerResult {
  message: string;
  triggerType: string;
  timestamp: string;
  input: unknown;
}

export class TriggerNode extends BaseNodeExecutor {
  readonly nodeType = "TRIGGER";

  async execute(
    input: unknown,
    config: TriggerNodeConfig,
    context: ExecutionContext
  ): Promise<TriggerResult> {
    const { triggerType = "manual" } = config;

    logger.info(`Workflow triggered`, { triggerType });

    return {
      message: "Trigger executed",
      triggerType,
      timestamp: new Date().toISOString(),
      input,
    };
  }
}