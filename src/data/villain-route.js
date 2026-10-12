// The dark road: the player walks it instead of blocking it (villain-arcs.js is the other side of the street).
// Six groups: temptations that reach an ordinary life, life inside the syndicate (career 'syndicate'), the way out,
// prison, the shadow of infamy, and how the organisation ends. Chains use flags and cooldowns only; the save
// schema is untouched. Flag chains:
//   joining   route-joined (+ route-motive-*) → route-first-job → route-smuggled / route-schemer / route-big-op →
//             route-heist-done → route-boss / route-heir → route-expanded | route-disbanded | route-retired-boss
//   leaving   route-informant (ranger deal) | route-escaped (escape) | route-left-for-friend | arrested (prison) →
//             route-new-name → route-forgiven / route-atoned / route-champion-ally
import { table, check, echoLater, choiceLater, localSpecies } from './event-kit.js';
import { hasCondition, regionState } from '../sim/world.js';
import { isOutlaw, infamyOf, isWanted, inPrison, debtOf, syndicateName, careerTitle } from '../sim/standing.js';
import { poke } from '../sim/text.js';
import { pick } from '../sim/random.js';

const rank = s => isOutlaw(s) ? (s.careerRank || 0) : -1;
const org = s => syndicateName(s);
const rankTitle = s => careerTitle(s);
const married = s => s.relationship.status === 'married';
const hasStolen = s => [...s.party, ...s.box].some(m => m.origin === 'stolen');
const leftOrg = s => Boolean(s.flags['route-escaped'] || s.flags['route-informant'] || s.flags['route-left-for-friend'] || s.flags.arrested || s.flags['route-disbanded'] || s.flags['route-retired-boss']);
// Species a syndicate moves around: rare, sellable, easy to hide.
const CONTRABAND = [133, 147, 123, 246, 371, 443, 610, 704, 885];

// ── 1. 유혹 ── an ordinary life with an empty wallet, a debt, a bad name or a bad neighbourhood.
// Temptation finds people in a tight spot, with a shadow already on their name, or simply living where the shadows are.
const hardTimes = s => s.money < 800 || debtOf(s) > 0 || s.reputation < 25 || regionState(s).safety < 50 || hasCondition(s, 'syndicate')
  || s.cast.rival.path === 'villain' || infamyOf(s) > 0 || (s.flags.shortfalls || 0) > 0;
const tempt = (more = {}) => ({ once: false, cooldown: 6,
  when: s => !isOutlaw(s) && !inPrison(s) && hardTimes(s) && (!more.when || more.when(s)),
  weight: s => 1 + (s.money < 300 ? 1 : 0) + (debtOf(s) > 0 ? 1 : 0) + (hasCondition(s, 'syndicate') ? 0.5 : 0) });
// Joining offers come up more readily than the small favours, so the road is a real option in a life.
// A life in real trouble gets one joining offer for sure (urgent until any offer has been made).
const JOIN_IDS = ['route-tempt-join-rival', 'route-tempt-join-money', 'route-tempt-join-revenge', 'route-tempt-join-family', 'route-tempt-join-ideal'];
const offered = s => JOIN_IDS.some(id => s.used.includes(id));
const temptOnce = (when = () => true) => ({ weight: s => tempt().weight(s) * 4,
  urgent: s => !offered(s) && (s.money < 300 || debtOf(s) > 0 || infamyOf(s) >= 5),
  // Joining offers are not gated on hard times: the organisation recruits anyone it finds useful.
  when: s => !isOutlaw(s) && !inPrison(s) && !s.flags['route-joined'] && when(s) });

const temptations = table('dark', [
  ['route-tempt-courier', 16, 60, '골목의 배달', '뒷골목에서 만난 남자가 작은 상자를 내밀었다. 옆 마을까지만 전해 주면 된다고 했다. 상자 안을 묻지 말라는 조건이 붙었다.', [
    ['상자를 전한다', 'pragmatic', { money: 250, infamy: 4 }, '상자를 넘기자 봉투가 돌아왔다. 받는 쪽은 얼굴을 보여 주지 않았다.',
      { follow: [echoLater([1, 3], '다시 온 남자', '골목의 남자가 다시 찾아왔다. 이번 상자는 더 컸고 봉투도 더 두꺼웠다. 이름을 묻지 않는 사이가 됐다.', { money: 150, infamy: 3 }, 0.5)] }],
    ['상자를 열어 본다', 'curious', { wisdom: 3 }, '안에는 출처를 알 수 없는 몬스터볼이 들어 있었다. 상자를 포켓몬센터 앞에 두고 자리를 떴다.',
      check('wisdom', 8, '봉인을 건드린 것이 들켰다. 돈은커녕 골목에서 한참을 쫓겨 다녔다.', { vitality: -3, infamy: 2 })],
    ['거절한다', 'easygoing', { wisdom: 1 }, '남자는 어깨를 으쓱하고 다른 사람을 찾아갔다.'],
  ], tempt()],
  ['route-tempt-fence', 18, 70, '출처 없는 몬스터볼', '시장 구석에서 몬스터볼을 반값에 파는 사람이 있었다. 볼마다 긁힌 자국이 있고, 안에 든 포켓몬은 사람을 보고 움츠렸다.', [
    ['사서 되판다', 'pragmatic', { money: 300, infamy: 5 }, '한 번 거친 손을 더 거치자 값이 올랐다. 포켓몬의 눈은 보지 않기로 했다.',
      { follow: [echoLater([1, 3], '볼의 주인', '되팔았던 몬스터볼의 원래 주인이 당신을 찾아냈다. 포켓몬은 이미 다른 손에 있었고, 그는 당신 이름을 레인저에게 적어 주고 갔다.', { joy: -2, infamy: 2 }, 0.4)] }],
    ['레인저에게 알린다', 'caring', { reputation: 1 }, '다음 날 좌판은 사라졌다. 볼 안의 포켓몬 몇 마리는 보호소로 갔다.', { world: { safety: 1 } }],
    ['지나친다', 'easygoing', {}, '값이 싼 데는 이유가 있다고 생각하며 걸음을 옮겼다.'],
  ], tempt()],
  ['route-tempt-fixer', 18, 60, '져 달라는 부탁', '다음 경기 상대의 매니저가 조용히 찾아왔다. 3라운드에 포켓몬을 교체하는 척 시간을 끌다 지면 사례를 하겠다고 했다.', [
    ['부탁대로 진다', 'pragmatic', { money: 400, infamy: 6, reputation: -2 }, '관중석에서 야유가 들렸다. 봉투는 두툼했다.'],
    ['받아들인 척하고 이긴다', 'bold', { courage: 3, money: 200, infamy: 8 }, '경기를 이기고 사례금의 절반도 챙겼다. 매니저는 경기장 밖에서 당신의 이름을 적어 갔다.',
      { ...check('courage', 10, '계획이 들통나 경기 전에 봉투를 빼앗겼다. 매니저 쪽 사람들이 한동안 뒤를 따라다녔다.', { vitality: -3, infamy: 4 }),
        follow: [echoLater([1, 3], '매니저의 앙갚음', '그때 속였던 매니저가 다른 대회의 심판을 매수해 당신의 출전을 막았다. 참가비는 돌려받지 못했다.', { money: -200, joy: -2 }, 0.6)] }],
    ['거절한다', 'bold', { courage: 2 }, '매니저는 웃으며 물러났다. 경기에서는 졌지만 마음은 편했다.'],
  ], temptOnce()],
  ['route-tempt-protection', 18, 65, '보호비', '{villain} 사람들이 집 앞까지 와서 이 동네에서 포켓몬을 키우려면 매달 돈을 내야 한다고 했다. 옆집은 이미 내고 있었다.', [
    ['낸다', 'easygoing', { money: -200, joy: -2 }, '봉투를 건네자 그들은 몬스터볼에 손도 대지 않고 돌아갔다. 다음 달이 걱정됐다.'],
    ['거부한다', 'bold', { courage: 3 }, '파트너가 앞에 나서자 그들은 혀를 차며 물러났다.', check('courage', 10, '밤사이 마당이 엉망이 됐다. 다친 파트너를 센터에 데려가야 했다.', { money: -300, vitality: -3 })],
    ['경찰에 신고한다', 'pragmatic', { wisdom: 2 }, '순찰이 늘었다. 그들은 한동안 보이지 않았다.', { world: { safety: 1 }, follow: [echoLater([1, 2], '신고의 대가', '신고한 사람이 누구인지 알아낸 조직이 밤중에 창문을 깼다. 마을 사람들은 모른 척했다.', { joy: -3, money: -150 }, 0.4)] }],
    ['차라리 걷는 쪽에 선다', 'pragmatic', { money: 150, infamy: 5 }, '"그쪽에서 일하면 안 내도 되지?" 그들은 웃으며 다음 주에 오라고 했다.', { flag: 'route-known-to-org' }],
  ], tempt()],
  ['route-tempt-poach', 14, 60, '밀렵꾼의 지도', '낯선 사람이 지도를 펼치고 이 근처 희귀 포켓몬의 서식지를 아느냐고 물었다. 표시해 주면 돈을 주겠다고 했다.', [
    ['서식지를 알려 준다', 'pragmatic', { money: 350, infamy: 5 }, '며칠 뒤 그 숲이 조용해졌다. 돈은 금방 썼다.',
      { world: { ecology: -2 }, follow: [echoLater([1, 3], '조용해진 숲', '그 숲에 다시 가 봤다. 울음소리가 없었다. 파트너가 빈 둥지 앞에서 한참 서 있었다.', { joy: -2, wisdom: 1 }, 0.6)] }],
    ['엉뚱한 곳을 찍어 준다', 'curious', { wisdom: 2, money: 200, infamy: 2 }, '그들은 늪지에서 사흘을 허비하고 돌아갔다. 돈은 이미 받은 뒤였다.',
      check('wisdom', 8, '거짓말이 들통나 돈을 돌려주고 손찌검까지 당했다.', { vitality: -3, infamy: 4 })],
    ['모른다고 한다', 'easygoing', {}, '지도를 접는 손이 못마땅해 보였다. 그날 밤 레인저에게 인상착의를 적어 보냈다.', { world: { ecology: 1 } }],
  ], temptOnce()],
  ['route-tempt-underground', 16, 60, '지하 배틀장', '창고 지하에서 돈을 걸고 하는 배틀이 열린다는 소문을 들었다. 심판도 회복도 없는 곳이다.', [
    ['출전한다', 'bold', { courage: 2 }, '천장이 낮은 창고에서 배틀을 치렀다.', { battle: { kind: 'wild' }, after: { win: { effects: { money: 400, infamy: 4 }, follow: [echoLater([1, 2], '지하의 단골', '지하 배틀장 사람들이 당신 이름을 기억했다. 다음 판의 초대장이 문틈에 끼워져 있었다. 가지 않았는데도 소문은 돌았다.', { infamy: 2 }, 0.5)] }, lose: { effects: { vitality: -3, infamy: 2, money: -200 } } } }],
    ['구경만 한다', 'easygoing', { joy: 2, infamy: 1 }, '돈이 오가는 소리가 배틀 소리보다 컸다. 아는 얼굴이 몇 있었다.'],
    ['돌아선다', 'pragmatic', { wisdom: 1 }, '파트너에게 저런 바닥을 밟게 하고 싶지 않았다.'],
  ], tempt()],
  ['route-tempt-debt-collector', 20, 65, '빚쟁이의 제안', '이자를 받으러 온 사람이 장부를 덮으며 말했다. 일 하나만 해 주면 이번 분기는 없던 걸로 하겠다고. 어떤 일인지는 하겠다고 한 뒤에 알려 준다고 했다.', [
    ['하겠다고 한다', 'pragmatic', { infamy: 6, debt: -500 }, '밤에 어느 창고의 자물쇠를 따 주었다. 장부의 숫자가 줄었다.', { world: { safety: -1 } }],
    ['다른 조건을 제시한다', 'curious', { wisdom: 2, debt: -200 }, '대신 포켓몬을 돌보는 일로 이자를 갚기로 했다.', check('wisdom', 10, '협상은 실패했다. 이자는 그대로였고 사람은 더 험해졌다.', { joy: -3 })],
    ['거절한다', 'bold', { courage: 1, joy: -2 }, '장부가 다시 펼쳐졌다. 다음 달 이자는 그대로였다.'],
  ], tempt({ when: s => debtOf(s) > 0 || hasCondition(s, 'syndicate') })],
  ['route-tempt-smuggle-ride', 18, 60, '밤 배의 조타수', '항구에서 야간에 배를 몰아 줄 사람을 찾고 있었다. 화물은 묻지 말고, 등은 켜지 말라고 했다.', [
    ['배를 몬다', 'bold', { courage: 2, money: 300, infamy: 5 }, '달 없는 바다를 건넜다. 선창에서 포켓몬 울음소리가 들렸다.',
      check('courage', 8, '해안 순찰선에 걸려 배를 버리고 헤엄쳤다. 돈은 받지 못했다.', { vitality: -4, infamy: 8 })],
    ['거절한다', 'easygoing', {}, '배는 다른 사람이 몰았다. 며칠 뒤 그 배가 압수됐다는 소식을 들었다.'],
  ], temptOnce()],
  ['route-tempt-hungry', 16, 40, '배고픈 밤', '지갑이 비었다. 포켓몬센터 뒤 창고에 포켓몬 먹이와 보존식이 쌓여 있는 것을 알고 있었다.', [
    ['창고에서 가져온다', 'pragmatic', { money: 100, infamy: 3 }, '파트너와 나눠 먹었다. 센터 직원이 다음 날 자물쇠를 바꿨다.'],
    ['센터에 부탁한다', 'caring', { bond: 1, reputation: 1 }, '간호사가 아무 말 없이 먹이 한 봉지를 내주었다. 나중에 갚겠다고 했다.'],
    ['참는다', 'easygoing', { vitality: -2, wisdom: 1 }, '물로 배를 채우고 잤다. 파트너가 밤새 곁을 지켰다.'],
  ], tempt({ when: s => s.money < 300 || hasCondition(s, 'syndicate') })],
  // 가입 사건 — 동기별로 다른 문.
  ['route-tempt-join-rival', 16, 50, '{rival}의 권유', s => s.cast.rival.path === 'villain'
    ? '{rival|이|가} 조직의 옷을 입고 찾아왔다. "배지 모으는 것보다 빨라. 네 실력이면 금방 올라가." 같이 가자고 했다.'
    : '{rival|이|가} 낯선 사람과 함께 찾아왔다. 조직에서 사람을 구한다는 말을 전하러 온 것이었다. "나도 생각 중이야."', [
    ['함께 간다', 'bold', { courage: 2, infamy: 5, money: 300 }, '그날 밤 아지트에서 첫 번째 명령을 받았다. 라이벌이 옆자리에 앉았다.',
      { career: 'syndicate', flag: 'route-joined', cast: { rival: { affinity: 8, path: 'villain' } }, description: '조직 가입 · 라이벌과 같은 길' }],
    ['{rival}을 말린다', 'caring', { bond: 2 }, '"너까지 그럴 필요는 없어." 라이벌은 대답하지 않았다.', { cast: { rival: { affinity: -4 } } }],
    ['거절한다', 'easygoing', { wisdom: 1 }, '라이벌은 "나중에 후회하지 마"라며 돌아섰다.', { cast: { rival: { affinity: -6 } } }],
  ], temptOnce(s => s.cast.rival.path === 'villain' || hasCondition(s, 'syndicate'))],
  ['route-tempt-join-money', 18, 55, '빚과 봉투', '집세가 두 달 밀렸다. {villain} 사람이 식탁에 봉투를 올려놓았다. "들어오면 이건 선금이고, 매달 나와." 봉투를 열어 보지 않아도 두께가 느껴졌다.', [
    ['봉투를 받는다', 'pragmatic', { money: 600, infamy: 6 }, '집세를 내고 남은 돈으로 파트너의 먹이를 샀다. 다음 주부터 출근이었다.',
      { career: 'syndicate', flag: 'route-joined', description: '조직 가입 · 돈 때문에' }],
    ['대신 돈을 빌린다', 'pragmatic', { joy: -1 }, '조직 대신 대부업자에게 갔다. 이자는 높았지만 명령은 없었다.',
      { loan: 800, description: '800P 대출 · 빚 +800', follow: [echoLater([2, 4], '대부업자의 방문', '이자가 밀리자 대부업자가 집에 왔다. 파트너의 볼을 한참 들여다보더니 "이것도 값이 나가겠네"라고 했다.', { joy: -3, money: -200 }, 0.5)] }],
    ['버틴다', 'easygoing', { vitality: -2, joy: -2 }, '봉투를 돌려주고 밤에 짐을 나르는 일을 구했다.'],
  ], temptOnce(s => s.money < 300 || debtOf(s) > 0 || hasCondition(s, 'syndicate'))],
  ['route-tempt-join-revenge', 18, 60, '갚아 줄 사람', '당신을 무너뜨린 사람은 여전히 잘 살고 있었다. {villain} 간부가 그 사람의 주소를 적은 쪽지를 건넸다. "우리는 힘이 있고, 너는 이유가 있지."', [
    ['쪽지를 받는다', 'bold', { courage: 3, infamy: 5 }, '그 사람의 가게는 한 달 뒤 문을 닫았다. 속이 후련하지는 않았다. 조직은 다음 일을 맡겼다.',
      { career: 'syndicate', flag: 'route-joined', world: { safety: -1 }, description: '조직 가입 · 복수를 위해',
        follow: [echoLater([2, 4], '닫힌 가게의 아이', '문 닫은 가게 주인의 아이가 길에서 당신을 알아봤다. 아무 말도 하지 않고 지나갔다. 그게 더 오래 남았다.', { joy: -3, wisdom: 1 }, 0.7)] }],
    ['혼자 해결한다', 'bold', { courage: 2 }, '그 사람을 찾아가 배틀로 끝을 봤다.', { battle: { kind: 'wild' }, after: { win: { effects: { joy: 3, infamy: 2 } }, lose: { effects: { joy: -4, vitality: -3 } } } }],
    ['쪽지를 찢는다', 'easygoing', { wisdom: 3 }, '원한은 남았지만 남의 손을 빌리진 않기로 했다.'],
  ], temptOnce(s => s.flags.bankrupt || (s.flags.lost || 0) > 0 || s.reputation < 15 || hasCondition(s, 'syndicate'))],
  ['route-tempt-join-family', 20, 60, '가족의 병원비', '고향에서 전화가 왔다. 수술비가 모자란다고 했다. 다음 날 {villain} 사람이 정확히 그 금액이 적힌 종이를 들고 나타났다.', [
    ['종이에 서명한다', 'caring', { bond: 2, money: 800, infamy: 6 }, '수술은 잘 끝났다. 가족은 돈이 어디서 왔는지 묻지 않았다.',
      { career: 'syndicate', flag: 'route-joined', cast: { family: { health: 10 } }, description: '조직 가입 · 가족을 위해 · 가족 건강 +10',
        follow: [echoLater([1, 3], '돈의 출처', '회복한 가족이 수술비가 어디서 났는지 알게 됐다. 전화는 짧았다. "그 돈으로 살린 목숨이구나."', { joy: -3 }, 0.7)] }],
    ['모금을 돌린다', 'caring', { bond: 3, reputation: 1 }, '마을 사람들과 옛 트레이너 동료들이 조금씩 보탰다. 모자란 만큼은 분할로 갚기로 했다.',
      { cast: { family: { health: 6 } }, ...check('bond', 12, '모금은 절반도 차지 않았다. 수술이 미뤄졌고 가족의 상태가 나빠졌다.', { joy: -4 }, { cast: { family: { health: -6 } } }) }],
    ['병원과 분할 상환을 협의한다', 'pragmatic', { wisdom: 2, debt: 1200 }, '병원이 분할 납부를 받아 주었다. 몇 년은 허리띠를 졸라매야 한다.', { cast: { family: { health: 6 } }, description: '빚 +1,200 · 가족 건강 +6' }],
  ], temptOnce(s => s.cast.family.health < 55 || debtOf(s) > 0 || hasCondition(s, 'syndicate'))],
  ['route-tempt-join-ideal', 16, 45, '해방의 연설', '광장에서 {villain}의 연설자가 말했다. 몬스터볼은 감옥이고, 트레이너는 간수라고. 사람과 포켓몬이 떨어져야 둘 다 자유롭다고. 몇몇은 박수를 쳤고, 당신의 파트너는 당신의 발치에 앉아 있었다.', [
    ['연설에 동참한다', 'curious', { wisdom: 2, infamy: 4 }, '그날 저녁 조직의 모임에 나갔다. 사람들은 진지했고, 아지트 뒤편에는 몬스터볼 상자가 쌓여 있었다.',
      { career: 'syndicate', flag: 'route-joined', description: '조직 가입 · 이상을 믿고',
        follow: [echoLater([1, 3], '상자 속', '아지트 뒤편의 상자를 열어 봤다. 해방될 거라던 포켓몬들은 좁은 볼 안에서 다음 거래를 기다리고 있었다. 연설과 상자는 같은 건물에 있었다.', { wisdom: 2, joy: -2 })] }],
    ['앞에 나가 반박한다', 'bold', { courage: 3, wisdom: 2, reputation: 1 }, '파트너와 함께 단상에 올라 말했다. 자유는 떨어지는 것이 아니라 함께 고르는 것이라고.', { affection: 2 }],
    ['듣기만 한다', 'easygoing', { wisdom: 1 }, '말에 틀린 데가 없진 않았다. 집에 가서 파트너와 오래 눈을 맞췄다.'],
  ], temptOnce()],
]);

