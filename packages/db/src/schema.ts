import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  text,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("PENDING"),
  edges: jsonb("edges").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").notNull(),
  input: jsonb("input"),
  policy: jsonb("policy"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: text("run_id").notNull().unique(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  context: jsonb("context").notNull().default({}),
  failedNodes: jsonb("failed_nodes").notNull().default([]),
  error: text("error"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nodeResults = pgTable("node_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  executionId: uuid("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  nodeType: text("node_type").notNull(),
  success: boolean("success").notNull(),
  attempts: integer("attempts").notNull(),
  duration: integer("duration").notNull(),
  data: jsonb("data"),
  error: text("error"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  nodes: many(nodes),
  executions: many(workflowExecutions),
}));

export const nodesRelations = relations(nodes, ({ one }) => ({
  workflow: one(workflows, {
    fields: [nodes.workflowId],
    references: [workflows.id],
  }),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  nodeResults: many(nodeResults),
}));

export const nodeResultsRelations = relations(nodeResults, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [nodeResults.executionId],
    references: [workflowExecutions.id],
  }),
}));

export const schema = {
  users,
  workflows,
  nodes,
  workflowExecutions,
  nodeResults,
};