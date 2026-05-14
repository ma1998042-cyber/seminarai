'use server'

import { getDb, users, userProfiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function registerUser(data: {
  email: string
  password: string
  fullName: string
}): Promise<{ error?: string }> {
  const db = getDb()

  const existing = await db.select().from(users).where(eq(users.email, data.email)).get()
  if (existing) return { error: 'このメールアドレスは既に登録されています' }

  const hashed = await bcrypt.hash(data.password, 12)

  const user = await db
    .insert(users)
    .values({
      email: data.email,
      password: hashed,
      name: data.fullName,
    })
    .returning()
    .get()

  await db.insert(userProfiles).values({ id: user.id, fullName: data.fullName })

  return {}
}
