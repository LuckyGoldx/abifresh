# EXACT DEVELOPMENT PROMPT FOR SMALL HOSPITAL EMR SYSTEM

**Copy this entire prompt when you're ready to request the complete EMR system development.**

---

## REQUEST

I want you to develop a **complete, production-ready Small Hospital Electronic Medical Records (EMR) System** for a 50-200 bed private hospital. I will provide you with the exact specifications below. Please build this as a fully integrated, cloud-based platform ready for deployment.

**Hospital Name/Location:** [INSERT YOUR HOSPITAL NAME HERE]

---

## SYSTEM OVERVIEW

This is a **complete, integrated healthcare management platform** that brings all hospital departments onto a single digital system. It replaces paper records, manual processes, and disconnected spreadsheets with an intelligent, secure, and easy-to-use web application.

---

## TECHNOLOGY STACK

### Frontend
- **Framework:** Next.js 14 with React + TypeScript  
- **UI Library:** Tailwind CSS + Shadcn UI components  
- **Design:** Beautiful, responsive pages (desktop, tablet, mobile)  
- **Features:** Real-time updates, PDF/CSV export, WebSocket connections  
- **Deployment:** Vercel (global CDN, automatic deployments)

### Backend
- **Runtime:** Node.js with NestJS framework  
- **Language:** TypeScript  
- **Architecture:** RESTful API (GraphQL-ready)  
- **Features:** Real-time WebSocket server, rate limiting, request validation  
- **Deployment:** Koyeb (serverless, auto-scaling 1-5 instances)

### Database
- **Database:** PostgreSQL 16 (via Supabase)  
- **Authentication:** Supabase Auth with email/password  
- **Features:** Row-Level Security (RLS), real-time subscriptions, automated backups  
- **Deployment:** Supabase cloud (managed PostgreSQL)

### Infrastructure
- **No DevOps Required:** All infrastructure managed by Vercel, Koyeb, and Supabase  
- **Uptime SLA:** 99.9% guaranteed  
- **Scaling:** Automatic (handles traffic spikes)  
- **Cost:** $200-300/month typical operation  

---

## COMPLETE FEATURE SET: 12 INTEGRATED MODULES

### 1. PATIENT MANAGEMENT
- New patient registration with complete demographics
- Unique patient ID (UHID) automatic generation
- Complete medical history tracking by patient
- Allergy management with clinical alerts
- Document upload (ID cards, insurance, referrals)
- Patient search (name, ID, phone number)
- Patient categorization (VIP, regular, insurance, corporate)
- Emergency contact management
- Patient profile with photo
- Medical history timeline

### 2. ELECTRONIC MEDICAL RECORDS (EMR)
- SOAP consultation notes (Subjective, Objective, Assessment, Plan)
- Diagnosis recording with ICD-10 coding
- E-prescribing with real-time drug interaction checking
- Vital signs recording (BP, temp, pulse, SpO2, weight, height)
- Auto-calculations (BMI, dosing, etc.)
- Lab order creation & tracking
- Imaging/X-ray order creation
- Specialty-specific EMR templates (Cardiology, Orthopedics, Pediatrics, etc.)
- Allergy & clinical alert system (popup alerts)
- Complete chronological medical timeline (all encounters)
- Previous prescription history display
- Drug interaction database with severity levels

### 3. APPOINTMENTS & SCHEDULING
- Online appointment booking (24/7 self-service)
- Walk-in queue management with real-time waiting times
- Doctor availability management & scheduling
- Automated appointment reminders (SMS + Email)
- Recurring appointment support (dialysis, physiotherapy, follow-ups)
- Telemedicine slot booking
- Queue status live display (for waiting room monitors)
- Appointment rescheduling & cancellation
- No-show tracking & management
- Appointment history per patient

### 4. OUT-PATIENT DEPARTMENT (OPD)
- Patient check-in interface (tablet/computer at reception)
- Queue management with visual queue display
- Doctor consultation workflow
- Prescription issuing directly from EMR
- Lab & imaging referral generation
- Specialist referral management
- Follow-up appointment scheduling during visit
- OPD performance reports & analytics
- Wait time tracking & optimization
- OPD billing automation

### 5. PHARMACY MANAGEMENT
- Automatic e-prescription receipt from EMR (real-time)
- Medication dispensing interface
- Real-time drug interaction checking
- Inventory management (stock levels, reorder alerts)
- Barcode-based medication tracking
- Retail OTC medication sales
- Purchase order tracking & management
- Drug expiry date alerts
- Pharmacy workflow metrics & KPIs
- Return medication tracking
- Batch & lot management

