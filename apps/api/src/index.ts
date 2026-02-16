import express from "express"
import { ExecutionEngine } from "@repo/engine"

const app = express()
app.use(express.json())

const engine = new ExecutionEngine()

app.post("/run", async (req, res) => {
  await engine.execute(req.body)
  res.json({ status: "started" })
})

app.listen(4000, () => {
  console.log("API running on 4000")
})
