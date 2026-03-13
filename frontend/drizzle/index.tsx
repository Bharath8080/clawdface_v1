import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is missing. Database operations via Drizzle will fail.');
}

// Logic for handling Supabase local development via Docker if needed
let finalConnectionString = connectionString || '';
try {
  if (finalConnectionString.includes('postgres:postgres@supabase_db_')) {
    const url = new URL(finalConnectionString);
    url.hostname = url.hostname.split('_')[1];
    finalConnectionString = url.href;
  }
} catch (e) {
  // Ignore URL parsing errors and fallback to original
}

// Disable prefetch as it is not supported for "Transaction" pool mode if using pooler
const client = postgres(finalConnectionString, { 
  prepare: false,
  ssl: finalConnectionString.includes('pooler.supabase.com') || finalConnectionString.includes('supabase.co') ? 'require' : false 
});

export const db = drizzle(client, { schema });
export * from './schema';
