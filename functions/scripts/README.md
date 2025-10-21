# Database Scripts

This directory contains utility scripts for database operations, testing, and migrations.

---

## migrate-firestore-to-postgres.ts

**Production migration script** that transfers all itineraries from Firestore to Cloud SQL (Postgres).

### Features

- ✅ Batch processing (100 records per batch)
- ✅ Idempotent (uses upsert - can re-run safely)
- ✅ Progress tracking with detailed logging
- ✅ Dry-run mode for testing
- ✅ Resume capability from any point
- ✅ Error handling with individual retry
- ✅ Data validation and count verification

### Usage

```bash
# Ensure Cloud SQL Auth Proxy is running
./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432 &

# Set DATABASE_URL
export DATABASE_URL="postgresql://USER:PASS@127.0.0.1:5432/DB"

cd functions

# Dry run (no writes to database)
npx ts-node scripts/migrate-firestore-to-postgres.ts --dry-run

# Full migration with verbose logging
npx ts-node scripts/migrate-firestore-to-postgres.ts --verbose

# Resume from specific document ID (if interrupted)
npx ts-node scripts/migrate-firestore-to-postgres.ts --resume-from=doc123abc
```

### Pre-Migration Checklist

1. ✅ Cloud SQL instance provisioned and accessible
2. ✅ Prisma schema deployed (`npx prisma migrate deploy`)
3. ✅ Firestore backup created:
   ```bash
   gcloud firestore export gs://BUCKET/backup-$(date +%Y%m%d) \
     --collection-ids=itineraries --project=PROJECT
   ```
4. ✅ Database connection tested
5. ✅ Dry-run completed successfully

### Post-Migration Validation

```bash
# Check counts match
echo "Firestore count:"
# Check in Firebase Console or use Admin SDK

echo "Postgres count:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Itinerary\";"

# Validate data quality
psql "$DATABASE_URL" -c "
  SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT \"userId\") as unique_users,
    COUNT(CASE WHEN destination IS NULL THEN 1 END) as missing_destination,
    MIN(\"startDate\") as earliest_trip,
    MAX(\"startDate\") as latest_trip
  FROM \"Itinerary\";
"
```

### Troubleshooting

- **Connection refused**: Check Cloud SQL Auth Proxy is running and DATABASE_URL is correct
- **Count mismatch**: Re-run with `--verbose` to see which records failed
- **Transformation errors**: Check Firestore data format matches expected schema
- **Timeout errors**: Reduce BATCH_SIZE in script (default: 100)

---

## seed-test-itineraries.ts

Seeds the database with 1000 test itineraries for testing server-side filtering.

### What it does:
- Creates **50 matching itineraries** that meet specific search criteria
- Creates **950 non-matching itineraries** that should be filtered out
- All itineraries are shuffled randomly in the database

### Test User Profile:
The script creates itineraries that match this profile:
- **Destination**: Paris, France
- **Gender**: Male
- **Status**: Single
- **Sexual Orientation**: Straight
- **Dates**: December 1-15, 2025
- **Age Range**: 25-35 years old

### Usage:

1. Make sure you're connected to the development database (check `.env` file)

2. Run the seeding script:
```bash
cd functions
npx ts-node scripts/seed-test-itineraries.ts
```

3. Test in the UI:
   - Create an itinerary with destination "Paris, France"
   - Set dates around December 1-15, 2025
   - Search should return only 50 matching itineraries (not all 1000)
   - Pagination should show 10 results at a time
   - Viewed itineraries should be excluded on subsequent searches

### Cleanup:
The script automatically cleans up any existing test data (itineraries with IDs starting with `test-match-` or `test-nomatch-`) before seeding.

### Notes:
- The 950 non-matching itineraries are distributed across:
  - **70%**: Different destinations (Tokyo, London, New York, etc.)
  - **20%**: Different date ranges (no overlap with test dates)
  - **10%**: Different age ranges (outside 25-35)
- This tests that the server-side filtering correctly excludes itineraries based on:
  - Destination mismatch
  - No date overlap
  - Age preferences
  - Gender/status/orientation preferences
