import { db } from '@/db'
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure
} from '@/trpc/init'
import { agents } from '@/db/schema'
import { agentsInsertSchema, agentsUpdateSchema } from '../schemas'
import { z } from 'zod'
import { and, count, desc, eq, getTableColumns, ilike, sql } from 'drizzle-orm'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE
} from '@/constants'
import { TRPCError } from '@trpc/server'

export const agentsRouter = createTRPCRouter({
  update: protectedProcedure
    .input(agentsUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedAgent] = await db
        .update(agents)
        .set(input)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.auth.user.id))
        )
        .returning()

      if (!updatedAgent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent not found'
        })
      }

      return updatedAgent
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [deletedAgent] = await db
        .delete(agents)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.auth.user.id))
        )
        .returning()

      if (!deletedAgent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent not found'
        })
      }

      return deletedAgent
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingAgent] = await db
        .select({
          meetingCount: sql<number>`5`,
          ...getTableColumns(agents)
        })
        .from(agents)
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.auth.user.id))
        )

      if (!existingAgent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent not found'
        })
      }

      return existingAgent
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
        search: z.string().nullish()
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input

      const data = await db
        .select({
          // 計算每個 agent 的 meetingCount(跟資料表格式無關)
          meetingCount: sql<number>`5`,
          ...getTableColumns(agents)
        })
        .from(agents)
        .where(
          and(
            eq(agents.userId, ctx.auth.user.id),
            // % 是模糊搜尋，代表任意長度的任意字元（可為 0 個或多個字元）
            // _ 是單一個字元
            // ilike 是 postgres 特有語法，忽略大小寫
            search ? ilike(agents.name, `%${search}%`) : undefined
          )
        )
        .orderBy(desc(agents.createdAt), desc(agents.id))
        .limit(pageSize)
        // OFFSET 是用來跳過前面幾筆資料，這樣就可以分頁
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(agents)
        .where(eq(agents.userId, ctx.auth.user.id))

      const totalPages = Math.ceil(total.count / pageSize)

      return { items: data, total: total.count, totalPages }
    }),
  create: premiumProcedure('agents')
    // 使用 createAgentSchema 來驗證 input
    .input(agentsInsertSchema)
    .mutation(async ({ input, ctx }) => {
      const [createdAgent] = await db
        // 存入 agents 這個資料表
        .insert(agents)
        // 把 input 的資料存入 agents 資料表
        .values({
          ...input,
          userId: ctx.auth.user.id
        })
        // 回傳存入的資料
        .returning()

      return createdAgent
    })
})
