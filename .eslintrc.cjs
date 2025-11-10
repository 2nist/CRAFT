module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:tailwindcss/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'tailwindcss'],
  settings: {
    react: {
      version: 'detect',
    },
    tailwindcss: {
      callees: ['cn', 'cva'],
    },
  },
  rules: {
    // project-level adjustments
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-custom-classname': 'warn',
    // Enforce design system tokens - prevent hard-coded color classes
    'no-restricted-syntax': [
      'error',
      {
        'selector': 'Literal[value=/(bg|text|border|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]',
        'message': 'Do not use hard-coded Tailwind color classes. Use design tokens: accent, success, danger, info, brown, olive, sand, slateish, tea, eggshell.'
      }
    ]
  },
};
