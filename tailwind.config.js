/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from Enlazo branding guide
        'conexion-profunda': '#36004E', // Deep purple - primary
        'enlace-vivo': '#FF9601',       // Orange
        'morado-confianza': '#AA1BF1',  // Purple
        'azul-alcance': '#009AFF',      // Blue
        'gris-flujo': '#E2E2E2',        // Gray
      },
      fontFamily: {
        'isidora': ['Isidora Alt Bold', 'sans-serif'],
        'centrale': ['Centrale Sans Rounded', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
