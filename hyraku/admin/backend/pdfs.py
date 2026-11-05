import json
import re
from io import BytesIO
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader, simpleSplit

BLUE = HexColor("#0091ea")
NAVY = HexColor("#092244")
SLATE = HexColor("#475569")
LINE = HexColor("#bae6fd")
AMBER = HexColor("#b45309")
RULE = HexColor("#e2e8f0")

F = "Helvetica"
FB = "Helvetica-Bold"
FI = "Helvetica-Oblique"

_ASSETS = Path(__file__).resolve().parent / "assets"
_LOGO_WHITE = _ASSETS / "hyraku-logo-white.png"

TRADE_LABELS = {
    "general-workers": "General Labour",
    "concrete-finisher": "Concrete Finisher / Cement Setter",
    "bricklayer": "Wall Builder",
    "stone-setter": "Stone Breaker / Stone Setter",
    "tiler": "Tiler",
    "painter": "Painter",
}
ROLE_LABELS = {
    "labour": "Labour",
    "mason": "Head Mason",
    "helper": "Helper",
    "painter": "Painter / Labour",
}

LEFT = 18 * mm
COL2 = 108 * mm


def _draw_wordmark(c, path, x, y, height):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    width = height * (iw / float(ih or 1))
    c.drawImage(img, x, y, width=width, height=height, mask="auto", preserveAspectRatio=True, anchor="sw")
    return width


def _plain(text) -> str:
    s = str(text or "")
    s = s.replace("\r", "")
    s = re.sub(r"[*_`]+", "", s)
    s = re.sub(r"^[\s]*[-–—•]+\s*", "", s, flags=re.M)
    s = re.sub(r"-{3,}", " ", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    skip = ("sent via hyraku", "hyraku- worker", "hyraku worker booking", "selected workers")
    keep = []
    for line in s.splitlines():
        t = line.strip()
        if not t:
            continue
        low = t.lower()
        if any(k in low for k in skip) or set(t) <= {"-", "_", " "}:
            continue
        keep.append(t)
    return "\n".join(keep).strip()


def _crew_rows(enquiry) -> list[tuple[str, str, int]]:
    raw = enquiry.crew_json or ""
    data = raw if isinstance(raw, dict) else {}
    if not data:
        try:
            parsed = json.loads(raw or "{}")
            if isinstance(parsed, dict):
                data = parsed
        except (TypeError, json.JSONDecodeError, ValueError):
            data = {}
    rows = []
    for key, val in data.items():
        try:
            n = int(val)
        except (TypeError, ValueError):
            continue
        if n <= 0:
            continue
        key_s = str(key)
        trade_id, sep, role_id = key_s.partition("_")
        if not sep:
            trade_id, role_id = key_s, ""
        trade = TRADE_LABELS.get(trade_id, trade_id.replace("-", " ").title())
        role = ROLE_LABELS.get(role_id, role_id.replace("-", " ").title() or "—")
        rows.append((trade, role, n))
    return rows


def _header(c, company, title, doc_no, page_w, page_h):
    c.setFillColor(BLUE)
    c.rect(0, page_h - 28 * mm, page_w, 28 * mm, fill=1, stroke=0)
    logo_h = 11 * mm
    logo_y = page_h - 16.5 * mm
    if _LOGO_WHITE.is_file():
        _draw_wordmark(c, _LOGO_WHITE, LEFT, logo_y, logo_h)
    else:
        c.setFillColor(white)
        c.setFont(FB, 20)
        c.drawString(LEFT, page_h - 14 * mm, "hyraku")
    c.setFillColor(white)
    c.setFont(FI, 8)
    c.drawString(LEFT, page_h - 23.5 * mm, _plain(company.tagline) or "Your Reliable Labour Partner")
    c.setFont(FB, 10)
    c.drawRightString(page_w - LEFT, page_h - 13 * mm, title)
    c.setFont(F, 8)
    c.drawRightString(page_w - LEFT, page_h - 18.5 * mm, str(doc_no or ""))

    c.setFillColor(SLATE)
    c.setFont(F, 8)
    y = page_h - 35 * mm
    addr = _plain(company.address)
    if addr:
        c.drawString(LEFT, y, addr)
        y -= 4 * mm
    bits = []
    if company.phone:
        bits.append(f"Phone  {company.phone}")
    if company.email:
        bits.append(f"Email  {company.email}")
    if company.gstin:
        bits.append(f"GSTIN  {company.gstin}")
    if company.pan:
        bits.append(f"PAN  {company.pan}")
    if bits:
        c.drawString(LEFT, y, "    ".join(bits))
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.2)
    c.line(LEFT, page_h - 43 * mm, page_w - LEFT, page_h - 43 * mm)


