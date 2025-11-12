// client/src/api/community.ts
import client from "./client";

export type Author = { id: string; username?: string; email: string; avatarColor?: string };

export type Thread = {
  _id: string;
  symbol: string;
  title: string;
  stance: "buy" | "sell" | "neutral";
  body?: string;
  createdBy: string;
  createdAt: string;
  up: number;
  down: number;
  reliabilityScore?: number;
  author?: Author;
};

export type Comment = {
  _id: string;
  threadId: string;
  body: string;
  createdBy: string;
  createdAt: string;
  up: number;
  down: number;
  author?: Author;
};

export type ThreadsResp = { threads: Thread[] };
export type CommentsResp = { comments: Comment[] };
export type SentimentResp = { symbol: string; score: number; n?: number; method?: string };
export type SummaryResp = { summary: string };

export const listThreads = async (symbol?: string): Promise<ThreadsResp> =>
  (await client.get(`/community/threads`, { params: { symbol } })).data as ThreadsResp;

export const createThread = async (
  symbol: string,
  title: string,
  stance: "buy" | "sell" | "neutral",
  body: string
): Promise<Thread> =>
  (await client.post(`/community/threads`, { symbol, title, stance, body })).data as Thread;

export const listComments = async (threadId: string): Promise<CommentsResp> =>
  (await client.get(`/community/comments`, { params: { threadId } })).data as CommentsResp;

export const addComment = async (threadId: string, body: string): Promise<Comment> =>
  (await client.post(`/community/comments`, { threadId, body })).data as Comment;

export const vote = async (
  type: "thread" | "comment",
  entityId: string,
  up = true
): Promise<Thread | Comment | { ok: true }> =>
  (await client.post(`/community/vote`, { type, entityId, up })).data;

export const communitySentiment = async (symbol: string): Promise<SentimentResp> =>
  (await client.get(`/community/sentiment`, { params: { symbol } })).data as SentimentResp;

export const summarizeCommunity = async (symbol: string): Promise<SummaryResp> =>
  (await client.get(`/summaries/community/${symbol}`)).data as SummaryResp;
