/**
 * Frontend example for consuming real-time workflow node execution events
 * This hooks into the API SSE endpoint to receive live progress updates
 */

import { useState, useCallback } from "react";

interface NodeExecutedEvent {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  success: boolean;
  attempts: number;
  duration: number;
  error?: string;
  timestamp: string;
}

interface WorkflowCompletedEventData {
  workflowId: string;
  status: "COMPLETED" | "FAILED";
  failedNodes: Array<{
    nodeId: string;
    nodeType: string;
    error: string;
  }>;
  duration: number;
  error?: string;
  timestamp: string;
}

type WorkflowEvent = 
  | { type: "connected"; runId: string }
  | { type: "node-executed"; data: NodeExecutedEvent }
  | { type: "workflow-completed"; data: WorkflowCompletedEventData };

function useWorkflowExecution() {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [nodeProgress, setNodeProgress] = useState<Map<string, NodeExecutedEvent>>(new Map());
  const [failedNodes, setFailedNodes] = useState<Array<{nodeId: string; nodeType: string; error: string}>>(  []);
  const [error, setError] = useState<string | null>(null);

  const startWorkflow = useCallback(async (workflow: Record<string, unknown>) => {
    setStatus("running");
    setNodeProgress(new Map());
    setFailedNodes([]);
    setError(null);

    try {
      // 1. Queue the workflow
      const response = await fetch("http://localhost:4000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        throw new Error(`Failed to start workflow: ${response.statusText}`);
      }

      const { runId: newRunId } = await response.json();
      setRunId(newRunId);

      // 2. Connect to SSE stream for progress updates
      const eventSource = new EventSource(
        `http://localhost:4000/run/${newRunId}/events`
      );

      eventSource.onmessage = (event) => {
        const message: WorkflowEvent = JSON.parse(event.data);

        if (message.type === "node-executed") {
          const nodeEvent = message.data;
          setNodeProgress((prev) => {
            const updated = new Map(prev);
            updated.set(nodeEvent.nodeId, nodeEvent);
            return updated;
          });

          console.log(
            `✨ Node ${nodeEvent.nodeId} (${nodeEvent.nodeType}): ${
              nodeEvent.success ? "✅ success" : "❌ failed"
            } in ${nodeEvent.duration}ms`
          );
        }

        if (message.type === "workflow-completed") {
          const completedEvent = message.data;
          setStatus(completedEvent.status === "COMPLETED" ? "completed" : "failed");
          setFailedNodes(completedEvent.failedNodes);

          if (completedEvent.error) {
            setError(completedEvent.error);
          }

          console.log(
            `🏁 Workflow ${completedEvent.status} in ${completedEvent.duration}ms`
          );

          eventSource.close();
        }
      };

      eventSource.onerror = (err) => {
        setError("Connection failed");
        setStatus("failed");
        eventSource.close();
        console.error("SSE error:", err);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("failed");
    }
  }, []);

  return {
    runId,
    status,
    nodeProgress,
    failedNodes,
    error,
    startWorkflow,
  };
}

// components/WorkflowExecutor.tsx
import React from "react";

export function WorkflowExecutor() {
  const { status, nodeProgress, failedNodes, error, startWorkflow } = useWorkflowExecution();

  const handleRun = async () => {
    const workflow = {
      id: "demo-workflow",
      name: "Demo Workflow",
      status: "PENDING",
      nodes: [
        {
          id: "trigger-1",
          name: "Trigger",
          type: "TRIGGER",
          config: { triggerType: "manual" },
        },
        {
          id: "http-1",
          name: "Fetch Data",
          type: "HTTP",
          config: {
            url: "https://api.example.com/data",
            method: "GET",
            timeout: 10000,
          },
        },
        {
          id: "log-1",
          name: "Log Result",
          type: "LOG",
          config: { level: "info", prefix: "Result" },
        },
      ],
      edges: [
        { from: "trigger-1", to: "http-1" },
        { from: "http-1", to: "log-1" },
      ],
    };

    await startWorkflow(workflow);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Executor</h1>

      <button
        onClick={handleRun}
        disabled={status === "running"}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {status === "running" ? "Running..." : "Start Workflow"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {status !== "idle" && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">
            Status: <span className="font-normal">{status}</span>
          </h2>

          <h3 className="text-md font-semibold mb-2">Node Execution Progress</h3>
          <div className="space-y-2">
            {Array.from(nodeProgress.values()).map((event) => (
              <div
                key={event.nodeId}
                className={`p-3 rounded border-l-4 ${
                  event.success
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <div className="font-semibold">{event.nodeId}</div>
                <div className="text-sm text-gray-600">
                  Type: {event.nodeType}
                </div>
                <div className="text-sm text-gray-600">
                  Status: {event.success ? "✅ Success" : "❌ Failed"}
                </div>
                <div className="text-sm text-gray-600">
                  Duration: {event.duration}ms (Attempt {event.attempts})
                </div>
                {event.error && (
                  <div className="text-sm text-red-600">Error: {event.error}</div>
                )}
              </div>
            ))}
          </div>

          {failedNodes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2 text-red-600">
                Failed Nodes
              </h3>
              <div className="space-y-2">
                {failedNodes.map((node) => (
                  <div
                    key={node.nodeId}
                    className="p-3 bg-red-50 border border-red-200 rounded"
                  >
                    <div className="font-semibold">{node.nodeId}</div>
                    <div className="text-sm text-gray-600">
                      Type: {node.nodeType}
                    </div>
                    <div className="text-sm text-red-600">
                      Error: {node.error}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
