# Cloud SQL Migration - Quick Reference

**Status**: Ready for production deployment  
**Dev Environment**: ✅ Tested and working (mundo1-dev)  
**Production**: 📋 Ready to deploy (mundo1-1)

---

## Overview

We're migrating itinerary storage from **Firestore** to **Cloud SQL (Postgres)** with Prisma ORM.

### Why?
- **Better filtering**: Server-side filtering with SQL queries (no client-side loops)
- **Cost savings**: 70-80% reduction in Firestore read operations via caching
- **Performance**: Faster searches with proper indexing
- **Scalability**: Relational database better suited for complex queries

### What's Changed?
- **Storage**: Firestore → Cloud SQL (Postgres)
- **ORM**: Direct Firestore SDK → Prisma
- **Functions**: All itinerary RPCs now use Prisma + Cloud SQL
- **API**: No changes - same function signatures

---

## Quick Links

📖 **Main Documentation**: [`PRODUCTION_CLOUDSQL.md`](../PRODUCTION_CLOUDSQL.md)  
✅ **Deployment Checklist**: [`PRODUCTION_DEPLOYMENT_CHECKLIST.md`](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)  
🔧 **Scripts README**: [`README.md`](./README.md)

---

## Key Files

### Functions (Already Upgraded to 2nd Gen)
- ✅ `functions/src/functions/itinerariesRpc.ts` - All CRUD operations
  - `createItinerary` - Create new itinerary
  - `updateItinerary` - Update existing itinerary
  - `deleteItinerary` - Delete itinerary
  - `listItinerariesForUser` - Get user's itineraries
  - `searchItineraries` - Search with filters (destination, dates, age, etc.)

### Database
- `functions/prisma/schema.prisma` - Database schema definition
- `functions/src/db/prismaClient.ts` - Prisma client singleton

### Scripts
- `scripts/migrate-firestore-to-postgres.ts` - Production migration script
- `scripts/seed-test-itineraries.ts` - Test data seeding (1000 records)

### Frontend (No Changes Required)
- `src/hooks/useSearchItineraries.tsx` - Search hook (already uses RPC functions)
- `src/hooks/usePostItineraryToFirestore.ts` - Create hook (already uses RPC)

---

## Dev Environment Status

### ✅ Completed
- Cloud SQL instance created (`traval-dev`)
- Database and user configured
- Prisma schema deployed
- All 5 RPC functions upgraded to 2nd Gen
- Functions deployed with Cloud SQL connection
- Secrets configured in Secret Manager
- Tests passing (30/30)
- Seeding script tested

### 🧪 Testing
```bash
# Test creating itinerary
curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/createItinerary" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"userId":"test","destination":"Paris","startDate":"2025-12-01","endDate":"2025-12-15"}}'

# Test search
curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/searchItineraries" \
  -H "Content-Type: application/json" \
  -d '{"data":{"destination":"Paris","pageSize":10}}'
```

---

## Production Deployment Overview

### Timeline (Recommended)
- **Week 1**: Pre-production setup (provision Cloud SQL, configure secrets)
- **Week 2**: Deploy functions + run migration (during low-traffic window)
- **Week 3-4**: Monitor and optimize
- **Month 2**: Archive Firestore data after 30 days stable

### Critical Steps (4-Hour Window)
1. **T-30min**: Backup Firestore data
2. **T+0min**: Deploy Cloud Functions with Cloud SQL connection
3. **T+10min**: Run migration script (Firestore → Postgres)
4. **T+30min**: Validate data (counts match, no errors)
5. **T+40min**: Deploy frontend (no code changes needed)
6. **T+50min**: Smoke test all CRUD operations
7. **T+60min**: Monitor metrics for 1 hour

### Success Criteria
- ✅ All itineraries migrated (Firestore count == Postgres count)
- ✅ New itineraries created successfully
- ✅ Search returns filtered results (server-side)
- ✅ Error rate < 0.1%
- ✅ Search latency < 500ms (p95)
- ✅ No database connection exhaustion

---

## Commands Cheat Sheet

### Local Development
```bash
# Start Cloud SQL Auth Proxy
./cloud_sql_proxy -instances=mundo1-dev:us-central1:traval-dev=tcp:5432

# Deploy functions (dev)
firebase use mundo1-dev
firebase deploy --only functions:searchItineraries

# Run migration script (dev)
export DATABASE_URL="postgresql://voyageruser:PASS@127.0.0.1:5432/traval"
cd functions
npx ts-node scripts/migrate-firestore-to-postgres.ts --dry-run

# Seed test data
npx ts-node scripts/seed-test-itineraries.ts
```

