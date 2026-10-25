import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../../db/prisma.js'
import { transitionContent } from './content.service.js'

/*
 * Scheduled publishing.
 *
 * Content moved to SCHEDULED becomes PUBLISHED when its `scheduledPublishAt`
 * passes. The job runs in-process on every API instance; a Postgres advisory
 * lock (released when the tick's transaction ends) makes exactly one instance
 * the leader for each run, so rolling deploys and multiple processes cannot
 * double-publish or duplicate the audit entry.
 *
 * The whole tick is idempotent: only rows still in SCHEDULED are selected, and
 * a manual edit that moves an item out of SCHEDULED before the tick is skipped
 * rather than fought with.
 */

const SCHEDULER_LOCK_KEY = 'terramorph:content-scheduler'
const BATCH_LIMIT = 100

export type ScheduledPublishResult = {
  // True when another instance held the lock and this tick did no work.
  skipped: boolean
  published: number
  failed: number
}

type SchedulerLogger = Pick<FastifyBaseLogger, 'info' | 'error'>

export async function publishDueContent(
  now: Date = new Date(),
  logger?: SchedulerLogger,
): Promise<ScheduledPublishResult> {
  return prisma.$transaction(
    async (tx) => {
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext(${SCHEDULER_LOCK_KEY})) AS locked
      `
      if (!lock?.locked) return { skipped: true, published: 0, failed: 0 }

      const due = await tx.contentItem.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledPublishAt: { lte: now },
          // An item whose unpublish time has already passed never surfaces.
          OR: [{ scheduledUnpublishAt: null }, { scheduledUnpublishAt: { gt: now } }],
        },
        select: { id: true, workspaceId: true, title: true },
        orderBy: { scheduledPublishAt: 'asc' },
        take: BATCH_LIMIT,
      })

      let published = 0
      let failed = 0

      for (const item of due) {
        try {
          await transitionContent({
            workspaceId: item.workspaceId,
            id: item.id,
            userId: null,
            role: 'system',
            to: 'PUBLISHED',
            system: true,
            activityType: 'AUTO_PUBLISHED',
          })
          published += 1
          logger?.info({ contentItemId: item.id, title: item.title }, 'Auto-published scheduled content')
        } catch (error) {
          // The row may have moved on between the select and the transition; log
          // it and keep the batch going so one bad row cannot stall the queue.
          failed += 1
          logger?.error({ err: error, contentItemId: item.id }, 'Scheduled publish failed')
        }
      }

      return { skipped: false, published, failed }
    },
    { maxWait: 10_000, timeout: 30_000 },
  )
}

export type ContentScheduler = {
  stop: () => void
  runNow: () => Promise<void>
}

export function startContentScheduler(options: {
  intervalMs: number
  logger?: SchedulerLogger
  now?: () => Date
}): ContentScheduler {
  let running = false

  const runNow = async () => {
    if (running) return
    running = true
    try {
      const result = await publishDueContent(options.now?.() ?? new Date(), options.logger)
      if (!result.skipped && (result.published > 0 || result.failed > 0)) {
        options.logger?.info(result, 'Scheduled publishing tick complete')
      }
    } catch (error) {
      options.logger?.error({ err: error }, 'Scheduled publishing tick failed')
    } finally {
      running = false
    }
  }

  // Catch anything already overdue as soon as the process is up.
  void runNow()

  const timer = setInterval(() => void runNow(), options.intervalMs)
  // Do not keep the process alive solely for the scheduler (tests, CLI jobs).
  timer.unref?.()

  return { stop: () => clearInterval(timer), runNow }
}
