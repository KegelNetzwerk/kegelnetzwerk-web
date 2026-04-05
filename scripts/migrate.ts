/**
 * Migration script: legacy MySQL (kegelnetzwerk) → PostgreSQL/Prisma (kegelnetzwerk2)
 *
 * Parses the SQL dump file directly (no live MySQL connection required).
 * Uses Prisma upsert for idempotency — safe to run multiple times.
 *
 * Usage:
 *   cd E:\2026_Projects\kegelnetzwerk2
 *   npx tsx scripts/migrate.ts
 *
 * Optional: override dump path via env var:
 *   DUMP_PATH="E:\path\to\dump.sql" npx tsx scripts/migrate.ts
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient, CommentType, Unit, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const DUMP_PATH =
  process.env.DUMP_PATH ??
  'E:\\2026_Projects\\kegelnetzwerk\\Database\\dump-kegelnetzwerk1-202603141411.sql';

const LEGACY_UPLOADS_DIR =
  process.env.LEGACY_UPLOADS_DIR ??
  'E:\\2026_Projects\\kegelnetzwerk\\uploads';

const NEW_PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Initial password set for member id 1 after migration.
// Override via ADMIN_PASSWORD env var before running the script.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'lolipop';

// ─── Prisma client ────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(unixSeconds: number | null | undefined): Date {
  if (!unixSeconds || unixSeconds <= 0) return new Date(0);
  return new Date(unixSeconds * 1000);
}

function toDateOrNull(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000);
}

function int(v: string | null | undefined): number {
  return parseInt(v ?? '0', 10) || 0;
}

function float(v: string | null | undefined): number {
  return parseFloat(v ?? '0') || 0;
}

function bool(v: string | null | undefined): boolean {
  return v === '1';
}

// Named HTML entities → characters (common subset + all German-relevant ones)
const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0',
  euro: '€', cent: '¢', pound: '£', yen: '¥', copy: '©', reg: '®',
  trade: '™', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
  // German umlauts & eszett
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  // French/other Latin
  eacute: 'é', egrave: 'è', ecirc: 'ê', aacute: 'á', agrave: 'à', acirc: 'â',
  oacute: 'ó', ograve: 'ò', ocirc: 'ô', uacute: 'ú', ugrave: 'ù', ucirc: 'û',
  iacute: 'í', igrave: 'ì', icirc: 'î', ccedil: 'ç', ntilde: 'ñ',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => HTML_ENTITIES[name] ?? match);
}

function str(v: string | null | undefined): string {
  return v ?? '';
}

/**
 * Normalize a legacy image path to a root-relative URL compatible with the
 * new project's public/ directory structure:
 *   - 'none' / empty → 'none'
 *   - already starts with '/' → as-is
 *   - 'style/images/foo.png' → '/images/foo.png'  (legacy theme assets)
 *   - 'uploads/...' → '/uploads/...'
 */
function imgPath(v: string | null | undefined): string {
  const s = str(v);
  if (!s || s === 'none') return 'none';
  if (s.startsWith('/')) return s;
  if (s.startsWith('style/images/')) return s.replace('style/images/', '/images/');
  return `/${s}`;
}

/** str() with HTML entity decoding — use for plain-text fields (titles, names, subjects). */
function txt(v: string | null | undefined): string {
  return decodeEntities(str(v));
}

let skipped = 0;
function skip(reason: string) {
  skipped++;
  // Uncomment for verbose output:
  // console.warn('  SKIP:', reason);
  void reason;
}

// ─── SQL dump parser ──────────────────────────────────────────────────────────

type Row = (string | null)[];

/**
 * State-machine tokenizer: splits a VALUES clause into individual rows,
 * each row into typed cell values. Handles nested parentheses, single-quoted
 * strings with MySQL escape sequences (\', \\, \n, \r), and NULL literals.
 */
