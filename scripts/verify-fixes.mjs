/**
 * Verification script: tests the fixed logic against @hebcal/core for 2026.
 * This script replicates the UPDATED TypeScript logic from the fixed files.
 *
 * Run with: node scripts/verify-fixes.mjs
 */

import {
  HebrewCalendar,
  Location as HebcalLocation,
  flags as hebcalFlags,
} from '@hebcal/core';

// ─── UPDATED holiday-mapper.ts logic ─────────────────────────────────────────

function getCanonicalIdForEvent(ev) {
  const mask = ev.getFlags();
  const basename = ev.basename() || '';

  // 1. Omer
  if (mask & hebcalFlags.OMER_COUNT) return 'omer-daily';

  // 2. Rosh Chodesh (flag-based)
  if (mask & hebcalFlags.ROSH_CHODESH) return 'rosh-chodesh-all';

  // 3. Chol Hamoed
  if (mask & hebcalFlags.CHOL_HAMOED) {
    if (basename === 'Pesach') return 'chag-hamatzot-daily';
    if (basename === 'Sukkot') return 'sukkot-daily';
  }

  // 4. Pesach days (render-based)
  if (basename === 'Pesach') {
    const rendered = ev.render('en') || '';
    if (rendered === 'Pesach I') return 'pesach';
    if (rendered === 'Pesach VII') return 'chag-hamatzot';
    if (rendered === 'Pesach VIII') return 'chag-hamatzot';
    if (
      rendered === 'Pesach II' ||
      rendered === "Pesach III (CH''M)" ||
      rendered === "Pesach IV (CH''M)" ||
      rendered === "Pesach V (CH''M)" ||
      rendered === "Pesach VI (CH''M)"
    ) return 'chag-hamatzot-daily';
    return undefined; // Erev Pesach
  }

  // 5. Chanukah candles (render-based for day 1 and 8)
  if (mask & hebcalFlags.CHANUKAH_CANDLES) {
    const rendered = ev.render('en') || '';
    if (rendered === 'Chanukah: 1 Candle') return 'chanukah';
    if (rendered === 'Chanukah: 8 Candles') return 'chanukah';
    return 'chanukah-daily';
  }

  // 6. Shabbat
  if (basename === 'Shabbat' || basename.startsWith('Shabbat ')) return 'shabbat-all';

  // 7. Basename map
  const basenameMap = new Map([
    ['Shavuot', 'shavuot'],
    ['Rosh Hashana', 'rosh-hashanah'],
    ['Yom Kippur', 'yom-kippur'],
    ['Sukkot', 'sukkot'],
    ['Shmini Atzeret', 'sukkot'],  // FIXED: was "Shemini Atzeret"
    ['Simchat Torah', 'sukkot'],
    ['Purim', 'purim'],
    ["Tish'a B'Av", 'tisha-bav'],  // FIXED: was "Tisha B\u2019Av"
    ['Tu BiShvat', 'tu-bishvat'],
    ['Lag BaOmer', 'lag-baomer'],
    ['Yom HaShoah', 'yom-hashoah'],
  ]);
  if (basename && basenameMap.has(basename)) return basenameMap.get(basename);

  return undefined;
}

// ─── UPDATED fixed-rabbinic.ts logic ─────────────────────────────────────────

function isTimingEvent(ev) {
  const basename = ev.basename() || '';
  return ['Candle lighting', 'Havdalah', 'Fast begins', 'Fast ends',
          'Finish eating chametz', 'Biur Chametz'].includes(basename);
}

function isErevEvent(ev) {
  const mask = ev.getFlags();
  // Never suppress Chanukah candle events even if they carry EREV (e.g. day 1 on Friday)
  if (mask & hebcalFlags.CHANUKAH_CANDLES) return false;
  return !!(mask & hebcalFlags.EREV);
}

function isDiasporaSecondDay(ev) {
  const rendered = ev.render('en') || '';
  if (rendered === 'Rosh Hashana II') return true;
  if (rendered === 'Shavuot II') return true;
  if (rendered === 'Sukkot II') return true;
  // Suppress Simchat Torah so only Shmini Atzeret shows as the Sukkot last-day card
  if (rendered === 'Simchat Torah') return true;
  // Suppress Pesach VIII (diaspora 8th day) so only Pesach VII shows as the last-day card
  if (rendered === 'Pesach VIII') return true;
  return false;
}

function isLastDayOfMultiDayHoliday(ev) {
  const rendered = ev.render('en') || '';
  return ['Pesach VII', 'Shmini Atzeret', 'Chanukah: 8 Candles'].includes(rendered);
}

