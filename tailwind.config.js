/** Tailwind theme: every colour is a CSS variable set per theme ([data-mode]), so opacity modifiers work. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // Theme tokens — every value is an RGB triplet on the [data-mode] wrapper, so opacity modifiers work
        canvas:   'rgb(var(--canvas) / <alpha-value>)',
        surface:  'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        track:    'rgb(var(--track) / <alpha-value>)',
        ink:      'rgb(var(--ink) / <alpha-value>)',
        'ink-2':  'rgb(var(--ink-2) / <alpha-value>)',
        'ink-3':  'rgb(var(--ink-3) / <alpha-value>)',
        'ink-4':  'rgb(var(--ink-4) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        scrim:    'rgb(var(--scrim) / <alpha-value>)',
        line:     'var(--line)', 'line-2': 'var(--line-2)', 'line-3': 'var(--line-3)',
        good: 'rgb(var(--good) / <alpha-value>)', warn: 'rgb(var(--warn) / <alpha-value>)', info: 'rgb(var(--info) / <alpha-value>)', bad: 'rgb(var(--bad) / <alpha-value>)',
        owner: 'rgb(var(--owner) / <alpha-value>)', hr: 'rgb(var(--hr) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)', solid: 'rgb(var(--solid) / <alpha-value>)', wash: 'rgb(var(--wash) / <alpha-value>)',
      },
      fontFamily: { sans: ['var(--font-ui)', 'system-ui', 'sans-serif'], grotesk: ['"Space Grotesk"', 'system-ui', 'sans-serif'] },
      // Corner radius follows the design token --r (1 = default)
      borderRadius: { sm: 'calc(0.125rem * var(--r, 1))', DEFAULT: 'calc(0.25rem * var(--r, 1))', md: 'calc(0.375rem * var(--r, 1))', lg: 'calc(0.5rem * var(--r, 1))', xl: 'calc(0.75rem * var(--r, 1))', '2xl': 'calc(1rem * var(--r, 1))', '3xl': 'calc(1.5rem * var(--r, 1))' },
      boxShadow: { card: 'var(--shadow-card)', float: 'var(--shadow-float)' },
    },
  },
};
