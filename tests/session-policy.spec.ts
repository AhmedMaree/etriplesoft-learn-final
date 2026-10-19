import { test, expect } from "@playwright/test";
import {
  SESSION_LIMITS,
  currentActivity,
  isMaxAgeExceeded,
  isSessionExpired,
  parseActivity,
  serializeActivity,
  sessionScopeFor,
  signedInAt,
} from "../src/lib/supabase/session-policy";

const sid = "3f1c2b4a-0000-4000-8000-000000000001";
const now = 2_000_000_000;
const claimsAt = (timestamp: number) => ({ session_id: sid, amr: [{ method: "password", timestamp }] });

test("activity cookie round-trips and rejects malformed values", () => {
  const activity = { sessionId: sid, startedAt: now - 10, lastActiveAt: now };
  expect(parseActivity(serializeActivity(activity))).toEqual(activity);
  for (const bad of [undefined, "", "x", `${sid}.1`, `${sid}.1.2.3`, `${sid}.a.2`, `bad id!.1.2`]) {
    expect(parseActivity(bad)).toBeNull();
  }
});

test("sign-in time comes from the first amr timestamp, so an MFA step-up cannot extend it", () => {
  expect(signedInAt({ amr: [{ method: "totp", timestamp: 9 }, { method: "password", timestamp: 5 }] })).toBe(5);
  expect(signedInAt({ amr: ["password"] })).toBeNull();
  expect(signedInAt({})).toBeNull();
});

test("a cookie from another session or the future starts a fresh record", () => {
  const foreign = serializeActivity({ sessionId: "other", startedAt: 1, lastActiveAt: 1 });
  expect(currentActivity(claimsAt(now - 5), foreign, now)).toEqual({ sessionId: sid, startedAt: now - 5, lastActiveAt: now });
  const future = serializeActivity({ sessionId: sid, startedAt: now, lastActiveAt: now + 999 });
  expect(currentActivity(claimsAt(now), future, now)?.lastActiveAt).toBe(now);
  expect(currentActivity({}, foreign, now)).toBeNull();
});

test("learner sessions end after 7 idle days or 30 days in total", () => {
  const { idleSeconds, maxSeconds } = SESSION_LIMITS.learner;
  const active = (last: number, started = now - 60) => ({ sessionId: sid, startedAt: started, lastActiveAt: last });
  expect(isSessionExpired(claimsAt(now - 60), active(now - idleSeconds), "learner", now)).toBe(false);
  expect(isSessionExpired(claimsAt(now - 60), active(now - idleSeconds - 1), "learner", now)).toBe(true);
  expect(isSessionExpired(claimsAt(now - maxSeconds), active(now), "learner", now)).toBe(false);
  expect(isSessionExpired(claimsAt(now - maxSeconds - 1), active(now), "learner", now)).toBe(true);
});

test("admin limits are 1 idle hour and 12 hours in total", () => {
  const activity = { sessionId: sid, startedAt: now - 60, lastActiveAt: now - 61 * 60 };
  expect(isSessionExpired(claimsAt(now - 60), activity, "learner", now)).toBe(false);
  expect(isSessionExpired(claimsAt(now - 60), activity, "admin", now)).toBe(true);
  expect(isMaxAgeExceeded(claimsAt(now - 13 * 3600), null, "admin", now)).toBe(true);
  expect(isMaxAgeExceeded(claimsAt(now - 11 * 3600), null, "admin", now)).toBe(false);
  // Without amr timestamps the first recorded activity stands in for the sign-in time.
  expect(isMaxAgeExceeded({ session_id: sid }, { sessionId: sid, startedAt: now - 13 * 3600, lastActiveAt: now }, "admin", now)).toBe(true);
});

test("admin scope covers the admin area and admin APIs only", () => {
  for (const path of ["/en/admin", "/ar/admin/courses/x", "/api/admin/content", "/api/learning/quiz/author"]) {
    expect(sessionScopeFor(path)).toBe("admin");
  }
  for (const path of ["/en/overview", "/en/administrator", "/en/courses", "/api/learning/quiz"]) {
    expect(sessionScopeFor(path)).toBe("learner");
  }
});
