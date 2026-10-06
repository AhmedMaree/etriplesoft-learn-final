import { Link } from "@/i18n/navigation";
import { Settings, ArrowRight, BarChart3, Briefcase, Trophy } from "lucide-react";
import { Panel, Title, IconBox, Progress } from "@/components/ui/primitives";
import { useTranslations, useFormatter } from "next-intl";

export function ProgressPanel({ completed = 2 }: { completed?: number }) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  return (
    <Panel>
      <Title link={t("viewDetails")} href="/certificates">
        {t("progressTitle")}
      </Title>
      <div className="progress-summary">
        <div className="ring">
          <strong>{format.number(0.3, { style: "percent", numberingSystem: "latn" })}</strong>
        </div>
        <div>
          <h3>{t("keepGoing")}</h3>
          <p>{t("completeLessons")}</p>
        </div>
      </div>
      <div className="completion">
        <Trophy />
        <div>
          <b>{format.number(completed, { numberingSystem: "latn" })} / 10</b> {t("lessonsCompleted")}
          <Progress value={completed * 10} />
        </div>
      </div>
    </Panel>
  );
}

export function Paths() {
  const t = useTranslations("dashboard");
  const courseT = useTranslations("courses");
  const format = useFormatter();
  return (
    <>
      <Title href="/courses">{t("pathsTitle")}</Title>
      <div className="paths">
        {[
          "Odoo Functional Consultant",
          "Odoo Developer",
          "Odoo Implementation Specialist",
        ].map((name, index) => (
          <Link className="path panel" key={name} href="/courses">
            <IconBox
              icon={[Briefcase, Settings, BarChart3][index]}
              color={index === 0 ? "green" : "blue"}
            />
            <div>
              <strong dir="ltr">{name}</strong>
              <p dir="ltr">
                {
                  [
                    "Master Odoo business apps and implementation.",
                    "Learn technical development from basics to advanced.",
                    "End-to-end implementation skills for real projects.",
                  ][index]
                }
              </p>
            </div>
            <small>
              {format.number(index === 1 ? 6 : 5, { numberingSystem: "latn" })} {courseT("courseUnit")}　|　{format.number([40, 50, 35][index], { numberingSystem: "latn" })} {t("hoursUnit")}
            </small>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </>
  );
}
