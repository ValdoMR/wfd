# Renewal Risk Detection System

Full-stack solution for identifying residents at risk of non-renewal and automating intervention via webhook integration with RMS (Revenue Management System).

## Project Structure

- **backend/**: Node.js, Express, TypeORM, PostgreSQL. Handles risk calculation, job management, and webhook delivery with retries/DLQ.
- **frontend/**: Vite + React + TypeScript + TailwindCSS. Dashboard for viewing risk scores and triggering renewal events.
- **docker-compose.yml**: Orchestrates the DB, Backend, Frontend, and Mock RMS services.

## Setup & Running

1. **Prerequisites**: Docker & Docker Compose.
2. **Start the stack**:
   ```bash
   docker-compose up --build
   ```
   This will start:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000
   - **Database**: Port 5432
   - **Mock RMS**: Port 3001 (internal)

## Seeding Sample Data

The database is automatically seeded on the first run via `backend/scripts/seed.sql` mounted in docker-compose.
The seed data includes:

- **Property**: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` (Sunset Apartments)
- **Residents**: 4 sample residents with varying risk factors (High, Medium, Low).

If you need to reset/re-seed:

```bash
docker-compose down -v
docker-compose up --build
```

## Testing the Renewal Risk API

The risk calculation is asynchronous.

1. **Trigger Calculation**:

   ````bash
   ```bash
   curl -X POST http://localhost:3000/api/v1/properties/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/renewal-risk/calculate \
     -H "Content-Type: application/json" \
     -d '{"asOfDate": "2025-01-02"}'
   ````

   _Response:_ `{"jobId": "..."}`

2. **Check Job Status**:
   ```bash
   curl http://localhost:3000/api/v1/jobs/<jobId>
   ```

Alternatively, use the **Frontend Dashboard**:

1. Go to http://localhost:5173
2. Click **"Calculate New Risk Scores"**.
3. View the resident list updates.

## Testing Webhook Delivery

1. **Trigger an Event** via Frontend:
   - **Navigate to**: `http://localhost:5173/properties/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/renewal-risk`
   - Table loads with seeded residents row.

2. **Verify Delivery**:
   - Check the `server` logs in Docker. You should see:
     `[WebhookService] Successfully delivered event ...`
   - Check the `rms-mock` logs in Docker. You should see:
     `[<Timestamp>] ✅ ACCEPTED event: ...`

3. **Simulate Failures & Retries**:
   - Edit `docker-compose.yml`: set `FAIL_RATE: 0.5` under `rms-mock`.
   - Restart: `docker-compose up -d`
   - Trigger events again. You will see logs for `Attempt 1 failed`, `Retrying in 1000ms`, etc.

4. **Testing DLQ (Dead Letter Queue)**:
   - Set `FAIL_RATE: 1` in `docker-compose.yml` to force 100% webhook failures.
   - Restart: `docker-compose up --build`
   - Trigger a renewal event from the frontend.
   - Wait for the retry cron to exhaust all 5 attempts (exponential backoff: 1s, 2s, 4s, 8s, 16s).
   - Verify the delivery landed in the DLQ:

     ```bash
     # Check delivery status (should show status='dlq', attempt_count=5)
     docker-compose exec db psql -U postgres -d renewal_risk -c \
       "SELECT event_id, status, attempt_count, last_attempt_at FROM webhook_delivery_state ORDER BY last_attempt_at DESC;"

     # Check DLQ entries (should show the reason for failure)
     docker-compose exec db psql -U postgres -d renewal_risk -c \
       "SELECT id, webhook_delivery_state_id, reason, created_at FROM webhook_dead_letter_queue ORDER BY created_at DESC;"
     ```

## Design Decisions & Tradeoffs

- **Architecture**: Monorepo with Docker Compose for simplicity in checking out and running the assessment.
- **Async Calculation**: Risk calculation is offloaded to a background process (persisted in DB) to handle large datasets (5000+ residents) without blocking the HTTP response.
- **Batch Processing**: Database queries are batched (using `IN` clauses and maps) to avoid N+1 issues and ensure performance scales with resident count.
- **Webhook Reliability**:
  - **Pessimistic Locking**: typeORM `pessimistic_write_or_fail` is used to prevent concurrent workers from processing the same retry.
  - **Exponential Backoff**: Implemented standard backing off strategy (1s, 2s, 4s...) for resilience against temporary RMS outages.
  - **Dead Letter Queue (DLQ)**: Failed events after max retries are moved to a DLQ table for manual inspection, preserving data integrity.
- **Frontend**: Kept minimal with vanilla TailwindCSS (via v4) and React. Focused on usability and clarity of risk factors over complex UI interactions.
- **Focus vs Time**: Development was more focused on functionality than architecture and design due to time constraints. With more time, significant improvements could be made in both frontend (e.g., better component structure) and backend (e.g., better route/service structure) following a file organization pattern like feature-based.

## Agentic Development

This project was developed using **Google Antigravity**, an IDE with native support for AI agent-assisted development. The primary models utilized were **Claude Opus 4.5** and **Gemini 3 Pro**.

Given the strict timeframe (2 hours), AI assistance was leveraged to accelerate the development process as I considered this was most likely a POC (Proof of Concept) and I wanted to deliver the best possible result as fast as possible. However, this was a collaborative effort:

- **Iterative Process**: Development proceeded in granular steps (e.g., "Implement database schema", "Create async job processor", "Build frontend dashboard").
- **Human Review**: Every iteration and code generation block was reviewed. Adjustments were requested and manual refinements were made to ensure correctness, readability, and adherence to requirements.
- **Optimization**: Specific focus was placed on performance improvements (e.g., batching queries, improving Docker build times) and discussing architectural tradeoffs (e.g., synchronous vs. asynchronous processing) with the AI agent.

## Honest Self-Reflection

I must be honest about the following: even with the help of AI, the development of this project took me more than 2 hours, it took me around 3:30 hours. However, without the help of AI, this entire setup could have easily taken me a full working day.
