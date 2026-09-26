import { BadResponseError } from './parse'

export type AiErrorKind = 'no-key' | 'invalid-key' | 'quota' | 'offline' | 'network' | 'model' | 'blocked' | 'bad-response' | 'cancelled'

const MESSAGES: Record<AiErrorKind, string> = {
  'no-key': 'Add your free Gemini API key in Me → AI food scan to use photo scanning.',
  'invalid-key': 'Google rejected your API key. Check it in Me → AI food scan.',
  quota: 'You’ve reached the free Gemini limit for now. Wait a minute and try again — the limit resets daily.',
  offline: 'You’re offline. Photo scanning needs internet; you can still add foods by search.',
  network: 'Couldn’t reach Google. Check your connection and try again.',
  model: 'The AI model isn’t available right now. Try again later.',
  blocked: 'This photo couldn’t be analysed. Try another photo.',
  'bad-response': 'The AI reply didn’t make sense. Try again, or add foods by search.',
  cancelled: 'Cancelled.',
}

export class AiError extends Error {
  readonly kind: AiErrorKind

  constructor(kind: AiErrorKind, message = MESSAGES[kind]) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
  }
}

/** Turns SDK / network failures into a friendly AiError. */
export function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e
  if (e instanceof BadResponseError) return new AiError('bad-response', e.message === 'The AI reply was not in the expected format.' ? undefined : e.message)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new AiError('offline')
  const err = e as { name?: string; status?: number; message?: string }
  if (err?.name === 'AbortError') return new AiError('cancelled')
  const status = typeof err?.status === 'number' ? err.status : undefined
  const msg = String(err?.message ?? '')
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) return new AiError('quota')
  if (status === 401 || status === 403 || /API[_ ]?key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) return new AiError('invalid-key')
  if (status === 404 || /not found for API version|is not found|NOT_FOUND/i.test(msg)) return new AiError('model')
  if (/SAFETY|blocked|PROHIBITED/i.test(msg)) return new AiError('blocked')
  if (status !== undefined && status >= 500) return new AiError('network', 'Google’s servers are busy. Try again in a moment.')
  if (err?.name === 'TypeError' || /fetch|network|Failed to/i.test(msg)) return new AiError('network')
  return new AiError('bad-response')
}
