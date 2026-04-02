import type {
  FailedNode,
  ExecutionContext,
  ExecutionResult,
  NodeExecutionPolicy,
  Workflow,
  WorkflowEdge,
  WorkflowExecutionResult,
  WorkflowNode,
  WorkflowRunOptions,
} from "@repo/types";
import { WorkflowValidationError } from "./errors";
import { evaluateEdgeCondition, getNextNodes, getPreviousNodes } from "./graph-utils";
import { logger } from "./logger";
import { NodeFactory } from "./node-factory";

const DEFAULT_NODE_POLICY: Required<Pick<NodeExecutionPolicy, "retries" | "retryDelayMs">> = {
  retries: 0,
  retryDelayMs: 0,
};

export class ExecutionEngine {
  async run(workflow: Workflow, options: WorkflowRunOptions = {}): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    logger.info("Starting workflow execution", {
      workflowId: workflow.id,
      workflowName: workflow.name,
    });

    this.validateWorkflow(workflow);

    const context: ExecutionContext = {};
    const queue: string[] = [];
    const executedNodes = new Set<string>();
    const failedNodes: FailedNode[] = [];

    const trigger = workflow.nodes.find((node) => this.normalizeNodeType(node.type) === "TRIGGER")!;
    queue.push(trigger.id);

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (executedNodes.has(nodeId)) {
          logger.warn("Skipping already executed node", { nodeId });
          continue;
        }

        const node = workflow.nodes.find((workflowNode) => workflowNode.id === nodeId);

        if (!node) {
          throw new WorkflowValidationError(`Node not found: ${nodeId}`, {
            workflowId: workflow.id,
            nodeId,
          });
        }

        if (!this.isNodeReady(node.id, workflow.edges, executedNodes, queue)) {
          queue.push(node.id);
          continue;
        }

        const input = this.getNodeInput(node.id, workflow.edges, context);
        const nodeResult = await this.executeNode(node, input, context, options.defaultNodePolicy);
        context[node.id] = nodeResult;
        executedNodes.add(node.id);

        // Emit node executed event
        if (options.onNodeExecuted) {
          await options.onNodeExecuted({
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: node.type,
            success: nodeResult.success,
            attempts: nodeResult.attempts,
            duration: nodeResult.duration,
            error: nodeResult.error,
            timestamp: new Date().toISOString(),
          });
        }

        if (!nodeResult.success) {
          failedNodes.push({
            nodeId: node.id,
            nodeType: node.type,
            error: nodeResult.error ?? "Unknown node execution error",
          });

          logger.error("Node execution failed", {
            nodeId: node.id,
            error: nodeResult.error,
          });

          if (!this.shouldContinueOnError(node, options)) {
            break;
          }

          logger.warn("Continuing workflow after node failure", { nodeId: node.id });
        }

        const nextNodes = getNextNodes(node.id, workflow.edges, nodeResult.data, context);

