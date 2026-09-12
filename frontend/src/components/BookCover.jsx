import { useState, useEffect } from "react";

const PALETTES = [
  { bg: "#2a080c", text: "#fafaf9", accent: "#e07a5f", border: "#831843" }, // Deep Maroon
  { bg: "#0f172a", text: "#fef08a", accent: "#38bdf8", border: "#334155" }, // Midnight Navy
  { bg: "#064e3b", text: "#ecfdf5", accent: "#34d399", border: "#047857" }, // Emerald
  { bg: "#3b0764", text: "#f3e8ff", accent: "#c084fc", border: "#581c87" }, // Plum
  { bg: "#1c1917", text: "#f5f5f4", accent: "#f97316", border: "#44403c" }, // Obsidian
  { bg: "#1e1b4b", text: "#fef3c7", accent: "#818cf8", border: "#3730a3" }, // Deep Indigo
];

function stringHash(str) {
  let hash = 0;
  const s = String(str || "Book");
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(text) {
  const words = String(text || "").trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= 13) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function generatePublicationCover(title, author) {
  const hash = stringHash(title + (author || ""));
  const palette = PALETTES[hash % PALETTES.length];
  const lines = wrapTitle(title);
  const safeAuthor = escapeXml(author || "BookWise Edition");
  
  // Calculate vertical alignment for title lines
  const startY = 160 - (lines.length - 1) * 16;
  const titleTspans = lines
    .map((line, idx) => `<tspan x="120" y="${startY + idx * 30}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
      <defs>
        <linearGradient id="g${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg}"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="spine${hash}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
          <stop offset="20%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="240" height="360" fill="url(#g${hash})" rx="6"/>
      
      <!-- Decorative Borders -->
      <rect x="12" y="12" width="216" height="336" fill="none" stroke="${palette.accent}" stroke-width="1.5" stroke-opacity="0.4" rx="4"/>
      <rect x="16" y="16" width="208" height="328" fill="none" stroke="${palette.border}" stroke-width="1" stroke-opacity="0.6" rx="2"/>
      
      <!-- Top Ornament -->
      <path d="M100 45 L120 32 L140 45 L120 58 Z" fill="none" stroke="${palette.accent}" stroke-width="1.5" stroke-opacity="0.8"/>
      <circle cx="120" cy="45" r="3" fill="${palette.accent}"/>
      
      <!-- Title -->
      <text font-family="Georgia, serif" font-size="20" font-weight="700" fill="${palette.text}" text-anchor="middle">
        ${titleTspans}
      </text>
      
      <!-- Separator Line -->
      <line x1="80" y1="265" x2="160" y2="265" stroke="${palette.accent}" stroke-width="1.5" stroke-opacity="0.7"/>
      
      <!-- Author -->
      <text x="120" y="295" font-family="sans-serif" font-size="12" font-weight="500" fill="${palette.text}" fill-opacity="0.85" text-anchor="middle" letter-spacing="1">
        ${safeAuthor}
      </text>
      
      <!-- Spine Shadow Overlay for 3D realism -->
      <rect width="14" height="360" fill="url(#spine${hash})" rx="6"/>
    </svg>`;
    
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const COVER_CACHE = new Map();

function getCachedCover(key) {
  if (COVER_CACHE.has(key)) return COVER_CACHE.get(key);
  try {
    const stored = localStorage.getItem(`bw_cov_${key}`);
    if (stored) {
      COVER_CACHE.set(key, stored);
      return stored;
    }
  } catch {}
  return null;
}

function setCachedCover(key, url) {
  COVER_CACHE.set(key, url);
  try {
    localStorage.setItem(`bw_cov_${key}`, url);
  } catch {}
}

function isInvalidPhoto(url) {
  if (!url) return true;
  const s = String(url).toLowerCase();
  return (
    s.includes("nophoto") ||
    s.includes("nophoto/book") ||
    s.includes("blank") ||
    s.includes("asset_nophoto")
  );
}

export default function BookCover({ src, title, author, className }) {
  const cacheKey = stringHash(String(title || "") + String(author || ""));
  const cachedUrl = getCachedCover(cacheKey);

  const initialSrc = !isInvalidPhoto(src) ? src : !isInvalidPhoto(cachedUrl) ? cachedUrl : null;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(!initialSrc);
  const [loaded, setLoaded] = useState(false);

  const fallbackSvg = generatePublicationCover(title, author);

  useEffect(() => {
    const validSrc = !isInvalidPhoto(src) ? src : !isInvalidPhoto(cachedUrl) ? cachedUrl : null;
    if (validSrc) {
      setCurrentSrc(validSrc);
      setFailed(false);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  }, [src, title, author, cachedUrl]);

  if (failed || !currentSrc) {
    return (
      <img
        src={fallbackSvg}
        alt={title || "Book Cover"}
        loading="lazy"
        decoding="async"
        className={`${className || ""} object-cover transition-opacity duration-300`}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-800 ${className || ""}`}>
      {/* Background SVG placeholder while real image loads */}
      {!loaded && (
        <img
          src={fallbackSvg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-300"
        />
      )}
      <img
        src={currentSrc}
        alt={title || "Book Cover"}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`relative w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}


