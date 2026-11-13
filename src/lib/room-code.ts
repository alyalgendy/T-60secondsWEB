const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
export const CODE_LENGTH = 5;

export function generateRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

export function normalizeRoomCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  const fromLink = trimmed.match(/\/ROOM\/([A-Z0-9]+)/);
  if (fromLink) return fromLink[1];
  return trimmed.replace(/[^A-Z0-9]/g, "");
}

export function isValidRoomCode(input: string): boolean {
  if (input.length !== CODE_LENGTH) return false;
  for (const char of input) if (!ALPHABET.includes(char)) return false;
  return true;
}

export function roomLink(code: string): string {
  if (typeof window === "undefined") return `/room/${code}`;
  return `${window.location.origin}/room/${code}`;
}
