/** Platform support / reply-to address. */
export function getSupportEmail(): string {
  return (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    "hi@hanoinsiders.com"
  );
}
