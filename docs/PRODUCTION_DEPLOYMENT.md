# Production Deployment Guide

## Overview
This guide covers deploying the Cloud SQL-based itinerary system to production, including data migration from Firestore to Cloud SQL.

## Prerequisites

### 1. Production Cloud SQL Instance
- **Instance Name**: `mundo1-1:us-central1:traval-prod` (or your production instance)
- **Database Name**: `traval-prod`
- **User**: `voyageruser`
- **Password**: Set via Secret Manager

### 2. Production Firebase Project
- **Project ID**: `mundo1-1`
- **Region**: `us-central1`

### 3. Required Secrets in Secret Manager
```bash
# Set database password in Secret Manager
gcloud secrets create DATABASE_PASSWORD --data-file=- <<< "YOUR_PRODUCTION_PASSWORD"

# Grant Cloud Functions access to the secret
gcloud secrets add-iam-policy-binding DATABASE_PASSWORD \
  --member="serviceAccount:YOUR_PROJECT@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Deployment Steps

### Step 1: Run Prisma Migrations on Production Database

```bash
cd functions

# Connect to production Cloud SQL via proxy
./cloud_sql_proxy --instances=mundo1-1:us-central1:traval-prod=tcp:5433 &

# Run migrations
DATABASE_URL="postgresql://voyageruser:PROD_PASSWORD@127.0.0.1:5433/traval-prod" npx prisma migrate deploy

# Verify schema
DATABASE_URL="postgresql://voyageruser:PROD_PASSWORD@127.0.0.1:5433/traval-prod" npx prisma db pull
```

### Step 2: Migrate Itinerary Data from Firestore to Cloud SQL

```bash
# Run the migration script (see migration section below)
cd functions
npm run migrate:firestore-to-cloudsql -- --project=mundo1-1 --database=production
```

### Step 3: Deploy Cloud Functions

```bash
# Deploy itinerary RPC functions to production
cd functions
firebase use mundo1-1  # Switch to production project
firebase deploy --only functions:searchItineraries,functions:listItinerariesForUser,functions:createItinerary,functions:updateItinerary,functions:deleteItinerary
```

### Step 4: Deploy Frontend

```bash
# Build production frontend
cd ..
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Step 5: Verify Deployment

1. **Test Search**: Search for itineraries with various filters
2. **Test Blocking**: Verify blocked users don't appear in results
3. **Test Creation**: Create a new itinerary and verify it appears in search
4. **Monitor Logs**: Check Cloud Functions logs for errors

---

## Data Migration

### Firestore → Cloud SQL Migration Script

The migration script (`functions/scripts/migrate-firestore-to-cloudsql.ts`) will:

1. Read all itineraries from Firestore `itineraries` collection
2. Transform data to match Prisma schema
3. Insert into Cloud SQL via Prisma
4. Handle duplicates (skip existing IDs)
5. Report migration statistics

**Run Migration:**
```bash
cd functions
DATABASE_URL="postgresql://voyageruser:PROD_PASSWORD@127.0.0.1:5433/traval-prod" \
  FIREBASE_PROJECT=mundo1-1 \
  npx ts-node scripts/migrate-firestore-to-cloudsql.ts
```

**Migration Options:**
- `--dry-run`: Preview migration without writing to database
- `--batch-size=100`: Process in batches (default: 50)
- `--skip-existing`: Skip itineraries that already exist in Cloud SQL

---

## Rollback Plan

If issues arise after deployment:

### 1. Rollback Cloud Functions
```bash
# List function versions
gcloud functions list --format="table(name,versionId,updateTime)"

# Rollback to previous version
gcloud functions deploy searchItineraries --version=PREVIOUS_VERSION_ID
```

### 2. Switch Backend to Firestore (Emergency)
Edit `src/hooks/useSearchItineraries.tsx` and revert to Firestore queries, then redeploy frontend.

### 3. Database Rollback
If data corruption occurs:
```bash
# Restore from Cloud SQL backup
gcloud sql backups list --instance=traval-prod
gcloud sql backups restore BACKUP_ID --backup-instance=traval-prod
```

---

## Post-Deployment Monitoring

### 1. Cloud Functions Metrics
Monitor in Firebase Console:
- **Invocations**: Should match traffic patterns
- **Errors**: Should be < 1%
- **Execution Time**: Should be < 2s for search queries

### 2. Cloud SQL Metrics
Monitor in GCP Console:
- **CPU Usage**: Should be < 70%
- **Memory Usage**: Should be < 80%
- **Active Connections**: Should be < 100
- **Query Performance**: Check slow query log

### 3. Application Logs
```bash
# View Cloud Functions logs
firebase functions:log --only searchItineraries

# View Cloud SQL logs
gcloud logging read "resource.type=cloudsql_database AND resource.labels.database_id=mundo1-1:traval-prod"
```

---

## Environment Configuration

### Production Environment Variables (functions/.env)

```env
# Do NOT commit this file to Git
# These are set via Secret Manager in production

DATABASE_URL=postgresql://voyageruser:PASSWORD@/traval-prod?host=/cloudsql/mundo1-1:us-central1:traval-prod
FIREBASE_PROJECT=mundo1-1
NODE_ENV=production
```

### Function Configuration (functions/src/config.ts)

```typescript
export const config = {
  production: {
    projectId: 'mundo1-1',
    region: 'us-central1',
    cloudSqlInstance: 'mundo1-1:us-central1:traval-prod',
    databaseUrl: process.env.DATABASE_URL,
  }
};
```

---

## Testing Checklist

Before going live, verify:

- [ ] Prisma migrations applied successfully
- [ ] All Firestore itineraries migrated to Cloud SQL
- [ ] Search returns correct results with all filters
- [ ] Blocked users are excluded from search results
- [ ] Viewed itineraries persist in localStorage
- [ ] Like/match functionality works
- [ ] AI-generated itineraries save correctly
- [ ] Performance meets SLA (< 2s search response)
- [ ] No console errors in browser
- [ ] Cloud Functions logs show no errors
- [ ] Database connections don't leak

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```
Error: P1001: Can't reach database server
```
**Solution**: Verify Cloud SQL instance is running and Cloud Functions have VPC connector configured.

**2. Migration Fails with Duplicate Keys**
```
Error: Unique constraint violation on id
```
**Solution**: Use `--skip-existing` flag or delete existing records before migration.

**3. Slow Search Performance**
```
Query takes > 5 seconds
```
**Solution**: Check database indexes, increase Cloud SQL instance size, or optimize filters.

**4. Blocked Users Still Appearing**
```
Blocked itineraries showing in results
```
**Solution**: Verify `userInfo.blocked` array is properly populated in both Firestore and Cloud SQL.

---

## Support Contacts

- **DevOps**: [Your Team Email]
- **Database Admin**: [DBA Email]
- **On-Call Engineer**: [PagerDuty/Slack]

---

## Appendix: Production Secrets Setup

```bash
# 1. Create secrets
echo -n "PROD_DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-
echo -n "STRIPE_WEBHOOK_SECRET" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-

# 2. Grant access to Cloud Functions
PROJECT_ID="mundo1-1"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding DATABASE_PASSWORD \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Configure functions to use secrets (in firebase.json)
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "secretEnvironmentVariables": [
      {
        "key": "DATABASE_PASSWORD",
        "secret": "DATABASE_PASSWORD"
      }
    ]
  }
}
```

---

**Last Updated**: October 18, 2025  
**Version**: 1.0  
**Author**: Engineering Team
