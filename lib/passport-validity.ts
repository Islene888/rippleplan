export const DAY_MS = 86_400_000;

export type PassportValidityResult = {
  bufferDays: number;
  shortfallDays: number;
  cushionDays: number;
  requiredExpiry: Date;
  requiredExpiryDate: string;
};

export function addUtcCalendarMonths(date: Date, months: number) {
  const targetMonthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastTargetDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(date.getUTCDate(), lastTargetDay)));
}

export function evaluatePassportValidity(
  plannedSchengenExit: Date,
  passportExpiry: Date,
  requiredCalendarMonths = 3,
): PassportValidityResult {
  const requiredExpiry = addUtcCalendarMonths(plannedSchengenExit, requiredCalendarMonths);
  const bufferDays = Math.floor((passportExpiry.getTime() - plannedSchengenExit.getTime()) / DAY_MS);
  const shortfallDays = Math.max(
    0,
    Math.ceil((requiredExpiry.getTime() - passportExpiry.getTime()) / DAY_MS),
  );
  const cushionDays = Math.max(
    0,
    Math.floor((passportExpiry.getTime() - requiredExpiry.getTime()) / DAY_MS),
  );

  return {
    bufferDays,
    shortfallDays,
    cushionDays,
    requiredExpiry,
    requiredExpiryDate: requiredExpiry.toISOString().slice(0, 10),
  };
}
