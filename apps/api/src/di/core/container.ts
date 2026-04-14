import type { Database, DatabaseClient } from "@repo/db";
import type { WorkflowQueue } from "../../queue/workflow-queue";
import type { RedisClient } from "../../connections/redis";
import type { UserService } from "../../services/user-service";
import type { WorkflowService } from "../../services/workflow-service";
import type { ExecutionService } from "../../services/execution-service";
import type { ProgressService } from "../../services/progress-service";

/**
 * Dependency Injection Container
 * Manages all singleton dependencies for the application
 */
export class Container {
  private dependencies: Map<string, any> = new Map();

  /**
   * Register a singleton dependency
   */
  register<T>(key: string, value: T): void {
    this.dependencies.set(key, value);
  }

  /**
   * Retrieve a dependency
   */
  get<T>(key: string): T {
    if (!this.dependencies.has(key)) {
      throw new Error(`Dependency not registered: ${key}`);
    }
    return this.dependencies.get(key) as T;
  }

  /**
   * Check if a dependency is registered
   */
  has(key: string): boolean {
    return this.dependencies.has(key);
  }

  /**
   * Clear all dependencies
   */
  clear(): void {
    this.dependencies.clear();
  }
}

/**
 * Core dependency keys
 */
export const DEPENDENCIES = {
  // Infrastructure
  DATABASE: "database",
  DATABASE_CLIENT: "databaseClient",
  REDIS: "redis",
  WORKFLOW_QUEUE: "workflowQueue",

  // Services
  USER_SERVICE: "userService",
  WORKFLOW_SERVICE: "workflowService",
  EXECUTION_SERVICE: "executionService",
  PROGRESS_SERVICE: "progressService",

  // Environment
  ENV: "env",

  // Third-party utilities
  BCRYPT: "bcrypt",
  AXIOS: "axios",
  LOGGER: "logger",
  IOREDIS: "ioredis",
} as const;
