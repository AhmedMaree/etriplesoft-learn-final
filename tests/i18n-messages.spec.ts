import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[keyPath] = value;
    else Object.assign(out, flatten(value, keyPath));
    return out;
  }, {});
}

const load = (locale: string) =>
  flatten(JSON.parse(readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")) as Tree);
const english = load("en");
const arabic = load("ar");

test("English and Arabic messages expose identical keys", () => {
  expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
});

test("Arabic messages are not corrupted placeholders", () => {
  const corrupted = Object.entries(arabic)
    .filter(([, value]) => /\?{2,}/.test(value))
    .map(([key]) => key);
  expect(corrupted).toEqual([]);
});

test("messages contain no mojibake and no empty values", () => {
  for (const [locale, messages] of [["en", english], ["ar", arabic]] as const) {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.trim(), `${locale}:${key} is empty`).not.toBe("");
      expect(value, `${locale}:${key} has mojibake`).not.toMatch(/[ÃÂâ][\u0080-¿€™œ]/);
    }
  }
});

test("ICU placeholders match between locales", () => {
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(english)) {
    expect(placeholders(arabic[key] ?? ""), key).toEqual(placeholders(english[key]));
  }
});
