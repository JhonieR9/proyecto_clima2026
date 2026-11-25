// backend/backweb/src/validators/auth.schema.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define los schemas Zod para registro y login. registerSchema exige nombre (mín 2),
//           correo válido (normaliza a minúsculas) y contraseña de 8 a 72 caracteres.
//           loginSchema solo exige correo válido y contraseña no vacía.
// Conectado con: auth.routes.js (lo usa en validate), validators.test.js (prueba sus reglas).
// Rol: Contrato de entrada para autenticación. Ningún dato inválido llega al servicio.
const { z } = require('zod');

// Registro de usuario
const registerSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El email no es válido')
    .max(150),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga'), // límite de bcrypt
});

// Inicio de sesión
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El email no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

module.exports = { registerSchema, loginSchema }; 
