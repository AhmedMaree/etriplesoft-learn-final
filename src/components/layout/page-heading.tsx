import { useTranslations } from "next-intl";

export function PageHeading({
  page,
  title,
  subtitle,
}: {
  page: string;
  title: string;
  subtitle: string;
}) {
  const common = useTranslations("common");
  const navigation = useTranslations("navigation");
  const courses = useTranslations("courses");
  const ai = useTranslations("ai");
  const assessment = useTranslations("assessment");
  const calendar = useTranslations("calendar");
  const certificates = useTranslations("certificates");
  const settings = useTranslations("settings");
  const checkout = useTranslations("checkout");
  const dashboard = useTranslations("dashboard");
  const copy = {
    overview: [dashboard("pageTitle"), dashboard("pageSubtitle")],
    courses: [courses("allCourses"), courses("subtitle")],
    "ai-page": [ai("title"), ai("subtitle")],
    community: [navigation("community"), common("communitySubtitle")],
    messages: [navigation("messages"), common("messagesSubtitle")],
    calendar: [calendar("title"), calendar("subtitle")],
    certificates: [certificates("title"), certificates("subtitle")],
    settings: [settings("title"), settings("subtitle")],
    assessment: [assessment("title"), assessment("instructions")],
    payment: [checkout("title"), checkout("subtitle")],
  }[page];
  const standalone = ["courses", "payment", "certificates"].includes(page);
  return (
    <div className={`page-heading heading-${page} ${standalone ? "standalone" : ""}`}>
      <h1>{copy?.[0] ?? title}</h1>
      <p>{copy?.[1] ?? subtitle}</p>
    </div>
  );
}
