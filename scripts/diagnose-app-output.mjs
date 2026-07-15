/**
 * Simulates what FixedRabbinicCalendarProvider produces for 2026,
 * so we can compare against raw Hebcal output.
 *
 * Run with: node scripts/diagnose-app-output.mjs
 */

import {
  HebrewCalendar,
  Location as HebcalLocation,
  flags as hebcalFlags,
} from '@hebcal/core';

// ─── Replicate the app's logic ────────────────────────────────────────────────

// holiday-definitions.ts: the matches arrays
const HOLIDAY_GROUPS = [
  {
    groupId: 'major',
    label: 'Major Holidays',
    holidays: [
      { canonicalId: 'pesach',              matches: ['Pesach I'] },
      { canonicalId: 'chag-hamatzot',       matches: ['Pesach VII'] },
      { canonicalId: 'chag-hamatzot-daily', matches: ['Pesach II','Pesach III','Pesach IV','Pesach V','Pesach VI','Pesach VIII','Chol Hamoed Pesach'], variant: 'daily' },
      { canonicalId: 'first-fruits',        matches: ['Pesach II'] },
      { canonicalId: 'omer-daily',          matches: ['Omer'], variant: 'daily' },
      { canonicalId: 'shavuot',             matches: ['Shavuot'] },
      { canonicalId: 'rosh-hashanah',       matches: ['Rosh Hashana'] },
      { canonicalId: 'yom-kippur',          matches: ['Yom Kippur'] },
      { canonicalId: 'sukkot',              matches: ['Sukkot', 'Shemini Atzeret', 'Simchat Torah'] },
      { canonicalId: 'sukkot-daily',        matches: ['Chol Hamoed Sukkot'], variant: 'daily' },
    ],
  },
  {
    groupId: 'minor',
    label: 'Minor Holidays',
    holidays: [
      { canonicalId: 'purim',              matches: ['Purim'] },
      { canonicalId: 'chanukah',           matches: ['Chanukah: 1 day', 'Chanukah: 8 days'] },
      { canonicalId: 'chanukah-daily',     matches: ['Chanukah: 2 days','Chanukah: 3 days','Chanukah: 4 days','Chanukah: 5 days','Chanukah: 6 days','Chanukah: 7 days'], variant: 'daily' },
      { canonicalId: 'tisha-bav',          matches: ['Tisha B\u2019Av'] },
      { canonicalId: 'shabbat-all',        matches: ['Shabbat'], variant: 'lump', homePage: 'hide' },
      { canonicalId: 'rosh-chodesh-all',   matches: ['Rosh Chodesh'], variant: 'lump' },
      { canonicalId: 'tu-bishvat',         matches: ['Tu BiShvat'] },
      { canonicalId: 'lag-baomer',         matches: ['Lag BaOmer'] },
      { canonicalId: 'yom-hashoah',        matches: ['Yom HaShoah'] },
    ],
  },
];

function getAllHolidayDefinitions() {
  return HOLIDAY_GROUPS.flatMap(g => g.holidays);
}

function buildBasenameToCanonicalMap() {
  const map = new Map();
  for (const def of getAllHolidayDefinitions()) {
    for (const match of def.matches) {
      map.set(match, def.canonicalId);
    }
  }
  return map;
}

const basenameMap = buildBasenameToCanonicalMap();

// holiday-mapper.ts: getCanonicalIdForEvent
function getCanonicalIdForEvent(ev) {
  const mask = ev.getFlags();
  const basename = ev.basename() || '';

  if (mask & hebcalFlags.OMER_COUNT) return 'omer-daily';

  if (basename === 'Shabbat' || basename.startsWith('Shabbat ')) return 'shabbat-all';

  if (mask & hebcalFlags.ROSH_CHODESH) return 'rosh-chodesh-all';

  if (mask & hebcalFlags.CHOL_HAMOED) {
    if (basename.includes('Pesach')) return 'chag-hamatzot-daily';
    if (basename.includes('Sukkot')) return 'sukkot-daily';
  }

  if (mask & hebcalFlags.CHANUKAH_CANDLES) return 'chanukah-daily';

  if (basename && basenameMap.has(basename)) return basenameMap.get(basename);

  return undefined;
}

// holiday-mapper.ts: isCuratedEvent
function isCuratedEvent(ev) {
  const mask = ev.getFlags();

  if (mask & hebcalFlags.PARSHA_HASHAVUA) return false;
  if (mask & hebcalFlags.DAF_YOMI) return false;
  if (mask & hebcalFlags.MISHNA_YOMI) return false;
  if (mask & hebcalFlags.NACH_YOMI) return false;
  if (mask & hebcalFlags.YERUSHALMI_YOMI) return false;
  if (mask & hebcalFlags.DAILY_LEARNING) return false;
  if (mask & hebcalFlags.MOLAD) return false;
  if (mask & hebcalFlags.SHABBAT_MEVARCHIM) return false;
  if (mask & hebcalFlags.YOM_KIPPUR_KATAN) return false;
  if (mask & hebcalFlags.BEHAB) return false;
  if (mask & hebcalFlags.USER_EVENT) return false;
  if (mask & hebcalFlags.HEBREW_DATE) return false;

  const canonicalId = getCanonicalIdForEvent(ev);
  if (canonicalId) return true;

  const holidayFlags =
    hebcalFlags.CHAG |
    hebcalFlags.MINOR_HOLIDAY |
    hebcalFlags.MAJOR_FAST |
    hebcalFlags.MINOR_FAST |
    hebcalFlags.MODERN_HOLIDAY |
    hebcalFlags.ROSH_CHODESH |
    hebcalFlags.EREV |
    hebcalFlags.CHANUKAH_CANDLES |
    hebcalFlags.CHOL_HAMOED |
    hebcalFlags.YIZKOR |
    hebcalFlags.SPECIAL_SHABBAT;

  return (mask & holidayFlags) !== 0;
}

