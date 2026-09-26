---
name: update-dependencies
description: Update all npm dependencies in kegelnetzwerk-web to their latest versions, verify the app still builds/lints/tests cleanly, and open a PR with the changes. Use when the user asks to update, upgrade, or bump dependencies/packages.
---

# Update dependencies

Bumps every package in `package.json` to its latest version, verifies nothing
broke, and ships the result as a commit + pull request. Do not run this
directly against `master`; always work on a branch.

## Steps

1. **Check the working tree is clean.** Run `git status`. If there are
   uncommitted changes unrelated to this task, stop and ask the user how to
   proceed rather than mixing them into the dependency-update commit.

2. **Create a branch** off the latest `master`, e.g.
   `chore/update-dependencies-YYYY-MM-DD` (use today's date).

3. **Run the bump script**:
   ```
   node scripts/update-dependencies.mjs
   ```
   This runs `npm-check-updates -u` (rewrites `package.json` to latest
   versions, including majors), `npm install`, and `npm run db:generate`
   (Prisma client regeneration).

4. **Verify the update**, in this order, fixing issues as they come up:
   - `npm run lint`
   - `npm run build`
   - `npm run test:coverage`

   Dependency majors (React, Next.js, Prisma, Tailwind, etc.) can carry
   breaking changes. If lint/build/test surfaces a break caused by a major
   bump:
   - Prefer fixing the code to match the new major (that's the point of the
     update).
   - If a package's new major is clearly out of scope (e.g. requires a
     framework migration or an incompatible peer range — e.g. `ts-jest`
     capping `typescript`), pin that one package back to its previous
     version in `package.json`, re-run `npm install`, and call it out
     explicitly in the PR description — don't silently drop it.
   - Before fixing any lint error, check whether it's actually new: diff the
     locked version of the offending package/plugin against
     `git show HEAD:package-lock.json` (e.g. `eslint`,
     `eslint-plugin-react-hooks`). CI here only runs `test:coverage`, not
     `lint`, so pre-existing lint debt can be sitting on `master` unrelated
     to any version bump. Fix errors your bump actually introduced; report
     (don't mass-fix) pre-existing ones you merely uncovered by running lint.

5. **Review what changed** with `git diff package.json` to summarize which
   packages moved and note any major-version bumps for the PR description.

6. **Commit.** Stage only `package.json` and `package-lock.json` (plus any
   source files you had to touch to accommodate a breaking change). Do not
   touch `messages/de.json` or `messages/en.json` in this commit — see the
   pre-commit hook note in `CLAUDE.md`. Commit message example:
   ```
   Update dependencies to latest versions
   ```

7. **Push the branch and open a PR** with `gh pr create`. Include in the
   description:
   - A short bullet list of notable version bumps (especially majors).
   - Which verification steps were run (lint/build/test) and their result.
   - Any packages intentionally left un-bumped and why.

Follow the repo's standard commit/PR attribution conventions.
