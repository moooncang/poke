// Korean particle helper: josa('로켓단', '이', '가') → '로켓단이'. Non-Hangul endings use the vowel form.
export function josa(word, withFinal, withoutFinal) {
  const code = String(word).charCodeAt(String(word).length - 1) - 0xac00;
  const final = code >= 0 && code <= 11171 ? code % 28 : 0;
  // '으로' is written '로' after a ㄹ final (마을로, not 마을으로).
  return `${word}${final && !(final === 8 && withFinal === '으로') ? withFinal : withoutFinal}`;
}

// Token for a species name (optionally followed by a particle); the UI swaps in the localized name.
export const poke = (id, withFinal, withoutFinal) => `{poke:${id}${withFinal ? `|${withFinal}|${withoutFinal}` : ''}}`;
export const POKE_TOKEN = /\{poke:(\d+)(?:\|([^|}]*)\|([^}]*))?\}/g;
