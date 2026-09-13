import { useEffect, useState } from 'react';

// Standing in for hyraku.in.
//
// The public site has no login and no forms — it exists to be found, and to
// hand the visitor to WhatsApp with context already attached. Every button is a
// wa.me link with prefilled text, which is what lets the bot skip the questions
// the click already answered. Click-to-WhatsApp ads work the same way.
//
// Before launch the site's job is recruitment, so "Work with us" leads.
// No rates appear anywhere: pay is agreed between customer and worker directly.

export default function Website({ onDeepLink, customerPhone, bookingsOpen, serviceArea }) {
  const [catalog, setCatalog] = useState({ trades: [] });

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
  }, []);

  return (
    <div className="site">
      <div className="hero">
        {!bookingsOpen && <div className="hero-flag">Launching soon in {serviceArea}</div>}
        <h1>
          {bookingsOpen
            ? `Verified electricians, plumbers and carpenters in ${serviceArea}.`
            : `Skilled at your trade? Get work in ${serviceArea}.`}
        </h1>
        <p>
          {bookingsOpen
            ? 'No app to install and no account to create. Tap below and book on WhatsApp — we will confirm your worker within the hour.'
            : `Hyraku connects customers in ${serviceArea} with verified workers. Registration is free, takes two minutes on WhatsApp, and you agree your pay directly with every customer.`}
        </p>
        <div className="cta-row">
          {bookingsOpen ? (
            <>
              <button className="cta" onClick={() => onDeepLink('Hi Hyraku, I want to book a service')}>
                Book a service
              </button>
              <button className="cta alt" onClick={() => onDeepLink('Hi Hyraku, I want to register as a worker')}>
                Work with us
              </button>
            </>
          ) : (
            <>
              <button className="cta" onClick={() => onDeepLink('Hi Hyraku, I want to register as a worker')}>
                Register as a worker — free
              </button>
              <button className="cta alt" onClick={() => onDeepLink('Hi Hyraku, I want to book a service')}>
                I need a worker
              </button>
            </>
          )}
        </div>
      </div>

      <p className="note">
        In production each button is a <code>wa.me</code> link that opens WhatsApp with the message
        prefilled. Here it sends the same text into the simulator on the left, as{' '}
        <code>{customerPhone}</code> — exactly what the webhook would receive.
        {!bookingsOpen && ' Bookings are closed, so the booking button shows the pre-launch reply.'}
      </p>

      <div className="section-head">
        <h2>{bookingsOpen ? 'Book a trade directly' : 'Trades we are recruiting'}</h2>
      </div>

      <div className="trades">
        {catalog.trades.map((t) => (
          <button
            key={t.id}
            className="trade-card"
            onClick={() =>
              onDeepLink(
                bookingsOpen
                  ? `Hi Hyraku, I want to book a ${t.label}`
                  : `Hi Hyraku, I want to register as a worker`
              )
            }
          >
            <div className="tn">{t.label}</div>
            <div className="tm">{t.labelMl}</div>
            <div className="tr">{bookingsOpen ? 'Book on WhatsApp →' : 'Join on WhatsApp →'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
