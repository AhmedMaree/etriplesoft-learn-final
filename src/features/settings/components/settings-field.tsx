"use client";

import { Field, type FieldProps } from "@/components/ui/field";
import { useStoredValue } from "@/lib/browser/demo-storage";

function parseProfileFields(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((entry) => typeof entry === "string")
    ) {
      const fields: Record<string, string> = {};
      for (const [key, entry] of Object.entries(parsed)) {
        if (typeof entry === "string") fields[key] = entry;
      }
      return fields;
    }
  } catch {
    // Invalid local demo data falls back to the field's default value.
  }
  return {};
}

export function SettingsField(props: FieldProps) {
  const savedData = useStoredValue("profile-data", "{}");
  const savedFields = parseProfileFields(savedData);
  const key = props.name || props.label;

  return <Field {...props} value={savedFields[key] ?? props.value} />;
}

export { parseProfileFields };
