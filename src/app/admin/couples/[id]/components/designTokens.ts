/* ══════════════════════════════════════════════════════════
   StudioFlow Design Tokens — Couple Detail Page
   Base: Teal accent + Warm beige neutrals
   ══════════════════════════════════════════════════════════ */

export const colors = {
  primary: {
    50:  '#f0f9f6',
    100: '#d4ece5',
    200: '#9fd4c6',
    500: '#3a9a88',
    700: '#267366',
    900: '#184d44',
  },
  neutral: {
    50:  '#faf8f6',
    100: '#f0eeeb',
    200: '#e0dcd7',
    300: '#c8c2ba',
    500: '#8a837a',
    700: '#4d4740',
    900: '#2a2622',
  },
  success: {
    50:  '#f2f8f2',
    100: '#dfeedc',
    500: '#5a9964',
    700: '#3d7344',
  },
  warning: {
    50:  '#fdf6ee',
    100: '#f9e8d0',
    500: '#c0862d',
    700: '#946520',
  },
} as const;

export const T = {
  /* Text */
  text:          colors.neutral[900],
  textSecondary: colors.neutral[500],
  textMuted:     colors.neutral[300],
  accent:        colors.primary[500],
  accentDark:    colors.primary[700],
  accentLight:   colors.primary[50],

  /* Backgrounds */
  pageBg:    colors.neutral[50],
  cardBg:    '#ffffff',
  cardBgAlt: colors.neutral[100],
  rowAlt:    colors.neutral[50],

  /* Borders */
  border:      colors.neutral[200],
  borderLight: colors.neutral[100],

  /* Semantic */
  successBg:     colors.success[50],
  successBorder: colors.success[100],
  successText:   colors.success[700],
  warningBg:     colors.warning[50],
  warningBorder: colors.warning[100],
  warningText:   colors.warning[700],
} as const;

/* ── Shared style fragments ─────────────────────────────── */

export const sectionLabel: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: T.textSecondary,
};

export const fieldLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  color: T.textSecondary,
};

export const card: React.CSSProperties = {
  background: T.cardBg,
  border: `1px solid ${T.border}`,
  borderRadius: '16px',
  padding: '1.5rem 1.75rem',
  marginBottom: '1.25rem',
};

export const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.1875rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.02em',
};

export const badge = {
  default: { bg: colors.neutral[100], fg: colors.neutral[700], bd: colors.neutral[200] },
  accent:  { bg: colors.primary[50],  fg: colors.primary[700],  bd: colors.primary[100] },
  success: { bg: colors.success[50],  fg: colors.success[700],  bd: colors.success[100] },
  warning: { bg: colors.warning[50],  fg: colors.warning[700],  bd: colors.warning[100] },
} as const;

export const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
