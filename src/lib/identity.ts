const ID_KEY = "t60.playerId";
const NAME_KEY = "t60.playerName";

const CALLSIGNS = [
  "Vega",
  "Kepler",
  "Rhea",
  "Orion",
  "Tycho",
  "Halley",
  "Lyra",
  "Draco",
  "Nova",
  "Atlas",
];

function fallbackName(): string {
  const callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)];
  const number = String(Math.floor(Math.random() * 90) + 10);
  return `${callsign} ${number}`;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ID_KEY);
  if (existing) return existing;
  const id = `p_${crypto.randomUUID().replace(/-/g, "")}`;
  window.localStorage.setItem(ID_KEY, id);
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "Cadet";
  const existing = window.localStorage.getItem(NAME_KEY);
  if (existing) return existing;
  const name = fallbackName();
  window.localStorage.setItem(NAME_KEY, name);
  return name;
}

export function setPlayerName(name: string): void {
  if (typeof window === "undefined") return;
  const clean = name.trim().slice(0, 16);
  if (clean) window.localStorage.setItem(NAME_KEY, clean);
}

export function sanitizeName(name: string): string {
  return name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 16);
}
