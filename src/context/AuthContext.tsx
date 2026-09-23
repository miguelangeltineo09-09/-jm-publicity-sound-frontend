// ==========================================
// Contexto de autenticación del admin.
// Guarda el JWT en memoria (useState, para que React re-renderice cuando
// cambia) y en localStorage (para que la sesión sobreviva a un F5). Expone
// login/logout e isAuthenticated a cualquier componente vía useAuth().
//
// Por qué localStorage sí es válido aquí (a diferencia de un artifact de
// Claude, donde está prohibido): esta es una app Next.js real, que corre en
// el navegador del propio admin, en el origen propio del sitio
// (jmpublicitysound.com o localhost en desarrollo). El storage no se
// comparte con nadie: no hay múltiples usuarios ni sesiones ajenas viendo
// la misma página, como sí ocurre con un artifact embebido en el dominio
// compartido de Claude. Guardar un token de sesión propio en el storage del
// propio sitio es exactamente el caso de uso para el que existe localStorage.
// ==========================================

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, registrarManejadorSesionExpirada } from "@/lib/api";

// Clave del token en localStorage, con prefijo para no chocar con otras apps
// que pudieran compartir el mismo dominio/origen en el futuro.
const CLAVE_STORAGE = "jm-publicity-sound:admin-token";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  // true solo durante el primer render, mientras se revisa localStorage.
  // Sirve para no parpadear "no autenticado" antes de saber si en realidad
  // sí hay una sesión guardada (ver ProtectedRoute/admin layout).
  cargandoSesion: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Al montar la app en el navegador, recupera el token guardado (si hay)
  // para no obligar al admin a volver a iniciar sesión en cada recarga.
  //
  // Por qué esto va en un efecto (y no, por ejemplo, en el valor inicial de
  // useState): localStorage no existe durante el renderizado en el
  // servidor. Leerlo ahí rompería el server render, y leerlo de forma
  // condicional en el primer render del cliente desincronizaría ese render
  // del HTML ya generado por el servidor (mismatch de hidratación). Un
  // efecto corre solo en el navegador, después de que la hidratación ya
  // coincidió con el servidor, así que es el único lugar seguro para esto.
  useEffect(() => {
    const tokenGuardado = localStorage.getItem(CLAVE_STORAGE);
    if (tokenGuardado) {
      // Sincroniza React con un sistema externo (localStorage): justo el
      // caso de uso que un efecto debe cubrir, no hay forma de derivarlo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(tokenGuardado);
    }
    setCargandoSesion(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(CLAVE_STORAGE);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const nuevoToken = await loginAdmin(email, password);
    setToken(nuevoToken);
    localStorage.setItem(CLAVE_STORAGE, nuevoToken);
  }, []);

  // Se registra una sola vez: conecta el "buzón" de src/lib/api.ts con este
  // contexto. Si cualquier petición autenticada futura (equipos, categorías,
  // reservas del admin) vuelve con 401 porque el token venció (dura 8h) o
  // ya no es válido, se cierra la sesión sola y se manda al admin de vuelta
  // al login con un aviso, en vez de dejarlo atascado en una pantalla rota.
  useEffect(() => {
    registrarManejadorSesionExpirada(() => {
      logout();
      router.push("/admin/login?motivo=sesion-expirada");
    });
  }, [router, logout]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: token !== null, cargandoSesion, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() debe usarse dentro de un <AuthProvider>.");
  }
  return context;
}
