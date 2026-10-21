import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import "./admin-checkout-funnel.css";

export const FUNNEL_WINDOWS = [7, 30, 90] as const;
const STEPS = ["carted", "started", "billing", "payment", "paid"] as const;

type Funnel = Record<(typeof STEPS)[number], number> & {
  abandoned: { slug: string; learners: number }[];
};

function parseFunnel(value: unknown): Funnel | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    !STEPS.every((step) => typeof row[step] === "number") ||
    !Array.isArray(row.abandoned)
  )
    return null;
  return {
    ...(Object.fromEntries(STEPS.map((step) => [step, row[step]])) as Record<
      (typeof STEPS)[number],
      number
    >),
    abandoned: row.abandoned
      .filter(
        (item): item is { slug: string; learners: number } =>
          Boolean(item) &&
          typeof item.slug === "string" &&
          typeof item.learners === "number",
      )
      .slice(0, 5),
  };
}

/** Admin view of where buyers drop off between adding to cart and paying. */
export async function AdminCheckoutFunnel({ days }: { days: number }) {
  const t = await getTranslations("cartFunnel");
  const format = await getFormatter();
  const client = await createClient();
  const { data, error } = await client.rpc("admin_checkout_funnel", {
    p_days: days,
  });
  const funnel = error ? null : parseFunnel(data);
  const top = funnel ? Math.max(1, ...STEPS.map((step) => funnel[step])) : 1;
  const number = (value: number) =>
    format.number(value, { numberingSystem: "latn" });

  return (
    <section
      className="panel admin-card"
      aria-labelledby="admin-checkout-funnel"
    >
      <div className="admin-card-head">
        <h2 id="admin-checkout-funnel">{t("title")}</h2>
        <nav className="admin-funnel-window" aria-label={t("window")}>
          {FUNNEL_WINDOWS.map((window) => (
            <Link
              key={window}
              href={`/admin/coupons?days=${window}`}
              aria-current={window === days ? "page" : undefined}
            >
              {t("days", { days: number(window) })}
            </Link>
          ))}
        </nav>
      </div>
      <p className="admin-funnel-intro">{t("description")}</p>
      {!funnel ? (
        <p className="admin-status error" role="alert">
          {t("error")}
        </p>
      ) : (
        <div className="admin-funnel-grid">
          <ol className="admin-funnel">
            {STEPS.map((step, index) => {
              const value = funnel[step];
              const previous = index ? funnel[STEPS[index - 1]] : 0;
              return (
                <li key={step}>
                  <div className="admin-funnel-label">
                    <span>{t(`steps.${step}`)}</span>
                    <strong dir="ltr">{number(value)}</strong>
                  </div>
                  <div className="admin-funnel-bar" aria-hidden="true">
                    <span
                      style={{ width: `${Math.round((value / top) * 100)}%` }}
                    />
                  </div>
                  {index > 0 && previous > 0 && (
                    <small>
                      {t("ofPrevious", {
                        percent: number(
                          Math.min(100, Math.round((value / previous) * 100)),
                        ),
                      })}
                    </small>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="admin-funnel-abandoned">
            <h3>{t("abandonedTitle")}</h3>
            {funnel.abandoned.length ? (
              <ul>
                {funnel.abandoned.map((item) => (
                  <li key={item.slug}>
                    <span dir="ltr">{item.slug}</span>
                    <strong>{t("learners", { count: item.learners })}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("abandonedEmpty")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
