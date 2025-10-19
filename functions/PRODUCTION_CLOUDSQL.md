Cloud SQL (Postgres) + Prisma — Dev → Production runbook

**Deployment Status**
- ✅ Dev Environment: Fully tested and operational
- ✅ Filtering Logic: All tests passed (12/12 matches)
- ✅ Age Field Migration: Applied successfully (20251018185901_add_age_field)
- ✅ Test Data: 28+ comprehensive test itineraries seeded
- 🟡 Production: Ready for deployment (follow steps below)

Purpose
-------
This file documents the exact steps we took for local dev (Auth Proxy + Prisma) and the recommended, repeatable steps for production deployment (Cloud Functions + Cloud SQL). Keep this with the repo so future deployments follow the same pattern.

Dev notes (what you already did)
--------------------------------
- Created Cloud SQL instance: `traval-dev` (Postgres 17)
- Created database `traval` and DB user `voyageruser`
- Downloaded Cloud SQL Auth Proxy binary into `functions/`
- Started the proxy locally:
  ./cloud_sql_proxy -instances=mundo1-dev:us-central1:traval-dev=tcp:5432
- Created `functions/.env` with:
  DATABASE_URL="postgresql://voyageruser:<PASSWORD>@127.0.0.1:5432/traval"
- Verified connectivity using `functions/scripts/testDbConnection.js` (which uses `pg` + `dotenv`)
- Installed Prisma and generated client in `functions/`:
  npm install prisma @prisma/client
  npx prisma generate
- Ran migration locally to create the `Itinerary` table from `functions/prisma/schema.prisma`:
  npx prisma migrate dev --name init

What must be repeatable for production
-------------------------------------
1) Migrations must be applied reliably from CI/CD, not by running `migrate dev` on a developer machine.
2) Prisma client must be generated during the build step and included in the function deployment.
3) DB credentials must be stored securely (Secret Manager) and not in source or plainly in env.
4) Cloud Functions must connect to Cloud SQL using the Cloud Functions "Connections" setting (preferred) or via a secure proxy.

Production checklist (exact steps — tested and working)
------------------------------------------------------
These are the EXACT steps we used to deploy to mundo1-dev. Follow this sequence for production.

1. Provision Cloud SQL instance (if not already done):
   - Create Postgres instance in Cloud Console or via gcloud.
   - Note the connection name format: `PROJECT:REGION:INSTANCE` (e.g., mundo1-dev:us-central1:traval-dev).
   - Create database and DB user with password.

2. Store DB credentials in Secret Manager:
   - Secret name: `voyager-itinerary-db` (or your chosen name).
   - Secret value MUST use Cloud SQL socket format for Gen2 Cloud Functions/Cloud Run:
     
     postgresql://DB_USER:DB_PASS@localhost/DB_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
     
   - Example (replace placeholders):
     postgresql://voyageruser:PASSWORD@localhost/traval-dev?host=/cloudsql/mundo1-dev:us-central1:traval-dev
   
   - Command to create/update secret:
     echo -n 'postgresql://USER:PASS@localhost/DB?host=/cloudsql/PROJECT:REGION:INSTANCE' \
       | gcloud secrets create voyager-itinerary-db --data-file=- --replication-policy="automatic" --project=PROJECT
     
     Or to add a new version:
     echo -n 'postgresql://USER:PASS@localhost/DB?host=/cloudsql/PROJECT:REGION:INSTANCE' \
       | gcloud secrets versions add voyager-itinerary-db --data-file=- --project=PROJECT

3. Grant Cloud Run service account access to the secret:
   - Get the service account email (usually `PROJECT_NUMBER-compute@developer.gserviceaccount.com`).
   - Grant access:
     gcloud secrets add-iam-policy-binding voyager-itinerary-db \
       --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
       --role="roles/secretmanager.secretAccessor" \
       --project=PROJECT

4. Enable required APIs:
   gcloud services enable sqladmin.googleapis.com --project=PROJECT

