import { NodeExecutor } from "../node-executor";

export class HttpNode extends NodeExecutor {
  async execute(input: any, config: any): Promise<any> {
    const { url, method, headers, body } = config
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    })
    return response.json()
  }
}