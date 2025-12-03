/**
 * Converts a price (0-1 range) to cents format
 * @param price - Price in decimal format (e.g., 0.25 for 25 cents)
 * @returns Formatted string in cents (e.g., "25.0")
 */
export function formatPriceInCents(price: number | string | null | undefined): string {
  const numPrice = Number(price) || 0;
  const cents = numPrice * 100;
  return cents.toFixed(1);
}

/**
 * Formats Yes price
 * @param price - Price in decimal format
 * @returns Formatted string like "Y 25.0"
 */
export function formatYesPrice(price: number | string | null | undefined): string {
  return `Y ${formatPriceInCents(price)}`;
}

/**
 * Formats No price
 * @param price - Price in decimal format
 * @returns Formatted string like "N 25.0"
 */
export function formatNoPrice(price: number | string | null | undefined): string {
  return `N ${formatPriceInCents(price)}`;
}

