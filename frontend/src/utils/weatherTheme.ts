// frontend/src/utils/weatherTheme.ts
// Mapea la condición del clima (texto que devuelve el backend) a:
//   - un tipo de ícono (para WeatherIcon.vue)
//   - un tema de color (degradado de fondo)
// Así el fondo y el ícono cambian según el clima.

export type WeatherKind =
  | 'sunny'      // despejado
  | 'cloudy'     // nublado / parcialmente nublado
  | 'rain'       // lluvia / llovizna / chubascos
  | 'snow'       // nieve
  | 'storm'      // tormenta eléctrica
  | 'fog';       // niebla

export interface WeatherTheme {
  kind: WeatherKind;
  /** Degradado CSS de fondo (de arriba a abajo). */
  gradient: string;
  /** Color de acento sólido, por si se necesita. */
  accent: string;
}

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

const THEMES: Record<WeatherKind, Omit<WeatherTheme, 'kind'>> = {
  sunny:  { gradient: 'linear-gradient(160deg, #4a90e2 0%, #f6b73c 100%)', accent: '#f6b73c' },
  cloudy: { gradient: 'linear-gradient(160deg, #8e9eab 0%, #5c6b7a 100%)', accent: '#8e9eab' },
  rain:   { gradient: 'linear-gradient(160deg, #4b6cb7 0%, #182848 100%)', accent: '#4b6cb7' },
  snow:   { gradient: 'linear-gradient(160deg, #83a4d4 0%, #b6fbff 100%)', accent: '#b6fbff' },
  storm:  { gradient: 'linear-gradient(160deg, #373b44 0%, #4286f4 100%)', accent: '#4286f4' },
  fog:    { gradient: 'linear-gradient(160deg, #b993d6 0%, #8ca6db 100%)', accent: '#8ca6db' },
};

export function themeFromCondition(condition: string): WeatherTheme {
  const kind = kindFromCondition(condition);
  return { kind, ...THEMES[kind] };
}
