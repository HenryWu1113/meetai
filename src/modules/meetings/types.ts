import { inferRouterOutputs } from '@trpc/server'

import type { AppRouter } from '@/trpc/routers/_app'

// 從 _app 的 appRouter 定義 meetings 的 getOne 的輸出型別
export type MeetingGetOne = inferRouterOutputs<AppRouter>['meetings']['getOne']
export type MeetingGetMany =
  inferRouterOutputs<AppRouter>['meetings']['getMany']['items']
export enum MeetingStatus {
  Upcoming = 'upcoming',
  Active = 'active',
  Completed = 'completed',
  Processing = 'processing',
  Cancelled = 'cancelled'
}
