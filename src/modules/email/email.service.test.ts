import { afterEach, describe, expect, it } from 'vitest'
import { config } from '../../config/config.js'
import { clearEmailOutbox, getEmailOutbox, sendEmail, type EmailLogger } from './email.service.js'

const originalEnabled = config.EMAIL_ENABLED
const originalProvider = config.EMAIL_PROVIDER

function recordingLogger(): { logger: EmailLogger; events: string[] } {
  const events: string[] = []
  const push = (level: string) => () => {
    events.push(level)
  }
  return { events, logger: { info: push('info'), warn: push('warn'), error: push('error') } }
}

afterEach(() => {
  config.EMAIL_ENABLED = originalEnabled
  config.EMAIL_PROVIDER = originalProvider
  clearEmailOutbox()
})

describe('email service', () => {
  it('is a logged no-op when email is disabled', async () => {
    config.EMAIL_ENABLED = false
    const { logger, events } = recordingLogger()
    const result = await sendEmail({ to: 'reader@example.org', subject: 'Hello', text: 'Body' }, logger)

    expect(result).toEqual({ sent: false, reason: 'disabled' })
    expect(getEmailOutbox()).toHaveLength(0)
    expect(events).toEqual(['info'])
  })

  it('keeps messages in memory when the test provider is enabled', async () => {
    config.EMAIL_ENABLED = true
    config.EMAIL_PROVIDER = 'memory'
    const { logger } = recordingLogger()

    const result = await sendEmail({ to: 'reader@example.org', subject: 'Hello', text: 'Body', kind: 'test' }, logger)

    expect(result).toEqual({ sent: true })
    expect(getEmailOutbox()).toEqual([{ to: 'reader@example.org', subject: 'Hello', text: 'Body', kind: 'test' }])
  })

  it('never attempts delivery without a recipient', async () => {
    config.EMAIL_ENABLED = true
    config.EMAIL_PROVIDER = 'memory'
    const { logger, events } = recordingLogger()

    const result = await sendEmail({ to: '', subject: 'Hello', text: 'Body' }, logger)

    expect(result).toEqual({ sent: false, reason: 'missing_recipient' })
    expect(getEmailOutbox()).toHaveLength(0)
    expect(events).toEqual(['warn'])
  })
})
