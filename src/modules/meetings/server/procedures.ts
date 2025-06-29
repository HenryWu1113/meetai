import { db } from '@/db'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { meetings, agents, user } from '@/db/schema'
import { z } from 'zod'
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  sql
} from 'drizzle-orm'
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE
} from '@/constants'
import { TRPCError } from '@trpc/server'
import { meetingsInsertSchema, meetingsUpdateSchema } from '../schemas'
import { MeetingStatus, StreamTranscriptItem } from '../types'
import { generateAvatarUri } from '@/lib/avatar'
import { streamVideo } from '@/lib/stream-video'
import JSONL from 'jsonl-parse-stringify'
import { streamChat } from '@/lib/stream-chat'

export const meetingsRouter = createTRPCRouter({
  generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = streamChat.createToken(ctx.auth.user.id)

    await streamChat.upsertUser({
      id: ctx.auth.user.id,
      role: 'admin'
    })

    return token
  }),
  getTranscript: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select()
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

      if (!existingMeeting.transcriptUrl) {
        return []
      }

      const transcript = await fetch(existingMeeting.transcriptUrl)
        .then((res) => res.text())
        .then((text) => JSONL.parse<StreamTranscriptItem>(text))
        .catch(() => {
          return []
        })

      const speakerIds = [...new Set(transcript.map((item) => item.speaker_id))]

      const userSpeakers = await db
        .select()
        .from(user)
        .where(inArray(user.id, speakerIds))
        .then((users) => {
          return users.map((user) => ({
            ...user,
            image:
              user.image ||
              generateAvatarUri({
                seed: user.name,
                variant: 'initials'
              })
          }))
        })

      const agentSpeakers = await db
        .select()
        .from(agents)
        .where(inArray(agents.id, speakerIds))
        .then((agents) => {
          return agents.map((agent) => ({
            ...agent,
            image: generateAvatarUri({
              seed: agent.name,
              variant: 'botttsNeutral'
            })
          }))
        })

      const speakers = [...userSpeakers, ...agentSpeakers]

      const transcriptWithSpeakers = transcript.map((item) => {
        const speaker = speakers.find(
          (speaker) => speaker.id === item.speaker_id
        )

        if (!speaker) {
          return {
            ...item,
            user: {
              name: 'Unknown',
              image: generateAvatarUri({
                seed: 'Unknown',
                variant: 'initials'
              })
            }
          }
        }

        return {
          ...item,
          user: {
            name: speaker.name,
            image: speaker.image
          }
        }
      })

      return transcriptWithSpeakers
    }),
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: 'admin',
        image: generateAvatarUri({
          seed: ctx.auth.user.id,
          variant: 'botttsNeutral'
        })
      }
    ])

    const expirationTime = Math.floor(Date.now() / 1000) + 3600
    const issuedAt = Math.floor(Date.now() / 1000) - 60

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt
    })

    return token
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [removedMeeting] = await db
        .delete(meetings)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        )
        .returning()

      if (!removedMeeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meeting not found'
        })
      }

      return removedMeeting
    }),
  update: protectedProcedure
    .input(meetingsUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const [updatedMeeting] = await db
        .update(meetings)
        .set(input)
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id))
        )
        .returning()

      if (!updatedMeeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meeting not found'
        })
      }

      return updatedMeeting
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
          userId: ctx.auth.user.id
        })
        // 回傳存入的資料
        .returning()

      // TODO: Create Stream Call, Upsert Stream Users
      const call = streamVideo.video.call('default', createdMeeting.id)

      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: createdMeeting.id,
            meetingName: createdMeeting.name
          },
          settings_override: {
            transcription: {
              language: 'zh',
              mode: 'auto-on',
              closed_caption_mode: 'auto-on'
            },
            recording: {
              mode: 'auto-on',
              quality: '1080p'
            }
          }
        }
      })

      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, createdMeeting.agentId))

      if (!existingAgent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Agent not found'
        })
      }

      await streamVideo.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name,
          image: generateAvatarUri({
            seed: existingAgent.name,
            variant: 'botttsNeutral'
          })
        }
      ])

      return createdMeeting
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at- started_at))`.as(
            'duration'
          )
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
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
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z
          .enum([
            MeetingStatus.Upcoming,
            MeetingStatus.Active,
            MeetingStatus.Completed,
            MeetingStatus.Processing,
            MeetingStatus.Cancelled
          ])
          .nullish()
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, agentId, status } = input

      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at- started_at))`.as(
            'duration'
          )
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
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined
          )
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        // OFFSET 是用來跳過前面幾筆資料，這樣就可以分頁
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined
          )
        )

      const totalPages = Math.ceil(total.count / pageSize)

      return { items: data, total: total.count, totalPages }
    })
})
