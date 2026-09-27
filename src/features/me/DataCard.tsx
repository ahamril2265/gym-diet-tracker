import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileSpreadsheet, HardDrive, Share2, Upload } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { RadioCard } from '../../components/RadioCard'
import { createBackup, exportCsv, parseBackup, restoreBackup, type Backup, type CsvKind, type TableName } from '../../db/backup'
import { db } from '../../db/db'
import { toISODate } from '../../lib/date'
import { canShareFile, downloadBlob, formatBytes } from '../../lib/download'

const LAST_BACKUP_KEY = 'gdt.lastBackup'

const CSVS: { kind: CsvKind; label: string }[] = [
  { kind: 'workouts', label: 'Workout sets' },
  { kind: 'food', label: 'Food log' },
  { kind: 'weight', label: 'Body weight' },
  { kind: 'measurements', label: 'Measurements' },
]

const TABLE_LABEL: Partial<Record<TableName, string>> = {
  workouts: 'Workouts',
  sets: 'Sets',
  foodLogs: 'Food entries',
  foods: 'Foods',
  bodyWeights: 'Weigh-ins',
  measurements: 'Measurements',
  photos: 'Photos',
  splitDays: 'Routines',
  exercises: 'Exercises',
}

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

/** Export (JSON backup + CSVs), import from a backup, and storage status. */
export function DataCard() {
  const navigate = useNavigate()
  const photoStats = useLiveQuery(async () => {
    const photos = await db.photos.toArray()
    return { count: photos.length, bytes: photos.reduce((s, p) => s + p.blob.size, 0) }
  })
  const [includePhotos, setIncludePhotos] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [storage, setStorage] = useState<{ usage: number; persisted: boolean } | null>(null)
  const [lastBackup, setLastBackup] = useState(readLastBackup)
  const [pending, setPending] = useState<{ backup: Backup; counts: Partial<Record<TableName, number>> } | null>(null)

  const refreshStorage = async () => {
    try {
      const [est, persisted] = await Promise.all([navigator.storage?.estimate?.(), navigator.storage?.persisted?.()])
      setStorage({ usage: est?.usage ?? 0, persisted: Boolean(persisted) })
    } catch {
      setStorage(null)
    }
  }
  useEffect(() => {
    void refreshStorage()
  }, [])

  const backupFile = async () => {
    const backup = await createBackup(db, { includePhotos })
    return new File([JSON.stringify(backup)], `gym-diet-backup-${toISODate()}.json`, { type: 'application/json' })
  }

  const markBackedUp = () => {
    const today = toISODate()
    try {
      localStorage.setItem(LAST_BACKUP_KEY, today)
    } catch {
      // ignore
    }
    setLastBackup(today)
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMessage(`Couldn’t ${label.toLowerCase()}: ${(e as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const shareProbe = typeof File !== 'undefined' ? new File(['{}'], 'x.json', { type: 'application/json' }) : null
  const canShare = shareProbe ? canShareFile(shareProbe) : false
  const stale = !lastBackup || lastBackup < new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10)

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="data-h">
      <h2 id="data-h" className="h-display text-[24px]">
        Your data
      </h2>
      <p className="flex items-start gap-2 text-[13px] font-semibold text-muted">
        <HardDrive size={16} className="mt-px shrink-0" aria-hidden="true" />
        <span>
          Everything is stored in this browser on this phone{storage ? ` (${formatBytes(storage.usage)} used)` : ''}. Clearing site data or
          uninstalling removes it — keep a backup.
          {lastBackup ? ` Last backup: ${lastBackup}.` : ' No backup yet.'}
        </span>
      </p>
      {storage && !storage.persisted && (
        <Button
          size="sm"
          variant="surface"
          className="self-start"
          onClick={async () => {
            const ok = await navigator.storage?.persist?.().catch(() => false)
            await refreshStorage()
            setMessage(ok ? 'Storage is now protected from automatic clean-up.' : 'The browser didn’t allow it yet — installing the app to your home screen usually helps.')
          }}
        >
          Protect storage from clean-up
        </Button>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">Full backup (.json)</h3>
        {photoStats && photoStats.count > 0 && (
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[14px] font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[#FFB627]" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
            Include progress photos ({photoStats.count}, about {formatBytes(Math.round(photoStats.bytes * 1.37))})
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            icon={<Download size={18} aria-hidden="true" />}
            disabled={busy !== null}
            onClick={() =>
              void run('Download backup', async () => {
                const file = await backupFile()
                downloadBlob(file, file.name)
                markBackedUp()
                setMessage(`Saved ${file.name} (${formatBytes(file.size)}).`)
              })
            }
          >
            {busy === 'Download backup' ? 'Preparing…' : 'Download backup'}
          </Button>
          {canShare && (
            <Button
              variant="surface"
              icon={<Share2 size={18} aria-hidden="true" />}
              disabled={busy !== null}
              onClick={() =>
                void run('Share backup', async () => {
                  const file = await backupFile()
                  await navigator.share({ files: [file], title: 'Gym & Diet backup' })
                  markBackedUp()
                })
              }
            >
              Share…
            </Button>
          )}
        </div>
        {stale && <p className="text-[12px] font-semibold text-flame">Tip: back up every couple of weeks, and before switching phones.</p>}
        <p className="text-[12px] text-faint">Your Gemini API key is never included in backups.</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">Spreadsheets (.csv)</h3>
        <div className="grid grid-cols-2 gap-2">
          {CSVS.map((c) => (
            <Button
              key={c.kind}
              variant="surface"
              size="sm"
              icon={<FileSpreadsheet size={16} aria-hidden="true" />}
              disabled={busy !== null}
              onClick={() =>
                void run(`Export ${c.label}`, async () => {
                  const csv = await exportCsv(db, c.kind)
                  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `gym-diet-${c.kind}-${toISODate()}.csv`)
                })
              }
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">Restore</h3>
        <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 self-start rounded-btn border border-border bg-surface-2 px-5 text-[15px] font-bold active:bg-border has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const parsed = parseBackup(await f.text())
              if (!parsed.ok) setMessage(parsed.error)
              else setPending({ backup: parsed.backup, counts: parsed.counts })
            }}
          />
          <Upload size={18} aria-hidden="true" /> Restore from backup…
        </label>
      </div>

      {message && (
        <p role="status" className="text-[13px] font-semibold text-muted">
          {message}
        </p>
      )}

      <RestoreSheet
        pending={pending}
        onClose={() => setPending(null)}
        onRestored={() => {
          setPending(null)
          setMessage('Backup restored.')
          navigate('/', { replace: true })
        }}
      />
    </section>
  )
}

function RestoreSheet({
  pending,
  onClose,
  onRestored,
}: {
  pending: { backup: Backup; counts: Partial<Record<TableName, number>> } | null
  onClose: () => void
  onRestored: () => void
}) {
  const [mode, setMode] = useState<'replace' | 'merge'>('replace')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const name = useId()
  return (
    <BottomSheet open={pending !== null} onClose={onClose} title="Restore backup">
      {pending && (
        <div className="flex flex-col gap-4 p-4">
          <p className="text-[14px] text-muted">
            Backup from <strong className="text-fg">{new Date(pending.backup.exportedAt).toLocaleString('en-IN')}</strong>
            {pending.backup.includesPhotos ? ' (with photos)' : ' (without photos)'}.
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
            {(Object.keys(TABLE_LABEL) as TableName[])
              .filter((t) => pending.counts[t])
              .map((t) => (
                <li key={t} className="flex justify-between">
                  <span className="text-muted">{TABLE_LABEL[t]}</span>
                  <span className="num font-bold">{pending.counts[t]}</span>
                </li>
              ))}
          </ul>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-bold text-muted">How to restore</legend>
            <RadioCard name={name} value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} title="Replace everything">
              Wipes this phone’s data first, then restores the backup exactly
            </RadioCard>
            <RadioCard name={name} value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} title="Merge">
              Adds the backup to what’s here; items in both are overwritten by the backup
            </RadioCard>
          </fieldset>
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}
          <Button
            block
            variant={mode === 'replace' ? 'danger' : 'accent'}
            disabled={busy}
            onClick={async () => {
              if (mode === 'replace' && !window.confirm('Replace ALL data on this phone with the backup? This can’t be undone.')) return
              setBusy(true)
              setError(null)
              try {
                await restoreBackup(db, pending.backup, mode)
                onRestored()
              } catch (e) {
                setError(`Restore failed, nothing was changed: ${(e as Error).message}`)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Restoring…' : mode === 'replace' ? 'Replace and restore' : 'Merge backup'}
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
