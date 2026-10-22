// Isolated candidate runtime probe. Not a browser/RTL/accessibility claim.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const zones = ['Asia/Tehran', 'UTC', 'America/New_York'];
const cases = [
  { input: '2026-03-21 00:00:00', day: 2, selected: '2026-03-22 00:00:00', display: '1405/01/02 00:00:00', utc: '2026-03-21 20:30:00' },
  { input: '2026-03-21 23:59:59', day: 2, selected: '2026-03-22 23:59:59', display: '1405/01/02 23:59:59', utc: '2026-03-22 20:29:59' },
  { input: '2026-03-20 23:59:59', day: 29, selected: '2026-03-20 23:59:59', display: '1404/12/29 23:59:59', utc: '2026-03-20 20:29:59' },
  { input: '2025-03-20 00:00:00', day: 30, selected: '2025-03-20 00:00:00', display: '1403/12/30 00:00:00', utc: '2025-03-19 20:30:00' },
];

if (!process.argv.includes('--probe')) {
  const destination = 'backend/storage/framework/testing/jalali-candidate-selections.json';
  await mkdir('backend/storage/framework/testing', { recursive: true });
  await writeFile('/tmp/jalali-candidate-picker.mjs', await readFile('backend/vendor/ariaieboy/filament-jalali/resources/dist/js/jalali-date-time-picker.js'));
  for (const TZ of zones) {
    const child = spawnSync(process.execPath, [process.argv[1], '--probe'], { env: { ...process.env, TZ }, encoding: 'utf8' });
    process.stdout.write(child.stdout);
    process.stderr.write(child.stderr);
    assert.equal(child.status, 0, `Candidate selection failed with runtime timezone ${TZ}`);
  }
  await writeFile(destination, JSON.stringify(cases));
} else {
  globalThis.window = {};
  const { default: factory } = await import(pathToFileURL('/tmp/jalali-candidate-picker.mjs'));
  for (const fixture of cases) {
    const picker = factory({ displayFormat: 'YYYY/MM/DD HH:mm:ss', firstDayOfWeek: 6, locale: 'fa', shouldCloseOnDateSelection: false, state: fixture.input });
    picker.$refs = { minDate: { value: '' }, maxDate: { value: '' } };
    picker.focusedDate = picker.getSelectedDate();
    picker.hour = Number(fixture.input.slice(11, 13));
    picker.minute = Number(fixture.input.slice(14, 16));
    picker.second = Number(fixture.input.slice(17, 19));
    // Execute the shipped component's own day-selection and Gregorian serialization.
    picker.selectDate(fixture.day);
    assert.equal(picker.state, fixture.selected);
    assert.equal(picker.displayText, fixture.display);
    picker.state = fixture.selected;
    picker.setDisplayText();
    assert.equal(picker.displayText, fixture.display);
    console.log(JSON.stringify({ runtimeTimezone: process.env.TZ, ...fixture }));
  }
}