        for (const nextNodeId of nextNodes) {
          if (!executedNodes.has(nextNodeId) && !queue.includes(nextNodeId)) {
            queue.push(nextNodeId);
          }
        }
      }

      const endTime = new Date();
      const hasFailure = Object.values(context).some((result) => !result.success);
      const duration = endTime.getTime() - startTime.getTime();

      logger.info("Workflow execution completed", {
        workflowId: workflow.id,
        status: hasFailure ? "FAILED" : "COMPLETED",
        duration,
      });

      // Emit workflow completed event
      if (options.onWorkflowCompleted) {
        await options.onWorkflowCompleted({
          workflowId: workflow.id,
          status: hasFailure ? "FAILED" : "COMPLETED",
          failedNodes,
          duration,
          timestamp: endTime.toISOString(),
        });
      }

      return {
        workflowId: workflow.id,
        status: hasFailure ? "FAILED" : "COMPLETED",
        context,
        failedNodes,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = endTime.getTime() - startTime.getTime();

      logger.error("Workflow execution failed", {
        workflowId: workflow.id,
        error: errorMessage,
      });

      // Emit workflow completed event with error
      if (options.onWorkflowCompleted) {
        await options.onWorkflowCompleted({
          workflowId: workflow.id,
          status: "FAILED",
          failedNodes,
          duration,
          error: errorMessage,
          timestamp: endTime.toISOString(),
        });
      }

      return {
        workflowId: workflow.id,
        status: "FAILED",
        context,
        failedNodes,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        error: errorMessage,
      };
    }
  }

  private getNodeInput(nodeId: string, edges: WorkflowEdge[], context: ExecutionContext): unknown {
    const previousNodeIds = this.getActiveParentNodeIds(nodeId, edges, context);

    if (previousNodeIds.length === 0) {
      return undefined;
    }

    if (previousNodeIds.length === 1) {
      const parentResult = context[previousNodeIds[0]];
      return parentResult?.data;
    }

    return previousNodeIds.map((id) => context[id]?.data);
  }

  private async executeNode(
    node: WorkflowNode,
    input: unknown,
    context: ExecutionContext,
    defaultPolicy?: NodeExecutionPolicy
  ): Promise<ExecutionResult> {
    const startTime = new Date();
    logger.info("Executing node", {
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.name,
    });

    const policy = this.resolveNodePolicy(node.policy, defaultPolicy);
    const maxAttempts = Math.max(1, policy.retries + 1);
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        const executor = NodeFactory.createNode(node.type);
        const nodeInput = input !== undefined ? input : node.input;
        const executionPromise = executor.execute(nodeInput, node.config, context);
        const data = await this.executeWithTimeout(executionPromise, policy.timeoutMs, node.id);
        const endTime = new Date();

        logger.info("Node executed successfully", { nodeId: node.id, attempt });

        return {
          success: true,
          data,
          attempts: attempt,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt < maxAttempts) {
          logger.warn("Node execution failed, retrying", {
            nodeId: node.id,
            attempt,
            retriesRemaining: maxAttempts - attempt,
            error: errorMessage,
          });

          await this.sleep(policy.retryDelayMs);
          continue;
        }

        const endTime = new Date();

        logger.error("Node execution failed", {
          nodeId: node.id,
          nodeType: node.type,
          error: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
          attempts: attempt,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime(),
        };
      }
    }

    const endTime = new Date();

    return {
      success: false,
      error: "Node execution failed unexpectedly",
      attempts: maxAttempts,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.nodes.length) {
      throw new WorkflowValidationError("Workflow must contain at least one node", {
        workflowId: workflow.id,
      });
    }

    const nodeIds = new Set<string>();

    for (const node of workflow.nodes) {
      if (nodeIds.has(node.id)) {
        throw new WorkflowValidationError(`Duplicate node id detected: ${node.id}`, {
          workflowId: workflow.id,
          nodeId: node.id,
        });
      }

      nodeIds.add(node.id);
    }

    const triggerNodes = workflow.nodes.filter(
      (node) => this.normalizeNodeType(node.type) === "TRIGGER"
    );

    if (triggerNodes.length !== 1) {
      throw new WorkflowValidationError("Workflow must have exactly one trigger node", {
        workflowId: workflow.id,
        triggerCount: triggerNodes.length,
      });
    }

    for (const edge of workflow.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        throw new WorkflowValidationError(`Edge references unknown node: ${edge.from} -> ${edge.to}`, {
          workflowId: workflow.id,
          edge,
        });
      }
    }

    this.ensureAcyclicGraph(workflow);
    this.logUnreachableNodes(workflow, triggerNodes[0].id);
  }

  private ensureAcyclicGraph(workflow: Workflow): void {
    const adjacency = new Map<string, string[]>();

    for (const node of workflow.nodes) {
      adjacency.set(node.id, []);
    }

    for (const edge of workflow.edges) {
      adjacency.get(edge.from)?.push(edge.to);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visiting.add(nodeId);

      for (const childId of adjacency.get(nodeId) ?? []) {
        if (dfs(childId)) {
          return true;
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (dfs(node.id)) {
        throw new WorkflowValidationError("Workflow contains a cycle", {
          workflowId: workflow.id,
        });
      }
    }
  }

  private logUnreachableNodes(workflow: Workflow, triggerNodeId: string): void {
    const reachable = new Set<string>([triggerNodeId]);
    const queue = [triggerNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      for (const childId of getNextNodes(nodeId, workflow.edges)) {
        if (!reachable.has(childId)) {
          reachable.add(childId);
          queue.push(childId);
        }
      }
    }

    const unreachableNodes = workflow.nodes
      .filter((node) => !reachable.has(node.id))
      .map((node) => node.id);

    if (unreachableNodes.length > 0) {
      logger.warn("Workflow has unreachable nodes", {
        workflowId: workflow.id,
        unreachableNodes,
      });
    }
  }

  private getActiveParentNodeIds(
    nodeId: string,
    edges: WorkflowEdge[],
    context: ExecutionContext
  ): string[] {
    const parentNodeIds = getPreviousNodes(nodeId, edges);

    return parentNodeIds.filter((parentNodeId) => {
      const parentResult = context[parentNodeId];

      if (!parentResult) {
        return false;
      }

      const matchingEdge = edges.find((edge) => edge.from === parentNodeId && edge.to === nodeId);
      return evaluateEdgeCondition(matchingEdge?.condition, parentResult.data, context);
    });
  }

  private isNodeReady(
    nodeId: string,
    edges: WorkflowEdge[],
    executedNodes: Set<string>,
    queuedNodes: string[]
  ): boolean {
    const parentNodeIds = getPreviousNodes(nodeId, edges);

    return parentNodeIds
      .filter((parentNodeId) => executedNodes.has(parentNodeId) || queuedNodes.includes(parentNodeId))
      .every((parentNodeId) => executedNodes.has(parentNodeId));
  }

  private shouldContinueOnError(node: WorkflowNode, options: WorkflowRunOptions): boolean {
    if (typeof node.policy?.continueOnError === "boolean") {
      return node.policy.continueOnError;
    }

    return options.continueOnError ?? false;
  }

  private resolveNodePolicy(
    nodePolicy?: NodeExecutionPolicy,
    defaultPolicy?: NodeExecutionPolicy
  ): Required<NodeExecutionPolicy> {
    return {
      retries: this.normalizeWholeNumber(
        nodePolicy?.retries,
        defaultPolicy?.retries ?? DEFAULT_NODE_POLICY.retries
      ),
      retryDelayMs: this.normalizeWholeNumber(
        nodePolicy?.retryDelayMs,
        defaultPolicy?.retryDelayMs ?? DEFAULT_NODE_POLICY.retryDelayMs
      ),
      timeoutMs: this.normalizeWholeNumber(nodePolicy?.timeoutMs, defaultPolicy?.timeoutMs),
      continueOnError: nodePolicy?.continueOnError ?? defaultPolicy?.continueOnError ?? false,
    };
  }

  private normalizeWholeNumber(value: number | undefined, fallback?: number): number {
    const resolved = value ?? fallback ?? 0;
    return Number.isFinite(resolved) ? Math.max(0, Math.floor(resolved)) : 0;
  }

  private normalizeNodeType(type: string): string {
    return type.trim().toUpperCase();
  }

  private sleep(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async executeWithTimeout<T>(operation: Promise<T>, timeoutMs: number, nodeId: string): Promise<T> {
    if (timeoutMs <= 0) {
      return operation;
    }

    let timeoutHandle: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Node ${nodeId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }
}
