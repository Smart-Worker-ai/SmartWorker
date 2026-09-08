import { useEffect, useRef, useState } from 'react';
import { api } from './api';

// The WhatsApp simulator.
//
// Deliberately not a mock: it renders the same persisted messages the Cloud API
// would have sent, so what is on screen is what the real channel produces.

export default function Phone({ phone, personas, onChangePhone }) {
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [openList, setOpenList] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  async function load() {
    if (!phone) return;
    try {
      setThread(await api.thread(phone));
    } catch {
      /* the poll retries on its own */
    }
  }

  useEffect(() => {
    setThread(null);
    setOpenList(null);
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [phone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages?.length]);

  async function send(payload) {
    if (busy) return;
    setBusy(true);
    setOpenList(null);
    try {
      await api.send({ phone, ...payload });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    send({ text });
  }

  function attach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      send({ media: { data: String(reader.result), mimeType: file.type || 'image/jpeg' } });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const all = [...(personas?.customers ?? []), ...(personas?.workers ?? [])];
  const current = all.find((p) => p.phone === phone);
  const initials = (thread?.name ?? current?.label ?? 'H')
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="phone-panel">
      <div className="phone-head">
        <select value={phone} onChange={(e) => onChangePhone(e.target.value)}>
          <optgroup label="Customers">
            {(personas?.customers ?? []).map((p) => (
              <option key={p.phone} value={p.phone}>{p.label}</option>
            ))}
          </optgroup>
          <optgroup label="Workers">
            {(personas?.workers ?? []).map((p) => (
              <option key={p.phone} value={p.phone}>{p.label}</option>
            ))}
          </optgroup>
        </select>
        <button
          className="icon-btn"
          title="Clear this conversation"
          onClick={async () => {
            await api.reset(phone);
            load();
          }}
        >
          Reset
        </button>
      </div>

      <div className="wa-header">
        <div className="wa-avatar">{initials}</div>
        <div>
          <div className="who">Hyraku</div>
          <div className="sub">
            {phone}
            {thread?.activeFlow ? ` · ${thread.activeFlow}/${thread.stepId ?? '—'}` : ''}
          </div>
        </div>
      </div>

      <div className="wa-thread">
        {thread?.messages?.length === 0 && (
          <div className="wa-empty">
            No messages yet.
            <br />
            Say <strong>hi</strong>, or open the Website tab and tap a booking link.
          </div>
        )}

        {(thread?.messages ?? []).map((m) => {
          const fromUser = m.direction === 'in';
          const p = m.payload ?? {};
          return (
            <div key={m.id} className={`bubble ${fromUser ? 'out' : 'in'}`}>
              {m.templateName && <span className="tmpl">template · {m.templateName}</span>}
              {m.type === 'image' && fromUser ? '📎 Photo sent' : m.body}

              {!fromUser && p.kind === 'buttons' && (
                <div className="wa-actions">
                  {p.buttons.map((b) => (
                    <button
                      key={b.id}
                      className="wa-action"
                      disabled={busy}
                      onClick={() => send({ replyId: b.id, text: b.title })}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
              )}

              {!fromUser && p.kind === 'list' && (
                <>
                  <button className="wa-list-btn" onClick={() => setOpenList(openList === m.id ? null : m.id)}>
                    ☰ {p.buttonLabel}
                  </button>
                  {openList === m.id && (
                    <div className="wa-actions">
                      {p.sections.flatMap((s) => s.rows).map((r) => (
                        <button
                          key={r.id}
                          className="wa-row"
                          disabled={busy}
                          onClick={() => send({ replyId: r.id, text: r.title })}
                        >
                          <span className="rt">{r.title}</span>
                          {r.description && <span className="rd">{r.description}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!fromUser && p.kind === 'media_request' && (
                <div className="wa-actions">
                  <button className="wa-action" disabled={busy} onClick={() => fileRef.current?.click()}>
                    📎 Attach a photo
                  </button>
                </div>
              )}

              <span className="stamp">
                {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="wa-compose" onSubmit={submit}>
        <input type="file" accept="image/*" ref={fileRef} onChange={attach} hidden />
        <button type="button" className="attach" title="Send a photo" onClick={() => fileRef.current?.click()}>
          📎
        </button>
        <input
          type="text"
          placeholder="Type a message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button className="wa-send" type="submit" disabled={busy || !draft.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