function parseValues(valuesClause: string): Row[] {
  const rows: Row[] = [];
  let i = 0;
  const len = valuesClause.length;

  while (i < len) {
    // Skip whitespace and commas between rows
    while (i < len && (valuesClause[i] === ',' || valuesClause[i] === ' ' || valuesClause[i] === '\n' || valuesClause[i] === '\r' || valuesClause[i] === '\t')) i++;
    if (i >= len) break;
    if (valuesClause[i] !== '(') { i++; continue; }
    i++; // skip opening '('

    const cells: (string | null)[] = [];
    let cell = '';
    let depth = 0;

    while (i < len) {
      const ch = valuesClause[i];

      if (ch === "'" ) {
        // Quoted string — read until closing unescaped quote
        i++;
        while (i < len) {
          const c = valuesClause[i];
          if (c === '\\' && i + 1 < len) {
            const next = valuesClause[i + 1];
            if (next === "'") { cell += "'"; i += 2; }
            else if (next === '\\') { cell += '\\'; i += 2; }
            else if (next === 'n') { cell += '\n'; i += 2; }
            else if (next === 'r') { cell += '\r'; i += 2; }
            else if (next === '"') { cell += '"'; i += 2; }
            else { cell += c; i++; }
          } else if (c === "'") {
            i++; // closing quote
            // Handle MySQL '' escape (two single quotes = one)
            if (i < len && valuesClause[i] === "'") { cell += "'"; i++; }
            else break;
          } else {
            cell += c;
            i++;
          }
        }
      } else if (ch === '(') {
        depth++;
        cell += ch;
        i++;
      } else if (ch === ')') {
        if (depth > 0) {
          depth--;
          cell += ch;
          i++;
        } else {
          // End of row
          cells.push(cell === 'NULL' ? null : cell);
          i++; // skip ')'
          break;
        }
      } else if (ch === ',' && depth === 0) {
        cells.push(cell === 'NULL' ? null : cell);
        cell = '';
        i++;
      } else {
        cell += ch;
        i++;
      }
    }

    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

/**
 * Parse the SQL dump file into a map of table → rows.
 * Only processes INSERT INTO statements.
 */
function parseSQLDump(filePath: string): Record<string, Row[]> {
  console.log(`Reading dump from: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const tables: Record<string, Row[]> = {};

  // Match INSERT INTO `tablename` VALUES (...)...;
  // The VALUES portion may span the rest of the line (all on one line in typical mysqldump)
  const insertRe = /INSERT INTO `(\w+)` VALUES\s*([\s\S]*?);(?=\s*\n|$)/gm;
  let match: RegExpExecArray | null;

  while ((match = insertRe.exec(content)) !== null) {
    const tableName = match[1];
    const valuesPart = match[2];
    const rows = parseValues(valuesPart);
    if (!tables[tableName]) tables[tableName] = [];
    tables[tableName].push(...rows);
  }

  for (const [t, rows] of Object.entries(tables)) {
    console.log(`  Parsed table '${t}': ${rows.length} rows`);
  }

  return tables;
}

// ─── Migration steps ──────────────────────────────────────────────────────────

async function migrateClubs(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} clubs...`);
  for (const r of rows) {
    // clubs: id, name, regcode, regdate, pic, header, kontoinhaber, kontonummer,
    //        blz, iban, bic, paypal, farbe1, farbe2, farbe3, mono,
    //        bg1, bg2, bgfarbe, ueberuns
    const [id, name, regcode, regdate, pic, header, kontoinhaber, kontonummer,
           blz, iban, bic, paypal, farbe1, farbe2, farbe3, mono,
           bg1, bg2, bgfarbe, ueberuns] = r;

    await prisma.club.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        name: txt(name),
        regCode: str(regcode),
        regDate: toDate(int(regdate)),
        pic: imgPath(pic),
        header: imgPath(header),
        aboutUs: txt(ueberuns),
        farbe1: str(farbe1) || '005982',
        farbe2: str(farbe2) || '3089AC',
        farbe3: str(farbe3) || 'A91A1A',
        mono: bool(mono),
        bg1: int(bg1),
        bg2: int(bg2),
        bgColor: str(bgfarbe) || 'FFFFFF',
        accountHolder: txt(kontoinhaber),
        accountNumber: str(kontonummer),
        bankCode: str(blz),
        iban: str(iban),
        bic: str(bic),
        paypal: str(paypal),
        createdAt: toDate(int(regdate)),
      },
    });
  }
  console.log(`  ✓ ${rows.length} clubs`);
}

