// ==========================================
// Tipos compartidos del frontend.
// Reflejan la forma exacta en que el backend (Express + Prisma) devuelve
// cada recurso en JSON. Si el esquema de Prisma cambia, estos tipos deben
// actualizarse junto con él.
// ==========================================

// Estados posibles de una reserva (coincide con el enum EstadoReserva de
// prisma/schema.prisma en el backend). Una reserva nace PENDIENTE; solo el
// admin la pasa a CONFIRMADA (bloquea la fecha para ese equipo) o RECHAZADA
// (la libera).
export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "RECHAZADA";

// Categoría del catálogo (ej. Bocinas, Micrófonos, Luces, Consolas).
// Corresponde al modelo Categoria del backend.
export interface Categoria {
  id: number;
  nombre: string;
  createdAt: string;
}

// Un ítem incluido en el alquiler de un Equipo (ej. "4 monitores", "1
// planta eléctrica"). Corresponde al modelo ItemIncluido del backend;
// "orden" define su posición en la lista que ve el cliente.
export interface ItemIncluido {
  id: number;
  equipoId: number;
  descripcion: string;
  orden: number;
}

// Equipo de sonido/iluminación disponible para alquiler.
// Corresponde al modelo Equipo del backend; "categoria" viene anidada
// porque GET /api/equipos y GET /api/equipos/:id usan `include: { categoria: true }`.
export interface Equipo {
  id: number;
  nombre: string;
  descripcion: string;
  // Prisma serializa el campo Decimal como string en el JSON (para no perder
  // precisión decimal); hay que convertirlo con Number() antes de operar con él.
  precio: string;
  imagenUrl: string | null;
  categoriaId: number;
  disponibleParaAlquiler: boolean;
  createdAt: string;
  updatedAt: string;
  categoria: Categoria;
  // Opcional porque SOLO viene incluido en GET /api/equipos/:id (detalle):
  // ni el listado (GET /api/equipos) ni las respuestas de crear/editar lo
  // traen anidado — quien lo necesite ahí debe pedirlo aparte con
  // getItemsIncluidos() (ver src/lib/api.ts).
  itemsIncluidos?: ItemIncluido[];
}

// Provincia/demarcación de República Dominicana. Corresponde al modelo
// Provincia del backend: se usa para cotizar el costo de viaje según
// dónde sea el evento — el precio del Equipo NO incluye viaje ni dieta.
// La lista es fija (32, cargadas por el seed del backend); solo se edita
// "precioViaje" (ver editarPrecioProvincia en src/lib/api.ts).
export interface Provincia {
  id: number;
  nombre: string;
  // Prisma serializa Decimal como string (igual que "precio" en Equipo);
  // convertir con Number() antes de operar. YA INCLUYE la dieta — no son
  // dos conceptos separados en el sistema.
  precioViaje: string;
  createdAt: string;
  updatedAt: string;
}

// Fila de la tabla intermedia ReservaEquipo del backend: une una Reserva
// con UNO de sus equipos. "equipo" viene anidado porque los endpoints de
// reservas usan `include: { equipos: { include: { equipo: true } } }`.
//
// CAMBIO DE RELACIÓN CLAVE: antes una Reserva tenía un único "equipoId" y
// un único "equipo" anidado (relación 1 a 1). Ahora una reserva representa
// UN EVENTO (una sola fecha/horario) que puede incluir VARIOS equipos, así
// que "Reserva.equipo" se reemplaza por "Reserva.equipos" — un ARRAY de
// estas filas — en vez de un objeto único. Cualquier pantalla que antes
// leía "reserva.equipo.nombre" ahora debe recorrer "reserva.equipos" (ver
// admin/reservas/page.tsx y ReservaDetalleModal.tsx).
export interface ReservaEquipo {
  id: number;
  reservaId: number;
  equipoId: number;
  createdAt: string;
  equipo: Equipo;
}

// Solicitud de alquiler de un cliente para uno o varios equipos, todos
// para el MISMO evento (misma fecha/horario). Corresponde al modelo
// Reserva del backend.
export interface Reserva {
  id: number;
  clienteNombre: string;
  clienteTelefono: string;
  // Obligatorio cuando la reserva viene del formulario público (es el
  // destino al que se envía la factura, ver enviarFacturaPorCorreo en
  // src/lib/api.ts), pero puede ser null cuando el ADMIN la crea a mano
  // desde el panel (POST /api/reservas/admin, ver crearReservaAdmin) sin
  // ese dato — ej. un cliente que reservó en persona o por WhatsApp. Si
  // es null, no se puede enviar la factura de esta reserva por correo.
  clienteEmail: string | null;
  fechaEvento: string;
  // Hora de inicio y fin del evento ("HH:mm"), usadas para coordinar la
  // logística de entrega/recogida de TODOS los equipos de esta reserva
  // (comparten fecha y horario: es un solo evento).
  horaInicio: string;
  horaFin: string;
  // Municipio puntual del evento (ej. "Boca Chica"), dentro de la
  // provincia — dato de ubicación para la logística y la cotización de viaje.
  municipio: string;
  provinciaId: number;
  provincia: Provincia;
  estado: EstadoReserva;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  // Lista completa de equipos elegidos para este evento (mínimo 1). Ver el
  // comentario largo de ReservaEquipo más arriba.
  equipos: ReservaEquipo[];
}

