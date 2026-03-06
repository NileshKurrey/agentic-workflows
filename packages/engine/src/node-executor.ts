export interface NodeExecutor {
  execute(input: any, config: any): Promise<any>
}