### 6. LABORATORY (LIS - Lab Information System)
- Digital laboratory order receipt from EMR
- Sample collection tracking with barcodes
- Sample labeling & barcode generation
- Result entry interface (manual & instrument-ready)
- Auto-validation rules (normal range checking)
- Critical value alerts (automatic SMS/email notification)
- Turnaround time (TAT) monitoring & reporting
- Test history & patient lab report generation
- Quality control (QC) data tracking
- Lab performance metrics
- Result distribution (to doctor, patient, insurance)

### 7. IN-PATIENT / WARDS MANAGEMENT
- Admission workflow & documentation
- Bed management with visual bed occupancy map
- Bed transfer & allocation
- Ward dashboard (patient list, status, alerts)
- Patient transfer tracking between wards
- Discharge planning & documentation
- Daily census reports
- Length of stay (LOS) monitoring
- Ward-specific notes & updates
- In-patient billing automation

### 8. NURSING STATION
- Patient worklist (assigned patients display)
- Vital signs charting & trend monitoring
- Care plan creation & management
- Medication administration tracking (eMAR - electronic Medication Administration Record)
- Intake & output tracking (fluids, etc.)
- Patient alerts & task management
- Shift handover documented notes
- Real-time synchronization with doctors
- Nursing notes & observations
- Patient call bell integration (ready)

### 9. BILLING & FINANCIAL MANAGEMENT
- Automatic billing from consultation notes, pharmacy, lab
- Invoice generation & printing
- Multiple payment method support (cash, card, mobile wallet, UPI, etc.)
- Insurance claim submission (basic integration)
- Revenue tracking by department
- Outstanding payment alerts & follow-up
- Payment receipts (auto-emailed to patient)
- Refund management
- Financial reporting & analysis
- Tax reports & invoicing
- Insurance provider management
- In-patient billing with itemization

### 10. ADMIN DASHBOARD
- Real-time KPI dashboards (revenue, patients, beds, etc.)
- Revenue monitoring & trending
- Patient statistics & demographics
- Department performance metrics
- Staff productivity tracking
- System health monitoring
- Customizable dashboard widgets
- Automated record export (CSV, PDF)
- Hospital-wide analytics
- Reports scheduling & delivery
- User activity monitoring

### 11. USER MANAGEMENT & RBAC (Role-Based Access Control)
- 7 predefined roles: Doctor, Nurse, Pharmacist, Lab Tech, Receptionist, Accountant, Admin
- Role-based access control (RBAC) - each role sees only relevant features
- Granular permission management (module level, function level)
- User creation, editing, activation/deactivation
- Active user session monitoring
- Password policies & security requirements
- Multi-factor authentication (MFA) support
- Session timeout & auto-logout (30 minutes inactivity)
- User activity audit trail
- Department/unit assignment

### 12. SECURITY & AUDIT TRAIL
- Complete audit logging (every action tracked: who did what, when, from where)
- Access tracking (user login/logout, data access)
- Data encryption (AES-256 at rest, TLS 1.3 in transit)
- Automated daily backups with 30-day retention
- Point-in-time recovery (PITR) capability
- Disaster recovery procedures & testing
- HIPAA-compliant architecture & controls
- GDPR data portability & right to be forgotten
- Compliance reporting & audit exports
- Password encryption (bcrypt)
- SSL/TLS certificates (auto-renewal)
- IP whitelisting support
- Session management & security policies

---

## KEY REQUIREMENTS

### Pages & User Interface
- **Total Pages:** 70+ responsive pages
- **Design:** Beautiful, modern, healthcare-focused
- **Mobile:** Fully responsive (works on desktop, tablet, mobile)
- **Performance:** Fast loading (< 2 seconds typical)
- **Accessibility:** WCAG 2.1 AA compliance

### API Specifications
- **Total Endpoints:** 150+ REST API endpoints
- **Documentation:** Complete Swagger/OpenAPI documentation
- **Rate Limiting:** Protection against abuse
- **Error Handling:** Standardized error responses
- **WebSocket Support:** Real-time updates for notifications, alerts
- **GraphQL Ready:** Architecture supports future GraphQL addition

### Database
- **Total Tables:** 80+ optimized PostgreSQL tables
- **Schema:** Normalized design with proper relationships
- **Indexing:** Strategic indexes for performance
- **Triggers:** Audit logging, data validation
- **RLS Policies:** Row-Level Security for multi-tenancy ready
- **Storage:** Encrypted sensitive data (AES-256)

