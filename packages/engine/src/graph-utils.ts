import { WorkflowEdge } from '@repo/types'

export function getNextNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges
    .filter(edge => edge.from === nodeId)
    .map(edge => edge.to);
}

export function getPreviousNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges
    .filter(edge => edge.to === nodeId)
    .map(edge => edge.from);
}