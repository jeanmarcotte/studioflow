/* ══════════════════════════════════════════════════════════
   StudioFlow Design Tokens — Couple Detail Page
   Base: TEAL-DOMINANT — every surface teal-tinted
   ══════════════════════════════════════════════════════════ */

export const colors = {
  primary: {
    50:  '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    500: '#14b8a6',
    700: '#0f766e',
    900: '#134e4a',
  },
  neutral: {
    50:  '#f0fdfa',
    100: '#e6f5f2',
    200: '#b2dfdb',
    300: '#80cbc4',
    500: '#4a8c85',
    700: '#2c5e58',
    900: '#1a3a38',
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
  pageBg:    colors.primary[50],
  cardBg:    '#f0fdfa',
  cardBgAlt: '#e0f2f1',
  rowAlt:    '#e6f7f4',

  /* Borders */
  border:      '#b2dfdb',
  borderLight: '#ccfbf1',

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
  fontSize: '0.875rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#ffffff',
  background: colors.primary[700],
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  display: 'inline-block',
};

export const fieldLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  color: colors.primary[700],
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
  default: { bg: colors.primary[100], fg: colors.primary[900], bd: colors.primary[200] },
  accent:  { bg: colors.primary[200], fg: colors.primary[900], bd: '#5eead4' },
  success: { bg: colors.success[50],  fg: colors.success[700],  bd: colors.success[100] },
  warning: { bg: colors.warning[50],  fg: colors.warning[700],  bd: colors.warning[100] },
} as const;

export const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
