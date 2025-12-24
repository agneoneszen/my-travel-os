/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // 建議維持乾淨的無襯線字體
      },
      colors: {
        // --- 新增的 MHA 英雄配色主題 ---
        hero: {
          // 基底色：取自雲朵與披風，溫暖的沙色/奶油白，取代原本冷色調的 slate-50
          sand: {
            50: '#FDFBF6',  // 最淺背景
            100: '#F7F3E8', // 次淺背景，卡片基底
            200: '#EEDC9A', // 披風的奶油黃色 (可用於邊框或裝飾)
          },
          // 主色調：取自廣闊的天空，充滿希望的湛藍
          sky: {
            400: '#4FC3F7', // 較亮的按鈕或 hover
            500: '#0288D1', // 主要品牌色/主按鈕 (取代原本的黑色按鈕)
            600: '#01579B', // 深色 hover
          },
          // 強調/行動色 (Accent)：取自標題與爆豪的紅色，用於強調與重要操作 (如刪除、重點行程)
          smash: {
            500: '#E53935', // 鮮明的紅色
            600: '#C62828', // 深紅色
          },
          // 特色色 (Deku Green)：取自綠谷的戰鬥服，深沉穩重的青綠色
          deku: {
            500: '#009688', // Teal 青綠色
            700: '#00695C', // 深青綠色
          },
          // 文字與陰影：深炭灰色，提供高對比度
          dark: {
            DEFAULT: '#212121', // 主要文字 (取代原本的 slate-800/900)
            muted: '#757575',   // 次要文字 (取代原本的 slate-400/500)
          }
        },
      },
      // 擴充動畫設定 (沿用您原本的)
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}