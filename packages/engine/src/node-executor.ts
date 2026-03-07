import type { NodeConfig, ExecutionContext } from "@repo/types";

export interface NodeExecutor {
  readonly nodeType: string;
  execute(
    input: unknown,
    config: NodeConfig,
    context: ExecutionContext
  ): Promise<unknown>;
}

export abstract class BaseNodeExecutor implements NodeExecutor {
  abstract readonly nodeType: string;

  abstract execute(
    input: unknown,
    config: NodeConfig,
    context: ExecutionContext
  ): Promise<unknown>;

  protected validateConfig(config: NodeConfig, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
  }
}