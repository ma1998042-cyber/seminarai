import { drizzle } from 'drizzle-orm/d1'
import { getRequestContext } from '@cloudflare/next-on-pages'
import * as schema from './schema'

export type DB = ReturnType<typeof getDb>

export function getDb() {
  const { env } = getRequestContext()
  return drizzle((env as { DB: D1Database }).DB, { schema })
}

export * from './schema'
