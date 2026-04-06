import type { NodeConfig, NodeExecutionPolicy, NodeType } from "@repo/types";

export class Node {
    constructor(
        public id: string,
        public workflowId: string,
        public name: string,
        public type: NodeType,
        public config: NodeConfig,
        public input?: unknown,
        public policy?: NodeExecutionPolicy,
        public position: number = 0,
        public createdAt?: Date,
        public updatedAt?: Date,
    ) {}
}
