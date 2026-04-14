# Dependency Injection Module

This module provides a structured and organized dependency injection system for the API. It follows a clear separation of concerns with subdirectories for different aspects of DI management.

## Directory Structure

```
di/
├── core/              # Container and dependency definitions
│   ├── container.ts   # DIContainer class and DEPENDENCIES keys
│   └── index.ts       # Public exports
├── registration/      # Application initialization
│   ├── bootstrap.ts   # initializeApp and setupRoutes functions
│   └── index.ts       # Public exports
├── adapters/          # HTTP abstraction layer
│   ├── http-handler.ts   # HTTP interfaces and contracts
│   ├── express-adapter.ts # Express implementation
│   └── index.ts          # Public exports
├── helpers/           # Dependency accessor functions
│   ├── dependency-helpers.ts # Typed helper functions
│   └── index.ts              # Public exports
├── index.ts           # Main barrel export (imports from subdirectories)
└── README.md          # This file
```

## Modules Overview

### Core (`./core`)
Contains the central DI container and dependency key definitions.

**Key Exports:**
- `Container` - The main DI container class
- `DEPENDENCIES` - Enum-like object with all registered dependency keys

**Usage:**
```typescript
import { Container, DEPENDENCIES } from "./di/core";

const container = new Container();
container.register(DEPENDENCIES.DATABASE, db);
```

### Registration (`./registration`)
Handles application initialization and route setup with full dependency wiring.

**Key Exports:**
- `initializeApp()` - Initializes all infrastructure (DB, Redis, Queue, Services, etc.)
- `setupRoutes()` - Registers all routes with their controllers

**Usage:**
```typescript
import { initializeApp, setupRoutes } from "./di/registration";

const container = new Container();
await initializeApp(container, env);
setupRoutes(httpHandler, controllers);
```

### Adapters (`./adapters`)
Provides HTTP abstraction layer allowing easy swapping of HTTP frameworks.

**Key Exports:**
- `IHttpHandler` - HTTP handler interface
- `IHttpRequest` - Request interface
- `IHttpResponse` - Response interface
- `IRouter` - Router interface
- `ExpressHttpHandler` - Express.js implementation

**Usage:**
```typescript
import { ExpressHttpHandler } from "./di/adapters";

const httpHandler = new ExpressHttpHandler();
```

### Helpers (`./helpers`)
Provides typed accessor functions for retrieving dependencies from the container.

**Key Exports:**
- `getBcrypt()` - Get bcryptjs library
- `getAxios()` - Get axios HTTP client
- `getLogger()` - Get Winston logger
- `getIORedis()` - Get IORedis library
- `getDatabase()` - Get database instance
- `getDatabaseClient()` - Get database client
- `getRedis()` - Get Redis client
- `getWorkflowQueue()` - Get workflow queue

**Usage:**
```typescript
import { getLogger, getBcrypt } from "./di/helpers";

export class UserService {
  constructor(private container: Container) {}

  async hashPassword(password: string): Promise<string> {
    const bcrypt = getBcrypt(this.container);
    return bcrypt.hash(password, 10);
  }

  log(message: string): void {
    const logger = getLogger(this.container);
    logger.info(message);
  }
}
```

## Dependency Keys

Available in `DEPENDENCIES`:

**Infrastructure:**
- `DATABASE` - Database instance
- `DATABASE_CLIENT` - Database client
- `REDIS` - Redis client
- `WORKFLOW_QUEUE` - Workflow queue

**Services:**
- `USER_SERVICE` - User service
- `WORKFLOW_SERVICE` - Workflow service
- `EXECUTION_SERVICE` - Execution service
- `PROGRESS_SERVICE` - Progress service

**Environment:**
- `ENV` - Environment configuration

**Third-party:**
- `BCRYPT` - bcryptjs library
- `AXIOS` - axios HTTP client
- `LOGGER` - Winston logger
- `IOREDIS` - IORedis library

## Usage Examples

### In Controllers
```typescript
import { Container } from "./di/core";
import { getDatabase, getLogger } from "./di/helpers";

export class UserController {
  constructor(private container: Container) {}

  async getUser(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const logger = getLogger(this.container);
    const db = getDatabase(this.container);
    
    logger.info("Fetching user");
    // ... implementation
  }
}
```

### In Services
```typescript
import { Container, DEPENDENCIES } from "./di/core";
import { getBcrypt, getAxios } from "./di/helpers";

export class AuthService {
  constructor(private container: Container) {}

  async authenticate(username: string, password: string): Promise<boolean> {
    const bcrypt = getBcrypt(this.container);
    // ... implementation
  }

  async fetchRemoteData(url: string): Promise<any> {
    const axios = getAxios(this.container);
    const response = await axios.get(url);
    return response.data;
  }
}
```

### In Main App
```typescript
import { getApiEnv } from "./config/env";
import {
  Container,
  ExpressHttpHandler,
  initializeApp,
  setupRoutes,
} from "./di";

async function bootstrap(): Promise<void> {
  const env = getApiEnv();
  const container = new Container();

  await initializeApp(container, env);

  const httpHandler = new ExpressHttpHandler();
  setupRoutes(httpHandler, { /* controllers */ });

  await httpHandler.listen(env.port, () => {
    console.log(`API running on port ${env.port}`);
  });
}

bootstrap().catch(console.error);
```

## Benefits of This Structure

1. **Clear Separation of Concerns** - Each module has a single responsibility
2. **Easy to Navigate** - Logical organization makes code discovery simple
3. **Scalability** - Easy to add new dependencies or modules
4. **Testability** - Isolated modules are easier to test
5. **Maintainability** - Changes to one area don't affect others
6. **Type Safety** - Full TypeScript support with typed accessors
7. **Framework Agnostic** - HTTP layer abstraction allows framework swapping

## Adding New Dependencies

To add a new dependency:

1. Add the key to `DEPENDENCIES` in `./core/container.ts`
2. Register it in `initializeApp()` in `./registration/bootstrap.ts`
3. Create a helper function in `./helpers/dependency-helpers.ts`
4. Export the new helper from `./helpers/index.ts`
5. Use it in your services/controllers

## Key Decisions

- **Subdirectory Organization** - Reduces file count and improves discoverability
- **Barrel Exports** - Each subdirectory has an index.ts for clean imports
- **Main Index Re-export** - Single import source for all DI functionality
- **Helper Functions** - Type-safe, convenient dependency access
- **HTTP Abstraction** - Allows future framework migrations
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