// ── 2. 조직 생활 ── inside the syndicate. The engine's income, infamy drift and arrest risk run on top of these.
const inside = (more = {}) => ({ once: false, cooldown: 4, ...more, when: s => isOutlaw(s) && !inPrison(s) && (!more.when || more.when(s)) });
const insideOnce = when => ({ when: s => isOutlaw(s) && !inPrison(s) && (!when || when(s)) });
const working = s => s.flags['route-first-job'];

const organisation = table('dark', [
  ['route-org-first-job', 16, 70, '첫 임무', s => `${org(s)}의 ${rankTitle(s)}으로서 첫 임무를 받았다. 교외의 사육장에서 알 상자를 가져오는 일이다. 사육장은 밤에 레인저 한 사람이 지킨다고 했다.`, [
    ['정면으로 들어간다', 'bold', { courage: 2 }, '레인저의 포켓몬이 길을 막았다.',
      { battle: { kind: 'wild' }, after: { win: { effects: { money: 300, infamy: 5 }, flag: 'route-first-job', outcome: '상자를 들고 빠져나왔다. 조직은 만족했다.', follow: [echoLater([1, 3], '사육장의 소식', '알 상자를 털렸던 사육장이 문을 닫았다는 소식을 들었다. 주인은 빚만 남기고 마을을 떠났다고 했다.', { joy: -2 }, 0.5)] }, lose: { effects: { vitality: -3, joy: -2 }, outcome: '레인저에게 밀려 빈손으로 돌아왔다. 다음 기회가 있다고 했다.' } } }],
    ['뒤에서 망을 본다', 'easygoing', { joy: -2, infamy: 2 }, '다른 사람들이 상자를 들고 나왔다. 손을 더럽히진 않았지만 다를 것도 없었다.', { flag: 'route-first-job' }],
    ['첫날에 도망친다', 'pragmatic', { courage: -1, infamy: -2 }, '사육장 담 앞에서 돌아섰다. 조직은 이름을 지우겠다고 했다. 선금은 돌려주지 않았다.', { leaveCareer: true, description: '조직을 떠남 · 악명 -2' }],
  ], insideOnce(s => !working(s))],
  ['route-org-tribute', 16, 75, '상납금', s => `${org(s)}는 매달 상납금을 받는다. 이번 달 할당액은 300P. 장부를 든 사람이 문 앞에 서 있었다.`, [
    ['낸다', 'easygoing', { money: -300 }, '봉투를 넘기자 장부에 표시가 하나 늘었다.'],
    ['줄여 낸다', 'curious', { wisdom: 2 }, '실적을 부풀린 보고서를 써서 절반만 냈다.', { cost: 150, ...check('wisdom', 10, '장부 담당이 계산을 다시 했다. 벌금까지 물었다.', { money: -350, joy: -2 }) }],
    ['못 낸다고 버틴다', 'bold', { vitality: -4, joy: -2 }, '한 대 맞고 다음 달까지 기한을 받았다.', { work: { satisfaction: -10 } }],
  ], inside({ cooldown: 3, when: working })],
  ['route-org-smuggle-1', 16, 70, '몬스터볼 상자', s => `${org(s)}의 밀수 경로를 맡게 됐다. 상자 하나에 몬스터볼 열두 개. 볼 안의 포켓몬들은 모두 훔친 것이었다.`, [
    ['상자를 운반한다', 'pragmatic', { money: 400, infamy: 6 }, '검문을 피해 밤길로 상자를 넘겼다.', { flag: 'route-smuggled', ...check('courage', 8, '검문에 걸려 상자를 버리고 달아났다. 조직은 손실을 당신 앞으로 달았다.', { vitality: -3, infamy: 3, debt: 400 }, { flag: 'route-smuggled' }) }],
    ['한 마리를 빼돌린다', 'curious', { infamy: 4, bond: 1 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'stolen', flag: 'route-smuggled', outcome: `상자에서 ${poke(id, '을', '를')} 빼내 자신의 볼에 옮겼다. 누군가의 포켓몬이었겠지만 이제는 곁에 있다.`, description: '포켓몬 합류(훔친) · 악명 +4' }; }],
    ['상자를 풀어 준다', 'caring', { bond: 3, infamy: -1 }, '숲 입구에서 볼을 모두 열었다. 몇 마리는 바로 달아났고 몇 마리는 한참 돌아봤다.',
      { world: { ecology: 1 }, flag: 'route-smuggled', follow: [echoLater([1, 2], '손실 추궁', '상자 하나가 통째로 사라진 것을 조직이 추궁했다. 손실액을 월급에서 뗐다.', { money: -300, joy: -2 })] }],
  ], insideOnce(s => working(s) && !s.flags['route-smuggled'])],
  ['route-org-smuggle-2', 18, 70, '큰 거래', s => `${org(s)}가 다른 지방 거래처에 희귀 포켓몬을 넘기는 자리에 ${rankTitle(s)}으로 참석했다. 거래가 끝나면 상자 하나는 수고비로 남는다고 했다.`, [
    ['포켓몬으로 받는다', 'curious', { infamy: 5 }, '', s => { const id = pick(s, CONTRABAND); return { join: id, joinOrigin: 'stolen', joinLevel: 20, outcome: `${poke(id, '이', '가')} 들어 있는 볼을 받았다. 볼 바닥에 지워진 이름이 있었다.`, description: '포켓몬 합류(훔친) · 악명 +5' }; }],
    ['돈으로 받는다', 'pragmatic', { money: 600, infamy: 5 }, '봉투 쪽이 뒤탈이 없다고 생각했다.'],
    ['거래를 망친다', 'caring', { bond: 2, infamy: 2 }, '거래 장소를 레인저에게 흘렸다. 상자는 압수됐고 조직은 거래처 탓을 했다.',
      { world: { ecology: 2 }, ...check('wisdom', 14, '누가 흘렸는지 금방 드러났다. 밤에 끌려가 한참을 맞았다.', { vitality: -6, joy: -3 }, { work: { satisfaction: -15 } }) }],
  ], insideOnce(s => s.flags['route-smuggled'] && rank(s) >= 1)],
  ['route-org-protection', 16, 75, '보호비 걷기', s => `${org(s)}의 구역을 돌며 보호비를 걷는 날이다. 명단에는 가게 열 곳이 있고, 마지막 집은 노부부의 약초 가게다.`, [
    ['명단대로 걷는다', 'pragmatic', { money: 250, infamy: 4 }, '노부부는 잔돈까지 세어 냈다. 거스름돈은 없었다.', { world: { safety: -2 } }],
    ['겁만 주고 돈은 깎아 준다', 'bold', { money: 150, infamy: 3 }, '파트너를 앞세우자 다들 군말 없이 냈다. 노부부에게는 절반만 받았다.',
      { world: { safety: -1 }, ...check('courage', 6, '한 가게 주인이 맞서다 다쳤다. 소문이 돌았고 조직은 실적이 적다고 타박했다.', { vitality: -3, infamy: 5 }, { world: { safety: -2 } }) }],
    ['노부부는 건너뛴다', 'caring', { joy: 2, infamy: 1 }, '명단에서 한 줄을 지웠다. 조직에는 문을 닫았더라고 보고했다.',
      { work: { satisfaction: -5 }, follow: [echoLater([1, 3], '지워진 한 줄', '약초 가게가 명단에서 빠진 것을 다른 조직원이 알아냈다. 그 집은 결국 돈을 냈고, 당신 몫에서도 뺐다.', { money: -150, joy: -2 }, 0.5)] }],
  ], inside({ cooldown: 3, when: working })],
  ['route-org-rival-gang', 18, 70, '경쟁 조직', s => `${org(s)}의 구역에 다른 조직이 들어왔다. 창고 하나를 두고 대치가 시작됐다.`, [
    ['맞선다', 'bold', { courage: 3 }, '창고 앞에서 상대 조직원과 붙었다.',
      { battle: { kind: 'villain' }, after: { win: { effects: { infamy: 5, money: 200 }, world: { safety: -2 } }, lose: { effects: { vitality: -5, money: -300 }, outcome: '밀려났다. 창고는 넘어갔고 치료비는 자기 돈으로 냈다.' } } }],
    ['협상한다', 'curious', { wisdom: 3, infamy: 2 }, '창고를 나눠 쓰기로 했다. 양쪽 모두 만족하진 않았다.', { world: { safety: 1 }, ...check('wisdom', 10, '협상 자리가 싸움으로 번졌다. 양쪽 다 다쳤다.', { vitality: -3, infamy: 3 }) }],
    ['빠진다', 'easygoing', { joy: -1 }, '그날은 아프다고 했다. 조직은 기억해 두었다.', { work: { satisfaction: -5 } }],
  ], inside({ cooldown: 5, when: working })],
  ['route-org-infighting', 18, 70, '내부 암투', s => `${org(s)} 안에서 소대장 둘이 다음 간부 자리를 두고 다투고 있다. 양쪽 모두 ${rankTitle(s)}인 당신을 자기 쪽으로 끌어들이려 한다.`, [
    ['한쪽에 붙는다', 'pragmatic', { money: 200, infamy: 2 }, '봉투를 받고 줄을 섰다. 이긴 쪽이면 좋겠다고 생각했다.',
      { flag: 'route-faction', follow: [choiceLater([1, 3], '줄의 끝', '줄을 섰던 소대장의 운명이 갈렸다.', [
        ['승자 편에 섰다면 승급을 요구한다', 'bold', { infamy: 3 }, '소대장은 약속을 지켰다.', { promotion: true, ...check('courage', 10, '진 쪽이었다. 조직 안에서 자리가 좁아졌다.', { joy: -3 }, { work: { satisfaction: -10 } }) }],
        ['조용히 지낸다', 'easygoing', { wisdom: 1 }, '어느 쪽이 이겼든 고개를 숙이고 지나갔다.'],
      ])] }],
    ['양쪽의 약점을 모아 두목에게 보고한다', 'curious', { wisdom: 3, infamy: 3 }, '두목은 둘 다 내리고 당신을 올렸다.',
      { promotion: true, flag: 'route-schemer', ...check('wisdom', 14, '보고서가 당사자들 손에 들어갔다. 밤길이 위험해졌다.', { vitality: -4, joy: -3 }, { follow: [echoLater([1, 2], '밤길', '암투 때 적으로 돌렸던 소대장이 사람을 보냈다. 한참을 쫓기다 겨우 따돌렸다.', { vitality: -3, money: -200 }, 0.6)] }) }],
    ['중립을 지킨다', 'easygoing', { wisdom: 2 }, '둘 다 당신을 믿지 않게 됐지만, 둘 다 적으로 두진 않았다.'],
  ], insideOnce(s => working(s) && rank(s) >= 1 && rank(s) <= 3)],
  ['route-org-promotion', 18, 75, '승급 심사', s => `${org(s)}의 ${rankTitle(s)}으로 지낸 지 몇 해. 윗사람이 다음 자리를 두고 시험을 걸어 왔다. 밤안개 속에서 상대 조직의 창고를 치는 일이다.`, [
    ['시험을 치른다', 'bold', { courage: 3, infamy: 4, money: 200 }, '창고를 쳤다. 다음 날 새 직함으로 불렸다.',
      { promotion: true, description: '용기 판정 · 성공 시 승급', ...check('courage', 12, '창고에서 밀려났다. 자리는 그대로였다.', { joy: -3, vitality: -3 }) }],
    ['뇌물을 쓴다', 'pragmatic', { money: -400, infamy: 2 }, '봉투 하나로 심사가 생략됐다.', { promotion: true, description: '400P · 승급' }],
    ['사양한다', 'easygoing', { joy: 1 }, '책임이 늘면 눈에도 더 띈다. 지금 자리가 낫다고 했다.'],
  ], inside({ cooldown: 3, when: s => working(s) && rank(s) <= 4 })],
  ['route-org-ideology', 16, 70, '대의명분', s => `${org(s)}의 모임에서 간부가 연설했다. 우리는 세상을 바로잡는 중이고, 포켓몬은 약한 트레이너 손에 있을 때 가장 불행하다고. 사람들은 박수를 쳤다.`, [
    ['믿기로 한다', 'curious', { joy: 3, wisdom: -1, infamy: 2 }, '명분이 있으면 손이 덜 떨린다. 다음 임무가 조금 쉬워졌다.', { flag: 'route-believer', work: { satisfaction: 10 } }],
    ['속으로 의심한다', 'curious', { wisdom: 3 }, '연설이 끝나고 아지트 뒤의 상자들을 봤다. 상자 속 포켓몬이 행복해 보이진 않았다.', { flag: 'route-doubter' }],
    ['명분을 이용한다', 'pragmatic', { money: 150, infamy: 2 }, '연설 내용을 외워 두었다가 보호비를 걷을 때 써먹었다. 돈이 더 잘 걷혔다.'],
  ], insideOnce(s => working(s) && !s.flags['route-believer'] && !s.flags['route-doubter'])],
  ['route-org-double-life', 18, 70, '이중생활', '{friend|은|는} 아직 당신이 무슨 일을 하는지 모른다. 오늘 저녁 식사 자리에서 요즘 어떤 일을 하느냐고 물었다.', [
    ['계속 숨긴다', 'easygoing', { joy: -2, wisdom: 1 }, '"배달 일이야." 거짓말이 늘었다.'],
    ['털어놓는다', 'caring', { bond: 2, joy: -1 }, '{friend|은|는} 한참 말이 없다가 "그만둘 수 있어?"라고만 물었다.', { cast: { friend: { affinity: -10 } }, flag: 'route-friend-knows' }],
    ['들키지 않게 둘러댄다', 'curious', { wisdom: 2 }, '그럴듯한 이야기를 지어냈다. {friend|은|는} 웃었다.', check('wisdom', 10, '말이 앞뒤가 맞지 않았다. {friend|은|는} 더 묻지 않았지만 자리를 먼저 떴다.', { joy: -4 }, { cast: { friend: { affinity: -15 } } })],
  ], inside({ cooldown: 4, when: s => working(s) && !s.flags['route-friend-knows'] && s.cast.friend.affinity >= 30 })],
  ['route-org-spouse-conflict', 20, 70, '{spouse}와의 밤', '{spouse|이|가} 당신의 외투에서 조직의 표식을 찾아냈다. 식탁에 그것을 올려놓고 기다리고 있었다.', [
    ['떠나겠다고 약속한다', 'caring', { bond: 3, joy: 1 }, '"곧 정리할게." {spouse|은|는} 표식을 서랍에 넣었다. 기한은 정하지 않았다.',
      { flag: 'route-promised-leave', follow: [choiceLater([2, 4], '약속의 기한', '배우자가 서랍에서 조직의 표식을 다시 꺼냈다. "곧이라고 했잖아."', [
        ['지금 떠난다', 'caring', { bond: 4, infamy: -5 }, '다음 날 아지트에 가지 않았다. 조직은 한동안 사람을 보냈지만 배우자가 문을 열어 주지 않았다.', { leaveCareer: true, description: '조직을 떠남 · 악명 -5' }],
        ['조금만 더 기다려 달라고 한다', 'easygoing', { joy: -4, bond: -3 }, '배우자는 그날 밤 아이 방에서 잤다.'],
      ], 0.9)] }],
    ['사실대로 말하고 이해를 구한다', 'bold', { courage: 2, bond: -2, joy: -2 }, '"돈이 필요했어." {spouse|은|는} 이해한다고 했지만 그 뒤로 외투를 만지지 않았다.'],
    ['남의 것이라고 둘러댄다', 'pragmatic', { joy: -3 }, '거짓말은 통했다. 통했다는 게 더 씁쓸했다.'],
  ], insideOnce(s => working(s) && married(s) && !s.flags['route-promised-leave'])],
  ['route-org-child-question', 24, 70, '아이의 질문', '아이가 학교에서 돌아와 물었다. 친구들이 그러는데, 부모님이 나쁜 사람들과 일한다고. 정말이냐고.', [
    ['아니라고 한다', 'easygoing', { joy: -3 }, '아이는 고개를 끄덕였지만 다음 날 친구 이야기를 더는 하지 않았다.'],
    ['사실대로 말한다', 'caring', { bond: 2, joy: -3 }, '아이는 울지 않았다. 대신 "그럼 그만두면 되잖아"라고 했다.', { flag: 'route-child-knows' }],
    ['곧 다른 일을 하겠다고 약속한다', 'caring', { bond: 1 }, '아이와 손가락을 걸었다. 아이는 그 약속을 오래 기억할 것이다.',
      { flag: 'route-promised-leave', follow: [echoLater([2, 4], '아이의 기억', '아이가 손가락을 걸었던 날을 꺼냈다. "약속 지켰어?" 대답하는 데 시간이 걸렸다.', { joy: -3 }, 0.8)] }],
  ], insideOnce(s => working(s) && s.relationship.children >= 1 && !s.flags['route-child-knows'])],
  ['route-org-family-disappointment', 18, 70, '고향의 소문', s => `고향까지 소문이 갔다. ${org(s)}의 ${rankTitle(s)}이라는 말이 가족에게 들어갔고, {friend|이|가} 대신 전화를 걸어왔다. "어머니가 우셨어."`, [
    ['변명한다', 'easygoing', { joy: -3 }, '"잠깐이야." {friend|은|는} 대답하지 않고 전화를 끊었다.', { cast: { friend: { affinity: -10 } } }],
    ['돈을 보낸다', 'pragmatic', { money: -300, joy: -2 }, '큰돈을 보냈다. 봉투째 돌아왔다.', { cast: { friend: { affinity: -5 } } }],
    ['직접 찾아간다', 'caring', { bond: 2 }, '고향집 마루에서 밤늦게까지 이야기했다. 용서는 아니었지만 문은 닫히지 않았다.',
      { cast: { friend: { affinity: 3 } }, ...check('bond', 12, '문이 열리지 않았다. 마당에서 파트너와 한참을 서 있다 돌아왔다.', { joy: -5 }, { cast: { friend: { affinity: -12 } } }) }],
  ], insideOnce(s => working(s) && infamyOf(s) >= 10)],
  ['route-org-friend-confront', 18, 70, '{friend}의 설득', '{friend|이|가} 아지트 앞까지 찾아왔다. 조직원들이 보는 앞에서 말했다. "지금 나와. 같이 가자."', [
    ['함께 나간다', 'caring', { bond: 4, infamy: -5, joy: 2 }, '등 뒤에서 욕설이 들렸다. {friend|은|는} 돌아보지 말라고 했다.',
      { leaveCareer: true, flag: 'route-left-for-friend', cast: { friend: { affinity: 10 } }, description: '조직을 떠남 · 악명 -5 · 친구 관계 +10',
        follow: [echoLater([1, 3], '남겨 둔 빚', '조직이 떠날 때 챙기지 않은 몫을 받아 가겠다며 사람을 보냈다. 파트너가 막았지만 집기 몇 개가 부서졌다.', { money: -250, joy: -2 }, 0.6)] }],
    ['돌려보낸다', 'easygoing', { joy: -3 }, '"여기 오지 마." {friend|은|는} 한참 서 있다가 돌아갔다.', { cast: { friend: { affinity: -12 } } }],
    ['조직원들 앞에서 모르는 사람이라고 한다', 'pragmatic', { infamy: 4, joy: -5 }, '{friend|은|는} 아무 말 없이 돌아섰다. 조직원들은 웃었다.', { cast: { friend: { affinity: -25 } } }],
  ], insideOnce(s => working(s) && s.cast.friend.affinity >= 35)],
  ['route-org-police-tail', 18, 75, '꼬리', s => `며칠째 같은 차가 집 앞에 서 있다. 경찰이다. ${org(s)}는 "알아서 하라"고만 했다.`, [
    ['따돌린다', 'bold', { courage: 2, infamy: 3 }, '파트너와 지붕을 타고 빠져나갔다. 차는 빈집 앞을 지켰다.',
      s => check('courage', 8 + Math.floor(infamyOf(s) / 10), '골목 끝에서 붙잡혔다. 재판은 짧았다.', { joy: -5 }, { prison: infamyOf(s) >= 35 ? 3 : 2, flag: 'arrested' })],
    ['조직에 손을 쓰게 한다', 'pragmatic', { money: -500, infamy: 2 }, '누군가에게 돈이 건너갔고 차는 사라졌다.'],
    ['자수한다', 'caring', { infamy: -10, joy: -3 }, '차 문을 두드렸다. 형은 짧았고, 조직은 변호사를 보내지 않았다.', { prison: 1, flag: 'arrested', description: '1년 형 · 악명 -10 · 조직에서 제명' }],
  ], inside({ cooldown: 4, when: s => working(s) && infamyOf(s) >= 15 })],
  ['route-org-betrayed', 18, 70, '배신', s => `함께 일하던 동료가 ${org(s)}의 금고를 털어 달아났다. 당신의 이름을 공범으로 적어 두고.`, [
    ['쫓는다', 'bold', { courage: 3 }, '항구에서 동료를 따라잡았다.',
      { battle: { kind: 'villain' }, after: { win: { effects: { money: 300, infamy: 4 }, outcome: '돈을 되찾았다. 조직은 당신의 이름을 명단에서 지웠다.' },
        lose: { effects: { vitality: -5, joy: -4 }, losePokemon: 'random', outcome: '동료가 당신의 몬스터볼 하나를 챙겨 배에 올랐다. 돈도 포켓몬도 돌아오지 않았다.' } } }],
    ['조직에 결백을 호소한다', 'easygoing', { joy: -3, infamy: 1 }, '한 달 동안 감시를 받았다. 결국 풀려났지만 신뢰는 남지 않았다.', { work: { satisfaction: -10 } }],
    ['동료를 덮어 준다', 'caring', { bond: 2, money: -200, joy: -1 }, '도망칠 시간을 벌어 주고 손실 일부를 대신 물었다.',
      { follow: [echoLater([2, 5], '먼 곳에서 온 봉투', '달아났던 동료가 다른 지방에서 봉투를 보내왔다. 그때 빚진 것의 두 배였다.', { money: 500, joy: 3 }, 0.6)] }],
  ], insideOnce(s => working(s) && rank(s) >= 1)],
  ['route-org-turf', 22, 70, '구역 확장', s => `${rankTitle(s)}으로서 새 구역을 맡게 됐다. 강 건너 마을에는 아직 아무 조직도 없다.`, [
    ['밀어붙인다', 'bold', { money: 400, infamy: 6 }, '한 달 만에 강 건너 가게들이 봉투를 내기 시작했다.',
      { world: { safety: -3, economy: -1 }, follow: [echoLater([1, 3], '강 건너 소문', '강 건너 마을의 가게 하나가 문을 닫고 주인이 이사했다. 당신 이름이 그 이유로 돌았다.', { infamy: 2, joy: -1 }, 0.5)] }],
    ['조용히 스며든다', 'curious', { wisdom: 2, money: 250, infamy: 3 }, '상인회에 먼저 돈을 풀고 나중에 거뒀다. 아무도 조직이 들어온 줄 몰랐다.',
      { world: { safety: -1 }, ...check('wisdom', 10, '상인회가 눈치채고 경찰을 불렀다. 구역은 얻지 못했다.', { joy: -2, infamy: 3 }) }],
    ['반대한다', 'caring', { wisdom: 1 }, '"거긴 아이들이 많습니다." 조직은 다른 사람에게 맡겼다.', { work: { satisfaction: -8 } }],
  ], inside({ cooldown: 5, when: s => working(s) && rank(s) >= 2 })],
  ['route-org-recruit', 20, 70, '신입 모집', s => `${org(s)}가 신입을 뽑는다. 아지트 앞에 열다섯 살쯤 된 아이가 서 있었다. 집에 돈이 없다고 했다.`, [
    ['아이를 받는다', 'pragmatic', { money: 200, infamy: 5, reputation: -2 }, '아이에게 첫 봉투를 건넸다. 아이의 눈이 당신의 옛 눈과 닮아 있었다.'],
    ['돌려보낸다', 'caring', { bond: 2, joy: 2 }, '아이에게 포켓몬센터의 일자리를 알려 주고 차비를 쥐여 보냈다.',
      { work: { satisfaction: -5 }, follow: [echoLater([3, 6], '그때 돌려보낸 아이', '레인저 제복을 입은 청년이 찾아왔다. 그때 아지트 앞에서 돌려보낸 아이였다. 고맙다고 했다.', { joy: 4, reputation: 1 })] }],
    ['모른 척한다', 'easygoing', { joy: -2 }, '아이는 다른 조직원의 손에 끌려 들어갔다. 이름은 묻지 않았다.'],
  ], insideOnce(s => working(s) && rank(s) >= 2)],
  ['route-org-council', 25, 70, '간부 회의', s => `${org(s)}의 간부 회의에 처음 앉았다. 두목이 큰 작전을 내놓았다. 지방 리그의 상금 수송 차량을 치는 일이다.`, [
    ['찬성한다', 'bold', { courage: 2, infamy: 4 }, '작전명이 정해졌다. 당신 이름이 계획표 첫 줄에 올랐다.', { flag: 'route-big-op' }],
    ['반대한다', 'curious', { wisdom: 2 }, '"너무 큽니다." 두목은 듣지 않았지만 기억은 했다.', { work: { satisfaction: -5 } }],
    ['찬성하고 경찰에 흘린다', 'pragmatic', { wisdom: 3, infamy: -3 }, '회의록 사본이 경찰 손에 들어갔다. 작전은 시작도 못 하고 접혔다.',
      { flag: 'route-informant-seed', ...check('wisdom', 15, '밀고자가 있다는 걸 조직이 알아챘다. 당신을 특정하진 못했지만 모두가 서로를 의심했다.', { vitality: -4, joy: -3 }, { work: { satisfaction: -10 } }) }],
  ], insideOnce(s => working(s) && rank(s) >= 3 && !s.flags['route-big-op'])],
  ['route-org-heist', 25, 70, '수송 차량', s => `작전의 날. ${org(s)}의 ${rankTitle(s)}으로서 리그 상금 수송 차량을 막아섰다. 호위는 경찰 둘과 그들의 포켓몬이었다.`, [
    ['선두에서 친다', 'bold', { courage: 3 }, '차량 앞에서 경찰의 포켓몬과 맞붙었다.',
      { battle: { kind: 'wild' }, after: { win: { effects: { money: 800, infamy: 10 }, flag: 'route-heist-done', world: { safety: -3 }, outcome: '차량을 열었다. 조직 역사에 남을 밤이었다.' },
        lose: { effects: { vitality: -5, joy: -4 }, prison: 2, flag: 'arrested', outcome: '현장에서 붙잡혔다. 2년 형. 조직은 변호사를 보내지 않았다.' } } }],
    ['뒤에서 지휘한다', 'curious', { wisdom: 3, money: 500, infamy: 6 }, '무전기 너머로 작전을 지휘했다. 얼굴은 보이지 않았다.', { flag: 'route-heist-done', ...check('wisdom', 12, '지휘가 꼬여 작전이 반쯤 실패했다. 몫은 줄고 책임은 늘었다.', { joy: -3, money: -200 }) }],
    ['작전 전날 빠진다', 'easygoing', { infamy: -2, joy: -2 }, '병을 핑계로 빠졌다. 작전은 당신 없이 치러졌고, 조직은 그걸 잊지 않았다.', { work: { satisfaction: -15 } }],
  ], insideOnce(s => working(s) && s.flags['route-big-op'] && !s.flags['route-heist-done'])],
  ['route-org-boss-eye', 28, 70, '두목의 신임', s => `${org(s)}의 두목이 당신을 따로 불렀다. "내 다음은 너다." 다른 참모들이 그 말을 들었다.`, [
    ['받아들인다', 'bold', { courage: 2, infamy: 5, money: 300 }, '참모들의 눈빛이 달라졌다. 등 뒤가 서늘해졌다.', { flag: 'route-heir' }],
    ['사양한다', 'easygoing', { wisdom: 2 }, '"저는 지금 자리가 좋습니다." 두목은 웃었고 참모들은 안도했다.'],
    ['다른 참모를 추천한다', 'curious', { wisdom: 2, joy: 1 }, '추천받은 참모가 당신에게 빚을 졌다.', { follow: [echoLater([2, 4], '참모의 보답', '그때 추천했던 참모가 두목 자리를 이어받았다. 당신 몫을 두 배로 올려 주었다.', { money: 600, infamy: 3 }, 0.5)] }],
  ], insideOnce(s => working(s) && rank(s) >= 4 && !s.flags['route-heir'])],
  ['route-org-boss-challenge', 28, 70, '두목에게 도전', s => `${org(s)}의 두목은 늙었고 참모들은 흔들린다. 지금 도전하면 자리를 잡을 수 있다. 지면 조직 안에 자리가 없다.`, [
    ['도전한다', 'bold', { courage: 4 }, '아지트 지하에서 두목의 에이스와 맞섰다.',
      { battle: { kind: 'villain', level: 60 }, after: { win: { effects: { infamy: 10, money: 500 }, promotion: true, flag: 'route-boss', outcome: '두목이 몬스터볼을 내려놓았다. 조직이 당신의 것이 됐다.' },
        lose: { effects: { vitality: -6, money: -500, joy: -5 }, losePokemon: 'party', outcome: '졌다. 두목은 당신의 포켓몬 하나를 "수업료"로 거뒀고, 당신은 자리를 잃지 않은 것에 감사해야 했다.' } } }],
    ['때를 기다린다', 'easygoing', { wisdom: 2 }, '두목의 기침 소리를 세며 기다렸다.'],
  ], insideOnce(s => working(s) && rank(s) === 4 && !s.flags['route-boss'])],
  ['route-org-boss-challenged', 30, 75, '자리를 노리는 자', s => `${org(s)}의 두목인 당신에게 젊은 간부가 도전장을 냈다. 아지트의 절반이 그를 지지한다.`, [
    ['받아 준다', 'bold', { courage: 3 }, '지하에서 도전자와 맞섰다.',
      { battle: { kind: 'villain', level: 55 }, after: { win: { effects: { infamy: 5, money: 300 }, outcome: '도전자는 무릎을 꿇었다. 아지트가 조용해졌다.' },
        lose: { effects: { vitality: -6, infamy: -5, joy: -5 }, leaveCareer: true, flag: 'route-deposed', outcome: '졌다. 도전자는 당신을 죽이지 않았다. 그냥 내보냈다.' } } }],
    ['자리를 넘기고 물러난다', 'easygoing', { infamy: -5, money: 500, joy: 1 }, '퇴직금 같은 봉투를 받고 아지트를 나왔다. 뒤에서 문이 닫혔다.', { leaveCareer: true, flag: 'route-retired-boss', description: '조직을 떠남 · 악명 -5 · 소지금 +500' }],
  ], inside({ cooldown: 6, when: s => working(s) && rank(s) >= 5 })],
  ['route-org-ranger-raid', 18, 75, '레인저 급습', s => `새벽에 레인저들이 ${org(s)}의 창고를 덮쳤다. 창문으로 빠져나가는데 레인저 한 사람이 파트너와 함께 뒤를 쫓았다.`, [
    ['맞서 싸운다', 'bold', { courage: 2 }, '골목에서 레인저의 포켓몬과 붙었다.',
      { battle: { kind: 'wild' }, after: { win: { effects: { infamy: 5 }, outcome: '레인저를 따돌리고 사라졌다. 이름이 수배 명단에 올라갔을 것이다.' }, lose: { effects: { vitality: -4, money: -400, infamy: 3 }, outcome: '밀렸지만 도망은 쳤다. 창고의 물건은 모두 압수됐다.' } } }],
    ['숨는다', 'easygoing', { joy: -2 }, '쓰레기통 뒤에서 날이 밝을 때까지 숨었다.'],
    ['동료를 버리고 혼자 빠져나간다', 'pragmatic', { infamy: 2, joy: -3 }, '뒤에서 동료가 붙잡히는 소리를 들었다. 돌아보지 않았다.', { work: { satisfaction: -5 } }],
  ], inside({ cooldown: 5, when: s => working(s) && infamyOf(s) >= 20 })],
  ['route-org-stolen-eyes', 16, 75, '훔친 포켓몬의 눈', '볼에서 나온 훔친 포켓몬이 당신을 보지 않는다. 먹이를 줘도 등을 돌리고, 밤에는 문 쪽을 본다.', [
    ['시간을 들여 길들인다', 'caring', { bond: 3 }, '몇 달이 걸렸다. 어느 날 처음으로 당신 옆에서 잤다.', { affection: 3 }],
    ['사정을 알아본다', 'curious', { wisdom: 2, infamy: -1 }, '볼 바닥의 지워진 이름을 더듬어 봤다. 원래 주인은 이미 마을을 떠난 뒤였다. 포켓몬에게 그 말을 해 주자 처음으로 눈을 맞췄다.', { affection: 1 }],
    ['신경 쓰지 않는다', 'easygoing', { joy: -1 }, '볼에 넣어 두었다. 배틀에는 쓸 수 있었다.'],
  ], insideOnce(s => hasStolen(s))],
  ['route-org-hideout-night', 16, 75, '아지트의 밤', s => `${org(s)}의 아지트. 임무가 없는 밤에는 다들 카드를 치거나 포켓몬을 풀어 놓고 논다.`, [
    ['포켓몬과 논다', 'caring', { joy: 2, bond: 1 }, '파트너가 다른 조직원의 포켓몬과 친해졌다. 사람보다 빨랐다.', { affection: 2 }],
    ['술자리에 낀다', 'easygoing', { joy: 2, vitality: -2 }, '조직원들의 옛이야기를 들었다. 다들 처음엔 잠깐이었다고 했다.'],
    ['혼자 옥상에 올라간다', 'curious', { wisdom: 2, joy: -1 }, '마을 불빛을 내려다봤다. 저기 어딘가에 예전의 집이 있었다.'],
  ], inside({ cooldown: 4, when: working })],
  ['route-org-launder', 20, 70, '명의 대여', s => `${org(s)}가 당신 이름으로 가게를 하나 내겠다고 했다. 장사는 안 해도 된다. 장부만 돌면 된다.`, [
    ['이름을 빌려준다', 'pragmatic', { money: 350, infamy: 3 }, '가게는 문을 열지 않았지만 매출은 꾸준했다.', { follow: [echoLater([2, 5], '명의자 조사', '세무 조사에서 가게 명의자가 당신으로 나왔다. 추징금이 날아왔다.', { money: -400, infamy: 2 }, 0.4)] }],
    ['거절한다', 'easygoing', { wisdom: 1 }, '"이름은 하나뿐이라서요." 조직은 다른 이름을 찾았다.'],
  ], insideOnce(s => working(s) && rank(s) >= 1)],
  ['route-org-sick-mate', 16, 75, '다친 동료', '임무에서 다친 동료의 포켓몬이 피를 흘린다. 포켓몬센터에 가면 볼의 등록 기록이 조회된다.', [
    ['뒷골목 치료사를 부른다', 'caring', { money: -200, bond: 3 }, '치료사는 돈을 받고 아무것도 묻지 않았다. 동료는 당신에게 빚을 졌다고 했다.', { flag: 'route-saved-mate' }],
    ['센터에 몰래 데려간다', 'bold', { courage: 2, bond: 4 }, '간호사가 기록을 조회하지 않고 치료해 주었다. 눈이 마주쳤지만 말은 없었다.',
      { flag: 'route-saved-mate', ...check('courage', 10, '기록이 조회됐다. 레인저가 올 때까지 뒷문으로 빠져나왔지만 포켓몬은 두고 와야 했다.', { joy: -3, infamy: 4 }) }],
    ['그냥 둔다', 'easygoing', { joy: -3, infamy: 2 }, '동료는 밤새 포켓몬을 안고 있었다. 아침에 포켓몬은 움직이지 않았다.'],
  ], insideOnce(s => working(s) && !s.flags['route-saved-mate'])],
  ['route-org-friend-list', 18, 70, '명단의 이름', s => `${org(s)}의 다음 보호비 명단을 받았다. 세 번째 줄에 {friend}의 가게가 있었다.`, [
    ['명단에서 지운다', 'caring', { bond: 2 }, '"거긴 이미 다른 데서 걷습니다." 조직은 믿었다.', check('wisdom', 10, '거짓말이 들통났다. 명단은 그대로였고 당신은 그 가게를 직접 가야 했다.', { joy: -4, vitality: -3 }, { work: { satisfaction: -10 }, cast: { friend: { affinity: -15 } } })],
    ['그대로 걷는다', 'pragmatic', { money: 200, infamy: 4, joy: -4 }, '{friend|은|는} 봉투를 건네며 당신의 얼굴을 봤다. 아무 말도 하지 않았다.', { cast: { friend: { affinity: -20 } } }],
    ['{friend}에게 미리 알린다', 'caring', { bond: 1, infamy: 1 }, '{friend|은|는} 가게를 한 달 닫고 여행을 떠났다. 돌아와서도 그 일은 묻지 않았다.', { cast: { friend: { affinity: 5 } }, flag: 'route-friend-knows' }],
  ], insideOnce(s => working(s) && s.cast.friend.affinity >= 25)],
  ['route-org-rival-confront', 18, 70, '{rival}의 추궁', '{rival|이|가} 체육관 앞에서 길을 막았다. "소문이 사실이야? 그럼 나랑 붙어. 지면 그만둬."', [
    ['받아들인다', 'bold', { courage: 2 }, '옛 라이벌과 오랜만에 맞붙었다.',
      { battle: { kind: 'rival' }, after: { win: { effects: { infamy: 3 }, cast: { rival: { affinity: -5 } }, outcome: '이겼다. 라이벌은 "그래도 그만둬"라고 했다.' }, lose: { effects: { joy: -3 }, cast: { rival: { affinity: 5 } }, outcome: '졌다. 약속은 지키지 않았다. 라이벌은 알고 있었다는 얼굴이었다.' } } }],
    ['피한다', 'easygoing', { joy: -2 }, '옆길로 빠졌다. 라이벌은 따라오지 않았다.', { cast: { rival: { affinity: -8 } } }],
  ], insideOnce(s => working(s) && s.cast.rival.path !== 'villain' && s.cast.rival.met !== false)],
]);

