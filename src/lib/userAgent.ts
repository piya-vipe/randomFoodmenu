/**
 * Small dependency-free User-Agent parser.
 *
 * UA strings are deliberately messy (every browser claims to be several
 * others), so order matters: check the most specific tokens first.
 * This is best-effort labelling for analytics, not identification.
 */

export type ParsedUserAgent = {
  browser: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
};

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { browser: "Unknown", os: "Unknown", deviceType: "unknown" };

  const s = ua;

  // --- Browser (specific first: Edge/Opera/Samsung all contain "Chrome") ---
  let browser = "Other";
  if (/\bEdg(e|A|iOS)?\//i.test(s)) browser = "Edge";
  else if (/\bOPR\/|\bOpera/i.test(s)) browser = "Opera";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/\bFxiOS\//i.test(s)) browser = "Firefox";
  else if (/\bCriOS\//i.test(s)) browser = "Chrome";
  else if (/\bLine\//i.test(s)) browser = "LINE in-app";
  else if (/FBAN|FBAV/i.test(s)) browser = "Facebook in-app";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Chrome\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = "Safari";

  // --- OS ---
  let os = "Other";
  if (/Windows NT 10/i.test(s)) os = "Windows 10/11";
  else if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  // iPadOS 13+ reports as "Macintosh" but exposes touch; treated below.
  else if (/iPhone|iPod/i.test(s)) os = "iOS";
  else if (/iPad/i.test(s)) os = "iPadOS";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Linux/i.test(s)) os = "Linux";

  // --- Device type ---
  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) {
    deviceType = "tablet";
  } else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s)) {
    deviceType = "mobile";
  } else if (!/Windows|Macintosh|Linux|CrOS/i.test(s)) {
    deviceType = "unknown";
  }

  return { browser, os, deviceType };
}
