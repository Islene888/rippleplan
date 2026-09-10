const day = 86_400_000;

const cases = [
  ['2026-11-28', '2027-01-15', true, 'demo: 48-day buffer'],
  ['2026-01-01', '2026-04-01', false, 'exact 90-day boundary'],
  ['2026-01-01', '2026-04-02', false, '91-day clean case'],
  ['2026-02-01', '2026-05-01', true, '89-day shortfall'],
  ['2026-03-01', '2026-06-01', false, '92-day clean case'],
  ['2026-05-31', '2026-08-29', false, 'exact 90-day summer boundary'],
  ['2026-05-31', '2026-08-28', true, '89-day summer shortfall'],
  ['2026-10-15', '2027-01-13', false, 'exact 90-day year crossing'],
  ['2026-10-15', '2027-01-12', true, '89-day year crossing'],
  ['2028-02-28', '2028-05-28', false, 'leap-year boundary'],
  ['2028-02-29', '2028-05-28', true, 'leap-day 89-day shortfall'],
  ['2027-12-31', '2028-06-30', false, 'long clean buffer'],
];

function daysBetween(start, end) {
  return Math.floor((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / day);
}

const results = cases.map(([returnDate, expiryDate, expectedRisk, label]) => {
  const bufferDays = daysBetween(returnDate, expiryDate);
  const actualRisk = bufferDays < 90;
  return { label, bufferDays, expectedRisk, actualRisk, pass: expectedRisk === actualRisk };
});

const passed = results.filter((result) => result.pass).length;
const report = {
  benchmark: 'RipplePlan deterministic passport-validity gate',
  cases: results.length,
  passed,
  accuracy: passed / results.length,
  generatedAt: new Date().toISOString(),
  results,
};

console.log(JSON.stringify(report, null, 2));
if (passed !== results.length) process.exitCode = 1;
