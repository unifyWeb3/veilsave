# UI kit — VeilSave homepage (`/`, `/privacy`)

The public surface. Same design language as the console, different pacing: one idea per screenful, evidence before persuasion.

| File | What it is |
| --- | --- |
| `index.html` | Page composition; **Open console** links to `../console/index.html` |
| `SiteChrome.jsx` | Sticky header, ruled `SiteSection`, footer, and the `Reveal` enter-on-scroll pattern |
| `Hero.jsx` | Statement, live pool strip, and an interactive masked value — the visitor performs the core gesture before connecting anything |
| `Story.jsx` | How it works (4 steps + frozen facts), the draw in public (timeline + proof block + what we cannot prove), the privacy boundary, and the FAQ |

Narrative order: statement → how it works → the draw and its evidence → the privacy boundary → questions → console entry. The `/privacy` route content lives in `PrivacyStory`, built from the `PrivacyCallout` primitive so the boundary copy is identical everywhere it appears.
