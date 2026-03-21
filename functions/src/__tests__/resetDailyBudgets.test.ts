/**
 * Unit tests for resetDailyBudgets — daily budget reset logic.
 *
 * Tests the exported `runDailyBudgetReset` function directly (no scheduler
 * wrapper) using a Firestore mock so no real Firebase connection is needed.
 */

import { runDailyBudgetReset } from '../resetDailyBudgets'

// ─── Firestore mock helpers ───────────────────────────────────────────────────

function makeDoc(id: string, data: Record<string, unknown>) {
  const ref = {
    _updates: [] as Record<string, unknown>[],
    update(fields: Record<string, unknown>) {
      this._updates.push(fields)
    },
  }
  return { id, data: () => data, ref }
}

function makeBatch(docs: ReturnType<typeof makeDoc>[]) {
  const updates: Array<{ ref: (typeof docs)[number]['ref']; fields: Record<string, unknown> }> = []
  return {
    update(ref: (typeof docs)[number]['ref'], fields: Record<string, unknown>) {
      updates.push({ ref, fields })
    },
    async commit() {},
    _updates: updates,
  }
}

function makeDb(docs: ReturnType<typeof makeDoc>[]) {
  const batch = makeBatch(docs)
  return {
    _batch: batch,
    collection(_name: string) {
      return {
        where(_f: string, _op: string, _v: unknown) {
          return {
            where(_f2: string, _op2: string, _v2: unknown) {
              return {
                async get() {
                  return { empty: docs.length === 0, docs }
                },
              }
            },
          }
        },
      }
    },
    batch() {
      return batch
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runDailyBudgetReset', () => {
  it('returns 0 and does nothing when there are no daily-budget campaigns', async () => {
    const db = makeDb([])
    const count = await runDailyBudgetReset(db as any)
    expect(count).toBe(0)
    expect(db._batch._updates).toHaveLength(0)
  })

  it('resets budgetCents from budgetAmount for an active campaign', async () => {
    const doc = makeDoc('camp-1', {
      budgetType: 'daily',
      budgetAmount: '10',
      status: 'active',
    })
    const db = makeDb([doc])
    const count = await runDailyBudgetReset(db as any)

    expect(count).toBe(1)
    expect(db._batch._updates).toHaveLength(1)
    expect(db._batch._updates[0].fields.budgetCents).toBe(1000) // $10.00 = 1000 cents
    // Active campaigns keep their status (no status field in the update)
    expect(db._batch._updates[0].fields.status).toBeUndefined()
  })

  it('resets budgetCents AND sets status to active for a paused campaign', async () => {
    const doc = makeDoc('camp-2', {
      budgetType: 'daily',
      budgetAmount: '5',
      status: 'paused',
    })
    const db = makeDb([doc])
    const count = await runDailyBudgetReset(db as any)

    expect(count).toBe(1)
    expect(db._batch._updates[0].fields.budgetCents).toBe(500) // $5.00 = 500 cents
    expect(db._batch._updates[0].fields.status).toBe('active')
  })

  it('skips campaigns with missing or zero budgetAmount', async () => {
    const doc1 = makeDoc('camp-zero', {
      budgetType: 'daily',
      budgetAmount: '0',
      status: 'active',
    })
    const doc2 = makeDoc('camp-missing', {
      budgetType: 'daily',
      status: 'active',
    })
    const db = makeDb([doc1, doc2])
    const count = await runDailyBudgetReset(db as any)

    expect(count).toBe(0)
    expect(db._batch._updates).toHaveLength(0)
  })

  it('handles multiple campaigns in a single batch', async () => {
    const docs = [
      makeDoc('camp-a', { budgetType: 'daily', budgetAmount: '5', status: 'active' }),
      makeDoc('camp-b', { budgetType: 'daily', budgetAmount: '20', status: 'paused' }),
      makeDoc('camp-c', { budgetType: 'daily', budgetAmount: '50', status: 'active' }),
    ]
    const db = makeDb(docs)
    const count = await runDailyBudgetReset(db as any)

    expect(count).toBe(3)
    expect(db._batch._updates).toHaveLength(3)

    const updateA = db._batch._updates.find(u => u.ref === docs[0].ref)
    const updateB = db._batch._updates.find(u => u.ref === docs[1].ref)
    const updateC = db._batch._updates.find(u => u.ref === docs[2].ref)

    expect(updateA?.fields.budgetCents).toBe(500)
    expect(updateA?.fields.status).toBeUndefined() // active, no status change

    expect(updateB?.fields.budgetCents).toBe(2000)
    expect(updateB?.fields.status).toBe('active') // paused → active

    expect(updateC?.fields.budgetCents).toBe(5000)
    expect(updateC?.fields.status).toBeUndefined() // active, no status change
  })

  it('correctly parses decimal budgetAmount values', async () => {
    const doc = makeDoc('camp-decimal', {
      budgetType: 'daily',
      budgetAmount: '7.50',
      status: 'active',
    })
    const db = makeDb([doc])
    await runDailyBudgetReset(db as any)

    expect(db._batch._updates[0].fields.budgetCents).toBe(750) // $7.50 = 750 cents
  })

  it('resets are idempotent — running twice produces the same budgetCents', async () => {
    const doc = makeDoc('camp-idem', {
      budgetType: 'daily',
      budgetAmount: '15',
      status: 'active',
    })
    const db = makeDb([doc])
    await runDailyBudgetReset(db as any)
    const firstUpdate = db._batch._updates[0].fields.budgetCents

    // Simulate a second run on the same day
    await runDailyBudgetReset(db as any)
    const secondUpdate = db._batch._updates[1]?.fields.budgetCents ?? db._batch._updates[0].fields.budgetCents

    expect(firstUpdate).toBe(1500)
    expect(secondUpdate).toBe(1500)
  })
})
