import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/db';
import { users } from '@/db/schema';

/**
 * Authentication, in the smallest form the requirement allows.
 *
 * There is exactly one account: the admin's. No public signup, no email
 * verification, no password reset, no OAuth, no roles. Public pages carry no
 * auth code at all — not a check that passes, but no code.
 *
 * That scope is the whole reason this file is short. `05-delivery.md` records
 * why it matters: v1 rewrote authentication three times across three diverging
 * branches, and the root cause was not incompetence — auth was never *decided*,
 * so every new requirement triggered a re-architecture. Deciding the scope is
 * what makes the implementation small.
 *
 * JWT sessions, no session table. With one user there is nothing to gain from
 * database sessions: no other user's session to revoke, no list of active
 * sessions worth showing. In exchange `proxy.ts` validates a signature instead
 * of making a database round trip on every admin navigation — which is what
 * lets the proxy stay cheap enough for Next to deploy it to the CDN.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);

        // Returning null for both "no such user" and "wrong password" is
        // deliberate: distinguishing them tells an attacker which half they got
        // right. The bcrypt compare still runs only when a user exists, so the
        // timing is not identical — with a single known admin address that
        // leaks nothing worth having.
        if (!user) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    // The user id is put on the token at sign-in and read back onto the
    // session, so a resolver can identify the caller without a query.
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
