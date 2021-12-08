const colors = require("tailwindcss/colors");

module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "2rem",
          lg: "4rem",
          xl: "10rem"
        }
      },
      colors: {
        gray: colors.trueGray,
        cyan: colors.cyan
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