// fixed-rabbinic.ts: isLastDayOfMultiDayHoliday
function isLastDayOfMultiDayHoliday(ev) {
  const basename = ev.basename() || '';
  const lastDayBasenames = new Set(['Pesach VII','Pesach VIII','Shemini Atzeret','Simchat Torah','Chanukah: 8 days']);
  return lastDayBasenames.has(basename);
}

// fixed-rabbinic.ts: canonicalIdToGroup
function canonicalIdToGroup(canonicalId) {
  const majorIds = new Set(['pesach','chag-hamatzot','chag-hamatzot-daily','first-fruits','omer-daily','shavuot','rosh-hashanah','yom-kippur','sukkot','sukkot-daily']);
  return majorIds.has(canonicalId) ? 'major' : 'minor';
}

// holiday-definitions.ts: getHomePageDisplayName
function getHomePageDisplayName(canonicalId, isLast) {
  const def = getAllHolidayDefinitions().find(d => d.canonicalId === canonicalId);
  if (!def) return '';
  if (canonicalId === 'sukkot') return isLast ? 'Sukkot (Last Day)' : 'Sukkot (1st Day)';
  if (canonicalId === 'chanukah') return isLast ? 'Chanukah (Last Day)' : 'Chanukah (1st Day)';
  if (canonicalId === 'chag-hamatzot') return isLast ? 'Unleavened Bread (Last Day)' : 'Unleavened Bread (1st Day)';
  return def.name || canonicalId;
}

// holiday-definitions.ts: isHomePageHidden
function isHomePageHidden(canonicalId) {
  const def = getAllHolidayDefinitions().find(d => d.canonicalId === canonicalId);
  if (!def) return true;
  if (def.variant === 'daily') return true;
  if (def.homePage === 'hide') return true;
  return false;
}

// fixed-rabbinic.ts: generateHolidayId
function generateHolidayId(ev) {
  const base = (ev.basename() || '').toLowerCase().replace(/\s+/g, '-');
  const slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  const greg = ev.getDate().greg();
  const dateStr = greg.toISOString().slice(0, 10);
  return `${slug}_${dateStr}`;
}

// ─── Run the calendar ─────────────────────────────────────────────────────────

const location = HebcalLocation.lookup('New York');
const start = new Date(2026, 0, 1);
const end   = new Date(2026, 11, 31);

const options = {
  start, end,
  candlelighting: true,
  location,
  il: false,
  noHolidays: false,
  noMinorFast: false,
  noModern: false,
  noRoshChodesh: false,
  noSpecialShabbat: false,
  sedrot: false,
  omer: true,
};

const events = HebrewCalendar.calendar(options);

// ─── Step 1: isCuratedEvent filter ───────────────────────────────────────────

console.log('\n=== STEP 1: EVENTS PASSING isCuratedEvent() ===\n');
const curatedEvents = events.filter(isCuratedEvent);
console.log(`Total raw events: ${events.length}`);
console.log(`After isCuratedEvent filter: ${curatedEvents.length}`);

// ─── Step 2: Build holidays ───────────────────────────────────────────────────

console.log('\n=== STEP 2: BUILT HOLIDAYS (before dedup) ===\n');
console.log('Date       | canonicalId                  | displayName                          | groupId | isLast');
console.log('-----------|------------------------------|--------------------------------------|---------|-------');

const holidays = [];
for (const ev of curatedEvents) {
  const gregDate = ev.getDate().greg();
  const canonicalId = getCanonicalIdForEvent(ev);
  if (!canonicalId) continue;

  const isLast = isLastDayOfMultiDayHoliday(ev);
  const displayName = getHomePageDisplayName(canonicalId, isLast);

  const startAt = new Date(gregDate);
  startAt.setDate(startAt.getDate() - 1);
  const endAt = gregDate;

  holidays.push({
    id: generateHolidayId(ev),
    canonicalId,
    name: displayName,
    groupId: canonicalIdToGroup(canonicalId),
    times: { startAt, endAt },
    flags: ev.getFlags(),
    _rawBasename: ev.basename(),
    _rawRender: ev.render('en'),
    _isLast: isLast,
  });

  const dateStr = gregDate.toISOString().slice(0, 10);
  console.log(`${dateStr} | ${canonicalId.padEnd(28)} | ${displayName.padEnd(36)} | ${canonicalIdToGroup(canonicalId).padEnd(7)} | ${isLast}`);
}

