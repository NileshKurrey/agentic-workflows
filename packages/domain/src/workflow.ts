import type { WorkflowRunStatus } from "@repo/types";
import { Node } from "./node";

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
