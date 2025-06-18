import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

// 從 _app 的 appRouter 定義 agents 的 getOne 的輸出型別
export type AgentGetOne = inferRouterOutputs<AppRouter>["agents"]["getOne"];
export type AgentGetMany =
  inferRouterOutputs<AppRouter>["agents"]["getMany"]["items"];
