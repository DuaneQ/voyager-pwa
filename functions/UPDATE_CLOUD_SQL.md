# Cloud SQL Instance Update - Development & Production Guide

## Development Status: ✅ COMPLETED - CONSOLIDATED (Nov 22, 2025)

**COST OPTIMIZATION:** Development now shares the production Cloud SQL instance with separate database.

The `voyager-itinerary-db` secret in `mundo1-dev` has been updated to use the production instance:

**Instance:** `mundo1-1:us-central1:mundo1-1-sand` (SHARED with production)
**Database Name:** `traval-dev` (isolated from production's `traval` database)
**Connection String:** `postgresql://voyageruser:TravalPassWins1_@localhost/traval-dev?host=/cloudsql/mundo1-1:us-central1:mundo1-1-sand&sslmode=disable`

## What Was Done (Development)

1. ✅ Deleted separate dev instance (`mundo1-dev-sand`) to reduce costs
2. ✅ Created `traval-dev` database in production instance
3. ✅ Secret Manager updated with production instance connection string (version 5)
4. ✅ Cloud Run services updated to attach production instance
5. ✅ Verified: All dev services now use `mundo1-1-sand` with `traval-dev` database

**Cost Impact:** Eliminated duplicate instance cost (~$2-3/day saved)

## What Happens Next

The functions will automatically use the new database instance on their next cold start or when you redeploy them.

### To Force Immediate Update (Redeploy Functions)

Run this from the `functions/` directory:

```bash
# Deploy all database functions with the new Cloud SQL instance attached
npm run deploy

# Or deploy individually with Cloud SQL connection:
firebase deploy --only functions:createItinerary
firebase deploy --only functions:deleteItinerary
firebase deploy --only functions:listItinerariesForUser
firebase deploy --only functions:searchItineraries
firebase deploy --only functions:updateItinerary
```

### For Local Development

If you're using the Cloud SQL Auth Proxy locally, update your local proxy command:

```bash
# Stop the old proxy if running
pkill cloud_sql_proxy

# Start proxy for new instance
./cloud_sql_proxy -instances=mundo1-dev:us-central1:mundo1-dev-sand=tcp:5432
```

## Verification

To verify the connection is working after deployment:

```bash
# Check secret is correct
gcloud secrets versions access latest --secret=voyager-itinerary-db --project=mundo1-dev

# Test a function
curl -X POST https://us-central1-mundo1-dev.cloudfunctions.net/listItinerariesForUser \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"data":{"userId":"test-user-id"}}'
```

## Migration Notes (Development)

- Old instance: `mundo1-dev:us-central1:traval-dev`
- New instance: `mundo1-dev:us-central1:mundo1-dev-sand`
- Old database name: `traval`
- New database name: `traval-dev`
- Data migration: Exported from old instance and imported to new instance

---

## Consolidated Architecture (Nov 22, 2025)

**Single Cloud SQL Instance Strategy:**

Both development and production environments now share the same Cloud SQL instance with database-level isolation:

```
Cloud SQL Instance: mundo1-1:us-central1:mundo1-1-sand
├── traval (production database)
│   └── Used by: mundo1-1 project functions
└── traval-dev (development database)
    └── Used by: mundo1-dev project functions
```

**Benefits:**
- ✅ 50% cost reduction - one instance instead of two
- ✅ Database-level isolation maintains dev/prod separation
- ✅ Same user credentials across environments
- ✅ Simpler infrastructure to manage

**Security:**
- Functions in `mundo1-dev` can ONLY access `traval-dev` database (enforced by connection string)
- Functions in `mundo1-1` can ONLY access `traval` database (enforced by connection string)
- Network access controlled via Cloud SQL instance attachment per project

---

## Production Status: ✅ COMPLETED (Nov 22, 2025)

The `voyager-itinerary-db` secret in `mundo1-1` has been updated to point to the new Cloud SQL instance:

**New Instance:** `mundo1-1:us-central1:mundo1-1-sand`
**Database Name:** `traval`
**Connection String:** `postgresql://voyageruser:TravalPassWins1_@localhost/traval?host=/cloudsql/mundo1-1:us-central1:mundo1-1-sand&sslmode=disable`

### What Was Done (Production)

1. ✅ Checked database name on new instance: `traval`
2. ✅ Secret Manager updated with new connection string (version 14)
3. ✅ Functions redeployed via Firebase CLI (Node.js 20 runtime)
4. ✅ **Cloud SQL instance attachment updated on all Cloud Run services**
5. ✅ Verified: `run.googleapis.com/cloudsql-instances: mundo1-1:us-central1:mundo1-1-sand`
6. ✅ Old instance: `mundo1-1:us-central1:traval-prod`
7. ✅ New instance: `mundo1-1:us-central1:mundo1-1-sand`

---

## Production Migration Guide (mundo1-1) - REFERENCE

Follow these exact steps when migrating production to a new Cloud SQL instance:

### Step 1: Identify the New Instance Details

From Google Cloud Console → SQL, note:
- **Connection name** (format: `project:region:instance`)
- **Database name** (check the "Databases" tab)
- **User credentials** (usually same as current: `voyageruser`)

Example values:
- Connection name: `mundo1-1:us-central1:mundo1-prod-sand`
- Database name: Check if it's `traval`, `traval-prod`, or another name
- Password: Same as current (`TravalPassWins1_`)

### Step 2: Update Secret Manager

```bash
# IMPORTANT: Use the EXACT database name from the Cloud SQL instance
# Replace DATABASE_NAME with the actual database name you see in Cloud Console

echo -n 'postgresql://voyageruser:TravalPassWins1_@localhost/DATABASE_NAME?host=/cloudsql/mundo1-1:us-central1:NEW_INSTANCE_NAME&sslmode=disable' \
  | gcloud secrets versions add voyager-itinerary-db --data-file=- --project=mundo1-1
```

**Real example for dev (completed):**
```bash
echo -n 'postgresql://voyageruser:TravalPassWins1_@localhost/traval-dev?host=/cloudsql/mundo1-dev:us-central1:mundo1-dev-sand&sslmode=disable' \
  | gcloud secrets versions add voyager-itinerary-db --data-file=- --project=mundo1-dev
```

### Step 3: Verify the Secret

```bash
gcloud secrets versions access latest --secret=voyager-itinerary-db --project=mundo1-1
```

Confirm the output shows:
- Correct database name (matches Cloud SQL Console)
- Correct instance connection name
- `sslmode=disable` at the end

### Step 4: Redeploy Functions (Optional but Recommended)

```bash
cd /Users/icebergslim/projects/voyager-pwa/functions
firebase deploy --only functions:listItinerariesForUser,functions:searchItineraries,functions:createItinerary,functions:updateItinerary,functions:deleteItinerary --project=mundo1-1
```

**Note:** Functions will pick up the new secret automatically on next cold start, but redeploying forces immediate use.

### Step 5: Update Cloud SQL Instance Attachment (⚠️ CRITICAL)

**IMPORTANT:** Firebase deployment updates the secret reference but does NOT update the Cloud SQL instance attachment on Cloud Run services. You MUST manually update the instance:

```bash
# Update all Cloud Run services to use the new instance
for service in createitinerary deleteitinerary listitinerariesforuser searchitineraries updateitinerary; do
  echo "Updating $service..."
  gcloud run services update $service \
    --set-cloudsql-instances=mundo1-1:us-central1:NEW_INSTANCE_NAME \
    --project=mundo1-1 --region=us-central1 --quiet
done
```

**Verify the attachment:**
```bash
gcloud run services describe searchitineraries --project=mundo1-1 --region=us-central1 --format=yaml | grep "cloudsql-instances"
# Should show: run.googleapis.com/cloudsql-instances: mundo1-1:us-central1:NEW_INSTANCE_NAME
```

**Example from Nov 22, 2025 migration:**
```bash
# After updating secret, we had to manually attach the new instance:
for service in createitinerary deleteitinerary listitinerariesforuser searchitineraries updateitinerary; do
  gcloud run services update $service \
    --set-cloudsql-instances=mundo1-1:us-central1:mundo1-1-sand \
    --project=mundo1-1 --region=us-central1 --quiet
done
# Verification showed: run.googleapis.com/cloudsql-instances: mundo1-1:us-central1:mundo1-1-sand ✅
```

### Step 6: Test the Connection

1. Open the production app
2. Navigate to a page that uses the database (e.g., TravalMatch/Search page)
3. Check browser console for errors
4. If you see "Database `X` does not exist", verify database name in Step 1

### Common Issues & Solutions

**Error: "Database `traval` does not exist"**
- **Cause:** Database name in connection string doesn't match actual database name in Cloud SQL
- **Fix:** Check database name in Cloud Console → SQL → Databases tab, update secret with correct name

**Error: "Can't reach database server at `/cloudsql/...`"**
- **Cause:** Cloud SQL instance not attached to Cloud Run services
- **Fix:** Redeploy functions (Step 4), or wait for next cold start

**Error: "authentication failed"**
- **Cause:** Wrong password in connection string
- **Fix:** Verify password matches Cloud SQL user credentials

### Production Checklist

- [ ] Identify new Cloud SQL instance connection name
- [ ] Identify exact database name from Cloud Console
- [ ] Update Secret Manager with correct connection string
- [ ] Verify secret is correct
- [ ] Redeploy functions via Firebase CLI
- [ ] **⚠️ CRITICAL: Update Cloud SQL instance attachment on Cloud Run services**
- [ ] Verify instance attachment: `gcloud run services describe <service> | grep cloudsql-instances`
- [ ] Test in production app
- [ ] Monitor Cloud Function logs for connection errors
- [ ] Document old instance details before decommissioning