function canonicalIdToGroup(canonicalId) {
  const majorIds = new Set(['pesach','chag-hamatzot','chag-hamatzot-daily','first-fruits','omer-daily','shavuot','rosh-hashanah','yom-kippur','sukkot','sukkot-daily']);
  return majorIds.has(canonicalId) ? 'major' : 'minor';
}

const DEF_NAMES = {
  'pesach': 'Passover (1st Day)',
  'chag-hamatzot': 'Unleavened Bread (Last Day)',
  'chag-hamatzot-daily': 'Unleavened Bread — Every Day',
  'first-fruits': 'First Fruits (Yom HaBikkurim)',
  'omer-daily': 'Counting the Omer — Daily',
  'shavuot': 'Shavuot',
  'rosh-hashanah': 'Rosh Hashanah / Yom Teruah',
  'yom-kippur': 'Yom Kippur',
  'sukkot': 'Sukkot (1st & Last Day)',
  'sukkot-daily': 'Sukkot — Every Day',
  'purim': 'Purim',
  'chanukah': 'Chanukah (1st & 8th Day)',
  'chanukah-daily': 'Chanukah — Every Day',
  'tisha-bav': "Tisha B'Av",
  'shabbat-all': 'All Shabbats',
  'rosh-chodesh-all': 'All New Moons (Rosh Chodesh)',
  'tu-bishvat': 'Tu BiShvat',
  'lag-baomer': 'Lag BaOmer',
  'yom-hashoah': 'Yom HaShoah',
};

const LUMP_VARIANTS = new Set(['shabbat-all', 'rosh-chodesh-all']);
const DAILY_VARIANTS = new Set(['chag-hamatzot-daily', 'omer-daily', 'sukkot-daily', 'chanukah-daily']);

function getDisplayName(ev, canonicalId, isLast) {
  if (LUMP_VARIANTS.has(canonicalId)) {
    return ev.render('en') || DEF_NAMES[canonicalId] || canonicalId;
  }
  if (canonicalId === 'sukkot') return isLast ? 'Sukkot (Last Day)' : 'Sukkot (1st Day)';
  if (canonicalId === 'chanukah') return isLast ? 'Chanukah (Last Day)' : 'Chanukah (1st Day)';
  if (canonicalId === 'chag-hamatzot') return isLast ? 'Unleavened Bread (Last Day)' : 'Unleavened Bread (1st Day)';
  return DEF_NAMES[canonicalId] || canonicalId;
}

function isHomePageHidden(canonicalId) {
  if (DAILY_VARIANTS.has(canonicalId)) return true;
  if (canonicalId === 'shabbat-all') return true;
  return false;
}

// ─── Run the calendar ─────────────────────────────────────────────────────────

const location = HebcalLocation.lookup('New York');
const start = new Date(2026, 0, 1);
const end   = new Date(2026, 11, 31);

const options = { start, end, candlelighting: true, location, il: false,
  noHolidays: false, noMinorFast: false, noModern: false, noRoshChodesh: false,
  noSpecialShabbat: false, sedrot: false, omer: true };

const events = HebrewCalendar.calendar(options);

// ─── Build holidays with FIXED logic ─────────────────────────────────────────

const holidays = [];
for (const ev of events) {
  if (isTimingEvent(ev)) continue;
  if (isErevEvent(ev)) continue;
  if (isDiasporaSecondDay(ev)) continue;

  const canonicalId = getCanonicalIdForEvent(ev);
  if (!canonicalId) continue;

  const gregDate = ev.getDate().greg();
  const isLast = isLastDayOfMultiDayHoliday(ev);
  const displayName = getDisplayName(ev, canonicalId, isLast);

  const startAt = new Date(gregDate);
  startAt.setDate(startAt.getDate() - 1);

  holidays.push({
    canonicalId,
    name: displayName,
    groupId: canonicalIdToGroup(canonicalId),
    endAt: gregDate,
    startAt,
    rawRender: ev.render('en'),
    rawBasename: ev.basename(),
  });
}

