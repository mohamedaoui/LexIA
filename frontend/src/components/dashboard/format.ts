import type { UiLang } from "../../i18n";

/** Couleurs des graphiques, validées (saturation, daltonisme, contraste) sur fond blanc. */
export const SERIES = ["#009688", "#eb6834"] as const;
export const SERIES_TRACK = "#d3ece9"; // piste claire de la même teinte (jauges, barres)

const locale = (lang: UiLang) => (lang === "ar" ? "ar-MA" : "fr-FR");

export const formatNumber = (n: number, lang: UiLang) => new Intl.NumberFormat(locale(lang)).format(n);

export const formatPercent = (ratio: number, lang: UiLang) =>
  new Intl.NumberFormat(locale(lang), { style: "percent", maximumFractionDigits: 0 }).format(ratio);

export const formatDay = (iso: string, lang: UiLang, withYear = false) =>
  new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", ...(withYear && { year: "numeric" }) }).format(
    new Date(`${iso}T12:00:00`),
  );

export const formatDateTime = (iso: string, lang: UiLang) =>
  new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/** Maximum « rond » de l'axe (1, 2, 5 × 10ⁿ) au-dessus de la valeur la plus haute. */
export function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!;
  return step * power;
}
