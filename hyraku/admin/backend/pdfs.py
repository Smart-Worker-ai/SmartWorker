from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

BLUE = HexColor("#0091ea")
NAVY = HexColor("#092244")
SLATE = HexColor("#475569")
LINE = HexColor("#bae6fd")
AMBER = HexColor("#b45309")


def _header(c, company, title, doc_no, page_w, page_h):
    c.setFillColor(BLUE)
    c.rect(0, page_h - 28 * mm, page_w, 28 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Times-Bold", 22)
    c.drawString(18 * mm, page_h - 14 * mm, company.legal_name.upper() if company.legal_name else "HYRAKU")
    c.setFont("Times-Italic", 9)
    c.drawString(18 * mm, page_h - 20 * mm, company.tagline or "Your Reliable Labour Partner")
    c.setFont("Times-Bold", 11)
    c.drawRightString(page_w - 18 * mm, page_h - 13 * mm, title)
    c.setFont("Times-Roman", 8)
    c.drawRightString(page_w - 18 * mm, page_h - 19 * mm, doc_no)

    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 8)
    y = page_h - 36 * mm
    c.drawString(18 * mm, y, company.address or "")
    y -= 4 * mm
    extra = f"Phone: {company.phone or ''}   Email: {company.email or ''}"
    if company.gstin:
        extra += f"   GSTIN: {company.gstin}"
    if company.pan:
        extra += f"   PAN: {company.pan}"
    c.drawString(18 * mm, y, extra)
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.4)
    c.line(18 * mm, page_h - 42 * mm, page_w - 18 * mm, page_h - 42 * mm)


def _footer(c, company, page_w):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(18 * mm, 16 * mm, page_w - 18 * mm, 16 * mm)
    c.setFillColor(SLATE)
    c.setFont("Times-Roman", 7)
    terms = company.terms or "This is a computer-generated document."
    lines = simpleSplit(terms, "Times-Roman", 7, page_w - 40 * mm)
    y = 12 * mm
    for line in lines[:2]:
        c.drawString(18 * mm, y, line)
        y -= 3.2 * mm


def _kv(c, x, y, label, value, width=80 * mm):
    c.setFillColor(SLATE)
    c.setFont("Times-Bold", 8)
    c.drawString(x, y, label)
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 10)
    wrapped = simpleSplit(str(value or "—"), "Times-Roman", 10, width)
    c.drawString(x, y - 4.2 * mm, wrapped[0] if wrapped else "—")
    return y - 12 * mm


