import { Router } from "express";
import type { WorkflowRunService } from "../services/workflow-run-service";
import type { SseProgressService } from "../services/sse-progress-service";

interface Dependencies {
  workflowRunService: WorkflowRunService;
  sseProgressService: SseProgressService;
}

export function createWorkflowRouter(deps: Dependencies): Router {
  const router = Router();

  router.post("/run", async (req, res) => {
    try {
      const workflow = req.body as { id?: string; [key: string]: unknown };

      if (!workflow.id) {
        res.status(400).json({ error: "Workflow id is required" });
        return;
      }

      const queued = await deps.workflowRunService.queueRun(workflow as { id: string; [key: string]: unknown });
      res.json(queued);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/run/:runId/events", async (req, res) => {
    try {
      await deps.sseProgressService.streamRunProgress(req.params.runId, res);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/run/:runId/status", async (req, res) => {
    try {
      const status = await deps.workflowRunService.getRunStatus(req.params.runId);

      if (!status) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
