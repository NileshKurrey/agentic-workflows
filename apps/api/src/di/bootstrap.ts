import type { Container } from "./container";
import { DEPENDENCIES } from "./container";
import type { IHttpHandler } from "./http-handler";
import type { UserController } from "../controllers/user-controller";
import type { WorkflowController } from "../controllers/workflow-controller";
import type { ExecutionController } from "../controllers/execution-controller";
import { createUserRoutes, createWorkflowRoutes, createExecutionRoutes } from "../routes";
import { UserService } from "../services/user-service";
import { WorkflowService } from "../services/workflow-service";
import { ExecutionService } from "../services/execution-service";
import { ProgressService } from "../services/progress-service";

/**
 * Bootstrap application with dependency injection
 * Returns initialized infrastructure clients
 */
export async function initializeApp(container: Container, apiEnv: any) {
  // Infrastructure setup
  const { createDatabaseClient, WorkflowStore } = await import("@repo/db");
  const { createRedisConnection } = await import("../connections/redis");
  const { createWorkflowQueue } = await import("../queue/workflow-queue");

  // Initialize database
  const databaseClient = createDatabaseClient(apiEnv.databaseUrl);
  const workflowStore = new WorkflowStore(databaseClient.db);
  container.register(DEPENDENCIES.DATABASE_CLIENT, databaseClient);
  container.register(DEPENDENCIES.DATABASE, databaseClient.db);

  // Initialize Redis
  const redis = createRedisConnection(apiEnv.redisHost, apiEnv.redisPort);
  await redis.connect();
  container.register(DEPENDENCIES.REDIS, redis);

  // Initialize queue
  const workflowQueue = createWorkflowQueue(apiEnv.workflowQueueName, {
    connection: {
      host: apiEnv.redisHost,
      port: apiEnv.redisPort,
    },
  });
  container.register(DEPENDENCIES.WORKFLOW_QUEUE, workflowQueue);

  // Store the workflowStore in container
  container.register("workflowStore", workflowStore);

  // Initialize services with container for DI
  const userService = new UserService(container);
  const workflowService = new WorkflowService(container);
  const executionService = new ExecutionService(container);
  const progressService = new ProgressService(container);

  container.register(DEPENDENCIES.USER_SERVICE, userService);
  container.register(DEPENDENCIES.WORKFLOW_SERVICE, workflowService);
  container.register(DEPENDENCIES.EXECUTION_SERVICE, executionService);
  container.register(DEPENDENCIES.PROGRESS_SERVICE, progressService);

  // Register environment
  container.register(DEPENDENCIES.ENV, apiEnv);

  return { databaseClient, redis, workflowQueue };
}

/**
 * Setup routes with dependency injection
 */
export function setupRoutes(
  httpHandler: IHttpHandler,
  controllers: {
    userController: UserController;
    workflowController: WorkflowController;
    executionController: ExecutionController;
  },
): void {
  // Create sub-routers for each domain
  const userRouter = httpHandler.createRouter();
  const workflowRouter = httpHandler.createRouter();
  const executionRouter = httpHandler.createRouter();

  // Register routes with their routers
  createUserRoutes(userRouter, controllers.userController);
  createWorkflowRoutes(workflowRouter, controllers.workflowController);
  createExecutionRoutes(executionRouter, controllers.executionController);

  // Mount routers on httpHandler
  httpHandler.useRouter("/users", userRouter);
  httpHandler.useRouter("/workflows", workflowRouter);
  httpHandler.useRouter("", executionRouter);
}
