import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMarketing } from "../../lib/get-marketing";
import { formatMessage } from "../../lib/messages";
import { getAllModules, getCoursesForModule } from "../../lib/module-queries";
import { EcosystemExplorer, type ExplorerModule } from "./ecosystem-explorer";

export async function OdooModulesPreview() {
  const { locale, m } = await getMarketing();
  const copy = m.home.ecosystem;
  const modules = getAllModules(locale);

  const explorerModules: ExplorerModule[] = modules.map((mod) => {
    const [firstCourse] = getCoursesForModule(mod.slug, locale);
    return {
      slug: mod.slug,
      name: mod.name,
      shortDescription: mod.shortDescription,
      icon: mod.icon,
      accent: mod.accent,
      workflow: mod.workflow,
      skills: mod.skills.slice(0, 3),
      relatedRole: mod.relatedRoles[0] ?? null,
      featuredCourse: firstCourse
        ? {
            slug: firstCourse.slug,
            title:
              m.paths.courseEditorial[firstCourse.slug as keyof typeof m.paths.courseEditorial]?.title ??
              firstCourse.title,
          }
        : null,
    };
  });

  const titles = Object.fromEntries(
    modules.map((mod) => [mod.slug, formatMessage(locale, copy.moduleTitle, { name: mod.name })]),
  );

  return (
    <section className="mk-section mk-section--eco" aria-labelledby="mk-eco-title">
      <div className="mk-container">
        <div className="mk-section-head mk-section-head--tight">
          <span className="mk-eyebrow-plain">{copy.eyebrow}</span>
          <h2 id="mk-eco-title" className="mk-h2 mk-h2--md">
            {copy.title}
          </h2>
          <p className="mk-body">{copy.lead}</p>
        </div>

        <EcosystemExplorer
          modules={explorerModules}
          copy={{
            ...copy,
            coreModules: formatMessage(locale, copy.coreModules, { count: String(modules.length) }),
          }}
          titles={titles}
        />

        <div className="mk-center">
          <Link href="/odoo-modules" className="mk-link-arrow">
            {copy.exploreAll}
            <ArrowRight size={16} className="mk-flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
