// Events that only open for a life that inherited an egg from the previous generation (state.heritage).
import { TOWNS } from './world.js';
import { josa, poke } from '../sim/text.js';
import { partnerOf } from '../sim/party.js';
import { echoLater } from './event-kit.js';

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
  // The ancestor's own first partner, grown old, comes to the new generation (heritage.partner, from heritageFor).
  { id: 'heritage-old-partner', category: 'family', min: 8, max: 25, weight: () => 6, urgent: s => s.age >= 12,
    when: s => Boolean(s.heritage?.partner) && s.party.length > 0,
    build: s => {
      const p = s.heritage.partner;
      const level = Math.max(10, Math.min(40, Math.round(p.level / 2)));
      return { kind: 'choice', memory: true, title: '선대의 파트너',
        body: `${josa(s.heritage.ancestor, '의', '의')} 첫 파트너였던 ${p.nickname ? `${poke(p.id)} ${josa(p.nickname, '이', '가')}` : poke(p.id, '이', '가')} 오래 머물던 집을 떠나 당신을 찾아왔다. 털은 희끗해졌지만 눈빛은 그대로다. 선대와 함께 Lv.${p.level}까지 싸웠다고 한다.`,
        choices: [
          { label: '함께 지내자고 한다', description: `${poke(p.id)} 합류(Lv.${level}) · 친밀도 70`, tone: 'caring', effects: { bond: 5, joy: 4 },
            join: p.id, joinOrigin: 'gift', joinLevel: level, ...(p.nickname ? { joinNickname: p.nickname } : {}), flag: 'heritage-old-partner',
            outcome: '선대의 파트너가 당신의 파티에 들어왔다. 첫 파트너와 서로 냄새를 맡더니 나란히 엎드렸다.' },
          { label: '선대의 고향에서 편히 쉬게 한다', description: '유대 +3 · 지혜 +2', tone: 'caring', effects: { bond: 3, wisdom: 2 }, flag: 'heritage-old-partner-rest',
            outcome: '선대가 살던 집 마당에 볕 잘 드는 자리를 마련해 주었다. 가끔 찾아가 이야기를 들려주기로 했다.' },
        ] };
    } },
  // The ancestor's closest legendary (heritage.legend) seeks out the heir. It will not be caught: it must be won over,
  // and it comes back once more if the first meeting fails. Joins as a legendary (locked in the party) at a level that
  // follows the trainer (engine legendLevel), never below 30.
  { id: 'heritage-legend', category: 'legend', min: 14, max: 70, once: false, cooldown: 4, weight: () => 8, urgent: s => s.age >= 18,
    when: s => Boolean(s.heritage?.legend) && s.party.length > 0 && !s.flags['heritage-legend-done'] && !s.party.some(m => m.id === s.heritage.legend.id),
    build: s => {
      const l = s.heritage.legend, shown = l.nickname ? `${poke(l.id)} ${josa(l.nickname, '이', '가')}` : poke(l.id, '이', '가');
      return { kind: 'choice', memory: true, title: '선대의 전설',
        body: `${josa(s.heritage.ancestor, '과', '와')} 함께 다니던 전설의 포켓몬 ${shown} 하늘 저편에서 내려왔다. 선대와 같은 피 냄새를 맡은 듯 당신 앞에 멈춰 섰다. 전설은 알을 남기지 않지만, 가문을 기억한다.`,
        encounter: { type: 'legendary', pokemonId: l.id, title: '선대의 전설', subtitle: 'LEGEND OF THE LINE', body: '선대와 함께 다니던 전설의 포켓몬이 당신을 찾아왔다.' },
        choices: [
          { label: '선대의 이름을 부르며 손을 내민다', description: '유대 판정 · 성공하면 파티에 고정 합류', tone: 'caring', effects: { bond: 8, joy: 12, reputation: 8 },
            join: l.id, joinOrigin: 'legend', ...(l.nickname ? { joinNickname: l.nickname } : {}), flag: 'heritage-legend-done',
            outcome: `${shown} 당신의 손에 이마를 댔다. 선대의 전설이 다음 세대의 파티에 들어왔다.`,
            challenge: { stat: 'bond', difficulty: 5, failure: { effects: { bond: 4 }, outcome: '전설은 오래 당신을 바라보다 하늘로 돌아갔다. 아직 때가 아니라는 듯이. 다시 찾아올 것 같다.' } } },
          { label: '배틀로 자격을 증명한다', description: '용기 판정 · 성공하면 파티에 고정 합류', tone: 'bold', effects: { courage: 8, joy: 10, reputation: 10 },
            join: l.id, joinOrigin: 'legend', ...(l.nickname ? { joinNickname: l.nickname } : {}), flag: 'heritage-legend-done',
            outcome: '파트너가 전설의 일격을 버텨 냈다. 전설이 고개를 숙이고 당신 곁에 섰다.',
            challenge: { stat: 'courage', difficulty: 12, failure: { effects: { courage: 4, vitality: -3 }, outcome: '파트너가 쓰러졌다. 전설은 다친 파트너를 한참 내려다보다 떠났다. 다음에는 다를 것이다.' } } },
          { label: '선대의 곁에 두고 보내준다', description: '지혜 +6 · 다시 오지 않음', tone: 'pragmatic', effects: { wisdom: 6, joy: 4 }, flag: 'heritage-legend-done',
            outcome: '전설은 선대의 것이었다. 당신은 당신의 길을 가기로 하고 하늘을 올려다보았다.' },
        ] };
    } },
  // The ancestor's rival had a family too.
  { id: 'heritage-rival-grandchild', category: 'cast', min: 12, max: 50, weight: () => 4,
    when: s => Boolean(s.heritage?.rival) && s.party.length > 0,
    build: s => ({ kind: 'choice', title: '선대 라이벌의 손주',
      body: `${josa(s.heritage.rival, '의', '의')} 손주라는 트레이너가 찾아왔다. 할머니·할아버지 세대에 끝내지 못한 승부를 이어 가고 싶다고 한다. ${josa(s.heritage.ancestor, '은', '는')} ${s.heritage.titles ? `리그 타이틀 ${s.heritage.titles}개를 남긴 트레이너였다.` : '그 라이벌과 평생 겨루었다.'}`,
      choices: [
        { label: '대를 이은 승부를 받아들인다', description: '자동 배틀 · 승패에 따라 명성', tone: 'bold', effects: { courage: 3 }, battle: { kind: 'rival' },
          after: { win: { effects: { reputation: 3 }, outcome: '승부가 끝나자 상대가 선대들의 낡은 사진을 꺼내 보였다.' }, lose: { effects: { wisdom: 2 }, outcome: '졌지만 다음에는 이기겠다고 웃으며 악수했다.' } },
          follow: [echoLater([3, 6], '이어지는 두 집안', `${josa(s.heritage.rival, '의', '의')} 손주가 새 배지를 땄다며 사진을 보냈다. 사진 뒤에 ‘다음 대결은 우리 아이들 차례’라고 적혀 있었다.`, { joy: 3 })],
          outcome: '선대의 이야기를 등에 지고 몬스터볼을 던졌다.' },
        { label: '함께 선대들의 이야기를 나눈다', description: '유대 +3 · 지혜 +2', tone: 'caring', effects: { bond: 3, wisdom: 2 },
          outcome: '두 집안에 전해지는 같은 날의 이야기가 조금씩 달라서 한참을 웃었다.' },
      ] }) },
];
