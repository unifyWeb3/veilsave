/* @ds-bundle: {"format":4,"namespace":"VeilSaveDesignSystem_484fa6","components":[{"name":"ConfidentialValue","sourcePath":"components/confidential/ConfidentialValue.jsx"},{"name":"FinancialMetric","sourcePath":"components/confidential/FinancialMetric.jsx"},{"name":"PrivacyCallout","sourcePath":"components/confidential/PrivacyCallout.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"ICONS","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"ProgressTrack","sourcePath":"components/core/ProgressTrack.jsx"},{"name":"SectionHead","sourcePath":"components/core/SectionHead.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"},{"name":"Tooltip","sourcePath":"components/core/Tooltip.jsx"},{"name":"RecoveryBanner","sourcePath":"components/feedback/RecoveryBanner.jsx"},{"name":"StateBlock","sourcePath":"components/feedback/StateBlock.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"AmountField","sourcePath":"components/forms/AmountField.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"ActivityItem","sourcePath":"components/protocol/ActivityItem.jsx"},{"name":"VS_NODE","sourcePath":"components/protocol/EpochTimeline.jsx"},{"name":"EpochTimeline","sourcePath":"components/protocol/EpochTimeline.jsx"},{"name":"EpochNodeLegend","sourcePath":"components/protocol/EpochTimeline.jsx"},{"name":"EvidenceRow","sourcePath":"components/protocol/EvidenceRow.jsx"},{"name":"ProofBlock","sourcePath":"components/protocol/ProofBlock.jsx"},{"name":"QueueItem","sourcePath":"components/protocol/QueueItem.jsx"},{"name":"ResultState","sourcePath":"components/protocol/ResultState.jsx"},{"name":"SlotGrid","sourcePath":"components/protocol/SlotGrid.jsx"},{"name":"StatusStepper","sourcePath":"components/protocol/StatusStepper.jsx"},{"name":"TicketPanel","sourcePath":"components/protocol/TicketPanel.jsx"},{"name":"ConsoleNav","sourcePath":"components/shell/ConsoleNav.jsx"},{"name":"Sheet","sourcePath":"components/shell/Sheet.jsx"},{"name":"StrategyBadge","sourcePath":"components/shell/StrategyBadge.jsx"},{"name":"WalletControl","sourcePath":"components/shell/WalletControl.jsx"},{"name":"Wordmark","sourcePath":"components/shell/Wordmark.jsx"}],"sourceHashes":{"components/confidential/ConfidentialValue.jsx":"0b82d9fdbc15","components/confidential/FinancialMetric.jsx":"97fb96e11b1e","components/confidential/PrivacyCallout.jsx":"32f4cc62623f","components/core/Badge.jsx":"96d2934cf422","components/core/Button.jsx":"e3d7201dceb2","components/core/Card.jsx":"d466e2f3c546","components/core/Icon.jsx":"af0d744d7063","components/core/IconButton.jsx":"b270db78278c","components/core/ProgressTrack.jsx":"bf38f0b7b73a","components/core/SectionHead.jsx":"264878c4889d","components/core/StatusPill.jsx":"dcf695d4857e","components/core/Tabs.jsx":"7c7c4e8df9fa","components/core/Tooltip.jsx":"aa74147298d8","components/feedback/RecoveryBanner.jsx":"6e5c2577376c","components/feedback/StateBlock.jsx":"4e92fcd11cd4","components/feedback/Toast.jsx":"3045cc05504a","components/forms/AmountField.jsx":"97a69cc670d7","components/forms/Select.jsx":"4d1bba63bc3d","components/forms/TextField.jsx":"803e21ebd427","components/protocol/ActivityItem.jsx":"813956f3a3be","components/protocol/EpochTimeline.jsx":"e176e7c2e163","components/protocol/EvidenceRow.jsx":"c5737d99bdda","components/protocol/ProofBlock.jsx":"e61a6aa9a665","components/protocol/QueueItem.jsx":"c698cbafdbff","components/protocol/ResultState.jsx":"17039e78b7d0","components/protocol/SlotGrid.jsx":"3c1374def3a2","components/protocol/StatusStepper.jsx":"ddca5bb30871","components/protocol/TicketPanel.jsx":"33e07a223a07","components/shell/ConsoleNav.jsx":"5e467433ca0d","components/shell/Sheet.jsx":"dfa6ba37b4f0","components/shell/StrategyBadge.jsx":"d1835a499630","components/shell/WalletControl.jsx":"5cf9cdb21bff","components/shell/Wordmark.jsx":"0e3c73a860da","ui_kits/console/ConsoleShell.jsx":"d8fcbf9d4528","ui_kits/console/DepositFlow.jsx":"b2d59cf9e69a","ui_kits/console/DrawsVerify.jsx":"3fbad18a6910","ui_kits/console/Overview.jsx":"9115a5a808bc","ui_kits/console/PrizePanel.jsx":"decc9728814e","ui_kits/console/WithdrawFlow.jsx":"83f7481695a6","ui_kits/console/mock.jsx":"86279d8b4ab0","ui_kits/site/Hero.jsx":"0bef349d0ba8","ui_kits/site/PoolField.jsx":"9fc45c542cde","ui_kits/site/SiteChrome.jsx":"c9c7fea27b1d","ui_kits/site/Story.jsx":"cee5408635e1"},"inlinedExternals":[],"unexposedExports":[{"name":"useIsNarrow","sourcePath":"components/shell/Sheet.jsx"}]} */

(() => {

const __ds_ns = (window.VeilSaveDesignSystem_484fa6 = window.VeilSaveDesignSystem_484fa6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const vsCardTones = {
  base: {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-hairline)"
  },
  inset: {
    background: "var(--surface-inset)",
    border: "1px solid var(--border-hairline)"
  },
  quiet: {
    background: "transparent",
    border: "1px solid var(--border-hairline)"
  },
  private: {
    background: "var(--wash-private)",
    border: "1px solid var(--border-private)"
  },
  verified: {
    background: "var(--wash-verified)",
    border: "1px solid var(--border-verified)"
  }
};

/** Frame for a repeated record, a dialog body, or a framed tool. Never wrap a whole page section, never nest. */
function Card({
  children,
  tone = "base",
  pad = 20,
  interactive = false,
  as = "div",
  style,
  ...rest
}) {
  const Tag = as;
  const t = vsCardTones[tone] || vsCardTones.base;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    style: {
      borderRadius: "var(--r-lg)",
      padding: pad,
      boxShadow: "var(--sheen-top)",
      transition: interactive ? "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)" : undefined,
      cursor: interactive ? "pointer" : undefined,
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Lucide 0.x outline set, copied from lucide-icons/lucide (ISC). 24x24 grid,
   1.5px stroke, round caps/joins — the only icon system VeilSave uses.
   Source SVGs also live in assets/icons/ for non-React surfaces. */
const ICONS = {
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
  "x": "<path d=\"M18 6 6 18\"></path> <path d=\"m6 6 12 12\"></path>"
};
function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  label,
  style,
  ...rest
}) {
  const d = ICONS[name];
  if (!d) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    focusable: "false",
    style: {
      flex: "none",
      display: "block",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: d
    }
  }, rest));
}
Object.assign(__ds_scope, { ICONS, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/confidential/PrivacyCallout.jsx
try { (() => {
/**
 * The public/private boundary, stated plainly. Two columns, no hedging: what stays
 * encrypted, and what anyone can see. Never claims anonymity.
 */
function PrivacyCallout({
  title = "What stays private, what stays public",
  privateItems = ["Savings amount", "Eligible weight and odds", "Withdrawal amount", "Prize amount"],
  publicItems = ["Wallet address", "Transaction timing", "Slot occupancy", "Winner address after finalization"],
  limitation = "Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.",
  compact = false,
  style
}) {
  const col = (heading, items, tone) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minWidth: 0,
      flex: "1 1 200px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: tone === "private" ? "var(--text-private)" : "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: tone === "private" ? "lock" : "eye",
    size: 12,
    strokeWidth: 1.8
  }), heading), /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "baseline",
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 3,
      height: 3,
      marginTop: 8,
      borderRadius: 1,
      flex: "none",
      background: tone === "private" ? "var(--periwinkle-500)" : "var(--ink-500)"
    }
  }), it))));
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: compact ? 14 : 18,
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--r-lg)",
      padding: compact ? 16 : 22,
      background: "var(--surface-base)",
      ...style
    }
  }, title ? /*#__PURE__*/React.createElement("h3", {
    className: "vs-title-2",
    style: {
      margin: 0
    }
  }, title) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 32,
      flexWrap: "wrap"
    }
  }, col("Encrypted", privateItems, "private"), col("Public", publicItems, "public")), limitation ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      borderTop: "1px solid var(--border-hairline)",
      paddingTop: 14,
      margin: 0,
      maxWidth: "var(--measure-prose)"
    }
  }, limitation) : null);
}
Object.assign(__ds_scope, { PrivacyCallout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/confidential/PrivacyCallout.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const vsBadgeTones = {
  neutral: {
    bg: "var(--wash-neutral)",
    fg: "var(--text-secondary)",
    bd: "var(--border-hairline)"
  },
  private: {
    bg: "var(--wash-private)",
    fg: "var(--text-private)",
    bd: "var(--border-private)"
  },
  verified: {
    bg: "var(--wash-verified)",
    fg: "var(--text-verified)",
    bd: "var(--border-verified)"
  },
  pending: {
    bg: "var(--wash-pending)",
    fg: "var(--text-pending)",
    bd: "var(--border-pending)"
  },
  critical: {
    bg: "var(--wash-critical)",
    fg: "var(--text-critical)",
    bd: "var(--border-critical)"
  }
};

/** Small static label for identity and metadata (network, epoch, strategy, slot). Not for live status — use StatusPill. */
function Badge({
  children,
  tone = "neutral",
  icon,
  mono = false,
  style,
  ...rest
}) {
  const t = vsBadgeTones[tone] || vsBadgeTones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 21,
      padding: "0 7px",
      borderRadius: "var(--r-xs)",
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      font: mono ? "var(--type-mono-sm)" : "var(--type-micro)",
      letterSpacing: mono ? "var(--tr-mono)" : "var(--tr-label)",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 11,
    strokeWidth: 1.75
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const vsBtnSizes = {
  sm: {
    height: 30,
    padding: "0 10px",
    font: "var(--type-body-sm)",
    gap: 6,
    radius: "var(--r-sm)"
  },
  md: {
    height: 38,
    padding: "0 14px",
    font: "var(--type-body-sm)",
    gap: 7,
    radius: "var(--r-md)"
  },
  lg: {
    height: 46,
    padding: "0 20px",
    font: "var(--type-title-3)",
    gap: 8,
    radius: "var(--r-md)"
  }
};
const vsBtnTones = {
  primary: {
    background: "var(--action-primary-bg)",
    color: "var(--action-primary-fg)",
    border: "1px solid transparent"
  },
  secondary: {
    background: "var(--action-secondary-bg)",
    color: "var(--action-secondary-fg)",
    border: "1px solid var(--action-secondary-border)"
  },
  ghost: {
    background: "transparent",
    color: "var(--action-ghost-fg)",
    border: "1px solid transparent"
  },
  reveal: {
    background: "var(--wash-private)",
    color: "var(--action-reveal-fg)",
    border: "1px solid var(--action-reveal-border)"
  },
  danger: {
    background: "transparent",
    color: "var(--action-danger-fg)",
    border: "1px solid var(--border-critical)"
  }
};

/** Primary command control. Tone carries intent; `reveal` is reserved for confidential-value actions. */
function Button({
  children,
  tone = "primary",
  size = "md",
  icon,
  iconAfter,
  block = false,
  busy = false,
  disabled = false,
  type = "button",
  style,
  ...rest
}) {
  const s = vsBtnSizes[size] || vsBtnSizes.md;
  const t = vsBtnTones[tone] || vsBtnTones.primary;
  const off = disabled || busy;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: off,
    "aria-busy": busy || undefined,
    className: "vs-btn",
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : undefined,
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.height,
      minHeight: s.height,
      padding: s.padding,
      borderRadius: s.radius,
      font: s.font,
      fontWeight: 500,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      cursor: off ? "not-allowed" : "pointer",
      transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), transform var(--dur-instant) var(--ease-standard)",
      ...t,
      ...(off ? {
        background: tone === "primary" ? "var(--action-disabled-bg)" : "transparent",
        color: "var(--action-disabled-fg)",
        borderColor: tone === "primary" ? "transparent" : "var(--border-hairline)"
      } : null),
      ...style
    }
  }, rest), busy ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 14,
      height: 14,
      display: "block",
      position: "relative",
      overflow: "hidden",
      borderRadius: 1,
      background: "currentColor",
      opacity: 0.28
    }
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "lg" ? 17 : 15
  }) : null, children, iconAfter ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconAfter,
    size: size === "lg" ? 17 : 15
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square icon-only control. Always pass `label` — it becomes the accessible name and the tooltip text. */
function IconButton({
  name,
  label,
  size = "md",
  tone = "ghost",
  disabled = false,
  active = false,
  style,
  ...rest
}) {
  const box = size === "sm" ? 28 : size === "lg" ? 44 : 34;
  const tones = {
    ghost: {
      background: active ? "var(--wash-neutral)" : "transparent",
      color: active ? "var(--text-primary)" : "var(--text-muted)",
      border: "1px solid transparent"
    },
    outline: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border-subtle)"
    },
    private: {
      background: "var(--wash-private)",
      color: "var(--text-private)",
      border: "1px solid var(--border-private)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    className: "vs-iconbtn",
    style: {
      width: box,
      height: box,
      minWidth: box,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--r-sm)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)",
      ...(tones[tone] || tones.ghost),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: size === "sm" ? 14 : size === "lg" ? 19 : 16
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressTrack.jsx
try { (() => {
const vsProgTones = {
  private: "var(--periwinkle-500)",
  verified: "var(--teal-500)",
  pending: "var(--amber-500)",
  neutral: "var(--ink-600)"
};

/** Horizontal progress rail. `indeterminate` uses the SCAN pattern (a travelling band) instead of a spinner. */
function ProgressTrack({
  value = 0,
  tone = "private",
  indeterminate = false,
  height = 3,
  label,
  style
}) {
  const c = vsProgTones[tone] || vsProgTones.private;
  return /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": label,
    "aria-valuenow": indeterminate ? undefined : Math.round(value),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    style: {
      position: "relative",
      height,
      width: "100%",
      background: "var(--slot-empty)",
      borderRadius: "var(--r-pill)",
      overflow: "hidden",
      ...style
    }
  }, indeterminate ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      width: "40%",
      background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
      animation: "vs-scan 1.5s var(--ease-mechanical) infinite"
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      height: "100%",
      width: Math.max(0, Math.min(100, value)) + "%",
      background: c,
      borderRadius: "var(--r-pill)",
      transition: "width var(--dur-epoch) var(--ease-mechanical)"
    }
  }));
}
Object.assign(__ds_scope, { ProgressTrack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressTrack.jsx", error: String((e && e.message) || e) }); }

// components/confidential/ConfidentialValue.jsx
try { (() => {
const vsCvSizes = {
  row: {
    font: "var(--type-num-4)",
    dot: "0.54em",
    gap: "0.17em"
  },
  md: {
    font: "var(--type-num-3)",
    dot: "0.52em",
    gap: "0.16em"
  },
  lg: {
    font: "var(--type-num-2)",
    dot: "0.5em",
    gap: "0.15em"
  },
  xl: {
    font: "var(--type-num-1)",
    dot: "0.48em",
    gap: "0.14em"
  }
};

/* Redaction is always six marks regardless of the true digit count: the length of a
   value is itself private. The seal rule underneath says "a value exists and is sealed"
   rather than "a value is missing". */
function Redaction({
  size
}) {
  const s = vsCvSizes[size] || vsCvSizes.md;
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: s.gap,
      letterSpacing: 0,
      color: "var(--text-private)",
      fontSize: s.dot,
      lineHeight: 1,
      borderBottom: "1px solid var(--border-private)",
      paddingBottom: "0.42em",
      marginBottom: "-0.1em"
    }
  }, "••••••".split("").map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, d)));
}
const vsCvCopy = {
  masked: {
    note: "Encrypted",
    tone: "private",
    icon: "lock"
  },
  revealing: {
    note: "Preparing secure reveal…",
    tone: "private",
    icon: "key-round"
  },
  aclPending: {
    note: "Private access is being confirmed",
    tone: "pending",
    icon: "hourglass"
  },
  revealed: {
    note: "Visible in this session only",
    tone: "neutral",
    icon: "eye"
  },
  stale: {
    note: "Value may be out of date",
    tone: "pending",
    icon: "clock"
  },
  unavailable: {
    note: "Private value unavailable",
    tone: "neutral",
    icon: "cloud-off"
  },
  error: {
    note: "Reveal failed",
    tone: "critical",
    icon: "circle-alert"
  }
};

/**
 * The confidential-value primitive: one encrypted figure, one independent reveal.
 * Revealing one value never reveals another — every instance owns its own state.
 */
function ConfidentialValue({
  state = "masked",
  value,
  unit = "cUSDT",
  size = "md",
  label,
  onReveal,
  onHide,
  onRetry,
  note,
  hideActions = false,
  style
}) {
  const s = vsCvSizes[size] || vsCvSizes.md;
  const meta = vsCvCopy[state] || vsCvCopy.masked;
  const showsValue = state === "revealed" || state === "stale";
  const isBig = size === "xl" || size === "lg";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: isBig ? 12 : 7,
      minWidth: 0,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "vs-label"
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      minHeight: isBig ? 44 : 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vs-num",
    style: {
      font: s.font,
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-primary)",
      display: "inline-flex",
      alignItems: "baseline",
      letterSpacing: "var(--tr-display)"
    }
  }, showsValue ? /*#__PURE__*/React.createElement("span", {
    style: {
      animation: "vs-decrypt var(--dur-deliberate) var(--ease-entrance)",
      opacity: state === "stale" ? 0.72 : 1
    }
  }, value) : state === "unavailable" || state === "error" ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-faint)"
    }
  }, "\u2014") : /*#__PURE__*/React.createElement(Redaction, {
    size: size
  })), showsValue || state === "masked" || state === "revealing" || state === "aclPending" ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: isBig ? "var(--type-body-sm)" : "var(--type-micro)",
      color: "var(--text-muted)",
      letterSpacing: "0.03em"
    }
  }, unit) : null, state === "revealed" && !hideActions ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onHide,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      marginLeft: 2,
      background: "none",
      border: 0,
      cursor: "pointer",
      color: "var(--text-muted)",
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      padding: "4px 2px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "eye-off",
    size: 12
  }), " Hide") : null), state === "revealing" ? /*#__PURE__*/React.createElement(__ds_scope.ProgressTrack, {
    indeterminate: true,
    tone: "private",
    label: "Preparing secure reveal",
    style: {
      maxWidth: 180
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: meta.tone === "private" ? "var(--text-private)" : meta.tone === "pending" ? "var(--text-pending)" : meta.tone === "critical" ? "var(--text-critical)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      animation: state === "revealing" || state === "aclPending" ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: meta.icon,
    size: 12,
    strokeWidth: 1.8
  })), note || meta.note), !hideActions && state === "masked" ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "reveal",
    size: "sm",
    icon: "eye",
    onClick: onReveal
  }, "Reveal") : null, !hideActions && (state === "error" || state === "unavailable") ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "secondary",
    size: "sm",
    icon: "refresh-cw",
    onClick: onRetry
  }, "Retry") : null, !hideActions && state === "stale" ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "ghost",
    size: "sm",
    icon: "refresh-cw",
    onClick: onRetry
  }, "Refresh") : null));
}
Object.assign(__ds_scope, { ConfidentialValue });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/confidential/ConfidentialValue.jsx", error: String((e && e.message) || e) }); }