5. Attach Cloud SQL instance to the Cloud Run service (CRITICAL):
   - For Gen2 functions (which use Cloud Run), you MUST attach the Cloud SQL instance:
     
     gcloud run services update FUNCTION_SERVICE_NAME \
       --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
       --project=PROJECT --region=REGION
   
   - Example:
     gcloud run services update listitinerariesforuser \
       --add-cloudsql-instances=mundo1-dev:us-central1:traval-dev \
       --project=mundo1-dev --region=us-central1
   
   - This makes the /cloudsql/PROJECT:REGION:INSTANCE socket available to Prisma.

6. Configure function environment to use the secret:
   - In Cloud Console → Cloud Run → service → Edit & Deploy New Revision:
     - Variables & Secrets → Add secret → select `voyager-itinerary-db`.
     - Set as environment variable: `DATABASE_URL`.
     - Reference: latest version.
   - Save and deploy.
   
   - Or via gcloud (when creating/updating the function):
     gcloud functions deploy FUNCTION_NAME \
       --set-secrets=DATABASE_URL=voyager-itinerary-db:latest \
       ... other flags ...

7. Deploy functions with Prisma client included:
   - Ensure `functions/package.json` includes:
     "@prisma/client": "^6.17.1" (or current version)
   - Run `npx prisma generate` in functions/ before deploying (or in CI).
   - Deploy via Firebase CLI or gcloud.

8. Run migrations (production DB):
   - From CI or a secure environment with DB access:
     # Set DATABASE_URL pointing to production DB (via Cloud SQL Auth Proxy or secret)
     export DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB"
     cd functions
     npx prisma migrate deploy
   
   - This applies all pending migrations non-interactively.

9. Grant public invoker access (for browser callable functions):
   - CORS preflight requires unauthenticated invocation to be allowed:
     gcloud run services add-iam-policy-binding FUNCTION_SERVICE_NAME \
       --member="allUsers" \
       --role="roles/run.invoker" \
       --region=REGION --project=PROJECT
   
   - Note: Your function code still validates authentication via context.auth; this only allows preflight.

10. Verify deployment:
    - Test OPTIONS (CORS preflight):
      curl -i -X OPTIONS "https://REGION-PROJECT.cloudfunctions.net/FUNCTION_NAME" \
        -H "Origin: https://yourdomain.com" \
        -H "Access-Control-Request-Method: POST"
      
      Expected: HTTP 204 with Access-Control-Allow-Origin header.
    
    - Test authenticated POST from browser or with ID token.
    - Tail logs:
      gcloud functions logs read FUNCTION_NAME --project=PROJECT --region=REGION --limit=50

Connection pooling and scaling notes
------------------------------------
- Serverless functions can exhaust DB connections. Monitor `pg_stat_activity` in Postgres.
- Use Cloud SQL connection pooling (PgBouncer via Cloud SQL Proxy) or limit max connections in Prisma.
- For high-scale production, consider a dedicated connection pooler or Cloud SQL private IP with VPC peering.

Password rotation and secrets lifecycle
---------------------------------------
- Rotate DB password: Cloud Console → SQL → Users or `gcloud sql users set-password`.
- Update Secret Manager secret with new password (add new version).
- Redeploy function or force new Cloud Run revision:
  gcloud run services update SERVICE_NAME \
    --project=PROJECT --region=REGION \
    --update-env-vars=RESTART_AT="$(date +%s)"

Deployment checklist summary (CI-friendly)
------------------------------------------
Required environment in CI:
- GCP credentials with Secret Manager read access and Cloud SQL Admin API access.
- DATABASE_URL set from secret (for migrations).

Build job (CI):
  cd functions
  npm ci
  npx prisma generate
  # Optional: run tests

Migration job (CI, run against target DB):
  export DATABASE_URL=$(gcloud secrets versions access latest --secret=voyager-itinerary-db --project=PROJECT)
  cd functions
  npx prisma migrate deploy

