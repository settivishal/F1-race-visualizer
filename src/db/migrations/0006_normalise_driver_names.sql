-- Driver names, unshouted once.
--
-- The ingest normalises from here on (lib/format-name.ts), but it only rewrites
-- a driver when a race they appear in is imported again. A retired driver never
-- appears in another race, so "Daniel RICCIARDO" would have stayed that way
-- forever. This is the one-time pass for rows already stored.
--
-- `initcap` rather than the TypeScript formatter, because a migration cannot
-- call it. The two agree on every name in the database today. They would differ
-- on a surname with a lowercase particle — initcap gives "Nyck De Vries" where
-- the formatter gives "Nyck de Vries" — and no such driver is stored; the next
-- import of one would correct it anyway.
--
-- Only rows that actually contain a shouted word are touched, so a name that is
-- already right is left exactly as it is.
UPDATE "drivers"
SET "name" = initcap("name")
-- POSIX classes, not \p{Lu}: Postgres's regex engine does not take Unicode
-- property escapes, and neither does the PGlite the tests run against.
WHERE "name" ~ '(^| )[[:upper:]][[:upper:]]+( |$)'
