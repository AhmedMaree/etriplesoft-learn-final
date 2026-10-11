import Image from "next/image";
import { getMarketing } from "../../lib/get-marketing";

export async function LearningFramework() {
  const { m } = await getMarketing();
  const framework = m.home.framework;

  return (
    <section className="mk-section mk-section--surface" aria-labelledby="mk-framework-title">
      <div className="mk-container mk-framework">
        <div className="mk-framework-steps">
          <h2 id="mk-framework-title" className="mk-h3">
            {framework.title}
          </h2>
          <ol>
            {framework.steps.map((step, index) => (
              <li key={step.title}>
                <span className="mk-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p className="mk-body">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mk-framework-image">
          <Image
            src="/marketing/how-you-will-learn.png"
            alt={framework.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