def _footer(c, company, page_w):
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    c.line(LEFT, 16 * mm, page_w - LEFT, 16 * mm)
    c.setFillColor(SLATE)
    c.setFont(F, 7)
    terms = _plain(company.terms) or "This is a computer-generated document."
    lines = simpleSplit(terms, F, 7, page_w - 36 * mm)
    y = 12 * mm
    for line in lines[:2]:
        c.drawString(LEFT, y, line)
        y -= 3.2 * mm


def _label(c, x, y, text):
    c.setFillColor(SLATE)
    c.setFont(FB, 7)
    c.drawString(x, y, str(text or "").upper())


def _value_lines(c, x, y, text, width, size=10, max_lines=4):
    c.setFillColor(NAVY)
    c.setFont(F, size)
    wrapped = simpleSplit(str(text or "—"), F, size, width)
    for i, line in enumerate(wrapped[:max_lines]):
        c.drawString(x, y - i * 4.1 * mm, line)
    used = max(1, min(len(wrapped), max_lines))
    return y - used * 4.1 * mm


def _pair(c, y, left_label, left_val, right_label, right_val, page_w):
    _label(c, LEFT, y, left_label)
    _label(c, COL2, y, right_label)
    y -= 4.4 * mm
    y_l = _value_lines(c, LEFT, y, left_val, COL2 - LEFT - 8 * mm)
    y_r = _value_lines(c, COL2, y, right_val, page_w - LEFT - COL2)
    return min(y_l, y_r) - 6 * mm