async function migrateMembers(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} members (first pass)...`);
  let count = 0;
  for (const r of rows) {
    // member: clubid, id, rechte, pw, spitzname, vorname, nachname, gtag,
    //         pic, facebook, handynr, email, updated, wichtelid
    const [clubid, id, rechte, pw, spitzname, vorname, nachname, gtag,
           pic, , handynr, email, updated] = r;

    await prisma.member.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        role: rechte === 'Admin' ? Role.ADMIN : Role.MEMBER,
        passwordHash: str(pw), // MD5 kept as-is; auth layer handles legacy login
        nickname: txt(spitzname),
        firstName: txt(vorname),
        lastName: txt(nachname),
        birthday: toDateOrNull(int(gtag)),
        pic: imgPath(pic),
        phone: str(handynr),
        email: str(email),
        createdAt: toDate(int(updated)),
        updatedAt: toDate(int(updated)),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} members`);
}

async function patchMemberSecretSanta(rows: Row[]) {
  console.log(`\nPatching secretSantaPartnerId...`);
  let count = 0;
  for (const r of rows) {
    const [, id, , , , , , , , , , , , wichtelid] = r;
    const wId = int(wichtelid);
    if (wId > 0) {
      await prisma.member.update({
        where: { id: int(id) },
        data: { secretSantaPartnerId: wId },
      }).catch(() => skip(`secretSantaPartnerId ${wId} not found for member ${id}`));
      count++;
    }
  }
  console.log(`  ✓ ${count} secret santa links patched`);
}

async function migrateGamesAndPenalties(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} games/penalties...`);
  for (const r of rows) {
    // gamesandpenalties: clubid, id, name
    const [clubid, id, name] = r;
    await prisma.gameOrPenalty.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        name: txt(name),
      },
    });
  }
  console.log(`  ✓ ${rows.length} games/penalties`);
}

async function migrateParts(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} parts...`);
  for (const r of rows) {
    // parts: clubid, gameorpenalty, id, name, value, variable, factor, bonus,
    //        unit, once, desc, pic
    const [clubid, gameorpenalty, id, name, value, variable, factor, bonus,
           unit, once, desc, pic] = r;

    await prisma.part.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        gameOrPenaltyId: int(gameorpenalty),
        name: txt(name),
        value: float(value),
        variable: bool(variable),
        factor: float(factor),
        bonus: float(bonus),
        unit: int(unit) === 1 ? Unit.EURO : Unit.POINTS,
        once: bool(once),
        description: txt(desc),
        pic: imgPath(pic),
      },
    }).catch(() => skip(`part ${id}: gameOrPenaltyId ${gameorpenalty} not found`));
  }
  console.log(`  ✓ ${rows.length} parts (orphaned FK rows skipped)`);
}

