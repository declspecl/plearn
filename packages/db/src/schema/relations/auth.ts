import { users, sessions, accounts } from "../auth";
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    users: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    users: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));
