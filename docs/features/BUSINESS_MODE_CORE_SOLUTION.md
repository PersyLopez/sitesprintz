# Business Mode Core Solution - Solo vs. Team Operations

**Date**: August 15, 2026
**Status**: Implemented in working tree (uncommitted) — `BusinessModeService.js`, `business-mode.routes.js`, `BusinessModeConfig.jsx`, and the rewritten `BookingWidget.jsx` are all present. `AvailabilityScheduler.jsx` loads tenant staff (or `'default'`). Booking is gated to the **Growth** tier (see [../ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md](../ecommerce/ECOMMERCE_TIER_CONSOLIDATION.md)).

## Overview

This document describes the core solution that enables all SiteSprintz templates to flawlessly handle both **solo business** and **multi-person business** scenarios for scheduling appointments.

## The Problem

Different businesses have vastly different booking needs:

| Business Type | Scenario | Example |
|--------------|----------|---------|
| **Solo** | Single operator handles everything | Solo hairstylist, freelance consultant |
| **Team** | Customers choose their preferred provider | Salon with 5 stylists, gym with trainers |
| **Hybrid** | Team exists but auto-assigned | Cleaning service dispatch, tech support |

Previously, templates either showed staff selection always (confusing for solo operators) or never (limiting for teams). The new system adapts automatically.

## Solution Architecture

### 1. Database Schema Changes

Added to `booking_tenants`:
```sql
business_mode VARCHAR(20) DEFAULT 'solo'    -- 'solo', 'team', 'hybrid'
staff_selection_enabled BOOLEAN DEFAULT false
allow_no_preference BOOLEAN DEFAULT true
no_preference_text VARCHAR(100) DEFAULT 'Any Available'
```

New `service_staff` junction table:
```sql
CREATE TABLE service_staff (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES booking_services(id),
  staff_id UUID REFERENCES booking_staff(id),
  tenant_id UUID REFERENCES booking_tenants(id),
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(service_id, staff_id)
);
```

### 2. Business Modes

| Mode | Staff Selection | "No Preference" | Use Case |
|------|-----------------|-----------------|----------|
| **Solo** | Hidden | N/A | Single operator, no choice needed |
| **Team** | Shown | Optional | Customers pick their preferred provider |
| **Hybrid** | Hidden/Optional | Default | Auto-assignment, "any available" first |

### 3. Core Service: `BusinessModeService.js`

Located at: `/server/services/booking/BusinessModeService.js`

Key methods:
- `getBusinessModeConfig(tenantId)` - Get current configuration
- `updateBusinessModeConfig(tenantId, config)` - Update settings
- `getStaffForService(tenantId, serviceId)` - Get staff who can perform a service
- `resolveStaffForBooking(...)` - Resolve "no_preference" to actual staff
- `getNextAvailableStaff(...)` - Smart load-balanced staff assignment
- `suggestBusinessMode(tenantId)` - Auto-suggest optimal mode

### 4. API Endpoints

Base path: `/api/business-mode`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:tenantId/config` | Get business mode configuration |
| PUT | `/:tenantId/config` | Update configuration |
| GET | `/:tenantId/suggest` | Get suggested mode based on setup |
| POST | `/:tenantId/migrate-to-team` | Migrate from solo to team mode |
| GET | `/:tenantId/services/:serviceId/staff` | Get staff for a service |
| PUT | `/:tenantId/services/:serviceId/staff` | Assign staff to service |
| POST | `/:tenantId/resolve-staff` | Resolve "no_preference" selection |

### 5. Frontend Components

#### `BusinessModeConfig.jsx`
Admin dashboard component for configuring business mode:
- Visual mode selection (Solo/Team/Hybrid cards)
- Toggle staff selection on/off
- Configure "No Preference" option
- Customize the "Any Available" label
- Shows intelligent recommendations

#### `BookingWidget.jsx` (Updated)
Customer-facing booking widget:
- Auto-detects business mode
- Shows/hides staff selection based on mode
- Displays "No Preference" option when enabled
- Resolves staff automatically for auto-assignments

## Flow Examples

### Solo Operator (e.g., Freelance Consultant)

```
Customer → Service Selection → Date/Time → Details → Confirmation
                (no staff step - auto-assigned)
