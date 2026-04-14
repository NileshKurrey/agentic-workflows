import type { IRouter } from "../di/adapters/http-handler";
import { WorkflowController } from "../controllers/workflow-controller";

export function createWorkflowRoutes(router: IRouter, workflowController: WorkflowController): void {
  router.post("/", (req, res) => workflowController.createWorkflow(req, res));

  router.get("/:workflowId", (req, res) => workflowController.getWorkflow(req, res));
}
