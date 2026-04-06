import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { IHttpRequest, IHttpResponse } from "../di/http-handler";
import type { ExecutionService } from "../services/execution-service";
import type { ProgressService } from "../services/progress-service";
import { getParamAsString, isValidUuid } from "./validation";

export class ExecutionController {
  constructor(private readonly container: Container) {}

  async queueRun(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
      const workflowId = getParamAsString(req.params.workflowId);

      if (!workflowId || !isValidUuid(workflowId)) {
        res.status(400).json({ error: "workflowId must be a valid UUID" });
        return;
      }

      const queued = await executionService.queueRun(workflowId);
      res.json(queued);
    } catch (error) {
      console.error("Failed to queue workflow run", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  async queueRunLegacy(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
      const workflow = req.body as { workflowId?: string; id?: string };
      const workflowId = workflow.workflowId ?? workflow.id;

      if (!workflowId || !isValidUuid(workflowId)) {
        res.status(400).json({ error: "workflowId must be a valid UUID" });
        return;
      }

      const queued = await executionService.queueRun(workflowId);
      res.json(queued);
    } catch (error) {
      console.error("Failed to queue legacy workflow run", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  async streamRunProgress(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const progressService = this.container.get<ProgressService>(DEPENDENCIES.PROGRESS_SERVICE);
      const runId = getParamAsString(req.params.runId);

      if (!runId || runId.length > 120) {
        res.status(400).json({ error: "runId is invalid" });
        return;
      }

      await progressService.streamRunProgress(runId, res as any);
    } catch (error) {
      console.error("Failed to stream run progress", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  async getRunStatus(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const executionService = this.container.get<ExecutionService>(DEPENDENCIES.EXECUTION_SERVICE);
      const runId = getParamAsString(req.params.runId);

      if (!runId || runId.length > 120) {
        res.status(400).json({ error: "runId is invalid" });
        return;
      }

      const status = await executionService.getRunStatus(runId);

      if (!status) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json(status);
    } catch (error) {
      console.error("Failed to get run status", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
}
