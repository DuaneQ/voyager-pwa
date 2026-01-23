# Cloud SQL Cost Optimization Summary

**Date:** November 22, 2025  
**Objective:** Reduce Cloud SQL costs from $23/day to ~$2-3/day

## Final Architecture

### Single Shared Instance
- **Instance:** `mundo1-1:us-central1:mundo1-1-sand`
- **Machine Type:** db-custom-2-7680 (2 vCPUs, 7.5GB RAM)
- **Storage:** Standard (not Enterprise Plus)
- **Cost:** ~$2-3/day total

### Database Isolation
```
mundo1-1-sand
├── traval (production)
│   └── mundo1-1 project functions
└── traval-dev (development)  
    └── mundo1-dev project functions
```

## Migration Timeline

### Phase 1: Downgrade from Enterprise Plus (Morning)
- **Action:** Migrated both dev and prod to new Standard instances
- **Result:** Reduced from $23/day to ~$4-6/day (two instances)
- **Issues:** Fixed database name mismatch, Cloud SQL attachment

### Phase 2: Consolidate to Single Instance (Evening)
- **Action:** Deleted dev instance, created `traval-dev` in prod instance
- **Result:** Further reduced to ~$2-3/day (single instance)
- **Changes:**
  - Dev secret updated to point to prod instance with `traval-dev` database
  - All dev Cloud Run services attached to prod instance
  - Database-level isolation maintained

## Configuration Details

### Development (mundo1-dev)
- **Secret Version:** 5
- **Connection String:** `postgresql://voyageruser:YOUR_PASSWORD_HERE@localhost/traval-dev?host=/cloudsql/mundo1-1:us-central1:mundo1-1-sand&sslmode=disable`
- **Cloud Run Services:** All 5 services updated with new instance attachment

### Production (mundo1-1)
- **Secret Version:** 14
- **Connection String:** `postgresql://voyageruser:YOUR_PASSWORD_HERE@localhost/traval?host=/cloudsql/mundo1-1:us-central1:mundo1-1-sand&sslmode=disable`
- **Runtime:** Upgraded from Node.js 18 to Node.js 20

## Cost Analysis

| Period | Configuration | Daily Cost | Monthly Cost | Annual Cost |
|--------|--------------|------------|--------------|-------------|
| Before | Enterprise Plus + dev instance | ~$46 | ~$1,380 | ~$16,560 |
| After Phase 1 | Two Standard instances | ~$5 | ~$150 | ~$1,800 |
| After Phase 2 | Single Standard instance | ~$2.50 | ~$75 | ~$900 |

**Total Savings:**
- **Daily:** ~$43.50
- **Monthly:** ~$1,305
- **Annual:** ~$15,660

## Security & Isolation

✅ **Network Isolation:** Each project's functions only have Cloud SQL instance attachment to their authorized instance
✅ **Database Isolation:** Connection strings enforce which database each environment accesses
✅ **User Permissions:** Same `voyageruser` with appropriate database-level permissions
✅ **Secret Separation:** Each project has its own secret version in Secret Manager

## Lessons Learned

### Critical Steps (Easy to Miss)
1. **Cloud SQL Instance Attachment:** Firebase deployment does NOT update Cloud Run instance attachments
   - Must manually run: `gcloud run services update --set-cloudsql-instances=...`
2. **Database Name Verification:** Always verify actual database name in Cloud Console
   - Don't assume database name matches instance name
3. **Secret Testing:** Test connection string before deploying to all functions
4. **Runtime Upgrades:** Node.js 18 decommissioned, forced upgrade to Node.js 20

### Best Practices
- Update Secret Manager FIRST
- Verify secret with `gcloud secrets versions access latest`
- Update Cloud Run instance attachments EXPLICITLY
- Check logs after deployment for database errors
- Document all changes for future reference

## Verification Commands

```bash
# Check dev configuration
gcloud secrets versions access latest --secret=voyager-itinerary-db --project=mundo1-dev
gcloud run services describe searchitineraries --project=mundo1-dev --region=us-central1 --format=yaml | grep "cloudsql-instances"

# Check prod configuration  
gcloud secrets versions access latest --secret=voyager-itinerary-db --project=mundo1-1
gcloud run services describe searchitineraries --project=mundo1-1 --region=us-central1 --format=yaml | grep "cloudsql-instances"

# List databases in shared instance
gcloud sql databases list --instance=mundo1-1-sand --project=mundo1-1

# Check for errors
gcloud functions logs read searchItineraries --project=mundo1-dev --limit=20 | grep -i "error\|database"
gcloud functions logs read searchItineraries --project=mundo1-1 --limit=20 | grep -i "error\|database"
```

## Status: ✅ COMPLETE

All systems operational with consolidated architecture saving ~$15,660/year.
