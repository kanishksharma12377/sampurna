# Sampurna ERP Roadmap

## Phase 0 – Foundation (Week 0-1)
- Inline -> Modular code separation (DONE)
- Firebase project + basic Firestore structure (students)
- Anonymous auth + userId display
- Admissions form -> students collection
- Basic dashboard metrics (counts)

KPIs:
- Admission form submission success rate > 95%
- Time to create first student record < 1 min

## Phase 1 – Fees & Receipts (Week 2)
Features:
- Fee structure config (static JSON -> collection)
- Automatic invoice document on admission
- Manual mark-as-paid -> receipt generation
- Dashboard: pending vs paid fees ratio
- Export CSV of invoices
Security:
- Only role:accounts can alter invoices / mark paid

KPIs:
- Payment update latency < 3s
- Data entry duplication reduced (self-reported) 50%

## Phase 2 – Hostel Management (Week 3)
Features:
- hostelRooms collection (capacity, gender, block)
- Allocation request & approval
- Deallocate flow with audit
- Occupancy dashboard widget

KPIs:
- Allocation operation success > 98%
- Real-time occupancy accuracy = 100%

## Phase 3 – Examinations (Week 4)
Features:
- exams collection (schedule, course)
- Bulk marks import (CSV -> cloud function parse)
- marksheets computation + grade policy
- Publish / unpublish result toggle
- Student panel: result view

KPIs:
- Marks import success > 95%
- Result publish latency < 10s

## Phase 4 – Library (Week 5)
Features:
- Catalog ingestion (spreadsheet sync)
- Issue / return workflow
- Fines -> auto generate fee invoice
- Overdue notifications

KPIs:
- Issue transaction latency < 3s
- Overdue detection accuracy 100%

## Phase 5 – RBAC & Audit (Week 6)
Features:
- roles + roleAssignments collections
- Centralized permission matrix
- auditLog events for all writes
- Daily backup export job

KPIs:
- 0 unauthorized write attempts (enforced by rules)
- Backup success rate 100%

## Phase 6 – Dashboards & Reporting (Week 7)
Features:
- Aggregated metricsDaily updates via events
- Admin summary view (multi-module)
- CSV / JSON export pack

KPIs:
- Dashboard load time < 1.5s (warm)
- Export pack generation < 30s

## Phase 7 – Messaging & Notifications (Week 8)
Features:
- notificationQueue + delivery workers
- In-app toast + email (optional) adapter layer
- Role-targeted broadcast (exam published, fee due)

KPIs:
- Notification delivery latency p95 < 5s

## Phase 8 – Hardening & Optimization (Week 9)
Features:
- Rate limiting edge functions
- Index optimization
- Cold start reduction (keep-warm tasks)
- Penetration test remediation

KPIs:
- Error rate < 0.5%
- P95 critical action (<5s)

## Stretch (Future)
- Multi-campus tenancy
- Offline kiosk mode (PWA sync queue)
- Attendance + timetable
- Predictive analytics (dropout risk)

## Dependency Matrix (Simplified)
```
Admissions -> Fees -> Hostel -> Exams -> Library -> Dashboards -> Notifications
            RBAC & Audit underpin all modules
```

## Success Criteria (Macro)
- Reduce redundant manual entries by 70%
- Provide real-time snapshot (<10s lag) of key institutional metrics
- Achieve adoption across >80% operational staff within 2 weeks

---
End of Roadmap.
