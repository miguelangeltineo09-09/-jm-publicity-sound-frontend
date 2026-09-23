// ==========================================
// Indicador de carga reutilizable.
// Se usa mientras se espera una respuesta del backend (fetch de categorías,
// equipos, disponibilidad, etc.) para que la espera nunca se vea como una
// pantalla vacía o congelada.
// ==========================================

interface LoadingSpinnerProps {
  // Texto accesible/visible que describe qué se está cargando.
  label?: string;
}

export default function LoadingSpinner({ label = "Cargando..." }: LoadingSpinnerProps) {
  return (
    // role="status" avisa a lectores de pantalla que el contenido está cargando.
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-12 text-muted">
      {/* Acento morado de marca (antes cian), consistente con el resto del sitio. */}
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted/30 border-t-brand-purple" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
