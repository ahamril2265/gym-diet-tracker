import { CircleCheck, Eye, EyeOff, KeyRound, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { updateSettings } from '../../db/actions'
import { GEMINI_KEY_URL, GEMINI_MODEL } from '../../lib/ai/config'

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'error'; message: string }

/** Gemini API key entry. The key is stored in this device's IndexedDB and only ever sent to Google. */
export function AiKeyCard({ apiKey }: { apiKey: string | null }) {
  const [value, setValue] = useState(apiKey ?? '')
  const [show, setShow] = useState(false)
  const [test, setTest] = useState<TestState>({ kind: 'idle' })
  const dirty = value.trim() !== (apiKey ?? '')

  useEffect(() => setValue(apiKey ?? ''), [apiKey])

  const save = async () => {
    await updateSettings({ geminiApiKey: value.trim() || null })
    setTest({ kind: 'idle' })
  }

  const runTest = async () => {
    const key = value.trim()
    if (!key) return
    setTest({ kind: 'testing' })
    try {
      const { testGeminiKey } = await import('../../lib/ai/gemini')
      await testGeminiKey(key)
      if (dirty) await updateSettings({ geminiApiKey: key })
      setTest({ kind: 'ok' })
    } catch (e) {
      setTest({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <section id="ai" className="card flex flex-col gap-4 p-5" aria-labelledby="ai-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ai-h" className="h-display text-[24px]">
          AI food scan
        </h2>
        {apiKey ? <Chip tone="accent">Key saved</Chip> : <Chip>No key</Chip>}
      </div>
      <p className="text-[14px] text-muted">
        Meal photos and nutrition labels are read by Google Gemini using your own free API key. Get one at{' '}
        <a href={GEMINI_KEY_URL} target="_blank" rel="noreferrer noopener" className="font-bold text-accent underline underline-offset-2">
          aistudio.google.com/apikey
        </a>
        .
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-muted">Gemini API key</span>
          <span className="relative">
            <KeyRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              type={show ? 'text' : 'password'}
              className="input pl-11 pr-14 font-mono text-[15px]"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="AIza…"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setTest({ kind: 'idle' })
              }}
            />
            <IconButton
              label={show ? 'Hide key' : 'Show key'}
              variant="ghost"
              className="absolute right-0.5 top-1/2 -translate-y-1/2"
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </IconButton>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={!dirty}>
            Save key
          </Button>
          <Button variant="surface" size="sm" disabled={!value.trim() || test.kind === 'testing'} onClick={() => void runTest()}>
            {test.kind === 'testing' ? 'Testing…' : 'Test key'}
          </Button>
          {apiKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue('')
                void updateSettings({ geminiApiKey: null })
                setTest({ kind: 'idle' })
              }}
            >
              Remove
            </Button>
          )}
        </div>
        <p role="status" aria-live="polite" className="min-h-[20px] text-[13px] font-semibold">
          {test.kind === 'ok' && (
            <span className="flex items-center gap-1.5 text-accent">
              <CircleCheck size={16} aria-hidden="true" /> Key works — photo scanning is ready.
            </span>
          )}
          {test.kind === 'error' && (
            <span className="flex items-start gap-1.5 text-danger">
              <TriangleAlert size={16} className="mt-px shrink-0" aria-hidden="true" /> {test.message}
            </span>
          )}
        </p>
      </form>

      <p className="text-[12px] text-faint">
        Your key is stored only on this device and is sent only to Google when you scan. Photos go to Google for
        analysis; barcodes go to Open Food Facts; nothing else leaves your phone. Model: {GEMINI_MODEL}.
      </p>
    </section>
  )
}
