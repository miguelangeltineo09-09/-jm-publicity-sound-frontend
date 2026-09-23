// ==========================================
// Configuración de Tailwind CSS.
// Define dónde buscar clases de utilidad (content) y la paleta de diseño
// personalizada para JM Publicity Sound.
//
// Rediseño de identidad visual: se migra de la paleta oscura/cian original
// a una estética morado profundo -> rosa -> naranja, inspirada en sitios
// como Pianity (fondo casi negro con tinte morado, textos destacados en
// degradado cálido). Esta fase solo define la BASE de colores/tipografía;
// la estructura de Home/catálogo/panel admin se rediseña en prompts
// siguientes, así que "accent" (el cian original) se conserva por ahora:
// varias pantallas de esos prompts todavía lo usan y se migrarán después.
// ==========================================

import type { Config } from "tailwindcss";

const config: Config = {
  // Rutas donde Tailwind escanea clases usadas, para generar solo el CSS necesario.
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo principal: negro casi puro con un leve tinte morado (no gris
        // neutro). "DEFAULT" y "deep" son los dos extremos del degradado
        // sutil que se aplica al body en globals.css (de arriba hacia abajo).
        background: {
          DEFAULT: "#0a0612",
          // Extremo inferior del degradado de fondo del body.
          deep: "#120a1f",
          // Superficie para tarjetas, headers, modales: morado muy oscuro,
          // más clara que el fondo pero sin acercarse al gris neutro anterior.
          surface: "#1a0f2e",
        },
        // Texto principal sobre fondo oscuro (blanco roto, no blanco puro, para suavizar el contraste).
        foreground: "#f2f2f5",
        // Texto secundario / descripciones: gris azulado claro (no gris
        // neutro), para que combine con el tinte morado del resto de la paleta.
        muted: "#a3aed1",
        // --- Paleta de marca: degradado morado -> rosa -> naranja ---
        // Es el degradado principal del sitio: títulos destacados (vía la
        // clase ".text-gradient-brand" en globals.css) y el fondo de los
        // botones primarios (Button.tsx) lo usan con
        // "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange".
        brand: {
          purple: "#7c3aed",
          // Tono más claro del morado, usado donde el morado sólido se vería
          // muy oscuro sobre el fondo (bordes/texto de botones "secondary",
          // estados focus de inputs).
          "purple-light": "#c4b5fd",
          pink: "#ec4899",
          orange: "#f97316",
        },
        // Color de acento original (cian neón). Se conserva tal cual: lo
        // siguen usando las pantallas que todavía no se migran en esta fase
        // (catálogo, panel admin). Se retira por completo cuando esas
        // pantallas se rediseñen en los siguientes prompts.
        accent: {
          DEFAULT: "#22d3ee",
          hover: "#67e8f9",
          foreground: "#04141a",
        },
      },
      // Tipografía sans-serif moderna (Inter), cargada vía next/font en layout.tsx
      // y expuesta aquí como variable CSS para poder usarla con la clase "font-sans".
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