// components/confidential/FinancialMetric.jsx
try { (() => {
/** A labelled confidential figure with supporting context — the unit of the dashboard position block. */
function FinancialMetric({
  label,
  hint,
  state = "masked",
  value,
  unit = "cUSDT",
  size = "lg",
  footnote,
  footnoteTone = "muted",
  onReveal,
  onHide,
  onRetry,
  align = "start",
  style
}) {
  const tones = {
    muted: "var(--text-muted)",
    private: "var(--text-private)",
    verified: "var(--text-verified)",
    pending: "var(--text-pending)",
    critical: "var(--text-critical)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      alignItems: align === "end" ? "flex-end" : "flex-start",
      minWidth: 0,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vs-label"
  }, label), hint ? /*#__PURE__*/React.createElement("span", {
    title: hint,
    style: {
      display: "flex",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-question-mark",
    size: 12,
    label: hint
  })) : null) : null, /*#__PURE__*/React.createElement(__ds_scope.ConfidentialValue, {
    state: state,
    value: value,
    unit: unit,
    size: size,
    onReveal: onReveal,
    onHide: onHide,
    onRetry: onRetry
  }), footnote ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: tones[footnoteTone] || tones.muted,
      maxWidth: 320
    }
  }, footnote) : null);
}
Object.assign(__ds_scope, { FinancialMetric });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/confidential/FinancialMetric.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHead.jsx
try { (() => {
/** Section opener: eyebrow label, title, optional description and trailing controls, closed by a hairline. Sections are ruled, not carded. */
function SectionHead({
  label,
  title,
  description,
  actions,
  rule = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      paddingBottom: rule ? 14 : 0,
      borderBottom: rule ? "1px solid var(--border-hairline)" : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 0
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "vs-label"
  }, label) : null, title ? /*#__PURE__*/React.createElement("h2", {
    className: "vs-title-1",
    style: {
      margin: 0
    }
  }, title) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, actions) : null), description ? /*#__PURE__*/React.createElement("p", {
    className: "vs-body-sm",
    style: {
      maxWidth: "var(--measure-prose)"
    }
  }, description) : null);
}
Object.assign(__ds_scope, { SectionHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHead.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Every status carries three cues: colour, glyph, and word — never colour alone. */
const vsStatusMap = {
  neutral: {
    fg: "var(--text-secondary)",
    bd: "var(--border-hairline)",
    bg: "var(--wash-neutral)",
    icon: "circle-dot"
  },
  private: {
    fg: "var(--text-private)",
    bd: "var(--border-private)",
    bg: "var(--wash-private)",
    icon: "lock"
  },
  verified: {
    fg: "var(--text-verified)",
    bd: "var(--border-verified)",
    bg: "var(--wash-verified)",
    icon: "check"
  },
  pending: {
    fg: "var(--text-pending)",
    bd: "var(--border-pending)",
    bg: "var(--wash-pending)",
    icon: "hourglass"
  },
  critical: {
    fg: "var(--text-critical)",
    bd: "var(--border-critical)",
    bg: "var(--wash-critical)",
    icon: "circle-alert"
  },
  terminal: {
    fg: "var(--text-muted)",
    bd: "var(--border-subtle)",
    bg: "transparent",
    icon: "ban"
  }
};

/** Live protocol status. `pulse` marks "waiting on an external dependency" (VRF, KMS, ACL) — never a rotating spinner. */
function StatusPill({
  children,
  tone = "neutral",
  icon,
  pulse = false,
  style,
  ...rest
}) {
  const t = vsStatusMap[tone] || vsStatusMap.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "status",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 24,
      padding: "0 9px 0 8px",
      borderRadius: "var(--r-pill)",
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      animation: pulse ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 12,
    strokeWidth: 1.9
  })), children);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
/** Underlined tab set for sibling views (current draw vs history, evidence vs summary). Keyboard: arrow keys move, Enter selects. */
function Tabs({
  items = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "flex",
      gap: 2,
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, items.map(it => {
    const active = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(it.id),
      style: {
        position: "relative",
        background: "none",
        border: 0,
        cursor: "pointer",
        padding: "0 12px",
        height: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "var(--type-body-sm)",
        fontWeight: active ? 600 : 400,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        transition: "color var(--dur-fast) var(--ease-standard)"
      }
    }, it.label, it.count != null ? /*#__PURE__*/React.createElement("span", {
      className: "vs-num",
      style: {
        font: "var(--type-micro)",
        color: "var(--text-faint)"
      }
    }, it.count) : null, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        borderRadius: "1px 1px 0 0",
        background: active ? "var(--periwinkle-500)" : "transparent",
        transformOrigin: "left",
        animation: active ? "vs-attest var(--dur-base) var(--ease-standard)" : undefined
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/core/Tooltip.jsx
try { (() => {
/** Accessible explanation for unfamiliar protocol terms. Opens on hover AND focus AND tap; never the only route to information. */
function Tooltip({
  children,
  content,
  side = "top",
  width = 232
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useMemo(() => "vs-tip-" + Math.random().toString(36).slice(2, 8), []);
  const pos = side === "bottom" ? {
    top: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)"
  } : {
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    tabIndex: 0,
    role: "button",
    "aria-describedby": open ? id : undefined,
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onClick: () => setOpen(v => !v),
    onKeyDown: e => {
      if (e.key === "Escape") setOpen(false);
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      cursor: "help",
      color: "inherit",
      borderRadius: "var(--r-xs)"
    }
  }, children || /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-question-mark",
    size: 13,
    label: "More information"
  })), open ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    id: id,
    style: {
      position: "absolute",
      ...pos,
      width,
      zIndex: "var(--z-overlay)",
      background: "var(--surface-overlay)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--r-md)",
      padding: "9px 11px",
      boxShadow: "var(--shadow-overlay)",
      font: "var(--type-body-sm)",
      lineHeight: 1.45,
      color: "var(--text-secondary)",
      textTransform: "none",
      letterSpacing: 0,
      animation: "vs-decrypt var(--dur-fast) var(--ease-entrance)"
    }
  }, content) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/feedback/RecoveryBanner.jsx
try { (() => {
const vsBannerTones = {
  info: {
    bg: "var(--wash-neutral)",
    bd: "var(--border-subtle)",
    fg: "var(--text-secondary)",
    icon: "info",
    accent: "var(--ink-500)"
  },
  pending: {
    bg: "var(--wash-pending)",
    bd: "var(--border-pending)",
    fg: "var(--text-pending)",
    icon: "hourglass",
    accent: "var(--amber-500)"
  },
  critical: {
    bg: "var(--wash-critical)",
    bd: "var(--border-critical)",
    fg: "var(--text-critical)",
    icon: "triangle-alert",
    accent: "var(--red-500)"
  },
  paused: {
    bg: "var(--wash-pending)",
    bd: "var(--border-pending)",
    fg: "var(--text-pending)",
    icon: "pause",
    accent: "var(--amber-500)"
  },
  network: {
    bg: "var(--wash-critical)",
    bd: "var(--border-critical)",
    fg: "var(--text-critical)",
    icon: "wifi-off",
    accent: "var(--red-500)"
  }
};

/**
 * Top-of-view banner for a condition the user can act on: wrong network, paused scope,
 * stale data, a retryable recovery call. Only rendered when there is an action or a
 * material safety statement — never as decoration.
 */
function RecoveryBanner({
  tone = "info",
  title,
  children,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  onDismiss,
  scope,
  style
}) {
  const t = vsBannerTones[tone] || vsBannerTones.info;
  return /*#__PURE__*/React.createElement("div", {
    role: tone === "critical" || tone === "network" ? "alert" : "status",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      padding: "14px 16px",
      borderRadius: "var(--r-md)",
      background: t.bg,
      border: `1px solid ${t.bd}`,
      animation: "vs-settle var(--dur-base) var(--ease-entrance)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      color: t.accent,
      flex: "none",
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16,
    strokeWidth: 1.8
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-title-3)",
      color: "var(--text-primary)"
    }
  }, title), scope ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: t.fg,
      border: `1px solid ${t.bd}`,
      borderRadius: "var(--r-xs)",
      padding: "1px 6px"
    }
  }, scope) : null), children ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)",
      margin: 0,
      maxWidth: "var(--measure-prose)"
    }
  }, children) : null, actionLabel || secondaryLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 4,
      flexWrap: "wrap"
    }
  }, actionLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: tone === "info" ? "secondary" : "primary",
    size: "sm",
    onClick: onAction
  }, actionLabel) : null, secondaryLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "ghost",
    size: "sm",
    onClick: onSecondary
  }, secondaryLabel) : null) : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    "aria-label": "Dismiss",
    style: {
      background: "none",
      border: 0,
      cursor: "pointer",
      color: "var(--text-muted)",
      padding: 4,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })) : null);
}
Object.assign(__ds_scope, { RecoveryBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/RecoveryBanner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StateBlock.jsx
try { (() => {
const vsStateKinds = {
  empty: {
    icon: "vault",
    tone: "var(--ink-500)"
  },
  waiting: {
    icon: "hourglass",
    tone: "var(--amber-500)"
  },
  loading: {
    icon: "scan-line",
    tone: "var(--periwinkle-500)"
  },
  unavailable: {
    icon: "cloud-off",
    tone: "var(--ink-500)"
  },
  offline: {
    icon: "wifi-off",
    tone: "var(--red-500)"
  },
  paused: {
    icon: "pause",
    tone: "var(--amber-500)"
  },
  terminal: {
    icon: "ban",
    tone: "var(--ink-500)"
  },
  failed: {
    icon: "circle-alert",
    tone: "var(--red-500)"
  }
};

/**
 * The empty / waiting / unavailable / terminal placeholder. Every instance states what
 * happened, whether funds are affected, and the one next action available.
 */
function StateBlock({
  kind = "empty",
  title,
  children,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  safety,
  meta,
  compact = false,
  style
}) {
  const k = vsStateKinds[kind] || vsStateKinds.empty;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 12,
      padding: compact ? "20px 18px" : "34px 24px",
      borderRadius: "var(--r-lg)",
      border: "1px dashed var(--border-subtle)",
      background: "var(--surface-base)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      placeItems: "center",
      width: 32,
      height: 32,
      borderRadius: "var(--r-sm)",
      background: "var(--wash-neutral)",
      color: k.tone,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      animation: kind === "waiting" || kind === "loading" ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: k.icon,
    size: 16,
    strokeWidth: 1.7
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "vs-title-3",
    style: {
      margin: 0
    }
  }, title), children ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)",
      margin: 0,
      maxWidth: "var(--measure-narrow)"
    }
  }, children) : null), kind === "loading" ? /*#__PURE__*/React.createElement(__ds_scope.ProgressTrack, {
    indeterminate: true,
    tone: "private",
    label: title,
    style: {
      maxWidth: 180
    }
  }) : null, safety ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-body-sm)",
      color: "var(--text-verified)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield-check",
    size: 13
  }), " ", safety) : null, actionLabel || secondaryLabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 2,
      flexWrap: "wrap"
    }
  }, actionLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "secondary",
    size: "sm",
    onClick: onAction
  }, actionLabel) : null, secondaryLabel ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "ghost",
    size: "sm",
    onClick: onSecondary
  }, secondaryLabel) : null) : null, meta ? /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)"
    }
  }, meta) : null);
}
Object.assign(__ds_scope, { StateBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StateBlock.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const vsToastTones = {
  neutral: {
    icon: "info",
    accent: "var(--ink-600)"
  },
  private: {
    icon: "lock",
    accent: "var(--periwinkle-500)"
  },
  verified: {
    icon: "circle-check",
    accent: "var(--teal-500)"
  },
  pending: {
    icon: "hourglass",
    accent: "var(--amber-500)"
  },
  critical: {
    icon: "circle-alert",
    accent: "var(--red-500)"
  }
};

/**
 * Transient confirmation. Carries protocol facts only — a transaction reference, a state
 * change, a failure reason. Never a plaintext amount, never a revealed value.
 */
function Toast({
  tone = "neutral",
  title,
  children,
  hash,
  onDismiss,
  style
}) {
  const t = vsToastTones[tone] || vsToastTones.neutral;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 11,
      width: "min(360px, calc(100vw - 32px))",
      padding: "13px 14px",
      borderRadius: "var(--r-md)",
      background: "var(--surface-overlay)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-overlay)",
      animation: "vs-settle var(--dur-base) var(--ease-entrance)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      color: t.accent,
      flex: "none",
      paddingTop: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 15,
    strokeWidth: 1.8
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-title-3)",
      color: "var(--text-primary)"
    }
  }, title), children ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)"
    }
  }, children) : null, hash ? /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)"
    }
  }, hash.slice(0, 14), "\u2026") : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    "aria-label": "Dismiss",
    style: {
      background: "none",
      border: 0,
      cursor: "pointer",
      color: "var(--text-muted)",
      padding: 2,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 13
  })) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/AmountField.jsx
try { (() => {
/**
 * Six-decimal cUSDT amount entry. Validates decimals locally before anything is encrypted,
 * and states plainly that the entered amount leaves the browser encrypted.
 */
function AmountField({
  value = "",
  onChange,
  label = "Amount",
  unit = "cUSDT",
  max,
  maxLabel = "Max",
  onMax,
  error,
  helper,
  disabled = false,
  autoFocus = false,
  id = "vs-amount",
  style
}) {
  const decimals = (value.split(".")[1] || "").length;
  const localError = error || (decimals > 6 ? "cUSDT supports six decimal places." : null);
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    className: "vs-label"
  }, label), max ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "lock",
    size: 11
  }), " Available ", max), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onMax,
    style: {
      background: "none",
      border: 0,
      padding: "2px 0",
      cursor: "pointer",
      color: "var(--text-private)",
      font: "inherit",
      letterSpacing: "inherit",
      textTransform: "inherit"
    }
  }, maxLabel)) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      height: 56,
      padding: "0 16px",
      borderRadius: "var(--r-md)",
      background: "var(--surface-inset)",
      border: `1px solid ${localError ? "var(--border-critical)" : focused ? "var(--periwinkle-500)" : "var(--border-subtle)"}`,
      transition: "border-color var(--dur-fast) var(--ease-standard)",
      opacity: disabled ? 0.55 : 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: id,
    inputMode: "decimal",
    autoComplete: "off",
    placeholder: "0.000000",
    value: value,
    disabled: disabled,
    autoFocus: autoFocus,
    "aria-invalid": localError ? true : undefined,
    "aria-describedby": localError ? id + "-err" : helper ? id + "-help" : undefined,
    onChange: e => onChange && onChange(e.target.value.replace(/[^0-9.]/g, "")),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    className: "vs-num",
    style: {
      flex: 1,
      minWidth: 0,
      background: "none",
      border: 0,
      outline: "none",
      font: "var(--type-num-2)",
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-primary)",
      letterSpacing: "var(--tr-tight)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      letterSpacing: "0.03em",
      flex: "none"
    }
  }, unit)), localError ? /*#__PURE__*/React.createElement("span", {
    id: id + "-err",
    role: "alert",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-body-sm)",
      color: "var(--text-critical)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert",
    size: 13
  }), " ", localError) : helper ? /*#__PURE__*/React.createElement("span", {
    id: id + "-help",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "lock",
    size: 13,
    style: {
      color: "var(--text-private)"
    }
  }), " ", helper) : null);
}
Object.assign(__ds_scope, { AmountField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/AmountField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/** Native select in system chrome — used for public filters (epoch range, evidence view), never for protocol parameters. */
function Select({
  value,
  onChange,
  options = [],
  label,
  id = "vs-select",
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    className: "vs-label"
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: id,
    value: value,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.value),
    style: {
      appearance: "none",
      width: "100%",
      height: 38,
      padding: "0 34px 0 12px",
      borderRadius: "var(--r-md)",
      background: "var(--surface-inset)",
      border: "1px solid var(--border-subtle)",
      color: "var(--text-primary)",
      font: "var(--type-body-sm)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      position: "absolute",
      right: 12,
      color: "var(--text-muted)",
      pointerEvents: "none"
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
/** Single-line text entry for public values only — addresses, epoch numbers, hashes. Never for amounts. */
function TextField({
  value = "",
  onChange,
  label,
  placeholder,
  mono = false,
  icon,
  error,
  helper,
  id = "vs-text",
  disabled = false,
  style
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    className: "vs-label"
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      height: 40,
      padding: "0 12px",
      borderRadius: "var(--r-md)",
      background: "var(--surface-inset)",
      border: `1px solid ${error ? "var(--border-critical)" : focused ? "var(--periwinkle-500)" : "var(--border-subtle)"}`,
      transition: "border-color var(--dur-fast) var(--ease-standard)",
      opacity: disabled ? 0.55 : 1
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    style: {
      color: "var(--text-faint)"
    }
  }) : null, /*#__PURE__*/React.createElement("input", {
    id: id,
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    className: mono ? "vs-mono" : undefined,
    style: {
      flex: 1,
      minWidth: 0,
      background: "none",
      border: 0,
      outline: "none",
      font: mono ? "var(--type-mono)" : "var(--type-body-sm)",
      color: "var(--text-primary)"
    }
  })), error ? /*#__PURE__*/React.createElement("span", {
    role: "alert",
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-critical)"
    }
  }, error) : helper ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, helper) : null);
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/protocol/ActivityItem.jsx
try { (() => {
const vsActivityKinds = {
  deposit: {
    icon: "arrow-down-to-line",
    tone: "var(--periwinkle-400)",
    label: "Deposit"
  },
  withdrawRequest: {
    icon: "arrow-up-from-line",
    tone: "var(--periwinkle-400)",
    label: "Withdrawal requested"
  },
  claim: {
    icon: "circle-check",
    tone: "var(--teal-400)",
    label: "Claim"
  },
  reveal: {
    icon: "key-round",
    tone: "var(--periwinkle-400)",
    label: "Local reveal"
  },
  draw: {
    icon: "dices",
    tone: "var(--text-secondary)",
    label: "Draw"
  },
  prize: {
    icon: "badge-check",
    tone: "var(--teal-400)",
    label: "Prize"
  },
  failed: {
    icon: "circle-alert",
    tone: "var(--red-400)",
    label: "Failed"
  }
};

/**
 * A privacy-safe activity row. Records what happened and when — never an amount.
 * Local-only actions (reveals) are marked as such and are never written to chain.
 */
function ActivityItem({
  kind = "deposit",
  title,
  epoch,
  time,
  hash,
  status,
  local = false,
  style
}) {
  const k = vsActivityKinds[kind] || vsActivityKinds.deposit;
  return /*#__PURE__*/React.createElement("li", {
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "12px 0",
      borderBottom: "1px solid var(--border-hairline)",
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: "var(--r-sm)",
      display: "grid",
      placeItems: "center",
      background: "var(--surface-inset)",
      color: k.tone,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: k.icon,
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, title || k.label, local ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      marginLeft: 8
    }
  }, "Local only") : null), /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, epoch ? `E${epoch} · ` : "", time, hash ? ` · ${hash.slice(0, 10)}…` : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flex: "none"
    }
  }, status ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, status) : null, hash ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "external-link",
    size: "sm",
    label: "Open transaction in block explorer"
  }) : null));
}
Object.assign(__ds_scope, { ActivityItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/ActivityItem.jsx", error: String((e && e.message) || e) }); }

// components/protocol/EpochTimeline.jsx
try { (() => {
/* One vocabulary for every lifecycle node, reused by EpochTimeline and StatusStepper. */
const VS_NODE = {
  done: {
    color: "var(--teal-500)",
    ring: "var(--border-verified)",
    icon: "check",
    label: "Complete"
  },
  active: {
    color: "var(--periwinkle-500)",
    ring: "var(--border-private)",
    icon: "circle-dot",
    label: "In progress"
  },
  waiting: {
    color: "var(--amber-500)",
    ring: "var(--border-pending)",
    icon: "hourglass",
    label: "Waiting on protocol"
  },
  future: {
    color: "var(--ink-400)",
    ring: "var(--border-hairline)",
    icon: "circle-dot",
    label: "Not started"
  },
  failed: {
    color: "var(--red-500)",
    ring: "var(--border-critical)",
    icon: "circle-alert",
    label: "Failed"
  },
  terminal: {
    color: "var(--ink-500)",
    ring: "var(--border-subtle)",
    icon: "ban",
    label: "Terminal"
  }
};
function Node({
  state,
  size = 10
}) {
  const n = VS_NODE[state] || VS_NODE.future;
  const solid = state === "done" || state === "active" || state === "waiting" || state === "failed";
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: size,
      height: size,
      borderRadius: "var(--r-xs)",
      flex: "none",
      background: solid ? n.color : "transparent",
      border: solid ? "none" : `1px solid ${n.color}`,
      boxShadow: state === "active" ? "0 0 0 4px var(--wash-private)" : state === "waiting" ? "0 0 0 4px var(--wash-pending)" : undefined,
      animation: state === "active" ? "vs-tick var(--dur-base) var(--ease-mechanical)" : undefined
    }
  });
}

/**
 * The public epoch lifecycle, in protocol order. Horizontal on desktop, vertical below
 * the medium breakpoint. The active node is the only one that carries prose.
 */
function EpochTimeline({
  steps = [],
  orientation = "horizontal",
  style
}) {
  const vertical = orientation === "vertical";
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      display: vertical ? "flex" : "grid",
      flexDirection: vertical ? "column" : undefined,
      gridTemplateColumns: vertical ? undefined : `repeat(${steps.length}, minmax(0, 1fr))`,
      gap: vertical ? 0 : 0,
      listStyle: "none",
      margin: 0,
      padding: 0,
      ...style
    }
  }, steps.map((s, i) => {
    const n = VS_NODE[s.state] || VS_NODE.future;
    const last = i === steps.length - 1;
    const railColor = s.state === "done" ? "var(--teal-600)" : s.state === "active" ? "var(--periwinkle-600)" : "var(--border-subtle)";
    return /*#__PURE__*/React.createElement("li", {
      key: s.id || i,
      style: {
        display: "flex",
        flexDirection: vertical ? "row" : "column",
        gap: vertical ? 12 : 10,
        minWidth: 0,
        position: "relative",
        paddingBottom: vertical && !last ? 18 : 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: 0,
        flex: "none",
        paddingTop: vertical ? 3 : 0
      }
    }, /*#__PURE__*/React.createElement(Node, {
      state: s.state
    }), !last ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        background: railColor,
        ...(vertical ? {
          width: 1,
          flex: 1,
          minHeight: 20,
          marginTop: 4
        } : {
          height: 1,
          flex: 1,
          marginLeft: 6
        })
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
        paddingRight: vertical ? 0 : 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-micro)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: s.state === "future" ? "var(--text-faint)" : s.state === "active" ? "var(--text-private)" : "var(--text-secondary)"
      }
    }, s.label), s.meta ? /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, s.meta) : null, s.detail && (s.state === "active" || s.state === "waiting" || s.state === "failed") ? /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)",
        maxWidth: 260,
        textTransform: "none",
        letterSpacing: 0
      }
    }, s.detail) : null), !vertical && (s.state === "active" || s.state === "waiting") ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        top: 4,
        left: 0,
        width: 3,
        height: 3,
        borderRadius: 2,
        background: n.color,
        animation: "vs-breathe 1.8s var(--ease-standard) infinite",
        opacity: 0
      }
    }) : null);
  }));
}

