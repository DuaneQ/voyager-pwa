# Cloud SQL Production Deployment Checklist

**Date**: _____________  
**Engineer**: _____________  
**Project**: mundo1-1 (Production)  
**Database**: traval-prod

---

## Pre-Deployment (Complete 1 Week Before)

### ☐ Infrastructure Setup
- [ ] Cloud SQL production instance created (`traval-prod`)
  - [ ] Tier: `db-custom-2-7680` or higher
  - [ ] Region: `us-central1`
  - [ ] Storage: 100GB SSD with auto-increase enabled
  - [ ] Backups: Automated daily backups enabled
  - [ ] Maintenance window: Sunday 4AM
  - [ ] High availability: Consider enabling for production

- [ ] Database and user created
  ```bash
  gcloud sql databases create traval --instance=traval-prod --project=mundo1-1
  gcloud sql users create voyageruser --instance=traval-prod --password='STRONG_PASS' --project=mundo1-1
  ```

- [ ] Secret Manager configured
  - [ ] Secret `voyager-itinerary-db-prod` created with connection string
  - [ ] Format: `postgresql://voyageruser:PASS@localhost/traval?host=/cloudsql/mundo1-1:us-central1:traval-prod`
  - [ ] Service account granted `secretAccessor` role

- [ ] Required APIs enabled
  ```bash
  gcloud services enable sqladmin.googleapis.com --project=mundo1-1
  gcloud services enable secretmanager.googleapis.com --project=mundo1-1
  ```

### ☐ Schema Migration
- [ ] Prisma migrations applied to production database
  ```bash
  ./cloud_sql_proxy -instances=mundo1-1:us-central1:traval-prod=tcp:5433 &
  export DATABASE_URL="postgresql://voyageruser:PASS@127.0.0.1:5433/traval"
  cd functions
  npx prisma migrate deploy
  npx prisma generate
  ```

- [ ] Schema validation completed
  ```bash
  psql "$DATABASE_URL" -c "\dt"
  psql "$DATABASE_URL" -c "\d \"Itinerary\""
  ```

### ☐ Test in Dev Environment
- [ ] All tests passing in `mundo1-dev`
- [ ] Migration script tested with dry-run
  ```bash
  npx ts-node scripts/migrate-firestore-to-postgres.ts --dry-run
  ```
- [ ] Functions deployed and tested in dev
- [ ] UI tested against dev database
- [ ] Performance benchmarks documented

---

## Deployment Day (Low-Traffic Window: 2-4 AM)

### ☐ Phase 1: Backup Current State (30 minutes before)
- [ ] Firestore backup created
  ```bash
  gcloud firestore export gs://mundo1-1-firestore-backup/pre-migration-$(date +%Y%m%d-%H%M) \
    --collection-ids=itineraries \
    --project=mundo1-1
  ```
  Backup location: gs://_______________________________________________

- [ ] Database snapshot created (if any existing data)
  ```bash
  gcloud sql backups create --instance=traval-prod --project=mundo1-1
  ```
  Backup ID: _______________________________________________

### ☐ Phase 2: Deploy Cloud Functions (T+0)
- [ ] Deploy all itinerary RPC functions with Cloud SQL connection
  ```bash
  cd /Users/icebergslim/projects/voyager-pwa
  firebase use mundo1-1
  firebase deploy --only functions:createItinerary,functions:updateItinerary,functions:deleteItinerary,functions:listItinerariesForUser,functions:searchItineraries
  ```

- [ ] Verify functions deployed
  ```bash
  firebase functions:list --project=mundo1-1 | grep -E "(create|update|delete|list|search)Itinerary"
  ```

- [ ] Attach Cloud SQL to each function
  ```bash
  for FUNC in createitinerary updateitinerary deleteitinerary listitinerariesforuser searchitineraries; do
    gcloud run services update $FUNC \
      --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
      --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
      --project=mundo1-1 --region=us-central1
  done
  ```

- [ ] Grant public invoker access (for CORS)
  ```bash
  for FUNC in createitinerary updateitinerary deleteitinerary listitinerariesforuser searchitineraries; do
    gcloud run services add-iam-policy-binding $FUNC \
      --member="allUsers" \
      --role="roles/run.invoker" \
      --region=us-central1 --project=mundo1-1
  done
  ```

