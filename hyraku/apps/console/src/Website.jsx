import { useEffect, useState } from 'react';

// Standing in for hyraku.in.
//
// The whole point of the public site is that it has no login and no forms — it
// exists to be found, and to hand the visitor to WhatsApp with context already
// attached. Every button here is a wa.me deep link with prefilled text, which
// is what lets the bot skip the questions the click already answered.

export default function Website({ onDeepLink, customerPhone }) {
  const [catalog, setCatalog] = useState({ trades: [], districts: [] });

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, []);

  return (
    <div className="site">
      <div className="hero">
        <h1>Verified electricians, plumbers and carpenters across Kerala.</h1>
        <p>
          No app to install. No account to create. Tap below and book on WhatsApp — we will
          confirm your worker within the hour.
        </p>
        <div className="cta-row">
          <button className="cta" onClick={() => onDeepLink('Hi Hyraku, I want to book a service')}>
            Book a service
          </button>
          <button
            className="cta alt"
            onClick={() => onDeepLink('Hi Hyraku, I want to register as a worker')}
          >
            Work with us
          </button>
        </div>
      </div>

      <p className="note">
        In production each button is a <code>wa.me</code> link that opens WhatsApp with the message
        prefilled. Here it sends the same text into the simulator on the left, as{' '}
        <code>{customerPhone}</code> — which is exactly what the webhook would receive.
      </p>

      <div className="section-head">
        <h2>Book a trade directly</h2>
      </div>

      <div className="trades">
        {catalog.trades.map((t) => (
          <button
            key={t.id}
            className="trade-card"
            onClick={() => onDeepLink(`Hi Hyraku, I want to book a ${t.label}`)}
          >
            <div className="tn">{t.label}</div>
            <div className="tm">{t.labelMl}</div>
            <div className="tr">from ₹{t.typicalRate}/day</div>
          </button>
        ))}
      </div>

      <p className="note" style={{ marginTop: 20 }}>
        Tapping a trade carries it into the message, so the bot never asks which trade you need —
        it starts at the next question. A per-worker link (<code>…book HY-000004</code>) works the
        same way and records the request as a customer preference for the dispatcher.
      </p>
    </div>
  );
}
