import { getApiEnv } from "./config/env";
import { Container, ExpressHttpHandler, initializeApp, setupRoutes } from "./di";
import { UserController } from "./controllers/user-controller";
import { WorkflowController } from "./controllers/workflow-controller";
import { ExecutionController } from "./controllers/execution-controller";

async function bootstrap(): Promise<void> {
  const env = getApiEnv();

  // Initialize DI container
  const container = new Container();

  // Bootstrap application dependencies
  const { databaseClient, redis, workflowQueue } = await initializeApp(container, env);

  // Create controllers with container for DI
  const userController = new UserController(container);
  const workflowController = new WorkflowController(container);
  const executionController = new ExecutionController(container);

  // Create HTTP handler (Express adapter)
  const httpHandler = new ExpressHttpHandler();
  
  // Setup routes
  setupRoutes(httpHandler, {
    userController,
    workflowController,
    executionController,
  });

  // Start server
  await httpHandler.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
    console.log("POST /users - Create or return user");
    console.log("POST /workflows - Create workflow and nodes");
    console.log("GET /workflows/:workflowId - Get workflow graph");
    console.log("POST /workflows/:workflowId/run - Queue persisted workflow");
    console.log("POST /run - Queue persisted workflow (legacy)");
    console.log("GET /run/:runId/events - Stream workflow progress (SSE)");
    console.log("GET /run/:runId/status - Get job status");
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully...");
    await workflowQueue.close();
    await redis.quit();
    await databaseClient.close();
    await httpHandler.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap API", error);
  process.exit(1);
});
