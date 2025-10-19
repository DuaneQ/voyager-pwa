# Pre-Production Deployment Checklist

## Code Quality

- [ ] All console.log statements removed (except errors/warnings)
- [ ] All debug code removed
- [ ] All test data seeds removed or commented out
- [ ] No hardcoded credentials in code
- [ ] Environment variables configured for production
- [ ] TypeScript compilation successful with no errors
- [ ] ESLint passes with no warnings
- [ ] All tests pass

## Database

- [ ] Prisma schema matches production requirements
- [ ] All migrations tested in staging environment
- [ ] Indexes created for performance-critical queries
- [ ] Database backup strategy verified
- [ ] Connection pooling configured
- [ ] Firestore to Cloud SQL migration script tested
- [ ] Data integrity validation queries prepared

## Security

- [ ] API keys stored in Secret Manager (not code)
- [ ] Database password rotated and stored securely
- [ ] Firestore security rules reviewed
- [ ] Cloud Function authentication enforced
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Sensitive data encrypted

## Performance

- [ ] Cloud SQL instance sized appropriately
- [ ] Database query performance tested under load
- [ ] Frontend bundle size optimized
- [ ] Images compressed and optimized
- [ ] CDN configured for static assets
- [ ] Service worker caching strategy reviewed
- [ ] PAGE_SIZE set to production value (10)

## Monitoring & Logging

- [ ] Cloud Functions logging configured
- [ ] Error tracking setup (Sentry/etc)
- [ ] Performance monitoring enabled
- [ ] Alerts configured for critical errors
- [ ] Dashboard created for key metrics
- [ ] Log retention policy set

## Testing

- [ ] Unit tests pass (all 14 tests for AI modal)
- [ ] Integration tests pass
- [ ] E2E tests pass for critical user flows
- [ ] Search functionality tested with production data
- [ ] Blocking feature verified
- [ ] Viewed itineraries persistence tested
- [ ] Like/match flow tested
- [ ] AI generation tested (premium users)

## Deployment

- [ ] Production Firebase project selected
- [ ] Cloud Functions deployment command verified
- [ ] Frontend build command verified
- [ ] Rollback plan documented
- [ ] Post-deployment verification scripts ready
- [ ] Team notified of deployment window
- [ ] On-call engineer assigned

## Post-Deployment Verification

- [ ] Search returns expected results
- [ ] Blocked users excluded correctly
- [ ] New itinerary creation works
- [ ] AI generation works for premium users
- [ ] Payment flow works (Stripe)
- [ ] No 500 errors in logs
- [ ] Response times < 2s for searches
- [ ] Database connections stable

## Documentation

- [ ] Production deployment guide complete
- [ ] Migration script documented
- [ ] Rollback procedures documented
- [ ] Troubleshooting guide updated
- [ ] API documentation current
- [ ] Environment variables documented

## Final Checks

- [ ] All team members reviewed changes
- [ ] Product owner signed off
- [ ] QA team approved
- [ ] Legal/compliance reviewed (if applicable)
- [ ] Change management ticket created
- [ ] Maintenance window scheduled (if needed)

---

## Deployment Command Checklist

```bash
# 1. Switch to production project
firebase use mundo1-1

# 2. Verify you're on the correct project
firebase projects:list

# 3. Run production build
npm run build

# 4. Deploy Cloud Functions
firebase deploy --only functions:searchItineraries,functions:listItinerariesForUser,functions:createItinerary,functions:updateItinerary,functions:deleteItinerary

# 5. Deploy Frontend
firebase deploy --only hosting

# 6. Run post-deployment verification
npm run verify:production
```

---

## Emergency Contacts

- **On-Call Engineer**: [Phone/Slack]
- **DevOps Lead**: [Contact]
- **Database Admin**: [Contact]
- **Product Owner**: [Contact]

---

**Sign-off:**

- [ ] Developer: _______________ Date: _______________
- [ ] QA: _______________ Date: _______________
- [ ] DevOps: _______________ Date: _______________
- [ ] Product Owner: _______________ Date: _______________
