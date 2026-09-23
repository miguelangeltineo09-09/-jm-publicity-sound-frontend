// ==========================================
// Mensaje de error reutilizable.
// Forma consistente de mostrar errores en toda la app (ej. cuando falla un
// fetch al backend): mismo estilo en el Home, el catálogo, el formulario de
// reserva, etc., en vez de que cada página invente el suyo.
// ==========================================

interface ErrorMessageProps {
  // Mensaje a mostrar (normalmente el .message de un ApiError de src/lib/api.ts).
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    // role="alert" para que lectores de pantalla anuncien el error de inmediato.
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      {message}
    </div>
  );
}
