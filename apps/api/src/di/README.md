# Dependency Injection & HTTP Handler Architecture

## Overview

This architecture decouples the HTTP framework (Express) from the business logic, making it easy to swap frameworks in the future (e.g., Fastify, Hono, etc.).

## Components

### 1. **Container** (`di/container.ts`)
- **Purpose**: Manages all singleton dependencies
- **Usage**: Register and retrieve dependencies throughout the application
- **Benefits**: Centralized dependency management, easy testing with mocks

```typescript
const container = new Container();
container.register(DEPENDENCIES.USER_SERVICE, userService);
const userService = container.get(DEPENDENCIES.USER_SERVICE);
```

### 2. **HTTP Handler Abstraction** (`di/http-handler.ts`)
- **Interfaces**:
  - `IHttpRequest`: Abstraction for request objects
  - `IHttpResponse`: Abstraction for response objects
  - `IRouter`: Abstraction for router operations
  - `IHttpHandler`: Main interface for HTTP handlers

- **Benefits**: Not tied to Express specifics, framework-agnostic

### 3. **Express Adapter** (`di/express-adapter.ts`)
- **Class**: `ExpressHttpHandler`
- **Implements**: `IHttpHandler` interface
- **Usage**: Adapts Express to the abstraction layer

```typescript
const httpHandler = new ExpressHttpHandler();
await httpHandler.listen(3000, () => console.log("Server running"));
```

### 4. **Bootstrap** (`di/bootstrap.ts`)
- **Functions**:
  - `initializeApp()`: Sets up all dependencies in the container
  - `setupRoutes()`: Registers routes with the HTTP handler

- **Usage**: Called from `index.ts` to initialize the application

## Adding a New HTTP Handler

To add support for Fastify (or any other framework):

### Step 1: Create Fastify Adapter
```typescript
// di/fastify-adapter.ts
import Fastify from "fastify";
import type { IHttpHandler, IHttpRequest, IHttpResponse, IRouter } from "./http-handler";

export class FastifyHttpHandler implements IHttpHandler {
  private fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify();
  }

  createRouter(): IRouter {
    // Implement router abstraction for Fastify
  }

  async listen(port: number, callback: () => void): Promise<void> {
    await this.fastify.listen({ port }, callback);
  }

  async close(): Promise<void> {
    await this.fastify.close();
  }
}
```

### Step 2: Update index.ts
```typescript
// Change from:
const httpHandler = new ExpressHttpHandler();

// To:
const httpHandler = new FastifyHttpHandler();

// Rest stays the same!
```

## Default Dependencies

Key dependencies managed by the container:

| Key | Type | Description |
|-----|------|-------------|
| `DATABASE` | `Database` | Drizzle database instance |
| `REDIS` | `RedisClient` | Redis connection |
| `WORKFLOW_QUEUE` | `WorkflowQueue` | BullMQ queue |
| `USER_SERVICE` | `UserService` | User operations |
| `WORKFLOW_SERVICE` | `WorkflowService` | Workflow operations |
| `EXECUTION_SERVICE` | `ExecutionService` | Execution management |
| `PROGRESS_SERVICE` | `ProgressService` | Progress streaming |

## Accessing Dependencies

In any service or controller:

```typescript
const userService = container.get(DEPENDENCIES.USER_SERVICE);
```

## Testing with DI

Easy to mock dependencies for tests:

```typescript
const mockUserService = {
  createUser: jest.fn().mockResolvedValue({ id: "123", email: "test@example.com" }),
};

const container = new Container();
container.register(DEPENDENCIES.USER_SERVICE, mockUserService);

// Pass mocked container to your test code
```

## Architecture Benefits

✅ **Framework Independent**: Swap HTTP frameworks without touching business logic
✅ **Testable**: Easy dependency injection for unit tests
✅ **Maintainable**: Clear separation of concerns
✅ **Scalable**: Add new handlers/services without refactoring core code
✅ **Type Safe**: Full TypeScript support with proper interfaces
