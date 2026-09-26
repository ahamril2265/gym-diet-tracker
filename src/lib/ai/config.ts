/**
 * Gemini model used for photo and label scanning. Keep this the only place the model is named.
 * Free-tier Flash model per https://ai.google.dev/gemini-api/docs/models (checked 2026-09-26).
 * If Google retires it, the app shows a "model unavailable" error — update this constant.
 */
export const GEMINI_MODEL = 'gemini-3.8-flash'

/** Below this, an item or label is shown with a "check this" warning. */
export const LOW_CONFIDENCE = 0.6

/** Where people create a free key. */
export const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey'
