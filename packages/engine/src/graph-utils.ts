import type { ExecutionContext, WorkflowEdge } from "@repo/types";

export function evaluateEdgeCondition(
  condition: string | undefined,
  data: unknown,
  context: ExecutionContext
): boolean {
  if (!condition || !condition.trim()) {
    return true;
  }

  try {
    const evaluator = new Function(
      "data",
      "context",
      `"use strict"; return Boolean(${condition});`
    ) as (value: unknown, executionContext: ExecutionContext) => boolean;

    return evaluator(data, context);
  } catch {
    return false;
  }
}

export function getNextNodes(
  nodeId: string,
  edges: WorkflowEdge[],
  data?: unknown,
  context: ExecutionContext = {}
): string[] {
  return edges
    .filter((edge) => edge.from === nodeId)
    .filter((edge) => evaluateEdgeCondition(edge.condition, data, context))
    .map((edge) => edge.to);
}

export function getPreviousNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges
    .filter((edge) => edge.to === nodeId)
    .map((edge) => edge.from);
}