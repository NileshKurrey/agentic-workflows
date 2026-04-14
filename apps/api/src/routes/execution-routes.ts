import type { IRouter } from "../di/adapters/http-handler";
import { ExecutionController } from "../controllers/execution-controller";

export function createExecutionRoutes(router: IRouter, executionController: ExecutionController): void {
  router.post("/workflows/:workflowId/run", (req, res) => executionController.queueRun(req, res));

  router.post("/run", (req, res) => executionController.queueRunLegacy(req, res));

  router.get("/run/:runId/events", (req, res) => executionController.streamRunProgress(req, res));

  router.get("/run/:runId/status", (req, res) => executionController.getRunStatus(req, res));
}
