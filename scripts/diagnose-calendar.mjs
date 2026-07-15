/**
 * Diagnostic script: compare app's holiday output against raw @hebcal/core events.
 *
 * Run with: node scripts/diagnose-calendar.mjs
 */

import {
  HebrewCalendar,
  Location as HebcalLocation,
  flags as hebcalFlags,
} from '@hebcal/core';

// ─── 1. Raw Hebcal output for 2026 ───────────────────────────────────────────

const location = HebcalLocation.lookup('New York');
const start = new Date(2026, 0, 1);   // 1 Jan 2026
const end   = new Date(2026, 11, 31); // 31 Dec 2026

const rawOptions = {
  start,
  end,
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

const rawEvents = HebrewCalendar.calendar(rawOptions);

// ─── 2. Print all raw events with their flags ─────────────────────────────────

console.log('\n=== RAW HEBCAL EVENTS (2026) ===\n');
console.log('Date       | Flags (hex) | basename()                    | render()');
console.log('-----------|-------------|-------------------------------|----------------------------------');

// Flag names for readability
const FLAG_NAMES = {
  [hebcalFlags.CHAG]:             'CHAG',
  [hebcalFlags.LIGHT_CANDLES]:    'LIGHT_CANDLES',
  [hebcalFlags.YOM_TOV_ENDS]:     'YOM_TOV_ENDS',
  [hebcalFlags.CHUL_ONLY]:        'CHUL_ONLY',
  [hebcalFlags.IL_ONLY]:          'IL_ONLY',
  [hebcalFlags.LIGHT_CANDLES_TZEIS]: 'LIGHT_CANDLES_TZEIS',
  [hebcalFlags.CHANUKAH_CANDLES]: 'CHANUKAH_CANDLES',
  [hebcalFlags.ROSH_CHODESH]:     'ROSH_CHODESH',
  [hebcalFlags.MINOR_FAST]:       'MINOR_FAST',
  [hebcalFlags.SPECIAL_SHABBAT]:  'SPECIAL_SHABBAT',
  [hebcalFlags.PARSHA_HASHAVUA]:  'PARSHA_HASHAVUA',
  [hebcalFlags.DAF_YOMI]:         'DAF_YOMI',
  [hebcalFlags.OMER_COUNT]:       'OMER_COUNT',
  [hebcalFlags.MODERN_HOLIDAY]:   'MODERN_HOLIDAY',
  [hebcalFlags.MAJOR_FAST]:       'MAJOR_FAST',
  [hebcalFlags.SHABBAT_MEVARCHIM]:'SHABBAT_MEVARCHIM',
  [hebcalFlags.MOLAD]:            'MOLAD',
  [hebcalFlags.USER_EVENT]:       'USER_EVENT',
  [hebcalFlags.HEBREW_DATE]:      'HEBREW_DATE',
  [hebcalFlags.MINOR_HOLIDAY]:    'MINOR_HOLIDAY',
  [hebcalFlags.EREV]:             'EREV',
  [hebcalFlags.CHOL_HAMOED]:      'CHOL_HAMOED',
  [hebcalFlags.MISHNA_YOMI]:      'MISHNA_YOMI',
  [hebcalFlags.YOM_KIPPUR_KATAN]: 'YOM_KIPPUR_KATAN',
  [hebcalFlags.NACH_YOMI]:        'NACH_YOMI',
  [hebcalFlags.DAILY_LEARNING]:   'DAILY_LEARNING',
  [hebcalFlags.YERUSHALMI_YOMI]:  'YERUSHALMI_YOMI',
  [hebcalFlags.YIZKOR]:           'YIZKOR',
  [hebcalFlags.BEHAB]:            'BEHAB',
};

function flagsToNames(mask) {
  const names = [];
  for (const [bit, name] of Object.entries(FLAG_NAMES)) {
    if (mask & Number(bit)) names.push(name);
  }
  return names.join('|') || '(none)';
}

// Filter to only holiday-relevant events (exclude parsha, daf yomi, etc.)
const EXCLUDE_FLAGS =
  hebcalFlags.PARSHA_HASHAVUA |
  hebcalFlags.DAF_YOMI |
  hebcalFlags.MISHNA_YOMI |
  hebcalFlags.NACH_YOMI |
  hebcalFlags.YERUSHALMI_YOMI |
  hebcalFlags.DAILY_LEARNING |
  hebcalFlags.MOLAD |
  hebcalFlags.SHABBAT_MEVARCHIM |
  hebcalFlags.YOM_KIPPUR_KATAN |
  hebcalFlags.BEHAB |
  hebcalFlags.USER_EVENT |
  hebcalFlags.HEBREW_DATE |
  hebcalFlags.OMER_COUNT; // too many, print separately

const holidayEvents = rawEvents.filter(ev => !(ev.getFlags() & EXCLUDE_FLAGS));

for (const ev of holidayEvents) {
  const greg = ev.getDate().greg();
  const dateStr = greg.toISOString().slice(0, 10);
  const mask = ev.getFlags();
  const basename = ev.basename() || '(null)';
  const render = ev.render('en') || '(null)';
  console.log(`${dateStr} | 0x${mask.toString(16).padStart(8,'0')} | ${basename.padEnd(30)} | ${render}`);
}

// ─── 3. Print Omer events separately (just first and last) ───────────────────

const omerEvents = rawEvents.filter(ev => ev.getFlags() & hebcalFlags.OMER_COUNT);
console.log(`\n=== OMER EVENTS: ${omerEvents.length} total ===`);
if (omerEvents.length > 0) {
  const first = omerEvents[0];
  const last = omerEvents[omerEvents.length - 1];
  console.log(`First: ${first.getDate().greg().toISOString().slice(0,10)} | basename="${first.basename()}" | render="${first.render('en')}"`);
  console.log(`Last:  ${last.getDate().greg().toISOString().slice(0,10)} | basename="${last.basename()}" | render="${last.render('en')}"`);
}

// ─── 4. Check specific basenames the app expects ─────────────────────────────

console.log('\n=== CHECKING EXPECTED BASENAMES ===\n');

const expectedBasenames = [
  'Pesach I', 'Pesach II', 'Pesach III', 'Pesach IV', 'Pesach V',
  'Pesach VI', 'Pesach VII', 'Pesach VIII',
  'Chol Hamoed Pesach',
  'Shavuot',
  'Rosh Hashana',
  'Yom Kippur',
  'Sukkot', 'Chol Hamoed Sukkot', 'Shemini Atzeret', 'Simchat Torah',
  'Chanukah: 1 day', 'Chanukah: 2 days', 'Chanukah: 3 days',
  'Chanukah: 4 days', 'Chanukah: 5 days', 'Chanukah: 6 days',
  'Chanukah: 7 days', 'Chanukah: 8 days',
  'Purim',
  'Tisha B\'Av',
  'Tu BiShvat',
  'Lag BaOmer',
  'Yom HaShoah',
  'Rosh Chodesh',
  'Shabbat',
];

// Build a set of all basenames actually seen
const seenBasenames = new Set(rawEvents.map(ev => ev.basename()).filter(Boolean));

for (const expected of expectedBasenames) {
  const found = seenBasenames.has(expected);
  console.log(`  ${found ? '✓' : '✗'} "${expected}"`);
}

// ─── 5. Print all unique basenames seen ──────────────────────────────────────

console.log('\n=== ALL UNIQUE BASENAMES SEEN IN 2026 ===\n');
const sortedBasenames = [...seenBasenames].sort();
for (const bn of sortedBasenames) {
  console.log(`  "${bn}"`);
}

// ─── 6. Check for Rosh Hashanah specifically ─────────────────────────────────

console.log('\n=== ROSH HASHANAH EVENTS ===\n');
const rhEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Rosh') && bn.includes('Hash');
});
for (const ev of rhEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 7. Check for Tisha B'Av specifically ────────────────────────────────────

console.log('\n=== TISHA B\'AV EVENTS ===\n');
const tbEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Tisha') || bn.includes('B\'Av') || bn.includes('B\u2019Av');
});
for (const ev of tbEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 8. Check for Shavuot specifically ───────────────────────────────────────

console.log('\n=== SHAVUOT EVENTS ===\n');
const shavuotEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Shavuot') || bn.includes('Shavuos');
});
for (const ev of shavuotEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 9. Check for Sukkot specifically ────────────────────────────────────────

console.log('\n=== SUKKOT EVENTS ===\n');
const sukkotEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Sukkot') || bn.includes('Shemini') || bn.includes('Simchat');
});
for (const ev of sukkotEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 10. Check for Chanukah specifically ─────────────────────────────────────

console.log('\n=== CHANUKAH EVENTS ===\n');
const chanukahEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Chanukah') || bn.includes('Hanukkah');
});
for (const ev of chanukahEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 11. Check for Pesach specifically ───────────────────────────────────────

console.log('\n=== PESACH EVENTS ===\n');
const pesachEvents = rawEvents.filter(ev => {
  const bn = ev.basename() || '';
  return bn.includes('Pesach') || bn.includes('Passover');
});
for (const ev of pesachEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}

// ─── 12. Check for Rosh Chodesh specifically ─────────────────────────────────

console.log('\n=== ROSH CHODESH EVENTS ===\n');
const rcEvents = rawEvents.filter(ev => ev.getFlags() & hebcalFlags.ROSH_CHODESH);
for (const ev of rcEvents) {
  console.log(`  ${ev.getDate().greg().toISOString().slice(0,10)} | basename="${ev.basename()}" | render="${ev.render('en')}" | flags=0x${ev.getFlags().toString(16)}`);
}
