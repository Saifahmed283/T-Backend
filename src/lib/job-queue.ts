import { config } from '../config/config.js'

/*
 * A tiny in-process work queue.
 *
 * Request handlers should not wait for side effects that the caller does not
 * depend on. Submission notifications are the first user: a recorded submission
 * returns immediately, and the mailer runs after the response.
 *
 * Two constraints shape this:
 *  - The integration suite asserts on the in-memory mail outbox right after the
 *    response, so under `NODE_ENV=test` a job runs inline and `enqueueJob`
 *    resolves only once it has finished.
 *  - Work must not disappear on a rolling deploy, so shutdown drains the queue
 *    (bounded by a timeout) before the process exits.
 *
 * Retries are deliberately in-process and small. This is not a durable broker;
 * a job that must survive a crash belongs in a real queue (BullMQ/SQS).
 */

type JobLogger = {
  info: (context: Record<string, unknown>, message?: string) => void
  error: (context: Record<string, unknown>, message?: string) => void
}

type Job = {
  name: string
  run: () => Promise<void>
  attempt: number
}

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500
const DRAIN_TIMEOUT_MS = 5_000

const queue: Job[] = []
let pumping = false
let logger: JobLogger | undefined
const idleWaiters: Array<() => void> = []

export function configureJobQueue(options: { logger?: JobLogger }): void {
  logger = options.logger
}

function notifyIfIdle(): void {
  if (queue.length > 0 || pumping) return
  while (idleWaiters.length > 0) idleWaiters.pop()?.()
}

async function execute(job: Job): Promise<void> {
  try {
    await job.run()
  } catch (error) {
    if (job.attempt < MAX_ATTEMPTS) {
      job.attempt += 1
      queue.push(job)
      logger?.error(
        { event: 'job.retry', job: job.name, attempt: job.attempt, err: error instanceof Error ? error.message : String(error) },
        'job failed; retrying',
      )
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * job.attempt))
      return
    }
    logger?.error(
      { event: 'job.failed', job: job.name, attempts: job.attempt, err: error instanceof Error ? error.message : String(error) },
      'job failed permanently',
    )
  }
}

async function pump(): Promise<void> {
  if (pumping) return
  pumping = true
  try {
    while (queue.length > 0) {
      const job = queue.shift()
      if (job) await execute(job)
    }
  } catch (error) {
    logger?.error({ err: error }, 'job queue pump failed')
  } finally {
    pumping = false
    notifyIfIdle()
  }
}

/**
 * Queue a side effect. In production this resolves as soon as the job is
 * accepted; the caller never waits for the work.
 */
export async function enqueueJob(name: string, run: () => Promise<void>): Promise<void> {
  if (config.isTest) {
    // Deterministic ordering for assertions on the request's side effects.
    try {
      await run()
    } catch (error) {
      logger?.error(
        { event: 'job.failed', job: name, err: error instanceof Error ? error.message : String(error) },
        'inline job failed',
      )
    }
    return
  }

  queue.push({ name, run, attempt: 1 })
  setImmediate(() => {
    void pump()
  })
}

/** Wait for queued work to finish, bounded so a stuck job cannot block exit. */
export async function drainJobQueue(timeoutMs = DRAIN_TIMEOUT_MS): Promise<void> {
  if (queue.length === 0 && !pumping) return
  let timer: NodeJS.Timeout | undefined
  const drained = new Promise<void>((resolve) => {
    idleWaiters.push(resolve)
  })
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs)
  })
  await Promise.race([drained, timeout])
  if (timer) clearTimeout(timer)
  if (queue.length > 0) {
    logger?.error({ event: 'job.drain_timeout', pending: queue.length }, 'job queue did not drain before shutdown')
  }
}

/** Visible for tests and operational probes. */
export function pendingJobCount(): number {
  return queue.length
}
