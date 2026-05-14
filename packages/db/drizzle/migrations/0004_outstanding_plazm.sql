CREATE TYPE "public"."learning_srs_card_status" AS ENUM('new', 'active', 'graduated', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."learning_srs_card_type" AS ENUM('use_in_sentence', 'whats_wrong', 'pick_right_one', 'shift_register', 'complete_thought', 'what_does_this_mean', 'how_would_you_say');--> statement-breakpoint
CREATE TYPE "public"."learning_srs_grade" AS ENUM('missed', 'shaky', 'okay', 'solid', 'nailed');--> statement-breakpoint
CREATE TABLE "learning_srs_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"learnable_id" text NOT NULL,
	"status" "learning_srs_card_status" DEFAULT 'new' NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"interval_days" real DEFAULT 0 NOT NULL,
	"repetition_count" integer DEFAULT 0 NOT NULL,
	"lapse_count" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp,
	"last_reviewed_at" timestamp,
	"introduced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_srs_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"card_type" "learning_srs_card_type" NOT NULL,
	"grade" "learning_srs_grade" NOT NULL,
	"prompt" text NOT NULL,
	"user_answer" text NOT NULL,
	"ai_feedback" text NOT NULL,
	"ai_model_provider" text,
	"ai_model_id" text,
	"is_practice" boolean DEFAULT false NOT NULL,
	"target_learnable_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_srs_cards" ADD CONSTRAINT "learning_srs_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_srs_cards" ADD CONSTRAINT "learning_srs_cards_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_srs_reviews" ADD CONSTRAINT "learning_srs_reviews_card_id_learning_srs_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."learning_srs_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_srs_reviews" ADD CONSTRAINT "learning_srs_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_srs_cards_user_learnable_uidx" ON "learning_srs_cards" USING btree ("user_id","learnable_id");--> statement-breakpoint
CREATE INDEX "learning_srs_cards_user_status_next_review_idx" ON "learning_srs_cards" USING btree ("user_id","status","next_review_at");--> statement-breakpoint
CREATE INDEX "learning_srs_cards_user_next_review_idx" ON "learning_srs_cards" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "learning_srs_reviews_user_session_idx" ON "learning_srs_reviews" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "learning_srs_reviews_card_created_at_idx" ON "learning_srs_reviews" USING btree ("card_id","created_at");--> statement-breakpoint
CREATE INDEX "learning_srs_reviews_user_created_at_idx" ON "learning_srs_reviews" USING btree ("user_id","created_at");