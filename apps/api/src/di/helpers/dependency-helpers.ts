import type { Container } from "../core/container";
import { DEPENDENCIES } from "../core/container";
import type bcryptjs from "bcryptjs";
import type axios from "axios";
import type winston from "winston";
import type IORedis from "ioredis";
import type { Database, DatabaseClient } from "@repo/db";
import type { RedisClient } from "../../connections/redis";
import type { WorkflowQueue } from "../../queue/workflow-queue";

/**
 * Dependency Helpers
 * Provides typed access to dependencies from the container
 */

export function getBcrypt(container: Container): typeof bcryptjs {
  return container.get<typeof bcryptjs>(DEPENDENCIES.BCRYPT);
}

export function getAxios(container: Container): typeof axios {
  return container.get<typeof axios>(DEPENDENCIES.AXIOS);
}

export function getLogger(container: Container): winston.Logger {
  return container.get<winston.Logger>(DEPENDENCIES.LOGGER);
}

export function getIORedis(container: Container): typeof IORedis {
  return container.get<typeof IORedis>(DEPENDENCIES.IOREDIS);
}

export function getDatabase(container: Container): Database {
  return container.get<Database>(DEPENDENCIES.DATABASE);
}

export function getDatabaseClient(container: Container): DatabaseClient {
  return container.get<DatabaseClient>(DEPENDENCIES.DATABASE_CLIENT);
}

export function getRedis(container: Container): RedisClient {
  return container.get<RedisClient>(DEPENDENCIES.REDIS);
}

export function getWorkflowQueue(container: Container): WorkflowQueue {
  return container.get<WorkflowQueue>(DEPENDENCIES.WORKFLOW_QUEUE);
}

/**
 * Example usage in a service:
 *
 * export class MyService {
 *   constructor(private container: Container) {}
 *
 *   async hashPassword(password: string): Promise<string> {
 *     const bcrypt = getBcrypt(this.container);
 *     return bcrypt.hash(password, 10);
 *   }
 *
 *   async fetchData(url: string): Promise<any> {
 *     const axios = getAxios(this.container);
 *     const response = await axios.get(url);
 *     return response.data;
 *   }
 *
 *   logInfo(message: string): void {
 *     const logger = getLogger(this.container);
 *     logger.info(message);
 *   }
 * }
 */