// Un renglón de una Factura: un equipo facturado, con su nombre y precio
// "congelados" (snapshot) al momento de emitir la factura. Corresponde al
// modelo ItemFactura del backend.
export interface ItemFactura {
  id: number;
  facturaId: number;
  equipoNombre: string;
  // Igual que "precio" en Equipo: Prisma serializa Decimal como string.
  precioUnitario: string;
  createdAt: string;
}

// Factura emitida para una reserva ya CONFIRMADA. Corresponde al modelo
// Factura del backend.
//
// CAMBIO DE RELACIÓN CLAVE: antes "equipoNombre"/"precioUnitario" eran
// campos ÚNICOS de la propia Factura (una reserva = un equipo = un
// renglón). Ahora una reserva puede tener varios equipos, así que cada
// uno es su propio ItemFactura — ver "items" más abajo. "precioViajeSnapshot"
// sigue siendo un cargo único por evento (no se multiplica por equipo).
// total = suma de todos los items[].precioUnitario + precioViajeSnapshot.
export interface Factura {
  id: number;
  numeroFactura: string;
  reservaId: number;
  items: ItemFactura[];
  precioViajeSnapshot: string;
  total: string;
  fechaEmision: string;
  createdAt: string;
}

// Datos que el cliente envía al pedir uno o varios equipos, todos para el
// mismo evento (POST /api/reservas). No incluye "estado" ni los campos
// generados por el backend (id, fechas): toda reserva nueva nace
// PENDIENTE, eso lo decide el backend, no el cliente.
export interface CrearReservaPayload {
  clienteNombre: string;
  clienteTelefono: string;
  // Obligatorio: el backend lo exige para poder enviar la factura más
  // adelante (ver enviarFacturaPorCorreo en src/lib/api.ts).
  clienteEmail: string;
  // Antes "equipoId: number" (un solo equipo). Ahora son uno o varios,
  // todos para el MISMO evento (misma fecha/horario) — ver el carrito de
  // reserva (src/context/CarritoContext.tsx).
  equipoIds: number[];
  // Fecha del evento en formato ISO (ej. "2026-12-15").
  fechaEvento: string;
  // Hora de inicio y fin del evento ("HH:mm"), obligatorias: el backend
  // exige horaFin posterior a horaInicio.
  horaInicio: string;
  horaFin: string;
  // Municipio y provincia del evento: obligatorios, el backend los usa
  // para cotizar el costo de viaje/dieta que se suma al precio de los equipos.
  municipio: string;
  provinciaId: number;
  notas?: string;
}

// Datos que el ADMIN manda al crear una reserva a mano desde el panel
// (POST /api/reservas/admin, ver crearReservaAdmin en src/lib/api.ts).
// Igual que CrearReservaPayload, salvo "clienteEmail": ahí es opcional,
// porque el admin puede estar registrando una reserva de un cliente que
// reservó en persona o por WhatsApp y del que todavía no se tiene el
// correo (queda null en el backend si no se manda).
export interface CrearReservaAdminPayload {
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;
  equipoIds: number[];
  fechaEvento: string;
  horaInicio: string;
  horaFin: string;
  municipio: string;
  provinciaId: number;
  notas?: string;
}

// Tipo de contenido de una publicación de evento: un álbum de fotos
// (carrusel) o un solo video. Coincide con el enum TipoPublicacion del backend.
export type TipoPublicacion = "FOTO" | "VIDEO";

// Una imagen del álbum de una Publicacion de tipo FOTO. Corresponde al
// modelo ImagenPublicacion del backend; "orden" define su posición en el carrusel.
export interface ImagenPublicacion {
  id: number;
  publicacionId: number;
  imagenUrl: string;
  orden: number;
}

// Publicación de un evento ya realizado (foto o video), asociada a un
// equipo protagonista. "equipo" e "imagenes" vienen incluidos en las
// respuestas de LISTAR/DETALLE/EDITAR, pero NO en la de CREAR (el backend
// no las incluye ahí) — por eso, tras crear una publicación, el panel
// vuelve a pedir la lista completa en vez de confiar en la respuesta del
// POST (ver PublicacionFormModal.tsx).
export interface Publicacion {
  id: number;
  titulo: string;
  comentario: string | null;
  tipo: TipoPublicacion;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  equipoId: number;
  destacado: boolean;
  createdAt: string;
  updatedAt: string;
  equipo: Equipo;
  imagenes: ImagenPublicacion[];
}

