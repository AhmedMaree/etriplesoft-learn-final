import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Flame } from "lucide-react";
import type { LearningStreak } from "@/features/calendar/types";
import { civilAsUtcDate, parseDayKey } from "@/features/calendar/dates";
import { RailHead } from "./learning-summary";
import "./learning-streak.css";

/** Current and longest streak with the last seven local days; hidden when the streak is unavailable. */
export async function LearningStreakCard({
  streak,
}: {
  streak: LearningStreak | null;
}) {
  if (!streak) return null;
  const t = await getTranslations("streak");
  const format = await getFormatter();
  const message = streak.activeToday
    ? t("activeToday")
    : streak.current
      ? t("keepItAlive")
      : t("start");
  return (
    <section className="rl-card rl-streak" aria-labelledby="rl-streak-title">
      <RailHead
        id="rl-streak-title"
        title={t("title")}
        subtitle={t("subtitle")}
        href="/calendar"
        accent="orange"
      />
      <div className="streak-main">
        <span
          className={`streak-flame ${streak.current ? "lit" : ""}`}
          aria-hidden="true"
        >
          <Flame />
        </span>
        <div>
          <strong>{t("days", { count: streak.current })}</strong>
          <p>{message}</p>
        </div>
      </div>
      <ol className="streak-week" aria-label={t("weekLabel")}>
        {streak.week.map((day) => {
          const date = parseDayKey(day.date);
          const label = date
            ? format.dateTime(civilAsUtcDate(date), {
                timeZone: "UTC",
                weekday: "short",
                numberingSystem: "latn",
              })
            : day.date;
          const full = date
            ? format.dateTime(civilAsUtcDate(date), {
                timeZone: "UTC",
                weekday: "long",
                month: "long",
                day: "numeric",
                numberingSystem: "latn",
              })
            : day.date;
          return (
            <li
              key={day.date}
              className={`${day.active ? "on" : ""} ${day.date === streak.today ? "today" : ""}`}
            >
              <span className="streak-dot" aria-hidden="true">
                {day.active && <Check size={14} strokeWidth={3} />}
              </span>
              <small aria-hidden="true">{label}</small>
              <span className="visually-hidden">
                {t(day.active ? "dayActive" : "dayInactive", { day: full })}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="streak-foot">
        {t("longest", { count: streak.longest })} ·{" "}
        {t("total", { count: streak.totalDays })}
      </p>
    </section>
  );
}
