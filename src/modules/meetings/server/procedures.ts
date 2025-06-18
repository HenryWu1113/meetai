import { db } from "@/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { meetings, agents } from "@/db/schema";
import { z } from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { TRPCError } from "@trpc/server";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";

export const meetingsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        )
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return updatedMeeting;
    }),
  create: protectedProcedure
    // 使用 createMeetingsSchema 來驗證 input
    .input(meetingsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdMeeting] = await db
        // 存入 meetings 這個資料表
        .insert(meetings)
        // 把 input 的資料存入 meetings 資料表
        .values({
          ...input,
          userId: ctx.auth.user.id,
        })
        // 回傳存入的資料
        .returning();

      // TODO: Create Stream Call, Upsert Stream Users

      return createdMeeting;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings),
        })
        .from(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return existingMeeting;
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at- started_at))`.as(
            "duration"
          ),
        })
        .from(meetings)
        // 不同 JOIN 類型的差別：
        // INNER JOIN（內部連接）：
        // 只回傳兩個表都有匹配資料的記錄
        // 如果某個 meeting 的 agentId 在 agents 表中找不到，這個 meeting 就不會出現在結果中
        // LEFT JOIN（左連接）：
        // 回傳左表（meetings）的所有記錄
        // 如果右表（agents）沒有匹配資料，agent 欄位會是 null
        // RIGHT JOIN（右連接）：
        // 回傳右表（agents）的所有記錄
        // 如果左表（meetings）沒有匹配資料，meeting 欄位會是 null
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            // % 是模糊搜尋，代表任意長度的任意字元（可為 0 個或多個字元）
            // _ 是單一個字元
            // ilike 是 postgres 特有語法，忽略大小寫
            search ? ilike(meetings.name, `%${search}%`) : undefined
          )
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        // OFFSET 是用來跳過前面幾筆資料，這樣就可以分頁
        .offset((page - 1) * pageSize);

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(eq(meetings.userId, ctx.auth.user.id));

      const totalPages = Math.ceil(total.count / pageSize);

      return { items: data, total: total.count, totalPages };
    }),
});