// Dedup
const seen = new Set();
const deduped = holidays.filter(h => {
  const key = `${h.canonicalId}_${h.startAt.toISOString().slice(0,10)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// ─── Print home page holidays ─────────────────────────────────────────────────

console.log('\n=== HOME PAGE HOLIDAYS (FIXED, 2026) ===\n');
const homePageHolidays = deduped.filter(h => !isHomePageHidden(h.canonicalId));
console.log(`Total home page holidays: ${homePageHolidays.length}`);
console.log('\nDate       | canonicalId                  | displayName');
console.log('-----------|------------------------------|--------------------------------------');
for (const h of homePageHolidays) {
  const dateStr = h.endAt.toISOString().slice(0, 10);
  console.log(`${dateStr} | ${h.canonicalId.padEnd(28)} | ${h.name}`);
}

// ─── Verify specific fixes ────────────────────────────────────────────────────

console.log('\n=== VERIFICATION CHECKS ===\n');

const checks = [
  { label: 'Pesach I present',                   test: () => deduped.some(h => h.canonicalId === 'pesach' && h.endAt.toISOString().includes('2026-04-02')) },
  { label: 'Pesach VII present (chag-hamatzot)',  test: () => deduped.some(h => h.canonicalId === 'chag-hamatzot' && h.rawRender === 'Pesach VII') },
  { label: 'Pesach VIII present (chag-hamatzot)', test: () => deduped.some(h => h.canonicalId === 'chag-hamatzot' && h.rawRender === 'Pesach VIII') },
  { label: 'Tisha B\'Av present',                test: () => deduped.some(h => h.canonicalId === 'tisha-bav') },
  { label: 'Simchat Torah → sukkot (last day)',   test: () => deduped.some(h => h.canonicalId === 'sukkot' && h.rawRender === 'Simchat Torah') },
  { label: 'Shmini Atzeret suppressed',           test: () => !deduped.some(h => h.rawRender === 'Shmini Atzeret') },
  { label: 'Chanukah day 1 → chanukah',           test: () => deduped.some(h => h.canonicalId === 'chanukah' && h.rawRender === 'Chanukah: 1 Candle') },
  { label: 'Chanukah day 8 → chanukah',           test: () => deduped.some(h => h.canonicalId === 'chanukah' && h.rawRender === 'Chanukah: 8 Candles') },
  { label: 'Rosh Hashana appears once',           test: () => deduped.filter(h => h.canonicalId === 'rosh-hashanah').length === 1 },
  { label: 'Shavuot appears once',                test: () => deduped.filter(h => h.canonicalId === 'shavuot').length === 1 },
  { label: 'Yom Kippur appears once',             test: () => deduped.filter(h => h.canonicalId === 'yom-kippur').length === 1 },
  { label: 'Sukkot I appears once',               test: () => deduped.filter(h => h.canonicalId === 'sukkot' && h.rawRender === 'Sukkot I').length === 1 },
  { label: 'Rosh Chodesh shows specific name',    test: () => deduped.some(h => h.canonicalId === 'rosh-chodesh-all' && h.name.startsWith('Rosh Chodesh ') && h.name !== 'Rosh Chodesh') },
  { label: 'No "All New Moons" on cards',         test: () => !deduped.some(h => h.name === 'All New Moons (Rosh Chodesh)') },
  { label: 'No Erev events in output',            test: () => !deduped.some(h => h.rawRender && h.rawRender.startsWith('Erev')) },
  { label: 'Purim appears once',                  test: () => deduped.filter(h => h.canonicalId === 'purim').length === 1 },
];

let allPassed = true;
for (const check of checks) {
  const passed = check.test();
  if (!passed) allPassed = false;
  console.log(`  ${passed ? '✓' : '✗'} ${check.label}`);
}

console.log(`\n${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);

// ─── Print specific holiday sections ─────────────────────────────────────────

console.log('\n=== PESACH SECTION ===');
for (const h of deduped.filter(h => h.canonicalId.startsWith('pesach') || h.canonicalId.startsWith('chag'))) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== CHANUKAH SECTION ===');
for (const h of deduped.filter(h => h.canonicalId.startsWith('chanukah'))) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== TISHA B\'AV SECTION ===');
for (const h of deduped.filter(h => h.canonicalId === 'tisha-bav')) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== ROSH HASHANAH SECTION ===');
for (const h of deduped.filter(h => h.canonicalId === 'rosh-hashanah')) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== SUKKOT SECTION ===');
for (const h of deduped.filter(h => h.canonicalId.startsWith('sukkot'))) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | ${h.canonicalId} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== ROSH CHODESH SECTION (first 5) ===');
for (const h of deduped.filter(h => h.canonicalId === 'rosh-chodesh-all').slice(0, 5)) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | "${h.name}" | raw="${h.rawRender}"`);
}

console.log('\n=== PURIM SECTION ===');
for (const h of deduped.filter(h => h.canonicalId === 'purim')) {
  console.log(`  ${h.endAt.toISOString().slice(0,10)} | "${h.name}" | raw="${h.rawRender}"`);
}
