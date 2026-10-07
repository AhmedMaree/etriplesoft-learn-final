"use client";

import { useState } from 'react';
import type { ChangeEventHandler } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FieldProps = {
  label: string;
  icon?: LucideIcon;
  type?: string;
  value?: string;
  placeholder?: string;
  options?: string[];
  name?: string;
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  dir?: 'ltr' | 'rtl' | 'auto';
  readOnly?: boolean;
};

export function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  placeholder,
  options,
  name,
  required = false,
  onChange,
  autoComplete,
  minLength,
  maxLength,
  dir,
  readOnly = false,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const initial = value;
  return (
    <label className="field">
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      <div className="input-wrap">
        {Icon && <Icon size={20} />}
        {options ? (
          <select
            aria-label={label}
            name={name || label}
            defaultValue={initial || ""}
            required={required}
            onChange={onChange}
          >
            {!initial && (
              <option value="" disabled>
                {placeholder || "Please select"}
              </option>
            )}
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            aria-label={label}
            name={name || label}
            dir={dir ?? (["email", "url", "tel", "password"].includes(type) ? "ltr" : undefined)}
            type={type === "password" && show ? "text" : type}
            defaultValue={initial}
            placeholder={placeholder}
            required={required}
            min={type === "number" ? 1 : undefined}
            autoComplete={autoComplete}
            minLength={minLength}
            maxLength={maxLength}
            readOnly={readOnly}
          />
        )}
        {type === "password" && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow(!show)}
          >
            {show ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}
