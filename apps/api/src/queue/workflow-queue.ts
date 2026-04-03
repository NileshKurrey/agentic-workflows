import { Queue, type QueueOptions } from "bullmq";

export type WorkflowQueue = Queue;

export function createWorkflowQueue(queueName: string, options: QueueOptions): WorkflowQueue {
  return new Queue(queueName, options);
}
