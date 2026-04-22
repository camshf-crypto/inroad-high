/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 파랑 (고등/B2B/어드민)
        brand: {
          primary: '#2563EB',
          'primary-hover': '#1D4ED8',
          'primary-dark': '#1E3A8A',
          'primary-light': '#DBEAFE',
          'primary-bg': '#EFF6FF',
          'gradient-start': '#1E40AF',
          'gradient-end': '#3B82F6',
        },
        // 🔵 고등 (파랑) - brand-middle과 동일 구조로 추가!
        'brand-high': {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          dark: '#1E3A8A',
          light: '#93C5FD',
          bg: '#DBEAFE',
          pale: '#EFF6FF',
        },
        // 🟢 중등 (초록)
        'brand-middle': {
          DEFAULT: '#10B981',
          hover: '#059669',
          dark: '#047857',
          light: '#A7F3D0',
          bg: '#D1FAE5',
          pale: '#ECFDF5',
        },
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        line: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'btn-primary': '0 4px 12px rgba(37, 99, 235, 0.25)',
        'btn-primary-hover': '0 6px 16px rgba(37, 99, 235, 0.35)',
        'btn-middle': '0 4px 12px rgba(16, 185, 129, 0.25)',
        'btn-middle-hover': '0 6px 16px rgba(16, 185, 129, 0.35)',
        'btn-high': '0 4px 12px rgba(37, 99, 235, 0.25)',
        'btn-high-hover': '0 6px 16px rgba(37, 99, 235, 0.35)',
        'btn-secondary-hover': '0 4px 12px rgba(15, 23, 42, 0.08)',
        'mockup': '0 20px 60px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}