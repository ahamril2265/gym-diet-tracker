import { GEMINI_MODEL } from './config'
import { AiError, toAiError } from './errors'
import { parseLabelResponse, parseMealResponse, type LabelResult, type MealItem } from './parse'
import { LABEL_PROMPT, LABEL_SCHEMA, MEAL_PROMPT, MEAL_SCHEMA } from './prompts'

/*
 * Gemini calls go straight from the browser to Google with the user's own key (kept in IndexedDB).
 * Only the photo and the prompt are sent. The SDK is loaded on demand so it isn't in the main bundle.
 */

async function client(apiKey: string | null | undefined) {
  if (!apiKey?.trim()) throw new AiError('no-key')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AiError('offline')
  const { GoogleGenAI } = await import('@google/genai')
  return new GoogleGenAI({ apiKey: apiKey.trim() })
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk))
  return btoa(bin)
}

async function askWithImage(apiKey: string | null | undefined, image: Blob, prompt: string, schema: unknown, signal?: AbortSignal) {
  try {
    const ai = await client(apiKey)
    const data = await blobToBase64(image)
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: image.type || 'image/jpeg', data } }, { text: prompt }] }],
      config: { responseMimeType: 'application/json', responseJsonSchema: schema, abortSignal: signal },
    })
    const text = res.text
    if (!text) throw new AiError('blocked')
    return text
  } catch (e) {
    throw toAiError(e)
  }
}

/** Finds foods in a meal photo (JPEG ≤ 1024 px). */
export async function analyzeMealPhoto(apiKey: string | null | undefined, image: Blob, signal?: AbortSignal): Promise<MealItem[]> {
  const text = await askWithImage(apiKey, image, MEAL_PROMPT, MEAL_SCHEMA, signal)
  try {
    return parseMealResponse(text)
  } catch (e) {
    throw toAiError(e)
  }
}

/** Reads per-100 g values and the serving size from a nutrition-label photo. */
export async function readNutritionLabel(apiKey: string | null | undefined, image: Blob, signal?: AbortSignal): Promise<LabelResult> {
  const text = await askWithImage(apiKey, image, LABEL_PROMPT, LABEL_SCHEMA, signal)
  try {
    return parseLabelResponse(text)
  } catch (e) {
    throw toAiError(e)
  }
}

/** Cheap call to check a key works (no image). */
export async function testGeminiKey(apiKey: string): Promise<void> {
  try {
    const ai = await client(apiKey)
    await ai.models.generateContent({ model: GEMINI_MODEL, contents: 'Reply with the single word OK.' })
  } catch (e) {
    throw toAiError(e)
  }
}
