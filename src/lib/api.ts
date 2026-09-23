// ==========================================
// Cliente de API para comunicarse con el backend (jm-publicity-sound-backend).
// Centraliza la URL base, el manejo de errores y expone una función tipada
// por cada endpoint que el frontend consume en esta fase.
// ==========================================

import type {
  Categoria,
  ConfiguracionContacto,
  CrearReservaAdminPayload,
  CrearReservaPayload,
  CrearResenaPayload,
  DatosConfiguracionContacto,
  DatosEquipoFormulario,
  Equipo,
  EstadoReserva,
  EstadoResena,
  Factura,
  ItemIncluido,
  PreguntaFrecuente,
  Provincia,
  Publicacion,
  RedSocial,
  Resena,
  ResenasDeEquipo,
  Reserva,
  TipoPublicacion,
} from "@/types";

// URL base del backend, tomada de la variable de entorno pública NEXT_PUBLIC_API_URL
// (ver .env.local.example). Debe estar disponible tanto en cliente como en servidor,
// por eso usa el prefijo NEXT_PUBLIC_.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Error propio para distinguir fallos de la API del resto de excepciones:
// conserva el status HTTP (0 si nunca llegó a responder, ej. backend caído)
// para que quien llame pueda decidir cómo reaccionar (ej. 409 en reservas).
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- Manejo global de sesión expirada ---
// api.ts es un módulo plano (no un componente React) y no puede usar el
// AuthContext directamente. En vez de eso, expone este "buzón": AuthContext
// registra aquí, al montarse, qué hacer cuando una petición AUTENTICADA
// (con header Authorization) vuelve con 401 — típicamente porque el token
// del admin venció (dura 8h, ver backend) o fue invalidado. Así, cualquier
// función futura que llame a un endpoint protegido dispara el cierre de
// sesión automático sin que cada pantalla tenga que revisarlo a mano.
type ManejadorSesionExpirada = () => void;
let manejadorSesionExpirada: ManejadorSesionExpirada | null = null;

export function registrarManejadorSesionExpirada(fn: ManejadorSesionExpirada): void {
  manejadorSesionExpirada = fn;
}

// RequestInit normal, más una bandera propia (no la lee fetch(), se le
// quita antes de pasarla): permite que una llamada puntual le diga a
// fetchAPI "este 401 no significa sesión expirada, no dispares el logout
// automático". Hace falta porque PATCH /api/auth/password reutiliza el
// código 401 con un significado distinto (ver más abajo).
interface OpcionesFetchAPI extends RequestInit {
  ignorarSesionExpirada?: boolean;
}

/**
 * Función base: hace la petición HTTP anteponiendo la URL del backend,
 * y traduce cualquier fallo (de red o de respuesta no exitosa) a un
 * ApiError con un mensaje claro, en vez de dejar pasar errores crudos
 * de fetch o del backend.
 */
async function fetchAPI<T>(endpoint: string, options?: OpcionesFetchAPI): Promise<T> {
  let response: Response;

  // Se separa la bandera propia del resto de las opciones: fetch() no la
  // conoce, así que no debe llegar hasta la llamada real más abajo.
  const { ignorarSesionExpirada, ...opcionesFetch } = options ?? {};

  // FormData (subida de imagen de equipos) necesita que el navegador arme
  // su propio Content-Type con el "boundary" del multipart: si se lo
  // fijamos nosotros a "application/json", el backend no puede parsear el
  // body. Por eso el default de JSON se omite cuando el body es FormData.
  const esFormData = opcionesFetch.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(esFormData ? {} : { "Content-Type": "application/json" }),
    ...(opcionesFetch.headers as Record<string, string> | undefined),
  };

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      // El catálogo y la disponibilidad los edita el admin en cualquier
      // momento: cachear estas respuestas (el comportamiento por defecto de
      // fetch en Server Components) mostraría datos desactualizados, o
      // incluso "congelaría" una página entera como estática en el build de
      // producción. Se pide siempre la versión más reciente al backend.
      cache: "no-store",
      ...opcionesFetch,
      // "headers" va DESPUÉS de "...opcionesFetch" a propósito: también
      // puede traer su propia clave "headers" (ej. Authorization), y si
      // fuera al revés, ese spread pisaría por completo el objeto ya
      // fusionado de arriba en vez de combinarse con él.
      headers,
    });
  } catch {
    // fetch lanza un TypeError cuando no hay red o el backend no responde
    // (ej. no está corriendo). Se traduce a un mensaje entendible.
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté disponible.",
      0
    );
  }

  if (!response.ok) {
    // Los controladores del backend responden errores como { error: "mensaje" }.
    // Se intenta leer ese mensaje; si el body no es JSON válido, se usa un
    // mensaje genérico en su lugar (nunca se deja el error sin explicar).
    let mensaje = `Error inesperado del servidor (${response.status}).`;
    try {
      const cuerpo = await response.json();
      if (cuerpo?.error) {
        mensaje = cuerpo.error;
      }
    } catch {
      // Respuesta sin body JSON: se conserva el mensaje genérico anterior.
    }

    // Un 401 en una petición que SÍ llevaba token (Authorization) normalmente
    // significa sesión vencida/inválida (el login nunca manda Authorization,
    // así que nunca dispara esto). La única excepción es "ignorarSesionExpirada":
    // PATCH /api/auth/password también responde 401 cuando la contraseña
    // ACTUAL escrita es incorrecta — el token sigue siendo válido, así que
    // ese 401 no debe cerrar la sesión, solo mostrarse como error del formulario.
    const teniaToken = Boolean((opcionesFetch.headers as Record<string, string> | undefined)?.Authorization);
    if (response.status === 401 && teniaToken && !ignorarSesionExpirada) {
      manejadorSesionExpirada?.();
    }

    throw new ApiError(mensaje, response.status);
  }

  // DELETE devuelve 204 sin body: no hay nada que parsear como JSON.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** GET /api/categorias — lista todas las categorías del catálogo. */
