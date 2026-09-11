const TRUSTED_THREE_MONTH_NUMERIC_PHRASE = /\b3(?:\s+months|-month)\b/gi;

export function hasDisallowedModelNumber(value: string) {
  const withoutTrustedRuleConstant = value.replace(
    TRUSTED_THREE_MONTH_NUMERIC_PHRASE,
    'three months',
  );
  return /\d/.test(withoutTrustedRuleConstant);
}