### ☐ Phase 3: Data Migration (T+10 minutes)
- [ ] Cloud SQL Auth Proxy started
  ```bash
  ./cloud_sql_proxy -instances=mundo1-1:us-central1:traval-prod=tcp:5433 &
  export DATABASE_URL="postgresql://voyageruser:PASS@127.0.0.1:5433/traval"
  ```

- [ ] Migration script executed
  ```bash
  cd functions
  npx ts-node scripts/migrate-firestore-to-postgres.ts --verbose 2>&1 | tee migration-$(date +%Y%m%d-%H%M).log
  ```
  
  **Migration Start Time**: _______________________________________________  
  **Migration End Time**: _______________________________________________  
  **Duration**: _______________________________________________

- [ ] Data validation completed
  ```bash
  # Firestore count (check Firebase Console)
  # Postgres count
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Itinerary\";"
  ```
  
  **Firestore count**: _______________________________________________  
  **Postgres count**: _______________________________________________  
  **Match**: ☐ Yes ☐ No (if no, investigate)

- [ ] Data quality validation
  ```bash
  psql "$DATABASE_URL" -c "
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT \"userId\") as unique_users,
      COUNT(CASE WHEN destination IS NULL THEN 1 END) as missing_destination,
      COUNT(CASE WHEN \"startDate\" IS NULL THEN 1 END) as missing_dates
    FROM \"Itinerary\";
  "
  ```
  
  **Unique users**: _______________________________________________  
  **Missing data**: ☐ None ☐ Found issues (document below)

### ☐ Phase 4: Frontend Deployment (T+30 minutes)
- [ ] Frontend build successful
  ```bash
  cd /Users/icebergslim/projects/voyager-pwa
  npm run build
  ```

- [ ] Frontend deployed to production
  ```bash
  firebase use mundo1-1
  firebase deploy --only hosting
  ```

- [ ] Deployment URL verified
  Production URL: https://travalpass.com (or https://mundo1-1.web.app)

### ☐ Phase 5: Smoke Testing (T+40 minutes)
- [ ] Create new itinerary in production UI
  - [ ] Itinerary appears in UI
  - [ ] Itinerary exists in Postgres (verify via psql)
  - [ ] No console errors

- [ ] Search functionality
  - [ ] Search returns results
  - [ ] Filters work correctly (destination, dates, age)
  - [ ] Pagination works (10 results per page)
  - [ ] Viewed itineraries excluded

- [ ] Update itinerary
  - [ ] Changes saved successfully
  - [ ] Changes reflected in Postgres

- [ ] Delete itinerary
  - [ ] Deletion successful
  - [ ] Record removed from Postgres

- [ ] Check logs for errors
  ```bash
  gcloud functions logs read createItinerary --project=mundo1-1 --region=us-central1 --limit=50
  gcloud functions logs read searchItineraries --project=mundo1-1 --region=us-central1 --limit=50
  ```
  
  **Errors found**: ☐ None ☐ Yes (document below)

---

## Post-Deployment Monitoring (First 48 Hours)

### ☐ Hour 1-2: Immediate Monitoring
- [ ] Check Cloud SQL metrics
  - [ ] CPU usage < 50%
  - [ ] Connections < 50 (of max)
  - [ ] Disk I/O normal
  - [ ] Query latency < 500ms (p95)

- [ ] Check Cloud Functions metrics
  - [ ] Invocations succeeding (> 99%)
  - [ ] Execution time < 2s (p95)
  - [ ] Error rate < 0.1%

- [ ] Monitor user feedback
  - [ ] Check support channels
  - [ ] Monitor social media mentions
  - [ ] Review error reports

### ☐ Hours 2-24: Ongoing Monitoring
- [ ] Hourly spot checks of metrics
- [ ] Monitor database connection count
  ```bash
  psql "$DATABASE_URL" -c "
    SELECT count(*), state 
    FROM pg_stat_activity 
    WHERE datname = 'traval' 
    GROUP BY state;
  "
  ```

- [ ] Check for slow queries
  ```bash
  psql "$DATABASE_URL" -c "
    SELECT pid, now() - query_start as duration, query 
    FROM pg_stat_activity 
    WHERE state = 'active' AND now() - query_start > interval '5 seconds';
  "
  ```

