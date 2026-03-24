export function hasRequiredText(...values: string[]): boolean {
  return values.every((value) => value.trim().length > 0);
}
