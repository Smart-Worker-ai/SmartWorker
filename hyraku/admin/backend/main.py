import csv
import io
import json
import os
import re
import secrets
from collections import Counter, defaultdict
from datetime import datetime
from io import BytesIO, StringIO

import pyotp
import qrcode
from fastapi import Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth_utils import (
    clear_session,
    decrypt_login_blob,
    hash_password,
    login_public_spki,
    make_token,
    read_token,
    require_admin,
    set_session,
    verify_password,
)
from database import Base, SessionLocal, engine, get_db
from models import AdminUser, BookableTrade, Booking, CompanySettings, CrewMember, Customer, Enquiry
from pdfs import booking_packet_pdf, monthly_report_pdf, roster_table_pdf

app = FastAPI(title="Hyraku Admin", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5176").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def bootstrap():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(AdminUser).first():
            user = os.getenv("HYRAKU_ADMIN_USER", "hyraku")
            pw = os.getenv("HYRAKU_ADMIN_PASSWORD", "HyrakuAdmin#2026")
            db.add(AdminUser(username=user, password_hash=hash_password(pw)))
        if not db.query(CompanySettings).first():
            db.add(CompanySettings())
        seed_bookable_trades(db)
        db.commit()
    finally:
        db.close()


def upsert_customer(db: Session, name: str, phone: str, town: str, locality: str) -> Customer:
    phone = normalize_mobile(phone)
    row = db.query(Customer).filter(Customer.phone == phone).first()
    now = datetime.utcnow()
    if row:
        row.name = name or row.name
        row.town = town or row.town
        row.locality = locality or row.locality
        row.last_enquiry_at = now
        return row
    row = Customer(name=name, phone=phone, town=town or "", locality=locality or "", last_enquiry_at=now)
    db.add(row)
    db.flush()
    return row


def company(db: Session) -> CompanySettings:
    return db.query(CompanySettings).first()


def normalize_mobile(raw: str) -> str:
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return digits


def is_indian_mobile(phone: str) -> bool:
    return bool(re.fullmatch(r"[6-9][0-9]{9}", phone or ""))


CREW_TRADES = [
    "General Labour",
    "Concrete Finisher / Cement Setter",
    "Wall Builder",
    "Stone Breaker / Stone Setter",
    "Tiler",
    "Painter",
]
CREW_ROLES = {
    "General Labour": ["Labour"],
    "Concrete Finisher / Cement Setter": ["Head Mason", "Helper"],
    "Wall Builder": ["Head Mason", "Helper"],
    "Stone Breaker / Stone Setter": ["Head Mason", "Helper"],
    "Tiler": ["Head Mason", "Helper"],
    "Painter": ["Painter", "Labour"],
}

SEED_TRADES = [
    ("general-workers", "General Labour", "General Labour", "labour", 1000, 10),
    ("concrete-finisher", "Concrete Finisher / Cement Setter", "Concrete Finisher / Cement Setter", "mason_helper", 1200, 20),
    ("bricklayer", "Wall Builder", "Wall Builder", "mason_helper", 1200, 30),
    ("stone-setter", "Stone Breaker / Stone Setter", "Stone Breaker / Stone Setter", "mason_helper", 1300, 40),
    ("tiler", "Tiler", "Tiler", "mason_helper", 1200, 50),
    ("painter", "Painter", "Painter", "painter", 1200, 60),
]
ROLE_SET_CREW = {
    "labour": ["Labour"],
    "mason_helper": ["Head Mason", "Helper"],
    "painter": ["Painter", "Labour"],
}


def seed_bookable_trades(db: Session) -> None:
    existing = {row.slug for row in db.query(BookableTrade).all()}
    for slug, name, short_name, role_set, rate, order in SEED_TRADES:
        if slug in existing:
            continue
        db.add(BookableTrade(
            slug=slug,
            name=name,
            short_name=short_name,
            role_set=role_set,
            rate_per_day=rate,
            available=True,
            sort_order=order,
        ))


def crew_roles_for(role_set: str) -> list[str]:
    return list(ROLE_SET_CREW.get(role_set) or ROLE_SET_CREW["labour"])


def subroles_for(role_set: str, rate: float) -> list[dict]:
    helper = max(1000, int(rate) - 200)
    if role_set == "mason_helper":
        return [
            {"id": "mason", "name": "Head Masons", "ratePerDay": int(rate)},
            {"id": "helper", "name": "Helpers", "ratePerDay": helper},
        ]
    if role_set == "painter":
        return [{"id": "painter", "name": "Painters / Labour", "ratePerDay": int(rate)}]
    return [{"id": "labour", "name": "Labourers", "ratePerDay": int(rate)}]


def slugify_trade(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (slug or "trade")[:60]


def listed_trades(db: Session) -> list[BookableTrade]:
    seed_bookable_trades(db)
    db.commit()
    return db.query(BookableTrade).order_by(BookableTrade.sort_order, BookableTrade.id).all()


def _trade_out(row: BookableTrade) -> dict:
    return {
        "id": row.id,
        "slug": row.slug,
        "name": row.name,
        "short_name": row.short_name or row.name,
        "role_set": row.role_set,
        "rate_per_day": row.rate_per_day,
        "available": bool(row.available),
        "sort_order": row.sort_order,
        "crew_roles": crew_roles_for(row.role_set),
        "subRoles": subroles_for(row.role_set, row.rate_per_day),
    }


bootstrap()


def _is_letter_text(text: str) -> bool:
    if not (2 <= len(text) <= 80) or not text[0].isalpha():
        return False
    return all(ch.isalpha() or ch in " .'-" for ch in text)


def validate_person_name(value: str, label: str = "Name") -> str:
    name = (value or "").strip()
    if not _is_letter_text(name):
        raise HTTPException(400, f"{label} must be 2–80 letters (spaces, apostrophes and hyphens allowed).")
    return name


def validate_place(value: str, label: str, required: bool = False) -> str:
    text = (value or "").strip()
    if not text:
        if required:
            raise HTTPException(400, f"{label} is required.")
        return ""
    if not _is_letter_text(text):
        raise HTTPException(400, f"{label} must be 2–80 letters.")
    return text


def allowed_crew_roles(db: Session, trade: str) -> list[str]:
    row = db.query(BookableTrade).filter(BookableTrade.name == trade).first()
    if row:
        return crew_roles_for(row.role_set)
    return CREW_ROLES.get(trade) or []


def validate_crew_fields(body: "CrewIn", db: Session) -> dict:
    name = validate_person_name(body.name)
    phone = normalize_mobile(body.phone)
    if not is_indian_mobile(phone):
        raise HTTPException(400, "Mobile number is required and must be a valid 10-digit Indian number.")
    trade = (body.trade or "").strip()
    known = {t.name for t in listed_trades(db)} | set(CREW_TRADES)
    if trade not in known:
        raise HTTPException(400, "Select a trade from the list.")
    role = (body.role or "").strip()
    allowed = allowed_crew_roles(db, trade)
    if role not in allowed:
        raise HTTPException(400, f"Role must be one of: {', '.join(allowed)}.")
    town = validate_place(body.town, "Town")
    notes = (body.notes or "").strip()
    if len(notes) > 500:
        raise HTTPException(400, "Notes must be 500 characters or fewer.")
    return {
        "name": name,
        "phone": phone,
        "trade": trade,
        "role": role,
        "town": town,
        "notes": notes,
        "active": bool(body.active),
    }


def crew_phone_taken(db: Session, phone: str, exclude_id: int | None = None) -> bool:
    q = db.query(CrewMember).filter(CrewMember.phone == phone)
    if exclude_id is not None:
        q = q.filter(CrewMember.id != exclude_id)
    return q.first() is not None


# ── public enquiry ──────────────────────────────────────────────────────────
class PublicEnquiryIn(BaseModel):
    source: str = "booking"
    ref_code: str | None = None
    customer_name: str
    phone: str
    town: str = ""
    locality: str = ""
    work_dates: str = ""
    crew_summary: str = ""
    crew_json: dict | list = Field(default_factory=dict)
    daily_wage: float = 0
    message: str = ""


@app.post("/api/public/enquiries")
def public_enquiry(body: PublicEnquiryIn, db: Session = Depends(get_db)):
    name = validate_person_name(body.customer_name, "Customer name")
    phone = normalize_mobile(body.phone)
    if not is_indian_mobile(phone):
        raise HTTPException(400, "Enter a valid 10-digit Indian mobile number.")
    town = validate_place(body.town, "Town")
    locality = validate_place(body.locality, "Locality")
    if body.message and len(body.message.strip()) > 2000:
        raise HTTPException(400, "Message must be 2000 characters or fewer.")
    if (body.source or "booking") != "contact":
        assert_booking_trade_limits(db, body.crew_json)
    ref = body.ref_code or ("HYR-" + str(secrets.randbelow(90000) + 10000))
    while db.query(Enquiry).filter(Enquiry.ref_code == ref).first():
        ref = "HYR-" + str(secrets.randbelow(90000) + 10000)
    cust = upsert_customer(db, name, phone, town, locality)
    row = Enquiry(
        ref_code=ref,
        source=body.source if body.source in ("booking", "contact") else "booking",
        customer_id=cust.id,
        customer_name=name,
        phone=phone,
        town=town,
        locality=locality,
        work_dates=body.work_dates,
        crew_summary=body.crew_summary,
        crew_json=json.dumps(body.crew_json),
        daily_wage=body.daily_wage or 0,
        message=body.message,
        status="requested",
    )
    db.add(row)
    db.commit()
    return {"ok": True, "ref_code": ref, "id": row.id}


TRADES = {
    "general-workers": ["General Labour", "General Construction Labour", "Labour", "Labourer"],
    "concrete-finisher": ["Concrete Finisher / Cement Setter", "Concrete Finisher", "Cement Setter"],
    "bricklayer": ["Wall Builder", "Bricklayer", "Block Mason"],
    "stone-setter": ["Stone Breaker / Stone Setter", "Stone Breaker", "Stone Setter"],
    "tiler": ["Tiler", "Tiles", "Tile Setter", "Marble Setter"],
    "painter": ["Painter", "Painting"],
}


def _norm(text: str) -> str:
    return "".join(ch for ch in (text or "").lower() if ch.isalnum())


_TRADE_LOOKUP = {_norm(alias): tid for tid, aliases in TRADES.items() for alias in [tid, *aliases]}


def trade_id(text: str, extra: dict | None = None) -> str | None:
    hit = _TRADE_LOOKUP.get(_norm(text))
    if hit:
        return hit
    if extra:
        return extra.get(_norm(text))
    return None


def trade_alias_map(db: Session) -> dict:
    extra = {}
    for row in db.query(BookableTrade).all():
        extra[_norm(row.slug)] = row.slug
        extra[_norm(row.name)] = row.slug
        extra[_norm(row.short_name)] = row.slug
    return extra


def trade_slugs(db: Session) -> list[str]:
    slugs = list(TRADES.keys())
    for row in db.query(BookableTrade).all():
        if row.slug not in slugs:
            slugs.append(row.slug)
    return slugs


def roster_counts(db: Session) -> dict:
    extra = trade_alias_map(db)
    counts = {tid: 0 for tid in trade_slugs(db)}
    for (trade,) in db.query(CrewMember.trade).filter(CrewMember.active.is_(True)).all():
        tid = trade_id(trade, extra)
        if tid:
            counts[tid] += 1
    return counts


def parse_crew_json(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw or "{}")
    except (TypeError, json.JSONDecodeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def requested_trade_counts(crew_json, *, unknown: str = "reject", slugs: list[str] | None = None) -> dict:
    ids = list(slugs or TRADES.keys())
    ids.sort(key=len, reverse=True)
    requested = {tid: 0 for tid in ids}
    if not isinstance(crew_json, dict):
        return requested
    for key, raw in crew_json.items():
        try:
            n = int(raw)
        except (TypeError, ValueError):
            continue
        if n <= 0:
            continue
        key_s = str(key)
        matched = next((tid for tid in ids if key_s == tid or key_s.startswith(tid + "_")), None)
        if not matched:
            if unknown == "skip":
                continue
            raise HTTPException(400, "Unknown trade in booking.")
        requested[matched] += n
    return requested


MAX_WORKERS_PER_TRADE = 50
OPEN_ENQUIRY_STATUSES = {"requested", "checking", "confirmed"}


def crew_shortages(e: Enquiry, roster: dict) -> list:
    """Admin-only: requested headcount vs current active roster. Never sent to the customer app."""
    requested = requested_trade_counts(parse_crew_json(e.crew_json), unknown="skip", slugs=list(roster.keys()) or list(TRADES))
    names = {tid: aliases[0] for tid, aliases in TRADES.items()}
    out = []
    for tid, n in requested.items():
        have = int(roster.get(tid) or 0)
        if n > have:
            out.append({
                "trade": tid,
                "trade_name": names.get(tid, tid),
                "requested": n,
                "on_roster": have,
                "short_by": n - have,
            })
    return out


def assert_booking_trade_limits(db: Session, crew_json) -> None:
    slugs = trade_slugs(db)
    requested = requested_trade_counts(crew_json, slugs=slugs)
    if sum(requested.values()) < 1:
        raise HTTPException(400, "Select at least one worker.")
    open_map = {row.slug: bool(row.available) for row in listed_trades(db)}
    for tid, n in requested.items():
        if n > MAX_WORKERS_PER_TRADE:
            raise HTTPException(400, f"Maximum {MAX_WORKERS_PER_TRADE} workers per trade on a single booking.")
        if n > 0 and not open_map.get(tid, True):
            raise HTTPException(400, "That trade is not available for booking.")


@app.get("/api/public/availability")
def public_availability(db: Session = Depends(get_db)):
    """Customer sees available / not available only — never roster counts."""
    rows = listed_trades(db)
    status = {row.slug: bool(row.available) for row in rows}
    catalog = []
    for row in rows:
        out = _trade_out(row)
        catalog.append({
            "id": row.slug,
            "name": row.name,
            "shortName": row.short_name or row.name,
            "available": bool(row.available),
            "tier": "Mason & Helper" if row.role_set == "mason_helper" else "Labour",
            "subRoles": out["subRoles"],
            "baseRatePerDay": int(row.rate_per_day or 1000),
        })
    return {"trades": status, "catalog": catalog}


# ── auth / totp ─────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    key: str
    iv: str
    data: str


class TotpIn(BaseModel):
    token: str
    code: str = ""


@app.get("/api/auth/login-key")
def login_key():
    return login_public_spki()


@app.post("/api/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    creds = decrypt_login_blob({"key": body.key, "iv": body.iv, "data": body.data})
    user = db.query(AdminUser).filter(AdminUser.username == creds["username"]).first()
    if not user or not verify_password(creds["password"], user.password_hash):
        raise HTTPException(401, "Invalid credentials.")
    if not user.totp_enabled or not user.totp_secret:
        setup = make_token({"sub": user.username, "step": "setup"}, minutes=10)
        return {"need_setup": True, "token": setup}
    pre = make_token({"sub": user.username, "step": "totp"}, minutes=5)
    return {"need_totp": True, "token": pre}


@app.post("/api/auth/totp/qr")
def totp_qr(body: TotpIn, db: Session = Depends(get_db)):
    import base64

    data = read_token(body.token)
    if data.get("step") != "setup":
        raise HTTPException(400, "Invalid setup token.")
    user = db.query(AdminUser).filter(AdminUser.username == data["sub"]).first()
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="Hyraku Admin")
    img = qrcode.make(uri)
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"otpauth": uri, "qr": f"data:image/png;base64,{b64}"}


@app.post("/api/auth/totp/verify")
def totp_verify(body: TotpIn, response: Response, db: Session = Depends(get_db)):
    data = read_token(body.token)
    user = db.query(AdminUser).filter(AdminUser.username == data["sub"]).first()
    if not user or not user.totp_secret:
        raise HTTPException(400, "TOTP is not ready.")
    if not pyotp.TOTP(user.totp_secret).verify(body.code.strip(), valid_window=1):
        raise HTTPException(401, "Invalid authenticator code.")
    if data.get("step") == "setup":
        user.totp_enabled = True
        db.commit()
    set_session(response, user.username)
    return {"ok": True, "username": user.username}


@app.post("/api/auth/logout")
def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: str = Depends(require_admin)):
    return {"username": user}


# ── dashboard ───────────────────────────────────────────────────────────────
@app.get("/api/dashboard/stats")
def stats(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    enqs = db.query(Enquiry).all()
    roster = roster_counts(db)
    short_open = []
    for e in enqs:
        if e.status not in OPEN_ENQUIRY_STATUSES:
            continue
        short = crew_shortages(e, roster)
        if short:
            short_open.append({
                "id": e.id,
                "ref_code": e.ref_code,
                "customer_name": e.customer_name,
                "status": e.status,
                "shortages": short,
            })
    by_status = Counter(e.status for e in enqs)
    by_town = Counter((e.town or "Unknown").strip() or "Unknown" for e in enqs)
    by_locality = Counter(
        f"{(e.locality or 'Unknown').strip()}, {(e.town or '').strip()}".strip(", ") for e in enqs
    )
    trend = defaultdict(int)
    for e in enqs:
        key = e.created_at.strftime("%Y-%m-%d") if e.created_at else "unknown"
        trend[key] += 1
    return {
        "totalEnquiries": len(enqs),
        "requested": by_status.get("requested", 0) + by_status.get("checking", 0),
        "confirmed": by_status.get("confirmed", 0),
        "booked": by_status.get("booked", 0),
        "completed": by_status.get("completed", 0),
        "outOfService": by_status.get("out_of_service", 0),
        "customers": db.query(Customer).count(),
        "crew": db.query(CrewMember).filter(CrewMember.active.is_(True)).count(),
        "crewShortageCount": len(short_open),
        "crewShortages": short_open[:40],
        "byTown": [{"label": k, "count": v} for k, v in by_town.most_common(20)],
        "byLocality": [{"label": k, "count": v} for k, v in by_locality.most_common(20)],
        "trend": [{"date": k, "count": trend[k]} for k in sorted(trend)],
        "byStatus": [{"label": k, "count": v} for k, v in by_status.items()],
    }


# ── enquiries ───────────────────────────────────────────────────────────────
@app.get("/api/enquiries")
def list_enquiries(status: str | None = None, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Enquiry).order_by(Enquiry.created_at.desc())
    if status:
        q = q.filter(Enquiry.status == status)
    rows = q.limit(500).all()
    roster = roster_counts(db)
    return {"enquiries": [_enquiry_out(e, roster) for e in rows]}


class StatusIn(BaseModel):
    status: str


@app.patch("/api/enquiries/{eid}/status")
def set_status(eid: int, body: StatusIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    allowed = {"requested", "checking", "confirmed", "booked", "completed", "cancelled", "out_of_service"}
    if body.status not in allowed:
        raise HTTPException(400, "Unknown status.")
    row = db.query(Enquiry).filter(Enquiry.id == eid).first()
    if not row:
        raise HTTPException(404, "Enquiry not found.")
    row.status = body.status
    db.commit()
    return _enquiry_out(row, roster_counts(db))


class PaymentIn(BaseModel):
    payment_amount: float
    payment_mode: str = "upi"
    payment_ref: str = ""
    days: int = 1
    notes: str = ""


@app.post("/api/enquiries/{eid}/book")
def convert_booking(eid: int, body: PaymentIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(Enquiry).filter(Enquiry.id == eid).first()
    if not row:
        raise HTTPException(404, "Enquiry not found.")
    if row.booking:
        raise HTTPException(400, "Already converted to a booking.")
    year = datetime.utcnow().year
    seq = db.query(Booking).count() + 1
    inv = f"HYR-INV-{year}-{seq:04d}"
    booking = Booking(
        enquiry_id=row.id,
        invoice_no=inv,
        payment_amount=body.payment_amount,
        payment_mode=body.payment_mode,
        payment_ref=body.payment_ref,
        days=max(1, body.days),
        notes=body.notes,
    )
    row.status = "booked"
    db.add(booking)
    db.commit()
    db.refresh(booking)
    roster = roster_counts(db)
    return {"booking": _booking_out(booking, roster), "enquiry": _enquiry_out(row, roster)}


@app.get("/api/enquiries/{eid}/letterpad.pdf")
def letterpad(eid: int, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(Enquiry).filter(Enquiry.id == eid).first()
    if not row:
        raise HTTPException(404, "Enquiry not found.")
    pdf = booking_packet_pdf(company(db), row, row.booking)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{row.ref_code}-letterpad.pdf"'},
    )


# ── customers / crew downloads ──────────────────────────────────────────────
def _export_rows(rows: list[dict], fmt: str, filename: str, db: Session):
    fmt = (fmt or "csv").lower()
    if fmt not in ("csv", "pdf"):
        raise HTTPException(400, "Download format must be csv or pdf.")
    if fmt == "pdf":
        headers = list(rows[0].keys()) if rows else ["empty"]
        table = [[str(r.get(h, "") or "") for h in headers] for r in rows]
        title = filename.replace("hyraku-", "").replace("-", " ").title()
        pdf = roster_table_pdf(company(db), title, headers, table)
        return Response(
            pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
        )
    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()) if rows else ["empty"])
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'})


@app.get("/api/customers")
def customers(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Customer).order_by(Customer.last_enquiry_at.desc()).all()
    return {"customers": [_customer_out(c) for c in rows]}


@app.get("/api/customers/export")
def customers_export(fmt: str = "csv", _: str = Depends(require_admin), db: Session = Depends(get_db)):
    rows = [
        {
            "name": c.name,
            "phone": c.phone,
            "town": c.town,
            "locality": c.locality,
            "last_contact": c.last_enquiry_at.isoformat() if c.last_enquiry_at else "",
        }
        for c in db.query(Customer).all()
    ]
    return _export_rows(rows, fmt, "hyraku-customers", db)


class TradeIn(BaseModel):
    name: str
    role_set: str = "labour"
    rate_per_day: float = 1000
    available: bool = True


class TradeStatusIn(BaseModel):
    available: bool


@app.get("/api/trades")
def list_trades(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    return {"trades": [_trade_out(row) for row in listed_trades(db)]}


@app.post("/api/trades")
def add_trade(body: TradeIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    name = validate_place(body.name, "Trade name", required=True)
    role_set = (body.role_set or "labour").strip()
    if role_set not in ROLE_SET_CREW:
        raise HTTPException(400, "Role set must be labour, mason_helper, or painter.")
    slug = slugify_trade(name)
    taken = {row.slug for row in db.query(BookableTrade).all()}
    base = slug
    n = 2
    while slug in taken:
        slug = f"{base}-{n}"
        n += 1
    last = db.query(BookableTrade).order_by(BookableTrade.sort_order.desc()).first()
    row = BookableTrade(
        slug=slug,
        name=name,
        short_name=name,
        role_set=role_set,
        rate_per_day=max(0, float(body.rate_per_day or 1000)),
        available=bool(body.available),
        sort_order=(last.sort_order + 10) if last else 100,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _trade_out(row)


@app.patch("/api/trades/{tid}/status")
def set_trade_status(tid: int, body: TradeStatusIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(BookableTrade).filter(BookableTrade.id == tid).first()
    if not row:
        raise HTTPException(404, "Trade not found.")
    row.available = bool(body.available)
    db.commit()
    return _trade_out(row)


class CrewIn(BaseModel):
    name: str
    phone: str
    trade: str
    role: str
    town: str = ""
    notes: str = ""
    active: bool = True


@app.get("/api/crew")
def list_crew(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(CrewMember).order_by(CrewMember.created_at.desc()).all()
    return {"crew": [_crew_out(w) for w in rows]}


@app.post("/api/crew")
def add_crew(body: CrewIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    data = validate_crew_fields(body, db)
    if crew_phone_taken(db, data["phone"]):
        raise HTTPException(400, "This mobile number is already on the crew roster.")
    row = CrewMember(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _crew_out(row)


@app.put("/api/crew/{wid}")
def edit_crew(wid: int, body: CrewIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(CrewMember).filter(CrewMember.id == wid).first()
    if not row:
        raise HTTPException(404, "Crew member not found.")
    data = validate_crew_fields(body, db)
    if crew_phone_taken(db, data["phone"], exclude_id=wid):
        raise HTTPException(400, "This mobile number is already on the crew roster.")
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    return _crew_out(row)


@app.get("/api/crew/template.csv")
def crew_template(_: str = Depends(require_admin)):
    body = "name,phone,trade,role,town,notes,active\nRavi Kumar,9876543210,Wall Builder,Head Mason,Kozhikode,,true\n"
    return Response(body, media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="hyraku-crew-template.csv"'})


@app.post("/api/crew/import")
def crew_import(file: UploadFile = File(...), _: str = Depends(require_admin), db: Session = Depends(get_db)):
    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(StringIO(raw))
    added = 0
    errors = []
    seen = set()
    for i, rec in enumerate(reader, start=2):
        try:
            data = validate_crew_fields(
                CrewIn(
                    name=(rec.get("name") or "").strip(),
                    phone=(rec.get("phone") or "").strip(),
                    trade=(rec.get("trade") or "").strip(),
                    role=(rec.get("role") or "").strip(),
                    town=(rec.get("town") or "").strip(),
                    notes=(rec.get("notes") or "").strip(),
                    active=str(rec.get("active", "true")).lower() in ("1", "true", "yes", "y"),
                ),
                db,
            )
        except HTTPException as exc:
            errors.append(f"Row {i}: {exc.detail}")
            continue
        if data["phone"] in seen or crew_phone_taken(db, data["phone"]):
            errors.append(f"Row {i}: mobile {data['phone']} is already on the roster.")
            continue
        seen.add(data["phone"])
        db.add(CrewMember(**data))
        added += 1
    db.commit()
    return {"added": added, "errors": errors}


@app.get("/api/crew/export")
def crew_export(fmt: str = "csv", _: str = Depends(require_admin), db: Session = Depends(get_db)):
    rows = [
        {
            "name": w.name,
            "phone": w.phone,
            "trade": w.trade,
            "role": w.role,
            "town": w.town,
            "notes": w.notes,
            "active": w.active,
        }
        for w in db.query(CrewMember).all()
    ]
    return _export_rows(rows, fmt, "hyraku-crew", db)


@app.get("/api/bookings")
def bookings(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Booking).order_by(Booking.created_at.desc()).all()
    return {"bookings": [_booking_out(b) for b in rows]}


@app.get("/api/reports/monthly")
def monthly(month: str, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    """month=YYYY-MM"""
    try:
        start = datetime.strptime(month + "-01", "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Use month=YYYY-MM")
    if start.month == 12:
        end = datetime(start.year + 1, 1, 1)
    else:
        end = datetime(start.year, start.month + 1, 1)
    enqs = db.query(Enquiry).filter(Enquiry.created_at >= start, Enquiry.created_at < end).all()
    books = db.query(Booking).filter(Booking.created_at >= start, Booking.created_at < end).all()
    custs = db.query(Customer).filter(Customer.created_at >= start, Customer.created_at < end).count()
    by_status = Counter(e.status for e in enqs)
    loc = Counter(f"{e.locality}, {e.town}".strip(", ") for e in enqs)
    stats = {
        "enquiries": len(enqs),
        "open": by_status.get("requested", 0) + by_status.get("checking", 0),
        "confirmed": by_status.get("confirmed", 0),
        "booked": by_status.get("booked", 0),
        "completed": by_status.get("completed", 0),
        "cancelled": by_status.get("cancelled", 0),
        "out_of_service": by_status.get("out_of_service", 0),
        "customers": custs,
        "crew": db.query(CrewMember).count(),
        "revenue": sum(b.payment_amount for b in books),
        "top_locations": [{"label": k, "count": v} for k, v in loc.most_common(15)],
        "by_status": dict(by_status),
    }
    return {"month": month, "stats": stats}


@app.get("/api/reports/monthly.pdf")
def monthly_pdf(month: str, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    data = monthly(month, _, db)
    pdf = monthly_report_pdf(company(db), data["month"], data["stats"])
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="hyraku-report-{month}.pdf"'})


@app.get("/api/reports/monthly.csv")
def monthly_csv(month: str, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    data = monthly(month, _, db)
    s = data["stats"]
    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(["metric", "value"])
    for k, v in s.items():
        if k in ("top_locations", "by_status"):
            continue
        w.writerow([k, v])
    w.writerow([])
    w.writerow(["location", "enquiries"])
    for row in s.get("top_locations") or []:
        w.writerow([row["label"], row["count"]])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="hyraku-report-{month}.csv"'})


class SettingsIn(BaseModel):
    legal_name: str | None = None
    tagline: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    gstin: str | None = None
    pan: str | None = None
    bank_details: str | None = None
    terms: str | None = None


@app.get("/api/settings")
def get_settings(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    s = company(db)
    return {k: getattr(s, k) for k in ("legal_name", "tagline", "address", "phone", "email", "gstin", "pan", "bank_details", "terms")}


@app.put("/api/settings")
def put_settings(body: SettingsIn, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    s = company(db)
    for k, v in body.model_dump().items():
        if v is not None:
            setattr(s, k, v)
    db.commit()
    return get_settings(_, db)


@app.get("/health")
def health():
    return {"status": "healthy"}


def _customer_out(c: Customer):
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "town": c.town,
        "locality": c.locality,
        "last_enquiry_at": c.last_enquiry_at.isoformat() if c.last_enquiry_at else None,
    }


def _crew_out(w: CrewMember):
    return {
        "id": w.id,
        "name": w.name,
        "phone": w.phone,
        "trade": w.trade,
        "role": w.role,
        "town": w.town,
        "notes": w.notes,
        "active": w.active,
        "created_at": w.created_at.isoformat() if w.created_at else None,
    }


def _enquiry_out(e: Enquiry, roster: dict | None = None):
    short = crew_shortages(e, roster) if roster is not None else []
    return {
        "id": e.id,
        "ref_code": e.ref_code,
        "source": e.source,
        "customer_name": e.customer_name,
        "phone": e.phone,
        "town": e.town,
        "locality": e.locality,
        "work_dates": e.work_dates,
        "crew_summary": e.crew_summary,
        "daily_wage": e.daily_wage,
        "message": e.message,
        "status": e.status,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "has_booking": bool(e.booking),
        "invoice_no": e.booking.invoice_no if e.booking else None,
        "crew_short": bool(short),
        "crew_shortages": short,
    }


def _booking_out(b: Booking, roster: dict | None = None):
    return {
        "id": b.id,
        "invoice_no": b.invoice_no,
        "payment_amount": b.payment_amount,
        "payment_mode": b.payment_mode,
        "payment_ref": b.payment_ref,
        "days": b.days,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "enquiry": _enquiry_out(b.enquiry, roster) if b.enquiry else None,
    }
