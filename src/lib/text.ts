/** Met en minuscules et retire les accents : « Écartés » → « ecartes ». */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
