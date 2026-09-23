// ==========================================
// Página de login del admin ("/admin/login").
// Client Component: usa el AuthContext para autenticarse. No tiene el
// header/footer del sitio público (ver src/app/admin/layout.tsx, que para
// esta ruta puntual no dibuja ningún shell) — es una pantalla propia,
// deliberadamente sobria, para marcar que se entra a una zona distinta.
// ==========================================

"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import { useAuth } from "@/context/AuthContext";

// useSearchParams() exige un límite <Suspense> alrededor en Next.js; el
// contenido real vive en este componente interno para poder envolverlo
// desde el export default sin duplicar nada.
function FormularioLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // Si el AuthContext redirigió aquí por un token vencido, se avisa por qué.
  const sesionExpirada = searchParams.get("motivo") === "sesion-expirada";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setError(null);
    setEnviando(true);
    try {
      await login(email.trim(), password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      {/* El fondo con degradado sutil ya lo pinta el <body> (globals.css),
          igual que en el sitio público: esta tarjeta solo necesita su
          propio fondo "surface" para destacar sobre él. */}
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-background-surface p-8">
        {/* Logo real (antes era el nombre en texto plano). */}
        <img src="/logo.svg" alt="JM Publicity Sound" className="mx-auto h-12 w-auto" />
        <p className="mt-3 text-center text-sm text-muted">Panel de administración</p>

        {sesionExpirada && (
          <p className="mt-4 rounded-lg border border-white/10 bg-background px-3 py-2 text-center text-sm text-muted">
            Tu sesión expiró, inicia sesión de nuevo.
          </p>
        )}

        <form onSubmit={manejarEnvio} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>

          {error && <ErrorMessage message={error} />}

          <Button type="submit" disabled={enviando} className="mt-2 w-full justify-center">
            {enviando ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <FormularioLogin />
    </Suspense>
  );
}