### ☐ Day 2-7: Stabilization
- [ ] Daily review of metrics
- [ ] No critical errors in logs
- [ ] User feedback positive
- [ ] Performance meets SLAs
  - [ ] Search queries: < 500ms
  - [ ] Create/update: < 1s
  - [ ] Database uptime: > 99.9%

---

## Week 2: Optimization

### ☐ Performance Tuning
- [ ] Add database indexes for common queries
  ```sql
  CREATE INDEX idx_itinerary_destination ON "Itinerary"(destination);
  CREATE INDEX idx_itinerary_dates ON "Itinerary"("startDate", "endDate");
  CREATE INDEX idx_itinerary_user ON "Itinerary"("userId");
  CREATE INDEX idx_itinerary_active ON "Itinerary"("endDay") 
    WHERE "endDay" >= EXTRACT(EPOCH FROM NOW()) * 1000;
  ```

- [ ] Monitor index usage
  ```bash
  psql "$DATABASE_URL" -c "
    SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public';
  "
  ```

- [ ] Optimize slow queries (if any)

### ☐ Connection Pooling
- [ ] Monitor peak connection count
- [ ] Configure Prisma connection limits if needed
- [ ] Consider PgBouncer if connections > 100

---

## Month 1: Firestore Deprecation

### ☐ After 1 Week Stable
- [ ] Production Cloud SQL proven stable
- [ ] No critical issues reported
- [ ] Performance acceptable
- [ ] Decision made to proceed with Firestore deprecation

### ☐ Archive Firestore Data
- [ ] Final Firestore backup created
  ```bash
  gcloud firestore export gs://mundo1-1-firestore-archive/itineraries-final-$(date +%Y%m%d) \
    --collection-ids=itineraries \
    --project=mundo1-1
  ```
  
  Archive location: gs://_______________________________________________

- [ ] Archive verified and accessible
- [ ] Keep Firestore data for 30 days (rollback safety)

### ☐ Optional: Clean Up (After 30 Days)
- [ ] Remove Firestore itineraries collection (if desired to save costs)
- [ ] Update documentation to reflect Cloud SQL as primary data store
- [ ] Archive this checklist for future reference

---

## Rollback Plan (Emergency Use Only)

### If Critical Issues Discovered

#### Option 1: Revert Frontend (< 1 hour)
```bash
firebase hosting:rollback --project=mundo1-1
```

#### Option 2: Revert Functions (< 2 hours)
```bash
# Redeploy previous version from git
git checkout <PREVIOUS_COMMIT>
firebase deploy --only functions --project=mundo1-1
```

#### Option 3: Restore Firestore Writes (< 4 hours)
- [ ] Restore previous function code that writes to Firestore
- [ ] Redeploy functions
- [ ] Verify writes going to Firestore
- [ ] Investigate Cloud SQL issues offline

### Rollback Criteria
Rollback if:
- [ ] Error rate > 5% for more than 10 minutes
- [ ] Database connection failures
- [ ] User-reported data loss
- [ ] Performance degradation > 10x normal
- [ ] Critical security issue discovered

---

## Sign-Off

### Deployment Completed By
**Name**: _______________________________________________  
**Date**: _______________________________________________  
**Time**: _______________________________________________

### Verification Completed By
**Name**: _______________________________________________  
**Date**: _______________________________________________  
**Time**: _______________________________________________

### Production Approval
**Name**: _______________________________________________  
**Date**: _______________________________________________  
**Time**: _______________________________________________

---

## Notes & Issues Encountered

```
[Document any issues, workarounds, or notable observations during deployment]









```

---

## Success Metrics

**Before Migration**:
- Firestore read operations/day: _______________________________________________
- Firestore write operations/day: _______________________________________________
- Average search latency: _______________________________________________
- Monthly Firestore cost: $_______________________________________________

**After Migration (Week 1)**:
- Cloud SQL queries/day: _______________________________________________
- Average search latency: _______________________________________________
- Database CPU usage (avg): _______________________________________________
- Monthly Cloud SQL cost: $_______________________________________________

**Cost Savings**: $_______________________________________________/month

**Performance Improvement**: _______________________________________________% faster/slower

---

## Post-Mortem

**What Went Well**:
```






```

**What Could Be Improved**:
```






```

**Action Items for Future Deployments**:
```






```
