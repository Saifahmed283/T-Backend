import { Redis } from 'ioredis'
import { config } from '../config/config.js'

/*
 * A very small cache facade.
 *
 * Two implementations share one interface. With REDIS_URL set, instances share
 * a Redis store (needed as soon as there is more than one API process). Without
 * it, a bounded in-process map with per-entry expiry keeps a single instance
 * warm. Redis errors are contained per command: a cache outage degrades to no
 * cache, never to a failed request.
 */

interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(...keys: string[]): Promise<void>
  close(): Promise<void>
}

type MemoryEntry = { value: string; expiresAt: number }

const MEMORY_LIMIT = 2_000

class MemoryStore implements CacheStore {
  private entries = new Map<string, MemoryEntry>()

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.entries.size >= MEMORY_LIMIT) this.evictExpired()
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 })
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key)
  }

  async close(): Promise<void> {
    this.entries.clear()
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key)
    }
    // Still full after expiry? Drop the oldest insertions (Map preserves order).
    if (this.entries.size >= MEMORY_LIMIT) {
      const excess = this.entries.size - MEMORY_LIMIT + 1
      let removed = 0
      for (const key of this.entries.keys()) {
        this.entries.delete(key)
        if (++removed >= excess) break
      }
    }
  }
}

class RedisStore implements CacheStore {
  private readonly client: Redis
  private ready = false
  // Keeps the process serving when Redis is unreachable or restarts.
  private readonly fallback = new MemoryStore()

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      // Without the offline queue a command fails fast instead of hanging while
      // the client waits for a connection, so callers immediately fall back.
      enableOfflineQueue: false,
      // Keep retrying (capped) so the cache rejoins after a Redis restart.
      retryStrategy: (times) => Math.min(times * 250, 5_000),
    })
    this.client.on('ready', () => {
      this.ready = true
    })
    this.client.on('close', () => {
      this.ready = false
    })
    // Per-command handlers below decide what a failure means; an unhandled
    // 'error' event would otherwise crash the process.
    this.client.on('error', (err) => {
      // Log but don't crash - fallback handles requests
      console.error('Redis cache error:', err.message)
    })
    void this.client.connect().catch((err) => {
      console.error('Redis cache connection failed:', err.message)
    })
  }

  async get(key: string): Promise<string | null> {
    if (!this.ready) return this.fallback.get(key)
    try {
      return await this.client.get(key)
    } catch {
      return this.fallback.get(key)
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.fallback.set(key, value, ttlSeconds)
    if (!this.ready) return
    try {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } catch {
      // Fallback already holds the value.
    }
  }

  async del(...keys: string[]): Promise<void> {
    await this.fallback.del(...keys)
    if (!this.ready) return
    try {
      await this.client.del(...keys)
    } catch {
      // Best effort.
    }
  }

  async close(): Promise<void> {
    await this.fallback.close()
    try {
      if (this.ready) await this.client.quit()
      else this.client.disconnect()
    } catch {
      this.client.disconnect()
    }
  }
}

const store: CacheStore = config.REDIS_URL ? new RedisStore(config.REDIS_URL) : new MemoryStore()

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (!config.CACHE_ENABLED) return undefined
  const raw = await store.get(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    // A corrupt/legacy entry must not wedge the endpoint.
    await store.del(key)
    return undefined
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!config.CACHE_ENABLED) return
  await store.set(key, JSON.stringify(value), ttlSeconds)
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  if (!config.CACHE_ENABLED || keys.length === 0) return
  await store.del(...keys)
}

/**
 * Read-through helper. The loader runs once per miss; concurrent misses can
 * both load (normal cache behaviour) but never share a mutable result.
 */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!config.CACHE_ENABLED) return load()
  const hit = await cacheGet<T>(key)
  if (hit !== undefined) return hit
  const value = await load()
  await cacheSet(key, value, ttlSeconds)
  return value
}

export async function closeCache(): Promise<void> {
  await store.close()
}