// ── 3. 탈출과 갱생 ── ways out, and what the way out costs.
const outside = (more = {}) => ({ once: false, cooldown: 5, ...more, when: s => !isOutlaw(s) && !inPrison(s) && (!more.when || more.when(s)) });
const outsideOnce = when => ({ when: s => !isOutlaw(s) && !inPrison(s) && (!when || when(s)) });

const exits = table('dark', [
  ['route-exit-ranger-deal', 18, 70, '레인저의 거래', s => `레인저가 혼자 찾아왔다. ${org(s)}의 창고 위치와 간부 이름을 넘기면 당신의 기록은 지워 주겠다고 했다. 단, 조직은 누가 넘겼는지 알게 될 것이다.`, [
    ['정보를 넘긴다', 'pragmatic', { infamy: -20, wisdom: 2 }, '창고 세 곳이 털렸다. 당신은 다음 날 아지트에 가지 않았다.',
      { leaveCareer: true, flag: 'route-informant', world: { safety: 3 }, description: '조직을 떠남 · 악명 -20 · 지방 치안 +3',
        follow: [echoLater([2, 5], '밀고자의 값', '옛 조직이 밀고자를 찾아냈다. 집에 불이 났다. 파트너가 깨워 준 덕에 몸은 빠져나왔다.', { vitality: -5, money: -300, joy: -3 }, 0.7)] }],
    ['거짓 정보를 흘린다', 'curious', { wisdom: 3, money: 300, infamy: 3 }, '빈 창고 주소를 넘기고 조직에서 사례까지 받았다.', check('wisdom', 14, '레인저는 처음부터 알고 있었다. 수갑이 채워졌다.', { joy: -5 }, { prison: 2, flag: 'arrested' })],
    ['거절한다', 'easygoing', { infamy: 2 }, '레인저는 명함을 두고 갔다. 버리지는 않았다.'],
  ], insideOnce(s => working(s) && infamyOf(s) >= 10)],
  ['route-exit-escape', 16, 75, '탈출', s => `${org(s)}를 떠나기로 했다. 아지트에는 당신의 포켓몬 기록과 이름이 있다. 새벽에 조용히 나가야 한다.${s.flags['route-saved-mate'] ? ' 예전에 살려 준 동료가 망을 봐 주겠다고 했다.' : ''}`, [
    ['새벽에 떠난다', 'bold', { courage: 3, infamy: -5, joy: 2 }, '동이 트기 전에 마을 경계를 넘었다. 뒤에서 아무도 오지 않았다.',
      s => ({ leaveCareer: true, flag: 'route-escaped', description: '용기 판정 · 성공 시 조직을 떠남 · 악명 -5',
        follow: [echoLater([1, 3], '남긴 흔적', '옛 조직이 아직 당신을 찾는다는 말을 들었다. 한동안 창문 쪽으로 등을 두고 자지 못했다.', { joy: -2, vitality: -1 }, 0.5)],
        ...check('courage', s.flags['route-saved-mate'] ? 0 : 15, '경계에서 붙잡혔다. 매를 맞았고, 몬스터볼 하나를 빼앗겼다. "다음엔 없어."', { vitality: -8, money: -300, joy: -4 }, { losePokemon: 'random' }) })],
    ['포기한다', 'easygoing', { joy: -3 }, '짐을 다시 풀었다. 내년에는 할 수 있을지도 모른다.'],
  ], insideOnce(s => working(s) && !s.flags['route-escaped'])],
  ['route-exit-new-name', 18, 70, '새 이름', '이 마을에서는 당신을 모르는 사람이 없다. 다른 지방에서 새 이름으로 시작할 수 있다. 파트너만 데리고.', [
    ['떠난다', 'bold', { infamy: -15, joy: 2, courage: 2 }, '이름을 바꾸고 바다를 건넜다. 아무도 당신의 과거를 묻지 않았다.',
      { move: true, flag: 'route-new-name', description: '다른 지방으로 이주 · 악명 -15', follow: [echoLater([2, 5], '옛 이름', '새 마을에서 누군가 옛 이름으로 당신을 불렀다. 돌아보지 않았지만 그는 확신한 얼굴이었다.', { infamy: 5, joy: -3 }, 0.4)] }],
    ['이름 그대로 남는다', 'bold', { courage: 2, wisdom: 1 }, '도망치지 않기로 했다. 시선은 견디는 것이다.'],
  ], outsideOnce(s => leftOrg(s) && infamyOf(s) >= 15 && !s.flags['route-new-name'])],
  ['route-exit-champion-hand', 18, 65, '챔피언의 손길', '지방 챔피언이 당신을 찾았다. 전과를 알고 있다고 했다. "한 번 붙자. 네가 어떤 트레이너인지 보고 싶다."', [
    ['배틀을 받는다', 'bold', { courage: 3 }, '챔피언과 공개 배틀을 치렀다.',
      { battle: { kind: 'league', level: 65 }, training: 30, after: { win: { effects: { reputation: 4, infamy: -10, joy: 5 }, flag: 'route-champion-ally', outcome: '이겼다. 챔피언은 "다음 리그에 와라"라고 했다.' }, lose: { effects: { infamy: -5, bond: 2 }, flag: 'route-champion-ally', outcome: '졌지만 챔피언은 악수를 청했다. 다음 날 신문에 그 사진이 났다.' } } }],
    ['사양한다', 'easygoing', { wisdom: 1 }, '"아직 준비가 안 됐습니다." 챔피언은 기다리겠다고 했다.'],
  ], outsideOnce(s => leftOrg(s) && infamyOf(s) >= 20 && s.party.length > 0)],
  ['route-exit-atonement', 18, 80, '속죄', '예전에 보호비를 걷던 거리에서 순찰 자원봉사를 모집한다. 당신 얼굴을 아는 사람들이다.', [
    ['밤 순찰에 나선다', 'caring', { infamy: -6, vitality: -2, bond: 1 }, '처음 몇 주는 아무도 말을 걸지 않았다. 석 달째에 약초 가게 노부부가 차를 내주었다.', { world: { safety: 2 } }],
    ['아이들에게 배틀을 가르친다', 'caring', { infamy: -4, reputation: 1, bond: 2 }, '포켓몬센터 뒷마당에서 아이들과 연습 배틀을 했다. 부모 몇은 멀리서 지켜봤다.'],
    ['다음에 한다', 'easygoing', {}, '아직은 얼굴을 들기 어려웠다.'],
  ], outside({ cooldown: 3, when: s => leftOrg(s) && infamyOf(s) >= 10 })],
  ['route-exit-old-mate', 20, 75, '옛 조직원', s => `옛 조직 동료가 찾아왔다. 조직은 아직 있고, 자리도 있다고 했다. ${s.flags['route-informant'] ? '당신이 밀고한 것은 모르는 눈치였다.' : '"밖은 어때? 돈은 벌려?"'}`, [
    ['돌아간다', 'pragmatic', { money: 300, infamy: 5, joy: -2 }, '아지트의 냄새는 그대로였다. 몇 년이 사라진 기분이었다.', { career: 'syndicate', flag: 'route-rejoined', description: '조직 복귀 · 악명 +5' }],
    ['밥을 사 주고 보낸다', 'caring', { money: -100, bond: 2 }, '옛이야기를 하다 헤어졌다. 동료는 "너는 나가서 다행이야"라고 했다.',
      { follow: [echoLater([2, 4], '옛 동료의 소식', '밥을 사 주었던 옛 동료가 체포됐다는 기사를 봤다. 편지를 썼지만 답은 없었다.', { joy: -2, wisdom: 2 }, 0.5)] }],
    ['문을 닫는다', 'easygoing', { joy: -1 }, '"이제 그런 사람 아니야." 동료는 명함을 문틈에 끼우고 갔다.', { follow: [echoLater([1, 3], '끼워 둔 명함', '옛 동료가 버리고 간 명함을 경찰이 집 앞에서 주웠다. 참고인 조사를 받느라 며칠을 썼다.', { joy: -2, money: -100 }, 0.3)] }],
  ], outside({ cooldown: 6, when: s => leftOrg(s) && s.flags['route-joined'] })],
  ['route-exit-job-refused', 18, 60, '전과자', '면접에서 서류를 넘기던 담당자가 멈췄다. "전과가 있으시네요." 면접은 거기서 끝났다.', [
    ['솔직하게 말하고 기회를 달라고 한다', 'caring', { bond: 2, reputation: 2, money: 100 }, '담당자가 한참 생각하더니 수습으로 받아 주었다.', { flag: 'route-hired', ...check('bond', 10, '"죄송합니다." 문이 닫혔다.', { joy: -3 }) }],
    ['직접 가게를 낸다', 'pragmatic', { courage: 2 }, '대출을 받아 작은 가게를 열었다. 손님은 천천히 늘었다.',
      { loan: 600, flag: 'route-selfmade', description: '600P 대출 · 빚 +600', follow: [echoLater([2, 4], '단골', '가게에 단골이 생겼다. 전과를 아는 사람도 있었지만 물건이 좋다고 했다.', { money: 200, joy: 3 }, 0.7)] }],
    ['포기한다', 'easygoing', { joy: -3, vitality: -1 }, '다음 면접은 보지 않았다.'],
  ], outside({ cooldown: 5, when: s => s.flags.arrested && !s.career })],
  ['route-exit-family-forgive', 22, 80, '고향 마루', '고향집 마루에 앉았다. 가족은 당신이 한 일을 다 알고 있다. {friend|이|가} 자리를 만들어 주었다.', [
    ['용서를 구한다', 'caring', { bond: 4, joy: 5 }, '긴 밤이었다. 아침에 어머니가 파트너의 먹이를 챙겨 주었다.', { flag: 'route-forgiven', cast: { friend: { affinity: 10 }, family: { health: 3 } }, ...check('bond', 10, '용서는 받지 못했다. 다음에 다시 오라는 말은 들었다.', { joy: -3 }) }],
    ['편지만 두고 온다', 'easygoing', { bond: 1 }, '마루에 편지를 두고 돌아왔다. 답장은 두 계절 뒤에 왔다.', { follow: [echoLater([1, 2], '답장', '고향에서 답장이 왔다. 짧았다. "밥은 먹고 다니니." 그걸로 됐다고 생각했다.', { joy: 4, bond: 2 })] }],
  ], outsideOnce(s => leftOrg(s) && !s.flags['route-forgiven'] && s.age >= 22)],
  ['route-exit-promise-kept', 20, 75, '지킨 약속', '{spouse|이|가} 서랍에서 조직의 표식을 꺼내 불에 넣었다. "약속 지켰네." 아이가 옆에서 손가락을 걸었던 날을 이야기했다.', [
    ['함께 지켜본다', 'caring', { joy: 5, bond: 3 }, '표식이 재가 될 때까지 식탁에 앉아 있었다.', { affection: 2 }],
    ['조용히 밖에 나간다', 'easygoing', { joy: 2, wisdom: 1 }, '파트너와 산책을 했다. 집에 돌아오니 서랍이 비어 있었다.'],
  ], outsideOnce(s => married(s) && s.flags['route-promised-leave'] && leftOrg(s))],
  ['route-exit-register-stolen', 18, 75, '출처를 밝힌 날', '훔친 포켓몬의 볼을 포켓몬센터에 가져갔다. 등록 기록을 바로잡으려면 어디서 왔는지 말해야 한다.', [
    ['출처를 밝히고 정식 등록한다', 'caring', { infamy: -6, reputation: 1, bond: 2 }, '간호사가 기록을 정정했다. 원래 주인은 찾을 수 없었고, 포켓몬은 정식으로 당신의 것이 됐다.', { flag: 'route-registered', affection: 2 }],
    ['그냥 둔다', 'easygoing', {}, '볼의 기록은 그대로였다. 아무도 묻지 않았다.'],
  ], outsideOnce(s => hasStolen(s) && leftOrg(s) && !s.flags['route-registered'])],
  ['route-exit-informant-shadow', 20, 75, '밀고자의 그림자', '옛 조직의 사람이 가게 앞에 서 있었다. 밀고한 것을 안다고 했다. 사과는 받지 않겠다고 했다.', [
    ['맞선다', 'bold', { courage: 3 }, '파트너가 앞으로 나섰다.',
      { battle: { kind: 'villain' }, after: { win: { effects: { infamy: 2, courage: 2 }, world: { safety: 1 }, outcome: '물리쳤다. 다음은 없을 거라고 했다.' }, lose: { effects: { vitality: -6, money: -300 }, outcome: '밀렸다. 가게 유리창 값을 치러야 했다.' } } }],
    ['경찰을 부른다', 'pragmatic', { wisdom: 1 }, '순찰차가 오자 사라졌다. 당분간 집 앞에 차가 서 있을 것이다.', { world: { safety: 1 } }],
    ['이사한다', 'easygoing', { money: -200, joy: -2 }, '같은 지방 안에서 짐을 옮겼다. 몇 년은 조용할 것이다.', { move: 'region' }],
  ], outside({ cooldown: 6, when: s => s.flags['route-informant'] })],
  ['route-exit-mentor-kid', 30, 80, '같은 길', '동네 아이가 뒷골목에서 봉투를 받는 것을 봤다. 당신이 처음 받았던 것과 같은 두께였다.', [
    ['아이를 붙잡고 이야기한다', 'caring', { bond: 3, infamy: -3, reputation: 2 }, '당신이 잃은 것을 하나씩 말해 주었다. 아이는 봉투를 돌려주러 갔다.', { follow: [echoLater([3, 7], '그 아이의 배지', '뒷골목에서 붙잡았던 아이가 첫 배지를 들고 찾아왔다. "그때 말 안 해 줬으면 못 땄을 거예요."', { joy: 5, bond: 2 })] }],
    ['모른 척한다', 'easygoing', { joy: -2 }, '남의 인생이라고 생각했다. 그 아이는 다음 해 아지트에서 봤다는 소문이 돌았다.'],
  ], outsideOnce(s => leftOrg(s) && s.age >= 30)],
]);

