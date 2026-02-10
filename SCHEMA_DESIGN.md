# Schema Design Decisions

## Overview

Three new tables were added to the existing ROP schema to support the renewal risk detection and webhook delivery features. Each table was designed with specific query patterns, ACID semantics, and multi-tenancy considerations in mind.

---

## renewal_risk_scores

Stores point-in-time risk assessments for each resident.

### Why a Separate Table?

Risk scores are **calculated values** that change over time. Instead of adding columns to the `residents` or `leases` tables, a separate table allows:

- **Historical tracking**: each calculation run creates new rows, preserving the full audit trail of how risk evolved.
- **Comparison over time**: property managers can see if a resident's risk increased or decreased between calculations.

### Key Columns

| Column                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `property_id`                 | Multi-tenant filtering. Every query starts with "show me risks for property X".                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `resident_id` + `lease_id`    | Links the score to a specific resident and their active lease at calculation time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `risk_score` (0–100)          | Normalized integer for easy comparison and sorting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `risk_tier` (high/medium/low) | Pre-computed tier stored alongside the score. Two reasons: (1) **Indexable for filtering** — the dashboard query "show only high-risk residents" becomes a simple `WHERE risk_tier = 'high'` instead of `WHERE risk_score >= 70`, which is more semantically clear and leverages the index directly. (2) **Threshold stability** — if the tier thresholds change in the future (e.g., "high" moves from ≥70 to ≥60), historical records retain the tier assigned at calculation time, preventing retroactive reclassification of past assessments. |
| `days_to_expiry`              | Denormalized for quick display without joining the leases table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `signals` (JSONB)             | Stores the individual signal values used in the calculation. JSONB was chosen over separate columns because the signal set may evolve over time (new signals added, weights adjusted) without requiring schema migrations.                                                                                                                                                                                                                                                                                                                         |
| `calculated_at`               | Distinguishes between different calculation runs. Used to fetch "latest scores" efficiently.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Indexes

| Index           | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `property_id`   | Filter by property (primary access pattern).                         |
| `resident_id`   | Look up risk history for a specific resident.                        |
| `risk_tier`     | Filter dashboard by tier (e.g., "show me only high-risk residents"). |
| `calculated_at` | Fetch the most recent calculation run efficiently.                   |

### Constraints

- **Unique**: `(resident_id, calculated_at)`
  - Ensures a resident has only one risk score per calculation timestamp.
  - Enables idempotent `UPSERT` operations for risk calculation jobs.

### Query Patterns Optimized For

1. "Get all high-risk residents for property X from the latest calculation" → uses `property_id` + `calculated_at` + `risk_tier` indexes.
2. "Get risk history for resident Y" → uses `resident_id` index.

---

## webhook_delivery_state

Tracks each webhook delivery attempt, including retry state and idempotency.

### Why This Design?

The requirements mandate **guaranteed delivery** with retries and idempotency. This table serves as a **persistent outbox**: every event is first written to the database, then delivered asynchronously. This pattern ensures no events are lost even if the server crashes mid-delivery.

### Key Columns

| Column              | Rationale                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `property_id`       | Links the event to a property. Enables filtering delivery history per property for auditing and debugging.                                                                 |
| `resident_id`       | Links the event to a specific resident. Combined with `property_id`, identifies who the renewal risk event is about.                                                       |
| `event_id` (UNIQUE) | **Idempotency key**. Composed of `propertyId-residentId-calculationTimestamp`. Prevents duplicate event creation. The UNIQUE constraint is enforced at the database level. |
| `event_type`        | Currently `renewal.risk_flagged`. Designed for future event types.                                                                                                         |
| `payload` (JSONB)   | The full webhook body, stored so retries send the exact same payload.                                                                                                      |
| `status`            | State machine: `pending` → `delivered` or `failed` → `dlq`.                                                                                                                |
| `attempt_count`     | Tracks how many delivery attempts have been made. Used to determine when to move to DLQ.                                                                                   |
| `last_attempt_at`   | Timestamp of the most recent delivery attempt. Useful for monitoring and debugging stale deliveries.                                                                       |
| `next_retry_at`     | Scheduled time for the next retry. The cron job polls this column. Exponential backoff is encoded here: `now + 2^(attempt-1) seconds`.                                     |
| `rms_response`      | Stores the last response from the RMS for debugging failed deliveries.                                                                                                     |

### Indexes

| Index               | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `event_id` (unique) | Fast idempotency check before creating a new event.                                      |
| `status`            | Find all pending/failed deliveries for the retry job.                                    |
| `next_retry_at`     | The cron job queries `WHERE status IN ('pending', 'failed') AND next_retry_at <= NOW()`. |
| `property_id`       | Filter delivery history by property for auditing.                                        |

### Concurrency Considerations

- The `event_id` UNIQUE constraint prevents duplicate events even if the API endpoint is called simultaneously.
- Each retry job iteration reads and updates one row at a time, avoiding lock contention.

---

## webhook_dead_letter_queue

Stores permanently failed webhook deliveries for manual review.

### Why a Separate Table?

Instead of just setting `status = 'dlq'` on the delivery state, a separate DLQ table provides:

- **Separation of concerns**: the DLQ is a log of failures with metadata (reason), distinct from the delivery tracking.
- **Simpler queries**: fetching all DLQ entries doesn't require filtering the delivery state table.
- **Auditability**: the `reason` column documents why the delivery was abandoned.

### Key Columns

| Column                      | Rationale                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `webhook_delivery_state_id` | References the original delivery attempt for full context.                                             |
| `reason`                    | Human-readable explanation (e.g., "Max retries (5) exceeded. Last response: 503 Service Unavailable"). |
| `created_at`                | When the delivery was moved to DLQ.                                                                    |

---

## Design Trade-offs

### JSONB for Signals vs. Separate Columns

**Chosen**: JSONB.

- **Pro**: Schema flexibility. Adding new risk signals (e.g., `maintenanceRequestCount`, `neighborComplaints`) requires zero migrations.
- **Con**: Cannot index individual signal fields. If you needed to query "all residents where paymentHistoryDelinquent = true", a GIN index on the JSONB column would be needed.
- **Decision**: Signals are only read after filtering by property/tier, so full-column indexing is unnecessary.

### Denormalized `days_to_expiry` vs. Computing from Lease

**Chosen**: Denormalized (stored on the risk score row).

- **Pro**: Avoids an extra JOIN to the leases table on every dashboard read.
- **Con**: The value is a snapshot from calculation time and may drift from the actual current days-to-expiry.
- **Decision**: Acceptable because the risk score itself is a point-in-time calculation. Recalculation updates both.

### Single DLQ Table vs. Inline Status

**Chosen**: Separate table with a reference to the delivery state.

- **Pro**: Clean separation. The delivery state tracks the lifecycle; the DLQ is the dead end.
- **Con**: Requires a JOIN to see DLQ entries with their full context.
- **Decision**: DLQ is a low-frequency access pattern (manual review only), so the extra JOIN is acceptable.
