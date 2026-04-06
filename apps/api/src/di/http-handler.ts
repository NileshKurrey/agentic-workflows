/**
 * Abstraction layer for HTTP handlers
 * Allows swapping Express with other frameworks (Fastify, Hono, etc.)
 */

export interface IHttpRequest {
  body: any;
  params: Record<string, string | string[]>;
  query: Record<string, any>;
  headers: Record<string, any>;
}

export interface IHttpResponse {
  status(code: number): IHttpResponse;
  json(data: any): void;
  end(): void;
  setHeader(key: string, value: any): IHttpResponse;
  write(data: any): void;
}

export interface IRouter {
  post(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void;
  get(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void;
  put(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void;
  delete(path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void;
  use(path: string, router: IRouter): void;
  use(middleware: (req: IHttpRequest, res: IHttpResponse, next: () => void) => void): void;
}

export interface IHttpHandler {
  createRouter(): IRouter;
  useRouter(path: string, router: IRouter): void;
  listen(port: number, callback: () => void): Promise<void>;
  close(): Promise<void>;
}

/**
 * Initialize HTTP handler
 */
export type HttpHandlerFactory = () => IHttpHandler;
