/** Per-user key + clear helper for the persisted AI conversation. */
export const AI_CHAT_STORAGE_PREFIX = "stockeasy:ai-chat:";

export function aiChatStorageKey(userId: string): string {
  return `${AI_CHAT_STORAGE_PREFIX}${userId}`;
}

/** Remove a user's persisted conversation (called on explicit sign-out). */
export function clearAiChat(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(aiChatStorageKey(userId));
  } catch {
    /* storage unavailable — non-fatal */
  }
}
