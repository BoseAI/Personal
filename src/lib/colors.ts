/** Colori selezionabili per categorie e conti (palette categoriale validata + neutro). */
export const SWATCHES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948', '#8f8e88']

/** Sfondo tenue per i chip icona: il colore al 16% di opacità. */
export function tint(hex: string, alpha = 0.16): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
