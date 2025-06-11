import { db } from '@/db'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { agents } from '@/db/schema'
import { TRPCError } from '@trpc/server'
import { agentsInsertSchema } from '../schemas'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

export const agentsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [data] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id))

      return data
    }),
  getMany: protectedProcedure.query(async () => {
    const data = await db.select().from(agents)

    return data
  }),
  create: protectedProcedure
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
