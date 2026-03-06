import { ExecutionEngine } from "./execution-engine"

const engine = new ExecutionEngine()

const workflow = {
  id: "1",
  nodes: [
    {
      id: "node1",
      type: "http",
      config: {
        url: "https://jsonplaceholder.typicode.com/todos/1"
      }
    }
  ]
}

engine.run(workflow).then(console.log)