"""
Generate comprehensive Hospital EMR Pitch Document in PDF format.
Uses reportlab for professional-quality PDF with diagrams, tables, and flowcharts.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Flowable
)
from reportlab.lib import colors

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "Hospital_EMR_Pitch")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Colors ───────────────────────────────────────────────────────────
DARK_BLUE = HexColor("#003366")
MED_BLUE = HexColor("#006699")
LIGHT_BLUE = HexColor("#E6F0FA")
DARK_GREEN = HexColor("#006633")
LIGHT_GREEN = HexColor("#E6F5E6")
DARK_RED = HexColor("#990000")
ACCENT_ORANGE = HexColor("#E67300")
ACCENT_PURPLE = HexColor("#660066")
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F2F2F2")
MED_GRAY = HexColor("#CCCCCC")
WHITE = white
BLACK = black

# ─── Styles ───────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='CoverTitle', fontName='Helvetica-Bold', fontSize=32,
    textColor=DARK_BLUE, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name='CoverSubtitle', fontName='Helvetica', fontSize=16,
    textColor=MED_BLUE, alignment=TA_CENTER, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name='SectionTitle', fontName='Helvetica-Bold', fontSize=20,
    textColor=DARK_BLUE, spaceBefore=20, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name='SubSection', fontName='Helvetica-Bold', fontSize=14,
    textColor=MED_BLUE, spaceBefore=14, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name='SubSubSection', fontName='Helvetica-Bold', fontSize=12,
    textColor=DARK_GREEN, spaceBefore=10, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name='BodyText2', fontName='Helvetica', fontSize=10,
    textColor=BLACK, alignment=TA_JUSTIFY, spaceBefore=4, spaceAfter=6,
    leading=14,
))
styles.add(ParagraphStyle(
    name='TableHeader', fontName='Helvetica-Bold', fontSize=9,
    textColor=WHITE, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name='TableCell', fontName='Helvetica', fontSize=9,
    textColor=BLACK, leading=12,
))
styles.add(ParagraphStyle(
    name='FlowStep', fontName='Courier-Bold', fontSize=9,
    textColor=DARK_BLUE, alignment=TA_CENTER, spaceBefore=2, spaceAfter=2,
))
styles.add(ParagraphStyle(
    name='FlowArrow', fontName='Helvetica-Bold', fontSize=12,
    textColor=MED_BLUE, alignment=TA_CENTER, spaceBefore=0, spaceAfter=0,
))
styles.add(ParagraphStyle(
    name='Footer', fontName='Helvetica', fontSize=8,
    textColor=GRAY, alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name='TOCEntry', fontName='Helvetica', fontSize=11,
    textColor=BLACK, spaceBefore=3, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name='TOCBold', fontName='Helvetica-Bold', fontSize=11,
    textColor=DARK_BLUE, spaceBefore=5, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name='DiagramText', fontName='Courier', fontSize=7,
    textColor=DARK_BLUE, alignment=TA_CENTER, leading=9,
    spaceBefore=0, spaceAfter=0,
))
styles.add(ParagraphStyle(
    name='BulletItem', fontName='Helvetica', fontSize=10,
    textColor=BLACK, spaceBefore=2, spaceAfter=2, leftIndent=20,
    leading=14,
))


def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    header_row = [[Paragraph(h, styles['TableHeader']) for h in headers]]
    data_rows = [
        [Paragraph(str(c), styles['TableCell']) for c in row]
        for row in rows
    ]
    all_data = header_row + data_rows

    if not col_widths:
        available = 6.5 * inch
        col_widths = [available / len(headers)] * len(headers)

    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, MED_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]
    # Alternating row colors
    for i in range(1, len(all_data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), LIGHT_BLUE))
    t.setStyle(TableStyle(style_cmds))
    return t


def make_flowchart(steps):
    """Create a text-based flowchart as table elements."""
    elements = []
    for i, step in enumerate(steps):
        box = f"[ {step} ]"
        elements.append(Paragraph(box, styles['FlowStep']))
        if i < len(steps) - 1:
            elements.append(Paragraph("\u25bc", styles['FlowArrow']))
    return elements


def make_diagram_block(lines):
    """Render ASCII diagram lines."""
    elements = []
    for line in lines:
        elements.append(Paragraph(line, styles['DiagramText']))
    return elements


def add_page_header_footer(canvas, doc):
    """Add header and footer to each page."""
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(DARK_BLUE)
    canvas.setLineWidth(2)
    canvas.line(50, A4[1] - 40, A4[0] - 50, A4[1] - 40)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(DARK_BLUE)
    canvas.drawString(50, A4[1] - 35, "Hospital EMR System — Confidential Pitch Document")
    canvas.drawRightString(A4[0] - 50, A4[1] - 35, "February 2026")

    # Footer
    canvas.setStrokeColor(MED_GRAY)
    canvas.setLineWidth(1)
    canvas.line(50, 40, A4[0] - 50, 40)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(A4[0] / 2, 28, f"Page {doc.page}")
    canvas.drawString(50, 28, "© 2026 Hospital EMR Solutions")
    canvas.restoreState()


# ═══════════════════════════════════════════════════════════════════════
# BUILD DOCUMENT
# ═══════════════════════════════════════════════════════════════════════
output_path = os.path.join(OUTPUT_DIR, "Hospital_EMR_Pitch.pdf")
doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    topMargin=50,
    bottomMargin=55,
    leftMargin=50,
    rightMargin=50,
)

story = []

# ═══════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 2 * inch))
story.append(Paragraph("HOSPITAL EMR SYSTEM", styles['CoverTitle']))
story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph(
    "Electronic Medical Records &amp; Hospital Management Platform",
    styles['CoverSubtitle'],
))
story.append(Spacer(1, 0.2 * inch))

cover_sub = ParagraphStyle(
    'CoverSub2', parent=styles['CoverSubtitle'],
    fontSize=13, italic=True, textColor=GRAY,
)
story.append(Paragraph(
    "Comprehensive Solution for Private Hospital Operations", cover_sub,
))
story.append(Spacer(1, 1.5 * inch))

conf_style = ParagraphStyle(
    'Conf', parent=styles['CoverSubtitle'],
    fontSize=12, textColor=DARK_RED, fontName='Helvetica-Bold',
)
story.append(Paragraph("CONFIDENTIAL PITCH DOCUMENT", conf_style))
story.append(Spacer(1, 0.3 * inch))

date_style = ParagraphStyle(
    'Date', parent=styles['CoverSubtitle'],
    fontSize=11, textColor=GRAY, fontName='Helvetica',
)
story.append(Paragraph("Prepared: February 2026  |  Version 1.0", date_style))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("TABLE OF CONTENTS", styles['SectionTitle']))
story.append(Spacer(1, 0.2 * inch))

toc_items = [
    (True, "1. Executive Summary"),
    (True, "2. System Overview &amp; Architecture"),
    (True, "3. Core Modules &amp; Features"),
    (False, "   3.1  Patient Management"),
    (False, "   3.2  Electronic Medical Records (EMR)"),
    (False, "   3.3  Appointment &amp; Scheduling"),
    (False, "   3.4  Staff &amp; HR Management"),
    (False, "   3.5  Billing &amp; Financial Management"),
    (False, "   3.6  Pharmacy Management"),
    (False, "   3.7  Laboratory Management (LIS)"),
    (False, "   3.8  Radiology &amp; Imaging (RIS/PACS)"),
    (False, "   3.9  Inventory &amp; Supply Chain"),
    (False, "   3.10 Nursing Station"),
    (False, "   3.11 In-Patient (Ward) Management"),
    (False, "   3.12 Out-Patient Department (OPD)"),
    (False, "   3.13 Emergency Department"),
    (False, "   3.14 Operating Theatre Management"),
    (False, "   3.15 Blood Bank Management"),
    (True, "4. Administrative Modules"),
    (True, "5. Workflow Diagrams"),
    (True, "6. Integration &amp; Interoperability"),
    (True, "7. Security &amp; Compliance"),
    (True, "8. Technology Stack"),
    (True, "9. Implementation Plan"),
    (True, "10. Pricing &amp; Licensing"),
    (True, "11. Support &amp; Maintenance"),
    (True, "12. Why Choose Our EMR?"),
]
for bold, text in toc_items:
    story.append(Paragraph(text, styles['TOCBold'] if bold else styles['TOCEntry']))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("1. EXECUTIVE SUMMARY", styles['SectionTitle']))
story.append(Paragraph(
    "Our Hospital Electronic Medical Records (EMR) system is a comprehensive, integrated "
    "healthcare management platform designed specifically for private hospitals. It digitizes "
    "every aspect of hospital operations — from patient registration to discharge, from pharmacy "
    "dispensing to laboratory results, from staff scheduling to financial reporting.",
    styles['BodyText2'],
))
story.append(Paragraph(
    "The system eliminates paper-based processes, reduces medical errors, improves patient outcomes, "
    "and provides real-time visibility into hospital performance. Built with modern technologies, "
    "it is scalable, secure, and compliant with healthcare data protection standards.",
    styles['BodyText2'],
))
story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph("Key Value Propositions", styles['SubSection']))
benefits = [
    ("Paperless Operations", "Eliminate paper records, forms, and manual tracking entirely"),
    ("Improved Patient Safety", "Drug interaction alerts, allergy warnings, clinical decision support"),
    ("Revenue Optimization", "Automated billing, insurance claims, and financial analytics"),
    ("Operational Efficiency", "Streamlined workflows reduce wait times by up to 60%"),
    ("Regulatory Compliance", "Full audit trails, data encryption, role-based access control"),
    ("Data-Driven Decisions", "Real-time dashboards, KPIs, and business intelligence reports"),
    ("Staff Productivity", "Automated scheduling, task assignment, and workload balancing"),
    ("Patient Satisfaction", "Online booking, patient portal, SMS/email notifications"),
]
story.append(make_table(["Benefit", "Description"], benefits, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 2. SYSTEM ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("2. SYSTEM OVERVIEW &amp; ARCHITECTURE", styles['SectionTitle']))
story.append(Paragraph(
    "The Hospital EMR system follows a modern three-tier architecture with clear separation "
    "of concerns, ensuring scalability, maintainability, and security.",
    styles['BodyText2'],
))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("System Components", styles['SubSection']))
components = [
    ("Frontend (Web)", "React.js / Next.js", "Web dashboard, patient portal, admin panels"),
    ("Mobile Application", "React Native / Flutter", "Doctor rounds, nurse stations, patient app"),
    ("API Layer", "Node.js / Python FastAPI", "RESTful APIs, GraphQL, WebSocket real-time"),
    ("Database", "PostgreSQL + Redis", "Relational data, caching, session management"),
    ("File Storage", "MinIO / AWS S3", "Medical images, documents, reports, X-rays"),
    ("Authentication", "JWT + OAuth 2.0", "SSO, MFA, role-based access control"),
    ("Message Queue", "RabbitMQ / Redis", "Async tasks, notifications, lab results"),
    ("Monitoring", "Grafana + Prometheus", "System health, performance metrics, alerts"),
]
story.append(make_table(
    ["Component", "Technology", "Purpose"],
    components,
    [1.7 * inch, 1.8 * inch, 3 * inch],
))
story.append(Spacer(1, 0.2 * inch))

# Architecture diagram
story.append(Paragraph("High-Level Architecture Diagram", styles['SubSection']))
arch_lines = [
    "+======================================================================+",
    "|                HOSPITAL EMR SYSTEM ARCHITECTURE                      |",
    "+======================================================================+",
    "|                                                                      |",
    "|   [Web Browser]    [Mobile App]    [Tablet/Kiosk]                    |",
    "|        |                |               |                            |",
    "|        +----------- ---+---------------+                             |",
    "|                        |                                             |",
    "|              [API GATEWAY / LOAD BALANCER]                           |",
    "|              (NGINX / Traefik / SSL)                                 |",
    "|                        |                                             |",
    "|        +---------------+---------------+                             |",
    "|        |               |               |                             |",
    "|   [Auth Service]  [Core EMR API]  [Analytics Svc]                    |",
    "|   (JWT / RBAC)    (REST / GQL)    (Reports / BI)                    |",
    "|        |               |               |                             |",
    "|        +---------------+---------------+                             |",
    "|                        |                                             |",
    "|              [DATABASE LAYER]                                        |",
    "|              PostgreSQL + Redis + S3                                 |",
    "|                                                                      |",
    "+======================================================================+",
]
story.extend(make_diagram_block(arch_lines))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 3. CORE MODULES
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("3. CORE MODULES &amp; FEATURES", styles['SectionTitle']))
story.append(Paragraph(
    "The Hospital EMR system consists of 15+ integrated modules covering every "
    "department and function of a private hospital.",
    styles['BodyText2'],
))
story.append(Spacer(1, 0.15 * inch))

# 3.1 Patient Management
story.append(Paragraph("3.1 Patient Management", styles['SubSection']))
story.append(Paragraph(
    "Complete patient lifecycle management from first contact through discharge and follow-up. "
    "Central to the entire EMR system, providing a unified patient profile accessible across all departments.",
    styles['BodyText2'],
))
patient_features = [
    ("Patient Registration", "Demographics, contact info, emergency contacts, photo, biometric ID"),
    ("Unique Patient ID", "Auto-generated UHID with barcode/QR code for all encounters"),
    ("Patient Search", "Quick search by name, ID, phone, national ID — instant results"),
    ("Patient Categories", "VIP, regular, insurance, corporate, staff, pediatric, geriatric"),
    ("Medical History", "Past illnesses, surgeries, family history, social history, allergies"),
    ("Insurance Management", "Multiple policies, pre-authorization, coverage limits, claims"),
    ("Document Upload", "ID cards, insurance cards, referral letters, consent forms"),
    ("Patient Portal", "Self-service: view records, book appointments, download reports"),
    ("Communication", "SMS, email, WhatsApp notifications for appointments and results"),
]
story.append(make_table(["Feature", "Description"], patient_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Patient Registration Workflow", styles['SubSubSection']))
story.extend(make_flowchart([
    "Patient Arrives at Hospital",
    "Registration Desk / Self-Kiosk",
    "Search Existing Records",
    "New? Create Profile + UHID",
    "Capture Demographics & Insurance",
    "Issue Patient Card (QR/Barcode)",
    "Direct to Department",
]))
story.append(PageBreak())

# 3.2 Electronic Medical Records
story.append(Paragraph("3.2 Electronic Medical Records (EMR)", styles['SubSection']))
story.append(Paragraph(
    "The heart of the system — a complete digital health record for every patient. "
    "Enables clinicians to document, review, and share patient information securely.",
    styles['BodyText2'],
))
emr_features = [
    ("Clinical Notes", "SOAP notes, progress notes, consultation notes with templates"),
    ("Diagnosis (ICD-10/11)", "Searchable ICD coding, multiple diagnoses per encounter"),
    ("E-Prescribing", "Drug interaction checks, dosage calculators, generic substitution"),
    ("Vitals Recording", "BP, temperature, pulse, SpO2, weight, height, BMI auto-calc"),
    ("Order Management", "Lab orders, radiology orders, procedure orders — all digital"),
    ("Clinical Templates", "Specialty-specific (cardiology, orthopedics, OB/GYN, etc.)"),
    ("Allergy & Alert System", "Drug allergies, food allergies, condition alerts"),
    ("Document Generation", "Auto-generate discharge summaries, referral letters, certificates"),
    ("Medical Timeline", "Chronological view of all encounters, results, procedures"),
    ("Clinical Decision Support", "Evidence-based alerts, guideline reminders, risk scores"),
    ("Voice-to-Text", "Dictation support with AI transcription for clinical notes"),
    ("E-Signatures", "Digital signatures for prescriptions, consent forms, notes"),
]
story.append(make_table(["Feature", "Description"], emr_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# 3.3 Appointment & Scheduling
story.append(Paragraph("3.3 Appointment &amp; Scheduling", styles['SubSection']))
appt_features = [
    ("Online Booking", "Patients book via web portal or mobile app — 24/7"),
    ("Walk-in Queue", "Real-time queue management with estimated wait times"),
    ("Doctor Schedule", "Define availability slots, breaks, leave, on-call schedules"),
    ("Multi-Resource Booking", "Book doctor + room + equipment simultaneously"),
    ("Recurring Appointments", "Dialysis, physiotherapy — auto-schedule recurring visits"),
    ("Reminders", "SMS/email/WhatsApp reminders 24h and 1h before appointment"),
    ("No-Show Tracking", "Track no-shows, auto-waitlist, reschedule management"),
    ("Telemedicine Slots", "Video consultation slots with integrated video calling"),
    ("Capacity Dashboard", "Real-time view of clinic capacity and utilization"),
]
story.append(make_table(["Feature", "Description"], appt_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Appointment Workflow", styles['SubSubSection']))
story.extend(make_flowchart([
    "Patient Requests Appointment",
    "Select Doctor / Specialty / Date",
    "Check Availability (Real-time)",
    "Confirm & Book Slot",
    "Reminder Sent (24h before)",
    "Patient Arrives → Check-in",
    "Queue to Doctor Consultation",
]))
story.append(PageBreak())

# 3.4 Staff & HR
story.append(Paragraph("3.4 Staff &amp; HR Management", styles['SubSection']))
hr_features = [
    ("Employee Profiles", "Complete profiles with credentials, certifications, specializations"),
    ("Attendance & Time", "Clock-in/out, biometric integration, overtime tracking"),
    ("Shift Scheduling", "Auto-generate shift rosters, swap requests, on-call management"),
    ("Leave Management", "Apply, approve, track leave — annual, sick, maternity, emergency"),
    ("Payroll Integration", "Salary calculation, deductions, bonuses, pay slip generation"),
    ("Performance Reviews", "360° evaluations, KPIs, competency assessments"),
    ("Training & CME", "Track continuing medical education, certifications, expiry alerts"),
    ("Credentialing", "Verify and track medical licenses, board certifications"),
    ("Staff Communication", "Internal messaging, announcements, policy distribution"),
]
story.append(make_table(["Feature", "Description"], hr_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# 3.5 Billing & Finance
story.append(Paragraph("3.5 Billing &amp; Financial Management", styles['SubSection']))
billing_features = [
    ("Patient Billing", "Auto-generate bills from orders, procedures, bed charges, consumables"),
    ("Insurance Claims", "Electronic claim submission, pre-authorization, adjudication"),
    ("Multiple Payments", "Cash, card, mobile money, bank transfer, installment plans"),
    ("Package Billing", "Health check, surgery, maternity packages"),
    ("Deposit Management", "Advance deposits, refunds, deposit adjustment tracking"),
    ("Revenue Dashboard", "Daily/weekly/monthly revenue, department-wise collection"),
    ("Tax Management", "VAT/GST calculation, tax invoices, exemptions"),
    ("Financial Reports", "P&L, balance sheet, aging reports, revenue forecasts"),
    ("Accounting Integration", "Export to QuickBooks, Xero, Tally, or custom ERP"),
]
story.append(make_table(["Feature", "Description"], billing_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Billing Workflow", styles['SubSubSection']))
story.extend(make_flowchart([
    "Services Rendered (Consult/Lab/Proc)",
    "Charges Auto-Captured to Bill",
    "Insurance Pre-Authorization Check",
    "Generate Invoice",
    "Patient Payment",
    "Insurance Claim Submitted",
    "Payment Reconciliation",
    "Receipt Generated",
]))
story.append(PageBreak())

# 3.6 Pharmacy
story.append(Paragraph("3.6 Pharmacy Management", styles['SubSection']))
pharmacy_features = [
    ("E-Prescription Receipt", "Receive prescriptions electronically from EMR — no paper"),
    ("Drug Dispensing", "Barcode-based dispensing, patient verification, label printing"),
    ("Drug Interaction Check", "Real-time alerts for drug-drug & drug-allergy interactions"),
    ("Inventory Management", "Stock levels, reorder points, expiry tracking, batch management"),
    ("Controlled Substances", "Special tracking for narcotics/controlled medications"),
    ("Purchase Orders", "Auto-generate POs when stock falls below reorder level"),
    ("Point of Sale", "Walk-in customer sales, OTC medications"),
    ("Reports", "Fast/slow movers, expiry reports, revenue by category"),
]
story.append(make_table(["Feature", "Description"], pharmacy_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# 3.7 Laboratory
story.append(Paragraph("3.7 Laboratory Management (LIS)", styles['SubSection']))
lab_features = [
    ("Order Management", "Receive lab orders digitally, priority flagging"),
    ("Sample Collection", "Barcode labels, collection tracking, phlebotomy scheduling"),
    ("Sample Tracking", "Track from collection to processing to reporting"),
    ("Result Entry", "Manual or instrument-interfaced with normal ranges"),
    ("Auto-Validation", "Rules-based auto-validation for normal range results"),
    ("Critical Alerts", "Immediate alerts for critical/panic values"),
    ("Quality Control", "QC tracking, Levey-Jennings charts, Westgard rules"),
    ("Instrument Interface", "Bi-directional connection with analyzers (ASTM/HL7)"),
    ("TAT Monitoring", "Turnaround time tracking and bottleneck identification"),
]
story.append(make_table(["Feature", "Description"], lab_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("Laboratory Workflow", styles['SubSubSection']))
story.extend(make_flowchart([
    "Doctor Orders Lab Test",
    "Order in Lab Queue",
    "Sample Collection (Barcode)",
    "Processing (Analyzer)",
    "Result Entry / Auto-Capture",
    "Validation (Auto + Manual QC)",
    "Report → EMR Updated",
    "Doctor & Patient Notified",
]))
story.append(PageBreak())

# 3.8 Radiology
story.append(Paragraph("3.8 Radiology &amp; Imaging (RIS/PACS)", styles['SubSection']))
radiology_features = [
    ("Order Management", "Digital radiology orders with clinical indication"),
    ("DICOM Integration", "Modality Worklist, image storage and archiving"),
    ("Web-Based Viewer", "DICOM viewer with measurement and comparison tools"),
    ("Structured Reports", "Templates, voice dictation, auto-distribution"),
    ("Equipment Tracking", "Maintenance schedules, utilization reports"),
]
story.append(make_table(["Feature", "Description"], radiology_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

# 3.9 Inventory
story.append(Paragraph("3.9 Inventory &amp; Supply Chain", styles['SubSection']))
inv_features = [
    ("Multi-Store", "Central store, department sub-stores, pharmacy, kitchen"),
    ("Purchase Workflow", "Requisition → PO → GRN → Issue with approvals"),
    ("Expiry Management", "FEFO/FIFO tracking, expiry alerts 30/60/90 days"),
    ("ABC/VED Analysis", "Classify items by value and criticality"),
    ("Barcode/RFID", "Item identification and tracking"),
    ("Vendor Management", "Evaluation, price comparison, contracts"),
]
story.append(make_table(["Feature", "Description"], inv_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# 3.10 Nursing
story.append(Paragraph("3.10 Nursing Station", styles['SubSection']))
nursing_features = [
    ("Patient Worklist", "View assigned patients with alerts and pending tasks"),
    ("Vital Signs Charting", "Record and chart vitals with auto-alerts for abnormals"),
    ("Medication Admin (eMAR)", "Barcode scan patient + medication for safety"),
    ("Care Plans", "Create and manage individualized care plans"),
    ("Intake/Output", "Track fluid intake, urine output, drain output"),
    ("Shift Handover", "Structured handover notes with critical flags"),
]
story.append(make_table(["Feature", "Description"], nursing_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

# 3.11 In-Patient
story.append(Paragraph("3.11 In-Patient (Ward) Management", styles['SubSection']))
ipd_features = [
    ("Admission", "Direct, emergency, or transfer admission with bed assignment"),
    ("Bed Management", "Visual bed map, occupancy dashboard, bed categories"),
    ("Discharge Planning", "Summary, follow-up, take-home meds, clearance checklist"),
    ("Diet Management", "Dietary orders, special diets, kitchen integration"),
    ("Census Reports", "Daily census, ADT reports, length of stay tracking"),
]
story.append(make_table(["Feature", "Description"], ipd_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("In-Patient Workflow", styles['SubSubSection']))
story.extend(make_flowchart([
    "Admission Request",
    "Check Bed Availability",
    "Assign Bed (Ward/ICU/Private)",
    "Daily Rounds & Orders",
    "Nursing Care & Monitoring",
    "Discharge Planning",
    "Clearance from All Depts",
    "Discharge Summary + Follow-up",
]))
story.append(PageBreak())

# 3.12 OPD
story.append(Paragraph("3.12 Out-Patient Department (OPD)", styles['SubSection']))
opd_features = [
    ("Check-in / Queue", "Self-service kiosk or receptionist, token system"),
    ("Triage", "Nurse triage with severity classification"),
    ("Consultation", "Full EMR during consultation — notes, orders, prescriptions"),
    ("Referrals", "Internal specialist referrals, external referral letters"),
    ("Telemedicine", "Virtual OPD consultations via video call"),
    ("OPD Analytics", "Patient footfall, wait times, revenue per doctor"),
]
story.append(make_table(["Feature", "Description"], opd_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

# 3.13 Emergency
story.append(Paragraph("3.13 Emergency Department", styles['SubSection']))
er_features = [
    ("Rapid Registration", "Minimal info required — full details captured later"),
    ("Triage (ESI / MTS)", "Emergency Severity Index or Manchester Triage System"),
    ("Real-time Bed Board", "Visual display of all ER bays/beds with status"),
    ("STAT Orders", "Priority lab and imaging orders with STAT flags"),
    ("Resuscitation Timer", "Timer for CPR, drug administration intervals"),
    ("Mass Casualty Mode", "Simplified documentation for disaster scenarios"),
]
story.append(make_table(["Feature", "Description"], er_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# 3.14 Operating Theatre
story.append(Paragraph("3.14 Operating Theatre (OT) Management", styles['SubSection']))
ot_features = [
    ("Surgery Scheduling", "Book OT slots, manage conflicts, priority scheduling"),
    ("Pre-Op Assessment", "Anesthesia assessment, consent forms, preparation checklist"),
    ("WHO Safety Checklist", "Digital Sign-In, Time-Out, Sign-Out workflow"),
    ("OT Documentation", "Surgical notes, anesthesia record, implant tracking"),
    ("Resource Management", "Equipment, staff, consumable allocation per surgery"),
    ("Surgeon Preference Cards", "Pre-configured instrument and supply lists"),
]
story.append(make_table(["Feature", "Description"], ot_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

# 3.15 Blood Bank
story.append(Paragraph("3.15 Blood Bank Management", styles['SubSection']))
blood_features = [
    ("Donor Management", "Registration, screening, donation history"),
    ("Blood Collection", "Donation processing, component separation, storage"),
    ("Cross-Matching", "Compatibility testing, results tracking"),
    ("Transfusion Tracking", "Issue units, monitor reactions, documentation"),
    ("Mandatory Testing", "HIV, HBV, HCV, Syphilis, Malaria screening"),
    ("Reports & Compliance", "Collection, usage, discard reports for regulators"),
]
story.append(make_table(["Feature", "Description"], blood_features, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 4. ADMINISTRATIVE MODULES
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("4. ADMINISTRATIVE MODULES", styles['SectionTitle']))

story.append(Paragraph("4.1 Admin Dashboard &amp; Analytics", styles['SubSection']))
admin_features = [
    ("Executive Dashboard", "Hospital-wide KPIs: revenue, patient count, bed occupancy, ER wait"),
    ("Department Views", "Department-specific metrics and performance indicators"),
    ("Financial Overview", "Revenue, expenses, outstanding receivables, cash flow"),
    ("Quality Indicators", "Infection rates, readmission rates, mortality rates"),
    ("Custom Widgets", "Drag-and-drop dashboard customization"),
    ("Alert Center", "Stock-outs, equipment downtime, pending approvals"),
]
story.append(make_table(["Feature", "Description"], admin_features, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("4.2 Reports &amp; Business Intelligence", styles['SubSection']))
reports = [
    ("Clinical Reports", "Patient census, diagnosis distribution, treatment outcomes"),
    ("Financial Reports", "Revenue analysis, billing summary, department P&L"),
    ("Operational Reports", "OT utilization, bed occupancy, ER turnaround times"),
    ("Custom Report Builder", "Drag-and-drop builder with filters, grouping, charts"),
    ("Scheduled Reports", "Auto-generate and email reports on schedule"),
    ("Export Options", "PDF, Excel, CSV, print — with hospital branding"),
]
story.append(make_table(["Category", "Details"], reports, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("4.3 User &amp; Role Management", styles['SubSection']))
roles = [
    ("Administrator", "Full system access, user management, configuration"),
    ("Doctor", "Patient records, prescriptions, orders, clinical notes"),
    ("Nurse", "Vitals, medication administration, nursing notes"),
    ("Receptionist", "Patient registration, appointments, billing"),
    ("Pharmacist", "Drug dispensing, inventory, prescription verification"),
    ("Lab Technician", "Sample processing, result entry, quality control"),
    ("Custom Roles", "Create any role with granular permissions"),
]
story.append(make_table(["Role", "Access Scope"], roles, [2 * inch, 4.5 * inch]))
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("4.4 Audit Trail &amp; Compliance", styles['SubSection']))
audit = [
    ("Complete Audit Trail", "Every action logged: who, what, when, where, before/after"),
    ("Data Access Logging", "Track who accessed which patient record and when"),
    ("HIPAA Compliance", "Data encryption, access controls, breach protocols"),
    ("GDPR Support", "Right to access, right to erasure, data portability"),
    ("Data Backup", "Automated backups, disaster recovery, point-in-time restore"),
]
story.append(make_table(["Feature", "Description"], audit, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 5. WORKFLOW DIAGRAMS
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("5. COMPREHENSIVE WORKFLOW DIAGRAMS", styles['SectionTitle']))

story.append(Paragraph("5.1 Complete Patient Journey", styles['SubSection']))
journey_lines = [
    "+========================================================================+",
    "|                  COMPLETE PATIENT JOURNEY                              |",
    "+========================================================================+",
    "|                                                                        |",
    "|  [ARRIVAL]  -->  [REGISTER]  -->  [TRIAGE / OPD QUEUE]                |",
    "|  Walk-in/        New or            Urgency-based                       |",
    "|  Appt/ER         Existing          routing                            |",
    "|                                        |                              |",
    "|                                        v                              |",
    "|                              [CONSULTATION]                           |",
    "|                              Doctor Visit                             |",
    "|                                    |                                  |",
    "|            +----------+--------+---+----+----------+                  |",
    "|            v          v        v        v          v                  |",
    "|       [LAB TESTS] [IMAGING] [PHARMACY] [ADMIT] [REFER]               |",
    "|            |          |        |        |                             |",
    "|            +----------+--------+        |                             |",
    "|                   |                     v                             |",
    "|                   v            [IN-PATIENT CARE]                      |",
    "|          [FOLLOW-UP /          Daily Rounds -->                       |",
    "|           BILLING /            Nursing Care -->                       |",
    "|           DISCHARGE]           Discharge                              |",
    "|                                                                       |",
    "+========================================================================+",
]
story.extend(make_diagram_block(journey_lines))
story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph("5.2 Revenue Cycle Management", styles['SubSection']))
rev_lines = [
    "+================================================================+",
    "|              REVENUE CYCLE MANAGEMENT                           |",
    "+================================================================+",
    "|                                                                 |",
    "|  [Patient Encounter] --> [Service Delivery] --> [Charge Capture]|",
    "|                                                       |         |",
    "|  [Payment Posting] <-- [Claims Processing] <-- [Billing/Coding]|",
    "|         |                                                       |",
    "|         v                                                       |",
    "|  [Denial Management] --> [Reporting & Analytics]                |",
    "|                                                                 |",
    "+================================================================+",
]
story.extend(make_diagram_block(rev_lines))
story.append(Spacer(1, 0.2 * inch))

story.append(Paragraph("5.3 Emergency Department Workflow", styles['SubSection']))
er_lines = [
    "+================================================================+",
    "|             EMERGENCY DEPARTMENT WORKFLOW                        |",
    "+================================================================+",
    "|                                                                  |",
    "|  [Ambulance/Walk-in] --> [Rapid Registration] --> [TRIAGE]      |",
    "|                                                      |          |",
    "|                          +----------+--------+-------+          |",
    "|                          v          v        v                  |",
    "|                    [Level 1]  [Level 2-3] [Level 4-5]           |",
    "|                  Resuscitate    Acute     Non-urgent             |",
    "|                          |          |        |                   |",
    "|                          +----------+--------+                  |",
    "|                                  |                              |",
    "|                          [DISPOSITION]                          |",
    "|                    Admit / Discharge / Transfer                  |",
    "|                                                                  |",
    "+================================================================+",
]
story.extend(make_diagram_block(er_lines))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 6. INTEGRATION
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("6. INTEGRATION &amp; INTEROPERABILITY", styles['SectionTitle']))
integrations = [
    ("HL7 / FHIR", "Healthcare data exchange for interoperability"),
    ("DICOM", "Medical imaging standard for radiology equipment"),
    ("ICD-10 / ICD-11", "International disease classification coding"),
    ("SNOMED CT", "Standardized clinical terminology"),
    ("Lab Instruments", "Bi-directional interface (ASTM/HL7)"),
    ("Insurance Portals", "Electronic claims, pre-auth, eligibility"),
    ("Payment Gateways", "Stripe, PayStack, Flutterwave, banks"),
    ("Accounting", "QuickBooks, Xero, Tally, SAP"),
    ("SMS/Email", "Twilio, SendGrid for communications"),
    ("Video / Telemedicine", "Zoom, Jitsi for virtual consultations"),
    ("Biometric Devices", "Fingerprint, facial recognition for attendance"),
    ("National Health ID", "Link with national identification systems"),
]
story.append(make_table(["Integration", "Purpose"], integrations, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 7. SECURITY
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("7. SECURITY &amp; COMPLIANCE", styles['SectionTitle']))
security = [
    ("Data Encryption", "AES-256 at rest, TLS 1.3 in transit"),
    ("Access Control", "RBAC, ABAC, IP whitelisting"),
    ("Multi-Factor Auth", "SMS OTP, authenticator app, biometric"),
    ("Audit Logging", "Every action logged with full context"),
    ("Data Backup", "Hourly incremental, daily full, off-site"),
    ("Disaster Recovery", "RPO < 1hr, RTO < 4hrs, automated failover"),
    ("HIPAA Compliance", "Full health data protection compliance"),
    ("GDPR Support", "Consent, right to erasure, data portability"),
    ("SOC 2 Type II", "Service organization security certification"),
    ("Penetration Testing", "Regular third-party security audits"),
]
story.append(make_table(["Feature", "Details"], security, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 8. TECHNOLOGY STACK
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("8. TECHNOLOGY STACK", styles['SectionTitle']))
tech = [
    ("Frontend", "React.js / Next.js 14", "SSR, responsive, PWA"),
    ("Mobile", "React Native / Flutter", "Cross-platform, offline"),
    ("Backend", "Node.js (NestJS) / Python (FastAPI)", "REST + GraphQL + WebSocket"),
    ("Database", "PostgreSQL 16+", "ACID, JSON, full-text search"),
    ("Cache", "Redis", "Sessions, real-time, pub/sub"),
    ("Search", "Elasticsearch", "Full-text patient search"),
    ("Storage", "MinIO / AWS S3", "Images, documents, DICOM"),
    ("Queue", "RabbitMQ", "Async tasks, notifications"),
    ("Containers", "Docker + Kubernetes", "Deployments, auto-scaling"),
    ("CI/CD", "GitHub Actions", "Automated pipeline"),
    ("Monitoring", "Prometheus + Grafana", "Metrics, alerting"),
    ("PACS", "Orthanc / dcm4chee", "DICOM server"),
]
story.append(make_table(
    ["Layer", "Technology", "Notes"],
    tech,
    [1.5 * inch, 2.5 * inch, 2.5 * inch],
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 9. IMPLEMENTATION
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("9. IMPLEMENTATION PLAN", styles['SectionTitle']))
story.append(Paragraph(
    "A phased implementation over 12 months ensures minimal disruption while "
    "delivering value incrementally at each stage.",
    styles['BodyText2'],
))
phases = [
    ("Phase 1: Foundation\n(Months 1-3)",
     "Project setup, infrastructure, patient registration, user management, basic EMR, scheduling"),
    ("Phase 2: Clinical Core\n(Months 4-6)",
     "Full EMR with templates, OPD workflow, laboratory, pharmacy, billing, nursing station"),
    ("Phase 3: Advanced Clinical\n(Months 7-9)",
     "In-patient management, emergency dept, operating theatre, radiology/PACS, blood bank"),
    ("Phase 4: Analytics\n(Months 10-11)",
     "Admin dashboard, BI, report builder, insurance & payment integration"),
    ("Phase 5: Launch\n(Month 12)",
     "Performance optimization, security hardening, training, data migration, go-live"),
]
story.append(make_table(
    ["Phase", "Deliverables"],
    phases,
    [2 * inch, 4.5 * inch],
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 10. PRICING
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("10. PRICING &amp; LICENSING", styles['SectionTitle']))
pricing = [
    ("Starter", "Up to 50 beds", "Core EMR, OPD, Pharmacy, Lab, Billing", "Custom Quote"),
    ("Professional", "50–200 beds", "All Starter + IPD, ER, OT, HR, Analytics", "Custom Quote"),
    ("Enterprise", "200+ beds", "Full suite + PACS, API, custom development", "Custom Quote"),
    ("Cloud Hosted", "Any size", "SaaS model — monthly per-user pricing", "Custom Quote"),
    ("On-Premise", "Any size", "Self-hosted with perpetual license", "Custom Quote"),
]
story.append(make_table(
    ["Plan", "Hospital Size", "Includes", "Price"],
    pricing,
    [1.2 * inch, 1.3 * inch, 2.5 * inch, 1.5 * inch],
))
story.append(Spacer(1, 0.2 * inch))
story.append(Paragraph(
    "All plans include: implementation support, data migration assistance, "
    "user training (on-site + virtual), 12-month warranty, and documentation.",
    styles['BodyText2'],
))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 11. SUPPORT
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("11. SUPPORT &amp; MAINTENANCE", styles['SectionTitle']))
support = [
    ("24/7 Help Desk", "Round-the-clock phone, email, and chat support"),
    ("Dedicated Account Mgr", "Single point of contact for your hospital"),
    ("Remote Support", "Screen-sharing troubleshooting and guidance"),
    ("On-Site Support", "Available for critical issues and installations"),
    ("Regular Updates", "Security patches, features, bug fixes"),
    ("Training", "Quarterly refresher sessions for staff"),
    ("Knowledge Base", "Online docs and video tutorials"),
    ("SLA Guarantee", "99.9% uptime, <1hr critical response"),
]
story.append(make_table(["Service", "Description"], support, [2 * inch, 4.5 * inch]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 12. WHY CHOOSE US
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("12. WHY CHOOSE OUR EMR?", styles['SectionTitle']))
story.append(Spacer(1, 0.15 * inch))

reasons = [
    "Purpose-built for private hospitals — not a generic adaptation",
    "All-in-one solution — no need for multiple vendor systems",
    "Modern technology — fast, responsive, mobile-ready",
    "Scalable — grows with your hospital from 10 beds to 1000+",
    "Interoperable — HL7/FHIR compliant, integrates with anything",
    "Secure — bank-grade encryption, full audit trail",
    "Affordable — flexible licensing, no hidden costs",
    "Local support — dedicated team in your region",
    "Fast implementation — go live in as little as 3 months (Phase 1)",
    "Proven ROI — hospitals report 30-50% efficiency improvement",
]
for reason in reasons:
    story.append(Paragraph(f"✓  {reason}", styles['BulletItem']))

story.append(Spacer(1, 0.5 * inch))

# Closing
closing_style = ParagraphStyle(
    'Closing', parent=styles['CoverTitle'], fontSize=20,
)
story.append(Paragraph("Ready to Transform Your Hospital?", closing_style))
story.append(Spacer(1, 0.2 * inch))
story.append(Paragraph(
    "Contact us for a personalized demo and consultation",
    styles['CoverSubtitle'],
))
story.append(Spacer(1, 0.15 * inch))

contact_style = ParagraphStyle(
    'Contact', parent=styles['CoverSubtitle'],
    fontSize=11, textColor=MED_BLUE,
)
story.append(Paragraph(
    "Email: info@hospitalemr.com  |  Phone: +XXX-XXX-XXXX  |  Web: www.hospitalemr.com",
    contact_style,
))

# ═══════════════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════════════
doc.build(story, onFirstPage=add_page_header_footer, onLaterPages=add_page_header_footer)
print(f"✅ PDF document saved to: {output_path}")