### Production Deployment
```bash
# Deploy functions (production)
firebase use mundo1-1
firebase deploy --only functions:createItinerary,functions:updateItinerary,functions:deleteItinerary,functions:listItinerariesForUser,functions:searchItineraries

# Attach Cloud SQL to functions
for FUNC in createitinerary updateitinerary deleteitinerary listitinerariesforuser searchitineraries; do
  gcloud run services update $FUNC \
    --add-cloudsql-instances=mundo1-1:us-central1:traval-prod \
    --set-secrets=DATABASE_URL=voyager-itinerary-db-prod:latest \
    --project=mundo1-1 --region=us-central1
done

# Run migration (production)
./cloud_sql_proxy -instances=mundo1-1:us-central1:traval-prod=tcp:5433 &
export DATABASE_URL="postgresql://voyageruser:PASS@127.0.0.1:5433/traval"
cd functions
npx ts-node scripts/migrate-firestore-to-postgres.ts --verbose
```

### Monitoring
```bash
# Check Cloud SQL metrics
gcloud sql instances describe traval-prod --project=mundo1-1

# View function logs
gcloud functions logs read searchItineraries --project=mundo1-1 --region=us-central1 --limit=50

# Check database connections
psql "$DATABASE_URL" -c "SELECT count(*), state FROM pg_stat_activity WHERE datname = 'traval' GROUP BY state;"

# Check itinerary count
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Itinerary\";"
```

---

## Troubleshooting

### "Can't reach database server"
- ✅ Check Cloud SQL Auth Proxy is running
- ✅ Verify DATABASE_URL format
- ✅ Ensure Cloud SQL instance attached to function
- ✅ Check service account has secretAccessor role

### "CORS error on preflight"
- ✅ Grant allUsers invoker role:
  ```bash
  gcloud run services add-iam-policy-binding searchitineraries \
    --member="allUsers" --role="roles/run.invoker" \
    --region=us-central1 --project=mundo1-1
  ```

### "Migration count mismatch"
- ✅ Re-run migration with `--verbose` flag
- ✅ Check logs for transformation errors
- ✅ Verify Firestore data format
- ✅ Use `--resume-from=LAST_DOC_ID` to continue

### "Too many database connections"
- ✅ Monitor `pg_stat_activity`
- ✅ Consider PgBouncer for connection pooling
- ✅ Reduce Prisma connection limit in schema

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTPS (Firebase Functions SDK)
       │
┌──────▼──────────────────────────────────┐
│   Firebase Cloud Functions (2nd Gen)    │
│   ┌─────────────────────────────────┐   │
│   │ searchItineraries               │   │
│   │ createItinerary                 │   │
│   │ updateItinerary                 │   │
│   │ deleteItinerary                 │   │
│   │ listItinerariesForUser          │   │
│   └──────────┬──────────────────────┘   │
│              │                           │
│   ┌──────────▼──────────────────────┐   │
│   │      Prisma Client              │   │
│   └──────────┬──────────────────────┘   │
└──────────────┼──────────────────────────┘
               │ Unix Socket: /cloudsql/PROJECT:REGION:INSTANCE
               │
┌──────────────▼──────────────────────────┐
│      Cloud SQL (PostgreSQL)             │
│      Instance: traval-prod              │
│      Database: traval                   │
│                                          │
│   ┌──────────────────────────────────┐  │
│   │      Itinerary Table             │  │
│   │  ┌────────────────────────────┐  │  │
│   │  │ id (PK)                    │  │  │
│   │  │ userId                     │  │  │
│   │  │ destination                │  │  │
│   │  │ startDate, endDate         │  │  │
│   │  │ startDay, endDay (BigInt)  │  │  │
│   │  │ age, gender, status, etc   │  │  │
│   │  └────────────────────────────┘  │  │
│   └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Next Steps

### 🎯 Immediate (This Week)
1. Review [`PRODUCTION_DEPLOYMENT_CHECKLIST.md`](./PRODUCTION_DEPLOYMENT_CHECKLIST.md)
2. Schedule deployment window (recommended: 2-4 AM, mid-week)
3. Communicate to team about deployment schedule

### 📋 Pre-Deployment (1 Week Before)
1. Provision production Cloud SQL instance (`traval-prod`)
2. Configure Secret Manager with production credentials
3. Run Prisma migrations on production database
4. Test migration script with `--dry-run` in dev

### 🚀 Deployment Day
1. Follow [`PRODUCTION_DEPLOYMENT_CHECKLIST.md`](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) step-by-step
2. Create Firestore backup before starting
3. Deploy functions with Cloud SQL connection
4. Run migration script with `--verbose`
5. Validate data counts match
6. Deploy frontend (no changes needed)
7. Smoke test all operations
8. Monitor for 2-4 hours

### 📊 Post-Deployment (First Week)
1. Monitor Cloud SQL metrics hourly
2. Check function logs for errors
3. Track user feedback
4. Document any issues encountered
5. Optimize queries with indexes if needed

---

## Support

**Questions?** Reference the main documentation or reach out to the team.

**Issues During Deployment?** Follow the rollback plan in the deployment checklist.

**Performance Issues?** Check the optimization section in PRODUCTION_CLOUDSQL.md.

---

**Last Updated**: 2025-10-18  
**Version**: 1.0  
**Status**: Ready for Production Deployment