// Estados posibles de una reseña (coincide con el enum EstadoResena del
// backend). Nace PENDIENTE; solo el admin la pasa a APROBADA (recién ahí
// se vuelve visible públicamente y cuenta para el promedio de un equipo)
// o RECHAZADA.
export type EstadoResena = "PENDIENTE" | "APROBADA" | "RECHAZADA";

// Reseña de un cliente sobre un Equipo. "equipo" viene incluido en las
// respuestas del panel admin (listar todas / cambiar estado).
export interface Resena {
  id: number;
  equipoId: number;
  nombreCliente: string;
  // Estrellas de 1 a 5.
  calificacion: number;
  comentario: string | null;
  estado: EstadoResena;
  createdAt: string;
  equipo: Equipo;
}

// Reseña pública tal como la devuelve GET /api/equipos/:id/resenas: sin
// "equipo" anidado (ya se sabe de qué equipo son, es la respuesta de SU
// propio endpoint) y sin "estado" (esa ruta solo devuelve las APROBADA,
// filtradas en el backend) — a diferencia de Resena, el tipo que usa el
// panel admin para listar reseñas de todos los equipos mezcladas.
export interface ResenaPublica {
  id: number;
  nombreCliente: string;
  calificacion: number;
  comentario: string | null;
  createdAt: string;
}

// Respuesta de GET /api/equipos/:id/resenas: las reseñas aprobadas de ese
// equipo, junto con el promedio de calificación (0 si todavía no hay
// ninguna aprobada) y el total considerado para ese promedio.
export interface ResenasDeEquipo {
  resenas: ResenaPublica[];
  promedio: number;
  total: number;
}

// Datos que un cliente manda al dejar una reseña pública (POST
// /api/resenas). No incluye "estado": toda reseña nace PENDIENTE, eso lo
// decide el backend, no el cliente.
export interface CrearResenaPayload {
  equipoId: number;
  nombreCliente: string;
  // Entero de 1 a 5.
  calificacion: number;
  comentario?: string;
}

// Datos del formulario de equipo del panel admin (crear/editar). Se manda
// como multipart/form-data porque puede incluir un archivo de imagen; por
// eso "imagen" es un File (o null si no se cambia/agrega ninguna), no una
// URL. Todos los campos son opcionales aquí porque al EDITAR solo se
// mandan los que cambiaron (ver editarEquipo en src/lib/api.ts).
export interface DatosEquipoFormulario {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoriaId?: number;
  disponibleParaAlquiler?: boolean;
  imagen?: File | null;
}

// Pregunta frecuente de la sección "Preguntas frecuentes" del sitio
// público. Corresponde al modelo PreguntaFrecuente del backend; "orden"
// define su posición en la lista (0 = primera), igual criterio que
// ItemIncluido.orden.
export interface PreguntaFrecuente {
  id: number;
  pregunta: string;
  respuesta: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

// Configuración de contacto del sitio. Corresponde al modelo
// ConfiguracionContacto del backend, que es un SINGLETON: siempre hay
// exactamente una fila (sembrada por el seed), nunca se crea ni se
// elimina desde el frontend, solo se edita (ver PUT en src/lib/api.ts).
export interface ConfiguracionContacto {
  id: number;
  telefono: string;
  // Puede ser null: todavía no tienen un dominio propio verificado en
  // Resend para un email de negocio (se completa más adelante desde el panel).
  email: string | null;
  horarioAtencion: string;
  mensajeCobertura: string;
  updatedAt: string;
}

// Campos editables de ConfiguracionContacto (PUT /api/configuracion-contacto).
// Todos opcionales: el backend solo actualiza los que vengan en el body,
// así que el formulario del admin puede mandar únicamente lo que cambió.
export interface DatosConfiguracionContacto {
  telefono?: string;
  // "null" vacía el campo a propósito (ver el comentario de arriba);
  // "undefined" (el campo ausente) significa "no tocar este valor".
  email?: string | null;
  horarioAtencion?: string;
  mensajeCobertura?: string;
}

// Red social del negocio (ej. Instagram, Facebook), mostrada en el
// Footer y en la página pública de Contacto. Corresponde al modelo
// RedSocial del backend; "orden" define su posición en ambos lugares
// (0 = primera), igual criterio que PreguntaFrecuente.orden.
export interface RedSocial {
  id: number;
  nombre: string;
  url: string;
  orden: number;
  createdAt: string;
}
