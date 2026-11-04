/**
 * Marco vacío para una foto que todavía no tenemos.
 * Cuando el cliente mande las fotos se reemplaza por <Image> manteniendo el mismo tamaño.
 */
export function MarcoImagen({ etiqueta, className = '' }: { etiqueta: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Espacio reservado para foto: ${etiqueta}`}
      className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-borde bg-crema text-center text-sm font-medium text-muted ${className}`}
    >
      <span className="px-4">Foto: {etiqueta}</span>
    </div>
  );
}
