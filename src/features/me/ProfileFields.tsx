import { useId } from 'react'
import { Field } from '../../components/Field'
import { RadioCard } from '../../components/RadioCard'
import { Segmented } from '../../components/Segmented'
import { ACTIVITY_OPTIONS, type DraftErrors, type ProfileDraft, type Units } from './profileDraft'

export interface ProfileFieldsProps {
  draft: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>) => void
  units: Units
  errors: DraftErrors
}

/** Profile inputs shared by onboarding and the Me screen. Values are strings in display units. */
export function ProfileFields({ draft, onChange, units, errors }: ProfileFieldsProps) {
  const activityName = useId()
  return (
    <div className="flex flex-col gap-5">
      <Field label="Name" error={errors.name}>
        {(p) => (
          <input
            {...p}
            className="input"
            autoComplete="given-name"
            maxLength={30}
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Segmented
          legend="Sex"
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={draft.sex}
          onChange={(sex) => onChange({ sex })}
        />
        <Field label="Age" error={errors.age} suffix="yrs">
          {(p) => (
            <input
              {...p}
              className="input num pr-12"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft.age}
              onChange={(e) => onChange({ age: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {units.lengthUnit === 'cm' ? (
          <Field label="Height" error={errors.height} suffix="cm">
            {(p) => (
              <input
                {...p}
                className="input num pr-12"
                inputMode="decimal"
                value={draft.heightCm}
                onChange={(e) => onChange({ heightCm: e.target.value })}
              />
            )}
          </Field>
        ) : (
          <fieldset className="flex min-w-0 flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-bold text-muted">Height</legend>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Feet</span>
                <input
                  className="input num pr-8"
                  inputMode="numeric"
                  aria-invalid={errors.height ? true : undefined}
                  value={draft.heightFt}
                  onChange={(e) => onChange({ heightFt: e.target.value })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-faint">ft</span>
              </label>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Inches</span>
                <input
                  className="input num pr-8"
                  inputMode="numeric"
                  aria-invalid={errors.height ? true : undefined}
                  value={draft.heightIn}
                  onChange={(e) => onChange({ heightIn: e.target.value })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-faint">in</span>
              </label>
            </div>
            {errors.height && <p className="text-[12px] font-semibold text-danger">{errors.height}</p>}
          </fieldset>
        )}
        <Field label="Weight" error={errors.weight} suffix={units.weightUnit}>
          {(p) => (
            <input
              {...p}
              className="input num pr-12"
              inputMode="decimal"
              value={draft.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
            />
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-bold text-muted">Activity level</legend>
        {ACTIVITY_OPTIONS.map((o) => (
          <RadioCard
            key={o.value}
            name={activityName}
            value={o.value}
            checked={draft.activity === o.value}
            onChange={() => onChange({ activity: o.value })}
            title={o.label}
          >
            {o.desc}
          </RadioCard>
        ))}
      </fieldset>
    </div>
  )
}
