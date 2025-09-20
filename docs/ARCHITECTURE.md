# Sampurna Lightweight ERP - Architecture

## 1. Vision
Provide a low-cost, modular, extensible ERP for public / semi-public colleges using commodity cloud services (Firebase, GSheets exports, serverless functions) to unify Admissions, Fees, Hostel, Examinations, Library, and Reporting without expensive proprietary licensing.

## 2. Core Principles
- Single Source of Truth: All structured student + operational data stored in canonical collections.
- Event Driven Updates: Fee payments, allocations, exam publishing trigger structured events.
- Progressive Enhancement: Basic CRUD works offline-ish; advanced analytics optional.
- Role-Based Access Control (RBAC): Explicit roles map to capability sets.
- Observability & Audit: Every state mutation logged with actor + timestamp.
- Data Portability: Export to CSV / JSON at any time.
- Security by Default: Principle of least privilege, client rules enforced + server-side validation.

## 3. High-Level Logical Modules
| Module | Purpose | Collections / Entities |
|--------|---------|------------------------|
| Identity & Roles | Map Firebase auth users to institution roles | users, roles, roleAssignments |
| Admissions | Intake pipeline + seat tracking | students, admissionForms, seatMatrix |
| Fees & Finance | Fees structure, invoices, receipts, payment audit | feeStructures, invoices, receipts, ledgerEntries |
| Hostel | Room inventory, allocation, occupancy | hostelRooms, hostelAllocations |
| Library (Planned) | Book catalog, issues, returns | libraryCatalog, libraryIssues |
| Examinations | Exam schedules, marks, grade sheets | exams, examPapers, marksheets, gradePolicies |
| Messaging / Notifications | System + role notifications | notifications, notificationQueue |
| Reporting & Dashboards | Aggregated metrics caches | metricsDaily, snapshots |
| Audit / Backups | Immutable change log + scheduled export | auditLog, backupJobs |

## 4. Data Model (Selected Entities)
```
students: {
  id, admissionId, fullName, fathersName, dob, course, email, phone,
  fees: { status, lastInvoiceId },
  hostel: { allocated, roomId },
  library: { activeIssues: number },
  exams: { lastPublishedResultId },
  createdAt, updatedAt
}
feeStructures: { id, course, term, amount, currency, active }
invoices: { id, studentId, amount, currency, status: 'pending'|'paid'|'failed', dueDate, paidAt, lineItems:[{label, amount}], audit:{createdBy, createdAt} }
receipts: { id, invoiceId, txnRef, method, amount, createdAt, generatedBy }
hostelRooms: { id, label, capacity, occupied, allocations:[studentId], gender, block }
hostelAllocations: { id, studentId, roomId, fromDate, toDate, status }
exams: { id, title, course, term, date, status }
marksheets: { id, examId, studentId, marks: { subjectCode: { score, max } }, total, percentage, grade }
notifications: { id, targetRole|userId, type, payload, read:boolean, createdAt }
```

## 5. RBAC Model
Roles: [superadmin, admin, accounts, admissions, hostel, exams, librarian, teacher, student, auditor]
Each role maps to capabilities (verbs): create:admission, update:invoice, allocate:hostelRoom, publish:exam, read:dashboard.global, etc.
Implementation Layers:
1. Firestore Security Rules: coarse constraints.
2. Server Functions: enforce business invariants.
3. Client Guard: hide UI for unauthorized actions.

## 6. Workflow Summaries
### Admissions → Student Record
1. Form submit -> provisional student doc
2. Validation (duplicate detection by name+dob+course)
3. Seat matrix decrement
4. Emit event: admission.accepted

### Fees
1. Generate invoice on admission accepted (rules-driven fee structure)
2. Payment captured (manual entry / payment gateway webhook)
3. Create receipt + ledger entry
4. Update student.fees.status
5. Update dashboard metrics cache

### Hostel Allocation
1. Request allocation (student or staff)
2. Capacity + eligibility validation
3. Create hostelAllocations entry; update hostelRooms.occupied & student.hostel
4. Event: hostel.allocated (triggers notification)

### Examinations Publishing
1. Exam created with schedule
2. Marks entry (bulk import CSV)
3. Validation + grade computation (gradePolicies)
4. Publish -> set marksheets visibility
5. Event: exam.result.published

### Library (Planned)
1. Scan book -> issue record
2. Enforce max activeIssues per student
3. Late return triggers notification and fine invoice

## 7. Event Bus (Lightweight)
Represented via `auditLog` + optional `notificationQueue`. Each event structure:
```
{ id, type, entityRef:{collection,id}, payload, actor, ts }
```
Consumers (cloud functions) derive aggregates or fire notifications.

## 8. Dashboards
Pre-aggregated documents (updated by events) minimize expensive client queries:
- metricsDaily: { date, totalStudents, feesPaidCount, hostelAllocated, invoicesPending, examsUpcoming, libraryActiveIssues }
- snapshots: Ad-hoc manual or scheduled institutional snapshots.

## 9. Backups
- Nightly export to Cloud Storage (JSON bundles per collection)
- Weekly zipped archive with retention policy
- Integrity hash + manifest

## 10. Security Considerations
- Enforce allow read only where role permits; writes via callable cloud functions.
- Validate monetary amounts server-side only.
- Rate limit admission form & invoice generation.
- Obfuscate internal IDs in public links.

## 11. Technology Mapping
| Concern | Selected Approach |
|---------|-------------------|
| Auth | Firebase Authentication (anonymous + email + SSO later) |
| Database | Firestore (hierarchical collections) |
| Functions | Cloud Functions / Genkit flows for events & AI enrichment |
| AI (Optional) | Gemini model for student assistant, GPT-5 flag for future LLM swap |
| Storage | Cloud Storage for documents/exports |
| Analytics | Derived collections & optional BigQuery export |
| UI | Tailwind + modular JS (optional migrate to React/Vue later) |

## 12. Extensibility Strategy
- Each module exports service layer; UI consumes services.
- Introduce `services/` folder, e.g. `services/students.js`, `services/fees.js`.
- LLM integration behind feature flag provider.

## 13. Migration Path
1. Start with admissions + fees minimal.
2. Add hostel tracking.
3. Add exam scheduling + marks.
4. Add library + notifications.
5. Implement RBAC & audits.
6. Optimize dashboards & exports.

## 14. Open Questions
- Payment gateway integration preference? (Razorpay / Stripe / Govt mandated)
- Offline kiosk mode needed?
- Multi-campus support early or later?

## 15. Non-Goals (Current Phase)
- Complex timetabling
- Full HR/payroll
- Advanced analytics ML predictions

---
End of Architecture Overview.