Deploy job (Firebase Functions or gcloud):
  # Ensure function has:
  # 1. Cloud SQL instance attached (--add-cloudsql-instances)
  # 2. Secret mapped to DATABASE_URL env var (--set-secrets=DATABASE_URL=voyager-itinerary-db:latest)
  # 3. Public invoker role for CORS preflight (if callable from browser)
  
  firebase deploy --only functions:listItinerariesForUser
  # or
  gcloud functions deploy listItinerariesForUser \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=./functions \
    --entry-point=listItinerariesForUser \
    --trigger-http \
    --set-secrets=DATABASE_URL=voyager-itinerary-db:latest \
    --set-cloudsql-instances=PROJECT:REGION:INSTANCE \
    --allow-unauthenticated \
    --project=PROJECT

Production Deployment Strategy (Firestore → Cloud SQL Migration)
------------------------------------------------------------------
Overview:
- Currently: All itineraries stored in Firestore
- Target: All itineraries stored in Cloud SQL (Postgres) with Prisma
- Challenge: Zero-downtime migration with no data loss or user disruption
- Strategy: Dual-write period → data migration → cutover → cleanup

Phase 1: Pre-Production Setup (mundo1-1 / Production)
------------------------------------------------------
1. Provision Cloud SQL Production Instance:
   - Instance name: `traval-prod` (or your chosen name)
   - Project: `mundo1-1`
   - Region: `us-central1` (match your Firebase Functions region)
   - Tier: Consider `db-custom-2-7680` or higher for production load
   - Storage: Auto-scaling SSD with minimum 100GB
   - Backups: Automated daily backups enabled
   - High availability: Consider enabling HA configuration
   
   Command:
   gcloud sql instances create traval-prod \
     --database-version=POSTGRES_15 \
     --tier=db-custom-2-7680 \
     --region=us-central1 \
     --storage-type=SSD \
     --storage-size=100 \
     --storage-auto-increase \
     --backup \
     --backup-start-time=03:00 \
     --maintenance-window-day=SUN \
     --maintenance-window-hour=4 \
     --project=mundo1-1

2. Create production database and user:
   gcloud sql databases create traval --instance=traval-prod --project=mundo1-1
   gcloud sql users create voyageruser --instance=traval-prod --password='STRONG_PASSWORD' --project=mundo1-1

3. Store production DB credentials in Secret Manager:
   echo -n 'postgresql://voyageruser:STRONG_PASSWORD@localhost/traval?host=/cloudsql/mundo1-1:us-central1:traval-prod' \
     | gcloud secrets create voyager-itinerary-db-prod --data-file=- --replication-policy="automatic" --project=mundo1-1

4. Grant Cloud Run service account access:
   # Get the default compute service account
   PROJECT_NUMBER=$(gcloud projects describe mundo1-1 --format='value(projectNumber)')
   SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
   
   gcloud secrets add-iam-policy-binding voyager-itinerary-db-prod \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/secretmanager.secretAccessor" \
     --project=mundo1-1

5. Run Prisma migrations on production database:
   # Connect via Cloud SQL Auth Proxy locally (secure method)
   ./cloud_sql_proxy -instances=mundo1-1:us-central1:traval-prod=tcp:5433 &
   
   # Set DATABASE_URL temporarily for migration
   export DATABASE_URL="postgresql://voyageruser:STRONG_PASSWORD@127.0.0.1:5433/traval"
   cd functions
   npx prisma migrate deploy
   
   # Verify schema
   npx prisma db pull
   npx prisma generate

Phase 2: Deploy New Cloud SQL Functions to Production
------------------------------------------------------
Deploy all itinerary RPC functions with Cloud SQL connection:

1. Deploy createItinerary:
   gcloud run services update createitinerary \
     --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
     --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
     --project=mundo1-1 --region=us-central1

2. Deploy updateItinerary:
   gcloud run services update updateitinerary \
     --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
     --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
     --project=mundo1-1 --region=us-central1

3. Deploy deleteItinerary:
   gcloud run services update deleteitinerary \
     --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
     --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
     --project=mundo1-1 --region=us-central1

4. Deploy listItinerariesForUser:
   gcloud run services update listitinerariesforuser \
     --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
     --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
     --project=mundo1-1 --region=us-central1