async function migrateNews(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} news items...`);
  for (const r of rows) {
    // news: id, clubid, userid, title, msg, intern, editid, created, updated
    const [id, clubid, userid, title, msg, intern, editid, created, updated] = r;

    await prisma.news.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        authorId: int(userid),
        title: txt(title),
        content: txt(msg),
        internal: bool(intern),
        editorIds: str(editid),
        emailNotified: false,
        createdAt: toDate(int(created)),
        updatedAt: toDate(int(updated)),
      },
    }).catch(() => skip(`news ${id}: FK missing`));
  }
  console.log(`  ✓ ${rows.length} news items`);
}

async function migrateVotes(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} votes...`);
  for (const r of rows) {
    // votes: id, userid, clubid, title, voices, anonym, maybe, preview,
    //        switch, beschr, closed, editid, updated
    const [id, userid, clubid, title, voices, anonym, maybe, preview,
           sw, beschr, closed, , updated] = r;

    await prisma.vote.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        authorId: int(userid),
        title: txt(title),
        description: txt(beschr),
        maxVoices: int(voices),
        anonymous: bool(anonym),
        maybe: bool(maybe),
        previewResults: bool(preview),
        allowSwitch: bool(sw),
        closed: bool(closed),
        createdAt: toDate(int(updated)),
        updatedAt: toDate(int(updated)),
      },
    }).catch(() => skip(`vote ${id}: FK missing`));
  }
  console.log(`  ✓ ${rows.length} votes`);
}

async function migrateVoteOptions(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} vote options...`);
  // Track position per vote
  const positionCounters: Record<number, number> = {};

  for (const r of rows) {
    // voteoptions: id, voteid, option
    const [id, voteid, option] = r;
    const vId = int(voteid);
    const pos = positionCounters[vId] ?? 0;
    positionCounters[vId] = pos + 1;

    await prisma.voteOption.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        voteId: vId,
        text: txt(option),
        position: pos,
      },
    }).catch(() => skip(`voteOption ${id}: FK missing`));
  }
  console.log(`  ✓ ${rows.length} vote options`);
}

async function migrateVotings(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} votings...`);
  let count = 0;
  for (const r of rows) {
    // votings: id, voteid, optionid, memid, maybe, updated
    const [id, voteid, optionid, memid, maybe, updated] = r;

    await prisma.voting.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        voteId: int(voteid),
        optionId: int(optionid),
        memberId: int(memid),
        maybe: bool(maybe),
        createdAt: toDate(int(updated)),
        updatedAt: toDate(int(updated)),
      },
    }).catch(() => skip(`voting ${id}: FK missing`));
    count++;
  }
  console.log(`  ✓ ${count} votings`);
}

async function migrateEvents(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} events...`);
  for (const r of rows) {
    // dates: id, clubid, memid, date, location, subject, desc, editid, updated
    const [id, clubid, memid, date, location, subject, desc, , updated] = r;

    await prisma.event.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        authorId: int(memid),
        date: toDate(int(date)),
        location: txt(location),
        subject: txt(subject),
        description: txt(desc),
        createdAt: toDate(int(updated)),
        updatedAt: toDate(int(updated)),
      },
    }).catch(() => skip(`event ${id}: FK missing`));
  }
  console.log(`  ✓ ${rows.length} events`);
}

async function migrateEventCancellations(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} event cancellations...`);
  let count = 0;
  for (const r of rows) {
    // datecancel: id, dateid, memid, updated
    const [id, dateid, memid, updated] = r;

    await prisma.eventCancellation.upsert({
      where: { eventId_memberId: { eventId: int(dateid), memberId: int(memid) } },
      update: {},
      create: {
        id: int(id),
        eventId: int(dateid),
        memberId: int(memid),
        createdAt: toDate(int(updated)),
      },
    }).catch(() => skip(`eventCancellation ${id}: FK missing`));
    count++;
  }
  console.log(`  ✓ ${count} event cancellations`);
}

