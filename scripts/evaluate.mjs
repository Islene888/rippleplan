import { evaluatePassportValidity } from '../lib/passport-validity.ts';

const cases = [
  ['2026-11-28', '2027-01-15', true, '2027-02-28', 'demo: calendar-month shortfall'],
  ['2026-10-14', '2027-01-15', false, '2027-01-14', 'counterfactual: one-day cushion'],
  ['2026-02-01', '2026-05-01', false, '2026-05-01', '89 days can be exactly three months'],
  ['2026-02-01', '2026-04-30', true, '2026-05-01', 'one day before three-month boundary'],
  ['2026-10-15', '2027-01-15', false, '2027-01-15', 'exact three-month year crossing'],
  ['2026-10-15', '2027-01-14', true, '2027-01-15', '90 days can still be too short'],
  ['2026-01-31', '2026-04-30', false, '2026-04-30', 'end-of-month clamp'],
  ['2026-01-31', '2026-04-29', true, '2026-04-30', 'end-of-month shortfall'],
  ['2026-11-30', '2027-02-28', false, '2027-02-28', 'non-leap February clamp'],
  ['2026-11-30', '2027-02-27', true, '2027-02-28', 'non-leap February shortfall'],
  ['2027-11-30', '2028-02-29', false, '2028-02-29', 'leap February clamp'],
  ['2028-02-29', '2028-05-29', false, '2028-05-29', 'leap-day exact boundary'],
  ['2028-02-29', '2028-05-28', true, '2028-05-29', 'leap-day shortfall'],
];

const results = cases.map(([returnDate, expiryDate, expectedRisk, expectedRequiredExpiry, label]) => {
  const result = evaluatePassportValidity(
    new Date(`${returnDate}T00:00:00Z`),
    new Date(`${expiryDate}T00:00:00Z`),
  );
  const actualRisk = result.shortfallDays > 0;
  const pass = expectedRisk === actualRisk && expectedRequiredExpiry === result.requiredExpiryDate;
  return {
    label,
    bufferDays: result.bufferDays,
    requiredExpiryDate: result.requiredExpiryDate,
    shortfallDays: result.shortfallDays,
    cushionDays: result.cushionDays,
    expectedRisk,
    actualRisk,
    pass,
  };
});

const passed = results.filter((result) => result.pass).length;
const report = {
  benchmark: 'RipplePlan production calendar-month passport-validity gate',
  cases: results.length,
  passed,
  accuracy: passed / results.length,
  generatedAt: new Date().toISOString(),
  results,
};

console.log(JSON.stringify(report, null, 2));
if (passed !== results.length) process.exitCode = 1;
