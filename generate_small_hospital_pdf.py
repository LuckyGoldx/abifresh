"""
Generate Small Hospital EMR Pitch - PDF Document
"""
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image as RLImage
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "Hospital_EMR_Pitch")
os.makedirs(OUTPUT_DIR, exist_ok=True)

output_path = os.path.join(OUTPUT_DIR, "Small_Hospital_EMR_Pitch.pdf")

# Color scheme
COLOR_DARK_BLUE = HexColor("#003366")
COLOR_LIGHT_BLUE = HexColor("#0066CC")
COLOR_MEDICAL_GREEN = HexColor("#00AA66")
COLOR_ACCENT = HexColor("#FF6B35")

# Create PDF
doc = SimpleDocTemplate(output_path, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
story = []

# Create styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=36,
    textColor=COLOR_DARK_BLUE,
    spaceAfter=12,
    alignment=1,  # Center
    fontName='Helvetica-Bold'
)

heading1_style = ParagraphStyle(
    'CustomH1',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=COLOR_DARK_BLUE,
    spaceAfter=12,
    spaceBefore=12,
    fontName='Helvetica-Bold'
)

heading2_style = ParagraphStyle(
    'CustomH2',
    parent=styles['Heading2'],
    fontSize=16,
    textColor=COLOR_LIGHT_BLUE,
    spaceAfter=10,
    spaceBefore=10,
    fontName='Helvetica-Bold'
)

normal_style = ParagraphStyle(
    'CustomNormal',
    parent=styles['Normal'],
    fontSize=11,
    alignment=4,  # Justify
    spaceAfter=8
)

bullet_style = ParagraphStyle(
    'CustomBullet',
    parent=styles['Normal'],
    fontSize=11,
    leftIndent=20,
    spaceAfter=6
)

# ═══════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 1.5*inch))
story.append(Paragraph("🏥 SMALL HOSPITAL EMR SYSTEM", title_style))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Modern Cloud-Based Electronic Medical Records", heading2_style))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("For 50-200 Bed Private Hospitals", heading2_style))
story.append(Spacer(1, 0.8*inch))
story.append(Paragraph("═" * 80, normal_style))
story.append(Spacer(1, 0.5*inch))

subtitle = ParagraphStyle(
    'Subtitle',
    parent=styles['Normal'],
    fontSize=14,
    textColor=COLOR_DARK_BLUE,
    alignment=1,
    fontName='Helvetica-Bold'
)
story.append(Paragraph("Complete Implementation & Deployment Guide", subtitle))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph(f"February 2026", normal_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("EXECUTIVE SUMMARY", heading1_style))

story.append(Paragraph(
    "Our Small Hospital EMR is a modern, cloud-based electronic medical records system "
    "designed specifically for private hospitals with 50-200 beds. It integrates all hospital "
    "departments on a single platform, reducing costs by 90%, implementing in just 12 weeks, "
    "and eliminating the need for a dedicated IT team.",
    normal_style
))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Key Highlights", heading2_style))

highlights = [
    "✓ 12 Fully Integrated Modules",
    "✓ 70+ Beautiful, Responsive Pages",
    "✓ 150+ REST API Endpoints",
    "✓ Cloud-Based Stack (Supabase + Koyeb + Vercel)",
    "✓ No IT Team Required",
    "✓ Only $200-300/month Operating Costs",
    "✓ 12 Weeks from Order to Live System",
    "✓ HIPAA-Compliant Design",
    "✓ You Own It",
    "✓ Scalable (50 to 500+ beds)",
]