export function getCategorias(): Promise<Categoria[]> {
  return fetchAPI<Categoria[]>("/api/categorias");
}

/**
 * GET /api/provincias — lista las 32 provincias con su precioViaje
 * actual. Público: lo usa tanto el select del formulario público de
 * reserva como la tabla de gestión del panel admin.
 */
export function getProvincias(): Promise<Provincia[]> {
  return fetchAPI<Provincia[]>("/api/provincias");
}

/**
 * GET /api/equipos — lista los equipos del catálogo.
 * Si se pasa categoriaId, filtra solo los equipos de esa categoría
 * (usa el query param ?categoriaId= que ya soporta el backend).
 */
export function getEquipos(categoriaId?: number): Promise<Equipo[]> {
  const query = categoriaId !== undefined ? `?categoriaId=${categoriaId}` : "";
  return fetchAPI<Equipo[]>(`/api/equipos${query}`);
}

/** GET /api/equipos/:id — detalle de un equipo puntual. */
export function getEquipoPorId(id: number): Promise<Equipo> {
  return fetchAPI<Equipo>(`/api/equipos/${id}`);
}

/**
 * GET /api/equipos/:id/items-incluidos — público, igual que el resto del
 * detalle del equipo. Ya vienen ordenados por "orden" desde el backend.
 * getEquipoPorId() también los trae anidados, pero esta función existe
 * para cuando conviene pedirlos aparte (ej. el editor de ítems del panel
 * admin, que necesita refrescarlos sin volver a pedir todo el equipo).
 */
export function getItemsIncluidos(equipoId: number): Promise<ItemIncluido[]> {
  return fetchAPI<ItemIncluido[]>(`/api/equipos/${equipoId}/items-incluidos`);
}

/**
 * GET /api/disponibilidad?equipoIds=a,b,c — fechas (ISO) con reserva
 * CONFIRMADA para CUALQUIERA de los equipos indicados (la unión de todos).
 * El calendario del frontend las usa para marcar los días no disponibles
 * (las reservas PENDIENTE no aparecen aquí: no bloquean nada).
 *
 * Antes recibía un único "equipoId" (una reserva = un equipo); ahora una
 * reserva puede tener varios equipos que comparten fecha/horario (ver el
 * carrito de reserva, src/context/CarritoContext.tsx), así que hay que
 * cruzar la disponibilidad de TODOS ellos: una fecha solo sirve si NINGUNO
 * de los equipos elegidos la tiene ocupada. El backend ya resuelve esa
 * unión; acá solo se arma el query string separado por comas que espera.
 */
export function getDisponibilidad(equipoIds: number[]): Promise<string[]> {
  return fetchAPI<string[]>(`/api/disponibilidad?equipoIds=${equipoIds.join(",")}`);
}

/**
 * POST /api/reservas — crea una solicitud de alquiler para uno o varios
 * equipos del mismo evento. Nace con estado PENDIENTE; el backend puede
 * rechazarla con 409 si alguno de los equipos elegidos ya tiene una
 * reserva CONFIRMADA en esa fecha (ese mensaje, junto con qué equipo(s)
 * chocan, llega vía ApiError).
 */
