import { hashSeed } from './random.js';
export const TALENT_FIELDS = {
 battle:{name:'배틀 감각',stat:'courage',career:'traveler'},
 research:{name:'탐구 지능',stat:'wisdom',career:'researcher'},
 care:{name:'포켓몬 교감',stat:'bond',career:'keeper'},
 craft:{name:'제작·경영 감각',stat:'wisdom',career:'merchant'},
};
export const TALENT_TIERS = [null,'기초형','보통','유망주','수재','천재'];
export const TALENT_BONUS = [0,0,2,5,8,12];
export function createTalent(seed) {
 const roll=hashSeed(`${seed}:talent-tier`) % 100;
 return {field:Object.keys(TALENT_FIELDS)[hashSeed(`${seed}:talent-field`)%4],level:roll<12?1:roll<55?2:roll<83?3:roll<97?4:5};
}
export function talentBonus(s, choice) {
 const field=choice.challenge?.talent;
 if (!field || s.talent?.field!==field) return 0;
 return TALENT_BONUS[s.talent.level]+(s.flags?.[`talent-${field}-trained`]?3:0);
}
export function talentGrowth(s) {
 if (!s.talent || s.career!==TALENT_FIELDS[s.talent.field]?.career || s.work.retired) return 1;
 return 1+[0,0,.03,.06,.10,.15][s.talent.level];
}
export const talentLabel=s=>`${TALENT_FIELDS[s.talent.field].name} · ${s.talent.level}/5 ${TALENT_TIERS[s.talent.level]}`;
