import { createTRPCRouter, publicProcedure } from "./trpc";
import { task } from "@plearn/core";
import { z } from "zod";

export const taskRouter = createTRPCRouter({
    list: publicProcedure.query(async ({ ctx }) => {
        return ctx.services.taskService.listTasks();
    }),
    create: publicProcedure
        .input(
            z.object({
                title: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.taskService.createTask(input);
        }),
    toggle: publicProcedure
        .input(
            z.object({
                id: z.string().transform((v) => v as task.TaskId),
                completed: z.boolean(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.taskService.updateTask(input.id, { completed: input.completed });
        }),
    delete: publicProcedure
        .input(
            z.object({
                id: z.string().transform((v) => v as task.TaskId),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.services.taskService.deleteTask(input.id);
        }),
});
