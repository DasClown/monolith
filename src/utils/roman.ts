const NUMERALS: ReadonlyArray<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(value: number): string {
  let remaining = Math.max(1, Math.floor(value));
  let output = '';
  for (const [number, numeral] of NUMERALS) {
    while (remaining >= number) {
      output += numeral;
      remaining -= number;
    }
  }
  return output;
}
