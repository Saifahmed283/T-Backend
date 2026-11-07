/**
 * Morphe session store - TTL-backed in-memory sessions with a hard cap
 * to prevent memory DoS on the public chat endpoint.
 */
import type { FlowSlot } from "./flow.js";

const MAX_SESSIONS = 1000;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface HistoryEntry {
  state: string;
  text: string | null;
  intent: string | null;
}

interface SessionRecord {
  state: string;
  slots: FlowSlot;
  lang: "en" | "ar";
  history: HistoryEntry[];
  createdAt: number;
  lastAccessed: number;
}

export class MorpheSessionStore {
  private sessions = new Map<string, SessionRecord>();

  create(sessionId: string, lang: "en" | "ar"): void {
    // Enforce a hard cap: evict oldest session if at capacity
    if (this.sessions.size >= MAX_SESSIONS && !this.sessions.has(sessionId)) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [id, rec] of this.sessions) {
        if (rec.lastAccessed < oldestTime) {
          oldestTime = rec.lastAccessed;
          oldestId = id;
        }
      }
      if (oldestId) this.sessions.delete(oldestId);
    }

    this.sessions.set(sessionId, {
      state: "greeting",
      slots: {},
      lang,
      history: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });
  }

  get(sessionId: string): SessionRecord | null {
    const rec = this.sessions.get(sessionId);
    if (!rec) return null;
    const now = Date.now();
    if (now - rec.lastAccessed > SESSION_TTL_MS) {
      this.sessions.delete(sessionId);
      return null;
    }
    rec.lastAccessed = now;
    return rec;
  }

  set(sessionId: string, rec: SessionRecord): void {
    rec.lastAccessed = Date.now();
    this.sessions.set(sessionId, rec);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  gc(): void {
    const now = Date.now();
    for (const [id, rec] of this.sessions) {
      if (now - rec.lastAccessed > SESSION_TTL_MS) this.sessions.delete(id);
    }
  }

  size(): number {
    return this.sessions.size;
  }
}

export const morpheSessions = new MorpheSessionStore();

// Run GC every 5 minutes
setInterval(() => morpheSessions.gc(), 5 * 60 * 1000);
