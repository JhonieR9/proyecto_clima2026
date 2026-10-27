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
  sunny:  { gradient: 'linear-gradient(160deg, #2980f0 0%, #f6b73c 100%)', accent: '#f6b73c' },
  cloudy: { gradient: 'linear-gradient(160deg, #6b7b8c 0%, #3a4653 100%)', accent: '#6b7b8c' },
  rain:   { gradient: 'linear-gradient(160deg, #4b6cb7 0%, #0f1b33 100%)', accent: '#4b6cb7' },
  snow:   { gradient: 'linear-gradient(160deg, #5f8bc4 0%, #b6fbff 100%)', accent: '#b6fbff' },
  storm:  { gradient: 'linear-gradient(160deg, #232730 0%, #3a6fd8 100%)', accent: '#3a6fd8' },
  fog:    { gradient: 'linear-gradient(160deg, #9c7fc4 0%, #6b82b5 100%)', accent: '#6b82b5' },
};

export function themeFromCondition(condition: string): WeatherTheme {
  const kind = kindFromCondition(condition);
  return { kind, ...THEMES[kind] };
}
