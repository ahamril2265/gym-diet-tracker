import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { updateProfile } from '../../db/actions'
import type { Profile } from '../../db/types'
import { draftFromProfile, validateDraft, type DraftErrors, type ProfileDraft, type Units } from './profileDraft'
import { ProfileFields } from './ProfileFields'

export function ProfileCard({ profile, units }: { profile: Profile; units: Units }) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile, units))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pick up outside changes (e.g. a weigh-in or unit switch) when there are no unsaved edits.
  useEffect(() => {
    if (!dirty) setDraft(draftFromProfile(profile, units))
  }, [profile, units.weightUnit, units.lengthUnit, dirty])

  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(t)
  }, [saved])

  async function save() {
    const r = validateDraft(draft, units)
    if (!r.ok) {
      setErrors(r.errors)
      return
    }
    const { weightKg, ...rest } = r.value
    // Only log a weigh-in when the weight really changed (not from unit rounding).
    const weightChanged = Math.abs(weightKg - profile.weightKg) >= 0.05
    await updateProfile(weightChanged ? { ...rest, weightKg } : rest)
    setErrors({})
    setDirty(false)
    setSaved(true)
  }

  return (
    <section className="card p-5" aria-labelledby="profile-h">
      <h2 id="profile-h" className="h-display mb-4 text-[24px]">
        Profile
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <ProfileFields
          draft={draft}
          units={units}
          errors={errors}
          onChange={(patch) => {
            setDraft((d) => ({ ...d, ...patch }))
            setDirty(true)
          }}
        />
        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={!dirty}>
            Save profile
          </Button>
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(draftFromProfile(profile, units))
                setErrors({})
                setDirty(false)
              }}
            >
              Discard
            </Button>
          )}
          {saved && (
            <span role="status" className="flex items-center gap-1 text-[14px] font-bold text-accent">
              <Check size={16} aria-hidden="true" /> Saved
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
