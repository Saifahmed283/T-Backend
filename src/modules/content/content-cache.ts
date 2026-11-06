import { config } from '../../config/config.js'
import { cacheGet, cacheSet, cached } from '../../lib/cache.js'

/*
 * Read-through cache for the public site's data.
 *
 * Public content only changes when an editor mutates it. Rather than trying to
 * delete every list/detail key (and missing one), all keys embed a generation
 * number. A mutation bumps the generation, so the next read misses and the old
 * entries fall out of Redis on their own TTL. This also works across API
 * instances, which matters because each one handles its own requests.
 */

const GENERATION_KEY = 'terramorph:public:generation'
const GENERATION_TTL_SECONDS = 60 * 60 * 24 * 30

async function generation(): Promise<number> {
  return (await cacheGet<number>(GENERATION_KEY)) ?? 1
}

export async function cachedPublic<T>(
  parts: Array<string | number | null | undefined>,
  load: () => Promise<T>,
): Promise<T> {
  if (!config.CACHE_ENABLED) return load()
  const version = await generation()
  const suffix = parts.map((part) => (part === null || part === undefined ? '' : String(part))).join(':')
  return cached(`terramorph:public:${version}:${suffix}`, config.PUBLIC_CACHE_TTL_SECONDS, load)
}

/** Called after any mutation that can change what the public site reads. */
export async function invalidatePublicCache(): Promise<void> {
  if (!config.CACHE_ENABLED) return
  const version = await generation()
  await cacheSet(GENERATION_KEY, version + 1, GENERATION_TTL_SECONDS)
}
