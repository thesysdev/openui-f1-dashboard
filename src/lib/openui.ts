import { OpenUIApiError, OpenUIClient } from "@openuidev/server";

// Reads THESYS_API_KEY. Frontend tokens and the threads they create carry this app id.
export const openui = new OpenUIClient({ appId: process.env.APP_ID || "f1-dashboard" });

/** Whether the thread is this visitor's. The id comes from the browser, so check before using it. */
export async function ownsThread(userId: string, threadId: string, signal?: AbortSignal) {
  try {
    return (await openui.conversations.get(threadId, { signal })).userId === userId;
  } catch (error) {
    if (error instanceof OpenUIApiError && error.status === 404) return false;
    throw error;
  }
}
