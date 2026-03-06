import { NodeFactory } from "./node-factory";

export class ExecutionEngine {
  async run(workflow: any) {
    let data: Record<string, any> = {}

    for (const node of workflow.nodes) {
      const executor = NodeFactory.createNode(node.type);
      const result = await executor.execute(node.input, node.config);
      data[node.id] = result;
    }
    return data;
  }
}