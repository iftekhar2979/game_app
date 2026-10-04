/**
 * Semantic colour tokens for the two appearances.
 *
 * Screens name the *role* a colour plays - `surface`, `textSecondary`,
 * `border` - rather than the colour itself, so a screen written once renders
 * correctly in both appearances.
 *
 * The light palette is not the dark one inverted. Two places where a
 * mechanical inversion would have been wrong:
 *
 *   - `gold` is the brand's accent for small text and icons. At #FFB444 it sits
 *     at roughly 1.9:1 against white, which is unreadable, so light mode uses a
 *     deepened gold that keeps the brand reading while clearing 4.5:1.
 *   - Surfaces in dark mode are separated by *lifting* them (black -> #140A24).
 *     On white there is nothing above white to lift to, so the light palette
 *     separates them by tinting downwards instead, and leans on `border` more
 *     heavily than dark mode does.
 */

export interface ThemeTokens {
  /** The window behind everything. */
  background: string;
  /** Cards, sheets, rows sitting on `background`. */
  surface: string;
  /** A surface that needs to read as raised above `surface` (modals, popovers). */
  surfaceElevated: string;
  /** Input fields and other sunken/among-content containers. */
  surfaceSunken: string;

  /** Body copy and headings. */
  textPrimary: string;
  /** Supporting copy, timestamps, captions. */
  textSecondary: string;
  /** Placeholders and disabled labels. */
  textMuted: string;

  /** Hairlines and container outlines. */
  border: string;
  /** A border that should be visible rather than subtle (focus, selection). */
  borderStrong: string;

  /** The brand purple, used for primary actions. */
  accent: string;
  /** Text/icons placed on top of `accent`. */
  onAccent: string;
  /** The brand gold, used for links, highlights and secondary emphasis. */
  gold: string;

  /** Destructive actions. */
  danger: string;
  /** Text/icons placed on top of `danger`. */
  onDanger: string;

  /** Scrims behind modals. */
  overlay: string;
  /** `barStyle` for the status bar under this appearance. */
  statusBar: 'light-content' | 'dark-content';
}

export const darkTokens: ThemeTokens = {
  background: '#000000',
  surface: '#0E0618',
  surfaceElevated: '#140A24',
  surfaceSunken: '#1A0B2E',

  textPrimary: '#FFFFFF',
  textSecondary: '#A79BB8',
  textMuted: '#7A5AA0',

  border: '#3A144E',
  borderStrong: '#5B1F7D',

  accent: '#8B3DFF',
  onAccent: '#FFFFFF',
  gold: '#FFB444',

  danger: '#D32F2F',
  onDanger: '#FFFFFF',

  overlay: 'rgba(0,0,0,0.8)',
  statusBar: 'light-content',
};

export const lightTokens: ThemeTokens = {
  background: '#FFFFFF',
  surface: '#F6F2FB',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#EFE8F7',

  textPrimary: '#150920',
  textSecondary: '#5C5169',
  textMuted: '#8B8095',

  border: '#E4D9F0',
  borderStrong: '#C3AEDC',

  // Deepened from #8B3DFF: the brand purple is a fill colour in dark mode, but
  // on white it also has to carry button and link *text*.
  accent: '#7126D6',
  onAccent: '#FFFFFF',
  // See the note above - #FFB444 is unreadable on white.
  gold: '#9A6308',

  danger: '#C62828',
  onDanger: '#FFFFFF',

  overlay: 'rgba(20,10,36,0.45)',
  statusBar: 'dark-content',
};
