CREATE TYPE "public"."agent_thread_kind" AS ENUM('learning_chat', 'transit');--> statement-breakpoint
ALTER TABLE "agent_threads" ADD COLUMN "kind" "agent_thread_kind" DEFAULT 'learning_chat' NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_threads_user_kind_last_message_idx" ON "agent_threads" USING btree ("created_by_user_id","kind","last_message_at");