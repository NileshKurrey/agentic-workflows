import { Router } from "express";
import type { WorkflowRunService } from "../services/workflow-run-service";
import type { SseProgressService } from "../services/sse-progress-service";
import type { WorkflowDefinitionService } from "../services/workflow-definition-service";
import type { WorkflowNode, WorkflowEdge } from "@repo/types";

interface Dependencies {
  workflowRunService: WorkflowRunService;
  sseProgressService: SseProgressService;
  workflowDefinitionService: WorkflowDefinitionService;
}

export function createWorkflowRouter(deps: Dependencies): Router {
  const router = Router();

  router.post("/users", async (req, res) => {
    try {
      const payload = req.body as { email?: string; name?: string };

      if (!payload.email) {
        res.status(400).json({ error: "email is required" });
        return;
      }

      const user = await deps.workflowDefinitionService.createUser({
        email: payload.email,
        name: payload.name,
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.post("/workflows", async (req, res) => {
    try {
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

      const workflow = await deps.workflowDefinitionService.createWorkflow({
        userId: payload.userId,
        name: payload.name,
        nodes: payload.nodes,
        edges: payload.edges ?? [],
      });

      res.status(201).json(workflow);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/workflows/:workflowId", async (req, res) => {
    try {
      const workflow = await deps.workflowDefinitionService.getWorkflow(req.params.workflowId);

      if (!workflow) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      res.json(workflow);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.post("/workflows/:workflowId/run", async (req, res) => {
    try {
      const queued = await deps.workflowRunService.queueRun(req.params.workflowId);
      res.json(queued);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.post("/run", async (req, res) => {
    try {
      const workflow = req.body as { workflowId?: string; id?: string };
      const workflowId = workflow.workflowId ?? workflow.id;

      if (!workflowId) {
        res.status(400).json({ error: "workflowId is required" });
        return;
      }

      const queued = await deps.workflowRunService.queueRun(workflowId);
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