// ── 4. 감옥 ── only these open while a term runs (the director filters on category 'prison').
const jail = (more = {}) => ({ ...more, when: s => inPrison(s) && (!more.when || more.when(s)) });

const prison = table('prison', [
  ['route-prison-intake', 16, 80, '입소', '철문이 닫혔다. 소지품 목록에서 몬스터볼은 "보관"으로 적혔다. 같은 방 사람들이 당신 이름을 이미 알고 있었다.', [
    ['고개를 숙인다', 'easygoing', { wisdom: 1, joy: -2 }, '첫 주는 조용히 지나갔다.'],
    ['첫날부터 맞선다', 'bold', { courage: 3 }, '시비를 건 사람과 맞섰다. 그 뒤로 아무도 건드리지 않았다.', check('courage', 12, '혼자였고 상대는 셋이었다. 의무실에서 일주일을 보냈다.', { vitality: -4, joy: -3 })],
  ], jail()],
  ['route-prison-cellmate', 16, 80, '감방 동료', '같은 방의 늙은 사기꾼은 밤마다 이야기를 한다. 절반은 거짓말이고 절반은 진짜라고 했다.', [
    ['이야기를 듣는다', 'curious', { wisdom: 2, joy: 1 }, '세상의 자물쇠 절반을 어떻게 여는지 들었다. 쓸 일이 없기를 바랐다.'],
    ['담배와 바꿀 것을 거래한다', 'pragmatic', { money: -100, joy: 2 }, '바깥 돈으로 안의 편의를 샀다. 사기꾼이 중개했다.'],
    ['거리를 둔다', 'easygoing', { joy: -1 }, '벽을 보고 잤다.'],
  ], jail({ once: false, cooldown: 3 })],
  ['route-prison-pokemon-care', 16, 80, '교도소 돌봄 봉사', '교도소 뒤뜰에서 압수된 포켓몬을 돌보는 봉사를 모집한다. 대부분 주인이 감옥에 있거나 사라진 포켓몬이다.', [
    ['봉사에 나선다', 'caring', { bond: 3, joy: 2 }, '주인을 기다리는 포켓몬들을 돌봤다. 자신의 파트너 생각이 났다.', { affection: 2 }],
    ['거절한다', 'easygoing', {}, '남의 포켓몬을 볼 기분이 아니었다.'],
  ], jail({ once: false, cooldown: 2 })],
  ['route-prison-visit-spouse', 18, 80, '면회', '{spouse|이|가} 면회를 왔다. 유리 너머로 아이 사진을 보여 주었다.', [
    ['면회실에 나간다', 'caring', { bond: 3, joy: 3 }, '15분이 짧았다. 다음 달에 또 오겠다고 했다.'],
    ['나가지 않는다', 'easygoing', { joy: -3 }, '이런 모습을 보이고 싶지 않았다. {spouse|은|는} 편지를 남기고 갔다.',
      { follow: [echoLater([1, 1], '남긴 편지', '면회 때 배우자가 두고 간 편지를 뒤늦게 읽었다. 아이가 그린 파트너 그림이 접혀 있었다.', { joy: 2, bond: 1 })] }],
  ], jail({ once: false, cooldown: 3, when: married })],
  ['route-prison-visit-friend', 16, 80, '{friend}의 면회', '{friend|이|가} 멀리서 면회를 왔다. 파트너의 사진과 센터의 소식을 가져왔다.', [
    ['고맙다고 한다', 'caring', { bond: 2, joy: 3 }, '파트너가 센터에서 잘 지낸다고 했다. {friend|이|가} 가끔 들여다본다고.', { cast: { friend: { affinity: 5 } } }],
    ['오지 말라고 한다', 'easygoing', { joy: -2 }, '"여기까지 올 거 없어." {friend|은|는} 다음 달에도 왔다.'],
  ], jail({ once: false, cooldown: 4, when: s => s.cast.friend.affinity >= 30 })],
  ['route-prison-breakout', 16, 80, '탈옥 유혹', '감방 동료가 배관 통로를 찾았다고 했다. 사흘 뒤 밤에 간다고. 함께 가면 자리가 있다.', [
    ['함께 간다', 'bold', { courage: 3, infamy: 25, joy: 3 }, '배관을 타고 담 밖으로 나갔다. 이제 형기가 아니라 수배가 따라다닌다.',
      { flag: 'route-breakout', description: '용기 판정 · 성공 시 악명 +25', follow: [echoLater([1, 2], '함께 나간 사람', '배관을 같이 탔던 동료가 다시 붙잡혔다는 기사를 봤다. 당신 이름은 아직 전단에만 있었다.', { joy: -2 })], ...check('courage', 20, '통로 끝에 간수가 기다리고 있었다. 독방에서 한 달을 보냈다.', { joy: -5, vitality: -4, infamy: 5 }) }],
    ['간수에게 알린다', 'pragmatic', { wisdom: 2, infamy: -3 }, '동료는 다른 교도소로 옮겨졌다. 당신 이름에 "협조"라는 메모가 붙었다.', { flag: 'route-model-inmate' }],
    ['모른 척한다', 'easygoing', {}, '사흘 뒤 밤에 사이렌이 울렸다. 동료는 돌아오지 않았다.'],
  ], jail()],
  ['route-prison-letter', 16, 80, '편지', '종이와 연필이 배급됐다. 한 통만 보낼 수 있다.', [
    ['파트너를 맡은 센터에 쓴다', 'caring', { bond: 2 }, '파트너가 잘 지내는지 물었다. 답장에 사진이 들어 있었다.', { follow: [echoLater([1, 1], '센터의 답장', '포켓몬센터에서 답장이 왔다. 파트너가 당신 외투 냄새가 나는 담요 위에서 잔다고 했다.', { joy: 3, bond: 1 })] }],
    ['고향에 쓴다', 'caring', { bond: 1, joy: -1 }, '미안하다는 말을 몇 번이나 지웠다 썼다.', { cast: { friend: { affinity: 3 } } }],
    ['쓰지 않는다', 'easygoing', { joy: -1 }, '종이를 접어 베개 밑에 넣었다.'],
  ], jail({ once: false, cooldown: 2 })],
  ['route-prison-model', 16, 80, '모범수', '도서실에서 일할 사람을 뽑는다. 문제를 일으키지 않은 사람만.', [
    ['도서실에서 일한다', 'curious', { wisdom: 3, infamy: -4 }, '책 사이에서 시간이 빨리 갔다. 가석방 심사에 좋은 기록이 남았다.', { flag: 'route-model-inmate' }],
    ['운동장에 남는다', 'bold', { vitality: 2, courage: 1 }, '몸을 만들었다. 안에서는 그게 가장 확실한 자산이었다.'],
  ], jail()],
  ['route-prison-release-prep', 16, 80, '출소 준비', '마지막 해다. 출소자 직업 훈련 안내문이 돌았다. 같은 날 옛 조직의 연락처가 적힌 쪽지도 돌았다.', [
    ['직업 훈련을 받는다', 'pragmatic', { wisdom: 2, joy: 1 }, '포켓몬 용품 정비를 배웠다. 밖에서 쓸 수 있을지는 모르지만 손은 기억할 것이다.', { flag: 'route-trained' }],
    ['쪽지를 챙긴다', 'easygoing', { infamy: 2 }, '쪽지를 외우고 찢었다. 밖에 나가면 쓸지도 모른다.', { flag: 'route-old-contact' }],
    ['둘 다 버린다', 'easygoing', { joy: 1 }, '나가서 생각하기로 했다.'],
  ], jail({ when: s => s.prison === 1 })],
  ['route-prison-retrial', 16, 80, '재심 신청', '감방 동료가 당신 사건의 기록에 허점이 있다고 했다. 재심을 신청하려면 변호사 비용이 든다.', [
    ['재심을 신청한다', 'curious', { wisdom: 2, reputation: 2, infamy: -5, joy: 4 }, '형은 줄지 않았지만 기록의 일부가 정정됐다. 밖에 나가면 전과 기록이 조금은 가벼울 것이다.', { cost: 300, ...check('wisdom', 15, '재심은 기각됐다. 변호사 비용만 날렸다.', { joy: -3 }) }],
    ['포기한다', 'easygoing', {}, '동료의 말이 맞는지도 확신할 수 없었다.'],
  ], jail({ when: s => s.prison >= 2 })],
]);

