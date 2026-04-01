import { Worker } from "bullmq"
import { ExecutionEngine } from "@repo/engine"

const worker = new Worker("workflow", async job => {
  const engine = new ExecutionEngine()
  await engine.run(job.data)
})
