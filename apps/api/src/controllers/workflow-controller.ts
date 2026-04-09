import type { WorkflowNode, WorkflowEdge } from "@repo/types";
import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { IHttpRequest, IHttpResponse } from "../di/http-handler";
import type { WorkflowService } from "../services/workflow-service";
import { ValidationError, NotFoundError } from "../errors";
import { getParamAsString, isValidUuid } from "./validation";

export class WorkflowController {
  constructor(private readonly container: Container) {}

  async createWorkflow(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const workflowService = this.container.get<WorkflowService>(DEPENDENCIES.WORKFLOW_SERVICE);
    const payload = req.body as {
      userId?: string;
      name?: string;
      nodes?: WorkflowNode[];
      edges?: WorkflowEdge[];
    };

    // Validation - throws ValidationError
    if (!payload.userId || !payload.name || !Array.isArray(payload.nodes)) {
      throw new ValidationError("userId, name, and nodes are required");
    }

    if (!isValidUuid(payload.userId)) {
      throw new ValidationError("userId must be a valid UUID");
    }

    if (payload.name.length > 200) {
      throw new ValidationError("Name exceeds maximum length (200 characters)");
    }

    const workflow = await workflowService.createWorkflow({
      userId: payload.userId,
      name: payload.name,
      nodes: payload.nodes,
      edges: payload.edges ?? [],
    });

    res.status(201).json(workflow);
  }

  async getWorkflow(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const workflowService = this.container.get<WorkflowService>(DEPENDENCIES.WORKFLOW_SERVICE);
    const workflowId = getParamAsString(req.params.workflowId);

    // Validation - throws ValidationError
    if (!workflowId || !isValidUuid(workflowId)) {
      throw new ValidationError("workflowId must be a valid UUID");
    }

    const workflow = await workflowService.getWorkflow(workflowId);

    if (!workflow) {
      throw new NotFoundError("Workflow", workflowId);
    }

    res.json(workflow);
  }
}
