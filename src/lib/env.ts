import { z } from 'zod';

// Validación perezosa: se evalúa al usarse (no al compilar), así `next build`
// funciona sin variables y un entorno mal configurado falla con un mensaje claro.

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  // Solo servidor. Nunca importar este módulo desde código de navegador.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

function parse<T extends z.ZodType>(schema: T, label: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const vars = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas o ausentes (${label}): ${vars}. Ver .env.example`);
  }
  return result.data;
}

export function publicEnv() {
  return parse(publicSchema, 'públicas');
}

export function serverEnv() {
  return parse(serverSchema, 'servidor');
}
