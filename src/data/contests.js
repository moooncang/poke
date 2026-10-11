// Contest storylets: halls in Hoenn, Sinnoh and Kalos (Kalos calls it a showcase), travelling contests elsewhere,
// and the stories around ribbons (display, rivals, the grand festival, becoming a judge).
import { currentRegion } from '../sim/world.js';
import { CONTEST_CATEGORIES, CONTEST_RANKS, CONTEST_FEES, nextContestRank, contestEntrant, contestAppeal, ribbonCount, masterRibbons, ribbonName } from '../sim/contest.js';
import { poke, josa } from '../sim/text.js';
import { echoLater } from './event-kit.js';
import { pick } from '../sim/random.js';

const HALLS = { hoenn: '해안시티 콘테스트 회장', sinnoh: '연고시티 콘테스트 회장', kalos: '포켓몬 쇼케이스 무대' };
const hasHall = s => Object.hasOwn(HALLS, currentRegion(s));
const opt = (label, description, outcome, extra = {}) => ({ label, description, outcome, effects: {}, ...extra });
const RIVALS = ['나리', '수연', '민호', '하늘', '유리', '다온', '세라', '준'];

// The categories worth entering right now: open ranks, best-fitting entrant first.
function openCategories(s, maxRank = 3) {
  return Object.keys(CONTEST_CATEGORIES)
    .map(category => ({ category, rank: nextContestRank(s, category), member: contestEntrant(s, category) }))
    .filter(x => x.member && x.rank <= maxRank)
    .sort((a, b) => contestAppeal(s, b.member, b.category) - contestAppeal(s, a.member, a.category) || a.category.localeCompare(b.category));
}
const entry = (s, { category, rank, member }, verb = '출전한다') => {
  const fee = CONTEST_FEES[rank];
  return opt(`${CONTEST_CATEGORIES[category].name} 부문 ${CONTEST_RANKS[rank]}랭크에 ${verb}`,
    `${poke(member.id)} 출전 · 성공 시 ${ribbonName(category, rank)}${fee ? ` · 참가비 ${fee}P` : ' · 참가비 없음'}`,
    `${poke(member.id, '과', '와')} 무대에 올랐다.`,
    { tone: rank >= 2 ? 'bold' : 'easygoing', contest: { category, rank }, ...(fee ? { cost: fee, effects: { money: -fee } } : {}) });
};
const practice = () => opt('포핀과 포록을 만들어 컨디션을 다듬는다', '파티 친밀도 +3 · 파티 경험치 +10', '나무열매를 갈아 과자를 만들고 포켓몬들과 연기 연습을 했다.', { tone: 'caring', affection: 3, training: 10 });
const watch = () => opt('객석에서 구경만 한다', '행복 +2', '화려한 연기와 박수 소리 속에서 하루를 보냈다.', { tone: 'easygoing', effects: { joy: 2 } });