/** Legend for the node vocabulary — used in guidelines and the verification surface. */
function EpochNodeLegend({
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      ...style
    }
  }, Object.keys(VS_NODE).map(k => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Node, {
    state: k,
    size: 8
  }), " ", VS_NODE[k].label, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: VS_NODE[k].icon,
    size: 11,
    style: {
      color: VS_NODE[k].color
    }
  }))));
}
Object.assign(__ds_scope, { VS_NODE, EpochTimeline, EpochNodeLegend });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/EpochTimeline.jsx", error: String((e && e.message) || e) }); }

// components/protocol/EvidenceRow.jsx
try { (() => {
function middleTruncate(v, head = 10, tail = 8) {
  if (!v || v.length <= head + tail + 1) return v;
  return v.slice(0, head) + "…" + v.slice(-tail);
}

/**
 * One piece of public evidence: what it is, its machine value, and how to check it.
 * Ciphertext handles are public metadata — labelled as references, never as amounts.
 */
function EvidenceRow({
  label,
  value,
  kind = "hash",
  href,
  verified = false,
  note,
  truncate = true,
  onCopy,
  style
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator.clipboard && value) navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
    if (onCopy) onCopy(value);
  };
  const display = truncate && kind !== "plain" ? middleTruncate(String(value ?? "")) : value;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(120px, 200px) 1fr auto",
      alignItems: "center",
      gap: 14,
      padding: "11px 0",
      borderBottom: "1px solid var(--border-hairline)",
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      minWidth: 0
    }
  }, verified ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    strokeWidth: 2.2,
    style: {
      color: "var(--teal-500)"
    },
    label: "Verified"
  }) : /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 12
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: kind === "plain" ? "vs-body-sm" : "vs-mono",
    title: kind === "plain" ? undefined : String(value ?? ""),
    style: {
      color: kind === "plain" ? "var(--text-primary)" : "var(--text-secondary)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, display, kind !== "plain" ? /*#__PURE__*/React.createElement("span", {
    className: "vs-sr"
  }, value) : null), note ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      color: "var(--text-faint)",
      letterSpacing: 0,
      textTransform: "none"
    }
  }, note) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      flex: "none"
    }
  }, kind !== "plain" && value ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: copied ? "check" : "copy",
    size: "sm",
    label: copied ? "Copied" : `Copy ${label}`,
    onClick: copy
  }) : null, href ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    name: "external-link",
    size: "sm",
    label: `Open ${label} in block explorer`,
    onClick: () => window.open(href, "_blank", "noopener")
  }) : null));
}
Object.assign(__ds_scope, { EvidenceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/EvidenceRow.jsx", error: String((e && e.message) || e) }); }

// components/protocol/ProofBlock.jsx
try { (() => {
/**
 * A framed group of evidence with a verification verdict. Ordinary users read the verdict;
 * technical users expand the trail. Collapsed by default on mobile.
 */
function ProofBlock({
  title,
  verdict = "verified",
  verdictLabel,
  summary,
  children,
  collapsible = true,
  defaultOpen = true,
  footnote,
  style
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const tone = verdict === "verified" ? "verified" : verdict === "pending" ? "pending" : verdict === "failed" ? "critical" : "neutral";
  const label = verdictLabel || (verdict === "verified" ? "Authenticated" : verdict === "pending" ? "Awaiting proof" : verdict === "failed" ? "Unverified" : "No evidence yet");
  return /*#__PURE__*/React.createElement("section", {
    style: {
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--r-lg)",
      background: "var(--surface-raised)",
      boxShadow: "var(--sheen-top)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "14px 18px",
      borderBottom: open ? "1px solid var(--border-hairline)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "vs-title-3",
    style: {
      margin: 0
    }
  }, title), summary ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, summary) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    tone: tone,
    pulse: verdict === "pending"
  }, label), collapsible ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(v => !v),
    "aria-expanded": open,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: "none",
      border: 0,
      cursor: "pointer",
      color: "var(--text-muted)",
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      padding: "6px 2px"
    }
  }, open ? "Hide" : "Evidence", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? "chevron-down" : "chevron-right",
    size: 13
  })) : null)), open ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 18px 4px",
      animation: "vs-settle var(--dur-base) var(--ease-entrance)"
    }
  }, children, footnote ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)",
      padding: "14px 0 12px",
      margin: 0,
      maxWidth: "var(--measure-prose)"
    }
  }, footnote) : null) : null);
}
Object.assign(__ds_scope, { ProofBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/ProofBlock.jsx", error: String((e && e.message) || e) }); }

// components/protocol/QueueItem.jsx
try { (() => {
const vsQueueStates = {
  queued: {
    tone: "var(--periwinkle-500)",
    icon: "layers",
    label: "In queue"
  },
  settling: {
    tone: "var(--amber-500)",
    icon: "hourglass",
    label: "Settling"
  },
  partial: {
    tone: "var(--amber-500)",
    icon: "minus",
    label: "Partly funded"
  },
  claimable: {
    tone: "var(--teal-500)",
    icon: "circle-check",
    label: "Ready to claim"
  },
  claimed: {
    tone: "var(--ink-500)",
    icon: "check",
    label: "Claimed"
  },
  retryable: {
    tone: "var(--amber-500)",
    icon: "refresh-cw",
    label: "Retry available"
  }
};

/**
 * One row of the FIFO withdrawal queue. Position is fixed at request time and is public;
 * the amount is not. A queue position is a normal protocol state, not a failure.
 */
function QueueItem({
  position,
  total = 16,
  state = "queued",
  slot,
  requested,
  mine = false,
  trailing,
  style
}) {
  const s = vsQueueStates[state] || vsQueueStates.queued;
  return /*#__PURE__*/React.createElement("li", {
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      gap: 14,
      padding: "12px 14px",
      borderRadius: "var(--r-md)",
      minWidth: 0,
      background: mine ? "var(--wash-private)" : "transparent",
      border: `1px solid ${mine ? "var(--border-private)" : "var(--border-hairline)"}`,
      animation: "vs-settle var(--dur-base) var(--ease-entrance)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vs-num",
    style: {
      width: 30,
      height: 30,
      display: "grid",
      placeItems: "center",
      borderRadius: "var(--r-sm)",
      background: "var(--surface-inset)",
      font: "var(--type-body-sm)",
      color: mine ? "var(--text-private)" : "var(--text-secondary)",
      flex: "none"
    }
  }, position), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      font: "var(--type-body-sm)",
      color: "var(--text-primary)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 13,
    style: {
      color: s.tone
    }
  }), s.label, mine ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-private)"
    }
  }, "\xB7 Yours") : null), /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)"
    }
  }, slot != null ? `SLOT ${String(slot).padStart(2, "0")}` : null, slot != null && requested ? " · " : null, requested)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flex: "none"
    }
  }, trailing || /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, "of ", total)));
}
Object.assign(__ds_scope, { QueueItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/QueueItem.jsx", error: String((e && e.message) || e) }); }

// components/protocol/ResultState.jsx
try { (() => {
const vsResult = {
  winner: {
    icon: "badge-check",
    tone: "verified",
    pill: "Winner finalized",
    title: "This slot won the epoch",
    copy: "The winner address is public after finalization. The prize amount stays encrypted until you reveal it locally."
  },
  nonWinner: {
    icon: "circle-check",
    tone: "neutral",
    pill: "Not this epoch",
    title: "Your principal is untouched",
    copy: "You were eligible and remain eligible for the next epoch. No amount was moved."
  },
  zeroWinner: {
    icon: "ban",
    tone: "terminal",
    pill: "No winner",
    title: "No eligible weight in this epoch",
    copy: "Total eligible weight was zero, so the epoch closed without a winner. This is a valid terminal result."
  },
  pending: {
    icon: "hourglass",
    tone: "pending",
    pill: "Awaiting finalization",
    title: "The result is not final yet",
    copy: "The draw executed. The winner address becomes public after the proof is authenticated and the finality delay passes."
  },
  unavailable: {
    icon: "cloud-off",
    tone: "neutral",
    pill: "Result unavailable",
    title: "The result could not be read",
    copy: "Chain data for this epoch could not be loaded. Nothing about your position has changed."
  }
};

/**
 * The epoch outcome for the connected wallet. Winner state is the only place teal appears
 * at display scale; the win is signalled by weight and stillness, not celebration.
 */
function ResultState({
  variant = "nonWinner",
  epoch,
  address,
  children,
  style
}) {
  const r = vsResult[variant] || vsResult.nonWinner;
  const isWinner = variant === "winner";
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      padding: isWinner ? 24 : 20,
      borderRadius: "var(--r-lg)",
      position: "relative",
      overflow: "hidden",
      background: isWinner ? "var(--wash-verified)" : "var(--surface-raised)",
      border: `1px solid ${isWinner ? "var(--border-verified)" : "var(--border-hairline)"}`,
      boxShadow: "var(--sheen-top)",
      ...style
    }
  }, isWinner ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(120% 80% at 6% 0%, rgba(47,191,160,0.13), transparent 62%)",
      pointerEvents: "none"
    }
  }) : null, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      display: "grid",
      placeItems: "center",
      borderRadius: "var(--r-sm)",
      flex: "none",
      background: isWinner ? "var(--teal-500)" : "var(--wash-neutral)",
      color: isWinner ? "var(--ink-050)" : "var(--text-muted)",
      animation: isWinner ? "vs-halo var(--dur-epoch) var(--ease-standard) 2" : undefined
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: r.icon,
    size: 16,
    strokeWidth: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "vs-title-2",
    style: {
      margin: 0
    }
  }, r.title), epoch ? /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)"
    }
  }, "EPOCH ", epoch) : null)), /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    tone: r.tone,
    pulse: variant === "pending"
  }, r.pill)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)",
      margin: 0,
      maxWidth: "var(--measure-prose)",
      position: "relative"
    }
  }, r.copy), address ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vs-label"
  }, "Winner"), /*#__PURE__*/React.createElement("span", {
    className: "vs-mono",
    style: {
      color: "var(--text-primary)"
    }
  }, address)) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, children) : null);
}
Object.assign(__ds_scope, { ResultState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/ResultState.jsx", error: String((e && e.message) || e) }); }

// components/protocol/SlotGrid.jsx
try { (() => {
const vsSlotFill = {
  empty: {
    background: "transparent",
    border: "1px solid var(--slot-empty)"
  },
  filled: {
    background: "transparent",
    border: "1px solid var(--slot-filled)"
  },
  mine: {
    background: "var(--wash-private)",
    border: "1px solid var(--slot-mine)"
  },
  drawn: {
    background: "var(--slot-drawn)",
    border: "1px solid var(--slot-drawn)"
  }
};

/**
 * The 16 public slots, laid out 4×4 — the fixed capacity of the pool, and the brand's
 * SLOTS mark used as live product data. Occupancy is public; the amount in a slot is not.
 */
function SlotGrid({
  slots = [],
  size = "md",
  caption,
  legend = false,
  style
}) {
  const cell = size === "sm" ? 9 : size === "lg" ? 26 : 16;
  const gap = size === "sm" ? 3 : size === "lg" ? 7 : 5;
  const filled = slots.filter(s => s !== "empty").length;
  const cells = Array.from({
    length: 16
  }, (_, i) => slots[i] || "empty");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": `${filled} of 16 slots occupied`,
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(4, ${cell}px)`,
      gap,
      width: "max-content"
    }
  }, cells.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: cell,
      height: cell,
      borderRadius: size === "sm" ? 1 : "var(--r-xs)",
      transition: "background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
      animation: s === "drawn" ? "vs-halo var(--dur-epoch) var(--ease-standard)" : undefined,
      ...(vsSlotFill[s] || vsSlotFill.empty)
    }
  }))), caption !== null ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, caption || /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "vs-num",
    style: {
      color: "var(--text-primary)"
    }
  }, filled), " / 16 slots occupied")) : null, legend ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      flexWrap: "wrap"
    }
  }, [["mine", "Your slot"], ["filled", "Occupied"], ["empty", "Open"], ["drawn", "Drawn"]].map(([k, l]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 1,
      ...vsSlotFill[k]
    }
  }), " ", l))) : null);
}
Object.assign(__ds_scope, { SlotGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/SlotGrid.jsx", error: String((e && e.message) || e) }); }

// components/protocol/StatusStepper.jsx
try { (() => {
const vsOpStates = {
  draft: {
    tone: "var(--ink-400)",
    icon: "circle-dot"
  },
  encrypting: {
    tone: "var(--periwinkle-500)",
    icon: "lock"
  },
  wallet: {
    tone: "var(--periwinkle-500)",
    icon: "wallet"
  },
  submitted: {
    tone: "var(--periwinkle-500)",
    icon: "arrow-up-right"
  },
  confirming: {
    tone: "var(--periwinkle-500)",
    icon: "scan-line"
  },
  dependency: {
    tone: "var(--amber-500)",
    icon: "hourglass"
  },
  fulfilled: {
    tone: "var(--teal-500)",
    icon: "check"
  },
  retryable: {
    tone: "var(--amber-500)",
    icon: "refresh-cw"
  },
  terminal: {
    tone: "var(--red-500)",
    icon: "circle-alert"
  }
};

/**
 * One operation's async progress: local encryption → wallet → chain → external
 * dependency → fulfilment. Steps ahead of the current one stay quiet; the current step
 * is the only one that explains itself.
 */
function StatusStepper({
  steps = [],
  style
}) {
  const activeIndex = steps.findIndex(s => s.status === "active");
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      display: "flex",
      flexDirection: "column",
      listStyle: "none",
      margin: 0,
      padding: 0,
      ...style
    }
  }, steps.map((s, i) => {
    const kind = vsOpStates[s.kind] || vsOpStates.draft;
    const done = s.status === "done";
    const active = s.status === "active";
    const failed = s.status === "failed";
    const last = i === steps.length - 1;
    const color = failed ? "var(--red-500)" : done ? "var(--teal-500)" : active ? kind.tone : "var(--ink-400)";
    return /*#__PURE__*/React.createElement("li", {
      key: s.id || i,
      style: {
        display: "flex",
        gap: 12,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "none",
        width: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 18,
        height: 18,
        borderRadius: "var(--r-sm)",
        display: "grid",
        placeItems: "center",
        flex: "none",
        background: done ? "var(--wash-verified)" : active ? s.kind === "dependency" ? "var(--wash-pending)" : "var(--wash-private)" : failed ? "var(--wash-critical)" : "transparent",
        border: `1px solid ${done || active || failed ? color : "var(--border-hairline)"}`,
        color
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        animation: active ? "vs-breathe 1.8s var(--ease-standard) infinite" : undefined
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: done ? "check" : failed ? "circle-alert" : kind.icon,
      size: 11,
      strokeWidth: 2
    }))), !last ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 1,
        flex: 1,
        minHeight: 14,
        background: done ? "var(--teal-600)" : "var(--border-subtle)"
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        paddingBottom: last ? 0 : 16,
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        fontWeight: active ? 600 : 400,
        color: done || active || failed ? "var(--text-primary)" : "var(--text-faint)"
      }
    }, s.label), s.meta ? /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)",
        whiteSpace: "nowrap"
      }
    }, s.meta) : null), active && s.detail ? /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)"
      }
    }, s.detail) : null, active && s.kind !== "draft" ? /*#__PURE__*/React.createElement(__ds_scope.ProgressTrack, {
      indeterminate: true,
      tone: s.kind === "dependency" ? "pending" : "private",
      label: s.label,
      style: {
        maxWidth: 160,
        marginTop: 2
      }
    }) : null, failed && s.detail ? /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-critical)"
      }
    }, s.detail) : null, i === activeIndex && s.action ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, s.action) : null));
  }));
}
Object.assign(__ds_scope, { StatusStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/StatusStepper.jsx", error: String((e && e.message) || e) }); }

// components/protocol/TicketPanel.jsx
try { (() => {
const vsTicketState = {
  queued: {
    tone: "private",
    label: "In queue",
    copy: "Your withdrawal is queued in request order. Principal stays yours while it waits."
  },
  settlementRequested: {
    tone: "pending",
    label: "Settlement requested",
    copy: "The controller is redeeming from the strategy and rewrapping to confidential balance."
  },
  ready: {
    tone: "pending",
    label: "Funding allocated",
    copy: "Liquidity has been allocated to earlier tickets. Yours is next in line."
  },
  partial: {
    tone: "pending",
    label: "Partly funded",
    copy: "Part of your request was funded. The unpaid encrypted remainder keeps its original queue position."
  },
  claimable: {
    tone: "verified",
    label: "Ready to claim",
    copy: "Funding is available. Claim moves it to your wallet as a confidential transfer."
  },
  claimed: {
    tone: "neutral",
    label: "Claimed",
    copy: "This ticket is settled. The amount stayed encrypted throughout."
  },
  retryable: {
    tone: "pending",
    label: "Retry available",
    copy: "Strategy redemption did not complete. The ticket is unchanged and the call can be retried by anyone."
  }
};

/**
 * The FIFO withdrawal ticket: one active ticket per slot, position fixed at request time.
 * Queue states read as progress, never as errors.
 */
function TicketPanel({
  state = "queued",
  position,
  total,
  requestedAt,
  steps,
  onClaim,
  onRetry,
  children,
  style
}) {
  const s = vsTicketState[state] || vsTicketState.queued;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--r-lg)",
      background: "var(--surface-raised)",
      padding: 20,
      boxShadow: "var(--sheen-top)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vs-label",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "ticket",
    size: 12
  }), " Withdrawal ticket"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, position != null ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "vs-num-2"
  }, position), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-muted)"
    }
  }, "of ", total, " in queue")) : /*#__PURE__*/React.createElement("span", {
    className: "vs-title-2"
  }, s.label))), /*#__PURE__*/React.createElement(__ds_scope.StatusPill, {
    tone: s.tone,
    pulse: state === "settlementRequested"
  }, s.label)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "var(--type-body-sm)",
      color: "var(--text-secondary)",
      margin: 0,
      maxWidth: "var(--measure-prose)"
    }
  }, s.copy), steps && steps.length ? /*#__PURE__*/React.createElement(__ds_scope.StatusStepper, {
    steps: steps
  }) : null, children, /*#__PURE__*/React.createElement("footer", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, state === "claimable" ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "primary",
    size: "md",
    icon: "arrow-down-to-line",
    onClick: onClaim
  }, "Claim withdrawal") : null, state === "retryable" ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    tone: "secondary",
    size: "md",
    icon: "refresh-cw",
    onClick: onRetry
  }, "Retry settlement") : null, requestedAt ? /*#__PURE__*/React.createElement("span", {
    className: "vs-mono-sm",
    style: {
      color: "var(--text-faint)"
    }
  }, "REQUESTED ", requestedAt) : null));
}
Object.assign(__ds_scope, { TicketPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/protocol/TicketPanel.jsx", error: String((e && e.message) || e) }); }

// components/shell/Sheet.jsx
try { (() => {
function useIsNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}

/**
 * The one overlay in the system: a centred dialog on desktop, a bottom sheet below 768px.
 * Deposit and withdrawal flows live here. Escape closes, focus is trapped at the edges,
 * and the scrim never hides the value the user is acting on.
 */
function Sheet({
  open,
  title,
  eyebrow,
  onClose,
  children,
  footer,
  width = 460,
  fullHeight = false
}) {
  const narrow = useIsNarrow();
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: "var(--z-overlay)",
      display: "flex",
      alignItems: narrow ? "flex-end" : "center",
      justifyContent: "center",
      padding: narrow ? 0 : 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--surface-scrim)",
      backdropFilter: "blur(3px)",
      animation: "vs-decrypt var(--dur-base) var(--ease-standard)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: ref,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    style: {
      position: "relative",
      width: narrow ? "100%" : width,
      maxWidth: "100%",
      maxHeight: narrow ? fullHeight ? "100dvh" : "92dvh" : "88vh",
      height: narrow && fullHeight ? "100dvh" : undefined,
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-overlay)",
      border: "1px solid var(--border-subtle)",
      borderRadius: narrow ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
      boxShadow: narrow ? "var(--shadow-sheet)" : "var(--shadow-overlay)",
      animation: `${narrow ? "vs-settle" : "vs-decrypt"} var(--dur-slow) var(--ease-entrance)`
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      padding: "18px 20px 14px",
      borderBottom: "1px solid var(--border-hairline)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      minWidth: 0
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "vs-label"
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h2", {
    className: "vs-title-2",
    style: {
      margin: 0
    }
  }, title)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Close",
    style: {
      width: 32,
      height: 32,
      display: "grid",
      placeItems: "center",
      background: "none",
      border: 0,
      borderRadius: "var(--r-sm)",
      cursor: "pointer",
      color: "var(--text-muted)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 15
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      flex: 1
    }
  }, children), footer ? /*#__PURE__*/React.createElement("footer", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: "14px 20px calc(16px + env(safe-area-inset-bottom))",
      borderTop: "1px solid var(--border-hairline)",
      background: "var(--surface-base)",
      flex: "none"
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { useIsNarrow, Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/shell/StrategyBadge.jsx
try { (() => {
/**
 * Strategy identity. TEST YIELD is the default and must never sit next to an APY or any
 * implied return. LIVE STRATEGY YIELD appears only after a validated adapter replacement.
 */
function StrategyBadge({
  mode = "test",
  size = "md",
  withHint = true,
  style
}) {
  const test = mode === "test";
  const label = test ? "TEST YIELD" : "LIVE STRATEGY YIELD";
  const hint = test ? "Prizes in this release are funded by donations into a deterministic test vault. No organic strategy return, no APY." : "A replacement strategy adapter has been deployed and validated through the frozen governance process.";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: size === "sm" ? 21 : 24,
      padding: "0 8px",
      borderRadius: "var(--r-xs)",
      border: `1px solid ${test ? "var(--border-pending)" : "var(--border-verified)"}`,
      background: test ? "var(--wash-pending)" : "var(--wash-verified)",
      color: test ? "var(--text-pending)" : "var(--text-verified)",
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: test ? "circle-dot" : "shield-check",
    size: 11,
    strokeWidth: 1.9
  }), label), withHint ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tooltip, {
    content: hint
  })) : null);
}
Object.assign(__ds_scope, { StrategyBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/StrategyBadge.jsx", error: String((e && e.message) || e) }); }

// components/shell/WalletControl.jsx
try { (() => {
/**
 * Wallet and network control. Network identity is always visible; a wrong chain blocks
 * writes and says so in place rather than failing at signature time.
 */
function WalletControl({
  state = "disconnected",
  address,
  network = "Sepolia",
  onConnect,
  onSwitch,
  onDisconnect,
  compact = false,
  style
}) {
  if (state === "disconnected") {
    return /*#__PURE__*/React.createElement(__ds_scope.Button, {
      tone: "primary",
      size: compact ? "sm" : "md",
      icon: "wallet",
      onClick: onConnect,
      style: style
    }, "Connect wallet");
  }
  if (state === "connecting") {
    return /*#__PURE__*/React.createElement(__ds_scope.Button, {
      tone: "secondary",
      size: compact ? "sm" : "md",
      busy: true,
      disabled: true,
      style: style
    }, "Requesting access\u2026");
  }
  if (state === "wrongNetwork") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 34,
        padding: "0 10px",
        borderRadius: "var(--r-md)",
        background: "var(--wash-critical)",
        border: "1px solid var(--border-critical)",
        color: "var(--text-critical)",
        font: "var(--type-micro)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "triangle-alert",
      size: 12
    }), " Wrong network"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      tone: "secondary",
      size: "sm",
      onClick: onSwitch
    }, "Switch to ", network));
  }
  const short = address ? address.slice(0, 6) + "…" + address.slice(-4) : "";
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDisconnect,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      height: compact ? 32 : 36,
      padding: "0 10px",
      borderRadius: "var(--r-md)",
      background: "var(--surface-inset)",
      border: "1px solid var(--border-hairline)",
      cursor: "pointer",
      color: "var(--text-primary)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 6,
      height: 6,
      borderRadius: 1,
      background: "var(--teal-500)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "vs-mono",
    style: {
      color: "var(--text-primary)"
    }
  }, short), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--type-micro)",
      letterSpacing: "var(--tr-label)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      paddingLeft: 2,
      borderLeft: "1px solid var(--border-hairline)",
      marginLeft: 2,
      paddingInlineStart: 8
    }
  }, network));
}
Object.assign(__ds_scope, { WalletControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/WalletControl.jsx", error: String((e && e.message) || e) }); }

// components/shell/Wordmark.jsx
try { (() => {
/**
 * The VeilSave lockup. No vector mark was supplied with the brand material, so the
 * wordmark is type-set: Instrument Sans, 600, tightened, with `veil` at reduced emphasis
 * so the eye lands on `Save`. The optional epoch glyph is the supplied EPOCH mark.
 */
function Wordmark({
  size = 17,
  mark = false,
  tone = "primary",
  style
}) {
  const color = tone === "muted" ? "var(--text-secondary)" : "var(--text-primary)";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      ...style
    }
  }, mark ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: size + 5,
      height: size + 5,
      borderRadius: "var(--r-xs)",
      flex: "none",
      display: "grid",
      placeItems: "center",
      border: "1px solid var(--border-private)",
      background: "var(--wash-private)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: 1,
      background: "var(--teal-500)",
      boxShadow: "0 0 0 3px var(--wash-verified)"
    }
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: `600 ${size}px/1 var(--font-sans)`,
      letterSpacing: "var(--tr-wordmark)",
      color,
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontWeight: 500
    }
  }, "veil"), "Save"));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/shell/ConsoleNav.jsx
try { (() => {
/**
 * Console navigation. A 232px rail on desktop; a three-destination bottom bar at 44px+
 * targets on mobile, matching the frozen route set (Pool, Dashboard, Draws).
 * Deposit and Withdraw are commands inside the dashboard, never navigation.
 */
function ConsoleNav({
  items = [],
  active,
  onNavigate,
  variant = "rail",
  footer,
  secondary = [],
  style
}) {
  if (variant === "bottom") {
    return /*#__PURE__*/React.createElement("nav", {
      "aria-label": "Primary",
      style: {
        position: "sticky",
        bottom: 0,
        zIndex: "var(--z-nav)",
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        height: "var(--shell-bottom-nav)",
        background: "var(--surface-base)",
        borderTop: "1px solid var(--border-subtle)",
        ...style
      }
    }, items.map(it => {
      const on = it.id === active;
      return /*#__PURE__*/React.createElement("button", {
        key: it.id,
        type: "button",
        "aria-current": on ? "page" : undefined,
        onClick: () => onNavigate && onNavigate(it.id),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          minHeight: 44,
          background: "none",
          border: 0,
          cursor: "pointer",
          color: on ? "var(--text-primary)" : "var(--text-muted)",
          position: "relative"
        }
      }, on ? /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true",
        style: {
          position: "absolute",
          top: 0,
          left: "28%",
          right: "28%",
          height: 2,
          background: "var(--periwinkle-500)",
          borderRadius: "0 0 1px 1px"
        }
      }) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
        name: it.icon,
        size: 17,
        strokeWidth: on ? 2 : 1.5
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          font: "var(--type-micro)",
          letterSpacing: "var(--tr-label)",
          textTransform: "uppercase"
        }
      }, it.label));
    }));
  }
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Primary",
    style: {
      width: "var(--shell-nav)",
      flex: "none",
      display: "flex",
      flexDirection: "column",
      gap: 26,
      padding: "22px 16px",
      borderRight: "1px solid var(--border-hairline)",
      background: "var(--surface-base)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 6px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    mark: true,
    size: 16
  })), /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, items.map(it => {
    const on = it.id === active;
    return /*#__PURE__*/React.createElement("li", {
      key: it.id
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-current": on ? "page" : undefined,
      onClick: () => onNavigate && onNavigate(it.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: 34,
        padding: "0 8px",
        borderRadius: "var(--r-sm)",
        border: 0,
        cursor: "pointer",
        textAlign: "left",
        background: on ? "var(--wash-private)" : "transparent",
        color: on ? "var(--text-primary)" : "var(--text-muted)",
        font: "var(--type-body-sm)",
        fontWeight: on ? 600 : 400,
        transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)",
        position: "relative"
      }
    }, on ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        left: -16,
        top: 8,
        bottom: 8,
        width: 2,
        background: "var(--periwinkle-500)",
        borderRadius: "0 1px 1px 0"
      }
    }) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 15
    }), it.label, it.badge ? /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        font: "var(--type-micro)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: "var(--text-verified)"
      }
    }, it.badge) : null));
  })), secondary.length ? /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      marginTop: -12
    }
  }, secondary.map(it => /*#__PURE__*/React.createElement("li", {
    key: it.id
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onNavigate && onNavigate(it.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      height: 30,
      padding: "0 8px",
      borderRadius: "var(--r-sm)",
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-faint)",
      font: "var(--type-body-sm)",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 14
  }), it.label)))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, footer));
}
Object.assign(__ds_scope, { ConsoleNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/ConsoleNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/ConsoleShell.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;
  const vsNarrowC = q => {
    const [n, setN] = React.useState(() => window.matchMedia(q).matches);
    React.useEffect(() => {
      const m = window.matchMedia(q),
        on = () => setN(m.matches);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    }, [q]);
    return n;
  };

  /* Console shell. A 236px rail above 900px, a three-destination bottom bar below it. The
     header always carries network and strategy identity, because both change what a write
     means. The field sits behind the top of the view only — enough to give the position
     band an environment, never enough to compete with a value. */
  function ConsoleShell({
    view,
    onNavigate,
    banner,
    actions,
    title,
    eyebrow,
    children
  }) {
    const {
      ConsoleNav,
      WalletControl,
      StrategyBadge,
      Wordmark,
      ProgressTrack
    } = V();
    const narrow = vsNarrowC("(max-width: 900px)");
    const nav = [{
      id: "pool",
      label: "Pool",
      icon: "grid-2x2"
    }, {
      id: "dashboard",
      label: "Dashboard",
      icon: "vault"
    }, {
      id: "draws",
      label: "Draws",
      icon: "dices"
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        minHeight: "100vh",
        background: "var(--surface-page)"
      }
    }, !narrow ? /*#__PURE__*/React.createElement(ConsoleNav, {
      items: nav,
      active: view,
      onNavigate: onNavigate,
      secondary: [{
        id: "privacy",
        label: "Privacy",
        icon: "lock"
      }],
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 9,
          padding: "14px 8px",
          borderTop: "1px solid var(--border-hairline)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "vs-micro"
      }, "Epoch 42"), /*#__PURE__*/React.createElement("span", {
        className: "vs-mono-sm",
        style: {
          color: "var(--text-faint)"
        }
      }, "6D LEFT")), /*#__PURE__*/React.createElement(ProgressTrack, {
        value: 68,
        tone: "private",
        label: "Epoch elapsed",
        height: 2
      }), /*#__PURE__*/React.createElement("span", {
        className: "vs-mono-sm",
        style: {
          color: "var(--text-faint)"
        }
      }, "FREEZES MAR 10 \xB7 09:00")), /*#__PURE__*/React.createElement(StrategyBadge, {
        mode: "test",
        size: "sm"
      }), /*#__PURE__*/React.createElement(WalletControl, {
        state: "connected",
        address: window.VS_MOCK.wallet.address,
        network: "Sepolia",
        compact: true
      })),
      style: {
        position: "sticky",
        top: 0,
        height: "100vh"
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "vs-field vs-field-flat",
      "aria-hidden": "true",
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 420,
        pointerEvents: "none",
        opacity: 0.9
      }
    }), /*#__PURE__*/React.createElement("header", {
      style: {
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: narrow ? "12px 20px" : "16px 40px",
        borderBottom: "1px solid var(--border-hairline)",
        background: "color-mix(in oklab, var(--surface-page) 82%, transparent)",
        backdropFilter: "blur(10px)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        minWidth: 0
      }
    }, narrow ? /*#__PURE__*/React.createElement(Wordmark, {
      size: 15
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 15,
      tone: "muted"
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 1,
        height: 18,
        background: "var(--border-hairline)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("h1", {
      className: "vs-title-2",
      style: {
        margin: 0
      }
    }, title), eyebrow ? /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, eyebrow) : null))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, narrow ? /*#__PURE__*/React.createElement(StrategyBadge, {
      mode: "test",
      size: "sm",
      withHint: false
    }) : null, narrow ? /*#__PURE__*/React.createElement(WalletControl, {
      state: "connected",
      address: window.VS_MOCK.wallet.address,
      network: "Sepolia",
      compact: true
    }) : actions)), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        padding: narrow ? "18px 20px 28px" : "30px 40px 72px",
        maxWidth: "var(--content-max)",
        width: "100%",
        position: "relative"
      }
    }, banner ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 22
      }
    }, banner) : null, narrow && title ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 18
      }
    }, eyebrow ? /*#__PURE__*/React.createElement("span", {
      className: "vs-micro"
    }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
      className: "vs-title-1",
      style: {
        margin: 0
      }
    }, title)) : null, children), narrow ? /*#__PURE__*/React.createElement(ConsoleNav, {
      variant: "bottom",
      items: nav,
      active: view,
      onNavigate: onNavigate
    }) : null));
  }

  /* A ruled section — the console's alternative to wrapping everything in cards. Optional
     `panel` puts the body on a raised surface when the content is a diagram rather than
     a list. */
  function Section({
    label,
    title,
    description,
    actions,
    children,
    gap = 18,
    panel = false,
    style
  }) {
    const {
      SectionHead
    } = V();
    return /*#__PURE__*/React.createElement("section", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap,
        ...style
      }
    }, /*#__PURE__*/React.createElement(SectionHead, {
      label: label,
      title: title,
      description: description,
      actions: actions
    }), panel ? /*#__PURE__*/React.createElement("div", {
      className: "vs-panel-quiet",
      style: {
        padding: 20
      }
    }, children) : children);
  }

  /* Framed surface: one panel treatment with the 36px measuring lattice inside it, masked
     to the top-left. The same treatment the homepage pool field uses, so the console and
     the site read as one system. Depth comes from surface value + hairline + a low wide
     shadow — never from a floating card. */
  function Frame({
    children,
    tone = "raised",
    pad = 22,
    lattice = true,
    accent,
    style
  }) {
    const bg = tone === "brand" ? "linear-gradient(180deg, var(--surface-brand), var(--surface-raised) 64%)" : tone === "quiet" ? "var(--surface-base)" : "var(--surface-raised)";
    const border = accent === "private" ? "var(--border-private)" : accent === "verified" ? "var(--border-verified)" : "var(--border-hairline)";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--r-lg)",
        border: `1px solid ${border}`,
        background: bg,
        boxShadow: "var(--sheen-top), var(--shadow-panel)",
        padding: pad,
        ...style
      }
    }, lattice ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "linear-gradient(to right, var(--field-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--field-grid) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        maskImage: "radial-gradient(80% 70% at 12% 0%, #000, transparent 74%)",
        WebkitMaskImage: "radial-gradient(80% 70% at 12% 0%, #000, transparent 74%)"
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, children));
  }
  Object.assign(window, {
    ConsoleShell,
    Section,
    Frame,
    vsUseIsNarrow: vsNarrowC
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/ConsoleShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/DepositFlow.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Deposit: readiness → local encryption → wallet → chain → ERC-7984 callback accounting.
     The user's balance is only offered as a Max once they have revealed it themselves. */
  function DepositFlow({
    open,
    onClose
  }) {
    const {
      Sheet,
      AmountField,
      Button,
      StatusStepper,
      ConfidentialValue,
      StatusPill,
      Icon,
      Badge
    } = V();
    const [step, setStep] = React.useState("amount");
    const [amount, setAmount] = React.useState("");
    const [balance, setBalance] = React.useState("masked");
    React.useEffect(() => {
      if (!open) {
        setStep("amount");
        setAmount("");
        setBalance("masked");
      }
    }, [open]);
    React.useEffect(() => {
      if (step === "submitting") {
        const t = setTimeout(() => setStep("confirming"), 2000);
        return () => clearTimeout(t);
      }
      if (step === "confirming") {
        const t = setTimeout(() => setStep("confirmed"), 2400);
        return () => clearTimeout(t);
      }
    }, [step]);
    React.useEffect(() => {
      if (balance === "revealing") {
        const t = setTimeout(() => setBalance("revealed"), 1200);
        return () => clearTimeout(t);
      }
    }, [balance]);
    const steps = [{
      label: "Encrypted in your browser",
      kind: "encrypting",
      status: "done",
      meta: "FHE INPUT PROOF"
    }, {
      label: "Approve in your wallet",
      kind: "wallet",
      status: step === "submitting" ? "active" : "done",
      detail: "Confirm the confidential transfer. Nothing is submitted until you approve."
    }, {
      label: "Confirming on Sepolia",
      kind: "confirming",
      status: step === "submitting" ? "future" : step === "confirming" ? "active" : "done",
      meta: step === "amount" ? undefined : "0x4c8b…c7",
      detail: "2 of 3 confirmations."
    }, {
      label: "Token callback accounting",
      kind: "dependency",
      status: step === "confirmed" ? "done" : "future",
      detail: "The ERC-7984 callback credits your slot. Your balance updates when it lands."
    }];
    const footer = step === "amount" ? /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      block: true,
      icon: "lock",
      disabled: !amount,
      onClick: () => setStep("submitting")
    }, "Encrypt and deposit") : step === "confirmed" ? /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      block: true,
      onClick: onClose
    }, "Done") : /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "lg",
      block: true,
      disabled: true
    }, "Waiting on the chain\u2026");
    return /*#__PURE__*/React.createElement(Sheet, {
      open: open,
      eyebrow: "Deposit",
      title: step === "confirmed" ? "Deposit confirmed" : "Save cUSDT",
      onClose: onClose,
      footer: footer,
      fullHeight: true
    }, step === "amount" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        borderRadius: "var(--r-md)",
        background: "var(--surface-inset)",
        border: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "wallet",
      size: 14,
      style: {
        color: "var(--text-muted)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)"
      }
    }, "cUSDT in your wallet")), /*#__PURE__*/React.createElement(ConfidentialValue, {
      size: "row",
      state: balance,
      value: "2,400.000000",
      unit: "",
      onReveal: () => setBalance("revealing"),
      onHide: () => setBalance("masked")
    })), /*#__PURE__*/React.createElement(AmountField, {
      value: amount,
      onChange: setAmount,
      max: balance === "revealed" ? "2,400.000000" : undefined,
      onMax: () => setAmount("2400.000000"),
      helper: "Encrypted in your browser before it is submitted.",
      autoFocus: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 0 0",
        borderTop: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "Slot"), /*#__PURE__*/React.createElement(Badge, {
      icon: "grid-2x2"
    }, "Slot 07 \xB7 yours")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "First eligible"), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-primary)"
      }
    }, "Epoch 43")), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        margin: 0
      }
    }, "A deposit made while epoch 42 is open first participates in epoch 43. Principal stays withdrawable throughout."))) : null, step === "submitting" || step === "confirming" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "private",
      pulse: true
    }, "Deposit in progress"), /*#__PURE__*/React.createElement(StatusStepper, {
      steps: steps
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        margin: 0
      }
    }, "You can close this sheet. The operation continues and appears in your activity when it lands.")) : null, step === "confirmed" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        display: "grid",
        placeItems: "center",
        borderRadius: "var(--r-sm)",
        background: "var(--teal-500)",
        color: "var(--ink-050)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      strokeWidth: 2.2
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-title-3"
    }, "Credited to slot 07"), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "0x4c8b21ff90a4c7"))), /*#__PURE__*/React.createElement(StatusStepper, {
      steps: steps
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)",
        margin: 0
      }
    }, "Your pending weight becomes eligible in epoch 43. The amount stayed encrypted the whole way \u2014 this confirmation does not contain it.")) : null);
  }
  Object.assign(window, {
    DepositFlow
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/DepositFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/DrawsVerify.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;
  const VS_EPOCHS = [{
    id: 41,
    winner: "0x8f21c4…04c7",
    state: "finalized",
    drawn: "MAR 2 · 09:04",
    verdict: "verified"
  }, {
    id: 40,
    winner: "0x41b7d0…9e12",
    state: "finalized",
    drawn: "FEB 24 · 09:02",
    verdict: "verified"
  }, {
    id: 39,
    winner: "—",
    state: "timedOut",
    drawn: "FEB 17 · 09:00",
    verdict: "failed"
  }, {
    id: 38,
    winner: "0xcc0a51…7b40",
    state: "finalized",
    drawn: "FEB 10 · 09:03",
    verdict: "verified"
  }];
  function EpochRow({
    e,
    onOpen
  }) {
    const {
      StatusPill,
      IconButton,
      Badge
    } = V();
    return /*#__PURE__*/React.createElement("li", {
      onClick: () => onOpen(e.id),
      style: {
        display: "grid",
        gridTemplateColumns: "84px 1fr auto auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 4px",
        borderBottom: "1px solid var(--border-hairline)",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      mono: true
    }, "E", e.id), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono",
      style: {
        color: e.winner === "—" ? "var(--text-faint)" : "var(--text-secondary)"
      }
    }, e.winner), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, e.drawn), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, e.state === "timedOut" ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "terminal"
    }, "Timed out") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified"
    }, "Authenticated"), /*#__PURE__*/React.createElement(IconButton, {
      name: "chevron-right",
      size: "sm",
      label: `Open epoch ${e.id}`
    })));
  }
  function EpochDetail({
    id,
    onBack,
    narrow
  }) {
    const {
      EpochTimeline,
      ProofBlock,
      EvidenceRow,
      Button,
      SlotGrid,
      StatusPill,
      PrivacyCallout
    } = V();
    const timedOut = id === 39;
    const slots = window.VS_MOCK.pool.slots.map((s, i) => i === 10 && !timedOut ? "drawn" : s === "mine" ? "filled" : s);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 32
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "sm",
      icon: "chevron-left",
      onClick: onBack
    }, "All draws"), timedOut ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "terminal"
    }, "Terminal \u2014 no reroll") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified"
    }, "Winner finalized")), /*#__PURE__*/React.createElement(Section, {
      label: `Epoch ${id}`,
      title: timedOut ? "Randomness never arrived" : "Winner 0x8f21c4…04c7",
      description: timedOut ? "The VRF request was not fulfilled within the deadline. A timed-out epoch is terminal: weights stay frozen, no winner is selected, and no reroll is possible." : "Public evidence in protocol order. Expand any block to inspect the machine values."
    }, /*#__PURE__*/React.createElement(EpochTimeline, {
      steps: window.VS_MOCK.epochSteps[timedOut ? "timedOut" : "finalized"],
      orientation: narrow ? "vertical" : "horizontal"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.5fr) minmax(0, 1fr)",
        gap: narrow ? 28 : 40,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(ProofBlock, {
      title: "Freeze",
      verdict: "verified",
      summary: "Eligibility snapshot taken before the randomness request."
    }, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Freeze block",
      value: "5 812 004",
      kind: "plain",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Snapshot commitment",
      value: "0x63d1a70cf4e829bb51",
      kind: "handle",
      verified: true,
      note: "Commitment reference \u2014 not a balance."
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Eligible slots",
      value: "11 of 16",
      kind: "plain",
      verified: true
    })), /*#__PURE__*/React.createElement(ProofBlock, {
      title: "Randomness",
      verdict: timedOut ? "failed" : "verified",
      verdictLabel: timedOut ? "Not fulfilled" : undefined,
      summary: "Chainlink VRF request bound to this epoch."
    }, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Request id",
      value: "0x9f2c41a8b7e5d0c3",
      verified: !timedOut
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Requested in",
      value: "0x18ba90c4de7712fa03",
      href: "#",
      verified: !timedOut
    }), timedOut ? /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Fulfilment",
      value: "No callback before deadline",
      kind: "plain"
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Fulfilment tx",
      value: "0x41ba7730c92f18ee0a4b",
      href: "#",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Stored random word",
      value: "0xb70e\u202641c9",
      kind: "handle",
      verified: true
    }))), !timedOut ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ProofBlock, {
      title: "Encrypted draw",
      verdict: "verified",
      summary: "A separate transaction selects the winner over encrypted weights.",
      defaultOpen: !narrow
    }, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Draw tx",
      value: "0x77a1cd0e4b8830fa19",
      href: "#",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner handle",
      value: "0x7ab34e91c05f",
      kind: "handle",
      verified: true,
      note: "Ciphertext reference \u2014 not an amount."
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Weights source",
      value: "Frozen snapshot, unchanged since the request",
      kind: "plain",
      verified: true
    })), /*#__PURE__*/React.createElement(ProofBlock, {
      title: "Winner proof and finality",
      verdict: "verified",
      summary: "Authenticated public decryption of the winner address only.",
      footnote: "Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.",
      defaultOpen: !narrow
    }, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "KMS proof",
      value: "0xd41c90aa7b6e5528",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Binds",
      value: "Epoch \xB7 request id \xB7 winner handle \xB7 state \xB7 address",
      kind: "plain",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Finality delay",
      value: "96 blocks after reveal",
      kind: "plain",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner address",
      value: "0x8f21c4b70a5519d3ff9a4004c7",
      kind: "address",
      href: "#",
      verified: true
    }))) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 28
      }
    }, /*#__PURE__*/React.createElement(Section, {
      label: "Slots at freeze",
      title: timedOut ? "No slot drawn" : "Drawn slot 11",
      gap: 14
    }, /*#__PURE__*/React.createElement(SlotGrid, {
      slots: slots,
      size: "lg",
      legend: true
    })), /*#__PURE__*/React.createElement(PrivacyCallout, {
      compact: true,
      title: "Boundary",
      limitation: null
    }))));
  }
  function DrawsVerify({
    narrow
  }) {
    const {
      Tabs,
      EpochTimeline,
      ProgressTrack,
      StatusPill,
      EpochNodeLegend
    } = V();
    const [tab, setTab] = React.useState("current");
    const [open, setOpen] = React.useState(null);
    if (open) return /*#__PURE__*/React.createElement(EpochDetail, {
      id: open,
      onBack: () => setOpen(null),
      narrow: narrow
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 28
      }
    }, /*#__PURE__*/React.createElement(Tabs, {
      items: [{
        id: "current",
        label: "Current draw"
      }, {
        id: "history",
        label: "History",
        count: 41
      }],
      value: tab,
      onChange: setTab
    }), tab === "current" ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 26
      }
    }, /*#__PURE__*/React.createElement(Section, {
      label: `Epoch ${window.VS_MOCK.epoch.id}`,
      title: "Randomness requested",
      description: "Weights were frozen before the request and cannot change. The draw runs over encrypted weights once the random word is stored."
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "pending",
      pulse: true
    }, "Awaiting Chainlink fulfilment"), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "REQ 0x9f2c41a8b7e5d0c3")), /*#__PURE__*/React.createElement(ProgressTrack, {
      value: window.VS_MOCK.epoch.elapsed,
      tone: "private",
      label: "Epoch elapsed"
    }), /*#__PURE__*/React.createElement(EpochTimeline, {
      steps: window.VS_MOCK.epochSteps.vrfRequested,
      orientation: narrow ? "vertical" : "horizontal"
    }), /*#__PURE__*/React.createElement(EpochNodeLegend, null))) : /*#__PURE__*/React.createElement(Section, {
      label: "Public record",
      title: "All draws",
      description: "Every epoch keeps its evidence. Winner addresses are public; prize amounts are not."
    }, /*#__PURE__*/React.createElement("ul", null, VS_EPOCHS.map(e => /*#__PURE__*/React.createElement(EpochRow, {
      key: e.id,
      e: e,
      onOpen: setOpen
    })))));
  }
  Object.assign(window, {
    DrawsVerify,
    EpochDetail
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/DrawsVerify.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/Overview.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Independent per-value reveal. Revealing principal never reveals the prize:
     each key owns its own state machine. */
  function useReveals() {
    const [map, setMap] = React.useState({});
    const set = (k, v) => setMap(m => ({
      ...m,
      [k]: v
    }));
    const reveal = (k, delay = 1300) => {
      set(k, "revealing");
      setTimeout(() => set(k, "revealed"), delay);
    };
    return {
      state: (k, fallback = "masked") => map[k] || fallback,
      reveal,
      hide: k => set(k, "masked"),
      set
    };
  }

  /* ── The position band ──────────────────────────────────────────────────────────
     The dashboard's anchor: one encrypted figure at display scale, the slot it occupies,
     the two weights that decide eligibility, and the two commands. It is a single framed
     surface rather than four cards, so the eye lands on the value and the structure
     reads as one position rather than a scatter of metrics. */
  function PositionBlock({
    scenario,
    reveals,
    onDeposit,
    onWithdraw,
    narrow
  }) {
    const {
      FinancialMetric,
      ConfidentialValue,
      Button,
      Icon,
      SlotGrid,
      StateBlock
    } = V();
    const p = window.VS_MOCK.position;
    if (scenario === "empty") {
      return /*#__PURE__*/React.createElement(StateBlock, {
        kind: "empty",
        title: "No savings yet",
        actionLabel: "Deposit cUSDT",
        onAction: onDeposit,
        secondaryLabel: "How privacy works"
      }, "Fifteen of the sixteen slots are taken. Deposit cUSDT to claim one \u2014 your amount is encrypted in this browser before it is submitted.");
    }
    const down = scenario === "rpcDown";
    return /*#__PURE__*/React.createElement(Frame, {
      tone: "brand",
      accent: "private",
      pad: narrow ? 20 : 28
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: narrow ? 22 : 26
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) auto",
        gap: narrow ? 22 : 32,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "Your position"), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 14,
        height: 1,
        background: "var(--border-subtle)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        font: "var(--type-micro)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: "var(--text-private)",
        whiteSpace: "nowrap"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "grid-2x2",
      size: 11,
      strokeWidth: 1.9
    }), " Slot 07 of 16")), /*#__PURE__*/React.createElement(ConfidentialValue, {
      size: "xl",
      state: down ? "unavailable" : reveals.state("savings"),
      value: p.savings,
      onReveal: () => reveals.reveal("savings"),
      onHide: () => reveals.hide("savings"),
      onRetry: () => reveals.set("savings", "masked")
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: 0,
        font: "var(--type-body-sm)",
        color: down ? "var(--text-pending)" : "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: down ? "cloud-off" : "shield-check",
      size: 13,
      style: {
        flex: "none",
        color: down ? "var(--text-pending)" : "var(--text-verified)"
      }
    }), down ? "Chain reads are failing. Your principal is unaffected." : "Principal stays withdrawable at all times.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: narrow ? "row" : "column",
        gap: 10,
        width: narrow ? "100%" : 168
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: narrow ? "lg" : "md",
      icon: "arrow-down-to-line",
      onClick: onDeposit,
      block: true
    }, "Deposit"), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: narrow ? "lg" : "md",
      icon: "arrow-up-from-line",
      onClick: onWithdraw,
      block: true
    }, "Withdraw"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr) auto",
        gap: narrow ? 20 : 32,
        paddingTop: narrow ? 20 : 22,
        borderTop: "1px solid var(--border-hairline)",
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(FinancialMetric, {
      label: "Eligible weight",
      hint: "Weight already frozen into the current epoch. Odds are never shown.",
      size: "md",
      state: reveals.state("eligible"),
      value: p.eligible,
      onReveal: () => reveals.reveal("eligible"),
      onHide: () => reveals.hide("eligible"),
      footnote: "Counted in epoch 42.",
      footnoteTone: "verified"
    }), /*#__PURE__*/React.createElement(FinancialMetric, {
      label: "Pending weight",
      hint: "Deposited during the open epoch. It becomes eligible at the next maturity.",
      size: "md",
      state: reveals.state("pending"),
      value: p.pending,
      onReveal: () => reveals.reveal("pending"),
      onHide: () => reveals.hide("pending"),
      footnote: `Eligible from epoch ${p.eligibleFrom}.`,
      footnoteTone: "pending"
    }), !narrow ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 9,
        alignItems: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-micro"
    }, "Pool"), /*#__PURE__*/React.createElement(SlotGrid, {
      size: "sm",
      slots: window.VS_MOCK.pool.slots,
      caption: null
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "12 / 16 TAKEN")) : null), /*#__PURE__*/React.createElement("p", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        margin: 0,
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 16
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13,
      style: {
        color: "var(--text-private)",
        flex: "none"
      }
    }), "Amounts and weights are encrypted. Your wallet address and transaction timing remain public.")));
  }
  function EpochPanel({
    narrow,
    onVerify
  }) {
    const {
      EpochTimeline,
      ProgressTrack,
      Button,
      StatusPill
    } = V();
    const e = window.VS_MOCK.epoch;
    return /*#__PURE__*/React.createElement(Section, {
      label: "Current epoch",
      title: `Epoch ${e.id}`,
      actions: !narrow ? /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "sm",
        iconAfter: "arrow-right",
        onClick: onVerify
      }, "Evidence") : null
    }, /*#__PURE__*/React.createElement(Frame, {
      tone: "raised",
      pad: narrow ? 18 : 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "pending",
      pulse: true
    }, "Awaiting randomness"), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "FROZEN AT BLOCK ", e.block)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(ProgressTrack, {
      value: e.elapsed,
      tone: "private",
      label: "Epoch elapsed"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "OPENED MAR 3 \xB7 09:00"), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "FREEZES MAR 10 \xB7 09:00"))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 20
      }
    }, /*#__PURE__*/React.createElement(EpochTimeline, {
      steps: window.VS_MOCK.epochSteps[e.state],
      orientation: narrow ? "vertical" : "horizontal"
    })))), narrow ? /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "md",
      block: true,
      iconAfter: "arrow-right",
      onClick: onVerify
    }, "View draw evidence") : null);
  }
  function PoolPanel() {
    const {
      SlotGrid,
      StrategyBadge
    } = V();
    return /*#__PURE__*/React.createElement(Section, {
      label: "Pool",
      title: "16 slots",
      gap: 16
    }, /*#__PURE__*/React.createElement(Frame, {
      tone: "raised",
      pad: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(SlotGrid, {
      slots: window.VS_MOCK.pool.slots,
      legend: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "Prize funding"), /*#__PURE__*/React.createElement(StrategyBadge, {
      mode: "test",
      size: "sm"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)"
      }
    }, "One prize per weekly epoch, funded by donations into a deterministic test vault.")))));
  }
  function ActivityPanel() {
    const {
      ActivityItem
    } = V();
    return /*#__PURE__*/React.createElement(Section, {
      label: "Recent activity",
      title: "Privacy-safe log",
      gap: 8
    }, /*#__PURE__*/React.createElement("ul", null, window.VS_MOCK.activity.map((a, i) => /*#__PURE__*/React.createElement(ActivityItem, _extends({
      key: i
    }, a)))), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-faint)",
        paddingTop: 4
      }
    }, "Amounts never appear here, in notifications, or in the page title."));
  }
  function Overview({
    scenario = "default",
    onDeposit,
    onWithdraw,
    onVerify,
    narrow
  }) {
    const {
      TicketPanel,
      QueueItem
    } = V();
    const reveals = useReveals();
    const showTicket = scenario === "queued" || scenario === "default";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 40
      }
    }, /*#__PURE__*/React.createElement(PositionBlock, {
      scenario: scenario,
      reveals: reveals,
      onDeposit: onDeposit,
      onWithdraw: onWithdraw,
      narrow: narrow
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.25fr) minmax(0, 0.9fr)",
        gap: narrow ? 40 : 48,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 40,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(EpochPanel, {
      narrow: narrow,
      onVerify: onVerify
    }), /*#__PURE__*/React.createElement(PrizePanel, {
      reveals: reveals,
      scenario: scenario
    }), showTicket ? /*#__PURE__*/React.createElement(Section, {
      label: "Withdrawal",
      title: "Your ticket",
      gap: 16
    }, /*#__PURE__*/React.createElement(TicketPanel, {
      state: scenario === "queued" ? "claimable" : "queued",
      position: 2,
      total: 3,
      requestedAt: "MAR 2 \xB7 16:08",
      steps: [{
        label: "Request accepted",
        kind: "submitted",
        status: "done",
        meta: "0x2be0…cc"
      }, {
        label: "Routing proof",
        kind: "dependency",
        status: "done",
        meta: "IMMEDIATE LIQUIDITY SHORT"
      }, {
        label: "Strategy redemption",
        kind: "dependency",
        status: scenario === "queued" ? "done" : "active",
        detail: "The controller is redeeming from the strategy and rewrapping to confidential balance."
      }, {
        label: "Confidential claim",
        kind: "fulfilled",
        status: scenario === "queued" ? "active" : "future"
      }]
    }), /*#__PURE__*/React.createElement("ul", {
      style: {
        display: "grid",
        gap: 8
      }
    }, window.VS_MOCK.queue.map(q => /*#__PURE__*/React.createElement(QueueItem, _extends({
      key: q.position
    }, q, {
      total: 3
    }))))) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 40,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(PoolPanel, null), /*#__PURE__*/React.createElement(ActivityPanel, null))));
  }
  Object.assign(window, {
    Overview,
    useReveals
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/Overview.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/PrizePanel.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* The winner journey — the product's strongest sequence:
     verified winner → authorized (ACL) → ready → revealed → claimed.
     Nothing decrypts without an explicit action, and the celebration stays quiet. */
  function PrizePanel({
    scenario = "default",
    reveals
  }) {
    const {
      ResultState,
      ConfidentialValue,
      StatusStepper,
      Button,
      StateBlock,
      Icon
    } = V();
    const prize = window.VS_MOCK.prize;
    const winner = scenario === "winner" || scenario === "default";
    const [stage, setStage] = React.useState(scenario === "winner" ? "proof" : "ready");
    React.useEffect(() => {
      if (stage === "proof") {
        const t = setTimeout(() => setStage("acl"), 1800);
        return () => clearTimeout(t);
      }
      if (stage === "acl") {
        const t = setTimeout(() => setStage("ready"), 2400);
        return () => clearTimeout(t);
      }
      if (stage === "revealing") {
        const t = setTimeout(() => setStage("revealed"), 1400);
        return () => clearTimeout(t);
      }
    }, [stage]);
    if (!winner) {
      return /*#__PURE__*/React.createElement(Section, {
        label: "Prize",
        title: `Epoch ${prize.epoch} result`,
        gap: 16
      }, /*#__PURE__*/React.createElement(ResultState, {
        variant: "nonWinner",
        epoch: prize.epoch
      }));
    }
    if (scenario === "noDraw") {
      return /*#__PURE__*/React.createElement(Section, {
        label: "Prize",
        title: "No active draw",
        gap: 16
      }, /*#__PURE__*/React.createElement(StateBlock, {
        kind: "waiting",
        title: "Waiting for the next epoch",
        meta: "OPENS MAR 10 \xB7 09:00",
        compact: true
      }, "Eligibility freezes weekly. Nothing is required from you until then."));
    }
    const valueState = stage === "proof" ? "unavailable" : stage === "acl" ? "aclPending" : stage === "ready" ? "masked" : stage === "revealing" ? "revealing" : "revealed";
    const steps = [{
      label: "Winner finalized",
      kind: "fulfilled",
      status: "done",
      meta: "PUBLIC ADDRESS"
    }, {
      label: "KMS proof authenticated",
      kind: "dependency",
      status: stage === "proof" ? "active" : "done",
      meta: stage === "proof" ? undefined : "VERIFIED",
      detail: "The public-decryption proof binds epoch, request, handle and winner address."
    }, {
      label: "96-block finality delay",
      kind: "dependency",
      status: stage === "proof" ? "future" : "done",
      meta: stage === "proof" ? undefined : "PASSED"
    }, {
      label: "Private access confirmed",
      kind: "dependency",
      status: stage === "proof" ? "future" : stage === "acl" ? "active" : "done",
      detail: "Access-control propagation lets your wallet — and only your wallet — decrypt the prize.",
      meta: stage === "proof" || stage === "acl" ? undefined : "GRANTED"
    }];
    return /*#__PURE__*/React.createElement(Section, {
      label: "Prize",
      title: `Epoch ${prize.epoch} result`,
      gap: 16
    }, /*#__PURE__*/React.createElement(ResultState, {
      variant: "winner",
      epoch: prize.epoch,
      address: "0x8f21c4\u202604c7"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(ConfidentialValue, {
      label: "Your prize",
      size: "lg",
      state: valueState,
      value: prize.amount,
      hideActions: true,
      note: stage === "proof" ? "Verifying the winner proof" : undefined
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, stage === "ready" ? /*#__PURE__*/React.createElement(Button, {
      tone: "reveal",
      size: "md",
      icon: "key-round",
      onClick: () => setStage("revealing")
    }, "Reveal prize") : null, stage === "revealed" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "md",
      icon: "arrow-down-to-line",
      onClick: () => setStage("claimed")
    }, "Claim prize"), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "md",
      icon: "eye-off",
      onClick: () => setStage("ready")
    }, "Hide")) : null, stage === "claimed" ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "var(--type-body-sm)",
        color: "var(--text-verified)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "circle-check",
      size: 14
    }), " Claimed to your wallet") : null)), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--border-verified)",
        paddingTop: 16
      }
    }, /*#__PURE__*/React.createElement(StatusStepper, {
      steps: steps
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)"
      }
    }, "The winner address is public. The prize amount is decrypted locally, in this session only \u2014 it is never written to a log, a URL, or a notification."))));
  }
  Object.assign(window, {
    PrizePanel
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/PrizePanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/WithdrawFlow.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Withdrawal: routing is unknown until the proof resolves. Immediate settlement and the
     FIFO queue are both normal outcomes, so neither is styled as a failure. */
  function WithdrawFlow({
    open,
    onClose
  }) {
    const {
      Sheet,
      AmountField,
      Button,
      StatusStepper,
      TicketPanel,
      StatusPill,
      Icon,
      RecoveryBanner
    } = V();
    const [step, setStep] = React.useState("amount");
    const [amount, setAmount] = React.useState("");
    React.useEffect(() => {
      if (!open) {
        setStep("amount");
        setAmount("");
      }
    }, [open]);
    React.useEffect(() => {
      if (step === "routing") {
        const t = setTimeout(() => setStep(parseFloat(amount || "0") <= 500 ? "immediate" : "queued"), 2400);
        return () => clearTimeout(t);
      }
    }, [step, amount]);
    const routingSteps = [{
      label: "Encrypted in your browser",
      kind: "encrypting",
      status: "done"
    }, {
      label: "Request submitted",
      kind: "submitted",
      status: "done",
      meta: "0x2be0…cc"
    }, {
      label: "Routing proof",
      kind: "dependency",
      status: step === "routing" ? "active" : "done",
      detail: "The pool is checking confidential liquidity. Until this resolves, immediate settlement and the queue are both possible."
    }];
    const footer = step === "amount" ? /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      block: true,
      icon: "lock",
      disabled: !amount,
      onClick: () => setStep("routing")
    }, "Request withdrawal") : step === "routing" ? /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "lg",
      block: true,
      disabled: true
    }, "Determining routing\u2026") : /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      block: true,
      onClick: onClose
    }, "Done");
    const title = step === "immediate" ? "Withdrawal complete" : step === "queued" ? "Withdrawal queued" : "Withdraw principal";
    return /*#__PURE__*/React.createElement(Sheet, {
      open: open,
      eyebrow: "Withdraw",
      title: title,
      onClose: onClose,
      footer: footer,
      fullHeight: true
    }, step === "amount" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AmountField, {
      value: amount,
      onChange: setAmount,
      label: "Amount to withdraw",
      helper: "Encrypted in your browser. Try 400 for immediate settlement, 900 to see the FIFO queue.",
      autoFocus: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 0 0",
        borderTop: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "What happens next"), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)",
        margin: 0
      }
    }, "Immediate settlement is attempted first. If confidential liquidity is short, the unpaid encrypted remainder joins the withdrawal queue in request order \u2014 one active ticket per slot."))) : null, step === "routing" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "private",
      pulse: true
    }, "Routing unknown"), /*#__PURE__*/React.createElement(StatusStepper, {
      steps: routingSteps
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        margin: 0
      }
    }, "Your principal is not at risk while this resolves. You can close this sheet and follow it from the dashboard.")) : null, step === "immediate" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        display: "grid",
        placeItems: "center",
        borderRadius: "var(--r-sm)",
        background: "var(--teal-500)",
        color: "var(--ink-050)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      strokeWidth: 2.2
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-title-3"
    }, "Settled immediately"), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "0x2be04a91ccd7"))), /*#__PURE__*/React.createElement(StatusStepper, {
      steps: [...routingSteps, {
        label: "Confidential transfer to your wallet",
        kind: "fulfilled",
        status: "done",
        meta: "AVAILABLE NOW"
      }]
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)",
        margin: 0
      }
    }, "Confidential liquidity covered the request in full. The amount was never published.")) : null, step === "queued" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RecoveryBanner, {
      tone: "info",
      title: "This is a normal protocol state"
    }, "A queue position is not a failure. Your principal remains yours and the ticket keeps its request-time position until it is fully settled."), /*#__PURE__*/React.createElement(TicketPanel, {
      state: "settlementRequested",
      position: 3,
      total: 3,
      requestedAt: "MAR 3 \xB7 09:41",
      steps: [{
        label: "Queued in request order",
        kind: "submitted",
        status: "done",
        meta: "POSITION 3"
      }, {
        label: "Strategy redemption",
        kind: "dependency",
        status: "active",
        detail: "Public redemption from the strategy, then a confidential rewrap into pool liquidity."
      }, {
        label: "FIFO allocation",
        kind: "dependency",
        status: "future"
      }, {
        label: "Claim",
        kind: "fulfilled",
        status: "future"
      }]
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        margin: 0
      }
    }, "If redemption fails, the ticket stays intact and anyone can retry the settlement call \u2014 no value is lost and your position does not move.")) : null);
  }
  Object.assign(window, {
    WithdrawFlow
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/WithdrawFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/mock.jsx
try { (() => {
/* Mock chain state for the VeilSave console kit. Amounts only ever appear here as
   already-formatted strings the user chose to reveal; nothing derives odds or APY. */
(() => {
  const VS_MOCK = {
    wallet: {
      state: "connected",
      address: "0x8f21c4b70a5519d3ff9a4004c7",
      network: "Sepolia"
    },
    slot: 7,
    epoch: {
      id: 42,
      state: "vrfRequested",
      opened: "MAR 3 · 09:00",
      freezes: "MAR 10 · 09:00",
      elapsed: 68,
      block: "5 812 004",
      request: "0x9f2c41a8b7e5d0c3"
    },
    position: {
      savings: "1,284.720000",
      eligible: "1,284.720000",
      pending: "400.000000",
      eligibleFrom: 43
    },
    pool: {
      slots: ["mine", "filled", "filled", "empty", "filled", "filled", "empty", "filled", "filled", "empty", "filled", "filled", "empty", "empty", "filled", "filled"],
      strategy: "test"
    },
    queue: [{
      position: 1,
      slot: 4,
      state: "claimable",
      requested: "MAR 2 · 14:22"
    }, {
      position: 2,
      slot: 7,
      state: "queued",
      requested: "MAR 2 · 16:08",
      mine: true
    }, {
      position: 3,
      slot: 12,
      state: "queued",
      requested: "MAR 3 · 08:41"
    }],
    prize: {
      epoch: 41,
      amount: "96.400000",
      winner: "0x8f21c4b70a5519d3ff9a4004c7"
    },
    activity: [{
      kind: "deposit",
      title: "Deposit confirmed",
      epoch: 42,
      time: "MAR 3 · 09:14",
      hash: "0x4c8b21ff90a4c7",
      status: "Confirmed"
    }, {
      kind: "reveal",
      title: "Savings revealed",
      time: "MAR 3 · 09:20",
      local: true
    }, {
      kind: "draw",
      title: "Epoch 41 draw executed",
      epoch: 41,
      time: "MAR 2 · 09:04",
      hash: "0x77a1cd0e4b",
      status: "Verified"
    }, {
      kind: "withdrawRequest",
      title: "Withdrawal requested",
      epoch: 41,
      time: "MAR 2 · 16:08",
      hash: "0x2be04a91cc",
      status: "Queued"
    }, {
      kind: "prize",
      title: "Epoch 41 winner finalized",
      epoch: 41,
      time: "MAR 2 · 09:36",
      hash: "0x9a41c70de2",
      status: "Public"
    }],
    epochSteps: {
      open: [{
        label: "Open",
        state: "active",
        meta: "MAR 3 · 09:00",
        detail: "Deposits made now first participate in epoch 43."
      }, {
        label: "Eligibility frozen",
        state: "future"
      }, {
        label: "Randomness requested",
        state: "future"
      }, {
        label: "Randomness fulfilled",
        state: "future"
      }, {
        label: "Encrypted draw",
        state: "future"
      }, {
        label: "Winner finalized",
        state: "future"
      }],
      frozen: [{
        label: "Open",
        state: "done",
        meta: "MAR 3 · 09:00"
      }, {
        label: "Eligibility frozen",
        state: "active",
        meta: "BLOCK 5 812 004",
        detail: "Frozen weights no longer change. The draw can be requested by anyone."
      }, {
        label: "Randomness requested",
        state: "future"
      }, {
        label: "Randomness fulfilled",
        state: "future"
      }, {
        label: "Encrypted draw",
        state: "future"
      }, {
        label: "Winner finalized",
        state: "future"
      }],
      vrfRequested: [{
        label: "Open",
        state: "done",
        meta: "MAR 3 · 09:00"
      }, {
        label: "Eligibility frozen",
        state: "done",
        meta: "BLOCK 5 812 004"
      }, {
        label: "Randomness requested",
        state: "done",
        meta: "REQ 0x9f2c…c1"
      }, {
        label: "Randomness fulfilled",
        state: "waiting",
        meta: "CHAINLINK VRF",
        detail: "Chainlink holds the request. Fulfilment usually lands within minutes."
      }, {
        label: "Encrypted draw",
        state: "future"
      }, {
        label: "Winner finalized",
        state: "future"
      }],
      drawRunning: [{
        label: "Open",
        state: "done",
        meta: "MAR 3 · 09:00"
      }, {
        label: "Eligibility frozen",
        state: "done",
        meta: "BLOCK 5 812 004"
      }, {
        label: "Randomness requested",
        state: "done",
        meta: "REQ 0x9f2c…c1"
      }, {
        label: "Randomness fulfilled",
        state: "done",
        meta: "WORD STORED"
      }, {
        label: "Encrypted draw",
        state: "active",
        meta: "FHE EXECUTION",
        detail: "The winner is selected over encrypted weights. No balance is decrypted."
      }, {
        label: "Winner finalized",
        state: "future"
      }],
      finalized: [{
        label: "Open",
        state: "done",
        meta: "MAR 3 · 09:00"
      }, {
        label: "Eligibility frozen",
        state: "done",
        meta: "BLOCK 5 812 004"
      }, {
        label: "Randomness requested",
        state: "done",
        meta: "REQ 0x9f2c…c1"
      }, {
        label: "Randomness fulfilled",
        state: "done",
        meta: "WORD STORED"
      }, {
        label: "Encrypted draw",
        state: "done",
        meta: "TX 0x77a1…0e"
      }, {
        label: "Winner finalized",
        state: "done",
        meta: "96-BLOCK DELAY PASSED"
      }],
      timedOut: [{
        label: "Open",
        state: "done",
        meta: "MAR 3 · 09:00"
      }, {
        label: "Eligibility frozen",
        state: "done",
        meta: "BLOCK 5 812 004"
      }, {
        label: "Randomness requested",
        state: "done",
        meta: "REQ 0x9f2c…c1"
      }, {
        label: "Randomness fulfilled",
        state: "terminal",
        meta: "TIMED OUT",
        detail: "The request was not fulfilled in time. This frozen epoch is terminal and cannot be rerolled."
      }, {
        label: "Encrypted draw",
        state: "terminal"
      }, {
        label: "Winner finalized",
        state: "terminal"
      }]
    },
    epochLabels: {
      open: "Epoch open",
      frozen: "Eligibility frozen",
      vrfRequested: "Randomness requested",
      drawRunning: "Encrypted draw running",
      finalized: "Winner finalized",
      timedOut: "Draw timed out"
    }
  };
  window.VS_MOCK = VS_MOCK;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/mock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Hero.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* The hero is a visual system, not a headline over a background: the statement sits
     beside the live pool field, and the strip underneath carries the same protocol state
     the console shows. A first-time visitor sees the product working before they read a
     word about FHE. */
  function Hero({
    onEnter,
    narrow
  }) {
    const {
      Button,
      StrategyBadge,
      Icon
    } = V();
    return /*#__PURE__*/React.createElement("section", {
      className: "vs-field",
      style: {
        position: "relative",
        borderBottom: "1px solid var(--border-hairline)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        width: "100%",
        padding: narrow ? "40px 20px 48px" : "clamp(56px, 7vw, 96px) 40px clamp(48px, 6vw, 72px)",
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 1.02fr) minmax(0, 0.98fr)",
        gap: narrow ? 40 : "clamp(40px, 5vw, 72px)",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 28,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 22
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        alignSelf: "flex-start",
        padding: "5px 11px 5px 8px",
        borderRadius: "var(--r-pill)",
        border: "1px solid var(--border-hairline)",
        background: "var(--wash-neutral)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 5,
        height: 5,
        borderRadius: 1,
        background: "var(--teal-500)",
        animation: "vs-breathe 2.4s var(--ease-standard) infinite"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-micro",
      style: {
        color: "var(--text-secondary)",
        whiteSpace: "nowrap"
      }
    }, "Live on Sepolia \xB7 epoch 42 open")), /*#__PURE__*/React.createElement("h1", {
      className: "vs-display-0",
      style: {
        margin: 0,
        maxWidth: "15ch"
      }
    }, "Private money.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-verified)"
      }
    }, "Public"), " fairness."), /*#__PURE__*/React.createElement("p", {
      className: "vs-lead",
      style: {
        margin: 0,
        maxWidth: "46ch"
      }
    }, "Save cUSDT in one of sixteen slots. Your balance, weight and prize stay encrypted end to end \u2014 while the randomness and the winner proof stay open for anyone to check."))), /*#__PURE__*/React.createElement(VSReveal, {
      delay: 80
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      iconAfter: "arrow-right",
      onClick: onEnter
    }, "Open the console"), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "lg",
      icon: "shield-check"
    }, "See the evidence"))), /*#__PURE__*/React.createElement(VSReveal, {
      delay: 140
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        paddingTop: 2
      }
    }, /*#__PURE__*/React.createElement(StrategyBadge, {
      mode: "test"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "var(--type-body-sm)",
        color: "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "circle-dot",
      size: 12
    }), " No APY, no projections \u2014 prizes are donation-funded in this release.")))), /*#__PURE__*/React.createElement(VSReveal, {
      delay: 120,
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(PoolField, {
      compact: narrow
    }))), /*#__PURE__*/React.createElement(ProtocolStrip, {
      narrow: narrow
    }));
  }

  /* The live strip: the same four facts the console shows in its header, stated publicly.
     It is the seam between marketing site and product — and it is real protocol state,
     not a stat band. */
  function ProtocolStrip({
    narrow
  }) {
    const items = [["Epoch", "42", "opened MAR 3 · 09:00"], ["Eligibility freezes", "MAR 10", "09:00 UTC"], ["Slots taken", "12 / 16", "four open"], ["Last verified draw", "E41", "winner 0x8f21c4…04c7"]];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--border-hairline)",
        background: "color-mix(in oklab, var(--surface-brand) 70%, transparent)"
      }
    }, /*#__PURE__*/React.createElement("dl", {
      style: {
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: narrow ? "4px 20px" : "0 40px",
        display: "grid",
        gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 0
      }
    }, items.map(([k, v, meta], i) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        padding: narrow ? "16px 0" : "22px 28px 22px 0",
        borderLeft: i === 0 || narrow && i % 2 === 0 ? "none" : "1px solid var(--border-hairline)",
        paddingLeft: i === 0 || narrow && i % 2 === 0 ? 0 : narrow ? 16 : 28
      }
    }, /*#__PURE__*/React.createElement("dt", {
      className: "vs-micro"
    }, k), /*#__PURE__*/React.createElement("dd", {
      style: {
        margin: 0,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-num-4",
      style: {
        color: "var(--text-primary)"
      }
    }, v), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, meta))))));
  }
  Object.assign(window, {
    Hero,
    ProtocolStrip
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/PoolField.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* ── The pool field ───────────────────────────────────────────────────────────────
     The hero's visual system, and the product's whole thesis in one diagram:
  
       above the boundary   16 encrypted slots — masked values, one of them yours
       the boundary itself  a labelled hairline: ENCRYPTED above, PUBLIC below
       below the boundary   the evidence that prints as the epoch executes
  
     It runs the real lifecycle on a slow loop (open → frozen → requested → fulfilled →
     drawn → finalized). Nothing here is decorative: every cell is a slot, every row is a
     piece of evidence, and the one teal cell is the drawn slot. Under reduced motion it
     holds the finalized state instead of cycling. */

  const PHASES = [{
    id: "open",
    label: "Open",
    note: "Deposits accepted · amounts encrypted in the browser"
  }, {
    id: "frozen",
    label: "Eligibility frozen",
    note: "Weights sealed · they cannot change after this point"
  }, {
    id: "requested",
    label: "Randomness requested",
    note: "Chainlink VRF request published on-chain"
  }, {
    id: "fulfilled",
    label: "Randomness fulfilled",
    note: "Random word stored · nothing decrypted"
  }, {
    id: "drawn",
    label: "Encrypted draw",
    note: "Winner selected over encrypted weights"
  }, {
    id: "finalized",
    label: "Winner finalized",
    note: "Winner address public · prize amount still private"
  }];
  const EVIDENCE = [{
    k: "VRF REQUEST",
    v: "0x9f2c41a8b7e5d0c3",
    at: 2
  }, {
    k: "DRAW TX",
    v: "0x77a1cd0e4b8830fa19",
    at: 4
  }, {
    k: "WINNER PROOF",
    v: "0xd41c90aa7b6e5528",
    at: 5
  }];
  const MINE = 5;
  const DRAWN = 10;
  const FILLED = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 14, 15];
  function usePhase() {
    const reduced = React.useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
    const [i, setI] = React.useState(reduced ? 5 : 0);
    React.useEffect(() => {
      if (reduced) return;
      const t = setInterval(() => setI(n => (n + 1) % (PHASES.length + 1)), 2600);
      return () => clearInterval(t);
    }, [reduced]);
    return Math.min(i, PHASES.length - 1);
  }
  function Slot({
    index,
    phase,
    cell
  }) {
    const filled = FILLED.includes(index);
    const mine = index === MINE;
    const drawn = index === DRAWN && phase >= 4;
    const frozen = phase >= 1;
    const dim = phase >= 4 && !drawn;
    const border = drawn ? "var(--teal-500)" : mine ? "var(--slot-mine)" : filled ? "var(--slot-filled)" : "var(--slot-empty)";
    const bg = drawn ? "rgba(47,191,160,0.16)" : mine ? "var(--wash-private)" : filled ? "rgba(124,131,255,0.05)" : "transparent";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: cell,
        height: cell,
        borderRadius: "var(--r-sm)",
        border: `1px solid ${border}`,
        background: bg,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        opacity: dim ? 0.34 : 1,
        transition: "opacity var(--dur-epoch) var(--ease-mechanical), border-color var(--dur-epoch) var(--ease-mechanical), background var(--dur-epoch) var(--ease-mechanical)",
        boxShadow: drawn ? "var(--glow-verified)" : undefined,
        animation: drawn && phase === 4 ? "vs-halo var(--dur-epoch) var(--ease-standard) 2" : undefined
      }
    }, filled ? /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: drawn ? "var(--teal-300)" : "var(--periwinkle-400)",
        fontSize: 11,
        letterSpacing: "0.1em",
        animation: phase === 1 ? `vs-encrypt var(--dur-deliberate) var(--ease-standard) ${index % 4 * 60}ms both` : undefined
      }
    }, drawn && phase >= 5 ? "WON" : "••••") : null, mine && !drawn ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 3,
        height: 3,
        borderRadius: 1,
        background: "var(--periwinkle-400)"
      }
    }) : null, frozen && filled && !drawn ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        inset: 0,
        borderTop: "1px solid rgba(124,131,255,0.18)",
        animation: "vs-attest var(--dur-deliberate) var(--ease-mechanical) both"
      }
    }) : null);
  }
  function EpochAxis({
    phase
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 0
      }
    }, PHASES.map((p, i) => {
      const done = i < phase;
      const now = i === phase;
      const color = done ? "var(--teal-600)" : now ? "var(--periwinkle-500)" : "var(--border-subtle)";
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: p.id
      }, /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true",
        style: {
          width: now ? 8 : 6,
          height: now ? 8 : 6,
          flex: "none",
          borderRadius: "var(--r-xs)",
          background: done || now ? color : "transparent",
          border: done || now ? "none" : `1px solid ${color}`,
          boxShadow: now ? "0 0 0 4px var(--wash-private)" : undefined,
          transition: "all var(--dur-base) var(--ease-mechanical)"
        }
      }), i < PHASES.length - 1 ? /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true",
        style: {
          flex: 1,
          height: 1,
          background: i < phase ? "var(--teal-600)" : "var(--border-hairline)",
          transition: "background var(--dur-epoch) var(--ease-mechanical)"
        }
      }) : null);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        minHeight: 30
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label",
      style: {
        color: "var(--text-primary)",
        whiteSpace: "nowrap"
      }
    }, PHASES[phase].label), /*#__PURE__*/React.createElement("span", {
      className: "vs-body-sm",
      style: {
        color: "var(--text-muted)",
        minWidth: 0
      }
    }, PHASES[phase].note)));
  }
  function Boundary({
    phase
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-micro",
      style: {
        color: "var(--text-private)",
        whiteSpace: "nowrap"
      }
    }, "Encrypted"), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative",
        flex: 1,
        height: 1,
        background: "var(--border-hairline)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        inset: 0,
        width: "38%",
        background: "linear-gradient(90deg, transparent, var(--periwinkle-500), transparent)",
        animation: phase >= 1 && phase <= 4 ? "vs-scan 2.4s var(--ease-mechanical) infinite" : "none",
        opacity: phase >= 1 && phase <= 4 ? 1 : 0
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "vs-micro",
      style: {
        color: "var(--text-verified)",
        whiteSpace: "nowrap"
      }
    }, "Public"));
  }
  function PoolField({
    compact = false
  }) {
    const {
      Icon
    } = V();
    const phase = usePhase();
    const cell = compact ? 46 : 60;
    const gap = compact ? 8 : 10;
    return /*#__PURE__*/React.createElement("div", {
      className: "vs-panel",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: compact ? 18 : 22,
        padding: compact ? 20 : 26,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, var(--surface-brand), var(--surface-raised) 62%)"
      },
      role: "img",
      "aria-label": `VeilSave epoch lifecycle: ${PHASES[phase].label}. ${PHASES[phase].note}. Twelve of sixteen slots occupied, amounts encrypted.`
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "linear-gradient(to right, var(--field-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--field-grid) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        maskImage: "radial-gradient(90% 80% at 20% 10%, #000, transparent 76%)",
        WebkitMaskImage: "radial-gradient(90% 80% at 20% 10%, #000, transparent 76%)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label",
      style: {
        whiteSpace: "nowrap"
      }
    }, "Pool \xB7 epoch 42"), /*#__PURE__*/React.createElement("span", {
      className: "vs-num-3",
      style: {
        color: "var(--text-primary)",
        whiteSpace: "nowrap"
      }
    }, "12", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-faint)"
      }
    }, " / 16"), " ", /*#__PURE__*/React.createElement("span", {
      className: "vs-body-sm",
      style: {
        color: "var(--text-muted)"
      }
    }, "slots"))), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        font: "var(--type-micro)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: "var(--text-private)",
        border: "1px solid var(--border-private)",
        borderRadius: "var(--r-pill)",
        padding: "4px 9px",
        background: "var(--wash-private)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 11,
      strokeWidth: 1.9
    }), " Encrypted")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(4, ${cell}px)`,
        gap,
        justifyContent: "center"
      }
    }, Array.from({
      length: 16
    }, (_, i) => /*#__PURE__*/React.createElement(Slot, {
      key: i,
      index: i,
      phase: phase,
      cell: cell
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(Boundary, {
      phase: phase
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 7
      }
    }, EVIDENCE.map(e => {
      const on = phase >= e.at;
      return /*#__PURE__*/React.createElement("div", {
        key: e.k,
        style: {
          display: "grid",
          gridTemplateColumns: "14px 108px 1fr",
          alignItems: "center",
          gap: 10,
          opacity: on ? 1 : 0.28,
          transition: "opacity var(--dur-base) var(--ease-standard)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: "flex",
          color: on ? "var(--teal-400)" : "var(--text-faint)"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: on ? "check" : "circle-dot",
        size: 12,
        strokeWidth: 2
      })), /*#__PURE__*/React.createElement("span", {
        className: "vs-micro",
        style: {
          color: "var(--text-muted)"
        }
      }, e.k), /*#__PURE__*/React.createElement("span", {
        className: "vs-mono-sm",
        style: {
          color: on ? "var(--text-secondary)" : "var(--text-faint)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          animation: on ? "vs-attest var(--dur-deliberate) var(--ease-mechanical) both" : "none"
        }
      }, on ? e.v : "awaiting"));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 16,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(EpochAxis, {
      phase: phase
    })));
  }
  Object.assign(window, {
    PoolField
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/PoolField.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/SiteChrome.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Local media-query hook: the design system's own useIsNarrow is not exposed on the
     window namespace (lowercase export), so kits carry their own one-liner. */
  const vsNarrow = q => {
    const [n, setN] = React.useState(() => window.matchMedia(q).matches);
    React.useEffect(() => {
      const m = window.matchMedia(q),
        on = () => setN(m.matches);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    }, [q]);
    return n;
  };

  /* Enter-on-scroll. Visible-first: content renders shown, and only elements measured
     below the fold are pulled back and animated in. Nothing can be left hidden by a
     throttled observer, a print pass or a screenshot. Reduced motion is handled at the
     token layer, which collapses every duration to 1ms. */
  function VSReveal({
    children,
    delay = 0,
    style
  }) {
    const ref = React.useRef(null);
    const [on, setOn] = React.useState(true);
    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el || typeof IntersectionObserver !== "function") return;
      const r = el.getBoundingClientRect();
      if (r.top <= (window.innerHeight || 0) * 0.92) return;
      setOn(false);
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      }, {
        rootMargin: "0px 0px -6% 0px"
      });
      io.observe(el);
      const fallback = setTimeout(() => setOn(true), 4000);
      return () => {
        io.disconnect();
        clearTimeout(fallback);
      };
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      ref: ref,
      style: {
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(12px)",
        transition: `opacity var(--dur-slow) var(--ease-entrance) ${delay}ms, transform var(--dur-slow) var(--ease-entrance) ${delay}ms`,
        ...style
      }
    }, children);
  }
  function SiteHeader({
    onEnter
  }) {
    const {
      Wordmark,
      Button
    } = V();
    const narrow = vsNarrow("(max-width: 860px)");
    const [lifted, setLifted] = React.useState(false);
    React.useEffect(() => {
      const on = () => setLifted(window.scrollY > 8);
      window.addEventListener("scroll", on, {
        passive: true
      });
      return () => window.removeEventListener("scroll", on);
    }, []);
    const links = [["How it works", "#how"], ["The draw", "#draw"], ["Privacy", "#privacy"], ["FAQ", "#faq"]];
    return /*#__PURE__*/React.createElement("header", {
      style: {
        position: "sticky",
        top: 0,
        zIndex: "var(--z-nav)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: narrow ? "12px 20px" : "16px 40px",
        borderBottom: `1px solid ${lifted ? "var(--border-hairline)" : "transparent"}`,
        background: lifted ? "color-mix(in oklab, var(--surface-page) 84%, transparent)" : "transparent",
        backdropFilter: lifted ? "blur(12px)" : "none",
        transition: "background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)"
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: narrow ? 16 : 18
    }), !narrow ? /*#__PURE__*/React.createElement("nav", {
      style: {
        display: "flex",
        gap: 28
      }
    }, links.map(([l, h]) => /*#__PURE__*/React.createElement("a", {
      key: h,
      href: h,
      style: {
        font: "var(--type-body-sm)",
        color: "var(--text-muted)",
        textDecoration: "none"
      }
    }, l))) : null, /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: narrow ? "sm" : "md",
      iconAfter: "arrow-right",
      onClick: onEnter
    }, "Open console"));
  }

  /* Full-bleed band. Rhythm on this page comes from alternating surfaces and one field
     section per screenful — never from stacking cards. */
  function Band({
    id,
    tone = "page",
    field = false,
    children,
    pad = "lg",
    style
  }) {
    const bg = tone === "deep" ? "var(--surface-deep)" : tone === "brand" ? "var(--surface-brand)" : tone === "base" ? "var(--surface-base)" : "var(--surface-page)";
    const pads = {
      sm: "clamp(40px, 5vw, 56px)",
      lg: "clamp(56px, 8vw, 104px)",
      xl: "clamp(72px, 10vw, 132px)",
      none: "0"
    };
    return /*#__PURE__*/React.createElement("section", {
      id: id,
      className: field ? "vs-field" : undefined,
      style: {
        position: "relative",
        background: bg,
        borderTop: tone === "page" ? "1px solid var(--border-hairline)" : "1px solid var(--border-hairline)",
        paddingTop: pads[pad],
        paddingBottom: pads[pad],
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: "0 clamp(20px, 4vw, 40px)",
        position: "relative"
      }
    }, children));
  }

  /* Section opener: mono eyebrow, display statement, lead. The eyebrow is mono so the
     page's structural voice reads technical instead of uppercase-sans dashboard. */
  function BandHead({
    label,
    title,
    lead,
    aside,
    narrow
  }) {
    return /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow || !aside ? "1fr" : "minmax(0, 1.55fr) minmax(0, 1fr)",
        gap: narrow ? 20 : 56,
        alignItems: "end",
        marginBottom: narrow ? 32 : 44
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, label ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 18,
        height: 1,
        background: "var(--periwinkle-500)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-label",
      style: {
        color: "var(--text-private)"
      }
    }, label)) : null, title ? /*#__PURE__*/React.createElement("h2", {
      className: "vs-display-1",
      style: {
        margin: 0,
        maxWidth: "22ch"
      }
    }, title) : null), lead || aside ? /*#__PURE__*/React.createElement("p", {
      className: "vs-lead",
      style: {
        margin: 0,
        maxWidth: aside ? "42ch" : "58ch"
      }
    }, aside || lead) : null));
  }
  function SiteFooter({
    onEnter
  }) {
    const {
      Wordmark,
      Button,
      StrategyBadge
    } = V();
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        borderTop: "1px solid var(--border-hairline)",
        background: "var(--surface-brand)",
        position: "relative",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: "clamp(48px, 7vw, 80px) clamp(20px, 4vw, 40px) 40px",
        display: "flex",
        flexDirection: "column",
        gap: 44,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 32,
        alignItems: "flex-end",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("h2", {
      className: "vs-display-2",
      style: {
        margin: 0,
        maxWidth: "20ch"
      }
    }, "Take a slot while epoch 42 is open."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "lg",
      iconAfter: "arrow-right",
      onClick: onEnter
    }, "Open console"), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "lg",
      icon: "external-link"
    }, "Contracts"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: "44ch"
      }
    }, /*#__PURE__*/React.createElement(Wordmark, {
      size: 17
    }), /*#__PURE__*/React.createElement("p", {
      className: "vs-body-sm",
      style: {
        margin: 0
      }
    }, "Confidential prize-linked savings. Sixteen slots, one weekly draw, encrypted balances, public verification.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14,
        flexWrap: "wrap",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(StrategyBadge, {
      mode: "test",
      withHint: false
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, "SEPOLIA TESTNET \xB7 MVP")))));
  }
  Object.assign(window, {
    VSReveal,
    SiteHeader,
    Band,
    BandHead,
    SiteFooter,
    vsNarrow
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/SiteChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/site/Story.jsx
try { (() => {
(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* ── 1 · The tension ──────────────────────────────────────────────────────────────
     The product's core idea as an interaction: reveal a private value on the left and
     watch the public column stay exactly the same. The boundary is a real line on the
     page, and crossing it is something the visitor does, not something they read. */
  function Tension({
    narrow
  }) {
    const {
      ConfidentialValue,
      EvidenceRow,
      Icon,
      Button
    } = V();
    const [state, setState] = React.useState("masked");
    React.useEffect(() => {
      if (state === "revealing") {
        const t = setTimeout(() => setState("revealed"), 1200);
        return () => clearTimeout(t);
      }
    }, [state]);
    const revealed = state === "revealed";
    return /*#__PURE__*/React.createElement(Band, {
      id: "tension",
      tone: "deep",
      pad: "lg"
    }, /*#__PURE__*/React.createElement(BandHead, {
      narrow: narrow,
      label: "The boundary",
      title: "Your numbers stay yours. The draw stays checkable.",
      aside: "Confidential finance usually asks you to trust an operator. VeilSave splits the problem instead: values are encrypted, execution is public. VSReveal the balance below \u2014 nothing on the public side moves."
    }), /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0,1fr) 1px minmax(0,1fr)",
        gap: narrow ? 0 : 40
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "vs-panel",
      style: {
        padding: narrow ? 20 : 28,
        background: "linear-gradient(180deg, rgba(124,131,255,0.07), transparent 58%), var(--surface-raised)",
        borderColor: "var(--border-private)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        font: "var(--type-label)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: "var(--text-private)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13,
      strokeWidth: 1.9
    }), " Encrypted"), /*#__PURE__*/React.createElement("span", {
      className: "vs-micro"
    }, "only you can decrypt")), /*#__PURE__*/React.createElement(ConfidentialValue, {
      size: "xl",
      state: state,
      value: "1,284.720000",
      onReveal: () => setState("revealing"),
      onHide: () => setState("masked")
    }), /*#__PURE__*/React.createElement("ul", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 9,
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 18
      }
    }, ["Savings amount", "Eligible and pending weight", "Withdrawal amount", "Prize amount"].map(t => /*#__PURE__*/React.createElement("li", {
      key: t,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        font: "var(--type-body-sm)",
        color: "var(--text-secondary)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        display: "inline-flex",
        gap: 2
      }
    }, "•••".split("").map((d, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        color: "var(--periwinkle-500)",
        fontSize: 9
      }
    }, d))), t))))), !narrow ? /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      style: {
        position: "relative",
        background: "linear-gradient(180deg, transparent, var(--border-subtle) 18%, var(--border-subtle) 82%, transparent)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 30,
        height: 30,
        borderRadius: "var(--r-pill)",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-deep)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-faint)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "scan-line",
      size: 13
    }))) : null, /*#__PURE__*/React.createElement("div", {
      className: "vs-panel",
      style: {
        padding: narrow ? 20 : 28,
        marginTop: narrow ? 16 : 0,
        background: "linear-gradient(180deg, rgba(47,191,160,0.07), transparent 58%), var(--surface-raised)",
        borderColor: "var(--border-verified)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        font: "var(--type-label)",
        letterSpacing: "var(--tr-label)",
        textTransform: "uppercase",
        color: "var(--text-verified)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "eye",
      size: 13,
      strokeWidth: 1.9
    }), " Public"), /*#__PURE__*/React.createElement("span", {
      className: "vs-micro"
    }, "anyone can check")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "VRF request",
      value: "0x9f2c41a8b7e5d0c3",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Draw tx",
      value: "0x77a1cd0e4b8830fa19",
      verified: true,
      href: "#"
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner proof",
      value: "0xd41c90aa7b6e5528",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner address",
      value: "0x8f21c4b70a5519d3ff9a4004c7",
      kind: "address",
      verified: true,
      href: "#"
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        margin: 0,
        font: "var(--type-body-sm)",
        color: revealed ? "var(--text-verified)" : "var(--text-muted)",
        transition: "color var(--dur-base) var(--ease-standard)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: revealed ? "check" : "circle-dot",
      size: 13,
      style: {
        marginTop: 3,
        flex: "none"
      }
    }), revealed ? "You just decrypted a balance locally. This column did not change — and it never contained your amount." : "Slot occupancy, epoch timing, randomness and the winner address live here. Amounts never do."))))));
  }

  /* ── 2 · How it works — a stepped rail, not four paragraphs ──────────────────── */
  const STEPS = [{
    n: "01",
    t: "Save privately",
    d: "Your amount is encrypted in your browser, then deposited into one of sixteen public slots. The pool accounts in ciphertext and never learns the number."
  }, {
    n: "02",
    t: "Earn eligibility",
    d: "A deposit made while an epoch is open first participates in the next one. Weights freeze before the draw and cannot change afterwards."
  }, {
    n: "03",
    t: "Verify the draw",
    d: "Chainlink randomness is requested publicly, then a separate transaction selects the winner over encrypted weights."
  }, {
    n: "04",
    t: "VSReveal only yours",
    d: "The winner address becomes public. The prize amount is decrypted locally, by the winner, in one explicit gesture — or not at all."
  }];
  function StepFigure({
    i
  }) {
    const {
      Icon
    } = V();
    const box = {
      height: 62,
      display: "flex",
      alignItems: "center",
      gap: 8
    };
    if (i === 0) return /*#__PURE__*/React.createElement("div", {
      style: box
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 8px",
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--border-private)",
        background: "var(--wash-private)",
        color: "var(--periwinkle-400)",
        font: "var(--type-mono-sm)"
      }
    }, "\u2022\u2022\u2022\u2022\u2022\u2022"), /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 13,
      style: {
        color: "var(--text-faint)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 9px)",
        gap: 3
      }
    }, Array.from({
      length: 16
    }, (_, k) => /*#__PURE__*/React.createElement("span", {
      key: k,
      style: {
        width: 9,
        height: 9,
        borderRadius: 1,
        border: `1px solid ${k === 5 ? "var(--slot-mine)" : "var(--slot-empty)"}`,
        background: k === 5 ? "var(--wash-private)" : "transparent"
      }
    }))));
    if (i === 1) return /*#__PURE__*/React.createElement("div", {
      style: {
        ...box,
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        gap: 7
      }
    }, [["E42 pending", "var(--amber-500)", "38%"], ["E43 eligible", "var(--periwinkle-500)", "100%"]].map(([l, c, w]) => /*#__PURE__*/React.createElement("span", {
      key: l,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)",
        width: 74
      }
    }, l), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 3,
        background: "var(--slot-empty)",
        borderRadius: 2,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        height: "100%",
        width: w,
        background: c,
        borderRadius: 2
      }
    })))));
    if (i === 2) return /*#__PURE__*/React.createElement("div", {
      style: {
        ...box,
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 6
      }
    }, ["VRF REQUEST", "DRAW TX", "WINNER PROOF"].map(l => /*#__PURE__*/React.createElement("span", {
      key: l,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 11,
      strokeWidth: 2.2,
      style: {
        color: "var(--teal-400)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--text-faint)"
      }
    }, l))));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...box,
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--periwinkle-400)",
        font: "var(--type-num-4)",
        letterSpacing: "0.14em"
      }
    }, "\u2022\u2022\u2022\u2022\u2022\u2022"), /*#__PURE__*/React.createElement(Icon, {
      name: "key-round",
      size: 13,
      style: {
        color: "var(--text-faint)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "vs-num-4",
      style: {
        color: "var(--teal-300)"
      }
    }, "96.40"));
  }
  function HowItWorks({
    narrow
  }) {
    return /*#__PURE__*/React.createElement(Band, {
      id: "how",
      tone: "page",
      pad: "lg"
    }, /*#__PURE__*/React.createElement(BandHead, {
      narrow: narrow,
      label: "How it works",
      title: "Four steps. No ceremony.",
      aside: "The protocol is asynchronous, so the interface always says what is waiting on you and what is waiting on the chain."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "repeat(4, 1fr)",
        gap: narrow ? 0 : 1,
        background: narrow ? "transparent" : "var(--border-hairline)"
      }
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement(VSReveal, {
      key: s.n,
      delay: i * 70
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
        padding: narrow ? "22px 0" : "0 clamp(18px, 2vw, 26px)",
        background: "var(--surface-page)",
        borderTop: narrow ? "1px solid var(--border-hairline)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-mono-sm",
      style: {
        color: "var(--periwinkle-400)"
      }
    }, s.n), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        flex: 1,
        height: 1,
        background: "var(--border-hairline)"
      }
    })), /*#__PURE__*/React.createElement(StepFigure, {
      i: i
    }), /*#__PURE__*/React.createElement("h3", {
      className: "vs-title-2",
      style: {
        margin: 0
      }
    }, s.t), /*#__PURE__*/React.createElement("p", {
      className: "vs-body-sm",
      style: {
        margin: 0
      }
    }, s.d))))), /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: 24,
        marginTop: narrow ? 32 : 56,
        paddingTop: 28,
        borderTop: "1px solid var(--border-hairline)"
      }
    }, [["16", "public slots, fixed"], ["1", "prize per weekly epoch"], ["0", "prize tiers or rerolls"], ["FIFO", "withdrawal settlement"]].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-num-2"
    }, v), /*#__PURE__*/React.createElement("span", {
      className: "vs-micro"
    }, l))))));
  }

  /* ── 3 · The draw ─────────────────────────────────────────────────────────────── */
  function DrawStory({
    narrow
  }) {
    const {
      EpochTimeline,
      ProofBlock,
      EvidenceRow,
      Button,
      SlotGrid
    } = V();
    return /*#__PURE__*/React.createElement(Band, {
      id: "draw",
      tone: "brand",
      field: true,
      pad: "lg"
    }, /*#__PURE__*/React.createElement(BandHead, {
      narrow: narrow,
      label: "The draw, in public",
      title: "Verifiable randomness. Invisible balances.",
      aside: "Each epoch leaves an evidence trail in protocol order. Savers read the verdict; anyone who wants the machine values can expand them."
    }), /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement("div", {
      className: "vs-panel-quiet",
      style: {
        padding: narrow ? "20px" : "28px 32px",
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement(EpochTimeline, {
      orientation: narrow ? "vertical" : "horizontal",
      steps: [{
        label: "Open",
        state: "done",
        meta: "WEEKLY"
      }, {
        label: "Eligibility frozen",
        state: "done",
        meta: "SNAPSHOT"
      }, {
        label: "Randomness requested",
        state: "done",
        meta: "CHAINLINK VRF"
      }, {
        label: "Randomness fulfilled",
        state: "done",
        meta: "WORD STORED"
      }, {
        label: "Encrypted draw",
        state: "active",
        meta: "FHE EXECUTION",
        detail: "The winner is selected over encrypted weights. No balance is decrypted to do it."
      }, {
        label: "Winner finalized",
        state: "future",
        meta: "96-BLOCK DELAY"
      }]
    }))), /*#__PURE__*/React.createElement(VSReveal, {
      delay: 80
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.35fr) minmax(0,1fr)",
        gap: narrow ? 24 : 40,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement(ProofBlock, {
      title: "Epoch 41 \xB7 winner proof",
      verdict: "verified",
      summary: "Authenticated public decryption of the winner address only.",
      footnote: "Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances."
    }, /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "VRF request id",
      value: "0x9f2c41a8b7e5d0c3",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Draw tx",
      value: "0x77a1cd0e4b8830fa19",
      href: "#",
      verified: true
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner handle",
      value: "0x7ab34e91c05f",
      kind: "handle",
      verified: true,
      note: "Ciphertext reference \u2014 not an amount."
    }), /*#__PURE__*/React.createElement(EvidenceRow, {
      label: "Winner address",
      value: "0x8f21c4b70a5519d3ff9a4004c7",
      kind: "address",
      href: "#",
      verified: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "vs-panel",
      style: {
        padding: narrow ? 20 : 24,
        display: "flex",
        flexDirection: "column",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "vs-label"
    }, "Slots at freeze \xB7 E41"), /*#__PURE__*/React.createElement(SlotGrid, {
      size: "lg",
      legend: true,
      slots: ["filled", "filled", "filled", "empty", "filled", "filled", "empty", "filled", "filled", "empty", "drawn", "filled", "empty", "empty", "filled", "filled"]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderTop: "1px solid var(--border-hairline)",
        paddingTop: 18
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "vs-title-3",
      style: {
        margin: 0
      }
    }, "What we cannot prove"), /*#__PURE__*/React.createElement("p", {
      className: "vs-body-sm",
      style: {
        margin: 0
      }
    }, "Odds are a function of encrypted weights, so no observer can recompute them \u2014 and neither can we. Verification covers the randomness and the authenticated execution trail, not the plaintext arithmetic."), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "sm",
      iconAfter: "arrow-right"
    }, "Browse every draw"))))));
  }

  /* ── 4 · Privacy boundary ─────────────────────────────────────────────────────── */
  function PrivacyStory({
    narrow
  }) {
    const {
      PrivacyCallout,
      StateBlock
    } = V();
    return /*#__PURE__*/React.createElement(Band, {
      id: "privacy",
      tone: "page",
      pad: "lg"
    }, /*#__PURE__*/React.createElement(BandHead, {
      narrow: narrow,
      label: "Privacy boundary",
      title: "Encrypted where it matters. Public where it counts.",
      aside: "We would rather state the limits than imply more. VeilSave does not offer anonymity, and no operator can decrypt on your behalf."
    }), /*#__PURE__*/React.createElement(VSReveal, null, /*#__PURE__*/React.createElement(PrivacyCallout, null)), /*#__PURE__*/React.createElement(VSReveal, {
      delay: 70
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)",
        gap: 16,
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement(StateBlock, {
      compact: true,
      kind: "paused",
      title: "Reveals are session-only"
    }, "Decrypted values live in the tab you revealed them in. Nothing is written to storage, logs, URLs or notifications."), /*#__PURE__*/React.createElement(StateBlock, {
      compact: true,
      kind: "terminal",
      title: "No trusted operator"
    }, "There is no backend that can decrypt for you and no automatic reveal. The winner decrypts locally or not at all."), /*#__PURE__*/React.createElement(StateBlock, {
      compact: true,
      kind: "waiting",
      title: "Asynchronous by design"
    }, "Access-control propagation and proof authentication take real time. The console explains each wait instead of spinning."))));
  }

  /* ── 5 · FAQ ──────────────────────────────────────────────────────────────────── */
  const FAQS = [["Is my balance really hidden?", "Your savings amount, eligible weight, withdrawal amount and prize amount are encrypted. Your wallet address, your transaction timing, slot occupancy and the winner address are public. VeilSave does not offer anonymity, and we will not claim it."], ["Can anyone prove the draw was fair?", "Anyone can verify the freeze timing, the request-id binding, the Chainlink fulfilment, the separate encrypted draw, the authenticated decryption proof and the final winner. Because weights stay encrypted, nobody — including us — can recompute the weighted result from plaintext balances. That limit is part of the design, and we state it on every draw."], ["Where does the prize come from?", "In this release, from donations into a deterministic vault labelled TEST YIELD. There is no organic strategy return, no APY and no projection. A live strategy adapter can only replace it through the frozen governance process."], ["How fast can I withdraw?", "Immediate settlement is attempted first. If confidential liquidity is short, the encrypted remainder joins a strict request-time queue with one active ticket per slot. Partial funding advances earlier claims and leaves your remainder in place."], ["What if the draw fails?", "A randomness timeout is terminal for that frozen epoch — no reroll, no substitute winner. A failed encrypted draw can be retried with the same frozen inputs and the same stored random word."], ["Who can decrypt my prize?", "Only the winning wallet, after access-control propagation, in its own browser. There is no trusted operator and no automatic decryption."]];
  function Faq({
    narrow
  }) {
    const {
      Icon
    } = V();
    const [open, setOpen] = React.useState(0);
    return /*#__PURE__*/React.createElement(Band, {
      id: "faq",
      tone: "deep",
      pad: "lg"
    }, /*#__PURE__*/React.createElement(BandHead, {
      narrow: narrow,
      label: "Questions",
      title: "Answered honestly."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "minmax(0, 760px)",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column"
      }
    }, FAQS.map(([q, a], i) => {
      const on = open === i;
      return /*#__PURE__*/React.createElement("div", {
        key: q,
        style: {
          borderTop: "1px solid var(--border-hairline)"
        }
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => setOpen(on ? -1 : i),
        "aria-expanded": on,
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          width: "100%",
          minHeight: 58,
          padding: "18px 0",
          background: "none",
          border: 0,
          cursor: "pointer",
          textAlign: "left",
          color: "var(--text-primary)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "vs-title-3",
        style: {
          fontWeight: on ? 600 : 500
        }
      }, q), /*#__PURE__*/React.createElement(Icon, {
        name: on ? "minus" : "plus",
        size: 15,
        style: {
          color: on ? "var(--text-private)" : "var(--text-muted)",
          flex: "none"
        }
      })), on ? /*#__PURE__*/React.createElement("p", {
        className: "vs-body",
        style: {
          margin: 0,
          paddingBottom: 24,
          maxWidth: "66ch",
          color: "var(--text-secondary)",
          animation: "vs-settle var(--dur-base) var(--ease-entrance)"
        }
      }, a) : null);
    }))));
  }
  Object.assign(window, {
    Tension,
    HowItWorks,
    DrawStory,
    PrivacyStory,
    Faq
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/site/Story.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ConfidentialValue = __ds_scope.ConfidentialValue;

__ds_ns.FinancialMetric = __ds_scope.FinancialMetric;

__ds_ns.PrivacyCallout = __ds_scope.PrivacyCallout;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.ProgressTrack = __ds_scope.ProgressTrack;

__ds_ns.SectionHead = __ds_scope.SectionHead;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.RecoveryBanner = __ds_scope.RecoveryBanner;

__ds_ns.StateBlock = __ds_scope.StateBlock;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.AmountField = __ds_scope.AmountField;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.ActivityItem = __ds_scope.ActivityItem;

__ds_ns.VS_NODE = __ds_scope.VS_NODE;

__ds_ns.EpochTimeline = __ds_scope.EpochTimeline;

__ds_ns.EpochNodeLegend = __ds_scope.EpochNodeLegend;

__ds_ns.EvidenceRow = __ds_scope.EvidenceRow;

__ds_ns.ProofBlock = __ds_scope.ProofBlock;

__ds_ns.QueueItem = __ds_scope.QueueItem;

__ds_ns.ResultState = __ds_scope.ResultState;

__ds_ns.SlotGrid = __ds_scope.SlotGrid;

__ds_ns.StatusStepper = __ds_scope.StatusStepper;

__ds_ns.TicketPanel = __ds_scope.TicketPanel;

__ds_ns.ConsoleNav = __ds_scope.ConsoleNav;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.StrategyBadge = __ds_scope.StrategyBadge;

__ds_ns.WalletControl = __ds_scope.WalletControl;

__ds_ns.Wordmark = __ds_scope.Wordmark;

})();