5. Deploy searchItineraries:
   gcloud run services update searchitineraries \
     --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
     --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
     --project=mundo1-1 --region=us-central1

6. Grant public invoker access (for CORS preflight):
   for FUNC in createitinerary updateitinerary deleteitinerary listitinerariesforuser searchitineraries; do
     gcloud run services add-iam-policy-binding $FUNC \
       --member="allUsers" \
       --role="roles/run.invoker" \
       --region=us-central1 \
       --project=mundo1-1
   done

OR use Firebase CLI (simpler):
   cd /Users/icebergslim/projects/voyager-pwa
   firebase use mundo1-1
   firebase deploy --only functions:createItinerary,functions:updateItinerary,functions:deleteItinerary,functions:listItinerariesForUser,functions:searchItinerary

Phase 3: Data Migration (Firestore → Cloud SQL)
------------------------------------------------
CRITICAL: Run migration script during low-traffic period (2-4 AM)

1. Create migration script: `functions/scripts/migrate-firestore-to-postgres.ts`
   
   Key features:
   - Read all itineraries from Firestore `itineraries` collection
   - Transform data to match Prisma schema (handle date conversions, BigInt epochs)
   - Batch insert to Postgres using Prisma (100 records per batch)
   - Handle duplicates (upsert by Firestore document ID)
   - Log progress and errors
   - Dry-run mode for testing
   - Resume capability (track last processed ID)

2. Test migration on dev first:
   # Point to dev database
   export DATABASE_URL="postgresql://voyageruser:PASSWORD@127.0.0.1:5432/traval"
   cd functions
   npx ts-node scripts/migrate-firestore-to-postgres.ts --dry-run
   
   # Check counts match
   npx prisma studio # Inspect migrated data

3. Run production migration:
   # Connect to production database
   ./cloud_sql_proxy -instances=mundo1-1:us-central1:traval-prod=tcp:5433 &
   export DATABASE_URL="postgresql://voyageruser:PASSWORD@127.0.0.1:5433/traval"
   
   # Backup Firestore first (export to Cloud Storage)
   gcloud firestore export gs://mundo1-1-firestore-backup/$(date +%Y%m%d) \
     --collection-ids=itineraries \
     --project=mundo1-1
   
   # Run migration
   cd functions
   npx ts-node scripts/migrate-firestore-to-postgres.ts --verbose
   
   # Verify counts
   echo "Firestore count:"
   # Count via Firebase Admin SDK or Console
   
   echo "Postgres count:"
   psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Itinerary\";"

