import type { WorkflowNode, WorkflowEdge } from "@repo/types";
import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { IHttpRequest, IHttpResponse } from "../di/http-handler";
import type { WorkflowService } from "../services/workflow-service";
import { getParamAsString, isValidUuid } from "./validation";

export class WorkflowController {
  constructor(private readonly container: Container) {}

  async createWorkflow(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const workflowService = this.container.get<WorkflowService>(DEPENDENCIES.WORKFLOW_SERVICE);
      const payload = req.body as {
        userId?: string;
        name?: string;
        nodes?: WorkflowNode[];
        edges?: WorkflowEdge[];
      };

      if (!payload.userId || !payload.name || !Array.isArray(payload.nodes)) {
        res.status(400).json({
          error: "userId, name, and nodes are required",
        });
        return;
      }

      if (!isValidUuid(payload.userId)) {
        res.status(400).json({ error: "userId must be a valid UUID" });
        return;
      }

      if (payload.name.length > 200) {
        res.status(400).json({ error: "name exceeds maximum length" });
        return;
      }

      const workflow = await workflowService.createWorkflow({
        userId: payload.userId,
        name: payload.name,
        nodes: payload.nodes,
        edges: payload.edges ?? [],
      });

      res.status(201).json(workflow);
    } catch (error) {
      console.error("Failed to create workflow", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  async getWorkflow(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const workflowService = this.container.get<WorkflowService>(DEPENDENCIES.WORKFLOW_SERVICE);
      const workflowId = getParamAsString(req.params.workflowId);

      if (!workflowId || !isValidUuid(workflowId)) {
        res.status(400).json({ error: "workflowId must be a valid UUID" });
        return;
      }

      const workflow = await workflowService.getWorkflow(workflowId);

      if (!workflow) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      res.json(workflow);
    } catch (error) {
      console.error("Failed to get workflow", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
}