for highlight in highlights:
    story.append(Paragraph(highlight, bullet_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# WHAT IS THIS SYSTEM?
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("WHAT IS THIS EMR SYSTEM?", heading1_style))

story.append(Paragraph(
    "The Small Hospital EMR is a complete, integrated healthcare management platform that "
    "brings all hospital departments onto a single digital system. It replaces paper records, "
    "manual processes, and disconnected spreadsheets with an intelligent, secure, and "
    "easy-to-use web application.",
    normal_style
))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Core Characteristics", heading2_style))

characteristics = [
    "<b>Modern Solution:</b> Cloud-based system built with latest technology",
    "<b>Complete Integration:</b> All departments connected",
    "<b>Easy to Use:</b> Intuitive interface for busy clinicians",
    "<b>Scalable Infrastructure:</b> Grows with your hospital",
    "<b>Affordable:</b> Cloud stack keeps operating costs low",
    "<b>Secure & Compliant:</b> Bank-grade encryption, HIPAA design",
    "<b>Fast Deployment:</b> Go live in 12 weeks vs 2 years",
    "<b>Owned by You:</b> You own the code and data",
]

for char in characteristics:
    story.append(Paragraph(char, bullet_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 12 MODULES
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("COMPLETE FEATURE OVERVIEW: 12 MODULES", heading1_style))

modules = [
    ("1. PATIENT MANAGEMENT", [
        "New patient registration with demographics",
        "Unique patient ID (UHID) automatic generation",
        "Complete medical history tracking",
        "Allergy & clinical alert management",
        "Document upload (ID cards, insurance, referrals)",
    ]),
    ("2. ELECTRONIC MEDICAL RECORDS (EMR)", [
        "SOAP consultation notes",
        "Diagnosis recording with ICD-10 coding",
        "E-prescribing with real-time drug interaction checking",
        "Vital signs recording & auto-calculations",
        "Specialty-specific EMR templates",
    ]),
    ("3. APPOINTMENTS & SCHEDULING", [
        "Online appointment booking (24/7 self-service)",
        "Walk-in queue management with real-time waiting times",
        "Doctor availability management & scheduling",
        "Automated appointment reminders (SMS + Email)",
        "Telemedicine slot booking",
    ]),
    ("4. OUT-PATIENT DEPARTMENT (OPD)", [
        "Patient check-in interface",
        "Queue management & display system",
        "Doctor consultation workflow",
        "Specialist referral management",
        "OPD performance reports & analytics",
    ]),
    ("5. PHARMACY MANAGEMENT", [
        "Automatic e-prescription receipt from EMR",
        "Medication dispensing interface",
        "Real-time drug interaction checking",
        "Inventory management (stock levels, alerts)",
        "Barcode-based medication dispensing",
    ]),
    ("6. LABORATORY (LIS - Lab Information System)", [
        "Digital laboratory order receipt",
        "Sample collection tracking with barcodes",
        "Result entry interface & auto-validation",
        "Critical value alerts (automatic notification)",
        "Turnaround time (TAT) monitoring",
    ]),
    ("7. IN-PATIENT / WARDS MANAGEMENT", [
        "Admission workflow & documentation",
        "Bed management with visual bed occupancy map",
        "Patient transfer tracking between wards",
        "Discharge planning & documentation",
        "Daily census reports",
    ]),
    ("8. NURSING STATION", [
        "Patient worklist (assigned patients display)",
        "Vital signs charting & trend monitoring",
        "Care plan creation & management",
        "Medication administration tracking (eMAR)",
        "Real-time synchronization with doctors",
    ]),
    ("9. BILLING & FINANCIAL MANAGEMENT", [
        "Automatic billing from consultation notes",
        "Invoice generation & printing",
        "Multiple payment method support",
        "Insurance claim submission",
        "Revenue tracking by department",
    ]),
    ("10. ADMIN DASHBOARD", [
        "Real-time KPI dashboards",
        "Revenue monitoring & trending",
        "Patient statistics & demographics",
        "Department performance metrics",
        "Automated record export (CSV, PDF)",
    ]),
    ("11. USER MANAGEMENT & RBAC", [
        "7 predefined roles (Doctor, Nurse, Pharmacist, Lab Tech, etc)",
        "Role-based access control (RBAC)",
        "Granular permission management",
        "Multi-factor authentication (MFA) support",
        "Session timeout & security policies",
    ]),
    ("12. SECURITY & AUDIT TRAIL", [
        "Complete audit logging (every action tracked)",
        "Data encryption (AES-256 at rest, TLS 1.3 in transit)",
        "Automated daily backups with 30-day retention",
        "Disaster recovery with point-in-time recovery",
        "HIPAA-compliant architecture & controls",
    ]),
]

for module_title, features in modules:
    story.append(Paragraph(module_title, heading2_style))
    for feature in features:
        story.append(Paragraph(f"• {feature}", bullet_style))
    if module_title != modules[-1][0]:
        story.append(Spacer(1, 0.1*inch))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("SYSTEM ARCHITECTURE", heading1_style))

story.append(Paragraph(
    "The Small Hospital EMR is built on a modern, scalable cloud architecture using three "
    "leading managed services. This eliminates the need for a dedicated IT team while "
    "providing enterprise-grade reliability and security.",
    normal_style
))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Three-Tier Architecture", heading2_style))

arch_data = [
    ["Frontend (Vercel)", "Next.js 14 + React + TypeScript\n70+ pages, real-time, PDF/CSV export"],
    ["Backend API (Koyeb)", "Node.js + NestJS + TypeScript\n150+ endpoints, auto-scaling (1-5 instances)"],
    ["Database (Supabase)", "PostgreSQL + Supabase Auth\n80+ tables, Row-Level Security, auto-backups"],
]

# Create table with better formatting
arch_table = Table(arch_data, colWidths=[2*inch, 4.5*inch])
arch_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), HexColor("#f0f0f0")),
    ('TEXTCOLOR', (0, 0), (-1, -1), black),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 12),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f9f9f9")]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))