export const CONTEST_EVENTS = [
  { id: 'contest-hall', category: 'contest', min: 8, max: 85, once: false, cooldown: 2, weight: () => 4,
    when: s => hasHall(s) && s.party.length > 0 && openCategories(s).length > 0,
    build: s => {
      const kalos = currentRegion(s) === 'kalos';
      return { kind: 'choice', title: kalos ? '포켓몬 쇼케이스' : '포켓몬 콘테스트 개최',
        body: `${HALLS[currentRegion(s)]}에서 ${kalos ? '쇼케이스가' : '콘테스트가'} 열린다. 부문마다 노말·슈퍼·하이퍼·마스터랭크가 있고, 우승해야 다음 랭크에 나갈 수 있다. 타입·친밀도·레벨·트레이너의 기분이 연기 점수가 된다. 지금까지 모은 리본 ${ribbonCount(s)}개.`,
        choices: [...openCategories(s).slice(0, 3).map(x => entry(s, x)), practice(), watch()] };
    } },
  { id: 'contest-travelling', category: 'contest', min: 8, max: 80, once: false, cooldown: 4, weight: () => 1.5,
    when: s => !hasHall(s) && s.party.length > 0 && openCategories(s, 1).length > 0,
    build: s => ({ kind: 'choice', title: '순회 콘테스트', body: '천막을 친 순회 콘테스트단이 마을에 왔다. 노말·슈퍼랭크까지만 열리지만 정식 리본을 준다.',
      choices: [...openCategories(s, 1).slice(0, 2).map(x => entry(s, x)), watch()] }) },
  { id: 'contest-costume', category: 'contest', min: 8, max: 70,
    when: s => s.party.some(m => m.id === 25) && hasHall(s),
    build: s => ({ kind: 'choice', title: '옷 입은 피카츄', body: `콘테스트 회장 대기실에서 무대 의상을 빌려준다. ${poke(25, '이', '가')} 거울 앞에서 꼬리를 흔든다.`,
      choices: [
        opt('록스타 의상을 입힌다', '행복 +3 · 파티 친밀도 +2', '전기 기타 소품을 든 피카츄에게 박수가 쏟아졌다.', { effects: { joy: 3 }, affection: 2 }),
        opt('박사 의상을 입힌다', '지혜 +2 · 행복 +2', '작은 안경을 쓴 피카츄가 진지한 표정을 지었다.', { effects: { wisdom: 2, joy: 2 } }),
        opt('평소 모습이 제일이다', '유대 +2', '그대로의 모습이 제일 사랑스럽다고 말해 주었다.', { effects: { bond: 2 } }),
      ] }) },
  { id: 'contest-rival', category: 'contest', min: 10, max: 70, once: false, cooldown: 5, weight: () => 2,
    when: s => ribbonCount(s) >= 2 && s.party.length > 0 && openCategories(s).length > 0,
    build: s => {
      const name = pick(s, RIVALS), best = openCategories(s)[0];
      return { kind: 'choice', title: '라이벌 코디네이터', body: `${josa(name, '이라는', '라는')} 코디네이터가 당신의 리본을 보고 같은 부문 대결을 청했다. 다음 대회에서 정면으로 맞붙자고 한다.`,
        choices: [
          { ...entry(s, best, '도전을 받아들인다'), effects: { ...(entry(s, best).effects), courage: 2 },
            follow: [echoLater([2, 4], '라이벌 코디네이터의 편지', `${josa(name, '이', '가')} 그날 무대 이후로 연기 구성을 완전히 바꿨다며 다음 시즌 초대장을 보냈다.`, { joy: 2, reputation: 1 })] },
          opt('함께 연습하자고 제안한다', '유대 +3 · 파티 경험치 +15', `${josa(name, '과', '와')} 서로의 연기를 봐 주며 하루를 보냈다.`, { tone: 'caring', effects: { bond: 3 }, training: 15 }),
          watch(),
        ] };
    } },
  { id: 'contest-ribbon-case', category: 'contest', min: 8, max: 90,
    when: s => ribbonCount(s) >= 3,
    build: s => ({ kind: 'choice', title: '리본 케이스', body: `모은 리본이 ${ribbonCount(s)}개가 되었다. 서랍에 넣어 두기에는 아깝다.`,
      choices: [
        opt('거실 벽에 걸어 둔다', '행복 +3', '손님이 올 때마다 리본 하나하나의 이야기를 들려주었다.', { effects: { joy: 3 } }),
        opt('마을 센터에 전시한다', '명성 +2 · 행복 +1', '포켓몬센터 한쪽에 작은 리본 전시가 열렸다.', { effects: { reputation: 2, joy: 1 } }),
        opt('포켓몬마다 자기 리본을 달아 준다', '파티 친밀도 +3', '리본을 단 포켓몬들이 서로 뽐내듯 걸었다.', { affection: 3 }),
      ] }) },
  { id: 'contest-grand-festival', category: 'contest', min: 14, max: 85, weight: () => 6, urgent: true,
    when: s => masterRibbons(s) >= 3 && s.party.length > 0 && !s.flags['contest-grand'],
    build: s => {
      const best = Object.keys(CONTEST_CATEGORIES).map(c => ({ category: c, member: contestEntrant(s, c) })).sort((a, b) => contestAppeal(s, b.member, b.category) - contestAppeal(s, a.member, a.category))[0];
      return { kind: 'choice', memory: true, title: '그랜드 페스티벌 초대', body: `마스터랭크 리본 ${masterRibbons(s)}개를 모은 코디네이터에게만 오는 초대장이다. 최고의 코디네이터들이 한 무대에 선다.`,
        choices: [
          opt(`${CONTEST_CATEGORIES[best.category].name} 연기로 최고의 무대에 선다`, `${poke(best.member.id)} 출전 · 마스터랭크 대결 · 참가 기록과 명성`, '조명이 꺼지고 단 한 번의 무대가 시작됐다.',
            { tone: 'bold', flag: 'contest-grand', effects: { reputation: 3, joy: 3 }, contest: { category: best.category, rank: 3 } }),
          opt('후배 코디네이터에게 자리를 양보한다', '유대 +3 · 명성 +1', '무대 뒤에서 긴장한 후배의 리본을 고쳐 매 주었다.', { tone: 'caring', flag: 'contest-grand', effects: { bond: 3, reputation: 1 } }),
        ] };
    } },
  { id: 'contest-judge', category: 'contest', min: 45, max: 95, weight: () => 3,
    when: s => ribbonCount(s) >= 5,
    build: s => ({ kind: 'choice', title: '콘테스트 심사위원 제안', body: `리본 ${ribbonCount(s)}개의 경력을 듣고 지방 콘테스트 협회가 심사위원 자리를 제안했다.`,
      choices: [
        opt('심사위원을 맡는다', '명성 +3 · 300P', '첫 심사에서 점수보다 포켓몬의 표정을 오래 보았다.', { effects: { reputation: 3, money: 300 }, flag: 'contest-judge' }),
        opt('어린 코디네이터를 가르친다', '유대 +3 · 지혜 +2', '포핀 만드는 법부터 무대 인사까지 차근차근 알려 주었다.', { effects: { bond: 3, wisdom: 2 } }),
        opt('정중히 사양한다', '행복 +1', '무대는 이제 젊은 세대의 것이라고 웃었다.', { effects: { joy: 1 } }),
      ] }) },
  { id: 'contest-first-visit', category: 'contest', min: 8, max: 40, weight: () => 3,
    when: s => hasHall(s) && s.party.length > 0 && ribbonCount(s) === 0,
    build: s => ({ kind: 'choice', title: currentRegion(s) === 'kalos' ? '처음 본 쇼케이스' : '처음 본 콘테스트', body: '화려한 연기와 리본 수여식을 처음 보았다. 배틀과는 다른 방식으로 포켓몬의 매력을 보여 주는 세계다.',
      choices: [
        opt('코디네이터 등록을 한다', '콘테스트 부문 정보 · 행복 +2', '등록 카드를 받고 다섯 부문의 설명서를 꼼꼼히 읽었다.', { effects: { joy: 2 }, flag: 'contest-registered' }),
        opt('배틀 쪽이 더 좋다', '용기 +2', '화려한 무대보다 경기장의 함성이 더 마음에 남았다.', { effects: { courage: 2 } }),
      ] }) },
];