### Performance Targets
- **Page Load:** < 2 seconds (initial load)
- **API Response:** < 500ms (typical)
- **Database Queries:** Optimized with proper indexes
- **Concurrent Users:** Support 50-100 simultaneous users comfortably
- **Data Export:** CSV/PDF generation in < 10 seconds

---

## CORE WORKFLOWS (CRITICAL - MUST IMPLEMENT)

### 1. Patient Journey Workflow
Patient arrives → Registration → Check-in (queue) → Doctor consultation → Vital signs recording → Diagnosis & orders → Pharmacy (e-prescription) → Lab (if needed) → Billing → Payment → Follow-up scheduling

### 2. Doctor Consultation Workflow
Doctor logs in → Views patient list/queue → Selects patient → Reviews medical history → Creates consultation note (SOAP format) → Records vitals → Adds diagnosis → Prescribes medication → Orders tests → System auto-checks interactions & allergies → Saves note → Charges automatically generated

### 3. Pharmacy Workflow
e-Prescription arrives → Pharmacist reviews → System checks interactions → System checks allergies → Prepare medication → Barcode scan for verification → Patient counseling → Payment → Inventory updated → Receipt emailed

### 4. Lab Workflow
Doctor orders lab test → Lab receives order → Barcode generated → Sample collected/labeled → Sample processed → Results entered → Auto-validation → Critical alerts if needed → Results sent to doctor & patient → Doctor notified

### 5. In-Patient Workflow
Patient admitted → Bed allocated → Admission notes created → Doctor orders → Nursing care plan → Vital signs charting → Medication administration → Progress notes → Discharge planning → Billing generated

---

## SECURITY & COMPLIANCE REQUIREMENTS

### Encryption & Data Protection
- **Data at Rest:** AES-256 encryption for sensitive fields
- **Data in Transit:** TLS 1.3 for all communications
- **Password Storage:** bcrypt with salt
- **API Keys:** Secure key management (environment variables)

### HIPAA Compliance
- Patient privacy controls enforced
- Breach notification ready
- Audit logging for compliance reporting
- Access controls (RBAC)
- Data minimization principles
- Secure communication (TLS 1.3)

### GDPR Support
- Data export functionality (right to data portability)
- Right to be forgotten (data deletion)
- Consent management
- Privacy policy compliance
- User contract requirements

### Access Control
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Row-level security (RLS) at database
- Session management (30-min timeout)
- IP-based access controls (optional)
- Active user monitoring

### Audit & Compliance
- Complete audit logging (all actions)
- 1-year audit log retention minimum
- Compliance reporting tools
- Regular security updates
- 24/7 monitoring & alerts
- Incident response procedures

---

## BUSINESS REQUIREMENTS

### Support & Training
- **Training Materials:**
  - 20+ video tutorials (step-by-step)
  - User guide (50+ pages, PDF)
  - Administrator guide (setup & configuration)
  - Troubleshooting guide (common issues)
  - Role-specific training slides
  - Quick reference cards (laminated)

- **Support Services:**
  - 24/7 support during go-live week
  - Email support (ongoing)
  - Bug fixes within 24 hours (critical)
  - Automatic security updates
  - Monthly check-ins (first 3 months)
  - Feature request roadmap

### Service Level Agreement (SLA)
- **Uptime:** 99.9% guaranteed (max 43 minutes downtime/month)
- **Response Time:** < 1 hour for critical issues
- **Resolution Time:** < 24 hours for bugs
- **Backups:** Daily automatic backups (30-day retention)
- **Updates:** Automatic security patches

### Implementation Timeline
- **Week 1:** Architecture & setup (database schema, API spec, project init)
- **Weeks 2-3:** Backend development (150+ endpoints, business logic)
- **Weeks 4-5:** Frontend development (70+ pages, real-time features)
- **Week 6:** Testing & integration (E2E, security, load testing)
- **Week 7:** Deployment (Supabase, Koyeb, Vercel setup)
- **Week 8:** Documentation (API docs, user guides)
- **Weeks 9-12:** Refinement, staff training, go-live

**Total: 12 weeks from start to production-ready system**

### Cost Structure
- **One-Time Development:** $5,000 - $13,000
  - $5,000 - $10,000 for complete development
  - +$1,000 - $3,000 for data migration (if needed)
  
- **Monthly Operating Costs:** $200 - $300 (typical small hospital)
  - Supabase: $25 - $250
  - Koyeb: $20 - $200
  - Vercel: $20 - $100
  - Email/SMS: $10 - $50
  - Domain/SSL: $10 - $20

- **Year 1 Total:** $7,400 - $16,600

---

## DEPLOYMENT TARGETS

