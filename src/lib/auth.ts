import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || 'your-super-secret-key-change-in-production-min-32-chars',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = ((credentials?.email as string) || '').trim().toLowerCase()
        const password = (credentials?.password as string) || ''

        if (!email || !password) return null

        const DEMO_ACCOUNTS: Record<string, { name: string; password: string; role: string }> = {
          'admin@roadiq.com': { name: 'Admin User', password: 'admin123', role: 'ADMIN' },
          'inspector@roadiq.com': { name: 'Field Inspector', password: 'inspect123', role: 'INSPECTOR' },
          'viewer@roadiq.com': { name: 'Viewer User', password: 'view123', role: 'VIEWER' },
        }

        // 1. Check demo accounts first for instant resilience
        const demo = DEMO_ACCOUNTS[email]
        if (demo && demo.password === password) {
          try {
            let user = await prisma.user.findUnique({ where: { email } })
            if (!user) {
              const hashedPassword = await bcrypt.hash(password, 10)
              user = await prisma.user.create({
                data: {
                  name: demo.name,
                  email,
                  password: hashedPassword,
                  role: demo.role,
                },
              })
            }
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          } catch (dbError) {
            console.warn('Database sync note for demo user, returning fallback session:', dbError)
            return {
              id: `demo-${demo.role.toLowerCase()}`,
              name: demo.name,
              email,
              role: demo.role,
            }
          }
        }

        // 2. Query database for standard user
        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) return null

          const passwordMatch = await bcrypt.compare(password, user.password)
          if (!passwordMatch) return null

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        } catch (error) {
          console.error('Authorize database query error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})
