// frontend/src/utils/weatherTheme.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Convierte el texto de la condición en un tema visual. kindFromCondition
//           mapea palabras clave en español a un WeatherKind (storm, snow, rain, fog,
//           cloudy, sunny). themeFromCondition devuelve el tipo y el degradado CSS.
// Conectado con: WeatherIcon.vue (recibe el kind), ResultadoClimaView.vue (aplica el gradiente).
// Rol: Capa de tema dinámico. Separa la lógica clima->diseño de los componentes visuales.

/**
 * Tipo de tiempo detectado a partir del texto de condición.
 * Se usa para elegir el ícono SVG animado y el degradado CSS de fondo.
 */
export type WeatherKind =
  | 'sunny'      // despejado
  | 'cloudy'     // nublado / parcialmente nublado
  | 'rain'       // lluvia / llovizna / chubascos
  | 'snow'       // nieve
  | 'storm'      // tormenta eléctrica
  | 'fog';       // niebla

/**
 * Tema visual completo asociado a un tipo de tiempo.
 * gradient se aplica al fondo de ResultadoClimaView, que cubre toda la pantalla.
 * accent es el color sólido para elementos secundarios (si se necesita).
 */
export interface WeatherTheme {
  kind: WeatherKind;
  /** Degradado CSS de fondo (de arriba a abajo). */
  gradient: string;
  /** Color de acento sólido, por si se necesita. */
  accent: string;
}

/**
 * Convierte el texto de condición en español (generado por getWeatherDescription
 * en weather.service.js) a un WeatherKind usando búsqueda de palabras clave.
 * Se normaliza a minúsculas para ser case-insensitive.
 * Si no se reconoce el texto, se devuelve 'cloudy' como valor por defecto.
 *
 * @param condition  Texto de condición (ej. "Lluvia moderada", "Despejado")
 * @returns          Tipo de tiempo detectado
 */
// Detecta el tipo a partir del texto en español que manda el backend
// (getWeatherDescription en weather.service.js del backend).
export function kindFromCondition(condition: string): WeatherKind {
  const c = (condition || '').toLowerCase();

  if (c.includes('tormenta')) return 'storm';
  if (c.includes('niev') || c.includes('nevada')) return 'snow';
  if (c.includes('lluvia') || c.includes('llovizna') || c.includes('chubasc')) return 'rain';
  if (c.includes('niebla')) return 'fog';
  if (c.includes('nublado') || c.includes('cubierto')) return 'cloudy';
  if (c.includes('despejado')) return 'sunny';

  // "Condiciones cambiantes" y otros -> nublado por defecto.
  return 'cloudy';
}

/**
 * Degradados CSS y colores de acento por tipo de tiempo.
 * Los colores se eligieron para transmitir la sensación del clima sin ser monocromáticos.
 */
const THEMES: Record<WeatherKind, Omit<WeatherTheme, 'kind'>> = {
  sunny:  { gradient: 'linear-gradient(160deg, #2980f0 0%, #f6b73c 100%)', accent: '#f6b73c' },
  cloudy: { gradient: 'linear-gradient(160deg, #6b7b8c 0%, #3a4653 100%)', accent: '#6b7b8c' },
  rain:   { gradient: 'linear-gradient(160deg, #4b6cb7 0%, #0f1b33 100%)', accent: '#4b6cb7' },
  snow:   { gradient: 'linear-gradient(160deg, #5f8bc4 0%, #b6fbff 100%)', accent: '#b6fbff' },
  storm:  { gradient: 'linear-gradient(160deg, #232730 0%, #3a6fd8 100%)', accent: '#3a6fd8' },
  fog:    { gradient: 'linear-gradient(160deg, #9c7fc4 0%, #6b82b5 100%)', accent: '#6b82b5' },
};

/**
 * Devuelve el tema visual completo (kind + gradient + accent) a partir del
 * texto de condición. Es el punto de entrada que usan los componentes visuales.
 *
 * @param condition  Texto de condición (ej. "Lluvia moderada")
 * @returns          Tema con gradiente y tipo de ícono a usar
 */
export function themeFromCondition(condition: string): WeatherTheme {
  const kind = kindFromCondition(condition);
  return { kind, ...THEMES[kind] };
}
