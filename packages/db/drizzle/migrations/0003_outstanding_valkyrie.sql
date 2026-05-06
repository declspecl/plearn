CREATE TYPE "public"."agent_message_status" AS ENUM('streaming', 'completed', 'failed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."agent_run_status" ADD VALUE 'timed_out';--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "status" "agent_message_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "failure_message" text;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "retry_of_message_id" text;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD COLUMN "assistant_message_id" text;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD COLUMN "client_turn_id" text;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent_thread_runs" ADD CONSTRAINT "agent_thread_runs_assistant_message_id_agent_messages_id_fk" FOREIGN KEY ("assistant_message_id") REFERENCES "public"."agent_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_messages_status_idx" ON "agent_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_thread_runs_thread_client_turn_idx" ON "agent_thread_runs" USING btree ("thread_id","client_turn_id");