// ── 5. 악명의 그림자 ── what a bad name does to an ordinary day (infamy 20+).
const shadow = (more = {}) => ({ once: false, cooldown: 4, ...more, when: s => !inPrison(s) && infamyOf(s) >= 20 && (!more.when || more.when(s)) });
const shadowOnce = when => ({ when: s => !inPrison(s) && infamyOf(s) >= 20 && (!when || when(s)) });

const shadows = table('dark', [
  ['route-shadow-shop', 16, 80, '나가 주세요', '프렌들리숍 점원이 당신을 알아봤다. "죄송하지만 나가 주세요." 뒤에 선 손님들이 길을 비켰다.', [
    ['조용히 나간다', 'easygoing', { joy: -2 }, '옆 마을까지 가서 물건을 샀다.'],
    ['항의한다', 'bold', { courage: 2 }, '"돈 내고 사겠다는데요." 점원은 결국 물건을 팔았다. 다음에는 더 비쌌다.', check('courage', 8, '경비가 왔다. 밖으로 밀려났고 주변이 조용해졌다.', { joy: -4, infamy: 2 })],
  ], shadow()],
  ['route-shadow-league-refused', 16, 70, '등록 거부', '리그 접수처에서 서류가 돌아왔다. 악명이 높은 트레이너는 등록할 수 없다는 규정이 붙어 있었다.', [
    ['받아들인다', 'easygoing', { joy: -3 }, '서류를 가방에 넣었다. 배지는 서랍에 남았다.', { flag: 'route-league-barred' }],
    ['항의 서한을 보낸다', 'curious', { wisdom: 2 }, '규정의 예외 조항을 찾아 보냈다. 몇 달 뒤 조건부 등록 허가가 왔다.', check('wisdom', 14, '답장은 짧았다. 규정은 규정이라고.', { joy: -3 }, { flag: 'route-league-barred' })],
  ], shadowOnce(s => infamyOf(s) >= 30 && !s.flags['route-league-barred'])],
  ['route-shadow-bounty', 18, 75, '현상금 사냥꾼', '길에서 낯선 트레이너가 당신 이름을 불렀다. 전단을 꺼내 보였다. "현상금이 꽤 되더군."', [
    ['맞선다', 'bold', { courage: 3 }, '사냥꾼의 포켓몬과 길 한가운데서 붙었다.',
      { battle: { kind: 'wild', level: 45 }, after: { win: { effects: { infamy: 4, courage: 2 }, outcome: '사냥꾼은 전단을 두고 달아났다.' }, lose: { effects: { joy: -5, vitality: -4 }, prison: 2, flag: 'arrested', outcome: '졌다. 사냥꾼은 당신을 경찰서 앞까지 끌고 갔다. 현상금이 지급됐다.' } } }],
    ['돈으로 막는다', 'pragmatic', { money: -500 }, '현상금보다 조금 더 주었다. 사냥꾼은 다음에 또 오겠다고 했다.'],
    ['달아난다', 'easygoing', { vitality: -2 }, '골목으로 뛰었다.', check('vitality', 10, '잡혔다. 돈을 다 털리고서야 풀려났다.', { money: -400, joy: -3 })],
  ], shadow({ when: s => infamyOf(s) >= 35 && s.party.length > 0 })],
  ['route-shadow-kid-fan', 16, 70, '동경하는 아이', '한 아이가 당신 뒤를 따라다닌다. 당신처럼 되고 싶다고 했다. 악명이 멋있어 보인다고.', [
    ['말린다', 'caring', { bond: 2, infamy: -2 }, '잃어버린 것들을 하나씩 말해 주었다. 아이는 반쯤만 들었다.'],
    ['무용담을 들려준다', 'easygoing', { joy: 2, infamy: 3 }, '아이는 눈을 빛냈다. 그 눈이 마음에 걸렸다.',
      { follow: [echoLater([2, 5], '그 아이의 소식', '무용담을 듣던 아이가 조직에 들어갔다는 소문을 들었다. 당신 이름을 대고 들어갔다고 했다.', { joy: -3, infamy: 2 }, 0.5)] }],
    ['무시한다', 'pragmatic', {}, '아이는 며칠 뒤 따라오지 않았다.'],
  ], shadowOnce()],
  ['route-shadow-reporter', 18, 75, '기자', '지방 신문 기자가 인터뷰를 청했다. "당신 쪽 이야기를 듣고 싶습니다." 사진기는 가방에 넣어 두었다.', [
    ['솔직하게 말한다', 'caring', { wisdom: 2, reputation: 2, infamy: -3 }, '기사는 공정했다. 몇 사람이 당신을 다시 봤다.',
      { follow: [echoLater([1, 3], '기사를 읽은 사람', '기사를 읽었다는 사람이 가게에서 먼저 인사를 건넸다. 작은 일이었지만 그날은 오래 기억에 남았다.', { joy: 3, reputation: 1 }, 0.6)] }],
    ['과장해서 판다', 'pragmatic', { money: 300, infamy: 6 }, '기자는 자극적인 쪽을 골랐다. 사례비는 두둑했고 소문은 더 커졌다.',
      { follow: [echoLater([1, 2], '기사의 후폭풍', '과장된 기사를 본 옛 피해자들이 항의 편지를 보냈다. 신문사는 사과했고 당신은 아니었다.', { joy: -2, infamy: 2 }, 0.5)] }],
    ['거절한다', 'easygoing', {}, '기자는 명함만 두고 갔다.'],
  ], shadowOnce()],
  ['route-shadow-victim', 20, 80, '그때 그 가게', '거리에서 옛 피해자를 만났다. 예전에 보호비를 걷던 가게의 주인이었다. 그는 당신을 바로 알아봤다.', [
    ['사과한다', 'caring', { bond: 2, joy: 2, infamy: -6 }, '그는 한참 말이 없다가 "다시는 오지 마세요"라고 했다. 그 말이 용서보다 나았다.',
      { follow: [echoLater([1, 3], '가게의 초대', '사과했던 가게 주인이 가게 앞을 지나던 당신을 불러 세웠다. 차 한 잔을 내주고 아무 말도 하지 않았다.', { joy: 3 }, 0.5)], ...check('bond', 12, '그는 사과를 받지 않았다. 당연했다.', { joy: -4 }) }],
    ['모른 척한다', 'easygoing', { joy: -2, infamy: 2 }, '서로 눈을 피했다.'],
  ], shadowOnce(s => s.flags['route-joined'])],
  ['route-shadow-wanted-poster', 18, 80, '수배 전단', '포켓몬센터 게시판에 당신 얼굴이 붙어 있었다. 사진은 몇 년 전 것이었다.', [
    ['전단을 뗀다', 'easygoing', { joy: -1 }, '다음 날 새 전단이 붙었다.'],
    ['변장한다', 'pragmatic', { money: -150, wisdom: 1 }, '머리를 자르고 안경을 샀다. 파트너는 잠시 당신을 못 알아봤다.'],
    ['자수한다', 'caring', { infamy: -20, joy: -3 }, '센터 앞 경찰에게 전단을 들고 갔다.', { prison: 2, flag: 'arrested', description: '2년 형 · 악명 -20' }],
  ], shadow({ when: s => isWanted(s) })],
  ['route-shadow-townsfolk', 16, 80, '마을의 시선', '길을 걸으면 대화가 멈춘다. 아이들은 집으로 불려 들어가고, 창문이 닫힌다.', [
    ['견딘다', 'bold', { courage: 2, joy: -2 }, '고개를 들고 걸었다. 어느 날 한 사람이 인사를 받았다.'],
    ['이웃 마을로 옮긴다', 'easygoing', { money: -200, joy: 1 }, '같은 지방 안에서 짐을 옮겼다. 시선은 조금 늦게 따라왔다.', { move: 'region' }],
  ], shadow({ cooldown: 5 })],
  ['route-shadow-center-cold', 16, 80, '센터의 냉대', '포켓몬센터 간호사가 당신의 볼을 받지 않았다. "규정상 신원 확인이 필요합니다." 뒤의 손님들은 바로 받았다.', [
    ['직접 치료한다', 'caring', { bond: 2, vitality: -2 }, '약초와 붕대로 파트너를 돌봤다. 파트너는 가만히 있어 주었다.', { affection: 2 }],
    ['다른 마을 센터로 간다', 'easygoing', { money: -100, joy: -1 }, '밤길을 걸어 다른 센터에 갔다.'],
    ['신원을 밝히고 기다린다', 'pragmatic', { wisdom: 1 }, '한 시간을 기다렸다. 치료는 받았다.'],
  ], shadow({ cooldown: 3, when: s => s.party.length > 0 })],
  ['route-shadow-partner-eyes', 16, 80, '파트너의 눈빛', '{partner|이|가} 당신이 사람을 겁줄 때마다 한 걸음 물러선다. 오늘은 명령에도 움직이지 않았다.', [
    ['파트너와 시간을 보낸다', 'caring', { bond: 3, joy: 2 }, '하루 종일 배틀도 일도 없이 걸었다. 저녁에 파트너가 먼저 다가왔다.', { affection: 3 }],
    ['명령에 따르게 한다', 'bold', { courage: 1, bond: -2 }, '파트너는 결국 움직였다. 눈은 보지 않았다.', { affection: -3 }],
  ], shadowOnce(s => s.party.length > 0)],
  ['route-shadow-rival-word', 18, 75, '{rival}의 한마디', '대회장 밖에서 {rival|을|를} 만났다. "너랑 붙었던 게 자랑이었는데." 그 말만 하고 갔다.', [
    ['쫓아가서 배틀을 청한다', 'bold', { courage: 2 }, '옛날처럼 붙었다.',
      { battle: { kind: 'rival' }, after: { win: { effects: { joy: 3 }, cast: { rival: { affinity: 4 } }, outcome: '이겼다. 라이벌은 "그건 여전하네"라고 했다.' }, lose: { effects: { joy: -2 }, cast: { rival: { affinity: 2 } }, outcome: '졌다. 라이벌은 다음에 또 오라고 했다.' } } }],
    ['그냥 보낸다', 'easygoing', { joy: -3 }, '뒷모습을 봤다.', { cast: { rival: { affinity: -8 } } }],
  ], shadowOnce(s => s.cast.rival.met !== false && s.cast.rival.path !== 'villain' && s.party.length > 0)],
  ['route-shadow-sibling-letter', 16, 80, '{sibling}의 편지', '{sibling|이|가} 편지를 보냈다. 학교에서 당신 이야기로 놀림을 받는다고 했다. 그래도 미워하진 않는다고.', [
    ['찾아가 함께 걷는다', 'caring', { bond: 3, joy: 2 }, '학교 앞에서 기다렸다가 같이 집까지 걸었다. 놀리던 아이들이 조용해졌다.', { cast: { sibling: { affinity: 8 } } }],
    ['답장만 쓴다', 'easygoing', { bond: 1, joy: -1 }, '미안하다고 썼다. {sibling|은|는} 답장 끝에 파트너 그림을 그려 보냈다.', { cast: { sibling: { affinity: 3 } } }],
  ], shadowOnce(s => Boolean(s.cast.sibling))],
]);

