import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { RadioCard } from '../../components/RadioCard'
import { Segmented } from '../../components/Segmented'
import { completeOnboarding } from '../../db/actions'
import { SPLIT_TEMPLATES } from '../../db/seed/splitTemplates'
import type { GoalMode } from '../../db/types'
import { bmrMifflinStJeor, calcTargets, tdee } from '../../lib/calc/targets'
import { GoalModePicker } from '../me/GoalModePicker'
import { ProfileFields } from '../me/ProfileFields'
import {
  convertDraftUnits,
  EMPTY_DRAFT,
  validateDraft,
  type DraftErrors,
  type ProfileDraft,
  type ProfileValues,
  type Units,
} from '../me/profileDraft'
import { SplitWeek } from '../me/SplitWeek'
import { TargetTiles } from '../me/TargetTiles'

const STEPS = ['About you', 'Your goal', 'Training split'] as const
const METRIC: Units = { weightUnit: 'kg', lengthUnit: 'cm' }
const IMPERIAL: Units = { weightUnit: 'lb', lengthUnit: 'in' }
const NO_SPLIT = 'none'

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT)
  const [units, setUnits] = useState<Units>(METRIC)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [profile, setProfile] = useState<ProfileValues | null>(null)
  const [goal, setGoal] = useState<GoalMode>('recomp')
  const [templateId, setTemplateId] = useState<string>(SPLIT_TEMPLATES[0]!.id)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const templateName = useId()

  const preview = useMemo(() => {
    if (!profile) return null
    return {
      targets: calcTargets({ ...profile, goal }),
      maintenance: Math.round(tdee(bmrMifflinStJeor(profile), profile.activity)),
    }
  }, [profile, goal])

  const template = SPLIT_TEMPLATES.find((t) => t.id === templateId) ?? null

  function next() {
    if (step === 0) {
      const r = validateDraft(draft, units)
      if (!r.ok) {
        setErrors(r.errors)
        return
      }
      setErrors({})
      setProfile(r.value)
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo(0, 0)
  }

  async function finish() {
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    try {
      await completeOnboarding({ ...profile, goal }, template, units)
      navigate('/', { replace: true })
    } catch (e) {
      console.error(e)
      setSaveError("Couldn't save. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-accent' : 'bg-surface-2')} />
          ))}
        </div>
        <p className="eyebrow mt-5">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="h-display mt-1 text-[44px]">{STEPS[step]}</h1>

        {step === 0 && (
          <div className="mt-6 flex flex-col gap-5">
            <Segmented
              legend="Units"
              options={[
                { value: 'metric', label: 'kg · cm' },
                { value: 'imperial', label: 'lb · ft/in' },
              ]}
              value={units.weightUnit === 'kg' ? 'metric' : 'imperial'}
              onChange={(v) => {
                const to = v === 'metric' ? METRIC : IMPERIAL
                setDraft((d) => convertDraftUnits(d, units, to))
                setUnits(to)
              }}
            />
            <ProfileFields
              draft={draft}
              units={units}
              errors={errors}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
          </div>
        )}

        {step === 1 && preview && (
          <div className="mt-6 flex flex-col gap-5">
            <p className="text-[15px] text-muted">
              Pick a mode. You can switch any time from <strong className="text-fg">Me</strong> and targets update
              everywhere.
            </p>
            <GoalModePicker value={goal} onChange={setGoal} />
            <section className="card p-5" aria-live="polite">
              <p className="eyebrow">Your daily targets</p>
              <div className="mt-3">
                <TargetTiles targets={preview.targets} />
              </div>
              <p className="num mt-4 text-[13px] text-faint">
                Maintenance (TDEE) ≈ {preview.maintenance.toLocaleString('en-IN')} kcal · Mifflin-St Jeor
              </p>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 flex flex-col gap-5">
            <p className="text-[15px] text-muted">Start from a template. You can edit days and exercises later.</p>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Split template</legend>
              {SPLIT_TEMPLATES.map((t) => (
                <RadioCard
                  key={t.id}
                  name={templateName}
                  value={t.id}
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                  title={t.name}
                >
                  {t.blurb}
                </RadioCard>
              ))}
              <RadioCard
                name={templateName}
                value={NO_SPLIT}
                checked={templateId === NO_SPLIT}
                onChange={() => setTemplateId(NO_SPLIT)}
                title="No split yet"
              >
                I'll build my own later
              </RadioCard>
            </fieldset>
            {template && (
              <section className="card p-4">
                <p className="eyebrow mb-3">Your week</p>
                <SplitWeek
                  schedule={template.schedule}
                  nameOf={(key) => template.days.find((d) => d.key === key)?.name.replace('Full Body ', 'FB ') ?? ''}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <div className="pb-safe sticky bottom-0 border-t border-divider bg-bg px-4 pt-3">
        {saveError && (
          <p role="alert" className="mb-2 text-[13px] font-semibold text-danger">
            {saveError}
          </p>
        )}
        <div className="flex gap-3 pb-3">
          {step > 0 && (
            <Button variant="surface" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft size={18} aria-hidden="true" />}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button block onClick={next}>
              Next
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          ) : (
            <Button block onClick={() => void finish()} disabled={saving}>
              {saving ? 'Saving…' : "Let's go"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