story.append(arch_table)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Why This Stack?", heading2_style))

why_stack = [
    "✓ No DevOps Team Required",
    "✓ 99.9% Uptime SLA",
    "✓ Auto-Scaling",
    "✓ Cost-Effective ($200-300/month)",
    "✓ Fast Deployments",
    "✓ Enterprise Security",
    "✓ Scales from 50 to 500+ beds",
]

for item in why_stack:
    story.append(Paragraph(item, bullet_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# BENEFITS & ROI
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("KEY BENEFITS & RETURN ON INVESTMENT", heading1_style))

benefits_data = [
    ["60% Wait Time Reduction", "Queue management + streamlined workflows"],
    ["40% Billing Efficiency", "Automated invoicing & claim submission"],
    ["70% Fewer Medical Errors", "Drug interaction checks, alerts"],
    ["90% Paper Elimination", "Fully digital records"],
    ["25% Revenue Increase", "Accurate billing, fewer rejections"],
    ["50% Staff Productivity Gain", "Automation of repetitive tasks"],
]

benefits_table = Table(benefits_data, colWidths=[2.5*inch, 4*inch])
benefits_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), HexColor("#f0f0f0")),
    ('TEXTCOLOR', (0, 0), (-1, -1), black),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 0), (-1, -1), [HexColor("#e8f4f8"), HexColor("#f0f9fb")]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))

story.append(benefits_table)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Cost Savings Analysis", heading2_style))

cost_data = [
    ["Metric", "Our System", "Enterprise", "Savings"],
    ["Setup Cost", "$5-13K", "$100-500K", "$95-487K"],
    ["Monthly Cost", "$200-300", "$5-10K+", "$4,700-9,800"],
    ["Annual Cost", "$2,400-3,600", "$60-120K+", "$56,400-116,400"],
    ["Year 1 Total", "$7-16K", "$160-600K+", "$153-593K"],
]

cost_table = Table(cost_data, colWidths=[1.3*inch, 1.3*inch, 1.5*inch, 1.4*inch])
cost_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_DARK_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f0")]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))

story.append(cost_table)

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# IMPLEMENTATION TIMELINE
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("IMPLEMENTATION TIMELINE: 12 WEEKS", heading1_style))

timeline_data = [
    ["Week", "Phase", "Deliverable"],
    ["1", "Architecture & Setup", "Design, database schema, API spec"],
    ["2-3", "Backend Development", "150+ endpoints, 80+ tables"],
    ["4-5", "Frontend Development", "70+ pages, responsive design"],
    ["6", "Testing & Integration", "E2E testing, security testing"],
    ["7", "Deployment", "Supabase, Koyeb, Vercel setup"],
    ["8", "Documentation", "API docs, user guides, training"],
    ["9-12", "Refinement & Go-Live", "User feedback, training, launch"],
]

timeline_table = Table(timeline_data, colWidths=[0.8*inch, 1.8*inch, 3.2*inch])
timeline_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_MEDICAL_GREEN),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f5f5f5")]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))

story.append(timeline_table)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("🎯 Result: PRODUCTION-READY EMR SYSTEM LIVE", normal_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# PRICING
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("PRICING & COST STRUCTURE", heading1_style))

story.append(Paragraph("One-Time Development Cost", heading2_style))

onetime_data = [
    ["Service", "Cost"],
    ["Complete System Development", "$5,000 - $10,000"],
    ["Data Migration (if applicable)", "$1,000 - $3,000"],
    ["Staff Training & Support", "Included"],
    ["TOTAL DEVELOPMENT", "$5,000 - $13,000"],
]

onetime_table = Table(onetime_data, colWidths=[3.5*inch, 2.5*inch])
onetime_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_DARK_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f0")]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))

story.append(onetime_table)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Monthly Operating Costs", heading2_style))

monthly_data = [
    ["Service", "Cost"],
    ["Supabase Database", "$25 - $250"],
    ["Koyeb Backend", "$20 - $200"],
    ["Vercel Frontend (CDN)", "$20 - $100"],
    ["Email & SMS Services", "$10 - $50"],
    ["Domain & SSL", "$10 - $20"],
    ["TOTAL MONTHLY (Small Hospital)", "$200 - $300"],
]

monthly_table = Table(monthly_data, colWidths=[3.5*inch, 2.5*inch])
monthly_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f0")]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))

story.append(monthly_table)

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# SECURITY & COMPLIANCE
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("SECURITY & COMPLIANCE", heading1_style))

story.append(Paragraph("Data Protection", heading2_style))

security_features = [
    "🔐 AES-256 Encryption (data at rest)",
    "🔑 TLS 1.3 Encryption (data in transit)",
    "✓ Multi-factor Authentication (MFA)",
    "✓ Role-Based Access Control (RBAC)",
    "✓ Row-Level Security (RLS) database policies",
    "📋 Complete audit logging (all actions tracked)",
    "💾 Daily automated backups (30-day retention)",
]