```

### Team Mode (e.g., Salon with 5 Stylists)

```
Customer → Service → Staff Selection → Date/Time → Details → Confirmation
                          ↓
              [Any Stylist] 🎲  ← "No preference" option
              [Sarah] 👩
              [Alex] 👨
              [Maya] 👩
```

### Hybrid Mode (e.g., Cleaning Service)

```
Customer → Service → Date/Time → Details → Confirmation
                        ↓
         Staff auto-assigned based on:
         - Availability
         - Current workload (least busy)
         - Service qualifications
```

## Smart Features

### 1. Intelligent Load Balancing
When "No Preference" is selected, the system:
1. Gets all staff qualified for the service
2. Counts their appointments on the selected date
3. Assigns the least busy available staff
4. Respects service-specific primary staff

### 2. Auto-Detection
The system auto-suggests the optimal mode:
- 1 staff → Solo mode
- 2-3 staff → Team mode
- 4+ staff → Hybrid mode (unless service-specific assignments exist)

### 3. Service-Specific Assignments
Some services may only be offered by specific staff:
- "Extensions" → Only Sarah and Maya
- "Mens Haircut" → Alex and Jordan
- "Basic Cut" → All staff

### 4. Customizable Labels
Business owners can customize the "No Preference" text:
- "Any Available Stylist"
- "First Available"
- "No Preference - Assign Best Match"
- "Dealer's Choice" (creative!)

## Migration Guide

### For Existing Solo Businesses
No action needed. Default mode is "solo" and works automatically.

### For Businesses Adding Team
1. Add staff members in booking settings
2. Go to Business Mode settings
3. System suggests "Team" mode
4. Click "Migrate to Team Mode"
5. All services auto-assigned to all staff

### For Custom Staff Assignments
1. Set mode to "Team"
2. Go to each service
3. Use "Assign Staff" to select who can perform it
4. Mark primary staff if applicable

## Template-Specific Considerations

### Salon
- Default: Team mode with staff selection
- "No Preference" text: "Any Available Stylist"
- Staff display includes specialties

### Gym
- Personal Training: Team mode (select trainer)
- Group Classes: Solo mode (instructor assigned)
- Mixed approach supported

### Pet Care
- Default: Team mode for grooming
- "No Preference" text: "Any Groomer"
- Staff display includes certifications

### Home Services (Electrician, Plumbing, etc.)
- Default: Hybrid mode (dispatch)
- Staff selection optional
- Focus on "next available" for urgency

### Consultant/Freelancer
- Default: Solo mode
- Hidden staff selection
- Clean, simple booking flow

## Testing

Run the E2E tests:
```bash
npx playwright test tests/e2e/business-mode.spec.js
```

Run unit tests:
```bash
npm run test:unit -- --grep "BusinessMode"
```

## Files Created/Modified

### New Files
- `/server/services/booking/BusinessModeService.js`
- `/server/routes/business-mode.routes.js`
- `/src/components/booking/BusinessModeConfig.jsx`
- `/src/components/booking/BusinessModeConfig.css`
- `/prisma/migrations/add_business_mode/migration.sql`

### Modified Files
- `/prisma/schema.prisma` - Added business mode fields and service_staff table
- `/server.js` - Registered business-mode routes
- `/src/components/booking/BookingWidget.jsx` - Business mode support
- `/src/components/booking/BookingWidget.css` - New styles
- `/src/components/booking/StaffSelector.jsx` - Props for provided staff

## Summary

This core solution provides a unified approach to handling solo vs. team booking scenarios across all templates. The key benefits are:

1. **Zero Configuration for Solo** - Works out of the box
2. **Easy Migration to Team** - One-click setup
3. **Flexible for Complex Scenarios** - Service-specific staff, hybrid modes
4. **Better Customer Experience** - "No Preference" option reduces friction
5. **Smart Load Balancing** - Fair distribution of appointments
6. **Template Agnostic** - Same system works for salon, gym, consultant, etc.

The implementation follows SiteSprintz's existing patterns and integrates seamlessly with the booking infrastructure, Stripe payments, and template system.

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Feature status | [QUICK_REFERENCE_STATUS.md](./QUICK_REFERENCE_STATUS.md) |
| Booking assessment | [BOOKING-SYSTEM-ASSESSMENT.md](./BOOKING-SYSTEM-ASSESSMENT.md) |
| Phase 2 niche research | [../development/TEMPLATE_NICHE_ANALYSIS.md](../development/TEMPLATE_NICHE_ANALYSIS.md) |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

