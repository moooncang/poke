// What earlier choices turn into, years later. `echo` seeds become automatic records; `choice` seeds become decisions.
// Outcomes read the world as it is *when the seed comes due* (e.g. an investment pays off only if the economy holds).
import { TOWNS } from './world.js';
import { REGIONS } from './regions.js';
import { regionState, currentRegion, shiftRegion } from '../sim/world.js';
import { changeCast } from '../sim/people.js';
import { trainParty } from '../sim/party.js';
import { pick, clamp } from '../sim/random.js';
import { josa, poke } from '../sim/text.js';

const town = s => TOWNS.find(t => t.id === s.town);
const economy = s => regionState(s).economy;
const echo = (title, body, effects = {}) => ({ title, body, effects });
const choice = (title, body, choices) => ({ kind: 'choice', title, body, choices });
const opt = (label, description, outcome, extra = {}) => ({ label, description, outcome, effects: {}, ...extra });

export const CONSEQUENCES = {
  // ── Rival ──
  'rival-rematch': { type: 'choice', when: s => ['trainer', 'elite', 'gymleader'].includes(s.cast.rival.path) && s.party.length,
    build: s => choice('라이벌의 재도전', `${josa(s.cast.rival.name, '이', '가')} 그동안 키운 포켓몬을 데리고 찾아왔다. "이번에는 안 질 거야."`, [
      opt('정식으로 맞붙는다', '라이벌 배틀 · 결과에 따라 관계가 달라진다', '라이벌과 다시 맞붙었다.', { battle: { kind: 'rival' }, effects: { courage: 3 },
        after: { win: { cast: { rival: { affinity: 4, power: 3 } }, follow: [{ id: 'rival-rematch', delay: [4, 8], p: 0.5 }] }, lose: { cast: { rival: { affinity: 8 } }, effects: { joy: -2 } } } }),
      opt('서로의 전술을 공유한다', '유대 +4 · 라이벌과 가까워진다', '배틀 대신 밤늦게까지 전술을 이야기했다.', { effects: { bond: 4, wisdom: 2 }, cast: { rival: { affinity: 10 } } }),
    ]) },
  'rival-team-up': { type: 'choice', when: s => s.cast.rival.path === 'trainer' && s.party.length,
    build: s => choice('라이벌과의 복식 팀', `${josa(s.cast.rival.name, '이', '가')} 함께 훈련하던 시절을 떠올리며 복식 대회에 같이 나가자고 했다.`, [
      opt('복식 대회에 출전한다', '용기 판정 · 성공 시 상금과 명성', '두 사람의 호흡이 맞아 결승까지 올랐다.', { effects: { courage: 5, money: 400, reputation: 4 }, cast: { rival: { affinity: 8, power: 4 } },
        challenge: { stat: 'courage', difficulty: -10, failure: { effects: { courage: 2 }, cast: { rival: { affinity: 4 } }, outcome: '아쉽게 탈락했지만 서로의 약점을 정확히 알게 됐다.' } } }),
      opt('지금은 각자의 길을 간다', '지혜 +3', '제안을 고맙게 거절했다. 언젠가 다시 기회가 올 것이다.', { effects: { wisdom: 3 }, cast: { rival: { affinity: -3 } } }),
    ]) },
  'rival-grudge': { type: 'choice', when: s => s.cast.rival.met && s.cast.rival.path !== 'gone',
    build: s => choice('앙금이 남은 라이벌', `${josa(s.cast.rival.name, '은', '는')} 그날 무시당한 일을 아직 잊지 않았다며 공개 배틀을 신청했다.`, [
      opt('도전을 받아들인다', '라이벌 배틀', '사람들 앞에서 라이벌과 맞붙었다.', { battle: { kind: 'rival' },
        after: { win: { cast: { rival: { affinity: 6 } }, effects: { reputation: 2 } }, lose: { cast: { rival: { affinity: 12 } } } } }),
      opt('그때 일을 사과한다', '라이벌과의 관계 회복', '진심으로 사과하자 라이벌도 굳은 얼굴을 풀었다.', { effects: { wisdom: 3, joy: 2 }, cast: { rival: { affinity: 18 } } }),
    ]) },
  'rival-clash': { type: 'choice', when: s => s.cast.rival.path === 'villain' && s.party.length,
    build: s => choice('조직원이 된 라이벌', `${regionByTown(s).villain} 단속 현장에서 ${josa(s.cast.rival.name, '과', '와')} 마주쳤다. 예전의 눈빛은 남아 있었다.`, [
      opt('배틀로 막아선다', '조직 배틀 · 이기면 라이벌을 설득할 기회', '라이벌의 포켓몬과 정면으로 부딪쳤다.', { battle: { kind: 'villain' },
        after: { win: { cast: { rival: { path: 'reformed', affinity: 20 } }, world: { safety: 6 }, effects: { reputation: 4 }, outcome: '패배한 라이벌은 한참을 말없이 서 있다가 조직을 떠나겠다고 했다.' },
          lose: { world: { safety: -4 }, effects: { joy: -4 }, outcome: '라이벌은 뒤도 돌아보지 않고 사라졌다.' } } }),
      opt('말로 설득한다', '유대 판정', '오래 이야기를 나눴다.', { cast: { rival: { path: 'reformed', affinity: 25 } }, effects: { bond: 6, reputation: 3 },
        challenge: { stat: 'bond', difficulty: 20, failure: { cast: { rival: { affinity: -8 } }, effects: { joy: -3 }, outcome: '라이벌은 "이제 와서 무슨 상관이야"라며 돌아섰다.' } } }),
      opt('경찰에 위치를 알린다', '치안 +8 · 라이벌과의 관계 악화', '라이벌은 체포되었다. 마음 한구석이 무거웠다.', { world: { safety: 8 }, cast: { rival: { path: 'reformed', affinity: -20 } }, effects: { reputation: 3, joy: -3 } }),
    ]) },

  // ── Friends, family, money ──
  'friend-repay': { type: 'echo', build: (s, { data }) => {
    const ok = ['worker', 'shopkeeper', 'researcher'].includes(s.cast.friend.path);
    changeCast(s, { friend: { affinity: ok ? 6 : 2 } });
    return ok ? echo('갚아 온 빚', `${josa(s.cast.friend.name, '이', '가')} 빌린 돈에 고맙다는 편지를 붙여 돌려보냈다.`, { money: Math.round(data.amount * 1.2), joy: 4 })
      : echo('돌아오지 않은 돈', `${josa(s.cast.friend.name, '은', '는')} 아직 형편이 나아지지 않아 빌린 돈을 조금만 보냈다.`, { money: Math.round(data.amount * 0.3), wisdom: 2 });
  } },
  'friend-drift': { type: 'echo', build: s => { changeCast(s, { friend: { affinity: -10 } }); return echo('멀어진 연락', `${josa(s.cast.friend.name, '과', '와')}의 연락이 눈에 띄게 뜸해졌다.`, { joy: -3 }); } },
  'venture-result': { type: 'echo', build: (s, { data }) => {
    const ratio = clamp(0.2 + economy(s) / 50, 0.2, 2.2), money = Math.round(data.amount * ratio);
    changeCast(s, { friend: { affinity: ratio >= 1 ? 8 : -4 } });
    return echo('동업의 결과', `${s.cast.friend.name}의 가게는 ${ratio >= 1.4 ? '지역 명소가 되었다' : ratio >= 1 ? '자리를 잡았다' : '경기를 버티지 못하고 규모를 줄였다'}. 투자금 ${data.amount}P가 ${money}P로 돌아왔다.`, { money, joy: ratio >= 1 ? 4 : -3 });
  } },
  'investment-result': { type: 'echo', build: (s, { data }) => {
    const ratio = clamp(0.1 + economy(s) / 40, 0.1, 2.5), money = Math.round(data.amount * ratio);
    return echo('투자의 결과', `투자한 상가의 가치가 ${ratio >= 1.3 ? '크게 올랐다' : ratio >= 1 ? '조금 올랐다' : '경기에 따라 크게 떨어졌다'}. ${data.amount}P가 ${money}P가 되었다.`, { money, joy: ratio >= 1 ? 3 : -4 });
  } },
  'side-business': { type: 'echo', build: (s, { data }) => {
    const money = Math.round(data.amount * (0.5 + economy(s) / 60));
    return echo('부업의 결과', `시작한 나무열매 장사가 ${money > data.amount ? '쏠쏠한 수입이 되었다' : '본전을 겨우 넘기지 못했다'}. ${money}P를 정산했다.`, { money, wisdom: 2 });
  } },
  'debt-due': { type: 'choice',
    build: (s, { data }) => choice('빚을 갚을 때', `빌린 돈의 상환일이 다가왔다. 이자를 포함해 ${data.amount}P가 필요하다.`, [
      opt('빚을 모두 갚는다', `${data.amount}P 지출`, '빚을 정리했다. 마음이 한결 가벼워졌다.', { cost: data.amount, effects: { money: -data.amount, joy: 4 } }),
      opt('상환을 미룬다', '명성 −5 · 이후 금융 거래에 불리', '상환을 미뤘다. 동네에 좋지 않은 소문이 돌았다.', { effects: { reputation: -5, joy: -4 }, flag: 'bad-credit' }),
    ]) },
  'recession-loyalty': { type: 'echo', when: s => Boolean(s.career),
    build: s => economy(s) >= 45
      ? echo('버틴 보람', '어려운 시기를 함께 버틴 덕분에 책임 있는 자리를 맡게 됐다.', { money: 500, joy: 5, reputation: 3 })
      : echo('길어지는 불황', '버텨 왔지만 경기가 좀처럼 살아나지 않는다. 일의 보람이 줄었다.', { joy: -4 }) },
  'habitat-saved': { type: 'echo', build: s => {
    shiftRegion(s, { ecology: 5 });
    const id = pick(s, town(s).pool);
    if (!s.seen.includes(id)) s.seen.push(id);
    return echo('지켜낸 서식지', `보호 운동 덕분에 남은 숲으로 ${poke(id, '이', '가')} 돌아왔다. 지역 신문에 이름이 실렸다.`, { reputation: 4, joy: 5 });
  } },
  'paper-cited': { type: 'echo', build: () => echo('인용된 기록', '예전에 제출한 조사 자료가 다른 지방 연구소의 논문에 인용되었다.', { reputation: 4, wisdom: 3, money: 200 }) },
  'family-recover': { type: 'echo', when: s => s.cast.family.path !== 'gone',
    build: s => { changeCast(s, { family: { health: 20, sick: false } }); return echo('회복', '곁을 지킨 덕분인지 고향의 가족이 기운을 되찾았다.', { joy: 8, bond: 3 }); } },
  'sibling-return': { type: 'echo', when: s => s.cast.sibling && s.cast.sibling.path !== 'gone',
    build: s => { changeCast(s, { sibling: { affinity: 6 } }); return echo('돌아온 호의', `${josa(s.cast.sibling.name, '이', '가')} 그때 도와줘서 고마웠다며 선물을 보냈다.`, { money: 400, joy: 4 }); } },
  'student-success': { type: 'echo', build: () => echo('제자의 소식', '가르쳤던 트레이너가 체육관 배지를 모두 모았다며 인사를 왔다.', { reputation: 5, joy: 6 }) },
  'chronic-pain': { type: 'echo', build: () => echo('남은 통증', '무리했던 몸이 계절이 바뀔 때마다 신호를 보낸다.', { vitality: -8 }) },
  'scam-result': { type: 'echo', build: (s, { data }) => s.stats.wisdom >= 60
    ? echo('되찾은 돈', '수상한 점을 기록해 둔 덕분에 투자금 일부를 되찾았다.', { money: Math.round(data.amount / 2), wisdom: 3 })
    : echo('사라진 투자금', '‘확실한 수익’을 약속한 사람들은 연락이 끊겼다.', { joy: -6, wisdom: 4 }) },
  'old-teammate': { type: 'choice',
    build: (s, { data }) => choice('옛 동료의 부탁', `「${data.route}」 때 함께했던 동료가 새 의뢰에 손이 모자란다며 연락해 왔다.`, [
      opt('다시 팀을 꾸린다', '건강 −3 · 600P · 명성 +3', '오랜만에 손발을 맞춰 의뢰를 마쳤다.', { effects: { vitality: -3, money: 600, reputation: 3, bond: 3 } }),
      opt('사람을 소개해 준다', '지혜 +3', '믿을 만한 후배를 소개했다.', { effects: { wisdom: 3 }, follow: [{ id: 'student-success', delay: [3, 6], p: 0.5 }] }),
    ]) },
  'second-chance': { type: 'choice', when: s => s.stats.joy > 10,
    build: (s, { data }) => choice(`${data.title} 재도전`, '지난번의 실패를 바탕으로 준비를 다시 했다. 이번에는 무엇이 부족했는지 알고 있다.', [
      opt('다시 도전한다', `${data.statLabel} 판정 · 난이도 완화`, `재도전에 성공했다. ${data.success}`, { effects: { [data.stat]: 6, money: 400, reputation: 3 },
        challenge: { stat: data.stat, difficulty: data.difficulty - 15, failure: { effects: { [data.stat]: 3 }, outcome: '이번에도 넘지 못했다. 그래도 차이는 확실히 줄었다.' } } }),
      opt('다른 길을 찾는다', '여유 · 행복 +4', '미련을 내려놓고 다른 활동에 집중하기로 했다.', { effects: { joy: 4 } }),
    ]) },

  'community-thanks': { type: 'echo', build: s => echo('이웃의 보답', `${town(s).name}의 이웃들이 그때 도와준 일을 잊지 않고 일감을 소개해 줬다.`, { money: 200, joy: 4, reputation: 2 }) },
  'research-note': { type: 'echo', build: () => echo('쓸모 있는 노트', '예전에 적어 둔 관찰 노트가 지역 연구소 자료로 쓰였다.', { wisdom: 3, money: 150 }) },
  'training-payoff': { type: 'echo', when: s => s.party.length, build: s => { trainParty(s, 40); return echo('훈련의 결실', '그때 다져 둔 기본기 덕분에 파티 전체의 동작이 한층 매끄러워졌다. (파티 경험치 +40)', { courage: 2 }); } },
  'rescued-pokemon': { type: 'choice',
    build: s => { const id = pick(s, town(s).pool);
      return choice('구출된 포켓몬', `조직의 창고에서 구출된 ${poke(id, '이', '가')} 아직 사람을 경계한다. 보호소가 돌봐 줄 사람을 찾는다.`, [
        opt('직접 돌본다', '파티 합류 · 가득 차면 스스로 재편성', `시간을 들여 마음을 열게 했다. ${poke(id, '이', '가')} 곁에 남기로 했다.`, { tone: 'caring', join: id, joinOrigin: 'rescued', effects: { bond: 6 } }),
        opt('원래 서식지로 돌려보낸다', '생태 +3 · 유대 +3', '숲 가장자리에서 놓아주자 뒤도 돌아보지 않고 달려갔다.', { tone: 'easygoing', world: { ecology: 3 }, effects: { bond: 3, joy: 3 } }),
      ]); } },

  // ── World ──
  'villain-revenge': { type: 'choice', when: s => s.party.length,
    build: s => choice('조직의 보복', `예전에 막아섰던 ${josa(regionByTown(s).villain, '이', '가')} 집 근처를 맴돌고 있다.`, [
      opt('정면으로 맞선다', '조직 배틀', '보복하러 온 조직원들과 맞섰다.', { battle: { kind: 'villain' }, after: { win: { world: { safety: 6 }, effects: { reputation: 4 } }, lose: { effects: { vitality: -6, joy: -4 } } } }),
      opt('잠시 다른 마을로 피한다', '이사 비용 300P', '소란이 가라앉을 때까지 다른 마을에서 지내기로 했다.', { cost: 300, effects: { money: -300 }, move: 'region' }),
    ]) },
  'partner-sick': { type: 'choice', when: s => s.party.length,
    build: s => choice('아픈 파트너', '유행하던 감기가 결국 파티에도 번졌다. 파트너가 밥을 먹지 않는다.', [
      opt('센터에 입원시킨다', '400P · 확실한 회복', '센터에서 치료를 받고 회복했다.', { cost: 400, effects: { money: -400, bond: 4 } }),
      opt('집에서 직접 돌본다', '건강 판정', '밤새 곁을 지키며 돌봤다.', { effects: { bond: 8 }, challenge: { stat: 'vitality', difficulty: 0, failure: { effects: { bond: 3, vitality: -6, joy: -4 }, outcome: '회복이 더뎌 결국 센터를 찾았다. 둘 다 지쳤다.' } } }),
    ]) },
  'fame-offer': { type: 'choice',
    build: () => choice('방송 출연 제안', '리그에서의 활약을 본 방송국이 출연을 제안했다.', [
      opt('출연한다', '명성 +6 · 800P', '방송 이후 길에서 알아보는 사람이 생겼다.', { effects: { reputation: 6, money: 800, joy: 3 } }),
      opt('조용히 지낸다', '여유 · 행복 +3', '제안을 거절하고 평소대로 지냈다.', { effects: { joy: 3, wisdom: 2 } }),
    ]) },

  // ── Legendary ──
  'legend-return': { type: 'choice', when: s => s.party.length,
    build: (s, { data }) => ({ kind: 'choice', title: '다시 나타난 전설', body: `${poke(data.id, '이', '가')} 다시 모습을 드러냈다. 이번에는 도망치지 않고 이쪽을 바라본다.`,
      encounter: { type: 'legendary', pokemonId: data.id, title: '다시 나타난 전설', subtitle: 'LEGENDARY RETURNS', body: '오래전 만났던 전설의 포켓몬이 당신을 기억하고 있다.' },
      choices: [
        opt('손을 내민다', '유대 판정 · 성공하면 파티 합류', `${poke(data.id, '이', '가')} 다가와 파티에 합류했다.`, { join: data.id, joinOrigin: 'legend', effects: { bond: 10, joy: 15, reputation: 10 },
          challenge: { stat: 'bond', difficulty: 0, failure: { effects: { wisdom: 6 }, outcome: '전설은 고개를 한 번 숙이고 하늘로 돌아갔다.' } } }),
        opt('조용히 배웅한다', '지혜 +8', '서로의 길을 존중하며 배웅했다.', { effects: { wisdom: 8, joy: 6 } }),
      ] }) },
};

function regionByTown(s) { return REGIONS.find(r => r.id === currentRegion(s)); }
