import type { NodeType } from "@repo/types";
import type { NodeExecutor } from "./node-executor";
import { HttpNode } from "./nodes/http.node";
import { TriggerNode } from "./nodes/trigger.nodes";
import { LogNode } from "./nodes/log.node";
import { NodeNotFoundError } from "./errors";
import { logger } from "./logger";

type NodeConstructor = new () => NodeExecutor;

export class NodeFactory {
  private static readonly nodeRegistry = new Map<string, NodeConstructor>();

  static {
    this.nodeRegistry.set("HTTP", HttpNode);
    this.nodeRegistry.set("TRIGGER", TriggerNode);
    this.nodeRegistry.set("LOG", LogNode);
  }

  static createNode(type: string): NodeExecutor {
    const normalizedType = type.toUpperCase();
    const NodeClass = this.nodeRegistry.get(normalizedType);

    if (!NodeClass) {
      logger.error(`Attempted to create unsupported node type: ${type}`);
      throw new NodeNotFoundError(type);
    }

    logger.debug(`Creating node of type: ${normalizedType}`);
    return new NodeClass();
  }

  static registerNode(type: NodeType, nodeClass: NodeConstructor): void {
    this.nodeRegistry.set(type.toUpperCase(), nodeClass);
    logger.info(`Registered new node type: ${type}`);
  }

  static getSupportedTypes(): string[] {
    return Array.from(this.nodeRegistry.keys());
  }
}