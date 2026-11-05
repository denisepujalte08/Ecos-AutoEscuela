// Crea (o actualiza) un usuario del personal: administración o dueño.
//
//   npm run personal:crear -- persona@ejemplo.com admin
//   npm run personal:crear -- persona@ejemplo.com owner
//
// Genera una contraseña larga al azar y la muestra UNA vez, en esta terminal. No se guarda en ningún archivo.
// Usa la clave service_role de `.env.local` (solo en tu compu o en un servidor, nunca en el navegador).
// Por defecto trabaja contra la base que digan las variables de `.env.local` (en desarrollo, la local).
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const [email, rol] = process.argv.slice(2);
const ROLES = ['admin', 'owner'];

if (!email || !email.includes('@') || !ROLES.includes(rol)) {
  console.error('Uso: npm run personal:crear -- <email> <admin|owner>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
const password = randomBytes(18).toString('base64url');

let userId;
const { data: creado, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  // Si ya existe, se le cambia el rol y la contraseña.
  const { data: lista, error: errLista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existente = lista?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (errLista || !existente) {
    console.error('No se pudo crear el usuario:', error.message);
    process.exit(1);
  }
  userId = existente.id;
  const { error: errPass } = await supabase.auth.admin.updateUserById(userId, { password });
  if (errPass) {
    console.error('No se pudo actualizar la contraseña:', errPass.message);
    process.exit(1);
  }
} else {
  userId = creado.user.id;
}

const { error: errRol } = await supabase.from('profiles').update({ role: rol }).eq('user_id', userId);
if (errRol) {
  console.error('No se pudo asignar el rol:', errRol.message);
  process.exit(1);
}

console.log(`Listo: ${email} ahora es ${rol === 'owner' ? 'dueño' : 'administración'}.`);
console.log(`Contraseña (guardala ahora, no se vuelve a mostrar): ${password}`);