### Production Deployment
- **Frontend:** Deploy to Vercel (automatic from GitHub)
- **Backend:** Deploy to Koyeb (auto-scaling, serverless)
- **Database:** Host on Supabase (managed PostgreSQL)
- **Email:** SendGrid or similar
- **SMS:** Twilio or similar service
- **File Storage:** Supabase Storage (for documents)
- **Domain:** Custom domain with auto-renewal SSL

### Monitoring & Observability
- Application performance monitoring (APM)
- Error tracking & alerts
- Database monitoring & optimization
- Security monitoring & intrusion detection
- Uptime monitoring & status page
- Logs collection & analysis

### Backup & Recovery
- Daily automatic backups (30-day retention)
- Point-in-time recovery (PITR) capability
- Disaster recovery testing (monthly)
- Redundancy across availability zones
- Cross-region backup (optional)

---

## DELIVERABLES

Upon completion, you will provide:

1. **Complete Source Code**
   - Frontend (Next.js) repository
   - Backend (Node.js) repository
   - Database schema & migrations
   - All code documented & organized

2. **Complete Documentation**
   - API documentation (Swagger/OpenAPI)
   - System architecture diagrams
   - Database schema documentation
   - Deployment runbook
   - Troubleshooting guide
   - User manuals for each role
   - Administrator setup guide

3. **Training Materials**
   - 20+ video tutorials (recorded)
   - Role-specific training slides
   - Quick reference cards
   - FAQ document

4. **Production System**
   - Live, working EMR system
   - All 12 modules integrated
   - Database seeded with sample data
   - Custom domain configured
   - SSL certificates installed
   - Monitoring & alerts configured
   - Backup procedures active

5. **Support & Handoff**
   - 24/7 support during go-live week
   - On-call during first month
   - Staff training & certification
   - Knowledge transfer sessions

---

## GO-LIVE REQUIREMENTS

Your system will be ready when:

1. ✅ All 12 modules are fully functional and tested
2. ✅ All 70+ pages are responsive and beautiful
3. ✅ All 150+ API endpoints are documented & working
4. ✅ Database with 80+ tables is optimized & secure
5. ✅ HIPAA & GDPR compliance controls are in place
6. ✅ All security measures are implemented (encryption, audit logging, etc.)
7. ✅ Automated daily backups are running
8. ✅ Monitoring & alerts are active
9. ✅ Complete documentation is provided
10. ✅ Staff training is complete & staff certified
11. ✅ Go-live procedures defined & tested
12. ✅ 24/7 support team is ready for launch week

---

## SUCCESS CRITERIA

The system is successful when:

- ✓ All hospital departments are using the EMR daily
- ✓ Paper records are eliminated (90% reduction)
- ✓ Patient wait times reduced by 60%
- ✓ Billing efficiency improved 40%
- ✓ Medical errors reduced 70% (via drug interaction checks, alerts)
- ✓ Staff happy with ease of use
- ✓ System is available 99.9% of the time
- ✓ No significant issues during go-live
- ✓ Hospital staff trained & independent after month 1
- ✓ System scales as hospital grows

---

## ADDITIONAL SPECIFICATIONS

### Email Integration
- SendGrid or Mailgun integration
- Transactional emails (confirmations, notifications)
- HTML email templates
- Scheduled reports delivery
- Automated patient notifications

### SMS Integration
- Twilio or similar integration
- Appointment reminders
- Critical alerts (lab results, etc.)
- OTP for authentication
- Configurable notification types

### File Management
- Document upload (ID cards, insurance, scans)
- Encrypted file storage
- File versioning
- Access control on documents
- Export to PDF functionality

### Reporting & Analytics
- 50+ pre-built report templates
- Custom report builder (admin)
- Scheduled reports
- Email delivery of reports
- CSV/PDF export
- Real-time dashboards with charts

### Integration Ready
- HL7/FHIR compatibility (future integration)
- API for third-party integrations
- Webhook support
- Data import/export (CSV)
- Legacy system data migration

---

## FINAL NOTES

**Timeline:** 12 weeks from start to live production system

**Cost:** $5,000 - $13,000 setup + $200-300/month operation

**Stack:** Supabase (database) + Koyeb (backend) + Vercel (frontend) = No IT team required

**Support:** Included during development and go-live (24/7 launch week, then email support ongoing)

**Ownership:** You own the code and data - no vendor lock-in

When you're ready to proceed, provide your hospital name and any specific customizations needed, and I'll begin development immediately.

---

**Status:** Ready for development  
**Estimated Start:** Upon confirmation  
**Estimated Go-Live:** 12 weeks after start date

---
