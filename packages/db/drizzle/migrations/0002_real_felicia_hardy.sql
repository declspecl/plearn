CREATE TYPE "public"."agent_generation_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_kind" AS ENUM('rolling_summary', 'fact', 'preference', 'task_state');--> statement-breakpoint
CREATE TYPE "public"."agent_message_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_thread_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"role" "agent_message_role" NOT NULL,
	"parts_json" jsonb NOT NULL,
	"model_provider" text,
	"model_id" text,
	"finish_reason" text,
	"token_usage_json" jsonb,
	"tool_calls_json" jsonb,
	"tool_results_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_thread_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"memory_kind" "agent_memory_kind" NOT NULL,
	"content" text NOT NULL,
	"source_message_ids_json" jsonb,
	"embedding" vector(1536),
	"embedding_source_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_thread_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"trigger_message_id" text,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_user_id" text NOT NULL,
	"language_code" text DEFAULT 'vi' NOT NULL,
	"status" "agent_thread_status" DEFAULT 'active' NOT NULL,
	"title" text DEFAULT 'New chat' NOT NULL,
	"title_status" "agent_generation_status" DEFAULT 'pending' NOT NULL,
	"summary" text,
	"summary_status" "agent_generation_status" DEFAULT 'pending' NOT NULL,
	"title_locked_by_user" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_thread_id_agent_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."agent_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_thread_memory" ADD CONSTRAINT "agent_thread_memory_thread_id_agent_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."agent_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD CONSTRAINT "agent_thread_runs_thread_id_agent_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."agent_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD CONSTRAINT "agent_thread_runs_trigger_message_id_agent_messages_id_fk" FOREIGN KEY ("trigger_message_id") REFERENCES "public"."agent_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_messages_thread_created_idx" ON "agent_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_thread_memory_thread_kind_idx" ON "agent_thread_memory" USING btree ("thread_id","memory_kind");--> statement-breakpoint
CREATE INDEX "agent_thread_memory_embedding_hnsw_idx" ON "agent_thread_memory" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "agent_thread_runs_thread_started_idx" ON "agent_thread_runs" USING btree ("thread_id","started_at");--> statement-breakpoint
CREATE INDEX "agent_thread_runs_status_idx" ON "agent_thread_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_threads_user_last_message_idx" ON "agent_threads" USING btree ("created_by_user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "agent_threads_status_idx" ON "agent_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_threads_language_code_idx" ON "agent_threads" USING btree ("language_code");