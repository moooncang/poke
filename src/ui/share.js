// A short, pasteable summary of a life (for the clipboard or a text download).
import { TOWNS, CAREERS } from '../data/world.js';
import { epithet, medalsOf, trainerCard } from '../sim/achievements.js';
import { careerTitle, infamyOf } from '../sim/standing.js';
import { xpLevel } from '../sim/battle.js';
import { GOALS, goalOf } from '../sim/goals.js';
import { POKEMON } from './assets.js';

const name = id => POKEMON[id]?.name || `#${id}`;

export function shareSummary(life) {
  const town = TOWNS.find(t => t.id === life.town), home = TOWNS.find(t => t.id === life.hometown);
  const card = trainerCard(life);
  const partner = [...life.party, ...life.box].find(m => m.origin === 'partner');
  const lines = [
    `🎮 Pokélife · ${life.name} (${life.age}세${life.ended ? ' · 생애 종료' : ''})`,
    `「${epithet(life)}」 · ${GOALS[goalOf(life)].name}`,
    `${home?.region} ${home?.name} 출신 · 지금은 ${town?.region} ${town?.name}`,
    `${life.career ? `${CAREERS[life.career].name} · ${careerTitle(life)}` : '자율 활동'} · 명성 ${life.reputation}${infamyOf(life) ? ` · 악명 ${infamyOf(life)}` : ''}`,
    partner ? `첫 파트너 ${partner.nickname ? `${partner.nickname}(${name(partner.id)})` : name(partner.id)} Lv.${xpLevel(partner)} · ${life.age - partner.joined}년` : '',
    `파티: ${life.party.map(m => `${m.nickname || name(m.id)} Lv.${xpLevel(m)}`).join(', ') || '없음'}`,
    `배지 ${card.badges} · 챔피언 ${card.champions.length} · 리본 ${card.ribbons} · 심볼 ${card.symbols} · 배틀 ${card.wins}승`,
    `도감 ${life.seen.length}종 · 함께한 동료 ${life.party.length + life.box.length}마리 · 메달 ${medalsOf(life).length}개 · ★${card.stars.length}`,
    `시드 ${life.seed}`,
  ].filter(Boolean);
  return lines.join('\n');
}
