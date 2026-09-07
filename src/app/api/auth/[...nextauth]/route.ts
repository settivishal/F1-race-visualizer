import { handlers } from '@/auth';

// Auth.js needs a route to handle the sign-in and sign-out POSTs and the
// session endpoint. It is the only thing this file does; the configuration
// lives in src/auth.ts.
export const { GET, POST } = handlers;
