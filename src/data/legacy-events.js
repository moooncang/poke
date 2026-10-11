// Events that only open for a life that inherited an egg from the previous generation (state.heritage).
import { TOWNS } from './world.js';
import { josa, poke } from '../sim/text.js';
import { partnerOf } from '../sim/party.js';

const opt = (label, description, outcome, extra = {}) => ({ label, description, outcome, effects: {}, ...extra });
const ancestorTown = s => TOWNS.find(t => t.id === s.heritage.hometown);

export const LEGACY_EVENTS = [
  { id: 'heritage-album', category: 'family', min: 9, max: 30, weight: () => 4,
    when: s => Boolean(s.heritage) && s.party.length > 0,
    build: s => ({ kind: 'choice', memory: true, title: '선대의 트레이너 카드',
      body: `다락의 상자에서 ${josa(s.heritage.ancestor, '의', '의')} 트레이너 카드와 낡은 사진을 찾았다. 사진 속 ${poke(s.heritage.parent, '이', '가')} 지금 곁에 있는 ${poke(partnerOf(s)?.id ?? s.heritage.egg, '과', '와')} 닮았다.`,
      choices: [
        opt('선대가 걷던 길을 따라가 보기로 한다', '용기 +4 · 유대 +2', '카드에 적힌 첫 체육관의 이름을 수첩에 옮겨 적었다.', { tone: 'bold', effects: { courage: 4, bond: 2 }, flag: 'heritage-footsteps' }),
        opt('사진을 파트너와 함께 오래 들여다본다', '유대 +4 · 행복 +2', '파트너가 사진 속 포켓몬의 자세를 따라 하며 꼬리를 흔들었다.', { tone: 'caring', effects: { bond: 4, joy: 2 }, affection: 3 }),
        opt('카드는 상자에 다시 넣는다', '지혜 +2', '내 길은 내가 정하겠다고 생각하며 상자를 닫았다.', { tone: 'pragmatic', effects: { wisdom: 2 } }),
      ] }) },
  { id: 'heritage-hometown', category: 'family', min: 18, max: 80, weight: () => 3,
    when: s => Boolean(s.heritage) && s.town !== s.heritage.hometown,
    build: s => ({ kind: 'choice', title: `${ancestorTown(s).name}에서 온 편지`,
      body: `${ancestorTown(s).region}지방 ${josa(ancestorTown(s).name, '의', '의')} 이웃이 편지를 보냈다. ${josa(s.heritage.ancestor, '이', '가')} 살던 집 앞 나무가 올해도 꽃을 피웠다고 한다.`,
      choices: [
        opt(`${josa(ancestorTown(s).name, '으로', '로')} 이사한다`, '선대의 고향으로 이주 · 유대 +3', '선대가 살던 마을에 짐을 풀었다. 이웃들이 그 이름을 기억하고 있었다.', { destination: s.heritage.hometown, effects: { bond: 3 } }),
        opt('답장과 사진만 보낸다', '행복 +2', '파트너와 찍은 사진을 동봉해 답장을 보냈다.', { effects: { joy: 2 } }),
      ] }) },
  { id: 'heritage-pass-on', category: 'family', min: 55, max: 100, weight: () => 3,
    when: s => Boolean(s.heritage) && (s.relationship.children > 0 || s.flags['heritage-footsteps']),
    build: s => ({ kind: 'choice', memory: true, title: `${s.heritage.generation}대의 이야기를 정리하다`,
      body: `${s.heritage.lineage.join(' → ')} → ${s.name}. 가문의 트레이너 카드가 한 장씩 늘어 간다. 다음 세대에게 무엇을 남길지 생각한다.`,
      choices: [
        opt('파트너와의 기록을 책으로 엮는다', '지혜 +3 · 명성 +2', '첫 파트너를 만난 날부터 오늘까지를 한 권으로 묶었다.', { effects: { wisdom: 3, reputation: 2 } }),
        opt('어린 트레이너들에게 이야기를 들려준다', '유대 +3 · 파티 경험치 +15', '마을 아이들이 파트너 주위에 둘러앉았다.', { effects: { bond: 3 }, training: 15 }),
      ] }) },
];
