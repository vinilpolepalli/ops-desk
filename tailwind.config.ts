import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent: deep gold. Chosen for a brass/ledger read that suits an operations desk.
        // It is clearly gold-olive, distinct from the sibling bronze #b45309 (orange-brown) and
        // olive #4d7c0f (green), and sits well away from the indigo/violet band. Used sparingly
        // (primary buttons, active chips, focus ring); there are no amber-50 fills anywhere.
        gold: { DEFAULT: '#a16207', hover: '#854d0e' },
        ink: '#1c1917',
        sunk: '#f3f3f1',
        muted: '#6b665f',
        hair: '#e7e5e0',
        ground: '#fcfcfa',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { btn: '8px', card: '10px' },
    },
  },
  plugins: [],
} satisfies Config;
