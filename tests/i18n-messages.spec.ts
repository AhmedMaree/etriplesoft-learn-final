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
  // Collect ICU argument names. In "{count, plural, one {course} other {courses}}" only
  // "count" is an argument; the braces after selectors wrap translatable text, not arguments.
  const placeholders = (value: string): string[] => {
    const names = new Set<string>();
    const message = (i: number, stopAtBrace: boolean): number => {
      while (i < value.length) {
        const ch = value[i];
        if (ch === "}" && stopAtBrace) return i;
        if (ch !== "{") { i += 1; continue; }
        const close = value.indexOf("}", i);
        const head = /^\{\s*(\w+)\s*([,}])/.exec(value.slice(i, close + 1));
        if (!head) { i += 1; continue; }
        names.add(head[1]);
        if (head[2] === "}") { i = close + 1; continue; }
        // Complex argument: skip "type," then read "selector {message}" pairs.
        let j = value.indexOf(",", i + head[0].length - 1);
        j = value.indexOf(",", j + 1) + 1;
        while (j < value.length && value[j] !== "}") {
          const open = value.indexOf("{", j);
          if (open < 0) break;
          j = message(open + 1, true) + 1;
          while (value[j] === " ") j += 1;
        }
        i = j + 1;
      }
      return i;
    };
    message(0, false);
    return [...names].sort();
  };
  for (const key of Object.keys(english)) {
    expect(placeholders(arabic[key] ?? ""), key).toEqual(placeholders(english[key]));
  }
});
