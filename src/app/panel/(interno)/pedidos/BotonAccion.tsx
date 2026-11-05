'use client';

import { useFormStatus } from 'react-dom';

type Props = {
  accion: (formData: FormData) => Promise<void>;
  campo: 'enrollmentId' | 'studentId';
  valor: string;
  etiqueta: string;
  /** Pregunta antes de enviar: confirmar un pago no se puede deshacer desde acá. */
  confirmacion: string;
};

function Enviar({ etiqueta }: { etiqueta: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      {pending ? 'Procesando…' : etiqueta}
    </button>
  );
}

/** Botón de una acción del personal sobre un pedido. */
export function BotonAccion({ accion, campo, valor, etiqueta, confirmacion }: Props) {
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm(confirmacion)) e.preventDefault();
      }}
    >
      <input type="hidden" name={campo} value={valor} />
      <Enviar etiqueta={etiqueta} />
    </form>
  );
}
