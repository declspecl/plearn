import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
