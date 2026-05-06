import { agentMessages, agentThreadMemory, agentThreadRuns, agentThreads } from "../agent";
import { users } from "../auth";
import { relations } from "drizzle-orm";

export const agentThreadsRelations = relations(agentThreads, ({ one, many }) => ({
    createdByUser: one(users, {
        fields: [agentThreads.createdByUserId],
        references: [users.id],
    }),
    messages: many(agentMessages),
    memoryEntries: many(agentThreadMemory),
    runs: many(agentThreadRuns),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one, many }) => ({
    thread: one(agentThreads, {
        fields: [agentMessages.threadId],
        references: [agentThreads.id],
    }),
    triggeredRuns: many(agentThreadRuns),
    retriedMessage: one(agentMessages, {
        fields: [agentMessages.retryOfMessageId],
        references: [agentMessages.id],
        relationName: "retry_chain",
    }),
    retryAttempts: many(agentMessages, {
        relationName: "retry_chain",
    }),
}));

export const agentThreadRunsRelations = relations(agentThreadRuns, ({ one }) => ({
    thread: one(agentThreads, {
        fields: [agentThreadRuns.threadId],
        references: [agentThreads.id],
    }),
    triggerMessage: one(agentMessages, {
        fields: [agentThreadRuns.triggerMessageId],
        references: [agentMessages.id],
    }),
    assistantMessage: one(agentMessages, {
        fields: [agentThreadRuns.assistantMessageId],
        references: [agentMessages.id],
    }),
}));

export const agentThreadMemoryRelations = relations(agentThreadMemory, ({ one }) => ({
    thread: one(agentThreads, {
        fields: [agentThreadMemory.threadId],
        references: [agentThreads.id],
    }),
}));
