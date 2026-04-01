import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ExecutionEngine } from "./execution-engine.js";
import type { HttpNodeConfig, Workflow } from "@repo/types";

function buildBaseWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: "wf-1",
    name: "Workflow",
    status: "PENDING",
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
    ],
    edges: [],
    ...overrides,
  };
}

test("runs happy path workflow", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "log-1",
        name: "Logger",
        type: "LOG",
        config: { level: "info", prefix: "result" },
      },
    ],
    edges: [{ from: "trigger-1", to: "log-1" }],
  });

  const result = await engine.run(workflow);

  assert.equal(result.status, "COMPLETED");
  assert.equal(result.failedNodes.length, 0);
  assert.equal(result.context["trigger-1"]?.success, true);
  assert.equal(result.context["log-1"]?.success, true);
  assert.ok(result.context["trigger-1"]?.attempts >= 1);
});

test("fails validation when trigger is missing", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "log-1",
        name: "Logger",
        type: "LOG",
        config: { level: "info" },
      },
    ],
  });

  await assert.rejects(async () => {
    await engine.run(workflow);
  }, /exactly one trigger node/i);
});

test("fails validation on edge referencing unknown nodes", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    edges: [{ from: "trigger-1", to: "missing-node" }],
  });

  await assert.rejects(async () => {
    await engine.run(workflow);
  }, /unknown node/i);
});

test("waits for all currently queued parents before fan-in node execution", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "log-1",
        name: "Branch A",
        type: "LOG",
        config: { level: "info", prefix: "A" },
      },
      {
        id: "log-2",
        name: "Branch B",
        type: "LOG",
        config: { level: "info", prefix: "B" },
      },
      {
        id: "log-3",
        name: "Join",
        type: "LOG",
        config: { level: "info", prefix: "Join" },
      },
    ],
    edges: [
      { from: "trigger-1", to: "log-1" },
      { from: "trigger-1", to: "log-2" },
      { from: "log-1", to: "log-3" },
      { from: "log-2", to: "log-3" },
    ],
  });

  const result = await engine.run(workflow);
  const joinInput = result.context["log-3"]?.data as unknown[];

  assert.equal(result.status, "COMPLETED");
  assert.ok(Array.isArray(joinInput));
  assert.equal(joinInput.length, 2);
});

test("handles unsupported node type as failed execution", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "custom-1",
        name: "Custom",
        type: "FUNCTION",
        config: {},
      },
    ],
    edges: [{ from: "trigger-1", to: "custom-1" }],
  });

  const result = await engine.run(workflow);

  assert.equal(result.status, "FAILED");
  assert.equal(result.failedNodes.length, 1);
  assert.equal(result.failedNodes[0].nodeId, "custom-1");
});

test("supports continue-on-error mode", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "custom-1",
        name: "Custom",
        type: "FUNCTION",
        config: {},
      },
      {
        id: "log-1",
        name: "Logger",
        type: "LOG",
        config: { level: "info", prefix: "after" },
      },
    ],
    edges: [
      { from: "trigger-1", to: "custom-1" },
      { from: "custom-1", to: "log-1" },
    ],
  });

  const result = await engine.run(workflow, { continueOnError: true });

  assert.equal(result.status, "FAILED");
  assert.equal(result.failedNodes.length, 1);
  assert.equal(result.context["log-1"]?.success, true);
});

test("evaluates conditional edges", async () => {
  const engine = new ExecutionEngine();

  const workflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "http-1",
        name: "Http",
        type: "HTTP",
        config: {
          url: "http://localhost:0/placeholder",
          method: "GET",
        },
        input: { ok: true },
      },
      {
        id: "log-pass",
        name: "Pass",
        type: "LOG",
        config: { prefix: "pass" },
      },
      {
        id: "log-fail",
        name: "Fail",
        type: "LOG",
        config: { prefix: "fail" },
      },
    ],
    edges: [
      { from: "trigger-1", to: "http-1" },
      { from: "http-1", to: "log-pass", condition: "data.completed === true" },
      { from: "http-1", to: "log-fail", condition: "data.completed === false" },
    ],
  });

  const server = http.createServer((_: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ completed: true }));
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to acquire test server port");
  }

  const httpNode = workflow.nodes.find((node) => node.id === "http-1");
  if (!httpNode || httpNode.type !== "HTTP") {
    server.close();
    throw new Error("Missing HTTP node");
  }

  (httpNode.config as HttpNodeConfig).url = `http://127.0.0.1:${address.port}/todo`;

  try {
    const result = await engine.run(workflow);
    assert.equal(result.context["log-pass"]?.success, true);
    assert.equal(result.context["log-fail"], undefined);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test("retries and times out nodes", async () => {
  const engine = new ExecutionEngine();
  let callCount = 0;

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/slow") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }, 80);
      return;
    }

    callCount += 1;
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to acquire test server port");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  const retryWorkflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "http-1",
        name: "Http Retry",
        type: "HTTP",
        config: {
          url: `${baseUrl}/retry`,
          method: "GET",
          timeout: 500,
        },
        policy: {
          retries: 2,
          retryDelayMs: 1,
        },
      },
    ],
    edges: [{ from: "trigger-1", to: "http-1" }],
  });

  const timeoutWorkflow = buildBaseWorkflow({
    nodes: [
      {
        id: "trigger-1",
        name: "Trigger",
        type: "TRIGGER",
        config: { triggerType: "manual" },
      },
      {
        id: "http-1",
        name: "Http Timeout",
        type: "HTTP",
        config: {
          url: `${baseUrl}/slow`,
          method: "GET",
          timeout: 1000,
        },
        policy: {
          timeoutMs: 25,
        },
      },
    ],
    edges: [{ from: "trigger-1", to: "http-1" }],
  });

  try {
    const retryResult = await engine.run(retryWorkflow);
    assert.equal(retryResult.status, "FAILED");
    assert.equal(retryResult.context["http-1"]?.attempts, 3);
    assert.equal(callCount, 3);

    const timeoutResult = await engine.run(timeoutWorkflow);
    assert.equal(timeoutResult.status, "FAILED");
    assert.match(timeoutResult.context["http-1"]?.error ?? "", /timed out/i);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