4. Validation queries:
   # Check for missing data
   psql "$DATABASE_URL" -c "
     SELECT 
       COUNT(*) as total,
       COUNT(DISTINCT \"userId\") as unique_users,
       COUNT(CASE WHEN destination IS NULL THEN 1 END) as missing_destination,
       COUNT(CASE WHEN \"startDate\" IS NULL THEN 1 END) as missing_start_date
     FROM \"Itinerary\";
   "
   
   # Check date ranges
   psql "$DATABASE_URL" -c "
     SELECT 
       MIN(\"startDate\") as earliest_trip,
       MAX(\"startDate\") as latest_trip,
       COUNT(*) as total
     FROM \"Itinerary\"
     WHERE \"endDay\" >= EXTRACT(EPOCH FROM NOW()) * 1000;
   "

Phase 4: Frontend Update & Deployment
--------------------------------------
1. Update frontend to use new RPC functions:
   - Code already uses `searchItineraries`, `createItinerary`, etc. (no changes needed)
   - Firebase Functions SDK handles RPC calls transparently
   - Test locally against dev environment first

2. Deploy frontend to production:
   cd /Users/icebergslim/projects/voyager-pwa
   npm run build
   firebase use mundo1-1
   firebase deploy --only hosting
   
3. Verify in production:
   - Open https://travalpass.com (or your production domain)
   - Create a new itinerary → check it appears in Postgres
   - Search for itineraries → verify results come from Postgres
   - Update/delete operations → confirm they work

Phase 5: Monitoring & Validation (First 24-48 Hours)
-----------------------------------------------------
1. Monitor Cloud SQL performance:
   - Cloud Console → SQL → traval-prod → Monitoring
   - Watch: CPU usage, connections, disk I/O, query latency
   - Alert if connections > 80% of max or query latency > 1s

2. Monitor Cloud Functions logs:
   gcloud functions logs read createItinerary --project=mundo1-1 --region=us-central1 --limit=100
   gcloud functions logs read searchItineraries --project=mundo1-1 --region=us-central1 --limit=100
   
   # Look for:
   - Prisma connection errors
   - Query timeout errors  
   - "Can't reach database server" errors

3. Database health checks:
   # Active connections
   psql "$DATABASE_URL" -c "
     SELECT count(*), state 
     FROM pg_stat_activity 
     WHERE datname = 'traval' 
     GROUP BY state;
   "
   
   # Slow queries
   psql "$DATABASE_URL" -c "
     SELECT pid, now() - query_start as duration, query 
     FROM pg_stat_activity 
     WHERE state = 'active' AND now() - query_start > interval '5 seconds';
   "

4. User-facing validation:
   - Test from production web app:
     - Create itinerary
     - Search with filters (destination, dates, age)
     - View profile's itineraries list
     - Match with other travelers
     - Update itinerary
     - Delete itinerary
   
   - Check viewed itineraries exclusion works (localStorage + excludedIds)
   - Verify pagination returns 10 results per batch

Phase 6: Firestore Deprecation (After 1 Week Stable)
-----------------------------------------------------
Once Cloud SQL is proven stable in production:

1. KEEP Firestore data for 30 days (rollback safety):
   - Do NOT delete Firestore `itineraries` collection immediately
   - Monitor Cloud SQL for any issues
   - If critical bug found, can temporarily revert functions to read from Firestore

2. Stop writing to Firestore (optional - clean up old code):
   - Remove any Firestore write operations from functions
   - Archive old Firestore backup functions

3. After 30 days, archive Firestore data:
   # Export to Cloud Storage for long-term archival
   gcloud firestore export gs://mundo1-1-firestore-archive/itineraries-final \
     --collection-ids=itineraries \
     --project=mundo1-1
   
   # Then optionally delete from Firestore to save costs
   # (Use bulk delete script or manual deletion in Console)

Phase 7: Production Optimization
---------------------------------
After successful migration, optimize for production scale:

1. Connection pooling:
   - Monitor `pg_stat_activity` for connection spikes
   - Consider PgBouncer if connections > 100 concurrent
   - Update Prisma client with connection limits:
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
       pool_timeout = 20
       connection_limit = 10
     }

2. Query optimization:
   - Add indexes for common search filters:
     CREATE INDEX idx_itinerary_destination ON "Itinerary"(destination);
     CREATE INDEX idx_itinerary_dates ON "Itinerary"("startDate", "endDate");
     CREATE INDEX idx_itinerary_user ON "Itinerary"("userId");
     CREATE INDEX idx_itinerary_active ON "Itinerary"("endDay") WHERE "endDay" >= EXTRACT(EPOCH FROM NOW()) * 1000;

3. Backup strategy:
   - Verify automated backups running daily
   - Test point-in-time recovery:
     gcloud sql backups list --instance=traval-prod --project=mundo1-1
   
   - Create manual backup before major changes:
     gcloud sql backups create --instance=traval-prod --project=mundo1-1

4. Cost monitoring:
   - Track Cloud SQL costs in Cloud Console → Billing
   - Expected costs:
     - db-custom-2-7680: ~$150-200/month
     - Storage (100GB SSD): ~$17/month
     - Backups: ~$0.08/GB/month
   - Compare to Firestore read costs (should see savings)

Rollback Plan (Emergency)
--------------------------
If critical issues found after production deployment:

1. Immediate rollback (< 1 hour):
   - Revert frontend deployment:
     firebase hosting:rollback --project=mundo1-1
   
   - Revert functions to previous version:
     gcloud functions deploy [FUNCTION_NAME] --source=[PREVIOUS_VERSION] --project=mundo1-1
   
   - Or point functions back to Firestore (requires code change)

2. Data consistency check:
   - Compare Firestore vs Postgres counts
   - Identify any missing records
   - Re-run migration script with --resume flag

3. Root cause analysis:
   - Check Cloud SQL logs for errors
   - Review function execution logs
   - Test locally with production data dump

Success Criteria Checklist
---------------------------
Before declaring migration successful:

✅ All existing itineraries migrated (Firestore count == Postgres count)
✅ New itineraries created successfully via frontend
✅ Search returns correct results with filters applied
✅ Pagination works (10 results per batch)
✅ Viewed itineraries excluded from search results
✅ Update/delete operations work without errors
✅ No increase in error rates (< 0.1% error rate)
✅ Cloud SQL latency acceptable (p95 < 500ms for queries)
✅ No database connection exhaustion (< 80% max connections)
✅ Backup and restore tested successfully
✅ Monitoring alerts configured (CPU > 80%, connections > 80%, slow queries)

Firehose: Firestore→Postgres migration script template
-------------------------------------------------------
We will create a migration script that reads `itineraries` from Firestore and writes to Postgres via Prisma. This script should run once (or in safe resume mode) from a controlled environment with DB and Firestore access.

Script location: `functions/scripts/migrate-firestore-to-postgres.ts`

Key implementation details:
- Use Firebase Admin SDK to read Firestore in batches
- Transform Firestore Timestamp to JavaScript Date
- Convert epoch milliseconds to BigInt for startDay/endDay
- Handle Firestore document ID → Prisma ID mapping
- Upsert to handle re-runs (idempotent)
- Progress logging every 100 records
- Error handling with retry logic
- Resume from last processed document

Appendix: Useful commands
-------------------------
Start Cloud SQL Auth Proxy (local dev):
  ./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432

List Cloud SQL instances:
  gcloud sql instances list --project=PROJECT

Get instance connection name:
  gcloud sql instances describe INSTANCE_NAME --project=PROJECT --format='value(connectionName)'

Reset DB user password:
  gcloud sql users set-password DB_USER --instance=INSTANCE_NAME --password='NEWPASS' --project=PROJECT

Create/update secret in Secret Manager:
  echo -n 'SECRET_VALUE' | gcloud secrets create SECRET_NAME --data-file=- --project=PROJECT
  echo -n 'SECRET_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=- --project=PROJECT

Grant service account access to secret:
  gcloud secrets add-iam-policy-binding SECRET_NAME \
    --member="serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=PROJECT

Attach Cloud SQL to Cloud Run service:
  gcloud run services update SERVICE_NAME \
    --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
    --project=PROJECT --region=REGION

Force Cloud Run revision restart (to pick up new secret):
  gcloud run services update SERVICE_NAME \
    --project=PROJECT --region=REGION \
    --update-env-vars=RESTART_AT="$(date +%s)"

Tail function logs:
  gcloud functions logs read FUNCTION_NAME --project=PROJECT --region=REGION --limit=50 --watch

Test CORS preflight:
  curl -i -X OPTIONS "https://REGION-PROJECT.cloudfunctions.net/FUNCTION_NAME" \
    -H "Origin: https://yourdomain.com" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type"

Common troubleshooting:
- "Can't reach database server at 127.0.0.1:5432" → Secret uses localhost but Cloud SQL instance not attached.
- "Can't reach database server at /cloudsql/..." → Cloud SQL instance not attached to Cloud Run service or wrong connection name in secret.
- "invalid port number in database URL" → Secret has malformed connection string (quotes/newlines) or non-numeric port.
- CORS error / 403 on preflight → Missing allUsers invoker role; add with `gcloud run services add-iam-policy-binding`.

Notes
-----
- Keep `functions/.env` out of version control. Use Secret Manager for production. The repository already contains `functions/.env.example`.
- Treat migrations as first-class artifacts: check `functions/prisma/migrations/` into the repo so CI can apply them deterministically.
