export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "support",
  "help",
  "api",
  "auth",
  "login",
  "signup",
  "discover",
  "profile",
  "settings",
  "refote",
]);

export function validateUsername(input: string) {
  const username = (input || "").toLowerCase();
  if (username.length < 3 || username.length > 20) {
    return { valid: false, reason: "length" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, reason: "reserved" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, reason: "format" };
  }
  return { valid: true };
}
