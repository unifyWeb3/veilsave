import React from "react";

/* Lucide 0.x outline set, copied from lucide-icons/lucide (ISC). 24x24 grid,
   1.5px stroke, round caps/joins — the only icon system VeilSave uses.
   Source SVGs also live in assets/icons/ for non-React surfaces. */
export const ICONS = {
  "activity": "<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"></path>",
  "arrow-down-to-line": "<path d=\"M12 17V3\"></path> <path d=\"m6 11 6 6 6-6\"></path> <path d=\"M19 21H5\"></path>",
  "arrow-right": "<path d=\"M5 12h14\"></path> <path d=\"m12 5 7 7-7 7\"></path>",
  "arrow-up-from-line": "<path d=\"m18 9-6-6-6 6\"></path> <path d=\"M12 3v14\"></path> <path d=\"M5 21h14\"></path>",
  "arrow-up-right": "<path d=\"M7 7h10v10\"></path> <path d=\"M7 17 17 7\"></path>",
  "badge-check": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"></path> <path d=\"m9 12 2 2 4-4\"></path>",
  "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M4.929 4.929 19.07 19.071\"></path>",
  "check": "<path d=\"M20 6 9 17l-5-5\"></path>",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"></path>",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\"></path>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"></path>",
  "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"></line> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"></line>",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"m9 12 2 2 4-4\"></path>",
  "circle-dot": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <circle cx=\"12\" cy=\"12\" r=\"1\"></circle>",
  "circle-question-mark": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"></path> <path d=\"M12 17h.01\"></path>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M12 6v6l4 2\"></path>",
  "cloud-off": "<path d=\"M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057\"></path> <path d=\"M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78\"></path> <path d=\"m2 2 20 20\"></path>",
  "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"></rect> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"></path>",
  "dices": "<rect width=\"12\" height=\"12\" x=\"2\" y=\"10\" rx=\"2\" ry=\"2\"></rect> <path d=\"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6\"></path> <path d=\"M6 18h.01\"></path> <path d=\"M10 14h.01\"></path> <path d=\"M15 6h.01\"></path> <path d=\"M18 9h.01\"></path>",
  "external-link": "<path d=\"M15 3h6v6\"></path> <path d=\"M10 14 21 3\"></path> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"></path>",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"></path> <circle cx=\"12\" cy=\"12\" r=\"3\"></circle>",
  "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"></path> <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"></path> <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"></path> <path d=\"m2 2 20 20\"></path>",
  "file-check": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"></path> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"></path> <path d=\"m9 15 2 2 4-4\"></path>",
  "grid-2x2": "<path d=\"M12 3v18\"></path> <path d=\"M3 12h18\"></path> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"></rect>",
  "hash": "<line x1=\"4\" x2=\"20\" y1=\"9\" y2=\"9\"></line> <line x1=\"4\" x2=\"20\" y1=\"15\" y2=\"15\"></line> <line x1=\"10\" x2=\"8\" y1=\"3\" y2=\"21\"></line> <line x1=\"16\" x2=\"14\" y1=\"3\" y2=\"21\"></line>",
  "hourglass": "<path d=\"M5 22h14\"></path> <path d=\"M5 2h14\"></path> <path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"></path> <path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"></path>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle> <path d=\"M12 16v-4\"></path> <path d=\"M12 8h.01\"></path>",
  "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"></path> <circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"></circle>",
  "layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\"></path> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\"></path> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\"></path>",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path>",
  "lock-open": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect> <path d=\"M7 11V7a5 5 0 0 1 9.9-1\"></path>",
  "menu": "<path d=\"M4 5h16\"></path> <path d=\"M4 12h16\"></path> <path d=\"M4 19h16\"></path>",
  "minus": "<path d=\"M5 12h14\"></path>",
  "pause": "<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"></rect> <rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"></rect>",
  "plus": "<path d=\"M5 12h14\"></path> <path d=\"M12 5v14\"></path>",
  "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"></path> <path d=\"M21 3v5h-5\"></path> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"></path> <path d=\"M8 16H3v5\"></path>",
  "scan-line": "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"></path> <path d=\"M17 3h2a2 2 0 0 1 2 2v2\"></path> <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"></path> <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"></path> <path d=\"M7 12h10\"></path>",
  "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"></path> <path d=\"m9 12 2 2 4-4\"></path>",
  "ticket": "<path d=\"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\"></path> <path d=\"M13 5v2\"></path> <path d=\"M13 17v2\"></path> <path d=\"M13 11v2\"></path>",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"></path> <path d=\"M12 9v4\"></path> <path d=\"M12 17h.01\"></path>",
  "vault": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect> <circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"></circle> <path d=\"m7.9 7.9 2.7 2.7\"></path> <circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"></circle> <path d=\"m13.4 10.6 2.7-2.7\"></path> <circle cx=\"7.5\" cy=\"16.5\" r=\".5\" fill=\"currentColor\"></circle> <path d=\"m7.9 16.1 2.7-2.7\"></path> <circle cx=\"16.5\" cy=\"16.5\" r=\".5\" fill=\"currentColor\"></circle> <path d=\"m13.4 13.4 2.7 2.7\"></path> <circle cx=\"12\" cy=\"12\" r=\"2\"></circle>",
  "wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"></path> <path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"></path>",
  "wifi-off": "<path d=\"M12 20h.01\"></path> <path d=\"M8.5 16.429a5 5 0 0 1 7 0\"></path> <path d=\"M5 12.859a10 10 0 0 1 5.17-2.69\"></path> <path d=\"M19 12.859a10 10 0 0 0-2.007-1.523\"></path> <path d=\"M2 8.82a15 15 0 0 1 4.177-2.643\"></path> <path d=\"M22 8.82a15 15 0 0 0-11.288-3.764\"></path> <path d=\"m2 2 20 20\"></path>",
  "x": "<path d=\"M18 6 6 18\"></path> <path d=\"m6 6 12 12\"></path>",
};

export function Icon({ name, size = 16, strokeWidth = 1.5, label, style, ...rest }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flex: "none", display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: d }}
      {...rest}
    />
  );
}
