-- Swap the iban and bic column values (they were stored in the wrong columns)
-- PostgreSQL evaluates all RHS expressions before performing assignments, so this is safe.
UPDATE "Club" SET "iban" = "bic", "bic" = "iban"; -- NOSONAR
