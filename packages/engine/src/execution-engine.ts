import type {
  Workflow,
  WorkflowNode,
  ExecutionContext,
  ExecutionResult,
  WorkflowExecutionResult,
} from "@repo/types";
import { NodeFactory } from "./node-factory";
import { getNextNodes, getPreviousNodes } from "./graph-utils";
import { WorkflowValidationError, NodeExecutionError } from "./errors";
import type { WorkflowEdge } from "@repo/types";
import { logger } from "./logger";

export class ExecutionEngine {
  async run(workflow: Workflow): Promise<WorkflowExecutionResult> {
    const startTime = new Date();
    logger.info(`Starting workflow execution`, { workflowId: workflow.id, workflowName: workflow.name });

    const context: ExecutionContext = {};
    const queue: string[] = [];
    const executedNodes = new Set<string>();

    // Find trigger node
    const trigger = workflow.nodes.find(
      (node: WorkflowNode) => node.type.toUpperCase() === "TRIGGER"
    );

    if (!trigger) {
      throw new WorkflowValidationError("Workflow must have a trigger node", {
        workflowId: workflow.id,
      });
    }

    queue.push(trigger.id);

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        // Prevent infinite loops
        if (executedNodes.has(nodeId)) {
          logger.warn(`Skipping already executed node`, { nodeId });
          continue;
        }

        const node = workflow.nodes.find((n: WorkflowNode) => n.id === nodeId);

        if (!node) {
          throw new WorkflowValidationError(`Node not found: ${nodeId}`, {
            workflowId: workflow.id,
            nodeId,
          });
        }

        // Get input from previous node(s)
        const input = this.getNodeInput(node.id, workflow.edges, context);
        
        const nodeResult = await this.executeNode(node, input, context);
        context[node.id] = nodeResult;
        executedNodes.add(nodeId);

        if (!nodeResult.success) {
          logger.error(`Node execution failed, stopping workflow`, {
            nodeId,
            error: nodeResult.error,
          });
          break;
        }

        const nextNodes = getNextNodes(node.id, workflow.edges);
        queue.push(...nextNodes);
      }

      const endTime = new Date();
      const hasFailure = Object.values(context).some((r) => !r.success);

      logger.info(`Workflow execution completed`, {
        workflowId: workflow.id,
        status: hasFailure ? "FAILED" : "COMPLETED",
        duration: endTime.getTime() - startTime.getTime(),
      });

      return {
        workflowId: workflow.id,
        status: hasFailure ? "FAILED" : "COMPLETED",
        context,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Workflow execution failed`, {
        workflowId: workflow.id,
        error: errorMessage,
      });

      return {
        workflowId: workflow.id,
        status: "FAILED",
        context,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
        error: errorMessage,
      };
    }
  }

  private getNodeInput(
    nodeId: string,
    edges: WorkflowEdge[],
    context: ExecutionContext
  ): unknown {
    const previousNodeIds = getPreviousNodes(nodeId, edges);
    
    if (previousNodeIds.length === 0) {
      return undefined; // Trigger node has no input
    }
    
    if (previousNodeIds.length === 1) {
      // Single parent - return its output data
      const parentResult = context[previousNodeIds[0]];
      return parentResult?.data;
    }
    
    // Multiple parents - return array of outputs
    return previousNodeIds.map(id => context[id]?.data);
  }

  private async executeNode(
    node: WorkflowNode,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = new Date();
    logger.info(`Executing node`, { nodeId: node.id, nodeType: node.type, nodeName: node.name });

    try {
      const executor = NodeFactory.createNode(node.type);
      // Use provided input, fallback to node.input if explicitly set
      const nodeInput = input !== undefined ? input : node.input;
      const data = await executor.execute(nodeInput, node.config, context);
      const endTime = new Date();

      logger.info(`Node executed successfully`, { nodeId: node.id });

      return {
        success: true,
        data,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Node execution failed`, {
        nodeId: node.id,
        nodeType: node.type,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
      };
    }
  }
}