// Lightweight Prisma client singleton for Cloud Functions
// Use DATABASE_URL in env for local/dev (via Cloud SQL Auth Proxy)
// For production on Cloud Functions, use the Cloud SQL Auth Proxy or the Cloud Functions "Connections" setting.

import { PrismaClient } from '@prisma/client';

// We'll create a lazy-initialized Prisma client. To keep existing call sites
// working (they expect `prisma.model.method()` synchronously), export a Proxy
// that defers method calls until the underlying Prisma client is ready.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaInitPromise: Promise<void> | undefined;
}

let _prisma: PrismaClient | undefined = global.__prisma;

async function initPrisma() {
  if (_prisma) return;

  // Resolve DB URL from environment (Secret Manager maps this into process.env at runtime).
  // We intentionally avoid keeping plaintext secrets in code. If DATABASE_URL is missing
  // the function should fail fast with a clear log so the deployment configuration can be fixed.
  let dbUrl = process.env.DATABASE_URL;

  // Normalize a few common secret encodings so Prisma's URL parser accepts them.
  if (dbUrl) {
    dbUrl = dbUrl.trim();

    // If the secret contains percent-encoded '/cloudsql' in the authority (e.g. @%2Fcloudsql%2F...)
    // decode it and convert to query param `host=/cloudsql/...` with a non-empty authority (localhost).
    try {
      if (/%2Fcloudsql/i.test(dbUrl) || /%252Fcloudsql/i.test(dbUrl)) {
        // decode once (handles both single and double-encoded)
        let decoded = decodeURIComponent(dbUrl);
        if (/%2Fcloudsql/i.test(decoded)) decoded = decodeURIComponent(decoded);
        // Pull out user:pass and db name if present
        const m = decoded.match(/^postgres(?:ql)?:\/\/(?<auth>[^@]+)@(?<hostpart>[^\/]*)(?<rest>\/.*)?$/i);
        if (m && m.groups) {
          const auth = m.groups['auth'];
          const rest = m.groups['rest'] || '';
          // Find the socket path inside decoded. Instance connection names contain
          // colons (project:region:instance) so allow colons in the match. Also
          // tolerate an accidental ":5432" suffix (some DSNs include a port) by
          // stripping it when building a unix-socket based DSN.
          const socketMatch = decoded.match(/(\/cloudsql\/[^?\s]+)/i);
          let socket = socketMatch ? socketMatch[1] : null;
          if (socket && /:5432$/.test(socket)) {
            // strip an accidental ":5432" suffix which would confuse the unix
            // socket path parsing
            socket = socket.replace(/:5432$/, '');
          }
          const query = decoded.includes('?') ? decoded.substring(decoded.indexOf('?')) : '';
          const dbnameMatch = rest.match(/\/(?<db>[^\?\/]+)/);
          const dbname = dbnameMatch && dbnameMatch.groups ? dbnameMatch.groups['db'] : '';
          if (socket) {
            // Build a canonical DSN with localhost authority and host query param pointing to the socket.
            // For unix-socket connections the Postgres server does not expect a TLS handshake,
            // so prefer sslmode=disable to avoid "server does not support TLS" errors.
            const canonical = `postgresql://${auth}@localhost:5432/${dbname}${query ? query + '&' : '?'}host=${encodeURIComponent(socket)}&sslmode=disable`;
            dbUrl = canonical;
          }
        }
      }

      // If DSN has empty authority like postgresql://user:pass@/dbname?host=/cloudsql/..., inject localhost:5432
      if (/postgres(?:ql)?:\/\/[^@]+@\//i.test(dbUrl)) {
        dbUrl = dbUrl.replace(/(postgres(?:ql)?:\/\/[^@]+@)\//i, '$1localhost:5432/');
      }

      // If the DSN already uses query param host but authority host is percent-encoded, ensure authority is localhost
      if (/\?[^#]*host=%2Fcloudsql/i.test(dbUrl) && /@%2F/.test(dbUrl)) {
        // replace the encoded authority with 'localhost:5432'
        dbUrl = dbUrl.replace(/@%2F[^:]+(:\d+)?/i, '@localhost:5432');
      }
      // Additional defensive sanitization:
      // - strip CR/LF and embedded nulls that sometimes appear when secrets are created
      // - remove accidental trailing '%' characters or other stray punctuation at the end
      // - ensure no leftover whitespace
      dbUrl = dbUrl.replace(/[\r\n\u0000]/g, '');
      // Remove a single trailing percent or multiple percent chars if they appear at the end
      dbUrl = dbUrl.replace(/%+$/g, '');
      dbUrl = dbUrl.trim();

      // If there's a /cloudsql path anywhere but no host= query param, add one with sslmode=disable
      if (/\/cloudsql\/[^?&]+/i.test(dbUrl) && !/[?&]host=/i.test(dbUrl)) {
        const sock = (dbUrl.match(/(\/cloudsql\/[^?&\s]+)/i) || [])[1];
        if (sock) {
          const socket = sock.replace(/:5432$/i, '');
          // Ensure authority is present
          if (/postgres(?:ql)?:\/\/[^^@]+@\//i.test(dbUrl)) {
            dbUrl = dbUrl.replace(/(postgres(?:ql)?:\/\/[^@]+@)\//i, '$1localhost:5432/');
          }
          if (dbUrl.includes('?')) dbUrl = dbUrl + '&host=' + encodeURIComponent(socket) + '&sslmode=disable';
          else dbUrl = dbUrl + '?host=' + encodeURIComponent(socket) + '&sslmode=disable';
        }
      }
    } catch (e) {
      console.warn('[prismaClient-debug] normalization failed', (e as Error).message);
    }
  }

  // Temporary diagnostic output (masked) to debug Secret Manager / Cloud Run injection issues.
  try {
    const rawLen = dbUrl ? dbUrl.length : 0;
    const containsCloudsql = !!dbUrl && dbUrl.includes('/cloudsql');
    const containsPct = !!dbUrl && (dbUrl.includes('%2F') || dbUrl.includes('%252F'));
    const masked = dbUrl
      ? dbUrl.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@)/, (_m, p1, _p2, p3) => `${p1}****${p3}`)
      : '<undefined>';
    console.info('[prismaClient-debug] DATABASE_URL length=%d containsCloudsql=%s containsPct=%s masked=%s', rawLen, containsCloudsql, containsPct, masked);
  } catch (e) {
    console.info('[prismaClient-debug] failed to stringify DATABASE_URL for debug', (e as Error).message);
  }

  if (!dbUrl) {
    console.error('[prismaClient] No DATABASE_URL resolved from env; ensure Secret Manager mapping or environment variable is configured');
    throw new Error('DATABASE_URL not set');
  }

  try {
    // Log the target host/db (masking credentials) for quick verification in logs
    try {
      const u = new URL(dbUrl as string);
      const dbName = u.pathname ? u.pathname.replace(/^\//, '') : '<unknown>';
      console.info(`[prismaClient] Connecting to ${u.hostname}:${u.port || 'default'} database=${dbName}`);
    } catch (e) {
      console.info('[prismaClient] DATABASE_URL present but failed to parse for masked logging');
    }

    // Pass the resolved URL explicitly into Prisma so it doesn't rely purely on global env timing
    _prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  } catch (e) {
    console.error('[prismaClient] Failed to create PrismaClient', (e as Error).message);
    throw e;
  }
  if (process.env.NODE_ENV !== 'production') global.__prisma = _prisma;
}

// Do NOT start init on module load. Instead, initialize lazily when the proxy is first used.
// This prevents functions that don't use Prisma from attempting DB connections during module load.
// global.__prismaInitPromise will be set on first access inside the proxy below.

// Generic handler that returns proxies for model access and method calls.
const lazyHandler: ProxyHandler<any> = {
  get(_target, prop: string | symbol) {
    if (prop === 'then') {
      // Allow proxy to not be treated as a Promise by some consumers
      return undefined;
    }

    // Return a nested proxy for models and method names
    return new Proxy(function () {}, {
      get(__t, method: string | symbol) {
        return async (...args: any[]) => {
          // Ensure initialization starts if it hasn't yet
          global.__prismaInitPromise = global.__prismaInitPromise || initPrisma();
          await global.__prismaInitPromise;
          const client = _prisma as any;
          const model = (client as any)[prop as any];
          if (!model) {
            // If it's a top-level method (e.g., $connect, $disconnect)
            const top = (client as any)[method as any];
            if (typeof top === 'function') return top.apply(client, args);
            throw new Error(`Prisma client has no property ${String(prop)} or method ${String(method)}`);
          }
          const fn = model[method as any];
          if (typeof fn !== 'function') throw new Error(`Prisma model ${String(prop)} has no method ${String(method)}`);
          return fn.apply(model, args);
        };
      },
      apply(__t, thisArg, argArray) {
        // Support direct function calls like prisma.$connect()
        return (async () => {
          await global.__prismaInitPromise;
          const client = _prisma as any;
          if (typeof client[prop as any] === 'function') return (client as any)[prop as any].apply(client, argArray);
          throw new Error(`Prisma client has no callable property ${String(prop)}`);
        })();
      }
    });
  }
};

const proxy = new Proxy({}, lazyHandler) as any;

export default proxy;
