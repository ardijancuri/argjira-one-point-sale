/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4285f4',
          hover: '#357ae8',
        },
        secondary: '#34a853',
        success: '#0f9d58',
        warning: '#f4b400',
        danger: '#db4437',
        sidebar: {
          bg: '#2c3e50',
          hover: '#34495e',
        },
        light: {
          bg: '#f5f7fa',
        },
        border: '#dfe3e8',
        text: {
          primary: '#202124',
          secondary: '#5f6368',
        },
      },
    },
  },
  plugins: [],
}

