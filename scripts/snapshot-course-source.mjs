import { mkdir, writeFile } from "node:fs/promises";

// Read-only snapshot of the public, user-approved curriculum source. No login or media download.
const courses = [
  ["python-fundamentals", "python-fundamentals-1"],
  ["crash-course-odoo-erp", "crash-course-odoo-erp-2"],
  ["odoo-development", "odoo-development-3"],
  ["odoo-implementation", "odoo-implementation-4"],
  ["odoo-user-guide", "odoo-user-guide-5"],
  ["odoo-system-admin", "odoo-system-admin-6"],
];
const plain = (text) =>
  text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
await mkdir("tmp/course-source", { recursive: true });
const snapshots = await Promise.all(
  courses.map(async ([slug, sourceSlug]) => {
    const source = `https://etriple.odoo.com/slides/${sourceSlug}`;
    const response = await fetch(source, {
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`Source unavailable: ${slug}`);
    const html = await response.text();
    await writeFile(`tmp/course-source/${slug}.html`, html);
    const modules = [
      ...html.matchAll(
        /<div data-category-id="(\d+)" class="o_wslides_slide_list_category_header[\s\S]*?<div class="d-flex align-items-center[\s\S]*?<span>([\s\S]*?)<\/span>/g,
      ),
    ].map((match) => ({
      sourceId: match[1],
      title: plain(match[2]),
      lessons: [],
    }));
    for (const match of html.matchAll(
      /<li\b([^>]*class="o_wslides_slides_list_slide o_wslides_js_list_item[^>]*)>([\s\S]*?)<\/li>/g,
    )) {
      const category = match[1].match(/data-category-id="(\d+)"/)?.[1];
      const sourceId = match[1].match(/data-slide-id="(\d+)"/)?.[1];
      const content = match[2];
      const title = content.match(
        /<div class="text-truncate me-auto">([\s\S]*?)<\/div>/,
      )?.[1];
      let group = modules.find((item) => item.sourceId === (category ?? "0"));
      if (!group && (category === "0" || !category)) {
        group = { sourceId: category ?? "0", title: "Modules", lessons: [] };
        modules.push(group);
      }
      if (!group || !title || !sourceId)
        throw new Error(`Unmatched source lesson: ${slug}`);
      group.lessons.push({
        sourceId,
        title: plain(title),
        type: content.includes("fa-file-pdf-o")
          ? "resource"
          : content.includes("fa-play-circle-o")
            ? "video"
            : content.includes("fa-trophy")
              ? "assessment"
              : "article",
        preview: /Free Preview|>Preview</.test(content),
      });
    }
    if (!modules.length || !modules.some((item) => item.lessons.length))
      throw new Error(`No curriculum parsed: ${slug}`);
    await writeFile(`tmp/course-source/${slug}.html`, html);
    return { slug, source, modules };
  }),
);
await writeFile(
  "tmp/course-source/curriculum.json",
  JSON.stringify(snapshots, null, 2),
);
for (const course of snapshots)
  console.log(
    `${course.slug}: ${course.modules.length} modules, ${course.modules.reduce((count, module) => count + module.lessons.length, 0)} lessons`,
  );
