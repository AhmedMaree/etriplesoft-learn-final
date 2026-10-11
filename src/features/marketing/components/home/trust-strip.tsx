import { Clock, Network, Users, Wrench, type LucideIcon } from "lucide-react";
import { getMarketing } from "../../lib/get-marketing";

const icons: LucideIcon[] = [Network, Wrench, Users, Clock];

export async function TrustStrip() {
  const { m } = await getMarketing();

  return (
    <section className="mk-trust" aria-label={m.home.trust.label}>
      <ul className="mk-container mk-trust-list">
        {m.home.trust.items.map((label, index) => {
          const Icon = icons[index] ?? Network;
          return (
            <li key={label}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
