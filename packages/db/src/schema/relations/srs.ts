import { users } from "../auth";
import { learningLearnables } from "../learning";
import { learningSrsCards, learningSrsReviews } from "../srs";
import { relations } from "drizzle-orm";

export const learningSrsCardsRelations = relations(learningSrsCards, ({ one, many }) => ({
    user: one(users, {
        fields: [learningSrsCards.userId],
        references: [users.id],
    }),
    learnable: one(learningLearnables, {
        fields: [learningSrsCards.learnableId],
        references: [learningLearnables.id],
    }),
    reviews: many(learningSrsReviews),
}));

export const learningSrsReviewsRelations = relations(learningSrsReviews, ({ one }) => ({
    card: one(learningSrsCards, {
        fields: [learningSrsReviews.cardId],
        references: [learningSrsCards.id],
    }),
    user: one(users, {
        fields: [learningSrsReviews.userId],
        references: [users.id],
    }),
}));
