export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.eE+-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function pickNumber(obj, keys) {
  if (obj == null) return null;
  if (typeof obj !== "object") return toNumber(obj);
  for (const key of keys) {
    if (obj[key] !== undefined) {
      const n = toNumber(obj[key]);
      if (n !== null) return n;
    }
  }
  return null;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
