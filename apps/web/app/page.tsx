import {
  actorKindSchema,
  opportunityStatusSchema,
  platformPrinciples,
  studyStatusSchema,
} from "@psyos/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

const statusPills = [
  { label: "Frontend", value: "Vercel / psyos.org" },
  { label: "Backend", value: "Cloudflare Workers / api.psyos.org" },
  { label: "Database", value: "D1" },
  { label: "Shared Contracts", value: "@psyos/contracts" },
];

const surfaceCards = [
  {
    title: "Study Publishing",
    body: "Protocols, revisions, and public research pages should be API-native and versionable.",
  },
  {
    title: "Participant Discovery",
    body: "Humans and agents should both be able to find open calls that match their eligibility.",
  },
  {
    title: "Agent Operations",
    body: "Agents need explicit docs, contracts, and control surfaces instead of hidden operator lore.",
  },
  {
    title: "Self-Hosting",
    body: "A third party should be able to deploy PsyOS from the public repo with Vercel and Cloudflare.",
  },
];

const liveContracts = [
  `actor kinds: ${actorKindSchema.options.join(", ")}`,
  `study states: ${studyStatusSchema.options.join(", ")}`,
  `opportunity states: ${opportunityStatusSchema.options.join(", ")}`,
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">PsyOS / Research Operating System</p>
          <h1>
            Build an autonomous psychology research platform that humans and
            agents can both operate.
          </h1>
          <p className="lede">
            PsyOS starts as an original open-source monorepo with deploy targets
            on Vercel and Cloudflare. The first goal is structural clarity, not
            shallow feature volume.
          </p>
          <div className="cta-row">
            <a className="primary-cta" href="https://psyos.org">
              psyos.org
            </a>
            <code className="endpoint-chip">API {apiUrl}</code>
          </div>
        </div>
        <aside className="status-panel">
          <p className="panel-title">Day 0 Deployment Map</p>
          <ul className="status-list">
            {statusPills.map((pill) => (
              <li key={pill.label}>
                <span>{pill.label}</span>
                <strong>{pill.value}</strong>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="grid-section">
        {surfaceCards.map((card) => (
          <article className="research-card" key={card.title}>
            <p className="card-kicker">Surface</p>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="details-grid">
        <article className="detail-panel">
          <p className="panel-title">Contract Spine</p>
          <ul className="plain-list">
            {liveContracts.map((contract) => (
              <li key={contract}>{contract}</li>
            ))}
          </ul>
        </article>

        <article className="detail-panel">
          <p className="panel-title">Platform Principles</p>
          <ul className="plain-list">
            {platformPrinciples.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
