import express from "express";
import { Queue } from "bullmq";
import { createClient } from "redis";

const app = express();
app.use(express.json());

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

redis.connect();

const workflowQueue = new Queue("workflow", {
  connection: redis as any,
});

// Map to track SSE connections by workflowId
const sseConnections = new Map<string, Set<any>>();

// POST /run - Create workflow job
app.post("/run", async (req, res) => {
  try {
    const workflow = req.body;
    const runId = `${workflow.id}-${Date.now()}`;

    // Add job to queue
    const job = await workflowQueue.add("execute", workflow, {
      jobId: runId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    res.json({
      status: "queued",
      runId,
      jobId: job.id,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /run/:runId/events - SSE endpoint for workflow progress
app.get("/run/:runId/events", async (req, res) => {
  const { runId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Extract workflowId from runId (format: {workflowId}-{timestamp})
  const workflowId = runId.split("-").slice(0, -1).join("-");

  // Track this connection
  if (!sseConnections.has(workflowId)) {
    sseConnections.set(workflowId, new Set());
  }
  sseConnections.get(workflowId)!.add(res);

  // Subscribe to Redis pub/sub channel
  const subscriber = redis.duplicate();
  await subscriber.connect();

  await subscriber.subscribe(
    `workflow:${workflowId}:progress`,
    (message) => {
      const event = JSON.parse(message);
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Close connection after workflow completion
      if (event.type === "workflow-completed") {
        res.end();
        subscriber.unsubscribe().catch(console.error);
        subscriber.quit().catch(console.error);
      }
    }
  );

  // Handle client disconnect
  req.on("close", async () => {
    sseConnections.get(workflowId)?.delete(res);
    try {
      await subscriber.unsubscribe();
      await subscriber.quit();
    } catch (e) {
      // Already disconnected
    }
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", runId })}\n\n`);
});

// GET /run/:runId/status - Get job status
app.get("/run/:runId/status", async (req, res) => {
  try {
    const { runId } = req.params;
    const job = await workflowQueue.getJob(runId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    res.json({
      runId,
      jobId: job.id,
      state,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
  console.log("POST /run - Create workflow job");
  console.log("GET /run/:runId/events - Stream workflow progress (SSE)");
  console.log("GET /run/:runId/status - Get job status");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await redis.quit();
  process.exit(0);
});