export function crearReserva(payload: CrearReservaPayload): Promise<Reserva> {
  return fetchAPI<Reserva>("/api/reservas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/auth/login — autentica al admin y devuelve su JWT.
 * Si el email/password no coinciden, el backend responde 401 con un mensaje
 * claro ("Credenciales inválidas."), que llega tal cual vía ApiError: no
 * dispara el manejador de sesión expirada porque esta petición no lleva
 * Authorization (no hay sesión previa que "expirar" en un login).
 */
export async function loginAdmin(email: string, password: string): Promise<string> {
  const { token } = await fetchAPI<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return token;
}

// ==========================================
// Funciones protegidas del panel admin.
// Todas reciben el token de la sesión (ver AuthContext) y lo mandan como
// "Authorization: Bearer <token>". Si el backend responde 400 (ej. borrar
// una categoría con equipos asociados, o un equipo con reservas activas),
// ese mensaje llega tal cual dentro del ApiError — no hay que traducirlo
// aquí, ya viene listo para mostrarse en pantalla.
// ==========================================

function headersAutenticados(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** POST /api/categorias — crea una categoría nueva. */
export function crearCategoria(nombre: string, token: string): Promise<Categoria> {
  return fetchAPI<Categoria>("/api/categorias", {
    method: "POST",
    headers: headersAutenticados(token),
    body: JSON.stringify({ nombre }),
  });
}

/** PUT /api/categorias/:id — renombra una categoría existente. */
export function editarCategoria(id: number, nombre: string, token: string): Promise<Categoria> {
  return fetchAPI<Categoria>(`/api/categorias/${id}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify({ nombre }),
  });
}

/**
 * PUT /api/provincias/:id — edita el precioViaje de una provincia
 * existente. Es la única escritura permitida sobre Provincia: no hay
 * crear ni eliminar (la lista de 32 es fija, ver el backend).
 */
export function editarPrecioProvincia(id: number, precioViaje: number, token: string): Promise<Provincia> {
  return fetchAPI<Provincia>(`/api/provincias/${id}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify({ precioViaje }),
  });
}

/**
 * DELETE /api/categorias/:id — elimina una categoría. El backend responde
 * 400 si todavía tiene equipos asociados (hay que reasignarlos o borrarlos
 * primero); ese mensaje llega vía ApiError y se muestra tal cual.
 */
export function eliminarCategoria(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/categorias/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// Arma el FormData multipart que espera el backend para crear/editar un
// equipo. Solo agrega los campos presentes en "datos": al editar, eso
// permite mandar únicamente lo que cambió (actualización parcial).
function construirFormDataEquipo(datos: DatosEquipoFormulario): FormData {
  const formData = new FormData();

  if (datos.nombre !== undefined) formData.append("nombre", datos.nombre);
  if (datos.descripcion !== undefined) formData.append("descripcion", datos.descripcion);
  if (datos.precio !== undefined) formData.append("precio", String(datos.precio));
  if (datos.categoriaId !== undefined) formData.append("categoriaId", String(datos.categoriaId));
  if (datos.disponibleParaAlquiler !== undefined) {
    formData.append("disponibleParaAlquiler", String(datos.disponibleParaAlquiler));
  }
  // Solo se adjunta si el admin elige un archivo nuevo: si no, el backend
  // conserva la imagenUrl que el equipo ya tenía.
  if (datos.imagen) formData.append("imagen", datos.imagen);

  return formData;
}

/**
 * POST /api/equipos — crea un equipo nuevo (multipart/form-data, ver
 * construirFormDataEquipo). La imagen es opcional: el equipo puede crearse
 * y subírsela después con editarEquipo.
 */
export function crearEquipo(datos: DatosEquipoFormulario, token: string): Promise<Equipo> {
  return fetchAPI<Equipo>("/api/equipos", {
    method: "POST",
    headers: headersAutenticados(token),
    body: construirFormDataEquipo(datos),
  });
}

/**
 * PUT /api/equipos/:id — edita un equipo existente. Si "datos.imagen" viene
 * con un archivo, el backend la sube a Cloudinary y reemplaza la imagenUrl
 * anterior; si no, la imagen actual se mantiene igual.
 */
export function editarEquipo(id: number, datos: DatosEquipoFormulario, token: string): Promise<Equipo> {
  return fetchAPI<Equipo>(`/api/equipos/${id}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: construirFormDataEquipo(datos),
  });
}

/**
 * DELETE /api/equipos/:id — elimina un equipo. El backend responde 400 si
 * tiene reservas PENDIENTE o CONFIRMADA (hay que resolverlas primero, o
 * usar cambiarDisponibilidadEquipo para sacarlo del catálogo sin borrarlo);
 * ese mensaje llega vía ApiError y se muestra tal cual.
 */
export function eliminarEquipo(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/equipos/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

/**
 * PATCH /api/equipos/:id/disponibilidad — activa/desactiva el equipo sin
 * borrarlo. Se usa desde el toggle de la lista, sin pasar por el formulario
 * completo de edición.
 */
export function cambiarDisponibilidadEquipo(
  id: number,
  disponibleParaAlquiler: boolean,
  token: string
): Promise<Equipo> {
  return fetchAPI<Equipo>(`/api/equipos/${id}/disponibilidad`, {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify({ disponibleParaAlquiler }),
  });
}

// ==========================================
// Ítems incluidos de un equipo (panel admin).
// Se editan de forma independiente al resto del formulario del equipo:
// cada acción (agregar/editar/eliminar/reordenar) se guarda al instante
// contra el backend, sin esperar al botón "Guardar" del formulario
// principal (ver ItemsIncluidosEditor.tsx).
// ==========================================

/**
 * POST /api/equipos/:id/items-incluidos — agrega un ítem nuevo al final
 * de la lista de ese equipo (el backend calcula automáticamente el
 * siguiente "orden" al no mandarlo).
 */
export function crearItemIncluido(equipoId: number, descripcion: string, token: string): Promise<ItemIncluido> {
  return fetchAPI<ItemIncluido>(`/api/equipos/${equipoId}/items-incluidos`, {
    method: "POST",
    headers: headersAutenticados(token),
    body: JSON.stringify({ descripcion }),
  });
}

/** PUT /api/items-incluidos/:itemId — edita la descripción de un ítem existente. */
export function editarItemIncluido(itemId: number, descripcion: string, token: string): Promise<ItemIncluido> {
  return fetchAPI<ItemIncluido>(`/api/items-incluidos/${itemId}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify({ descripcion }),
  });
}

/** DELETE /api/items-incluidos/:itemId — elimina un ítem puntual. */
export function eliminarItemIncluido(itemId: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/items-incluidos/${itemId}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// Una entrada del array que espera reordenarItemsIncluidos: a qué ítem
// (por su id) se le asigna qué nueva posición.
export interface OrdenItemIncluido {
  id: number;
  orden: number;
}

/**
 * PATCH /api/equipos/:id/items-incluidos/orden — actualiza el "orden" de
 * varios ítems de ese equipo de una sola vez (ej. al mover uno con las
 * flechas de subir/bajar, se manda el nuevo orden de los dos ítems que
 * intercambiaron posición).
 */
export function reordenarItemsIncluidos(
  equipoId: number,
  ordenArray: OrdenItemIncluido[],
  token: string
): Promise<ItemIncluido[]> {
  return fetchAPI<ItemIncluido[]>(`/api/equipos/${equipoId}/items-incluidos/orden`, {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify(ordenArray),
  });
}

// Filtros opcionales que acepta GET /api/reservas (ver getReservas).
export interface FiltrosReservas {
  estado?: EstadoReserva;
  equipoId?: number;
}

/**
 * GET /api/reservas — lista las solicitudes de alquiler, con la lista
 * completa de equipos de cada una incluida (antes era un solo "equipo"
 * anidado; ver el comentario de ReservaEquipo en src/types/index.ts). Sin
 * filtros devuelve todas; se puede acotar por estado y/o equipo (el
 * backend filtra por equipo a través de la relación ReservaEquipo, así
 * que este mismo query param sigue funcionando igual que antes).
 */
export function getReservas(filtros: FiltrosReservas | undefined, token: string): Promise<Reserva[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set("estado", filtros.estado);
  if (filtros?.equipoId !== undefined) params.set("equipoId", String(filtros.equipoId));
  const query = params.toString();

  return fetchAPI<Reserva[]>(`/api/reservas${query ? `?${query}` : ""}`, {
    headers: headersAutenticados(token),
  });
}

/** GET /api/reservas/:id — detalle de una reserva puntual. */
export function getReservaPorId(id: number, token: string): Promise<Reserva> {
  return fetchAPI<Reserva>(`/api/reservas/${id}`, {
    headers: headersAutenticados(token),
  });
}

/**
 * GET /api/reservas/calendario?mes=&anio= — todas las reservas CONFIRMADAS
 * de ese mes/año, con sus equipos y provincia ya incluidos. Es lo que
 * necesita la vista de calendario del panel (src/app/admin/calendario/page.tsx)
 * para pintar un indicador en cada día con eventos y mostrar el detalle
 * logístico al hacer clic. "mes" es 1-12 (humano, no el índice 0-11 de
 * un objeto Date de JS); si se omiten mes/anio, el backend usa el mes y
 * año actuales del servidor.
 */
export function getReservasCalendario(mes: number, anio: number, token: string): Promise<Reserva[]> {
  return fetchAPI<Reserva[]>(`/api/reservas/calendario?mes=${mes}&anio=${anio}`, {
    headers: headersAutenticados(token),
  });
}

/**
 * POST /api/reservas/admin — el admin crea una reserva a mano desde el
 * panel (ej. un cliente que reservó en persona o por WhatsApp), separado
 * de crearReserva() (el formulario público). Misma forma de respuesta
 * (la reserva creada, PENDIENTE) y mismos posibles errores (404 si algún
 * equipo/la provincia no existen, 409 si alguno de los equipos elegidos
 * ya tiene una reserva CONFIRMADA para esa fecha), pero "clienteEmail" es
 * opcional acá: si no se manda, el backend la guarda con clienteEmail = null.
 */
export function crearReservaAdmin(payload: CrearReservaAdminPayload, token: string): Promise<Reserva> {
  return fetchAPI<Reserva>("/api/reservas/admin", {
    method: "POST",
    headers: headersAutenticados(token),
    body: JSON.stringify(payload),
  });
}

/**
 * PATCH /api/reservas/:id/estado — confirma o rechaza una solicitud.
 *
 * REGLA DE NEGOCIO: al confirmar, el backend bloquea automáticamente esa
 * fecha para ese equipo en el calendario público (GET /api/disponibilidad).
 * Si mientras tanto OTRA reserva del mismo equipo/fecha ya fue confirmada
 * (dos solicitudes pendientes compitiendo por el mismo día), el backend
 * responde 409: ese mensaje llega tal cual vía ApiError, listo para
 * mostrarse — quien llama a esta función debe además refrescar la lista,
 * ya que el estado real cambió aunque esta confirmación puntual falló.
 */
export function cambiarEstadoReserva(
  id: number,
  estado: "CONFIRMADA" | "RECHAZADA",
  token: string
): Promise<Reserva> {
  return fetchAPI<Reserva>(`/api/reservas/${id}/estado`, {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify({ estado }),
  });
}

/**
 * DELETE /api/reservas/:id — borrado administrativo (reservas de prueba,
 * duplicadas, o ya resueltas). El backend no exige ningún estado en
 * particular para poder borrarla.
 */
export function eliminarReserva(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/reservas/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

/**
 * PATCH /api/auth/password — cambia la contraseña del admin autenticado.
 *
 * No hace falta un manejo especial de errores acá: el backend responde 401
 * con "La contraseña actual es incorrecta." si esa contraseña no coincide,
 * y 400 con "La nueva contraseña debe tener al menos 8 caracteres." si es
 * muy corta — ambos mensajes ya llegan listos para mostrarse dentro del
 * ApiError que lanza fetchAPI, igual que el resto de los endpoints.
 */
export function cambiarPasswordAdmin(
  passwordActual: string,
  passwordNueva: string,
  token: string
): Promise<{ mensaje: string }> {
  return fetchAPI<{ mensaje: string }>("/api/auth/password", {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify({ passwordActual, passwordNueva }),
    // Un 401 acá significa "la contraseña actual escrita no es la
    // correcta", no que el token/sesión haya vencido: no debe disparar el
    // logout automático (ver la bandera en fetchAPI más arriba).
    ignorarSesionExpirada: true,
  });
}

// ==========================================
// Facturación (Fase de envío de facturas por correo).
// Todas exigen que la reserva ya esté CONFIRMADA (lo valida el backend).
// ==========================================

/**
 * POST /api/facturas/:reservaId — emite la factura de una reserva ya
 * CONFIRMADA. El backend responde 409 si esa reserva ya tenía una factura
 * (ej. dos clics casi simultáneos), mensaje que llega tal cual vía ApiError.
 */
export function crearFactura(reservaId: number, token: string): Promise<Factura> {
  return fetchAPI<Factura>(`/api/facturas/${reservaId}`, {
    method: "POST",
    headers: headersAutenticados(token),
  });
}

// Filtro opcional que acepta GET /api/facturas (ver getFacturas).
export interface FiltrosFacturas {
  reservaId?: number;
}

/**
 * GET /api/facturas — lista las facturas ya emitidas. Se usa al cargar la
 * pantalla de reservas para saber, cruzando por reservaId, cuáles reservas
 * CONFIRMADAS ya tienen factura (y así decidir si mostrar "Generar factura"
 * o los botones de "Descargar PDF"/"Enviar por correo").
 */
export function getFacturas(filtros: FiltrosFacturas | undefined, token: string): Promise<Factura[]> {
  const query = filtros?.reservaId !== undefined ? `?reservaId=${filtros.reservaId}` : "";
  return fetchAPI<Factura[]>(`/api/facturas${query}`, {
    headers: headersAutenticados(token),
  });
}

/**
 * GET /api/facturas/:facturaId/pdf — descarga el PDF de una factura ya
 * emitida.
 *
 * No puede reutilizar fetchAPI(): esa función siempre intenta leer la
 * respuesta con response.json(), y esta respuesta exitosa es binaria
 * (application/pdf), no JSON. Por eso se repite acá, a mano, solo el
 * manejo de errores de red/HTTP que sí sigue aplicando igual, y al final
 * se devuelve el Blob crudo en vez de parsearlo.
 */
export async function descargarFacturaPDF(facturaId: number, token: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/facturas/${facturaId}/pdf`, {
      cache: "no-store",
      headers: headersAutenticados(token),
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté disponible.",
      0
    );
  }

  if (!response.ok) {
    // Un error acá (ej. factura no encontrada) sí viene como JSON normal,
    // igual que en fetchAPI.
    let mensaje = `Error inesperado del servidor (${response.status}).`;
    try {
      const cuerpo = await response.json();
      if (cuerpo?.error) mensaje = cuerpo.error;
    } catch {
      // Respuesta sin body JSON: se conserva el mensaje genérico anterior.
    }
    if (response.status === 401) manejadorSesionExpirada?.();
    throw new ApiError(mensaje, response.status);
  }

  return response.blob();
}

/**
 * POST /api/facturas/:facturaId/enviar — envía por correo (con el PDF
 * adjunto) una factura ya emitida al clienteEmail de la reserva, vía
 * Resend. Si el envío falla (ej. dominio de Resend sin verificar, API key
 * inválida, destinatario no permitido), el backend responde 502 con un
 * mensaje ya traducido a texto claro: llega tal cual dentro del ApiError,
 * listo para mostrarse al admin sin ocultar el motivo real.
 */
export function enviarFacturaPorCorreo(facturaId: number, token: string): Promise<{ mensaje: string; enviadoA: string }> {
  return fetchAPI<{ mensaje: string; enviadoA: string }>(`/api/facturas/${facturaId}/enviar`, {
    method: "POST",
    headers: headersAutenticados(token),
  });
}

// ==========================================
// Publicaciones de eventos (fotos/videos de trabajos ya realizados).
// Crear/editar/eliminar requieren token; listar es público en el backend
// (por eso getPublicaciones NO pide token, igual que getEquipos/getCategorias).
// ==========================================

// Datos que junta el formulario del panel admin para crear una
// publicación. "video"/"imagenes" son mutuamente excluyentes según "tipo"
// (el backend valida que llegue exactamente lo que corresponde a cada uno).
export interface DatosPublicacionFormulario {
  titulo: string;
  comentario?: string;
  equipoId: number;
  destacado?: boolean;
  tipo: TipoPublicacion;
  // Un solo archivo, solo si tipo="VIDEO".
  video?: File;
  // Uno o más archivos, en el orden en que deben quedar en el carrusel, solo si tipo="FOTO".
  imagenes?: File[];
}

function construirFormDataPublicacion(datos: DatosPublicacionFormulario): FormData {
  const formData = new FormData();

  formData.append("titulo", datos.titulo);
  if (datos.comentario) formData.append("comentario", datos.comentario);
  formData.append("tipo", datos.tipo);
  formData.append("equipoId", String(datos.equipoId));
  if (datos.destacado !== undefined) formData.append("destacado", String(datos.destacado));

  // El nombre de campo ("video" o "imagenes") tiene que coincidir con el
  // que espera multer en el backend (ver publicacion.routes.ts).
  if (datos.tipo === "VIDEO" && datos.video) {
    formData.append("video", datos.video);
  }
  if (datos.tipo === "FOTO" && datos.imagenes) {
    // Varios "append" con el MISMO nombre de campo: así es como
    // multipart/form-data representa "un array de archivos" — multer, del
    // lado del backend, los junta todos bajo ese nombre en el orden en que
    // se agregaron acá.
    datos.imagenes.forEach((archivo) => formData.append("imagenes", archivo));
  }

  return formData;
}

/**
 * POST /api/publicaciones — crea una publicación (multipart/form-data).
 * No se tipa el valor de retorno como Publicacion completa a propósito: el
 * backend no incluye "equipo" en la respuesta de creación (sí en
 * listar/detalle/editar), así que quien llama a esta función debe volver
 * a pedir la lista (getPublicaciones) en vez de confiar en este resultado
 * para actualizar la pantalla.
 */
export function crearPublicacion(datos: DatosPublicacionFormulario, token: string): Promise<void> {
  return fetchAPI<void>("/api/publicaciones", {
    method: "POST",
    headers: headersAutenticados(token),
    body: construirFormDataPublicacion(datos),
  });
}

// Filtros opcionales que acepta GET /api/publicaciones.
export interface FiltrosPublicaciones {
  equipoId?: number;
  destacado?: boolean;
}

/** GET /api/publicaciones — lista publicaciones, con equipo e imágenes incluidos. */
export function getPublicaciones(filtros?: FiltrosPublicaciones): Promise<Publicacion[]> {
  const params = new URLSearchParams();
  if (filtros?.equipoId !== undefined) params.set("equipoId", String(filtros.equipoId));
  if (filtros?.destacado !== undefined) params.set("destacado", String(filtros.destacado));
  const query = params.toString();

  return fetchAPI<Publicacion[]>(`/api/publicaciones${query ? `?${query}` : ""}`);
}

/**
 * GET /api/publicaciones/:id — detalle de una publicación puntual
 * (público, igual que la lista). No se usa todavía desde ninguna pantalla,
 * pero se expone junto al resto de funciones de publicaciones por si una
 * futura página de detalle individual la necesita.
 */
export function getPublicacionPorId(id: number): Promise<Publicacion> {
  return fetchAPI<Publicacion>(`/api/publicaciones/${id}`);
}

// Campos editables de una publicación (el contenido multimedia NO se
// puede cambiar por PATCH: hay que borrar y crear una nueva, ver
// eliminarPublicacion/crearPublicacion).
export interface DatosEditarPublicacion {
  titulo?: string;
  comentario?: string | null;
  destacado?: boolean;
}

/**
 * PATCH /api/publicaciones/:id — edita título/comentario/destacado. Se usa
 * tanto desde el formulario completo como desde el toggle "Destacado"
 * directo en la lista (mandando solo { destacado } en ese caso).
 */
export function editarPublicacion(
  id: number,
  datos: DatosEditarPublicacion,
  token: string
): Promise<Publicacion> {
  return fetchAPI<Publicacion>(`/api/publicaciones/${id}`, {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify(datos),
  });
}

/**
 * DELETE /api/publicaciones/:id — elimina la publicación; el backend
 * también borra el/los archivo(s) correspondientes en Cloudinary.
 */
export function eliminarPublicacion(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/publicaciones/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// ==========================================
// Reseñas públicas (ficha de detalle de un equipo + formulario para que
// un cliente deje su propia reseña). Ninguna de las dos funciones lleva
// token: ambas las usa cualquier visitante, sin necesitar cuenta.
// ==========================================

/**
 * GET /api/equipos/:id/resenas — reseñas APROBADAS de ese equipo, más su
 * promedio de calificación y el total considerado. Es lo que necesita la
 * ficha pública de un equipo: nunca incluye PENDIENTE ni RECHAZADA.
 */
export function getResenasDeEquipo(equipoId: number): Promise<ResenasDeEquipo> {
  return fetchAPI<ResenasDeEquipo>(`/api/equipos/${equipoId}/resenas`);
}

/**
 * POST /api/resenas — un cliente deja una reseña nueva sobre un equipo.
 * Nace PENDIENTE en el backend: no aparece en getResenasDeEquipo hasta
 * que el admin la aprueba desde el panel. El backend responde 429 si ese
 * mismo nombre ya reseñó este equipo en los últimos minutos (antispam),
 * y ese mensaje llega tal cual vía ApiError.
 */
export function crearResena(payload: CrearResenaPayload): Promise<{ mensaje: string }> {
  return fetchAPI<{ mensaje: string }>("/api/resenas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// Reseñas de equipos (moderación desde el panel admin).
// Crear una reseña es público (lo hace el cliente final desde el sitio,
// no desde el panel); todo lo de acá abajo (listar TODAS, moderar,
// eliminar) es exclusivo del admin.
// ==========================================

// Filtro opcional que acepta GET /api/resenas (ver getResenas).
export interface FiltrosResenas {
  estado?: EstadoResena;
}

/**
 * GET /api/resenas — lista TODAS las reseñas (cualquier estado), con el
 * equipo incluido. Sin filtro devuelve todas; ?estado= acota (ej. mostrar
 * primero las PENDIENTE, que son las que requieren acción del admin).
 */
export function getResenas(filtros: FiltrosResenas | undefined, token: string): Promise<Resena[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set("estado", filtros.estado);
  const query = params.toString();

  return fetchAPI<Resena[]>(`/api/resenas${query ? `?${query}` : ""}`, {
    headers: headersAutenticados(token),
  });
}

/**
 * PATCH /api/resenas/:id/estado — aprueba o rechaza una reseña. Es el
 * único lugar donde el estado cambia: no se puede volver a "PENDIENTE" a
 * mano (es el estado inicial, no una opción de moderación).
 */
export function cambiarEstadoResena(
  id: number,
  estado: "APROBADA" | "RECHAZADA",
  token: string
): Promise<Resena> {
  return fetchAPI<Resena>(`/api/resenas/${id}/estado`, {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify({ estado }),
  });
}

/**
 * DELETE /api/resenas/:id — borrado definitivo (ej. spam evidente o
 * contenido inapropiado). A diferencia de rechazar, no deja rastro.
 */
export function eliminarResena(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/resenas/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// ==========================================
// Preguntas frecuentes (sección "Preguntas frecuentes" del sitio público).
// Listar es público (lo usa tanto la sección pública como la pantalla de
// gestión del panel admin, que vuelve a pedir la misma lista pero con
// token para las acciones); crear/editar/eliminar/reordenar son
// exclusivos del admin.
// ==========================================

/**
 * GET /api/preguntas-frecuentes — lista todas las preguntas frecuentes,
 * ya ordenadas por "orden" (el orden en que el admin quiere que se
 * muestren). Público: cualquier visitante del sitio la necesita para ver
 * la sección de FAQ.
 */
export function getPreguntasFrecuentes(): Promise<PreguntaFrecuente[]> {
  return fetchAPI<PreguntaFrecuente[]>("/api/preguntas-frecuentes");
}

/**
 * POST /api/preguntas-frecuentes — crea una pregunta frecuente nueva. No
 * se manda "orden": el backend calcula automáticamente el siguiente (al
 * final de la lista), igual criterio que crearItemIncluido.
 */
export function crearPreguntaFrecuente(pregunta: string, respuesta: string, token: string): Promise<PreguntaFrecuente> {
  return fetchAPI<PreguntaFrecuente>("/api/preguntas-frecuentes", {
    method: "POST",
    headers: headersAutenticados(token),
    body: JSON.stringify({ pregunta, respuesta }),
  });
}

/**
 * PUT /api/preguntas-frecuentes/:id — edita la pregunta y/o la respuesta
 * de una pregunta frecuente existente. No toca su "orden" (eso es
 * responsabilidad de reordenarPreguntasFrecuentes).
 */
export function editarPreguntaFrecuente(
  id: number,
  pregunta: string,
  respuesta: string,
  token: string
): Promise<PreguntaFrecuente> {
  return fetchAPI<PreguntaFrecuente>(`/api/preguntas-frecuentes/${id}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify({ pregunta, respuesta }),
  });
}

/** DELETE /api/preguntas-frecuentes/:id — elimina una pregunta frecuente puntual. */
export function eliminarPreguntaFrecuente(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/preguntas-frecuentes/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// Una entrada del array que espera reordenarPreguntasFrecuentes: a qué
// pregunta (por su id) se le asigna qué nueva posición. Mismo tipo,
// dedicado a este recurso (en vez de reutilizar OrdenItemIncluido, que es
// de un recurso distinto y no anidado bajo nada) por claridad.
export interface OrdenPreguntaFrecuente {
  id: number;
  orden: number;
}

/**
 * PATCH /api/preguntas-frecuentes/orden — actualiza el "orden" de varias
 * preguntas de una sola vez (ej. al mover una con las flechas de subir/
 * bajar, se manda el nuevo orden de las dos preguntas que intercambiaron
 * posición). Mismo patrón que reordenarItemsIncluidos.
 */
export function reordenarPreguntasFrecuentes(
  ordenArray: OrdenPreguntaFrecuente[],
  token: string
): Promise<PreguntaFrecuente[]> {
  return fetchAPI<PreguntaFrecuente[]>("/api/preguntas-frecuentes/orden", {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify(ordenArray),
  });
}

// ==========================================
// Configuración de contacto del sitio (singleton: teléfono, email,
// horario de atención, mensaje de cobertura). Público leer, admin editar
// — no hay "crear" ni "eliminar", la única fila ya la sembró el seed del
// backend (ver el comentario del tipo ConfiguracionContacto).
// ==========================================

/**
 * GET /api/configuracion-contacto — devuelve la única fila de
 * configuración. Público: la usan tanto el Footer como la página de
 * Contacto del sitio.
 */
export function getConfiguracionContacto(): Promise<ConfiguracionContacto> {
  return fetchAPI<ConfiguracionContacto>("/api/configuracion-contacto");
}

/**
 * PUT /api/configuracion-contacto — edita la configuración. Todos los
 * campos de "datos" son opcionales (ver DatosConfiguracionContacto): solo
 * se manda lo que el admin realmente cambió en el formulario.
 */
export function editarConfiguracionContacto(
  datos: DatosConfiguracionContacto,
  token: string
): Promise<ConfiguracionContacto> {
  return fetchAPI<ConfiguracionContacto>("/api/configuracion-contacto", {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify(datos),
  });
}

// ==========================================
// Redes sociales del negocio (mostradas en el Footer y en la página de
// Contacto). Listar es público; crear/editar/eliminar/reordenar son
// exclusivos del admin.
// ==========================================

/**
 * GET /api/redes-sociales — lista todas las redes sociales, ya
 * ordenadas por "orden" (el orden en que el admin quiere que se muestren).
 */
export function getRedesSociales(): Promise<RedSocial[]> {
  return fetchAPI<RedSocial[]>("/api/redes-sociales");
}

/**
 * POST /api/redes-sociales — crea una red social nueva. No se manda
 * "orden": el backend calcula automáticamente el siguiente (al final de
 * la lista), igual criterio que crearPreguntaFrecuente.
 */
export function crearRedSocial(nombre: string, url: string, token: string): Promise<RedSocial> {
  return fetchAPI<RedSocial>("/api/redes-sociales", {
    method: "POST",
    headers: headersAutenticados(token),
    body: JSON.stringify({ nombre, url }),
  });
}

/**
 * PUT /api/redes-sociales/:id — edita el nombre y/o la url de una red
 * social existente. No toca su "orden" (eso es responsabilidad de
 * reordenarRedesSociales).
 */
export function editarRedSocial(id: number, nombre: string, url: string, token: string): Promise<RedSocial> {
  return fetchAPI<RedSocial>(`/api/redes-sociales/${id}`, {
    method: "PUT",
    headers: headersAutenticados(token),
    body: JSON.stringify({ nombre, url }),
  });
}

/** DELETE /api/redes-sociales/:id — elimina una red social puntual. */
export function eliminarRedSocial(id: number, token: string): Promise<void> {
  return fetchAPI<void>(`/api/redes-sociales/${id}`, {
    method: "DELETE",
    headers: headersAutenticados(token),
  });
}

// Una entrada del array que espera reordenarRedesSociales: a qué red
// social (por su id) se le asigna qué nueva posición.
export interface OrdenRedSocial {
  id: number;
  orden: number;
}

/**
 * PATCH /api/redes-sociales/orden — actualiza el "orden" de varias redes
 * de una sola vez (ej. al mover una con las flechas de subir/bajar).
 * Mismo patrón que reordenarPreguntasFrecuentes.
 */
export function reordenarRedesSociales(ordenArray: OrdenRedSocial[], token: string): Promise<RedSocial[]> {
  return fetchAPI<RedSocial[]>("/api/redes-sociales/orden", {
    method: "PATCH",
    headers: headersAutenticados(token),
    body: JSON.stringify(ordenArray),
  });
}
