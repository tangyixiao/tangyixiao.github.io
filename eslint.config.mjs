// ESLint 扁平配置：规则从推荐集起步，刻意不引入格式类规则（全库格式化另行用 Prettier，见 .prettierrc）。
// 范围：src TS/TSX、根目录脚本、scripts/*.mjs、tests/*.mjs|*.cjs。dist/public 等产物目录一律忽略。
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'assets/**',
      'docs/**',
      'blog-src/**',
      'tests/shots/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TS 编译器（含 strict）已覆盖未定义全局/未声明变量的检查，no-undef 在 TS 文件里只会误报 DOM 全局。
      'no-undef': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Node 环境脚本（构建脚本与测试脚本）需要的手工 globals，避免额外依赖 globals 包。
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', 'tests/**/*.cjs', '*.mjs', '*.cjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        structuredClone: 'readonly',
        crypto: 'readonly',
      },
    },
  },
  {
    // 根目录浏览器端脚本（auth.js 由 login/register/notes.html 直接 <script> 引入）。
    files: ['*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        crypto: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        TextEncoder: 'readonly',
        Event: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    // Cloudflare Worker 入口：运行时全局与浏览器不同（Response/Request、顶层 addEventListener 等）。
    files: ['notes-worker.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        addEventListener: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
  },
  {
    // Playwright 测试脚本：Node 里启动浏览器、页面上下文里跑浏览器全局，
    // 全局清单既长又随用随加，统一关闭 no-undef（真实拼写错误由运行时暴露）。
    files: ['tests/**/*.cjs', 'tests/**/*.mjs'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // .cjs 按设计就是 CommonJS，require 是正常用法。
    files: ['tests/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
