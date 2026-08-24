Lucide outline glyph — the only icon system VeilSave uses.

```jsx
<Icon name="shield-check" size={16} />
<Icon name="lock" size={12} label="Encrypted" />
```

Names match the files in `assets/icons/`. Omit `label` for decorative glyphs; pass it whenever the glyph is the only carrier of meaning. Stroke stays 1.5 (1.8–2 only below 13px).