// ── 6. 조직의 결말 ── how it ends: a raid, a boss's choice, a last job, the old road remembered.
const endings = table('dark', [
  ['route-end-collapse', 18, 75, '와해', s => `새벽에 ${org(s)}의 아지트 세 곳이 동시에 털렸다. 두목은 잡혔고 간부들은 흩어졌다. 당신 이름도 명단에 있다.`, [
    ['도망친다', 'bold', { courage: 3, infamy: 5 }, '뒷산으로 올라 사흘을 걸었다. 조직은 없어졌고 당신은 남았다.', { leaveCareer: true, flag: 'route-escaped', description: '용기 판정 · 성공 시 조직에서 벗어남', ...check('courage', 12, '산길에서 붙잡혔다. 3년 형.', { joy: -5 }, { prison: 3, flag: 'arrested' }) }],
    ['자수한다', 'caring', { infamy: -15, joy: -3, wisdom: 2 }, '경찰서에 걸어 들어갔다. 형은 짧았다.', { prison: 2, flag: 'arrested', description: '2년 형 · 악명 -15' }],
    ['남은 사람들을 모은다', 'pragmatic', { infamy: 8, money: 200 }, '흩어진 조직원 몇을 모아 작은 조직을 꾸렸다. 이름은 같았다.',
      { promotion: true, world: { safety: -2 }, follow: [echoLater([1, 3], '작은 조직', '다시 꾸린 조직이 자리를 잡았다. 옛 구역의 절반이 돌아왔다. 경찰도 당신 이름을 다시 적었다.', { money: 300, infamy: 4 }, 0.6)] }],
  ], insideOnce(s => working(s) && infamyOf(s) >= 25 && rank(s) <= 3)],
  ['route-end-boss-choice', 28, 75, '두목의 선택', s => `${org(s)}는 이제 당신의 것이다. 창고와 장부, 사람들의 생계까지. 간부들이 다음 해 계획을 기다린다.`, [
    ['조직을 해산한다', 'caring', { infamy: -10, reputation: 2, wisdom: 3 }, '장부를 태우고 사람들에게 마지막 봉투를 나눠 주었다. 몇은 울었고 몇은 욕했다.', { leaveCareer: true, flag: 'route-disbanded', world: { safety: 4 }, description: '조직 해산 · 조직을 떠남 · 악명 -10 · 지방 치안 +4',
      follow: [echoLater([2, 5], '해산 뒤', '해산한 조직원 몇이 다른 지방에서 새 조직을 만들었다는 소식을 들었다. 당신 이름은 쓰지 않았다.', { wisdom: 2 }, 0.6)] }],
    ['확장한다', 'bold', { infamy: 10, money: 800 }, '옆 지방까지 구역을 넓혔다. 장부가 두 권이 됐다.', { flag: 'route-expanded', world: { safety: -4, economy: -2 } }],
    ['후계자에게 넘기고 물러난다', 'easygoing', { infamy: -3, money: 1000, joy: 2 }, '봉투 하나와 침묵을 받고 아지트를 나왔다.', { leaveCareer: true, flag: 'route-retired-boss', description: '조직을 떠남 · 악명 -3 · 소지금 +1,000' }],
  ], insideOnce(s => working(s) && rank(s) >= 5 && !s.flags['route-expanded'])],
  ['route-end-expansion-war', 30, 75, '확장의 대가', s => `${org(s)}가 넓힌 구역의 원래 주인들이 뭉쳤다. 아지트 앞까지 차가 밀려왔다. 두목인 당신이 나서야 한다.`, [
    ['정면으로 맞선다', 'bold', { courage: 4 }, '아지트 앞에서 상대 조직의 우두머리와 맞붙었다.',
      { battle: { kind: 'villain', level: 65 }, after: { win: { effects: { infamy: 10, money: 600 }, world: { safety: -3 }, outcome: '이겼다. 이 지방에서 당신을 막을 조직은 없어졌다.' },
        lose: { effects: { vitality: -8, money: -800, joy: -5, infamy: -5 }, leaveCareer: true, flag: 'route-deposed', outcome: '졌다. 조직은 흡수됐고 당신은 아지트를 떠나야 했다.' } } }],
    ['구역을 돌려주고 화해한다', 'curious', { wisdom: 3, infamy: -2, money: -500 }, '장부 한 권을 넘기고 전쟁을 피했다.', { world: { safety: 1 } }],
    ['밤에 조직을 버리고 사라진다', 'easygoing', { joy: -4, infamy: 3, money: 700 }, '금고의 절반을 들고 뒷문으로 나갔다. 조직은 아침에 알았다.', { leaveCareer: true, flag: 'route-escaped', description: '조직을 떠남 · 소지금 +700 · 악명 +3' }],
  ], insideOnce(s => working(s) && s.flags['route-expanded'] && rank(s) >= 5)],
  ['route-end-last-op', 28, 75, '마지막 작전', s => `${org(s)}의 ${rankTitle(s)}으로서 마지막으로 큰 건 하나를 준비했다. 지방 은행의 포켓몬 금고. 끝나면 평생 일하지 않아도 된다고 했다.`, [
    ['작전을 이끈다', 'bold', { courage: 3 }, '금고 앞에서 경비의 포켓몬과 맞섰다.',
      { battle: { kind: 'wild', level: 55 }, after: { win: { effects: { money: 1000, infamy: 12 }, flag: 'route-last-op', world: { safety: -3 }, outcome: '금고를 열었다. 이제 어디에도 숨을 수 없겠지만 돈은 충분했다.' },
        lose: { effects: { vitality: -6, joy: -5 }, prison: 4, flag: 'arrested', outcome: '금고 앞에서 붙잡혔다. 4년 형.' } } }],
    ['작전에서 빠진다', 'pragmatic', { infamy: -2, wisdom: 2 }, '"이건 너무 큽니다." 조직을 조용히 나왔다. 작전은 실패했다는 기사를 몇 달 뒤에 읽었다.', { leaveCareer: true, flag: 'route-escaped', description: '조직을 떠남 · 악명 -2' }],
  ], insideOnce(s => working(s) && rank(s) >= 3 && s.flags['route-heist-done'] && !s.flags['route-last-op'])],
  ['route-end-crossroads', 20, 75, '갈림길', s => `수배 전단이 전국에 붙었다. ${org(s)}는 당신을 보호해 줄 여력이 없다고 했다. 셋 중 하나다. 자수하거나, 달아나거나, 버티거나.`, [
    ['자수한다', 'caring', { infamy: -25, joy: -3, wisdom: 2 }, '경찰서 앞에서 파트너의 볼을 한 번 쓰다듬고 들어갔다.', { prison: 3, flag: 'arrested', description: '3년 형 · 악명 -25' }],
    ['다른 지방으로 달아난다', 'bold', { courage: 3, infamy: 5 }, '밤 배를 탔다. 새 지방의 항구에서 아무도 당신을 알아보지 않았다.', { leaveCareer: true, move: true, flag: 'route-escaped', description: '체력 판정 · 성공 시 다른 지방으로 도주', ...check('vitality', 12, '항구에서 붙잡혔다. 4년 형.', { joy: -5 }, { prison: 4, flag: 'arrested' }) }],
    ['버틴다', 'easygoing', { infamy: 5, joy: -3 }, '아지트에 남았다. 언제까지일지는 몰랐다.',
      { follow: [echoLater([1, 2], '버틴 대가', '아지트 밖으로 나가지 못한 채 한 해를 보냈다. 창문 너머로만 계절이 바뀌었다.', { vitality: -3, joy: -3 })] }],
  ], insideOnce(s => working(s) && infamyOf(s) >= 45)],
  ['route-end-successor', 45, 80, '후계자', s => `${org(s)}의 젊은 조직원 하나가 당신을 따른다. 예전의 당신처럼 돈이 없어서 들어온 아이다. 키울 수도, 내보낼 수도 있다.`, [
    ['후계자로 키운다', 'pragmatic', { bond: 3, infamy: 3 }, '당신이 아는 것을 모두 가르쳤다. 아이는 빨리 배웠다. 그게 걱정이었다.', { flag: 'route-successor', follow: [echoLater([4, 8], '후계자의 소식', '키웠던 아이가 두목이 됐다는 소식을 들었다. 당신이 가르친 대로, 당신보다 잘했다.', { joy: 2, infamy: 3 }, 0.6)] }],
    ['조용히 내보낸다', 'caring', { bond: 2, joy: 2 }, '돈을 쥐여 주고 다른 지방행 배표를 끊어 주었다. 조직에는 도망쳤다고 보고했다.', { money: -300, work: { satisfaction: -5 }, follow: [echoLater([3, 6], '배표의 행방', '내보냈던 아이가 다른 지방에서 돌보미가 됐다며 사진을 보내왔다. 얼굴이 밝았다.', { joy: 5, bond: 2 }, 0.7)] }],
    ['신경 쓰지 않는다', 'easygoing', {}, '아이는 다른 간부 밑으로 갔다.'],
  ], insideOnce(s => working(s) && rank(s) >= 4 && !s.flags['route-successor'])],
  ['route-end-memoir', 60, 95, '늙은 조직원의 회고', '출판사에서 연락이 왔다. 그 시절 이야기를 책으로 내자고 했다. 아직 살아 있는 사람들의 이름은 바꾸는 조건으로.', [
    ['회고록을 쓴다', 'curious', { wisdom: 4, reputation: 3, infamy: -5, money: 300 }, '책이 나왔다. 옛 피해자 몇이 편지를 보냈고, 옛 동료 몇은 보내지 않았다.',
      { follow: [echoLater([1, 3], '회고록의 독자', '회고록을 읽은 아이가 편지를 보냈다. 뒷골목 봉투를 돌려주고 왔다고 했다.', { joy: 5 }, 0.7)] }],
    ['거절한다', 'easygoing', { joy: 1, wisdom: 1 }, '그 시절은 파트너와 둘만 아는 것으로 두기로 했다.'],
    ['이름을 바꾸지 않는 조건으로 쓴다', 'bold', { courage: 3, reputation: 2, infamy: 2 }, '모든 이름을 그대로 썼다. 몇몇은 소송을 걸었고, 몇몇은 감사했다.', { follow: [echoLater([1, 2], '소송', '회고록에 이름이 실린 옛 간부가 명예훼손 소송을 걸었다. 변호사 비용이 들었다.', { money: -400, joy: -2 }, 0.5)] }],
  ], { when: s => s.flags['route-joined'] && !inPrison(s) && !isOutlaw(s) }],
]);

export const VILLAIN_ROUTE = [...temptations, ...organisation, ...exits, ...prison, ...shadows, ...endings];