async function migrateComments(
  rows: Row[],
  newsIds: Set<number>,
  voteIds: Set<number>,
  eventIds: Set<number>,
) {
  console.log(`\nMigrating ${rows.length} comments...`);
  let count = 0;
  for (const r of rows) {
    // comments: id, memid, msg, type, itemid, updated
    const [id, memid, msg, type, itemid, updated] = r;
    const typeInt = int(type);
    const iid = int(itemid);

    let commentType: CommentType;
    let newsId: number | undefined;
    let voteId: number | undefined;
    let eventId: number | undefined;

    if (typeInt === 2) {
      if (!newsIds.has(iid)) { skip(`comment ${id}: news ${iid} not found`); continue; }
      commentType = CommentType.NEWS;
      newsId = iid;
    } else if (typeInt === 4) {
      if (!voteIds.has(iid)) { skip(`comment ${id}: vote ${iid} not found`); continue; }
      commentType = CommentType.VOTE;
      voteId = iid;
    } else {
      if (!eventIds.has(iid)) { skip(`comment ${id}: event ${iid} not found`); continue; }
      commentType = CommentType.EVENT;
      eventId = iid;
    }

    await prisma.comment.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        authorId: int(memid),
        content: txt(msg),
        type: commentType,
        referenceId: iid,
        newsId,
        voteId,
        eventId,
        createdAt: toDate(int(updated)),
        updatedAt: toDate(int(updated)),
      },
    }).catch(() => skip(`comment ${id}: author FK missing`));
    count++;
  }
  console.log(`  ✓ ${count} comments`);
}

async function migrateResults(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} results...`);
  let count = 0;
  let skippedPseudo = 0;
  let skippedInvalidFK = 0;
  let skippedFKMissing = 0;
  for (const r of rows) {
    // results: id, date, clubid, memid, gopid, partid, value, ended
    const [id, date, clubid, memid, gopid, partid, value, ended] = r;

    // memid = -1 is the legacy "club account" pseudo-member — skip
    if (int(memid) <= 0) { skippedPseudo++; continue; }

    // gopid/partid of 0 or NULL cannot satisfy the FK constraint — skip
    if (int(gopid) <= 0 || int(partid) <= 0) {
      skippedInvalidFK++;
      continue;
    }

    const ok = await prisma.result.upsert({
      where: { id: int(id) },
      update: {},
      create: {
        id: int(id),
        clubId: int(clubid),
        memberId: int(memid),
        gopId: int(gopid),
        partId: int(partid),
        value: float(value),
        date: toDate(int(ended)),
        sessionGroup: int(ended),
        createdAt: toDate(int(date)),
      },
    }).then(() => true).catch((e) => {
      if (skippedFKMissing === 0) console.warn(`  FIRST RESULT ERROR (id=${id}):`, e?.message ?? e);
      skippedFKMissing++;
      return false;
    });
    if (ok) count++;
  }
  if (skippedPseudo > 0)    console.log(`  Skipped ${skippedPseudo} pseudo-member results (memid ≤ 0)`);
  if (skippedInvalidFK > 0) console.log(`  Skipped ${skippedInvalidFK} results with NULL/0 gopid or partid`);
  if (skippedFKMissing > 0) console.log(`  Skipped ${skippedFKMissing} results with missing FK (game/part deleted)`);
  console.log(`  ✓ ${count} results`);
}

async function migrateRegistrationCodes(rows: Row[]) {
  console.log(`\nMigrating ${rows.length} registration codes...`);
  for (const r of rows) {
    // codes: code
    const [code] = r;
    if (!code) continue;
    await prisma.registrationCode.upsert({
      where: { code: str(code) },
      update: {},
      create: { code: str(code) },
    });
  }
  console.log(`  ✓ ${rows.length} registration codes`);
}

/** Reset PostgreSQL sequences so new inserts don't collide with migrated IDs. */
async function resetSequences() {
  console.log('\nResetting PostgreSQL sequences...');
  const tables: [string, string][] = [
    ['Club', 'clubs'],
    ['Member', 'members'],
    ['News', 'news'],
    ['Vote', 'votes'],
    ['VoteOption', 'vote_options'],
    ['Voting', 'votings'],
    ['Event', 'events'],
    ['EventCancellation', 'event_cancellations'],
    ['Comment', 'comments'],
    ['GameOrPenalty', 'game_or_penalties'],
    ['Part', 'parts'],
    ['Result', 'results'],
    ['EventRecurrenceRule', 'event_recurrence_rules'],
  ];

  for (const [label, table] of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`
      );
      console.log(`  ✓ ${label}`);
    } catch {
      // Table name casing may differ — try with Prisma's default PascalCase
      try {
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${label}"', 'id'), COALESCE((SELECT MAX(id) FROM "${label}"), 1))`
        );
        console.log(`  ✓ ${label} (PascalCase)`);
      } catch (e2) {
        console.warn(`  ⚠ Could not reset sequence for ${label}:`, e2);
      }
    }
  }
}

