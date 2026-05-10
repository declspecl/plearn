import { users } from "./auth";
import { learningLearnables } from "./learning";
import { boolean, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const srsCardStatusEnum = pgEnum("learning_srs_card_status", ["new", "active", "graduated", "suspended"]);
export const srsGradeEnum = pgEnum("learning_srs_grade", ["missed", "shaky", "okay", "solid", "nailed"]);
export const srsCardTypeEnum = pgEnum("learning_srs_card_type", [
    "use_in_sentence",
    "whats_wrong",
    "pick_right_one",
    "shift_register",
    "complete_thought",
    "what_does_this_mean",
    "how_would_you_say",
]);

export const learningSrsCards = pgTable(
    "learning_srs_cards",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        learnableId: text("learnable_id")
            .notNull()
            .references(() => learningLearnables.id, { onDelete: "cascade" }),
        status: srsCardStatusEnum("status").notNull().default("new"),
        easeFactor: real("ease_factor").notNull().default(2.5),
        intervalDays: real("interval_days").notNull().default(0),
        repetitionCount: integer("repetition_count").notNull().default(0),
        lapseCount: integer("lapse_count").notNull().default(0),
        nextReviewAt: timestamp("next_review_at"),
        lastReviewedAt: timestamp("last_reviewed_at"),
        introducedAt: timestamp("introduced_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("learning_srs_cards_user_learnable_uidx").on(table.userId, table.learnableId),
        index("learning_srs_cards_user_status_next_review_idx").on(table.userId, table.status, table.nextReviewAt),
        index("learning_srs_cards_user_next_review_idx").on(table.userId, table.nextReviewAt),
    ],
);

export const learningSrsReviews = pgTable(
    "learning_srs_reviews",
    {
        id: text("id").primaryKey(),
        cardId: text("card_id")
            .notNull()
            .references(() => learningSrsCards.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        sessionId: text("session_id").notNull(),
        cardType: srsCardTypeEnum("card_type").notNull(),
        grade: srsGradeEnum("grade").notNull(),
        prompt: text("prompt").notNull(),
        userAnswer: text("user_answer").notNull(),
        aiFeedback: text("ai_feedback").notNull(),
        aiModelProvider: text("ai_model_provider"),
        aiModelId: text("ai_model_id"),
        isPractice: boolean("is_practice").notNull().default(false),
        targetLearnableIds: jsonb("target_learnable_ids").notNull().default([]),
        durationMs: integer("duration_ms"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("learning_srs_reviews_user_session_idx").on(table.userId, table.sessionId),
        index("learning_srs_reviews_card_created_at_idx").on(table.cardId, table.createdAt),
        index("learning_srs_reviews_user_created_at_idx").on(table.userId, table.createdAt),
    ],
);