def booking_packet_pdf(company, enquiry, booking) -> bytes:
    buf = BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    inner_w = page_w - 36 * mm

    _header(c, company, "BOOKING SUMMARY", enquiry.ref_code, page_w, page_h)
    y = page_h - 52 * mm
    y = _pair(c, y, "Customer", enquiry.customer_name, "Phone", f"+91 {enquiry.phone}", page_w)
    y = _pair(
        c,
        y,
        "Site location",
        f"{enquiry.locality}, {enquiry.town}".strip(" ,"),
        "Work dates",
        _plain(enquiry.work_dates) or "—",
        page_w,
    )
    y = _pair(c, y, "Status", (enquiry.status or "").replace("_", " ").title(), "Reference", enquiry.ref_code, page_w)

    crew = _crew_rows(enquiry)
    total_crew = sum(n for *_, n in crew) if crew else 0
    _label(c, LEFT, y, "Requested crew")
    y -= 3 * mm
    c.setFillColor(BLUE)
    c.roundRect(LEFT, y - 2 * mm, inner_w, 8 * mm, 1.2 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FB, 8)
    c.drawString(LEFT + 3 * mm, y + 0.6 * mm, "TRADE")
    c.drawString(LEFT + 92 * mm, y + 0.6 * mm, "ROLE")
    c.drawRightString(page_w - LEFT - 3 * mm, y + 0.6 * mm, "QTY")
    y -= 8 * mm
    c.setFont(F, 9)
    if crew:
        for i, (trade, role, n) in enumerate(crew):
            if y < 32 * mm:
                break
            if i % 2 == 0:
                c.setFillColor(HexColor("#f8fafc"))
                c.rect(LEFT, y - 2.2 * mm, inner_w, 7 * mm, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont(F, 9)
            c.drawString(LEFT + 3 * mm, y, trade[:42])
            c.drawString(LEFT + 92 * mm, y, role[:28])
            c.setFont(FB, 9)
            c.drawRightString(page_w - LEFT - 3 * mm, y, str(n))
            y -= 7 * mm
        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.line(LEFT, y + 3 * mm, page_w - LEFT, y + 3 * mm)
        c.setFillColor(NAVY)
        c.setFont(FB, 9)
        c.drawString(LEFT + 3 * mm, y - 2 * mm, "Total workers")
        c.drawRightString(page_w - LEFT - 3 * mm, y - 2 * mm, str(total_crew))
        y -= 12 * mm
    else:
        c.setFillColor(SLATE)
        c.setFont(F, 9)
        fallback = _plain(enquiry.crew_summary) or "No crew details on file."
        for line in simpleSplit(fallback, F, 9, inner_w)[:6]:
            c.drawString(LEFT + 3 * mm, y, line)
            y -= 4.4 * mm
        y -= 4 * mm

    if booking:
        c.setFillColor(HexColor("#fff7ed"))
        c.roundRect(LEFT, y - 10 * mm, inner_w, 16 * mm, 1.5 * mm, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.setFont(FB, 9)
        c.drawString(LEFT + 3 * mm, y + 1 * mm, "Payment received")
        c.setFillColor(NAVY)
        c.setFont(FB, 11)
        c.drawRightString(page_w - LEFT - 3 * mm, y + 1 * mm, f"INR {booking.payment_amount:,.0f}")
        c.setFillColor(SLATE)
        c.setFont(F, 8)
        c.drawString(
            LEFT + 3 * mm,
            y - 5 * mm,
            f"{(booking.payment_mode or '').upper()}    Ref: {booking.payment_ref or '—'}    Days: {booking.days}",
        )
        y -= 20 * mm

    _footer(c, company, page_w)
    c.showPage()

    inv = booking.invoice_no if booking else f"DRAFT-{enquiry.ref_code}"
    title = "TAX INVOICE" if (company.gstin or "").strip() else "BOOKING RECEIPT"
    _header(c, company, title, inv, page_w, page_h)

    y = page_h - 52 * mm
    _label(c, LEFT, y, "Billed to")
    c.setFillColor(NAVY)
    c.setFont(FB, 12)
    c.drawString(LEFT, y - 5.5 * mm, enquiry.customer_name)
    c.setFont(F, 9)
    c.drawString(LEFT, y - 10.5 * mm, f"+91 {enquiry.phone}")
    c.drawString(LEFT, y - 15 * mm, f"{enquiry.locality}, {enquiry.town}".strip(" ,"))

    days = booking.days if booking else max(1, len([p for p in (enquiry.work_dates or "").split(",") if p.strip()]) or 1)
    daily = enquiry.daily_wage or 0
    subtotal = daily * days
    amount = booking.payment_amount if booking else subtotal
    desc = f"Crew coordination — {total_crew or '—'} worker(s) × {days} day(s)"

    y = page_h - 86 * mm
    c.setFillColor(BLUE)
    c.roundRect(LEFT, y - 2 * mm, inner_w, 8 * mm, 1.2 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FB, 8)
    c.drawString(LEFT + 3 * mm, y + 0.6 * mm, "DESCRIPTION")
    c.drawRightString(page_w - LEFT - 3 * mm, y + 0.6 * mm, "AMOUNT (INR)")
    y -= 10 * mm
    c.setFillColor(NAVY)
    c.setFont(F, 9)
    c.drawString(LEFT + 3 * mm, y, desc)
    c.drawRightString(page_w - LEFT - 3 * mm, y, f"{subtotal:,.2f}")
    y -= 8 * mm
    c.setStrokeColor(RULE)
    c.line(LEFT, y + 4 * mm, page_w - LEFT, y + 4 * mm)
    c.setFont(FB, 12)
    c.drawString(LEFT + 3 * mm, y - 2 * mm, "Total")
    c.drawRightString(page_w - LEFT - 3 * mm, y - 2 * mm, f"INR {amount:,.2f}")

    y -= 16 * mm
    if not (company.gstin or "").strip():
        c.setFillColor(AMBER)
        c.setFont(FI, 8)
        c.drawString(LEFT, y, "GSTIN not configured — this is a booking receipt / proforma, not a GST tax invoice.")
        y -= 8 * mm

    c.setFillColor(SLATE)
    c.setFont(F, 8)
    if booking:
        paid_on = booking.created_at.strftime("%d %b %Y") if booking.created_at else ""
        c.drawString(LEFT, y, f"Payment: {(booking.payment_mode or '').upper()}    Ref: {booking.payment_ref or '—'}    Date: {paid_on}")
        y -= 5 * mm
    if company.bank_details:
        for line in simpleSplit("Bank: " + _plain(company.bank_details), F, 8, inner_w)[:3]:
            c.drawString(LEFT, y, line)
            y -= 4 * mm

    _footer(c, company, page_w)
    c.showPage()
    c.save()
    return buf.getvalue()


def monthly_report_pdf(company, month_label, stats: dict) -> bytes:
    buf = BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    _header(c, company, "MONTHLY BUSINESS REPORT", month_label, page_w, page_h)
    y = page_h - 52 * mm
    rows = [
        ("Enquiries", stats.get("enquiries", 0)),
        ("Requested / checking", stats.get("open", 0)),
        ("Confirmed", stats.get("confirmed", 0)),
        ("Booked (paid)", stats.get("booked", 0)),
        ("Completed", stats.get("completed", 0)),
        ("Cancelled", stats.get("cancelled", 0)),
        ("Out of service locations", stats.get("out_of_service", 0)),
        ("New customers", stats.get("customers", 0)),
        ("Crew on roster", stats.get("crew", 0)),
        ("Payments collected (INR)", f"{stats.get('revenue', 0):,.0f}"),
    ]
    for label, val in rows:
        c.setFillColor(SLATE)
        c.setFont(F, 10)
        c.drawString(22 * mm, y, label)
        c.setFillColor(NAVY)
        c.setFont(FB, 11)
        c.drawRightString(page_w - 22 * mm, y, str(val))
        y -= 8 * mm

    y -= 4 * mm
    c.setFillColor(BLUE)
    c.setFont(FB, 10)
    c.drawString(LEFT, y, "TOP LOCALITIES")
    y -= 7 * mm
    c.setFillColor(NAVY)
    c.setFont(F, 9)
    for row in (stats.get("top_locations") or [])[:12]:
        c.drawString(22 * mm, y, f"{row['label']}   {row['count']} enquiries")
        y -= 5 * mm
        if y < 30 * mm:
            break

    _footer(c, company, page_w)
    c.save()
    return buf.getvalue()


def roster_table_pdf(company, title: str, headers: list[str], rows: list[list[str]]) -> bytes:
    buf = BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    _header(c, company, title, f"{len(rows)} record(s)", page_w, page_h)
    y = page_h - 50 * mm
    col_w = (page_w - 36 * mm) / max(1, len(headers))
    c.setFillColor(BLUE)
    c.rect(LEFT, y - 2 * mm, page_w - 36 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont(FB, 8)
    for i, h in enumerate(headers):
        c.drawString(LEFT + 2 * mm + i * col_w, y, str(h)[:22])
    y -= 8 * mm
    c.setFillColor(NAVY)
    c.setFont(F, 8)
    for row in rows:
        if y < 24 * mm:
            _footer(c, company, page_w)
            c.showPage()
            _header(c, company, title, "continued", page_w, page_h)
            y = page_h - 50 * mm
            c.setFillColor(NAVY)
            c.setFont(F, 8)
        for i, cell in enumerate(row):
            c.drawString(LEFT + 2 * mm + i * col_w, y, _plain(cell)[:22] or "—")
        y -= 5.4 * mm
    _footer(c, company, page_w)
    c.save()
    return buf.getvalue()
