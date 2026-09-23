// ==========================================
// Layout de la zona de administración (/admin/*).
// Protege TODAS las rutas hijas excepto /admin/login: si no hay sesión,
// redirige al login; mientras se confirma si hay sesión guardada, muestra
// un spinner (evita el parpadeo de mostrar contenido protegido un instante
// antes de redirigir). Si hay sesión, dibuja el "shell" del admin
// (sidebar + botón de cerrar sesión) alrededor de la página pedida.
//
// Es Client Component porque depende de useAuth() (estado en memoria del
// navegador) y de usePathname()/useRouter() para decidir y redirigir.
// ==========================================

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { TRANSICION_HOVER } from "@/lib/estilos";

// Enlaces del panel. Equipos/Categorías/Reservas todavía no existen como
// páginas (se construyen en las siguientes fases): se dejan enlazados desde
// ya, igual que se hizo con "Catálogo"/"Contacto" en el sitio público.
const ENLACES_ADMIN = [
  { href: "/admin", etiqueta: "Dashboard" },
  { href: "/admin/equipos", etiqueta: "Equipos" },
  { href: "/admin/categorias", etiqueta: "Categorías" },
  { href: "/admin/provincias", etiqueta: "Provincias" },
  { href: "/admin/reservas", etiqueta: "Reservas" },
  { href: "/admin/calendario", etiqueta: "Calendario" },
  { href: "/admin/publicaciones", etiqueta: "Publicaciones" },
  { href: "/admin/resenas", etiqueta: "Reseñas" },
  { href: "/admin/faq", etiqueta: "Preguntas frecuentes" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, cargandoSesion, logout } = useAuth();

  const esPaginaLogin = pathname === "/admin/login";

  useEffect(() => {
    // Todavía no se sabe si hay sesión guardada (localStorage se lee async
    // al montar): no decidir nada hasta que cargandoSesion sea false.
    if (cargandoSesion) return;

    if (!isAuthenticated && !esPaginaLogin) {
      router.replace("/admin/login");
    }

    // Si ya hay sesión y el admin visita /admin/login a mano, no tiene
    // sentido mostrarle el formulario de nuevo: se manda al dashboard.
    if (isAuthenticated && esPaginaLogin) {
      router.replace("/admin");
    }
  }, [cargandoSesion, isAuthenticated, esPaginaLogin, router]);

  // /admin/login tiene su propio diseño de página completa (sin sidebar);
  // este layout solo le aplica la lógica de arriba, no le agrega interfaz.
  if (esPaginaLogin) {
    return <>{children}</>;
  }

  // Mientras se resuelve si hay sesión, o si no hay y ya se disparó el
  // redirect (todavía no se completa la navegación), se muestra un spinner
  // en vez de dejar ver el contenido protegido ni una pantalla en blanco.
  if (cargandoSesion || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Verificando sesión..." />
      </div>
    );
  }

  function manejarCerrarSesion() {
    logout();
    router.push("/admin/login");
  }

  return (
    // El fondo (degradado sutil morado, igual que el sitio público) ya lo
    // pinta el <body> en globals.css: este contenedor no necesita el suyo
    // propio, así el área de contenido queda consistente con el resto del
    // sitio sin duplicar el estilo acá.
    <div className="flex min-h-screen">
      {/* Sidebar del panel: navegación entre secciones y cierre de sesión.
          Fondo "surface" (morado oscuro secundario): es una superficie
          elevada sobre el fondo base, igual criterio que cualquier tarjeta
          del resto del sitio. */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-background-surface p-6">
        {/* Logo compacto (en vez del nombre en texto plano de antes). Mismo
            criterio que en Header.tsx: un poco más grande que la primera
            versión, para que el ícono/ecualizador del propio logo.svg se
            distinga en vez de leerse como texto plano. */}
        <img src="/logo.svg" alt="JM Publicity Sound" className="mb-8 h-10 w-auto" />

        <nav className="flex flex-1 flex-col gap-1">
          {ENLACES_ADMIN.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              // La sección activa se destaca con el degradado de marca como
              // fondo (antes cian sólido); las inactivas quedan neutras.
              className={`rounded-lg px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
                pathname === enlace.href
                  ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>

        {/* Outline coherente con la nueva paleta en reposo (morado claro);
            el hover se mantiene en rojo a propósito, como aviso visual de
            que la acción termina la sesión. */}
        <button
          type="button"
          onClick={manejarCerrarSesion}
          className={`mt-6 rounded-lg border border-brand-purple-light/30 px-3 py-2 text-left text-sm font-medium text-brand-purple-light ${TRANSICION_HOVER} hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300`}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
