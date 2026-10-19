'use client'

import { useId, useState } from 'react'
import { useLocale } from 'next-intl'
import type { LucideIcon } from 'lucide-react'
import type { AcademicOption } from '@/features/auth/academic-options'

const OTHER = '__other__'

// A list of suggested values plus an "Other" choice that reveals a free-text input.
// Whichever control is active submits under `name`, so server actions read one field.
export function ChoiceOrOtherField({
  label,
  name,
  icon: Icon,
  options,
  value = '',
  selectPlaceholder,
  otherLabel,
  otherInputLabel,
  otherPlaceholder,
  required = false,
  maxLength,
  invalid = false,
  errorId,
}: {
  label: string
  name: string
  icon?: LucideIcon
  options: AcademicOption[]
  value?: string
  selectPlaceholder: string
  otherLabel: string
  otherInputLabel: string
  otherPlaceholder: string
  required?: boolean
  maxLength?: number
  invalid?: boolean
  errorId?: string
}) {
  const locale = useLocale()
  const id = useId()
  const saved = value.trim()
  const match = saved ? options.find((option) => option.en === saved || option.ar === saved) : undefined
  const [choice, setChoice] = useState(match ? match.en : saved ? OTHER : '')
  const isOther = choice === OTHER
  const describedBy = invalid ? errorId : undefined

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </label>
      <div className="input-wrap">
        {Icon && <Icon size={20} aria-hidden="true" />}
        <select
          id={id}
          name={isOther ? undefined : name}
          value={choice}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => setChoice(event.currentTarget.value)}
        >
          <option value="" disabled>{selectPlaceholder}</option>
          {options.map((option) => (
            <option key={option.en} value={option.en}>{locale === 'ar' ? option.ar : option.en}</option>
          ))}
          <option value={OTHER}>{otherLabel}</option>
        </select>
      </div>
      {isOther && (
        <div className="input-wrap">
          <input
            name={name}
            aria-label={otherInputLabel}
            defaultValue={match ? '' : saved}
            placeholder={otherPlaceholder}
            required={required}
            maxLength={maxLength}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
        </div>
      )}
    </div>
  )
}
