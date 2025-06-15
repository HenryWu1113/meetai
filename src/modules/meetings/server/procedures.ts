import { db } from '@/db'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { meetings } from '@/db/schema'
import { z } from 'zod'
import { and, count, desc, eq, getTableColumns, ilike } from 'drizzle-orm'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE
} from '@/constants'
import { TRPCError } from '@trpc/server'

export const meetingsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings)
        })
        .from(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        )

      if (!existingMeeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meeting not found'
        })
      }

      return existingMeeting
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
          ...getTableColumns(meetings)
        })
        .from(meetings)
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
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .where(eq(meetings.userId, ctx.auth.user.id))

      const totalPages = Math.ceil(total.count / pageSize)

      return { items: data, total: total.count, totalPages }
    })
})
