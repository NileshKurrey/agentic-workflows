import type { Container } from "../di/core/container";
import { DEPENDENCIES } from "../di/core/container";
import type { IHttpRequest, IHttpResponse } from "../di/adapters/http-handler";
import type { ExecutionService } from "../services/execution-service";
import type { ProgressService } from "../services/progress-service";
import { ValidationError, NotFoundError } from "../errors";
import { getParamAsString, isValidUuid } from "./validation";

export class ExecutionController {
  constructor(private readonly container: Container) {}

  async queueRun(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
    const workflowId = getParamAsString(req.params.workflowId);

    // Validation - throws ValidationError
    if (!workflowId || !isValidUuid(workflowId)) {
      throw new ValidationError("workflowId must be a valid UUID");
    }

    const queued = await executionService.queueRun(workflowId);
    res.json(queued);
  }

  async queueRunLegacy(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
    const workflow = req.body as { workflowId?: string; id?: string };
    const workflowId = workflow.workflowId ?? workflow.id;

    // Validation - throws ValidationError
    if (!workflowId || !isValidUuid(workflowId)) {
      throw new ValidationError("workflowId must be a valid UUID");
    }

    const queued = await executionService.queueRun(workflowId);
    res.json(queued);
  }

  async streamRunProgress(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const progressService = this.container.get<ProgressService>(DEPENDENCIES.PROGRESS_SERVICE);
    const runId = getParamAsString(req.params.runId);

    // Validation - throws ValidationError
    if (!runId || runId.length > 120) {
      throw new ValidationError("runId is invalid");
    }

    await progressService.streamRunProgress(runId, res as any);
  }

  async getRunStatus(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
    const runId = getParamAsString(req.params.runId);

    // Validation - throws ValidationError
    if (!runId || runId.length > 120) {
      throw new ValidationError("runId is invalid");
    }

    const status = await executionService.getRunStatus(runId);

    if (!status) {
      throw new NotFoundError("Job", runId);
    }

    res.json(status);
  }
}