def booking_packet_pdf(company, enquiry, booking) -> bytes:
    buf = BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)

    # Page 1 — booking summary
    _header(c, company, "BOOKING SUMMARY", enquiry.ref_code, page_w, page_h)
    y = page_h - 52 * mm
    y = _kv(c, 18 * mm, y, "CUSTOMER", enquiry.customer_name)
    y = _kv(c, 110 * mm, page_h - 52 * mm, "PHONE", f"+91 {enquiry.phone}")
    y = _kv(c, 18 * mm, y, "SITE LOCATION", f"{enquiry.locality}, {enquiry.town}")
    y = _kv(c, 110 * mm, y + 12 * mm, "WORK DATES", enquiry.work_dates)
    y = min(y, page_h - 88 * mm)
    y = _kv(c, 18 * mm, y, "STATUS", enquiry.status.upper(), 160 * mm)
    y = _kv(c, 18 * mm, y, "REQUESTED CREW", enquiry.crew_summary, 170 * mm)

    c.setFillColor(BLUE)
    c.setFont("Times-Bold", 10)
    c.drawString(18 * mm, y, "CREW / WAGE NOTES")
    y -= 6 * mm
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 9)
    for line in simpleSplit(enquiry.crew_summary or "—", "Times-Roman", 9, 170 * mm)[:8]:
        c.drawString(20 * mm, y, line)
        y -= 4.2 * mm

    if booking:
        y -= 4 * mm
        c.setFillColor(AMBER)
        c.setFont("Times-Bold", 10)
        c.drawString(18 * mm, y, f"PAYMENT RECEIVED  ·  {booking.payment_mode.upper()}  ·  ₹{booking.payment_amount:,.0f}")
        y -= 5 * mm
        c.setFillColor(SLATE)
        c.setFont("Times-Roman", 8)
        c.drawString(18 * mm, y, f"Reference: {booking.payment_ref or '—'}   Days: {booking.days}")

    _footer(c, company, page_w)
    c.showPage()

    # Page 2 — invoice / receipt
    inv = booking.invoice_no if booking else f"DRAFT-{enquiry.ref_code}"
    title = "TAX INVOICE" if (company.gstin or "").strip() else "BOOKING RECEIPT / PROFORMA"
    _header(c, company, title, inv, page_w, page_h)

    y = page_h - 52 * mm
    c.setFillColor(SLATE)
    c.setFont("Times-Bold", 8)
    c.drawString(18 * mm, y, "BILLED TO")
    c.setFillColor(NAVY)
    c.setFont("Times-Bold", 12)
    c.drawString(18 * mm, y - 5 * mm, enquiry.customer_name)
    c.setFont("Times-Roman", 9)
    c.drawString(18 * mm, y - 10 * mm, f"+91 {enquiry.phone}")
    c.drawString(18 * mm, y - 14 * mm, f"{enquiry.locality}, {enquiry.town}")

    days = booking.days if booking else max(1, len((enquiry.work_dates or "").split(",")) or 1)
    daily = enquiry.daily_wage or 0
    subtotal = daily * days
    amount = booking.payment_amount if booking else subtotal

    y = page_h - 85 * mm
    c.setFillColor(BLUE)
    c.rect(18 * mm, y, page_w - 36 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Times-Bold", 9)
    c.drawString(20 * mm, y + 2.4 * mm, "DESCRIPTION")
    c.drawRightString(page_w - 20 * mm, y + 2.4 * mm, "AMOUNT (INR)")

    y -= 10 * mm
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 9)
    c.drawString(20 * mm, y, f"Labour coordination — {enquiry.crew_summary or 'crew'} × {days} day(s)")
    c.drawRightString(page_w - 20 * mm, y, f"{subtotal:,.2f}")
    y -= 8 * mm
    c.setStrokeColor(LINE)
    c.line(18 * mm, y + 4 * mm, page_w - 18 * mm, y + 4 * mm)
    c.setFont("Times-Bold", 12)
    c.drawString(20 * mm, y - 2 * mm, "TOTAL")
    c.drawRightString(page_w - 20 * mm, y - 2 * mm, f"₹ {amount:,.2f}")

    y -= 16 * mm
    if not (company.gstin or "").strip():
        c.setFillColor(AMBER)
        c.setFont("Times-Italic", 8)
        note = "GSTIN not configured — this is a booking receipt / proforma, not a GST tax invoice."
        c.drawString(18 * mm, y, note)

    y -= 12 * mm
    c.setFillColor(SLATE)
    c.setFont("Times-Roman", 8)
    if booking:
        c.drawString(18 * mm, y, f"Payment: {booking.payment_mode}   Ref: {booking.payment_ref or '—'}   Date: {booking.created_at.strftime('%d %b %Y') if booking.created_at else ''}")
    if company.bank_details:
        for line in simpleSplit("Bank: " + company.bank_details, "Times-Roman", 8, 170 * mm)[:3]:
            y -= 4 * mm
            c.drawString(18 * mm, y, line)

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
        c.setFont("Times-Roman", 10)
        c.drawString(22 * mm, y, label)
        c.setFillColor(NAVY)
        c.setFont("Times-Bold", 11)
        c.drawRightString(page_w - 22 * mm, y, str(val))
        y -= 8 * mm

    y -= 4 * mm
    c.setFillColor(BLUE)
    c.setFont("Times-Bold", 10)
    c.drawString(18 * mm, y, "TOP LOCALITIES")
    y -= 7 * mm
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 9)
    for row in (stats.get("top_locations") or [])[:12]:
        c.drawString(22 * mm, y, f"{row['label']}  —  {row['count']} enquiries")
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
    c.rect(18 * mm, y - 2 * mm, page_w - 36 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Times-Bold", 8)
    for i, h in enumerate(headers):
        c.drawString(20 * mm + i * col_w, y, str(h)[:22])
    y -= 8 * mm
    c.setFillColor(NAVY)
    c.setFont("Times-Roman", 8)
    for row in rows:
        if y < 24 * mm:
            _footer(c, company, page_w)
            c.showPage()
            _header(c, company, title, "continued", page_w, page_h)
            y = page_h - 50 * mm
            c.setFillColor(NAVY)
            c.setFont("Times-Roman", 8)
        for i, cell in enumerate(row):
            c.drawString(20 * mm + i * col_w, y, str(cell or "—")[:22])
        y -= 5.4 * mm
    _footer(c, company, page_w)
    c.save()
    return buf.getvalue()
