# Booking System Assessment

**Date**: August 15, 2026
**Status**: Phase 1 shipped · Phase 2 in working tree (uncommitted)
**Source of truth**: `server/routes/booking.routes.js`, `server/services/booking/`, `src/components/booking/`

---

## Summary

The booking system is no longer the "~95% complete, multi-staff is Phase 2" system described in the December 2025 / June 2026 version of this doc. Phase 2 — reminders, cancellations, multi-staff / business modes, recurring appointments, buffer time, and booking fees — is implemented in the working tree but **uncommitted**. `AvailabilityScheduler.jsx` loads the tenant staff list and uses the first staff id, falling back to `'default'` which the API aliases via `getOrCreateDefaultStaff`.

---

## What is implemented

### Phase 1 (committed)
- REST API — `server/routes/booking.routes.js` (tenants, services, staff, appointments, availability, notifications).
- Core services — `server/services/bookingService.js`, `AppointmentService.js`, `AvailabilityService.js`, `ServiceManagementService.js`, `StaffManagementService.js`, `TenantService.js`.
- Email notifications on booking (`server/services/bookingNotificationService.js`).
- Admin dashboard — `BookingDashboard.jsx`, `ServiceManager.jsx`, `AppointmentList.jsx`, `AvailabilityScheduler.jsx`.
- Public widget — `BookingWidget.jsx`, `BookingPage.jsx`.
- Tier gating — booking is Growth-only via `hasFeature(plan, FEATURES.EMBEDDED_BOOKING)`.

### Phase 2 (working tree, KEEP — untracked/modified)
| Capability | Service | Route | UI |
|------------|---------|-------|----|
| Reminders (24h / custom lead) | `services/booking/ReminderScheduler.js` | — | `ReminderSettings.jsx` |
| Reminder cron (every 15 min) | `jobs/booking-reminders.js` → `startReminderJob()` | started in `server.js` | — |
| Cancellation flow | `services/booking/AppointmentCancellationService.js` | `booking-phase2.routes.js` | `RefundModal.jsx` |
| Multi-staff / business modes (solo/team/hybrid) | `services/booking/BusinessModeService.js` | `business-mode.routes.js` | `BusinessModeConfig.jsx`, `StaffSelector.jsx`, `StaffCard.jsx` |
| Availability v2 (buffer-aware) | `services/booking/AvailabilityServiceV2.js` | `booking-phase2.routes.js` | `AvailabilityScheduler.jsx` |
| Buffer time between appointments | `services/booking/BufferTimeService.js` | `booking-phase2.routes.js` | `BufferTimeSettings.jsx` |
| Recurring appointments | `services/booking/RecurringAppointmentService.js` | `booking-phase2.routes.js` | `RecurringSelector.jsx` |
| Booking fees / deposits | `services/booking/BookingFeeService.js` | `booking-fees.routes.js` | `FeeConfiguration.jsx`, `PaymentStatusBadge.jsx` |
| Customer staff-pick logic | `src/utils/bookingStaffFlow.js` | — | consumed by `BookingWidget.jsx` |

`BookingWidget.jsx` was rewritten to auto-detect business mode, show a "No Preference" option when enabled, respect service-specific staff assignments, and intelligently load-balance "Any Available" picks.

---

## AvailabilityScheduler staff id

`AvailabilityScheduler.jsx` fetches `/api/booking/tenants/:userId/staff` and uses the first staff id, or `'default'`. The booking API aliases `'default'` / `'default-staff-id'` through `getOrCreateDefaultStaff`. The hardcoded placeholder is gone.

---

## Feature completeness

| Feature | Status | Notes |
|---------|--------|-------|
| Service management | ✅ | Full CRUD, pricing |
| Availability scheduling | Working | Tenant staff id, with `'default'` alias |
| Appointment booking (customer + admin) | ✅ | |
| Appointment management (view / filter / cancel) | ✅ | Cancellation service + RefundModal |
| Email notifications (booking) | ✅ | |
| Reminders | ✅ (working tree) | Cron started from `server.js` line 23 |
| Multi-staff / business modes | ✅ (working tree) | solo / team / hybrid |
| Recurring appointments | ✅ (working tree) | |
| Buffer time | ✅ (working tree) | |
| Booking fees / deposits | ✅ (working tree) | |
| Tier gating | ✅ | Growth-only via `planFeatures.js` |

---

## Recommendation

1. **Commit the Phase 2 working tree** — the services, routes, and components listed above are substantive and should not be lost.
2. Add E2E coverage for: reminder cron trigger, cancellation → refund, hybrid auto-assignment, recurring series, buffer-time gap enforcement.
3. Replace `console.log` in `server/jobs/booking-reminders.js` with the project logger (P2).

---

## Related documentation

| Topic | Doc |
|-------|-----|
| E-commerce tier consolidation | [../ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md](../ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md) |
| Business modes | [BUSINESS_MODE_CORE_SOLUTION.md](BUSINESS_MODE_CORE_SOLUTION.md) |
| Feature status | [QUICK_REFERENCE_STATUS.md](QUICK_REFERENCE_STATUS.md) |

**Maintaining docs**: Update this file and `QUICK_REFERENCE_STATUS.md` — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)
