import { ExecutionEngine } from "./execution-engine";
import type { Workflow } from "@repo/types";

const engine = new ExecutionEngine();

const workflow: Workflow = {
  id: "test-workflow-1",
  name: "Test Workflow",
  status: "PENDING",
  nodes: [
    {
      id: "trigger-1",
      name: "Manual Trigger",
      type: "TRIGGER",
      config: {
        triggerType: "manual",
      },
    },
    {
      id: "http-1",
      name: "Fetch Todo",
      type: "HTTP",
      config: {
        url: "https://jsonplaceholder.typicode.com/todos/1",
        method: "GET",
        timeout: 5000,
      },
    },
    {
      id: "log-1",
      name: "Log Result",
      type: "LOG",
      config: {
        level: "info",
        prefix: "API Response",
      },
    },
  ],
  edges: [
    { from: "trigger-1", to: "http-1" },
    { from: "http-1", to: "log-1" },
  ],
};

async function main() {
  console.log("Starting workflow test...\n");
  
  try {
    const result = await engine.run(workflow);
    console.log("\n=== Workflow Execution Result ===");
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Nodes executed: ${Object.keys(result.context).length}`);
    
    if (result.error) {
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error("Workflow failed:", error);
  }
}

main();