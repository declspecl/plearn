CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."learning_example_source" AS ENUM('ai', 'sentence_observed', 'manual');--> statement-breakpoint
CREATE TYPE "public"."learning_learnable_type" AS ENUM('grammar_pattern', 'vocabulary', 'utility_word', 'phrase');--> statement-breakpoint
CREATE TYPE "public"."learning_related_learnable_type" AS ENUM('similar_meaning', 'same_pattern_family', 'often_confused', 'related_phrase');--> statement-breakpoint
CREATE TYPE "public"."learning_review_action" AS ENUM('pending', 'create_new', 'merge_existing', 'reject');--> statement-breakpoint
CREATE TYPE "public"."learning_suggestion_status" AS ENUM('idle', 'loading', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."learning_workspace_status" AS ENUM('draft', 'analyzed', 'reviewed', 'saved', 'failed');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_languages" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_learnable_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"learnable_id" text NOT NULL,
	"alias_text" text NOT NULL,
	"normalized_alias_text" text NOT NULL,
	"language_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_learnable_examples" (
	"id" text PRIMARY KEY NOT NULL,
	"learnable_id" text NOT NULL,
	"example_text" text NOT NULL,
	"translation" text NOT NULL,
	"source" "learning_example_source" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_learnables" (
	"id" text PRIMARY KEY NOT NULL,
	"language_id" text NOT NULL,
	"type" "learning_learnable_type" NOT NULL,
	"canonical_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"translation" text NOT NULL,
	"part_of_speech" text,
	"usage_notes" text NOT NULL,
	"pattern_template" text,
	"difficulty" real,
	"search_document" text DEFAULT '' NOT NULL,
	"embedding" vector(1536),
	"embedding_source_text" text,
	"occurrence_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "learning_occurrences" (
	"id" text PRIMARY KEY NOT NULL,
	"learnable_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"source_span_text" text NOT NULL,
	"source_sentence_text" text NOT NULL,
	"rationale" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_related_learnables" (
	"id" text PRIMARY KEY NOT NULL,
	"from_learnable_id" text NOT NULL,
	"to_learnable_id" text NOT NULL,
	"relation_type" "learning_related_learnable_type" NOT NULL,
	"confidence" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sentence_workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"language_id" text NOT NULL,
	"source_text" text NOT NULL,
	"source_language_code" text DEFAULT 'en' NOT NULL,
	"status" "learning_workspace_status" DEFAULT 'draft' NOT NULL,
	"analysis_model_provider" text,
	"analysis_model_id" text,
	"analysis_prompt_version" text,
	"summary" text,
	"raw_analysis_json" jsonb,
	"reviewed_analysis_json" jsonb,
	"error_message" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_workspace_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"proposed_type" "learning_learnable_type" NOT NULL,
	"proposed_text" text NOT NULL,
	"proposed_translation" text NOT NULL,
	"proposed_notes" text NOT NULL,
	"proposed_json" jsonb NOT NULL,
	"review_action" "learning_review_action" DEFAULT 'pending' NOT NULL,
	"merge_target_learnable_id" text,
	"duplicate_suggestions_json" jsonb,
	"duplicate_suggestions_status" "learning_suggestion_status" DEFAULT 'idle' NOT NULL,
	"duplicate_suggestions_computed_at" timestamp,
	"duplicate_suggestions_error" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_learnable_aliases" ADD CONSTRAINT "learning_learnable_aliases_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_learnable_aliases" ADD CONSTRAINT "learning_learnable_aliases_language_id_learning_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."learning_languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_learnable_examples" ADD CONSTRAINT "learning_learnable_examples_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_learnables" ADD CONSTRAINT "learning_learnables_language_id_learning_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."learning_languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_occurrences" ADD CONSTRAINT "learning_occurrences_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_occurrences" ADD CONSTRAINT "learning_occurrences_workspace_id_learning_sentence_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."learning_sentence_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_related_learnables" ADD CONSTRAINT "learning_related_learnables_from_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("from_learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_related_learnables" ADD CONSTRAINT "learning_related_learnables_to_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("to_learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sentence_workspaces" ADD CONSTRAINT "learning_sentence_workspaces_language_id_learning_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."learning_languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sentence_workspaces" ADD CONSTRAINT "learning_sentence_workspaces_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_workspace_items" ADD CONSTRAINT "learning_workspace_items_workspace_id_learning_sentence_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."learning_sentence_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_workspace_items" ADD CONSTRAINT "learning_workspace_items_merge_target_learnable_id_learning_learnables_id_fk" FOREIGN KEY ("merge_target_learnable_id") REFERENCES "public"."learning_learnables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_languages_code_uidx" ON "learning_languages" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_learnable_aliases_language_normalized_uidx" ON "learning_learnable_aliases" USING btree ("language_id","normalized_alias_text");--> statement-breakpoint
CREATE INDEX "learning_learnable_aliases_learnable_idx" ON "learning_learnable_aliases" USING btree ("learnable_id");--> statement-breakpoint
CREATE INDEX "learning_learnable_examples_learnable_idx" ON "learning_learnable_examples" USING btree ("learnable_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_learnables_language_type_normalized_uidx" ON "learning_learnables" USING btree ("language_id","type","normalized_text");--> statement-breakpoint
CREATE INDEX "learning_learnables_language_idx" ON "learning_learnables" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "learning_learnables_type_idx" ON "learning_learnables" USING btree ("type");--> statement-breakpoint
CREATE INDEX "learning_learnables_occurrence_count_idx" ON "learning_learnables" USING btree ("occurrence_count");--> statement-breakpoint
CREATE INDEX "learning_learnables_last_seen_idx" ON "learning_learnables" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "learning_learnables_embedding_hnsw_idx" ON "learning_learnables" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "learning_learnables_canonical_text_trgm_idx" ON "learning_learnables" USING gin ("canonical_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "learning_learnables_translation_trgm_idx" ON "learning_learnables" USING gin ("translation" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "learning_occurrences_learnable_idx" ON "learning_occurrences" USING btree ("learnable_id");--> statement-breakpoint
CREATE INDEX "learning_occurrences_learnable_created_at_idx" ON "learning_occurrences" USING btree ("learnable_id","created_at");--> statement-breakpoint
CREATE INDEX "learning_occurrences_workspace_idx" ON "learning_occurrences" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "learning_related_learnables_from_idx" ON "learning_related_learnables" USING btree ("from_learnable_id");--> statement-breakpoint
CREATE INDEX "learning_related_learnables_to_idx" ON "learning_related_learnables" USING btree ("to_learnable_id");--> statement-breakpoint
CREATE INDEX "learning_sentence_workspaces_language_idx" ON "learning_sentence_workspaces" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "learning_sentence_workspaces_user_idx" ON "learning_sentence_workspaces" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "learning_sentence_workspaces_user_language_created_at_idx" ON "learning_sentence_workspaces" USING btree ("created_by_user_id","language_id","created_at");--> statement-breakpoint
CREATE INDEX "learning_sentence_workspaces_status_idx" ON "learning_sentence_workspaces" USING btree ("status");--> statement-breakpoint
CREATE INDEX "learning_sentence_workspaces_created_at_idx" ON "learning_sentence_workspaces" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "learning_workspace_items_workspace_idx" ON "learning_workspace_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "learning_workspace_items_workspace_position_idx" ON "learning_workspace_items" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE INDEX "learning_workspace_items_merge_target_idx" ON "learning_workspace_items" USING btree ("merge_target_learnable_id");
