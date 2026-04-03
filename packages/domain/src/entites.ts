import type {
    FailedNode,
    ExecutionContext,
    NodeConfig,
    NodeExecutionPolicy,
    NodeType,
    WorkflowRunStatus,
} from "@repo/types";

export class User {
    constructor(
        public id: string,
        public email: string,
        public name?: string,
        public createdAt?: Date,
        public updatedAt?: Date,
    ) {}
}

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

export class Workflow {
    constructor(
        public id: string,
        public userId: string,
        public name: string,
        public status: WorkflowRunStatus,
        public nodes: Node[] = [],
        public createdAt?: Date,
        public updatedAt?: Date,
    ) {}

    addNode(node: Node): void {
        this.nodes.push(node);
    }
}

export class WorkflowExecution {
    constructor(
        public id: string,
        public workflowId: string,
        public status: WorkflowRunStatus,
        public context: ExecutionContext = {},
        public failedNodes: FailedNode[] = [],
        public startTime?: Date,
        public endTime?: Date,
        public duration: number = 0,
        public error?: string,
        public createdAt?: Date,
    ) {}
}

export class NodeResult {
    constructor(
        public id: string,
        public executionId: string,
        public nodeId: string,
        public nodeType: NodeType,
        public success: boolean,
        public attempts: number,
        public duration: number,
        public data?: unknown,
        public error?: string,
        public timestamp?: Date,
    ) {}
}