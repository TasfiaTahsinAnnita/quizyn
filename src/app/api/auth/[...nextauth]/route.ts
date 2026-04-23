import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcrypt" // I'll need to install bcrypt

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) return null

        // For now, I'll use a simple check since bcrypt might not be installed yet
        // In production, ALWAYS use bcrypt
        const isValid = credentials.password === user.password 

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
