import client from "./client";

export const listThreads = async (symbol?: string) =>
  (await client.get(`/community/threads`, { params: { symbol } })).data;

export const createThread = async (symbol: string, title: string, stance: "buy"|"sell"|"neutral", body: string) =>
  (await client.post(`/community/threads`, { symbol, title, stance, body })).data;

export const listComments = async (threadId: string) =>
  (await client.get(`/community/comments`, { params: { threadId } })).data;

export const addComment = async (threadId: string, body: string) =>
  (await client.post(`/community/comments`, { threadId, body })).data;

export const vote = async (type: "thread"|"comment", entityId: string, up=true) =>
  (await client.post(`/community/vote`, { type, entityId, up })).data;

export const communitySentiment = async (symbol: string) =>
  (await client.get(`/community/sentiment`, { params: { symbol } })).data;

export const summarizeCommunity = async (symbol: string) =>
  (await client.get(`/summaries/community/${symbol}`)).data;
