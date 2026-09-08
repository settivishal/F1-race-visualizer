import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the "@/*" alias from tsconfig.json, so tests import the same way
  // the application does.
  resolve: {
    tsconfigPaths: true,
    // graphql ships both ESM and CJS entries, and loading one of each gives two
    // copies of its classes in the same process — `instanceof` then fails and
    // execute() rejects a schema built by the other copy. Only the tests hit
    // this: Next and tsx each resolve one way throughout.
    dedupe: ['graphql'],
  },
  test: {
    include: ['src/**/*.test.ts'],
    // The GraphQL route test stubs NODE_ENV per file; sharing a process would
    // leak that into whatever ran next.
    isolate: true,
    // Pothos is externalised by default and would then require graphql's CJS
    // entry while the test file imports its ESM one. Inlining it puts both on
    // the same copy, which is what dedupe above can then act on.
    //
    // Yoga and its plugins are here for the same reason, found the same way:
    // the route test built a schema with one copy and handed it to a server
    // holding another, and graphql answers that with "Cannot use GraphQLSchema
    // from another module or realm".
    server: {
      deps: {
        inline: [
          /@pothos\//,
          /^graphql$/,
          /graphql-yoga/,
          /@graphql-yoga\//,
          /@envelop\//,
          /@escape\.tech\//,
          /@graphql-tools\//,
        ],
      },
    },
  },
});
