Cloud SQL connection options and Prisma setup for `functions/`

This file explains the recommended ways to connect your Firebase Functions to Cloud SQL (PostgreSQL) and how to use Prisma.

Options
-------

1) Use the built-in Cloud Functions / Cloud SQL integration (recommended for production)
   - In the Cloud Console, go to your Cloud Function, click "Edit" -> "Connections" -> add your Cloud SQL instance under "Cloud SQL connections".
   - This lets Functions connect via a Unix socket without exposing a public IP.
   - See: https://cloud.google.com/functions/docs/connect-cloud-sql

2) Use the Cloud SQL Auth Proxy (recommended for local development and CI)
   - Start the proxy locally and set DATABASE_URL to point at localhost.
   - Example:
     1. Download the proxy: https://cloud.google.com/sql/docs/postgres/connect-admin-proxy#install
     2. Run:

        ./cloud_sql_proxy -instances=<PROJECT>:<REGION>:<INSTANCE>=tcp:5432

     3. Set env: DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE"

   - See: https://cloud.google.com/sql/docs/postgres/connect-admin-proxy

3) Use public IP (easier for quick tests, not recommended for production)
   - Enable Public IP on your instance (you have done this on traval-dev).
   - Add your IP to the authorized networks.
   - Use DATABASE_URL with the public IP.

Prisma setup
------------

1. Install dependencies in `functions/`:

   cd functions
   npm install prisma @prisma/client

2. Generate client and run migrations (local):

   npx prisma generate
   npx prisma migrate dev --name init

3. Use the helper at `functions/src/db/prismaClient.ts` to import a singleton Prisma client in your functions.

Environment
-----------

- `functions/.env` (local) or Cloud Functions environment variables must include:

  DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

- For Cloud Functions with Cloud SQL connections, you can still use DATABASE_URL but set HOST to the unix socket path, or prefer using the socket helper in Node (see example below).

Example connection in a Function (socket):

  const socketPath = `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    host: socketPath,
  });

Additional links
----------------
- Cloud SQL quickstart: https://cloud.google.com/sql/docs/postgres/quickstart
- Cloud Functions connect to Cloud SQL: https://cloud.google.com/functions/docs/connect-cloud-sql
- Prisma docs: https://www.prisma.io/docs