// ─── Image copy ───────────────────────────────────────────────────────────────

/**
 * Recursively copies all files from the legacy uploads directory into
 * public/uploads/ in the new project. Existing files are skipped (not
 * overwritten) so uploads made after migration are preserved.
 */
function copyImages() {
  if (!fs.existsSync(LEGACY_UPLOADS_DIR)) {
    console.warn(`\n⚠ Legacy uploads directory not found: ${LEGACY_UPLOADS_DIR}`);
    console.warn('  Set the LEGACY_UPLOADS_DIR environment variable to override.');
    console.warn('  Skipping image copy.');
    return;
  }

  const destDir = path.join(NEW_PUBLIC_DIR, 'uploads');
  fs.mkdirSync(destDir, { recursive: true });

  let copied = 0;
  let skippedExisting = 0;

  function copyDir(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        if (fs.existsSync(destPath)) {
          skippedExisting++;
        } else {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        }
      }
    }
  }

  copyDir(LEGACY_UPLOADS_DIR, destDir);
  console.log(`\nImage copy: ${copied} files copied, ${skippedExisting} already existed (skipped).`);
}

// ─── Admin password reset ─────────────────────────────────────────────────────

/** Bcrypt-hash ADMIN_PASSWORD and write it to member id 1. */
async function resetAdminPassword() {
  console.log('\nResetting admin password (member id 1)...');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.member.update({ where: { id: 1 }, data: { passwordHash: hash } });
  console.log('  ✓ Password set (bcrypt)');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  KegelNetzwerk → kegelnetzwerk2 Migration    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!fs.existsSync(DUMP_PATH)) {
    console.error(`Dump file not found: ${DUMP_PATH}`);
    console.error('Set the DUMP_PATH environment variable to override.');
    process.exit(1);
  }

  const tables = parseSQLDump(DUMP_PATH);

  const get = (name: string): Row[] => tables[name] ?? [];

  // Run in FK-safe order
  await migrateClubs(get('clubs'));
  await migrateRegistrationCodes(get('codes'));
  await migrateMembers(get('member'));
  await migrateGamesAndPenalties(get('gamesandpenalties'));
  await migrateParts(get('parts'));
  await migrateNews(get('news'));
  await migrateVotes(get('votes'));
  await migrateVoteOptions(get('voteoptions'));
  await migrateEvents(get('dates'));
  await migrateEventCancellations(get('datecancel'));

  // Build ID sets for comment FK resolution
  const newsIds  = new Set(get('news').map((r) => int(r[0])));
  const voteIds  = new Set(get('votes').map((r) => int(r[0])));
  const eventIds = new Set(get('dates').map((r) => int(r[0])));
  await migrateComments(get('comments'), newsIds, voteIds, eventIds);

  await migrateVotings(get('votings'));
  await migrateResults(get('results'));
  await patchMemberSecretSanta(get('member'));
  await resetAdminPassword();

  await resetSequences();
  copyImages();

  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║  Migration complete!             ║`);
  if (skipped > 0) {
    console.log(`║  Skipped rows (orphans/FK): ${String(skipped).padStart(4)} ║`);
  }
  console.log(`╚══════════════════════════════════╝`);

  console.log('\nNOTE: Member passwords were migrated as MD5 hashes.');
  console.log('      The auth layer must handle legacy MD5 login and re-hash on success.');
  console.log('\nNOTE: The following tables were NOT migrated (no target model):');
  console.log('      balance (financial ledger), chat, counter (analytics)');
}

main()
  .catch((e) => { console.error('\nMigration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
