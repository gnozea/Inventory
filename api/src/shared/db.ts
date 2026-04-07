import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool;
  }

  const connectionString = process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('[db] SQL_CONNECTION_STRING is not set in environment variables.');
  }

  try {
    pool = null;
    pool = await sql.connect(connectionString);

    pool.on('error', (err) => {
      console.error('[db] Pool error:', err.message);
      pool = null;
    });

    console.log('[db] Connected to SQL database');
    return pool;
  } catch (err: any) {
    pool = null;
    console.error('[db] Failed to connect:', err.message);
    throw err;
  }
}