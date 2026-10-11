import { selectWildEncounter } from '../sim/encounters.js';
// Events that only exist because of the current state of the world, the people around the player and
// earlier decisions. Each storylet: { id, category, min, max, once?, cooldown?, when?(s), weight?(s), build(s) }.
import { TOWNS, CAREERS, NPCS } from './world.js';
import { REGIONS } from './regions.js';
import { regionState, hasCondition, currentRegion, economyFactor, attractiveTowns } from '../sim/world.js';
import { PATHS } from '../sim/people.js';
import { pick, between } from '../sim/random.js';

// Deterministic Fisher–Yates shuffle on the simulation RNG.
function shuffled(s, values) {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i--) { const j = between(s, 0, i); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
import { josa, poke } from '../sim/text.js';

const town = s => TOWNS.find(t => t.id === s.town);
const region = s => REGIONS.find(r => r.id === currentRegion(s));
const opt = (label, description, outcome, extra = {}) => ({ label, description, outcome, effects: {}, ...extra });
const choice = (title, body, choices) => ({ kind: 'choice', title, body, choices });
const working = s => Boolean(s.career) && !s.work.retired;
const rival = s => s.cast.rival, friend = s => s.cast.friend;

const DISASTERS = {
  바다: ['해일 경보', '항구에 해일 경보가 내려졌다. 배와 물가의 포켓몬이 위험하다.'],
  산: ['산사태', '긴 비 끝에 산비탈이 무너져 마을로 가는 길이 막혔다.'],
  숲: ['숲의 화재', '마른 숲에 불이 번지고 있다. 둥지를 잃은 포켓몬들이 마을로 내려온다.'],
  강: ['강의 범람', '강물이 둑을 넘었다. 저지대의 집과 서식지가 잠기고 있다.'],
  도시: ['폭염과 정전', '폭염으로 전력이 끊겼다. 센터의 냉방 장치도 멈췄다.'],
};

export const STORYLETS = [
  // ── Rival ──
  { id: 'rival-meet', category: 'cast', min: 8, max: 18, weight: () => 4, when: s => !rival(s).met && s.party.length,
    build: s => choice('라이벌의 등장', `${town(s).name}의 공터에서 ${josa(rival(s).name, '이라는', '라는')} 또래 트레이너가 말을 걸어왔다. "너도 트레이너야? 누가 더 강한지 겨뤄 보자."`, [
      opt('바로 배틀을 받아들인다', '라이벌 배틀 · 이후 재대결', '첫 라이벌전을 치렀다.', { tone: 'bold', battle: { kind: 'rival' }, cast: { rival: { met: true, path: 'trainer' } },
        after: { win: { cast: { rival: { affinity: -5, power: 4 } } }, lose: { cast: { rival: { affinity: 6 } } } }, follow: [{ id: 'rival-rematch', delay: [3, 6] }] }),
      opt('함께 훈련하자고 제안한다', '유대 +3 · 라이벌과 가까워진다', '라이벌과 매일 저녁 함께 훈련하기로 했다.', { tone: 'caring', effects: { bond: 3, courage: 2 },
        cast: { rival: { met: true, path: 'trainer', affinity: 20 } }, follow: [{ id: 'rival-team-up', delay: [4, 8], p: 0.8 }] }),
      opt('상대하지 않고 지나간다', '지혜 +2 · 앙금이 남을 수 있다', '배틀을 거절하고 집으로 돌아왔다.', { tone: 'easygoing', effects: { wisdom: 2 },
        cast: { rival: { met: true, path: 'trainer', affinity: -15 } }, follow: [{ id: 'rival-grudge', delay: [5, 10], p: 0.6 }] }),
    ]) },
  { id: 'rival-duel', category: 'cast', once: false, cooldown: 5, min: 13, max: 70, weight: () => 1.2,
    when: s => ['trainer', 'elite', 'gymleader'].includes(rival(s).path) && s.party.length,
    build: s => choice('라이벌과의 대련', `${josa(rival(s).name, '이', '가')} 오랜만에 연락해 왔다. 최근 ${josa(PATHS[rival(s).path], '으로', '로')} 지내며 실력이 꽤 늘었다고 한다.`, [
      opt('정식 배틀을 한다', '라이벌 배틀', '라이벌과 진지하게 겨뤘다.', { tone: 'bold', battle: { kind: 'rival' }, after: { win: { cast: { rival: { affinity: 2, power: 2 } } }, lose: { cast: { rival: { affinity: 5 } } } } }),
      opt('연습 경기로 감을 나눈다', '파티 경험치 +40 · 관계 +6', '승패 없이 서로의 포켓몬을 훈련시켰다.', { training: 40, cast: { rival: { affinity: 6 } }, effects: { bond: 2 } }),
      opt('이번엔 사양한다', '여유', '바쁘다며 다음을 기약했다.', { tone: 'easygoing', cast: { rival: { affinity: -4 } }, effects: { joy: 2 } }),
    ]) },
  { id: 'rival-crossroads', category: 'cast', urgent: true, when: s => rival(s).path === 'drifting',
    build: s => choice('흔들리는 라이벌', `${josa(rival(s).name, '이', '가')} ${josa(region(s).villain, '과', '와')} 어울린다는 이야기가 사실인 것 같다. 아직은 돌이킬 수 있을지도 모른다.`, [
      opt('직접 찾아가 설득한다', '유대 판정 · 실패하면 조직에 남는다', '라이벌은 고개를 끄덕이고 조직과의 연락을 끊었다.', { tone: 'caring', effects: { bond: 5, reputation: 3 }, world: { safety: 3 }, cast: { rival: { path: 'reformed', affinity: 25 } },
        challenge: { stat: 'bond', difficulty: 15, failure: { cast: { rival: { path: 'villain', affinity: -5 } }, effects: { joy: -4 }, follow: [{ id: 'rival-clash', delay: [2, 5] }], outcome: '라이벌은 "네가 뭘 알아"라며 문을 닫았다.' } } }),
      opt('경찰에 알린다', '치안 +6 · 관계 크게 악화', '제보를 받은 경찰이 조직의 거점을 단속했다.', { tone: 'pragmatic', world: { safety: 6 }, effects: { reputation: 2 }, cast: { rival: { path: 'villain', affinity: -25 } }, follow: [{ id: 'rival-clash', delay: [3, 7], p: 0.5 }] }),
      opt('모른 척한다', '여유', '자신의 일에만 집중하기로 했다.', { tone: 'easygoing', cast: { rival: { path: 'villain', affinity: -5 } }, follow: [{ id: 'rival-clash', delay: [2, 6], p: 0.8 }] }),
    ]) },
  { id: 'rival-gym-exam', category: 'cast', min: 22, weight: () => 3, when: s => rival(s).path === 'trainer' && rival(s).power >= 60,
    build: s => choice('라이벌의 관장 시험', `${josa(rival(s).name, '이', '가')} ${region(s).name}지방 체육관 관장 시험을 본다. 시험관 측에서 대련 상대를 구한다.`, [
      opt('시험 상대가 되어 준다', '라이벌 배틀 · 지면 라이벌이 관장이 된다', '시험장에서 라이벌과 마주 섰다.', { tone: 'bold', battle: { kind: 'rival' },
        after: { win: { cast: { rival: { affinity: 3 } }, outcome: '라이벌은 이번 시험에서 떨어졌다. "다음엔 꼭 붙는다."' }, lose: { cast: { rival: { path: 'gymleader', affinity: 10 } }, outcome: '라이벌은 시험에 합격해 관장이 되었다.' } } }),
      opt('관중석에서 응원한다', '행복 +4 · 라이벌이 관장이 된다', '응원 속에서 라이벌은 시험에 합격했다.', { tone: 'caring', effects: { joy: 4 }, cast: { rival: { path: 'gymleader', affinity: 12 } } }),
      opt('축하 메시지만 보낸다', '여유', '합격 소식을 듣고 짧은 메시지를 보냈다.', { cast: { rival: { path: 'gymleader', affinity: 1 } } }),
    ]) },
  { id: 'rival-gym-invite', category: 'cast', min: 24, weight: () => 3, when: s => rival(s).path === 'gymleader' && rival(s).affinity >= 45,
    build: s => choice('관장이 된 라이벌의 제안', `관장 ${josa(rival(s).name, '이', '가')} 체육관 트레이너로 함께 일하자고 제안했다.`, [
      opt('체육관 트레이너가 된다', '진로: 트레이너 · 직업 만족 상승', '체육관 트레이너로 일하기 시작했다.', { tone: 'bold', career: 'traveler', work: { satisfaction: 25 }, effects: { courage: 6, reputation: 4 }, cast: { rival: { affinity: 8 } } }),
      opt('가끔 대련 상대만 맡는다', '파티 경험치 +50', '주말마다 체육관에 들러 대련을 돕는다.', { training: 50, cast: { rival: { affinity: 5 } } }),
      opt('지금 하는 일을 이어간다', '지혜 +3', '고맙지만 지금의 길을 걷겠다고 답했다.', { effects: { wisdom: 3 } }),
    ]) },

  // ── Friend, sibling, family ──
  { id: 'friend-needs-help', category: 'cast', once: false, cooldown: 5, min: 18, weight: () => 4, when: s => friend(s).needsHelp,
    build: s => choice('친구의 부탁', `일자리를 잃은 ${josa(friend(s).name, '이', '가')} 조심스럽게 생활비를 빌려 달라고 했다.`, [
      opt('500P를 빌려준다', '500P · 나중에 돌아올 수도 있다', '돈을 건네며 천천히 갚으라고 했다.', { cost: 500, tone: 'caring', effects: { money: -500, bond: 3 },
        cast: { friend: { affinity: 15, needsHelp: false } }, follow: [{ id: 'friend-repay', delay: [2, 5], data: { amount: 500 } }] }),
      opt('일자리를 함께 알아본다', '지혜 판정', '함께 구인 공고를 뒤진 끝에 일자리를 찾았다.', { tone: 'curious', effects: { wisdom: 3 }, cast: { friend: { path: 'worker', needsHelp: false, affinity: 12 } },
        challenge: { stat: 'wisdom', difficulty: 5, failure: { cast: { friend: { affinity: 4 } }, outcome: '좋은 자리를 찾지 못했지만 친구는 마음만으로도 고맙다고 했다.' } } }),
      opt('형편이 어렵다며 거절한다', '관계 악화', '미안하다고 말하고 전화를 끊었다.', { tone: 'pragmatic', cast: { friend: { affinity: -15, needsHelp: false } }, follow: [{ id: 'friend-drift', delay: [3, 6], p: 0.5 }] }),
    ]) },
  { id: 'friend-venture', category: 'cast', min: 24, max: 58, weight: s => 1 + (hasCondition(s, 'boom') ? 2 : 0),
    when: s => ['shopkeeper', 'worker'].includes(friend(s).path) && friend(s).affinity >= 40,
    build: s => choice('친구의 동업 제안', `${josa(friend(s).name, '이', '가')} 포켓몬 용품점을 열 생각이라며 투자를 부탁했다. 결과는 앞으로의 경기에 달려 있다.`, [
      opt('800P를 투자한다', '800P · 몇 년 뒤 경기에 따라 손익', '투자 계약서에 서명했다.', { cost: 800, tone: 'pragmatic', effects: { money: -800 }, cast: { friend: { affinity: 10 } }, follow: [{ id: 'venture-result', delay: [3, 5], data: { amount: 800 } }] }),
      opt('주말마다 가게 일을 돕는다', '150P · 건강 −3', '개업 준비를 몸으로 도왔다.', { tone: 'caring', effects: { money: 150, vitality: -3 }, cast: { friend: { affinity: 8 } } }),
      opt('정중히 거절한다', '변화 없음', '응원만 하겠다고 전했다.', { cast: { friend: { affinity: -3 } } }),
    ]) },
  { id: 'friend-wedding', category: 'cast', once: false, cooldown: 3, weight: () => 4, when: s => friend(s).wedding,
    build: s => choice('친구의 결혼식', `${josa(friend(s).name, '이', '가')} 결혼한다. 축사를 부탁받았다.`, [
      opt('축사를 맡는다', '용기 판정', '떨리는 목소리로 시작했지만 하객 모두를 웃게 했다.', { tone: 'bold', effects: { joy: 8 }, cast: { friend: { affinity: 10, wedding: false } },
        challenge: { stat: 'courage', difficulty: -5, failure: { effects: { joy: 2 }, cast: { friend: { affinity: 6, wedding: false } }, outcome: '중간에 말이 막혔지만, 그 장면이 결혼식의 가장 따뜻한 순간으로 남았다.' } } }),
      opt('선물만 보낸다', '200P', '정성껏 고른 선물을 보냈다.', { cost: 200, effects: { money: -200 }, cast: { friend: { affinity: 3, wedding: false } } }),
      opt('일정 때문에 가지 못한다', '관계 −6', '축하 메시지로 대신했다.', { cast: { friend: { affinity: -6, wedding: false } } }),
    ]) },
  { id: 'friend-reunion', category: 'cast', once: false, cooldown: 8, min: 25, weight: () => 1.5, when: s => friend(s).affinity < 35,
    build: s => choice('멀어진 친구', `오래된 사진 속 ${friend(s).name}의 얼굴을 보다가 마지막 연락이 언제였는지 떠올리지 못했다.`, [
      opt('먼저 연락한다', '행복 +4 · 관계 회복', '어색한 첫마디 뒤로 이야기가 끝없이 이어졌다.', { tone: 'caring', effects: { joy: 4 }, cast: { friend: { affinity: 20 } } }),
      opt('기억 속에 둔다', '지혜 +3', '좋은 기억으로 남겨 두기로 했다.', { effects: { wisdom: 3 }, cast: { friend: { affinity: -5 } } }),
    ]) },
  { id: 'sibling-request', category: 'cast', once: false, cooldown: 7, min: 20, weight: () => 1.3, when: s => s.cast.sibling && s.cast.sibling.path !== 'gone',
    build: s => { const sib = s.cast.sibling; return choice(`${sib.role}의 부탁`, `${sib.role} ${josa(sib.name, '이', '가')} ${sib.path === 'unemployed' ? '당분간 생활비가 필요하다고' : '이사와 새 출발을 도와 달라고'} 연락했다.`, [
      opt('도와준다', '300P · 관계 +12', '필요한 만큼 도왔다.', { cost: 300, tone: 'caring', effects: { money: -300, bond: 3 }, cast: { sibling: { affinity: 12 } }, follow: [{ id: 'sibling-return', delay: [4, 8], p: 0.6 }] }),
      opt('조언만 해 준다', '지혜 +3', '현실적인 계획을 함께 세워 줬다.', { tone: 'curious', effects: { wisdom: 3 }, cast: { sibling: { affinity: 2 } } }),
      opt('거절한다', '관계 −10', '이번에는 도울 수 없다고 말했다.', { tone: 'pragmatic', cast: { sibling: { affinity: -10 } } }),
    ]); } },
  { id: 'family-sick', category: 'cast', urgent: true, when: s => s.cast.family.sick && s.cast.family.path !== 'gone',
    build: s => choice('가족의 병환', `${TOWNS.find(t => t.id === s.hometown).name}에 있는 가족의 건강이 나빠졌다. 누군가 곁에 있어야 한다.`, [
      opt('고향으로 돌아가 곁을 지킨다', '고향으로 이주 · 2년간 수입 감소', '짐을 싸서 고향으로 돌아갔다.', { tone: 'caring', home: true, work: { cut: 2 }, effects: { bond: 6, joy: -2 },
        cast: { family: { health: 15 } }, follow: [{ id: 'family-recover', delay: [2, 4], p: 0.6 }] }),
      opt('치료비를 보낸다', '800P', '좋은 병원에서 치료받도록 비용을 보냈다.', { cost: 800, tone: 'pragmatic', effects: { money: -800, wisdom: 2 }, cast: { family: { health: 10 } } }),
      ...(s.cast.sibling ? [opt(`${josa(s.cast.sibling.role, '과', '와')} 돌봄을 나눈다`, '관계 −6', '돌봄 일정을 나눴지만 대부분은 형제의 몫이 되었다.', { cast: { family: { health: 5 }, sibling: { affinity: -6 } } })] : []),
    ]) },
  { id: 'family-farewell', category: 'cast', urgent: true, when: s => s.cast.family.path !== 'gone' && s.cast.family.health <= 0,
    build: s => { const inheritance = Math.round((s.background?.money || 1000) * 0.6); s.cast.family.path = 'gone';
      return { kind: 'milestone', title: '이별', memory: true, body: `고향의 가족이 세상을 떠났다. 남겨진 집에서 오래된 앨범과 함께 ${inheritance}P가 든 통장을 찾았다.`, effects: { joy: -12, wisdom: 6, money: inheritance } }; } },
  { id: 'mentor-call', category: 'cast', min: 25, weight: () => 1.5, when: s => s.people.length > 0,
    build: s => { const npc = NPCS[s.people[0].id]; return choice('은사의 연락', `${s.age - s.people[0].age}년 전에 만났던 ${josa(npc.name, '이', '가')} 공동 조사를 제안했다.`, [
      opt('공동 연구에 참여한다', '지혜 판정 · 명성', '조사 결과가 지방 연구소의 공식 자료가 되었다.', { tone: 'curious', effects: { wisdom: 8, reputation: 5, money: 300 }, follow: [{ id: 'paper-cited', delay: [4, 9], p: 0.6 }],
        challenge: { stat: 'wisdom', difficulty: 10, failure: { effects: { wisdom: 4 }, outcome: '자료가 부족해 결론을 내지 못했지만 많은 것을 배웠다.' } } }),
      opt('현장 조사에 동행한다', '용기 +5 · 파티 경험치 +40', '험한 길을 함께 걸으며 현장의 감각을 익혔다.', { tone: 'bold', training: 40, effects: { courage: 5 } }),
      opt('정중히 사양한다', '여유', '지금의 생활을 지키기로 했다.', { effects: { joy: 3 } }),
    ]); } },

  // ── Conditions in the current region ──
  { id: 'recession-job', category: 'world', once: false, cooldown: 4, weight: () => 3, when: s => hasCondition(s, 'recession') && working(s),
    build: s => choice('불황의 그늘', `${region(s).name}지방의 경기 침체로 일터가 흔들린다. ${CAREERS[s.career].name}의 수입도 줄어들 전망이다.`, [
      opt('급여 삭감을 받아들이고 버틴다', '2년간 수입 절반 · 이후 보상 가능', '버티기로 했다. 동료들도 같은 선택을 했다.', { tone: 'caring', work: { cut: 2, satisfaction: -8 }, effects: { joy: -3 }, follow: [{ id: 'recession-loyalty', delay: [3, 5], p: 0.8 }] }),
      opt('이직을 준비한다', '지혜 +3 · 직업 전환 기회 증가', '틈틈이 다른 일자리를 알아보기 시작했다.', { tone: 'curious', flag: 'job-hunting', effects: { wisdom: 3 } }),
      opt('나무열매 부업을 시작한다', '300P 투자 · 경기에 따라 수익', '작은 노점을 열었다.', { cost: 300, tone: 'pragmatic', effects: { money: -300 }, follow: [{ id: 'side-business', delay: [1, 3], data: { amount: 300 } }] }),
    ]) },
  { id: 'recession-household', category: 'world', once: false, cooldown: 5, min: 18, weight: () => 2, when: s => hasCondition(s, 'recession'),
    build: s => choice('줄어든 살림', '물가는 오르고 일감은 줄었다. 살림을 다시 계획해야 한다.', [
      opt('씀씀이를 줄인다', '200P 절약 · 행복 −3', '외식과 취미를 줄였다.', { tone: 'pragmatic', effects: { money: 200, joy: -3 } }),
      opt('이웃과 나눔 장터를 연다', '유대 +5 · 치안 +2 · 명성 +2', '남는 물건과 나무열매를 서로 나눴다.', { tone: 'caring', world: { safety: 2 }, effects: { bond: 5, reputation: 2 } }),
      opt('돈을 빌린다', '+600P · 3년 안에 800P 상환', '당장 필요한 돈을 빌렸다.', { tone: 'bold', effects: { money: 600 }, follow: [{ id: 'debt-due', delay: [2, 4], data: { amount: 800 } }] }),
    ]) },
  { id: 'boom-offer', category: 'world', once: false, cooldown: 5, min: 20, max: 70, weight: () => 2.5, when: s => hasCondition(s, 'boom'),
    build: s => choice('개발 붐의 갈림길', `${town(s).name} 외곽에 대형 상업 지구가 들어선다. 투자 제안과 서식지 보호 서명이 동시에 돌고 있다.`, [
      opt('상가에 투자한다', '600P · 몇 년 뒤 경기에 따라 손익', '분양 계약을 맺었다.', { cost: 600, tone: 'pragmatic', effects: { money: -600 }, follow: [{ id: 'investment-result', delay: [3, 6], data: { amount: 600 } }] }),
      opt('서식지 보호 운동에 나선다', '생태 +8 · 경기 −3 · 명성 +4', '주민들과 공청회에 나가 생태 통로를 요구했다.', { tone: 'caring', world: { ecology: 8, economy: -3 }, effects: { courage: 3, reputation: 4 }, follow: [{ id: 'habitat-saved', delay: [2, 5], p: 0.6 }] }),
      opt('공사 현장에서 일한다', '+400P · 건강 −4 · 생태 −2', '몇 달 동안 공사 현장에서 땀을 흘렸다.', { effects: { money: 400, vitality: -4 }, world: { ecology: -2 } }),
    ]) },
  { id: 'syndicate-raid', category: 'world', once: false, cooldown: 4, min: 12, weight: () => 3, when: s => hasCondition(s, 'syndicate') && s.party.length,
    build: s => { const villainRival = rival(s).path === 'villain';
      return choice(`${region(s).villain}의 습격`, `${josa(region(s).villain, '이', '가')} ${town(s).name}의 포켓몬센터를 노리고 있다.${villainRival ? ` 무리 속에 ${rival(s).name}의 얼굴이 보인다.` : ''}`, [
        opt('맞서 싸운다', '조직 배틀 · 이기면 치안 상승, 보복 가능성', '조직원들 앞을 막아섰다.', { tone: 'bold', battle: { kind: 'villain' },
          after: { win: { world: { safety: 10 }, follow: [{ id: 'villain-revenge', delay: [2, 6], p: 0.4 }, { id: 'rescued-pokemon', delay: [1, 2], p: 0.6 }] }, lose: { effects: { vitality: -6, joy: -4 }, world: { safety: -3 } } } }),
        ...(villainRival ? [opt(`${josa(rival(s).name, '을', '를')} 설득한다`, '유대 판정', '라이벌은 동료들을 등지고 센터 쪽으로 돌아섰다.', { tone: 'caring', cast: { rival: { path: 'reformed', affinity: 20 } }, world: { safety: 6 }, effects: { reputation: 4 },
          challenge: { stat: 'bond', difficulty: 20, failure: { cast: { rival: { affinity: -6 } }, outcome: '라이벌은 끝내 눈을 피했다.' } } })] : []),
        opt('주민 대피를 돕는다', '유대 +5 · 치안 +3 · 명성 +3', '아이들과 포켓몬을 안전한 곳으로 옮겼다.', { tone: 'caring', world: { safety: 3 }, effects: { bond: 5, reputation: 3 } }),
        opt('집에 숨어 있는다', '행복 −3 · 치안 −4', '문을 잠그고 소란이 끝나기를 기다렸다.', { tone: 'easygoing', world: { safety: -4 }, effects: { joy: -3 } }),
      ]); } },
  { id: 'climate-disaster', category: 'world', once: false, cooldown: 3, min: 10, weight: () => 3, when: s => hasCondition(s, 'climate'),
    build: s => { const [title, body] = DISASTERS[town(s).environment] || DISASTERS.숲;
      return choice(title, `${town(s).name}: ${body}`, [
        opt('구조 활동에 나선다', '건강 판정 · 명성과 생태 상승', '밤새 구조대와 함께 움직였다.', { tone: 'bold', world: { ecology: 3 }, effects: { reputation: 5, bond: 4 },
          challenge: { stat: 'vitality', difficulty: 10, failure: { effects: { vitality: -10, reputation: 2 }, outcome: '구조 도중 다쳐 한동안 치료를 받았다.' } } }),
        opt('집과 가족을 지킨다', '피해 최소화', '모래주머니를 쌓고 가족 곁을 지켰다.', { tone: 'pragmatic', effects: { bond: 2 } }),
        opt('같은 지방의 다른 마을로 피난한다', '150P · 거주지 이동', '짐을 챙겨 피난했다. 그대로 그 마을에 머물기로 했다.', { tone: 'easygoing', move: 'region', cost: 150, effects: { money: -150 } }),
      ]); } },
  { id: 'outbreak-care', category: 'world', once: false, cooldown: 3, weight: () => 2.5, when: s => hasCondition(s, 'outbreak') && s.age >= 12,
    build: s => choice('포켓몬 감기 유행', `${town(s).name}의 포켓몬센터가 일손 부족을 호소한다.`, [
      opt('센터에서 자원봉사한다', '건강 판정 · 명성 +4', '아픈 포켓몬들을 밤낮으로 돌봤다.', { tone: 'caring', effects: { reputation: 4, bond: 5 },
        challenge: { stat: 'vitality', difficulty: 5, failure: { effects: { vitality: -8, bond: 3 }, outcome: '무리한 끝에 몸살이 나 며칠을 앓았다.' } } }),
      opt('파티를 집에서 쉬게 한다', '안전 · 행복 −2', '외출을 줄이고 파티를 돌봤다.', { tone: 'pragmatic', effects: { bond: 3, joy: -2 } }),
      opt('평소대로 지낸다', '여유 · 감염 위험', '조심하면 괜찮을 거라 생각했다.', { tone: 'easygoing', effects: { joy: 2 }, follow: [{ id: 'partner-sick', delay: [1, 1], p: 0.5 }] }),
    ]) },
  { id: 'league-season', category: 'world', once: false, cooldown: 2, min: 14, weight: s => 2 + (s.disposition.bold || 0) * 0.1, when: s => hasCondition(s, 'league') && s.party.length,
    build: s => choice('리그 본선 개막', `${region(s).name}지방 리그 본선이 열린다. 예선 통과 기준은 명성과 실력이다.`, [
      opt('선수로 출전한다', '리그 배틀 · 승리 시 큰 상금과 명성', '리그 무대에 올랐다.', { tone: 'bold', battle: { kind: 'league' }, after: { win: { flag: 'league-winner', follow: [{ id: 'fame-offer', delay: [1, 3], p: 0.7 }] }, lose: { effects: { courage: 3 } } } }),
      opt('운영 스태프로 일한다', '+300P · 지혜 +3', '경기장 뒤편에서 대회를 굴러가게 했다.', { tone: 'pragmatic', effects: { money: 300, wisdom: 3 } }),
      opt('관중석에서 응원한다', '행복 +5', '목이 쉬도록 응원했다.', { tone: 'easygoing', effects: { joy: 5 } }),
    ]) },
  { id: 'discovery-expedition', category: 'world', once: false, cooldown: 3, min: 14, weight: s => 2 + (s.disposition.curious || 0) * 0.1, when: s => hasCondition(s, 'discovery'),
    build: s => { const far = pick(s, TOWNS.filter(t => t.map !== currentRegion(s))), id = pick(s, far.pool);
      return choice('신종 조사대 모집', `${region(s).name}지방 연구소가 미기록 포켓몬 조사대를 꾸린다.`, [
        opt('조사대에 합류한다', '지혜 판정 · 새 포켓몬 관측', `조사 끝에 ${poke(id, '을', '를')} 관측해 도감에 등록했다.`, { tone: 'curious', observe: id, effects: { reputation: 4, money: 300, wisdom: 4 }, follow: [{ id: 'paper-cited', delay: [5, 10], p: 0.5 }],
          challenge: { stat: 'wisdom', difficulty: 10, failure: { effects: { wisdom: 2 }, outcome: '흔적만 확인하고 돌아왔다.' } } }),
        opt('표본 운반을 돕는다', '+200P · 건강 −2', '무거운 장비를 나르며 조사대를 지원했다.', { tone: 'pragmatic', effects: { money: 200, vitality: -2 } }),
        opt('관심을 두지 않는다', '변화 없음', '평소의 일상을 이어갔다.', { tone: 'easygoing', effects: { joy: 1 } }),
      ]); } },
  { id: 'legend-rumor', category: 'world', once: false, cooldown: 12, min: 16, weight: () => 3, when: s => hasCondition(s, 'legend') && !s.flags['legend-quest'],
    build: s => choice('전설의 흔적', `${region(s).name}지방 곳곳에서 전설의 포켓몬 목격담이 이어진다. 연구소가 장기 조사단을 모집한다.`, [
      opt('조사단에 합류한다', '용기 +5 · 이후 전설과 마주칠 확률 상승', '조사단 명단에 이름을 올렸다.', { tone: 'bold', flag: 'legend-quest', effects: { courage: 5 } }),
      opt('목격 자료만 분석한다', '지혜 +5', '목격 기록의 공통점을 정리했다.', { tone: 'curious', effects: { wisdom: 5 } }),
      opt('소문에 휩쓸리지 않는다', '행복 +2', '하늘을 한 번 올려다보고 하던 일로 돌아갔다.', { tone: 'easygoing', effects: { joy: 2 } }),
    ]) },
  { id: 'harvest-fair', category: 'world', once: false, cooldown: 2, min: 8, weight: () => 2, when: s => hasCondition(s, 'harvest'),
    build: s => { const sales = Math.round(250 * economyFactor(s, currentRegion(s)));
      return choice('풍작 축제', `${town(s).name}에 나무열매 축제가 열렸다.`, [
        opt('노점을 연다', `+${sales}P (경기에 따라 변동)`, '준비한 나무열매 간식이 모두 팔렸다.', { tone: 'pragmatic', effects: { money: sales, vitality: -2 } }),
        opt('나무열매 콘테스트에 나간다', '유대 판정', '파트너와 함께 키운 열매가 상을 받았다.', { tone: 'caring', effects: { bond: 6, money: 200, reputation: 2 },
          challenge: { stat: 'bond', difficulty: 0, failure: { effects: { bond: 2, joy: 2 }, outcome: '수상은 못 했지만 파트너가 열매를 맛있게 먹었다.' } } }),
        opt('축제를 즐긴다', '행복 +6 · 건강 +3', '하루 종일 축제를 돌아다녔다.', { tone: 'easygoing', effects: { joy: 6, vitality: 3 } }),
      ]); } },
  { id: 'migration-wave', category: 'world', once: false, cooldown: 2, min: 8, weight: () => 2, when: s => hasCondition(s, 'migration') && s.party.length,
    build: s => { const far = pick(s, TOWNS.filter(t => t.map !== currentRegion(s))), id = pick(s, far.pool);
      return choice('낯선 무리', `${far.region}지방에서 넘어온 ${poke(id, '이', '가')} 마을 외곽에 무리를 지었다.`, [
        opt('포획을 시도한다', '자동 배틀 · 포획 성공 시 합류', '무리 가장자리의 한 마리에게 다가갔다.', { tone: 'bold', battle: { kind: 'wild', opponent: id, capture: true } }),
        opt('이동 경로를 기록한다', '지혜 +5 · 도감 등록', '무리의 이동을 꼼꼼히 기록했다.', { tone: 'curious', observe: id, effects: { wisdom: 5 } }),
        opt('길을 터 준다', '생태 +3 · 유대 +3', '마을 사람들과 함께 안전한 길을 열어 줬다.', { tone: 'caring', world: { ecology: 3 }, effects: { bond: 3 } }),
      ]); } },

  // ── Opportunities shaped by money, reputation and circumstances ──
  { id: 'relocation-offer', category: 'opportunity', once: false, cooldown: 7, min: 18, max: 68,
    weight: s => { const r = regionState(s); return 1 + (r.economy < 40 ? 1.5 : 0) + (r.safety < 40 ? 1 : 0) + (s.disposition.bold || 0) * 0.05; },
    build: s => { const [a, b] = attractiveTowns(s, s.town), here = regionState(s), cost = Math.round(500 * economyFactor(s, a.map));
      const reason = here.economy < 40 ? '지금 사는 지방은 경기가 좋지 않다.' : here.safety < 40 ? '요즘 동네 치안이 불안하다.' : '새로운 곳에서의 기회가 눈에 들어온다.';
      return choice('이주 제안', `${reason} ${a.region}지방 ${a.name}과 ${b.region}지방 ${b.name}에서 일할 기회가 생겼다.`, [
        opt(`${josa(a.name, '으로', '로')} 이주`, `이사 비용 ${cost}P · ${a.region} 경기 ${s.world.regions[a.map].economy}`, `${josa(a.name, '으로', '로')} 이사했다.`, { tone: 'bold', cost, destination: a.id, effects: { money: -cost, courage: 5 } }),
        opt(`${josa(b.name, '으로', '로')} 이주`, `이사 비용 ${cost}P · ${b.region} 경기 ${s.world.regions[b.map].economy}`, `${josa(b.name, '으로', '로')} 이사했다.`, { tone: 'curious', cost, destination: b.id, effects: { money: -cost, wisdom: 3 } }),
        opt('지금 사는 곳에 머문다', '행복 +4 · 이웃과의 유대', '지금의 동네에 뿌리를 내리기로 했다.', { tone: 'caring', flag: 'rooted', effects: { joy: 4, bond: 2 } }),
      ]); } },
  { id: 'career-shift', category: 'opportunity', once: false, cooldown: 6, min: 24, max: 60,
    weight: s => 1 + Math.max(0, 45 - s.work.satisfaction) / 12 + (s.flags['job-hunting'] ? 2 : 0),
    when: s => working(s) && (s.work.satisfaction < 45 || s.flags['job-hunting'] || s.work.years >= 12),
    build: s => { const options = shuffled(s, Object.entries(CAREERS).filter(([id]) => id !== s.career));
      return choice('일을 바꿀 기회', `${josa(CAREERS[s.career].name, '으로', '로')} ${s.work.years}년. ${s.work.satisfaction < 45 ? '일에서 보람을 느끼지 못한 지 오래다.' : '다른 일을 해 볼 기회가 찾아왔다.'}`, [
        ...options.slice(0, 2).map(([id, c]) => opt(`${josa(c.short, '으로', '로')} 전직`, `${c.description} · 기본 연 수입 ${c.income}P`, `${c.name}의 길을 새로 시작했다.`, { career: id, unflag: 'job-hunting', effects: { courage: 5 } })),
        opt('지금 일을 계속한다', '직업 만족 +10', '익숙한 자리에서 새로운 목표를 세웠다.', { tone: 'caring', unflag: 'job-hunting', work: { satisfaction: 10 }, effects: { wisdom: 3 } }),
      ]); } },
  { id: 'job-offer', category: 'opportunity', once: false, cooldown: 3, min: 17, max: 50, weight: () => 1.8, when: s => !s.career,
    build: s => { const ranked = shuffled(s, Object.entries(CAREERS));
      return choice('일자리 제안', `${town(s).name}에서 사람을 구한다는 공고가 눈에 띄었다. 명성 ${s.reputation}의 지원자를 반기는 곳도 있다.`, [
        ...ranked.slice(0, 2).map(([id, c]) => opt(`${josa(c.short, '으로', '로')} 일한다`, `기본 연 수입 ${c.income}P · ${c.description}`, `${josa(c.name, '으로', '로')} 일하기 시작했다.`, { career: id, effects: { courage: 3 } })),
        opt('아직은 자유롭게 지낸다', '여유 · 행복 +3', '조금 더 내 속도로 살아 보기로 했다.', { tone: 'easygoing', effects: { joy: 3 } }),
      ]); } },
  { id: 'homecoming', category: 'opportunity', once: false, cooldown: 8, min: 35, weight: s => 1 + (s.cast.family.sick ? 2 : 0), when: s => s.town !== s.hometown,
    build: s => choice('귀향 제안', `${TOWNS.find(t => t.id === s.hometown).name}의 옛집이 비어 있다는 소식을 들었다.`, [
      opt('고향으로 돌아간다', '이동 비용 없음 · 행복 +8', '익숙한 골목으로 돌아왔다.', { tone: 'caring', home: true, effects: { joy: 8 }, cast: { family: { health: 5 } } }),
      opt('지금의 마을에 남는다', '행복 +4 · 지혜 +3', '지금의 마을도 고향이 되었다.', { effects: { joy: 4, wisdom: 3 } }),
    ]) },
  { id: 'shelter-adopt', category: 'opportunity', once: false, cooldown: 7, min: 14, weight: s => 1 + (s.disposition.caring || 0) * 0.08,
    build: s => { const { id } = selectWildEncounter(s);
      return choice('보호소의 포켓몬', `보호소에 ${poke(id, '이', '가')} 새 가족을 기다린다. 파티가 가득 차면 누구를 데려갈지 스스로 정한다.`, [
        opt('입양한다', '300P · 파티 합류', `${poke(id, '을', '를')} 가족으로 맞았다.`, { tone: 'caring', cost: 300, join: id, joinOrigin: 'adopted', effects: { money: -300, joy: 6 } }),
        opt('주말 봉사를 한다', '유대 +4', '보호소 청소와 산책을 도왔다.', { effects: { bond: 4 } }),
        opt('후원금만 보낸다', '100P · 명성 +1', '운영비를 후원했다.', { cost: 100, effects: { money: -100, reputation: 1, joy: 2 } }),
      ]); } },
  { id: 'mysterious-egg', category: 'opportunity', once: false, cooldown: 7, min: 10, weight: s => 1 + (s.disposition.caring || 0) * 0.05,
    build: s => { const { id } = selectWildEncounter(s);
      return choice('맡겨진 알', `${town(s).name}의 키우미집에서 주인을 찾지 못한 알을 맡아 줄 사람을 찾는다.`, [
        opt('직접 부화시킨다', '파티 합류 · 가득 차면 스스로 재편성', `따뜻하게 품은 알에서 ${poke(id, '이', '가')} 태어났다.`, { tone: 'caring', join: id, joinOrigin: 'egg', effects: { bond: 5, joy: 4 } }),
        opt('부화 연구에 기증한다', '지혜 +4 · 100P · 도감 등록', '연구소가 부화 기록을 공유해 주었다.', { tone: 'curious', observe: id, effects: { wisdom: 4, money: 100 } }),
        opt(`${josa(friend(s).name, '에게', '에게')} 넘긴다`, '친구 관계 +8', '알을 받은 친구가 몹시 기뻐했다.', { cast: { friend: { affinity: 8 } }, effects: { joy: 2 } }),
      ]); } },
  { id: 'friend-gift', category: 'cast', once: false, cooldown: 12, min: 12, weight: () => 1.5, when: s => friend(s).affinity >= 60,
    build: s => { const { id } = selectWildEncounter(s);
      return choice('친구의 선물', `${friend(s).name}의 포켓몬이 알을 낳았다며 한 마리를 맡아 달라고 했다.`, [
        opt('고맙게 받는다', '파티 합류', `${poke(id, '이', '가')} 새 식구가 되었다.`, { tone: 'caring', join: id, joinOrigin: 'gift', cast: { friend: { affinity: 5 } }, effects: { joy: 5 } }),
        opt('마음만 받는다', '지혜 +2', '지금은 돌볼 여유가 없다며 정중히 사양했다.', { cast: { friend: { affinity: -2 } }, effects: { wisdom: 2 } }),
      ]); } },
  { id: 'home-purchase', category: 'opportunity', min: 25, weight: () => 1.5,
    when: s => !s.flags.homeowner && s.money >= Math.round(3000 * economyFactor(s, currentRegion(s))),
    build: s => { const price = Math.round(3000 * economyFactor(s, currentRegion(s))), far = pick(s, TOWNS.filter(t => t.map !== currentRegion(s)));
      return choice('내 집 마련', `${town(s).name}에 마음에 드는 집이 나왔다. 지금 경기에서는 ${price}P다.`, [
        opt('집을 산다', `${price}P · 이후 매년 생활비 감소`, '열쇠를 받아 든 날, 파트너가 새 집 구석구석을 뛰어다녔다.', { tone: 'pragmatic', cost: price, flag: 'homeowner', effects: { money: -price, joy: 8 } }),
        opt('경기가 나아질 때까지 기다린다', '지혜 +3', '조금 더 지켜보기로 했다.', { tone: 'curious', effects: { wisdom: 3 } }),
        opt('그 돈으로 긴 여행을 떠난다', '600P · 행복 +10 · 다른 지방 탐방', `${far.region}지방을 여행하며 ${poke(far.pool[0], '을', '를')} 만났다.`, { tone: 'easygoing', cost: 600, observe: far.pool[0], effects: { money: -600, joy: 10, courage: 3 } }),
      ]); } },
  { id: 'retirement', category: 'opportunity', once: false, cooldown: 3, min: 58, weight: s => 1 + (s.age - 58) * 0.4 + (s.stats.vitality < 50 ? 1 : 0), when: s => working(s),
    build: s => choice('은퇴를 생각할 때', `${josa(CAREERS[s.career].name, '으로', '로')} ${s.work.years}년을 일했다. 몸과 통장이 각자 다른 이야기를 한다. (소지금 ${s.money}P)`, [
      opt('은퇴한다', '연금 생활 · 행복 +8 · 건강 +5', '정든 일터에 인사를 했다.', { tone: 'easygoing', work: { retired: true }, effects: { joy: 8, vitality: 5 } }),
      opt('후배를 가르치며 조금씩 일한다', '수입 절반 · 명성 +3', '하루 몇 시간만 일하며 후배를 가르친다.', { tone: 'caring', work: { cut: 99 }, effects: { reputation: 3, wisdom: 3 }, follow: [{ id: 'student-success', delay: [3, 6], p: 0.6 }] }),
      opt('아직 현역이다', '건강 −3 · 직업 만족 +5', '조금 더 달려 보기로 했다.', { tone: 'bold', work: { satisfaction: 5 }, effects: { vitality: -3 } }),
    ]) },
  { id: 'scam-offer', category: 'opportunity', min: 25, weight: s => 0.8 + (s.disposition.pragmatic || 0) * 0.1, when: s => s.money >= 1500 && !s.flags['scam-seen'],
    build: () => choice('확실한 수익이라는 제안', '‘희귀 포켓몬 사육 펀드’에 투자하면 2년 만에 두 배가 된다는 설명회에 초대받았다.', [
      opt('1000P를 투자한다', '1000P', '계약서에 서명했다.', { cost: 1000, tone: 'pragmatic', flag: 'scam-seen', effects: { money: -1000 }, follow: [{ id: 'scam-result', delay: [1, 2], data: { amount: 1000 } }] }),
      opt('서류를 꼼꼼히 확인한다', '지혜 판정 · 사기 적발 시 치안·명성 상승', '등록되지 않은 펀드라는 것을 밝혀 신고했다.', { tone: 'curious', flag: 'scam-seen', world: { safety: 3 }, effects: { reputation: 3, wisdom: 4 },
        challenge: { stat: 'wisdom', difficulty: 5, failure: { effects: { wisdom: 2 }, outcome: '수상했지만 증거를 찾지 못해 발을 뺐다.' } } }),
      opt('관심 없다고 말한다', '변화 없음', '설명회장을 나왔다.', { flag: 'scam-seen' }),
    ]) },
  { id: 'overwork', category: 'opportunity', once: false, cooldown: 8, min: 16, weight: s => 0.5 + (s.disposition.bold || 0) * 0.06, when: s => s.stats.vitality < 65,
    build: () => choice('무리한 대가', '계속된 무리로 몸 곳곳이 비명을 지른다.', [
      opt('일정을 비우고 푹 쉰다', '200P · 건강 +10 · 1년 수입 감소', '한동안 아무 일도 하지 않고 쉬었다.', { tone: 'easygoing', cost: 200, work: { cut: 1 }, effects: { money: -200, vitality: 10 } }),
      opt('재활 훈련을 한다', '건강 판정', '꾸준한 재활로 몸을 되찾았다.', { tone: 'pragmatic', effects: { vitality: 8, courage: 2 },
        challenge: { stat: 'vitality', difficulty: 10, failure: { effects: { vitality: 2 }, outcome: '회복이 더뎠다.' } } }),
      opt('참고 계속한다', '건강 −4 · 이후 후유증 가능', '아픈 곳을 모른 척했다.', { tone: 'bold', effects: { vitality: -4, money: 200 }, follow: [{ id: 'chronic-pain', delay: [3, 6], p: 0.6 }] }),
    ]) },
  { id: 'apprentice', category: 'opportunity', min: 30, weight: () => 1.5, when: s => s.reputation >= 35,
    build: () => choice('제자 요청', '이름을 듣고 찾아온 젊은 트레이너가 가르침을 청했다.', [
      opt('제자로 받아들인다', '지혜 +4 · 몇 년 뒤 소식', '매주 훈련 일정을 함께 짰다.', { tone: 'caring', effects: { wisdom: 4, bond: 3 }, follow: [{ id: 'student-success', delay: [4, 8], p: 0.8 }] }),
      opt('실전 대련만 해 준다', '파티 경험치 +40', '말보다 배틀로 가르쳤다.', { tone: 'bold', training: 40 }),
      opt('정중히 거절한다', '여유', '아직 가르칠 준비가 되지 않았다고 답했다.', { effects: { joy: 1 } }),
    ]) },
];
