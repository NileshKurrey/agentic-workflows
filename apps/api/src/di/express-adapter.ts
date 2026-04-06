import express, { Express, Request, Response } from "express";
import type { IHttpHandler, IHttpRequest, IHttpResponse, IRouter } from "./http-handler";

/**
 * Express adapter for IHttpHandler interface
 * Implements the HTTP abstraction using Express
 */

class ExpressRequest implements IHttpRequest {
  body: any;
  params: Record<string, string | string[]>;
  query: Record<string, any>;
  headers: Record<string, any>;

  constructor(req: Request) {
    this.body = req.body;
    this.params = req.params;
    this.query = req.query;
    this.headers = req.headers;
  }
}

class ExpressResponse implements IHttpResponse {
  constructor(private res: Response) {}

  status(code: number): IHttpResponse {
    this.res.status(code);
    return this;
  }

  setHeader(key: string, value: any): IHttpResponse {
    this.res.setHeader(key, value);
    return this;
  }

  json(data: any): void {
    this.res.json(data);
  }

  write(data: any): void {
    this.res.write(data);
  }

  end(): void {
    this.res.end();
  }
}

class ExpressRouter implements IRouter {
  constructor(private router: express.Router) {}

  getRouter(): express.Router {
    return this.router;
  }

  post(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void {
    this.router.post(path, async (req, res) => {
      try {
        await handler(new ExpressRequest(req), new ExpressResponse(res));
      } catch (error) {
        console.error("Unhandled POST route error", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  get(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void {
    this.router.get(path, async (req, res) => {
      try {
        await handler(new ExpressRequest(req), new ExpressResponse(res));
      } catch (error) {
        console.error("Unhandled GET route error", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  put(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void {
    this.router.put(path, async (req, res) => {
      try {
        await handler(new ExpressRequest(req), new ExpressResponse(res));
      } catch (error) {
        console.error("Unhandled PUT route error", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  delete(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void {
    this.router.delete(path, async (req, res) => {
      try {
        await handler(new ExpressRequest(req), new ExpressResponse(res));
      } catch (error) {
        console.error("Unhandled DELETE route error", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  }

  use(pathOrMiddleware: string | ((req: IHttpRequest, res: IHttpResponse, next: () => void) => void), router?: IRouter): void {
    if (typeof pathOrMiddleware === "string" && router) {
      const expressRouter = router as ExpressRouter;
      this.router.use(pathOrMiddleware, expressRouter.getRouter());
    } else if (typeof pathOrMiddleware === "function") {
      this.router.use((req, res, next) => {
        pathOrMiddleware(new ExpressRequest(req), new ExpressResponse(res), next);
      });
    }
  }
}

export class ExpressHttpHandler implements IHttpHandler {
  private app: Express;
  private readonly rateLimitWindowMs = 60_000;
  private readonly rateLimitMaxRequests = 120;
  private readonly requestCounts = new Map<string, { count: number; windowStart: number }>();

  constructor() {
    this.app = express();
    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    this.app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      next();
    });

    this.app.use((req, res, next) => {
      const now = Date.now();
      const key = req.ip ?? "unknown";
      const existing = this.requestCounts.get(key);

      if (!existing || now - existing.windowStart > this.rateLimitWindowMs) {
        this.requestCounts.set(key, { count: 1, windowStart: now });
        next();
        return;
      }

      if (existing.count >= this.rateLimitMaxRequests) {
        res.status(429).json({ error: "Too many requests" });
        return;
      }

      existing.count += 1;
      next();
    });
  }

  createRouter(): IRouter {
    return new ExpressRouter(express.Router());
  }

  useRouter(path: string, router: IRouter): void {
    const expressRouter = router as ExpressRouter;
    this.app.use(path, expressRouter.getRouter());
  }

  async listen(port: number, callback: () => void): Promise<void> {
    return new Promise((resolve) => {
      const server = this.app.listen(port, () => {
        callback();
        resolve();
      });

      // Keep reference for cleanup
      (this.app as any).__server = server;
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = (this.app as any).__server;
      if (server) {
        server.close((err: Error | null) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }

  /**
   * Get underlying Express app for advanced usage
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Register an Express router directly
   */
  useExpressRouter(path: string, router: express.Router): void {
    this.app.use(path, router);
  }
}
