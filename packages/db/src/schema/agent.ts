import { users } from "./auth";
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

export const agentThreadStatusEnum = pgEnum("agent_thread_status", ["active", "archived"]);
export const agentGenerationStatusEnum = pgEnum("agent_generation_status", ["pending", "ready", "failed"]);
export const agentMessageRoleEnum = pgEnum("agent_message_role", ["system", "user", "assistant", "tool"]);
export const agentRunStatusEnum = pgEnum("agent_run_status", ["running", "completed", "failed", "cancelled"]);
export const agentMemoryKindEnum = pgEnum("agent_memory_kind", ["rolling_summary", "fact", "preference", "task_state"]);

export const agentThreads = pgTable(
    "agent_threads",
    {
        id: text("id").primaryKey(),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        languageCode: text("language_code").notNull().default("vi"),
        status: agentThreadStatusEnum("status").notNull().default("active"),
        title: text("title").notNull().default("New chat"),
        titleStatus: agentGenerationStatusEnum("title_status").notNull().default("pending"),
        summary: text("summary"),
        summaryStatus: agentGenerationStatusEnum("summary_status").notNull().default("pending"),
        titleLockedByUser: boolean("title_locked_by_user").notNull().default(false),
        lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
        archivedAt: timestamp("archived_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date()),
    },
    (table) => [
        index("agent_threads_user_last_message_idx").on(table.createdByUserId, table.lastMessageAt),
        index("agent_threads_status_idx").on(table.status),
        index("agent_threads_language_code_idx").on(table.languageCode),
    ],
);

export const agentMessages = pgTable(
    "agent_messages",
    {
        id: text("id").primaryKey(),
        threadId: text("thread_id")
            .notNull()
            .references(() => agentThreads.id, { onDelete: "cascade" }),
        role: agentMessageRoleEnum("role").notNull(),
        partsJson: jsonb("parts_json").notNull(),
        modelProvider: text("model_provider"),
        modelId: text("model_id"),
        finishReason: text("finish_reason"),
        tokenUsageJson: jsonb("token_usage_json"),
        toolCallsJson: jsonb("tool_calls_json"),
        toolResultsJson: jsonb("tool_results_json"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [index("agent_messages_thread_created_idx").on(table.threadId, table.createdAt)],
);

export const agentThreadRuns = pgTable(
    "agent_thread_runs",
    {
        id: text("id").primaryKey(),
        threadId: text("thread_id")
            .notNull()
            .references(() => agentThreads.id, { onDelete: "cascade" }),
        triggerMessageId: text("trigger_message_id").references(() => agentMessages.id, { onDelete: "set null" }),
        status: agentRunStatusEnum("status").notNull().default("running"),
        errorMessage: text("error_message"),
        startedAt: timestamp("started_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("agent_thread_runs_thread_started_idx").on(table.threadId, table.startedAt),
        index("agent_thread_runs_status_idx").on(table.status),
    ],
);

export const agentThreadMemory = pgTable(
    "agent_thread_memory",
    {
        id: text("id").primaryKey(),
        threadId: text("thread_id")
            .notNull()
            .references(() => agentThreads.id, { onDelete: "cascade" }),
        memoryKind: agentMemoryKindEnum("memory_kind").notNull(),
        content: text("content").notNull(),
        sourceMessageIdsJson: jsonb("source_message_ids_json"),
        embedding: vector("embedding", { dimensions: 1536 }),
        embeddingSourceText: text("embedding_source_text"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date()),
    },
    (table) => [
        index("agent_thread_memory_thread_kind_idx").on(table.threadId, table.memoryKind),
        index("agent_thread_memory_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    ],
);
