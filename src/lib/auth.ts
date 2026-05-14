import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { getDb, users } from './db'

export const { handlers, signIn, signOut, auth } = NextAuth(() => {
  const db = getDb()
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
    } as Parameters<typeof DrizzleAdapter>[1]),
    session: { strategy: 'jwt' },
    pages: {
      signIn: '/auth/login',
      newUser: '/onboarding',
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null

          const db = getDb()
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .get()

          if (!user?.password) return null

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )
          if (!valid) return null

          return { id: user.id, email: user.email, name: user.name, image: user.image }
        },
      }),
    ],
    callbacks: {
      jwt({ token, user }) {
        if (user) token.id = user.id
        return token
      },
      session({ session, token }) {
        if (token.id) session.user.id = token.id as string
        return session
      },
    },
  }
})