for feature in security_features:
    story.append(Paragraph(feature, bullet_style))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Regulatory Compliance", heading2_style))

compliance = [
    "• HIPAA Design Compliance",
    "• GDPR Support (data export, right to be forgotten)",
    "• Healthcare Data Security Standards",
    "• Session timeout & auto-logout (30 minutes)",
    "• Encrypted password storage (bcrypt)",
    "• SSL/TLS certificates (auto-renewal)",
    "• 24/7 security monitoring & alerts",
]

for item in compliance:
    story.append(Paragraph(item, bullet_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# SUPPORT & TRAINING
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("SUPPORT & TRAINING PROGRAM", heading1_style))

story.append(Paragraph("Training Materials Provided", heading2_style))

training = [
    "✓ 20+ video tutorials (step-by-step)",
    "✓ User guide (50+ pages, PDF)",
    "✓ Administrator guide (configuration)",
    "✓ Troubleshooting guide (common issues)",
    "✓ Quick reference cards (laminated)",
    "✓ Role-specific training slides",
]

for item in training:
    story.append(Paragraph(item, bullet_style))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Support Services Included", heading2_style))

support = [
    "✓ 24/7 Support (go-live week)",
    "✓ Email support (ongoing)",
    "✓ Bug fixes (within 24 hours)",
    "✓ Automatic security updates",
    "✓ Monthly check-ins (first 3 months)",
    "✓ Performance optimization",
]

for item in support:
    story.append(Paragraph(item, bullet_style))

story.append(Spacer(1, 0.2*inch))
story.append(Paragraph("Service Level Agreement (SLA)", heading2_style))

sla = [
    "99.9% Uptime Guarantee (max 43 min downtime/month)",
    "< 1 Hour Response Time (critical issues)",
    "< 24 Hour Resolution (bugs fixed and deployed)",
    "Daily Automatic Backups (zero data loss)",
    "Auto-Updates & Security (patches applied automatically)",
]

for item in sla:
    story.append(Paragraph(item, bullet_style))

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# COMPETITIVE COMPARISON
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("COMPETITIVE COMPARISON", heading1_style))

comparison = [
    ["Feature", "Our Solution", "Enterprise EMR", "Advantage"],
    ["Setup Cost", "$5-13K", "$100-500K", "Save $95-487K"],
    ["Monthly Cost", "$200-300", "$5-10K+", "Save $4,700-9,800"],
    ["Implementation", "12 weeks", "2+ years", "20 months faster"],
    ["All-in-One Modules", "YES", "Multiple vendors", "Cost savings"],
    ["Ease of Use", "Doctor-friendly", "IT-focused", "Less training"],
    ["No IT Team Needed", "YES", "NO", "Save $150-300K/year"],
    ["Data Ownership", "You own it", "Proprietary", "Full control"],
]

comp_table = Table(comparison, colWidths=[1.4*inch, 1.4*inch, 1.4*inch, 1.6*inch])
comp_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_DARK_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, HexColor("#f5f5f5")]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
]))

story.append(comp_table)

story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# NEXT STEPS
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph("NEXT STEPS: LET'S GET STARTED", heading1_style))

story.append(Paragraph(
    "Ready to transform your hospital with a modern, affordable EMR system? "
    "Here's how to get started:",
    normal_style
))

story.append(Spacer(1, 0.2*inch))

next_steps = [
    "Schedule a Discovery Meeting",
    "Confirm Project Scope",
    "Sign Agreement",
    "Development Begins (Week 1)",
    "Weekly Check-ins",
    "12 Weeks Later: Go Live",
    "Ongoing Support",
]

for i, step in enumerate(next_steps, 1):
    story.append(Paragraph(f"<b>{i}. {step}</b>", bullet_style))

story.append(Spacer(1, 0.3*inch))

contact_p = Paragraph(
    "<b style='font-size: 14'>Contact us to schedule your discovery meeting</b>",
    ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontSize=14,
        alignment=1,
        textColor=COLOR_DARK_BLUE,
        fontName='Helvetica-Bold'
    )
)

story.append(contact_p)
story.append(Spacer(1, 0.1*inch))

final_p = Paragraph(
    "<b style='font-size: 14'>Ready to go live in 12 weeks!</b>",
    ParagraphStyle(
        'Final',
        parent=styles['Normal'],
        fontSize=14,
        alignment=1,
        textColor=COLOR_MEDICAL_GREEN,
        fontName='Helvetica-Bold'
    )
)

story.append(final_p)

# Build PDF
doc.build(story)
print(f"✅ PDF saved: {output_path}")
print(f"Total pages: ~{len(story) // 10}")