// ─── Step 3: Deduplication ────────────────────────────────────────────────────

console.log('\n=== STEP 3: AFTER DEDUPLICATION ===\n');
const seen = new Set();
const deduped = holidays.filter(h => {
  const key = `${h.canonicalId}_${h.times.startAt.toISOString().slice(0, 10)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`Before dedup: ${holidays.length}, After dedup: ${deduped.length}`);

// ─── Step 4: Home page filter ─────────────────────────────────────────────────

console.log('\n=== STEP 4: HOME PAGE VISIBLE HOLIDAYS ===\n');
const homePageHolidays = deduped.filter(h => !isHomePageHidden(h.canonicalId));
console.log(`After home page filter: ${homePageHolidays.length}`);
console.log('\nDate       | canonicalId                  | displayName');
console.log('-----------|------------------------------|--------------------------------------');
for (const h of homePageHolidays) {
  const dateStr = h.times.endAt.toISOString().slice(0, 10);
  console.log(`${dateStr} | ${h.canonicalId.padEnd(28)} | ${h.name}`);
}

// ─── Step 5: Identify events that pass isCuratedEvent but have no canonicalId ─

console.log('\n=== STEP 5: CURATED EVENTS WITH NO canonicalId (ORPHANS) ===\n');
for (const ev of curatedEvents) {
  const canonicalId = getCanonicalIdForEvent(ev);
  if (!canonicalId) {
    const dateStr = ev.getDate().greg().toISOString().slice(0, 10);
    console.log(`  ${dateStr} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
  }
}

// ─── Step 6: Check for duplicate canonicalId+date combos ─────────────────────

console.log('\n=== STEP 6: DUPLICATE canonicalId+date COMBOS (before dedup) ===\n');
const dupCheck = new Map();
for (const h of holidays) {
  const key = `${h.canonicalId}_${h.times.startAt.toISOString().slice(0, 10)}`;
  if (!dupCheck.has(key)) dupCheck.set(key, []);
  dupCheck.get(key).push(h);
}
let hasDups = false;
for (const [key, items] of dupCheck) {
  if (items.length > 1) {
    hasDups = true;
    console.log(`  DUPLICATE: ${key}`);
    for (const item of items) {
      console.log(`    rawBasename="${item._rawBasename}" rawRender="${item._rawRender}"`);
    }
  }
}
if (!hasDups) console.log('  (none)');

// ─── Step 7: Check specific problem areas ────────────────────────────────────

console.log('\n=== STEP 7: SPECIFIC PROBLEM AREAS ===\n');

// Chanukah
console.log('--- Chanukah ---');
const chanukahHolidays = deduped.filter(h => h.canonicalId.startsWith('chanukah'));
for (const h of chanukahHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Tisha B'Av
console.log('\n--- Tisha B\'Av ---');
const tbHolidays = deduped.filter(h => h.canonicalId === 'tisha-bav');
for (const h of tbHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Rosh Hashanah
console.log('\n--- Rosh Hashanah ---');
const rhHolidays = deduped.filter(h => h.canonicalId === 'rosh-hashanah');
for (const h of rhHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Shavuot
console.log('\n--- Shavuot ---');
const shavuotHolidays = deduped.filter(h => h.canonicalId === 'shavuot');
for (const h of shavuotHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Sukkot
console.log('\n--- Sukkot ---');
const sukkotHolidays = deduped.filter(h => h.canonicalId.startsWith('sukkot'));
for (const h of sukkotHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Pesach
console.log('\n--- Pesach ---');
const pesachHolidays = deduped.filter(h => h.canonicalId.startsWith('pesach') || h.canonicalId.startsWith('chag') || h.canonicalId === 'first-fruits');
for (const h of pesachHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// Rosh Chodesh
console.log('\n--- Rosh Chodesh ---');
const rcHolidays = deduped.filter(h => h.canonicalId === 'rosh-chodesh-all');
console.log(`  Count: ${rcHolidays.length}`);
for (const h of rcHolidays) {
  console.log(`  ${h.times.endAt.toISOString().slice(0,10)} | "${h.name}" | rawBasename="${h._rawBasename}"`);
}

// ─── Step 8: Check what the basename map actually contains ────────────────────

console.log('\n=== STEP 8: BASENAME MAP CONTENTS ===\n');
for (const [basename, canonicalId] of basenameMap) {
  console.log(`  "${basename}" → "${canonicalId}"`);
}

// ─── Step 9: Check Shmini Atzeret vs Shemini Atzeret ─────────────────────────

console.log('\n=== STEP 9: SHMINI/SHEMINI ATZERET CHECK ===\n');
const shminiEvents = events.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('hmini') || bn.includes('hemini');
});
for (const ev of shminiEvents) {
  const canonicalId = getCanonicalIdForEvent(ev);
  console.log(`  basename="${ev.basename()}" | render="${ev.render('en')}" | canonicalId="${canonicalId}"`);
}
