// Misfortune pack: illness, money and debt, pokémon trouble, strained relationships, setbacks at work, small
// temptations and regional disasters. A life that does not go smoothly. Mostly category 'misfortune' (weighted up
// when broke, in debt, unwell or in an unsafe region); a few rows are stage/family/pokemon events.
import { table, check, later, echoLater, choiceLater, localSpecies, town, working, fill } from './event-kit.js';
import { hasCondition, regionState } from '../sim/world.js';
import { debtOf } from '../sim/standing.js';
import { poke } from '../sim/text.js';

const env = (...names) => s => names.includes(town(s).environment);
const married = s => s.relationship.status === 'married';
const single = s => s.relationship.status === 'single';
const dating = s => ['dating', 'engaged'].includes(s.relationship.status);
const hasKids = s => s.relationship.children > 0;
const job = id => s => s.career === id && !s.work.retired;
const ordinaryJob = s => working(s) && s.career !== 'syndicate';
// Someone who could leave for good (never the partner or a legend).
const spare = s => [...s.party, ...s.box].some(m => m.origin !== 'partner' && !m.locked);
const unsafe = s => regionState(s).safety < 40;
const repeat = (cooldown, more = {}) => ({ once: false, cooldown, ...more });
// Delayed records are stored in the save as written, so name tokens inside them are filled now (at build time).
const prefill = (s, follow) => JSON.parse(JSON.stringify(follow), (key, value) => typeof value === 'string' ? fill(s, value) : value);

// ── 1. 건강 ──
const health = table('misfortune', [
  ['mis-health-cold', 8, 85, '옮은 감기', '포켓몬 감기가 돌더니 {partner|이|가} 먼저 앓았고, 며칠 뒤 당신도 열이 났다.', [
    ['함께 센터에서 치료받는다', 'pragmatic', { vitality: 1, money: -150 }, '센터 간호사가 둘을 나란히 눕혔다. 일주일 만에 둘 다 털고 일어났다.', { affection: 1 }],
    ['집에서 버틴다', 'easygoing', { vitality: -4, joy: -2 }, '이불 속에서 둘이 번갈아 기침했다. 낫는 데 한 달이 걸렸다.'],
    ['파트너부터 돌본다', 'caring', { bond: 3, vitality: -3 }, '열이 있는데도 파트너 약부터 챙겼다. 먼저 나은 파트너가 머리맡을 지켰다.', { affection: 3 }],
  ], repeat(6, { weight: s => hasCondition(s, 'outbreak') ? 3 : 1, when: s => s.party.length > 0 })],
  ['mis-health-fall', 14, 70, '발을 헛디딘 날', '비탈길에서 발을 헛디뎌 굴렀다. 발목이 부었고 혼자 일어서기가 어렵다.', [
    ['병원에 간다', 'pragmatic', { vitality: -2, money: -300 }, '인대가 늘어났다고 했다. 깁스를 하고 두 달을 쉬었다.'],
    ['파트너에게 기대 내려온다', 'caring', { bond: 3, vitality: -3 }, '{partner|이|가} 어깨를 내주었다. 집까지 반나절이 걸렸다.', { affection: 2 }],
    ['참고 걷는다', 'bold', { courage: 2 }, '절뚝이며 내려왔다. 며칠 쉬니 괜찮아졌다.', check('vitality', 10, '무리한 탓에 발목이 더 상했다. 오래 쉬어야 한다.', { vitality: -8 }, { flag: 'ill-recovering' })],
  ]],
  ['mis-health-recovery', 14, 80, '회복의 시간', '다친 몸이 아직 돌아오지 않았다. 계단 하나에도 숨이 찬다.', [
    ['재활에 매달린다', 'bold', { vitality: 5, courage: 2 }, '매일 아침 강변을 걸었다. 봄이 올 즈음 예전 걸음을 되찾았다.', { unflag: 'ill-recovering' }],
    ['재활 치료를 받는다', 'pragmatic', { vitality: 6, money: -350 }, '치료사가 짠 일정대로 움직였다. 돈은 들었지만 확실히 나았다.', { unflag: 'ill-recovering' }],
    ['그냥 둔다', 'easygoing', { joy: 1 }, '몸이 알아서 낫겠지 하고 두었다. 통증은 자리를 잡았다.', { unflag: 'ill-recovering', follow: [later('chronic-pain', [2, 5])] }],
  ], { urgent: true, when: s => Boolean(s.flags['ill-recovering']) }],
  ['mis-health-burnout', 22, 62, '꺼진 불', '아침에 눈을 떠도 일어날 이유가 떠오르지 않았다. 일은 밀려 있고 몸은 납처럼 무겁다.', [
    ['휴가를 낸다', 'easygoing', { vitality: 4, joy: 3, money: -200 }, '보름 동안 바다만 봤다. 돌아오니 일이 다시 일처럼 보였다.', { work: { satisfaction: 6 } }],
    ['이를 악물고 버틴다', 'bold', { vitality: -5, courage: 1 }, '버텼다. 겉으로는 아무 일 없었지만 웃는 법을 잠시 잊었다.', { work: { satisfaction: -8 }, follow: [echoLater([1, 2], '늦게 온 청구서', '그때 버틴 몸이 이제야 값을 청구했다. 병원에서 당분간 무리하지 말라고 했다.', { vitality: -4, joy: -2 })] }],
    ['일을 줄인다', 'pragmatic', { vitality: 3, wisdom: 2 }, '맡은 일의 절반을 내려놓았다. 수입은 줄었지만 저녁이 생겼다.', { work: { cut: 1, satisfaction: 4 } }],
  ], { when: working }],
  ['mis-health-chronic', 35, 80, '오래된 통증', '젊을 때 다친 자리가 날이 궂을 때마다 욱신거린다. 요즘은 맑은 날에도 그렇다.', [
    ['물리치료를 받는다', 'pragmatic', { vitality: 3, money: -250 }, '치료사가 자세부터 고쳐 주었다. 통증이 반으로 줄었다.'],
    ['참는다', 'easygoing', { wisdom: 1 }, '아픈 것도 몸의 일부려니 했다.', { follow: [later('chronic-pain', [1, 3])] }],
    ['운동으로 다스린다', 'bold', { vitality: 4 }, '파트너와 아침마다 걷고 몸을 풀었다. 통증이 멀어졌다.', check('vitality', 5, '무리한 운동이 오히려 독이 됐다.', { vitality: -3 })],
  ], repeat(8)],
  ['mis-health-serious', 60, 95, '검사 결과', '건강검진 뒤 병원에서 다시 오라는 연락이 왔다. 의사는 치료를 서두르자고 했다.', [
    ['저축으로 치료비를 낸다', 'pragmatic', { vitality: 3, money: -800 }, '통장이 가벼워졌지만 치료는 잘 끝났다.'],
    ['분할 납부로 치료한다', 'pragmatic', { vitality: 3, debt: 900 }, '병원이 분할 납부를 받아 주었다. 매달 고지서가 온다.'],
    ['치료를 미룬다', 'easygoing', { vitality: -10, joy: -2 }, '괜찮을 거라고 생각했다. 괜찮지 않았다.', { follow: [echoLater([1, 2], '미룬 값', '결국 응급실로 실려 갔다. 미뤘던 치료를 더 비싸게 받았다.', { vitality: -3, money: -400 })] }],
  ]],
  ['mis-health-caregiving', 32, 72, '부모님의 병', '고향에서 연락이 왔다. 부모님이 쓰러지셨다. 누군가 곁에 있어야 한다.', [
    ['직접 간병한다', 'caring', { bond: 4, vitality: -4, joy: -1 }, '몇 달을 고향 병원에서 보냈다. 손을 잡고 있으면 부모님이 조금 편해 보였다.', { cast: { family: { health: 8 } }, follow: [echoLater([3, 6], '그때의 손', '부모님이 그 몇 달이 가장 든든했다고 말씀하셨다. 오래 남을 말이었다.', { joy: 5, bond: 2 })] }],
    ['간병인을 쓴다', 'pragmatic', { money: -450, wisdom: 1 }, '전문 간병인이 곁을 지켰다. 주말마다 들렀다.', { cast: { family: { health: 5 } } }],
    ['다른 가족에게 맡긴다', 'easygoing', { joy: -2 }, '일이 바쁘다는 핑계였다. 형제가 혼자 병원을 오갔다.', { cast: { sibling: { affinity: -10 }, family: { health: 2 } } }],
  ]],
  ['mis-health-insomnia', 20, 75, '잠들지 못하는 밤', '몇 주째 새벽 세 시에 눈이 떠진다. 낮에는 머리가 멍하다.', [
    ['의사를 찾는다', 'pragmatic', { vitality: 3, money: -120 }, '약과 함께 생활 습관표를 받았다. 한 달 만에 아침이 돌아왔다.'],
    ['파트너와 밤 산책을 한다', 'caring', { bond: 2, vitality: 2 }, '{partner|과|와} 달빛 아래를 걷다 보면 어느새 졸음이 왔다.', { affection: 2 }],
    ['커피로 버틴다', 'bold', { vitality: -4, wisdom: -1 }, '낮에는 커피, 밤에는 천장. 실수가 늘었다.'],
  ], repeat(7)],
  ['mis-health-food', 10, 85, '상한 도시락', '길에서 산 도시락이 문제였다. 밤새 앓았다.', [
    ['약국을 찾는다', 'pragmatic', { vitality: -1, money: -60 }, '약을 먹고 하루를 더 누워 있었다.'],
    ['물만 마시며 버틴다', 'easygoing', { vitality: -3 }, '사흘 동안 아무것도 못 먹었다.'],
    ['가게에 따진다', 'bold', { courage: 2, money: 80 }, '가게 주인이 사과하며 치료비를 물어 주었다.', check('courage', 5, '가게 주인은 내 탓이 아니라며 문을 닫았다.', { joy: -2, vitality: -2 })],
  ], repeat(6)],
  ['mis-health-collapse', 25, 65, '쓰러진 날', '일터에서 눈앞이 하얘졌다. 깨어 보니 포켓몬센터 침대였다. 파트너가 사람들을 불러왔다고 했다.', [
    ['입원해 검사를 받는다', 'pragmatic', { vitality: 2, money: -400 }, '과로였다. 일주일 입원하고 처방을 받았다.', { work: { satisfaction: -3 } }],
    ['하루 쉬고 복귀한다', 'bold', { courage: 1, vitality: -5 }, '다음 날 바로 일터로 돌아갔다. 동료들이 말렸지만 듣지 않았다.', { follow: [echoLater([1, 3], '두 번째 신호', '또 쓰러졌다. 이번엔 의사가 선택지를 주지 않았다.', { vitality: -5, money: -300 })] }],
    ['파트너에게 고맙다고 한다', 'caring', { bond: 4, vitality: -2 }, '{partner|이|가} 없었으면 어떻게 됐을까. 한동안 일을 줄이고 곁에 있었다.', { affection: 4, work: { cut: 1 } }],
  ], { when: working }],
]);

const aging = table('stage', [
  ['mis-age-eyes', 48, 90, '흐려진 글씨', '도감의 작은 글씨가 번져 보인다. 팔을 뻗어야 읽힌다.', [
    ['안경을 맞춘다', 'pragmatic', { wisdom: 1, joy: 1, money: -120 }, '세상이 다시 또렷해졌다. 파트너의 털 하나하나가 보였다.'],
    ['버틴다', 'easygoing', { wisdom: -1, joy: -1 }, '눈을 찡그리는 버릇이 생겼다.'],
    ['큰 글씨 도감으로 바꾼다', 'curious', { wisdom: 2 }, '글씨가 커지니 그림도 새로 보였다.'],
  ]],
  ['mis-age-joints', 52, 92, '계단 앞에서', '포켓몬센터 계단을 오르는데 무릎이 먼저 멈췄다. 뒤에 선 젊은 트레이너가 기다려 주었다.', [
    ['천천히 걷기로 한다', 'easygoing', { wisdom: 2, vitality: 1 }, '빨리 걷던 시절의 길을 느리게 다시 걸었다. 못 보던 것이 보였다.'],
    ['재활 운동을 시작한다', 'bold', { vitality: 4, money: -150 }, '수영장에서 한 계절을 보냈다. 무릎이 다시 말을 들었다.'],
    ['포켓몬에게 기댄다', 'caring', { bond: 3 }, '{partner|이|가} 계단마다 멈춰 기다렸다. 오르는 데 오래 걸려도 괜찮았다.', { affection: 2 }],
  ]],
]);

// ── 2. 돈과 빚 ──
const money = table('misfortune', [
  ['mis-money-scam', 20, 75, '확실한 수익', '옛 지인이 "포켓몬 사료 공장에 투자하면 1년에 두 배"라며 찾아왔다. 서류는 그럴듯했다.', [
    ['투자한다', 'bold', { money: -500 }, '서류에 사인했다. 지인은 웃으며 떠났다.', { follow: [later('scam-result', [1, 2], 1, { amount: 500 })] }],
    ['거절한다', 'pragmatic', { wisdom: 3 }, '수익률이 너무 좋아서 오히려 의심스러웠다.'],
    ['경찰에 알린다', 'bold', { reputation: 2, courage: 1 }, '같은 수법에 당한 사람이 여럿이었다. 지인은 더는 마을에 오지 않았다.', { world: { safety: 2 } }],
  ]],
  ['mis-money-thief', 18, 85, '뒤집힌 집', '집에 돌아오니 문이 열려 있었다. 서랍이 모두 뒤집혀 있고 모아 둔 돈이 사라졌다.', [
    ['흔적을 쫓는다', 'bold', { courage: 3 }, '{partner|이|가} 냄새를 따라갔다. 골목 끝에서 범인을 붙잡아 돈을 되찾았다.', check('courage', 10, '놓쳤다. 뛰다가 넘어져 무릎까지 깨졌다.', { vitality: -4, money: -300 })],
    ['경찰에 신고한다', 'pragmatic', { money: -300, wisdom: 2 }, '돈은 돌아오지 않았지만 동네 순찰이 늘었다.', { cost: 0, world: { safety: 2 } }],
    ['문단속을 바꾼다', 'pragmatic', { money: -400, joy: -2 }, '잃은 돈에 더해 자물쇠 값까지 들었다. 두 번은 안 당한다.', { cost: 0 }],
  ], repeat(9, { weight: s => unsafe(s) ? 2.5 : 1 })],
  ['mis-money-fire', 18, 85, '새벽의 불', '옆집에서 난 불이 번졌다. {partner|이|가} 짖어 깨운 덕에 몸만 빠져나왔다.', [
    ['짐을 꺼내러 다시 들어간다', 'bold', { courage: 4 }, '{partner|과|와} 함께 소중한 것들을 안고 나왔다.', check('courage', 15, '연기에 쓰러질 뻔했다. 소방관이 끌어냈다.', { vitality: -6, money: -500 })],
    ['몸만 빠져나온 것에 감사한다', 'caring', { bond: 4, money: -500 }, '살림은 탔지만 {partner|이|가} 곁에 있었다. 이웃이 이불을 가져다주었다.', { cost: 0, affection: 3 }],
    ['임시 거처를 빌린다', 'pragmatic', { money: -300, joy: -3 }, '한 계절을 센터 옆 쪽방에서 지냈다.', { cost: 0, follow: [echoLater([1, 2], '이웃의 손', '불이 났을 때 이불을 가져다준 이웃이 집들이에 와서 화분을 두고 갔다.', { joy: 3, bond: 2 })] }],
  ], { when: env('숲', '도시') }],
  ['mis-money-flood', 16, 85, '물에 잠긴 마을', '밤새 내린 비로 강물이 둑을 넘었다. 1층이 허리까지 잠겼다.', [
    ['물 포켓몬과 가재도구를 건진다', 'bold', { courage: 3, money: -200 }, '파티 포켓몬이 물속에서 상자를 건져 올렸다. 절반은 살렸다.', { cost: 0, training: 15 }],
    ['이웃 구조를 먼저 돕는다', 'caring', { reputation: 3, money: -450 }, '내 집은 뒷전이었다. 노부부를 지붕에서 내렸다.', { cost: 0, world: { safety: 2 }, follow: [echoLater([1, 3], '물이 빠진 뒤', '그때 지붕에서 내려 준 노부부가 수리비에 보태라며 봉투를 두고 갔다.', { money: 350, joy: 3 })] }],
    ['높은 곳으로 피한다', 'pragmatic', { wisdom: 2, money: -400, joy: -3 }, '안전했다. 집은 그렇지 못했다.', { cost: 0 }],
  ], { when: env('강', '바다') }],
  ['mis-money-layoff', 20, 62, '해고 통보', '봉투 하나가 책상 위에 놓여 있었다. 조직 개편이라고 했다. 내 자리는 없었다.', [
    ['부당함을 따진다', 'bold', { courage: 3 }, '목소리를 냈다. 자리는 되찾았지만 분위기는 냉랭했다.', check('courage', 15, '아무도 편들지 않았다. 짐을 싸서 나왔다.', { joy: -5 }, { leaveCareer: true })],
    ['조건을 받아들이고 남는다', 'pragmatic', { joy: -3, wisdom: 2 }, '급여가 줄어든 계약직으로 남았다. 당분간은.', { work: { cut: 2, satisfaction: -8 } }],
    ['짐을 싼다', 'easygoing', { joy: -2, courage: 2 }, '미련 없이 나왔다. 내일부터 뭘 할지는 모르지만.', { leaveCareer: true }],
  ], { when: s => ordinaryJob(s) && s.career !== 'merchant' }],
  ['mis-money-unpaid', 18, 65, '밀린 급여', '석 달째 급여가 들어오지 않는다. 윗사람은 "다음 달엔 꼭"이라고만 한다.', [
    ['노동청에 신고한다', 'bold', { courage: 3, money: 400 }, '조사가 시작되자 밀린 돈이 한꺼번에 들어왔다. 일터의 눈초리는 차가워졌다.', { work: { satisfaction: -6 } }],
    ['기다린다', 'easygoing', { joy: -3, debt: 300 }, '넉 달째도 들어오지 않았다. 생활비는 빚이 됐다.'],
    ['받을 돈만 받고 그만둔다', 'pragmatic', { money: 250, wisdom: 2 }, '일부만 받고 나왔다. 나머지는 포기했다.', { leaveCareer: true }],
  ], { when: s => ordinaryJob(s) && s.career !== 'merchant' }],
  ['mis-money-guarantor', 22, 65, '보증 부탁', '{friend|이|가} 가게를 넓히려는데 대출에 보증인이 필요하다며 찾아왔다. "절대 폐 안 끼칠게."', [
    ['보증을 선다', 'caring', { bond: 3 }, '서류에 이름을 썼다. {friend|은|는} 울먹이며 고마워했다.', s => ({ cast: { friend: { affinity: 10 } }, follow: [prefill(s, choiceLater([2, 4], '보증의 끝', '{friend}의 가게가 문을 닫았다. 은행이 보증인인 당신에게 연락해 왔다. 1,500P.', [
      ['빚을 떠안는다', 'caring', { debt: 1500, joy: -4 }, '친구 대신 갚기로 했다. {friend|은|는} 한동안 얼굴을 들지 못했다.', { cast: { friend: { affinity: 5 } } }],
      ['친구에게 갚으라고 한다', 'pragmatic', { joy: -2, bond: -3 }, '{friend|은|는} 알겠다고 했지만 연락이 뜸해졌다.', { cast: { friend: { affinity: -15 } } }],
      ['반반 나눈다', 'pragmatic', { debt: 750, wisdom: 3 }, '절반씩 갚기로 했다. 우정은 상처를 입었지만 끊어지지 않았다.', { cast: { friend: { affinity: -4 } } }],
    ], 0.6))] })],
    ['거절한다', 'pragmatic', { wisdom: 3, joy: -2 }, '친구는 알겠다고 했지만 문을 닫을 때 소리가 컸다.', { cast: { friend: { affinity: -8 } } }],
    ['보증 대신 조금 빌려준다', 'caring', { money: -300, bond: 2 }, '보증은 못 서지만 이 정도는 괜찮다고 했다.', { follow: [later('friend-repay', [2, 5], 1, { amount: 300 })] }],
  ]],
  ['mis-money-quick-loan', 18, 75, '텅 빈 지갑', '월세와 사료값이 한꺼번에 돌아왔다. 통장 잔고로는 어느 쪽도 못 막는다.', [
    ['급전 대출을 받는다', 'pragmatic', { joy: 1 }, '서류 한 장에 돈이 들어왔다. 이자율은 나중에 읽었다.', { loan: 1000 }],
    ['{friend}에게 빌린다', 'caring', { bond: 2, money: 300 }, '{friend|이|가} 말없이 봉투를 건넸다.', s => ({ cast: { friend: { affinity: -3 } }, follow: [prefill(s, choiceLater([1, 2], '빌린 돈', '{friend|이|가} 조심스럽게 그 돈 이야기를 꺼냈다.', [
      ['갚는다', 'caring', { money: -300, bond: 2 }, '이자 대신 저녁을 샀다.', { cast: { friend: { affinity: 6 } } }],
      ['조금만 더 기다려 달라고 한다', 'easygoing', { joy: -2 }, '{friend|은|는} 알겠다고 했지만 표정이 굳었다.', { cast: { friend: { affinity: -10 } } }],
    ]))] })],
    ['한 달을 굶다시피 버틴다', 'bold', { vitality: -4, wisdom: 2 }, '사료는 샀고 내 밥은 줄였다. {partner|이|가} 제 그릇을 밀어 주었다.', { affection: 2 }],
  ], repeat(6, { weight: s => s.money < 300 ? 4 : 0.4 })],
  ['mis-money-collector', 18, 85, '독촉장', '빨간 글씨의 독촉장이 문틈에 끼어 있었다. 전화는 하루에 세 번씩 온다.', [
    ['일부라도 갚는다', 'pragmatic', { money: -400, debt: -400, wisdom: 2 }, '전화가 당분간 멎었다.'],
    ['상환 계획을 다시 짠다', 'pragmatic', { wisdom: 3, joy: -1, debt: -200 }, '상담소에서 이자를 깎고 기간을 늘렸다.'],
    ['전화를 안 받는다', 'easygoing', { joy: -3, reputation: -2, debt: 150 }, '전화는 집으로 찾아왔다. 이웃들이 봤다.'],
    ['사채로 돌려막는다', 'bold', { joy: 1, infamy: 2 }, '당장은 숨통이 트였다. 이자는 두 배가 됐다.', { loan: 800 }],
  ], repeat(3, { when: s => debtOf(s) > 1500 })],
  ['mis-money-gamble', 18, 80, '게임코너의 불빛', '{villain|이|가} 뒤를 봐준다는 소문이 도는 게임코너. 슬롯 소리가 골목까지 새어 나온다.', [
    ['동전 몇 개만', 'easygoing', { joy: 2, money: -100 }, '코인을 잃고 음료 한 잔을 받았다. 재미는 있었다.'],
    ['크게 건다', 'bold', { courage: 1, money: 700 }, '세 번째 슬롯에서 7이 줄지어 섰다. 코인을 바꾸니 두둑했다.', check('joy', 20, '지갑이 비었다. 코인을 더 사러 가는 손이 멈추지 않았다.', { money: -500, joy: -2 }, { flag: 'gamble-habit' })],
    ['지나친다', 'pragmatic', { wisdom: 2 }, '불빛을 등지고 집으로 갔다.'],
  ], repeat(5)],
  ['mis-money-gamble-habit', 18, 85, '멈추지 않는 손', '월급날이면 발이 게임코너로 향한다. 이번 달도 사료값이 코인이 됐다.', [
    ['끊는다', 'bold', { wisdom: 4, courage: 3 }, '파트너를 센터에 맡기던 날, 그 눈을 보고 결심했다. 게임코너 앞길을 돌아 다녔다.', { unflag: 'gamble-habit', affection: 2 }],
    ['한 번만 더', 'easygoing', { joy: 1, infamy: 2 }, '이번엔 딸 것 같았다. 아니었다. 코인 값은 빚이 됐다.', { loan: 800, follow: [choiceLater([1, 2], '게임코너의 빚', '게임코너 뒷방 사람들이 빚 이야기를 꺼냈다. 갚든지, 일을 하나 하든지.', [
      ['갚는다', 'pragmatic', { money: -800, debt: -800, joy: -2 }, '갚았다. 다시는 들어가지 않기로 했다.', { unflag: 'gamble-habit' }],
      ['일을 한다', 'bold', { money: 300, infamy: 8, reputation: -3 }, '상자 하나를 밤에 옮겼다. 안을 보지 않았다.'],
      ['도망친다', 'bold', { joy: -4, reputation: -4, infamy: 3 }, '옆 마을로 도망치듯 떠났다. 그들은 기억한다.', { move: 'region' }],
    ])] }],
    ['포켓몬을 저당 잡힌다', 'pragmatic', { money: 600, joy: -5, bond: -4 }, '몬스터볼 하나를 뒷방에 맡기고 코인을 받았다. 되찾지 못했다.', { losePokemon: 'box' }],
  ], repeat(2, { when: s => Boolean(s.flags['gamble-habit']) && spare(s) })],
  ['mis-money-after-bankrupt', 20, 90, '파산 이후', '통장은 비었고 이름은 신용 불량자 명단에 있다. 그래도 아침은 온다.', [
    ['밑바닥부터 다시', 'bold', { courage: 4, wisdom: 2, money: 150 }, '날품을 팔았다. 처음 받은 돈으로 사료를 샀다.', { follow: [echoLater([3, 5], '다시 선 자리', '파산 기록이 지워졌다는 통지가 왔다. 그동안 모은 돈이 통장에 적혀 있었다.', { joy: 5, reputation: 3, money: 300 })] }],
    ['파트너와 떠돈다', 'easygoing', { bond: 3, joy: 1 }, '가진 게 없으니 어디든 갈 수 있었다. {partner|과|와} 들판에서 잤다.', { affection: 3, move: 'region' }],
    ['뒷골목 일을 받는다', 'pragmatic', { money: 500, infamy: 6, reputation: -2 }, '묻지 않는 일에는 묻지 않는 돈이 따라왔다.'],
  ], { when: s => Boolean(s.flags.bankrupt) }],
  ['mis-money-pickpocket', 12, 85, '사라진 지갑', '붐비는 시장에서 누군가 부딪쳤다. 지갑이 없다.', [
    ['소리친다', 'bold', { courage: 2 }, '{partner|이|가} 먼저 달려들었다. 소매치기가 지갑을 떨어뜨리고 달아났다.', check('courage', 0, '인파 속으로 사라졌다. 지갑도.', { money: -200, joy: -2 })],
    ['포기한다', 'easygoing', { joy: -2, money: -200, wisdom: 1 }, '다음부턴 안주머니에 넣기로 했다.', { cost: 0 }],
  ], repeat(7, { when: env('도시', '바다') })],
  ['mis-money-fake', 14, 70, '가짜 장비', '싸게 산 포켓몬 장비가 첫 배틀에서 부서졌다. 파는 사람은 이미 노점을 치웠다.', [
    ['정품을 다시 산다', 'pragmatic', { money: -250, wisdom: 2 }, '싼 게 비지떡이었다. 두 번 값을 치렀다.'],
    ['직접 고쳐 쓴다', 'curious', { wisdom: 3 }, '뜯어 보니 구조는 단순했다. 고쳐서 몇 년 더 썼다.', check('wisdom', 5, '고치다 완전히 망가뜨렸다.', { joy: -2 })],
    ['노점을 찾아 따진다', 'bold', { courage: 2, money: 100 }, '옆 마을 장터에서 그 노점을 찾았다. 환불 대신 반값을 돌려받았다.', check('courage', 10, '노점 사람들에게 둘러싸여 물러났다.', { vitality: -3 })],
  ], repeat(8)],
  ['mis-money-rent', 20, 70, '집주인의 통보', '집주인이 월세를 올리겠다고 했다. 다음 달부터.', [
    ['올려 준다', 'pragmatic', { money: -300, joy: -2 }, '익숙한 집을 지켰다. 통장은 얇아졌다.'],
    ['협상한다', 'bold', { courage: 2, wisdom: 2 }, '수리를 직접 하겠다는 조건으로 인상 폭을 반으로 줄였다.', check('courage', 10, '집주인은 싫으면 나가라고 했다. 결국 올려 줬다.', { money: -300, joy: -3 })],
    ['더 싼 곳으로 옮긴다', 'easygoing', { joy: -1, wisdom: 1 }, '짐을 싸서 옆 마을의 작은 집으로 갔다. 창문으로 들판이 보였다.', { move: 'region' }],
  ], repeat(8, { when: s => !s.flags.homeowner })],
]);

// ── 3. 포켓몬 ──
const pokemonTrouble = table('misfortune', [
  ['mis-poke-runaway', 10, 80, '열린 몬스터볼', '아침에 보니 몬스터볼 하나가 비어 있었다. 요즘 훈련이 심했나, 아니면 다른 이유가 있나.', [
    ['찾아 나선다', 'caring', { bond: 3 }, '숲 끝에서 찾았다. 한참 마주 보다가 먼저 다가왔다. 함께 돌아왔다.', check('bond', 10, '발자국은 강 앞에서 끊겼다. 돌아오지 않았다.', { joy: -5, bond: -2 }, { losePokemon: 'box' })],
    ['기다린다', 'easygoing', { joy: -2, wisdom: 2 }, '문을 열어 두었다. 사흘째 밤에 제 발로 들어왔다. 왜 나갔는지는 묻지 않았다.', { affection: 2 }],
    ['훈련을 바꾼다', 'pragmatic', { wisdom: 3 }, '돌아온 뒤 훈련량을 줄이고 쉬는 날을 만들었다. 눈빛이 달라졌다.', { affection: 3 }],
  ], { when: spare }],
  ['mis-poke-sick', 8, 85, '밥을 남기는 날', '{partner|이|가} 사흘째 밥을 남긴다. 눈이 흐리고 몸이 뜨겁다.', [
    ['센터에 입원시킨다', 'caring', { bond: 2, money: -200 }, '일주일 입원했다. 퇴원하던 날 제일 먼저 밥그릇으로 갔다.', { affection: 3 }],
    ['집에서 간호한다', 'caring', { bond: 3, vitality: -2 }, '밤마다 물수건을 갈았다. 열흘 만에 꼬리가 다시 움직였다.', check('bond', 5, '집에서 버티기엔 병이 깊었다. 결국 센터로 뛰었고, 회복이 느렸다.', { joy: -3 }, { affection: -3 })],
    ['쉬게만 둔다', 'easygoing', { joy: -2 }, '알아서 낫겠지 했다. 나았지만 한동안 눈을 맞추지 않았다.', { affection: -3 }],
  ], repeat(6, { when: s => s.party.length > 0 })],
  ['mis-poke-stolen', 12, 75, '빈 가방', '센터에 맡긴 몬스터볼 하나가 사라졌다. 직원은 {villain} 복장을 한 사람이 다녀갔다고 했다.', [
    ['뒤쫓는다', 'bold', { courage: 4 }, '{partner|과|와} 뒷골목까지 쫓아가 몬스터볼을 되찾았다.', s => { const id = localSpecies(s); return check('courage', 15, '놓쳤다. 다시 만날 수 있을까.', { joy: -5 }, { losePokemon: 'box', follow: [prefill(s, choiceLater([1, 3], '압수품 창고', `{villain} 아지트가 단속됐다. 경찰은 그때 잃은 아이는 찾지 못했지만, 압수된 포켓몬 중 주인 없는 ${poke(id, '을', '를')} 맡아 줄 수 있느냐고 물었다.`, [
      ['맡는다', 'caring', { joy: 4, bond: 3 }, `${poke(id, '은', '는')} 처음엔 구석에만 있었다. 봄이 되자 밥그릇 앞에서 기다렸다.`, { join: id, joinOrigin: 'rescued' }],
      ['아직은 마음의 준비가 안 됐다', 'easygoing', { wisdom: 2, joy: -1 }, '빈 몬스터볼을 아직 치우지 못했다고 말했다.'],
    ], 0.8))] }); }],
    ['경찰에 신고한다', 'pragmatic', { wisdom: 2, reputation: 1 }, '신고는 접수됐다. 며칠 뒤 공터에 버려진 몬스터볼이 발견됐다. 무사했다.', { world: { safety: 1 } }],
    ['{villain} 쪽에 돈을 준다', 'pragmatic', { money: -400, joy: -2, infamy: 1 }, '중간 사람을 통해 돈을 건네니 몬스터볼이 돌아왔다. 기분은 더러웠다.'],
  ], { when: s => spare(s) && s.box.length > 0 }],
  ['mis-poke-battle-injury', 12, 70, '멈춘 배틀', '배틀 중 {partner|이|가} 기술을 맞고 일어나지 못했다. 심판이 경기를 멈췄다.', [
    ['센터로 뛴다', 'caring', { bond: 3, vitality: -3 }, '안고 센터까지 뛰었다. 한 달 입원, 훈련은 멈췄다.', { affection: 3 }],
    ['상대 트레이너에게 따진다', 'bold', { courage: 2, joy: -2 }, '규칙 안의 기술이었다. 따져도 달라지는 건 없었다. 상대는 미안해했다.', { cast: { rival: { affinity: -3 } } }],
    ['한 시즌 쉰다', 'pragmatic', { wisdom: 3, joy: -2 }, '배틀을 끊고 재활에 집중했다. 돌아왔을 때 둘 다 조금 더 신중해졌다.', s => ({ affection: 2, follow: [prefill(s, echoLater([1, 2], '돌아온 무대', '재활을 마친 {partner|이|가} 첫 복귀전을 치렀다. 예전 같은 돌진은 없었지만 더 영리해졌다.', { joy: 4, courage: 2 }))] })],
  ], repeat(8, { when: s => s.party.length > 0 })],
  ['mis-poke-poachers', 14, 70, '밀렵꾼', '숲에서 덫에 걸린 포켓몬과 그 옆에 선 남자들을 보았다. 눈이 마주쳤다.', [
    ['맞선다', 'bold', { courage: 5, reputation: 2 }, '', s => { const id = localSpecies(s); return { outcome: fill(s, `{partner|이|가} 앞을 막았다. 밀렵꾼들은 덫을 버리고 달아났고, ${poke(id, '을', '를')} 풀어 주었다.`), world: { ecology: 2 }, training: 20, ...check('courage', 15, '수가 많았다. 쫓기듯 물러났고 덫은 그대로였다.', { vitality: -5, joy: -3 }) }; }],
    ['몰래 사진을 찍어 신고한다', 'curious', { wisdom: 3, reputation: 1 }, '레인저가 다음 날 덫을 모두 걷었다.', { world: { safety: 2, ecology: 1 } }],
    ['못 본 척한다', 'easygoing', { joy: -3 }, '돌아섰다. 덫에 걸린 눈이 며칠 동안 떠올랐다.', { world: { ecology: -2 } }],
  ], { when: env('숲', '산') }],
  ['mis-poke-wild-attack', 10, 80, '밤길의 습격', '밤길에서 야생 포켓몬 무리에 둘러싸였다. 먹이가 부족한 해라고 했다.', [
    ['파티로 막는다', 'bold', { courage: 3 }, '파티가 둘러서서 길을 열었다.', { battle: { kind: 'wild' }, after: { win: { training: 20 }, lose: { effects: { vitality: -5 } } } }],
    ['먹이를 던지고 물러선다', 'caring', { wisdom: 2, money: -80 }, '가방의 간식을 모두 던졌다. 무리가 먹는 사이 빠져나왔다.'],
    ['달린다', 'easygoing', { vitality: -4, joy: -2 }, '달렸다. 몇 군데 긁혔지만 마을 불빛이 보였다.'],
  ], repeat(6, { weight: s => unsafe(s) || regionState(s).ecology < 40 ? 2.5 : 0.8, when: s => s.party.length > 0 })],
  ['mis-poke-box-neglect', 16, 85, '잊힌 박스', '센터 직원이 조심스레 말했다. 박스의 포켓몬 몇 마리가 몇 년째 한 번도 나오지 못했다고.', [
    ['한 마리씩 데리고 나온다', 'caring', { bond: 4, joy: 2 }, '주말마다 한 마리씩 들판에 데려갔다. 처음엔 어색했고 곧 아니었다.', { affection: 3 }],
    ['브리더에게 넘긴다', 'pragmatic', { money: 300, joy: -3, bond: -3 }, '몇 년 동안 꺼내지 않은 몬스터볼 하나를 브리더에게 넘겼다. 돈은 받았고 마음은 받지 못했다.', { losePokemon: 'box' }],
    ['바쁘다고 넘긴다', 'easygoing', { joy: -1 }, '다음에, 다음에 하다가 한 해가 갔다.', { affection: -3 }],
  ], repeat(8, { when: s => s.box.length >= 2 })],
  ['mis-poke-lost-festival', 8, 70, '축제의 인파', '축제 인파 속에서 {partner|이|가} 보이지 않는다. 불꽃놀이 소리에 놀란 모양이다.', [
    ['이름을 부르며 찾는다', 'caring', { bond: 3 }, '강가 다리 밑에서 떨고 있었다. 안아 들자 꼬리가 움직였다.', check('bond', 5, '밤새 찾았다. 새벽에 센터 앞에 혼자 앉아 있었다. 눈이 서운했다.', { joy: -4 }, { affection: -4 })],
    ['방송을 부탁한다', 'pragmatic', { wisdom: 2 }, '축제 본부 방송이 세 번 나간 뒤 {rival|이|가} 안고 나타났다.', { cast: { rival: { affinity: 4 } } }],
    ['익숙한 자리에서 기다린다', 'easygoing', { wisdom: 2, joy: -1 }, '아침 노점 앞에서 기다렸다. 불꽃놀이가 끝나자 제 발로 돌아왔다.'],
  ], { when: s => s.party.length > 0 }],
  ['mis-poke-sell-offer', 14, 70, '값을 부르는 사람', '낯선 트레이너가 파티의 한 마리를 보고 큰돈을 불렀다. "대회용으로 쓰고 싶어서요."', [
    ['거절한다', 'caring', { bond: 3 }, '값을 매길 수 없다고 했다. 트레이너는 어깨를 으쓱하고 떠났다.', { affection: 2 }],
    ['판다', 'pragmatic', { money: 1200, joy: -6, bond: -4 }, '몬스터볼이 손을 떠났다. 돈은 금방 쓰였고 빈자리는 오래 남았다.', { losePokemon: 'party', follow: [echoLater([2, 4], '대회 중계', '중계에서 낯익은 얼굴을 봤다. 잘 싸우고 있었다. 카메라를 한 번도 보지 않았다.', { joy: -3, wisdom: 2 })] }],
    ['대신 배틀을 제안한다', 'bold', { courage: 3 }, '팔 수는 없지만 겨룰 수는 있다고 했다.', { battle: { kind: 'wild' }, after: { win: { effects: { reputation: 2 }, training: 15 }, lose: { effects: { joy: -2 } } } }],
  ], { when: spare }],
  ['mis-poke-vet-bill', 14, 85, '수술이 필요하다', '센터 의사가 파티 한 마리의 사진을 보여 주었다. 수술하지 않으면 다리를 못 쓴다고 했다.', [
    ['수술비를 낸다', 'caring', { bond: 3, money: -600 }, '수술은 잘 됐다. 깁스를 풀던 날 센터 복도를 뛰어다녔다.', { affection: 3 }],
    ['분할로 낸다', 'pragmatic', { bond: 2, debt: 650 }, '센터가 분할 납부를 허락했다. 고지서와 함께 회복했다.', { affection: 2 }],
    ['민간요법을 써 본다', 'curious', { wisdom: 2 }, '산골 할머니의 약초 찜질이 통했다. 의사도 놀랐다.', check('wisdom', 15, '효과가 없었다. 결국 늦게 수술을 받았고 다리를 절게 됐다.', { joy: -4, money: -600 }, { affection: -3 })],
  ], { when: s => s.party.length > 0 }],
]);

const pokemonDaily = table('pokemon', [
  ['mis-poke-old-partner', 58, 95, '느려진 걸음', '{partner|이|가} 산책길에서 자꾸 멈춘다. 예전엔 앞서 달리던 길이다.', [
    ['걸음을 맞춘다', 'caring', { bond: 5, joy: 2 }, '이제 나도 느리다. 둘이 같은 속도로 걸었다.', { affection: 4 }],
    ['업고 걷는다', 'bold', { bond: 4, vitality: -2 }, '가벼워진 몸을 업고 옛 길을 끝까지 걸었다.', s => ({ affection: 4, follow: [prefill(s, echoLater([1, 2], '같은 길', '{partner|이|가} 오늘은 끝까지 제 발로 걸었다. 느렸지만 멈추지 않았다.', { joy: 5, bond: 2 }))] })],
    ['집에 두고 혼자 나간다', 'easygoing', { joy: -1 }, '혼자 걷는 길은 짧게 느껴졌다. 돌아오니 문 앞에 앉아 있었다.', { affection: -2 }],
  ], { when: s => s.party.length > 0 }],
  ['mis-poke-party-fight', 10, 80, '파티 안의 다툼', '파티의 두 마리가 서로를 보기만 해도 으르렁댄다. 오늘은 밥그릇이 엎어졌다.', [
    ['둘을 따로 훈련시킨다', 'pragmatic', { wisdom: 3 }, '각자의 시간이 생기자 으르렁거림이 줄었다.', { training: 10, affection: 1 }],
    ['함께 과제를 준다', 'bold', { bond: 3 }, '둘이서만 해결해야 하는 과제를 줬다. 해 질 녘에 나란히 돌아왔다.', check('bond', 10, '과제는 싸움으로 끝났다. 둘 다 다쳤다.', { joy: -3 }, { affection: -3 })],
    ['한쪽을 박스에 넣는다', 'easygoing', { joy: -1 }, '한 마리를 박스로 보냈다. 조용해졌지만 눈빛이 걸렸다.', { affection: -2 }],
  ], repeat(7, { when: s => s.party.length >= 2 })],
  ['mis-poke-allergy', 12, 70, '재채기의 원인', '몇 달째 멈추지 않던 재채기의 원인이 밝혀졌다. 파티 한 마리의 털이었다.', [
    ['약을 먹으며 함께 산다', 'caring', { bond: 3, money: -100 }, '매일 아침 약 한 알. 그 정도면 괜찮았다.', { affection: 2 }],
    ['참는다', 'bold', { vitality: -3, bond: 2 }, '휴지를 늘 들고 다녔다. 포켓몬은 눈치채고 조금 떨어져 잤다.'],
    ['거리를 둔다', 'pragmatic', { vitality: 2, joy: -2 }, '훈련 때만 꺼내기로 했다. 서로 조금 서먹해졌다.', { affection: -2 }],
  ], { when: s => s.party.length > 0 }],
  ['mis-poke-egg-cold', 10, 70, '식어 버린 알', '맡아 기르던 알이 어느 날부터 차가워졌다. 브리더는 고개를 저었다.', [
    ['끝까지 품는다', 'caring', { bond: 3, joy: -2 }, '한 달을 더 품었다. 깨어나지 않았다. 뒷마당에 묻고 꽃씨를 뿌렸다.', { follow: [echoLater([1, 1], '뒷마당의 꽃', '알을 묻은 자리에 꽃이 피었다. 파트너가 그 앞에 오래 앉아 있었다.', { joy: 3, bond: 2 })] }],
    ['원인을 공부한다', 'curious', { wisdom: 4 }, '온도 기록을 뒤져 원인을 찾았다. 다음 알은 실수하지 않을 것이다.'],
    ['브리더에게 돌려준다', 'easygoing', { joy: -3 }, '브리더가 조용히 알을 받아 갔다.'],
  ]],
]);

// ── 4. 관계 ──
const relationships = table('misfortune', [
  ['mis-rel-betrayal', 16, 60, '친구의 입', '{friend}에게만 말했던 이야기가 마을에 돌고 있었다. 추궁하자 {friend|은|는} 눈을 피했다.', [
    ['관계를 끊는다', 'pragmatic', { joy: -4, wisdom: 2 }, '더는 연락하지 않기로 했다.', s => ({ cast: { friend: { affinity: -15 } }, follow: [prefill(s, choiceLater([2, 4], '늦은 사과', '{friend|이|가} 찾아왔다. 그때 왜 그랬는지, 얼마나 후회했는지를 더듬더듬 말했다.', [
      ['받아 준다', 'caring', { joy: 4, bond: 3 }, '오래 걸렸지만 다시 마주 앉았다.', { cast: { friend: { affinity: 14 } } }],
      ['돌려보낸다', 'pragmatic', { wisdom: 3, joy: -1 }, '사과는 받았다. 관계는 돌아오지 않았다.', { cast: { friend: { affinity: -5 } } }],
    ], 0.7))] })],
    ['이유를 묻는다', 'caring', { bond: 2, joy: -2 }, '{friend|은|는} 자랑하고 싶어서였다고 했다. 어이가 없어 웃었다. 관계는 금이 간 채 이어졌다.', { cast: { friend: { affinity: -8 } } }],
    ['똑같이 되갚는다', 'bold', { joy: 1, infamy: 2, reputation: -2 }, '{friend}의 비밀도 마을에 풀었다. 둘 다 잃은 게 많았다.', { cast: { friend: { affinity: -15 } } }],
  ]],
  ['mis-rel-rival-mock', 12, 60, '라이벌의 비웃음', '{rival|이|가} 사람들 앞에서 당신의 지난 패배를 흉내 냈다. 웃음소리가 컸다.', [
    ['배틀을 신청한다', 'bold', { courage: 3 }, '그 자리에서 몬스터볼을 꺼냈다.', { battle: { kind: 'rival' }, after: { win: { effects: { reputation: 2, joy: 3 }, cast: { rival: { affinity: 3 } } }, lose: { effects: { joy: -4 } } } }],
    ['무시한다', 'pragmatic', { wisdom: 3 }, '웃음이 잦아들 때까지 기다렸다가 자리를 떴다.'],
    ['되받아친다', 'bold', { courage: 2, reputation: -1 }, '{rival}의 약점을 꺼냈다. 웃음은 멎었고 분위기도 그랬다.', { cast: { rival: { affinity: -6 } } }],
  ], repeat(6)],
  ['mis-rel-breakup', 18, 55, '끝내자는 말', s => s.relationship.status === 'engaged' ? '{spouse|이|가} 결혼을 미루자고 했다. 미루자는 말이 아니라는 걸 둘 다 알았다.' : '{spouse|이|가} 오래 말을 고르다 헤어지자고 했다. 당신 탓은 아니라고 했다.', [
    ['받아들인다', 'pragmatic', { joy: -4, wisdom: 3 }, '붙잡지 않았다. 짐을 나누고 열쇠를 돌려주었다.', { relationship: { key: 'separate' } }],
    ['붙잡는다', 'caring', { bond: 3 }, '밤새 이야기했다. 한 번 더 해 보기로 했다.', check('bond', 15, '매달릴수록 멀어졌다. 결국 혼자 남았다.', { joy: -6, bond: -2 }, { relationship: { key: 'separate' } })],
    ['파트너와 여행을 떠난다', 'easygoing', { joy: -2, courage: 2 }, '대답 대신 가방을 쌌다. 돌아왔을 때 집은 비어 있었다.', { relationship: { key: 'separate' }, affection: 3, move: 'region' }],
  ], { when: dating }],
  ['mis-rel-neighbor', 20, 85, '담장 너머', '옆집이 파티 포켓몬 소리가 시끄럽다며 경찰을 불렀다. 그쪽 마당의 쓰레기도 문제였다.', [
    ['찾아가 이야기한다', 'caring', { bond: 2, wisdom: 2 }, '차 한 잔 하며 훈련 시간을 정했다. 쓰레기 이야기도 꺼냈다.', { world: { safety: 1 } }],
    ['맞고소한다', 'bold', { courage: 2, joy: -3, money: -150 }, '서류가 오갔다. 이긴 사람은 없었다.', { world: { safety: -2 } }],
    ['참는다', 'easygoing', { joy: -2 }, '훈련을 들판으로 옮겼다. 옆집과는 인사만 한다.'],
  ], repeat(8)],
  ['mis-rel-rumor', 18, 75, '떠도는 말', '당신이 포켓몬을 학대한다는 소문이 돌았다. 누가 냈는지는 모른다. 센터 직원의 눈빛이 달라졌다.', [
    ['공개적으로 해명한다', 'bold', { courage: 3 }, '파티를 데리고 광장에 나갔다. 포켓몬들이 대신 대답해 주었다.', check('courage', 10, '해명할수록 말이 더 돌았다.', { reputation: -4, joy: -3 })],
    ['무시한다', 'easygoing', { wisdom: 2, reputation: -2 }, '시간이 지나자 소문은 다른 소문에 밀려났다.'],
    ['출처를 찾는다', 'curious', { wisdom: 3 }, '소문의 끝에는 예전에 다퉜던 사람이 있었다. 마주 앉아 오해를 풀었다.', check('wisdom', 10, '끝내 찾지 못했다. 사람들을 의심하는 버릇만 남았다.', { joy: -3, bond: -2 })],
  ], repeat(7)],
  ['mis-rel-friend-drift', 20, 65, '멀어지는 친구', '{friend|이|가} 바쁘다며 세 번째 약속을 미뤘다. 요즘 다른 사람들과 찍은 사진만 올라온다.', [
    ['먼저 찾아간다', 'caring', { bond: 3 }, '불쑥 찾아가니 {friend|은|는} 놀라고 반가워했다. 미룬 이유도 들었다.', { cast: { friend: { affinity: 8 } } }],
    ['그러려니 한다', 'easygoing', { wisdom: 2 }, '사람은 멀어지기도 한다고 생각했다.', { follow: [later('friend-drift', [1, 3])] }],
    ['서운함을 쏟아낸다', 'bold', { joy: -2, courage: 1 }, '긴 메시지를 보냈다. 답장은 짧았다.', { cast: { friend: { affinity: -8 } } }],
  ]],
  ['mis-rel-loneliness', 65, 98, '조용한 집', '전화가 며칠째 울리지 않았다. 달력에 적힌 약속이 없다.', [
    ['동네 모임에 나간다', 'bold', { courage: 2, joy: 4 }, '처음엔 어색했다. 두 번째부터는 자리가 생겼다.', { follow: [echoLater([1, 2], '매주 수요일', '모임 사람들이 생일 케이크를 들고 왔다. 파트너 몫의 간식까지.', { joy: 5, bond: 2 })] }],
    ['파트너와 둘이 지낸다', 'easygoing', { bond: 4 }, '{partner|과|와} 하루 종일 창가에 앉아 있었다. 그걸로 충분한 날도 있었다.', { affection: 3 }],
    ['집에만 있는다', 'easygoing', { joy: -4, vitality: -2 }, '커튼을 치고 텔레비전만 봤다. 날짜 감각이 흐려졌다.'],
  ], { when: s => !married(s) }],
  ['mis-rel-parent-pressure', 28, 45, '명절의 질문', '명절 밥상에서 결혼 이야기가 나왔다. 친척들의 질문이 끝나지 않았다.', [
    ['웃어넘긴다', 'easygoing', { wisdom: 2, joy: -1 }, '파트너 이야기로 화제를 돌렸다. 통했다.'],
    ['화를 낸다', 'bold', { courage: 2, joy: -3 }, '숟가락을 놓고 나왔다. 그해 명절은 그렇게 끝났다.', { cast: { family: { health: -3 }, sibling: { affinity: -4 } } }],
    ['내 삶을 설명한다', 'caring', { bond: 3, wisdom: 2 }, '지금 사는 방식이 왜 좋은지 차분히 말했다. 어른들은 반쯤 이해했다.'],
  ], { when: single }],
  ['mis-rel-sibling-money', 38, 70, '형제의 돈 문제', '고향 집을 정리하면서 형제와 돈 문제가 불거졌다. 서로 기억하는 약속이 달랐다.', [
    ['양보한다', 'caring', { bond: 2, joy: -2 }, '내 몫을 줄였다. 형제는 고맙다고 하지 않았지만 명절엔 왔다.', { cast: { sibling: { affinity: 6 } } }],
    ['제3자를 세운다', 'pragmatic', { wisdom: 3, money: -150 }, '중재인을 두고 서류대로 나눴다. 서운함은 남았지만 다툼은 끝났다.'],
    ['끝까지 다툰다', 'bold', { money: 400, joy: -4 }, '내 몫은 지켰다. 형제와는 몇 년째 말을 하지 않는다.', { cast: { sibling: { affinity: -15 }, family: { health: -3 } } }],
  ]],
]);

const familyTrouble = table('family', [
  ['mis-fam-marriage-conflict', 24, 65, '식어 버린 식탁', '{spouse|과|와} 일주일째 필요한 말만 한다. 포켓몬 돌봄이 한쪽에 몰렸다는 말이 시작이었다.', [
    ['먼저 사과한다', 'caring', { bond: 4, joy: 2 }, '사과하고 역할을 다시 나눴다. 식탁이 조금 따뜻해졌다.'],
    ['상담을 받는다', 'pragmatic', { wisdom: 3, money: -200, bond: 2 }, '상담사 앞에서 서로가 모르던 말을 들었다.'],
    ['버틴다', 'easygoing', { joy: -4 }, '시간이 해결해 주길 바랐다. 침묵이 길어졌다.', s => ({ follow: [prefill(s, choiceLater([1, 2], '이혼 이야기', '{spouse|이|가} 처음으로 이혼이라는 말을 꺼냈다. 진심인지 묻자 모르겠다고 했다.', [
      ['다시 시작하자고 한다', 'caring', { bond: 4, joy: 2 }, '처음 만났던 곳에 함께 갔다. 돌아오는 길에 손을 잡았다.'],
      ['헤어진다', 'pragmatic', { joy: -6, wisdom: 3, money: -500 }, '서류에 도장을 찍었다. 포켓몬들은 둘로 나뉘었다.', { relationship: { key: 'separate' }, cost: 0 }],
    ], 0.6))] })],
  ], { when: married }],
  ['mis-fam-child-trouble', 32, 55, '학교에서 온 전화', '아이가 학교에서 다른 아이의 포켓몬을 다치게 했다고 했다. 아이는 그 애가 먼저 놀렸다고 했다.', [
    ['아이 편에서 듣는다', 'caring', { bond: 3 }, '아이의 말을 끝까지 들은 뒤 함께 사과하러 갔다.', { follow: [echoLater([5, 9], '그날의 사과', '다 큰 아이가 그때 끝까지 들어 줘서 고마웠다고 했다. 기억하고 있었다.', { joy: 5, bond: 3 })] }],
    ['엄하게 혼낸다', 'bold', { courage: 1, joy: -2 }, '아이는 방문을 닫았다. 사과는 했지만 눈은 마주치지 않았다.', { follow: [echoLater([2, 4], '닫힌 문', '아이가 학교 일을 더는 집에서 말하지 않는다는 걸 뒤늦게 알았다.', { joy: -3, bond: -2 })] }],
    ['치료비를 물어 준다', 'pragmatic', { money: -250, wisdom: 2 }, '상대 부모를 만나 조용히 처리했다. 아이에게는 짧게만 말했다.'],
  ], { when: hasKids }],
  ['mis-fam-child-runaway', 40, 65, '비어 있는 방', '아이가 쪽지 한 장을 남기고 집을 나갔다. "찾지 마세요. 혼자 해 볼게요."', [
    ['찾아 나선다', 'bold', { courage: 3, vitality: -3 }, '옆 마을 센터에서 찾았다. 아이는 울지 않았고, 대신 당신이 울었다.', check('courage', 10, '찾지 못했다. 한 달 뒤 아이가 먼저 전화했다. 괜찮다고.', { joy: -5 })],
    ['기다린다', 'caring', { bond: 2, joy: -3 }, '문을 잠그지 않았다. 세 달 뒤 아이가 돌아왔다. 조금 자라 있었다.', { follow: [echoLater([1, 3], '아이의 첫 편지', '아이가 여행지에서 편지를 보냈다. "그때 안 찾아줘서 고마워요. 그리고 미안해요."', { joy: 6, bond: 3 })] }],
    ['경찰에 신고한다', 'pragmatic', { wisdom: 2, joy: -2 }, '경찰이 이틀 만에 데려왔다. 아이는 그 뒤로 말수가 줄었다.', { follow: [echoLater([2, 4], '남은 거리', '아이가 성인이 되자마자 집을 나갔다. 그때의 일을 아직 말하지 않는다.', { joy: -3, bond: -3 })] }],
  ], { when: hasKids }],
  ['mis-fam-care-burden', 40, 68, '돌봄의 몫', '부모님 돌봄을 누가 맡을지를 두고 형제와 전화로 다퉜다. 서로 바쁘다고 했다.', [
    ['내가 맡는다', 'caring', { bond: 3, vitality: -3, money: -200 }, '일을 줄이고 고향을 오갔다. 형제는 가끔 돈을 보냈다.', { cast: { family: { health: 6 }, sibling: { affinity: 3 } }, work: { satisfaction: -4 } }],
    ['번갈아 맡자고 한다', 'pragmatic', { wisdom: 3 }, '달력을 나눠 적었다. 지키지 않는 달도 있었지만 대체로 돌아갔다.', { cast: { family: { health: 4 } } }],
    ['형제에게 넘긴다', 'easygoing', { joy: -2 }, '형제가 맡았다. 전화는 뜸해졌고 명절은 어색했다.', { cast: { sibling: { affinity: -12 }, family: { health: 1 } } }],
  ]],
]);

// ── 5. 일과 사회 ──
const work = table('misfortune', [
  ['mis-work-passed-over', 24, 58, '남의 이름이 적힌 발령', '승진 명단이 붙었다. 내 이름은 없었다. 늦게 들어온 후배의 이름이 있었다.', [
    ['이유를 따진다', 'bold', { courage: 3 }, '윗사람을 찾아가 그간의 성과를 늘어놓았다. 다음 발령에서 바로잡혔다.', check('courage', 15, '"때가 아니다"라는 말만 들었다.', { joy: -4 }, { work: { satisfaction: -10 } }), { promotion: true }],
    ['묵묵히 일한다', 'easygoing', { wisdom: 2, joy: -3 }, '일은 그대로 했다. 마음은 그렇지 못했다.', { work: { satisfaction: -8 } }],
    ['이직을 알아본다', 'pragmatic', { courage: 2, joy: -1 }, '다른 곳의 문을 두드렸다. 쉽게 열리진 않았다.', { leaveCareer: true }],
  ], { when: ordinaryJob }],
  ['mis-work-boss', 20, 62, '상사의 그림자', '새 상사는 당신의 보고서에서 늘 흠을 찾았다. 다른 사람 앞에서 더 그랬다.', [
    ['정면으로 이야기한다', 'bold', { courage: 3 }, '둘이 마주 앉았다. 상사는 놀랐고, 그 뒤로 조금 달라졌다.', check('courage', 10, '대화는 말다툼이 됐다. 다음 평가가 최악이었다.', { joy: -4 }, { work: { satisfaction: -10, cut: 1 } })],
    ['기록을 남긴다', 'pragmatic', { wisdom: 3 }, '날짜와 말을 적어 두었다. 인사팀에 내밀자 상사가 자리를 옮겼다.', { work: { satisfaction: 4 } }],
    ['참는다', 'easygoing', { joy: -3, vitality: -2 }, '퇴근길이 길었다. 파트너만 알아챘다.', { work: { satisfaction: -6 } }],
  ], repeat(6, { when: ordinaryJob })],
  ['mis-work-blame', 22, 60, '내 실수', '내 실수로 큰 손해가 났다. 아무도 아직 누구 탓인지 모른다.', [
    ['먼저 말한다', 'bold', { courage: 4, reputation: 1 }, '손을 들었다. 질책은 받았지만 신뢰는 남았다.', { work: { satisfaction: -3 }, follow: [echoLater([1, 3], '그때의 고백', '손을 들었던 그날을 윗사람이 기억하고 있었다. 중요한 일을 맡겼다.', { joy: 3, reputation: 2 })] }],
    ['조용히 넘긴다', 'easygoing', { joy: -2 }, '아무도 묻지 않았다. 밤마다 그 서류가 떠올랐다.', { follow: [echoLater([1, 2], '늦은 발견', '감사에서 그때 일이 드러났다. 숨긴 것이 실수보다 더 문제가 됐다.', { reputation: -3, joy: -3 }, 0.5)] }],
    ['동료 탓으로 돌린다', 'pragmatic', { infamy: 3 }, '동료가 대신 질책을 받았다. 동료는 끝까지 당신을 보지 않았다.', { cast: { friend: { affinity: -8 } }, work: { satisfaction: -4 } }],
  ], { when: ordinaryJob }],
  ['mis-work-shop-slump', 24, 65, '빈 가게', '큰 상점이 옆에 들어선 뒤 손님이 반으로 줄었다. 이번 달 월세가 빠듯하다.', [
    ['빚을 내서 버틴다', 'bold', { courage: 2, joy: -2 }, '대출로 두 계절을 버텼다. 손님이 조금씩 돌아왔다.', { loan: 1500, work: { satisfaction: -4 } }],
    ['규모를 줄인다', 'pragmatic', { wisdom: 3, joy: -2 }, '매장을 반으로 줄이고 혼자 운영했다. 수입도 반이 됐다.', { work: { cut: 2 } }],
    ['문을 닫는다', 'easygoing', { joy: -5, wisdom: 2 }, '마지막 날 단골들이 꽃을 가져왔다. 간판을 내렸다.', { leaveCareer: true, follow: [echoLater([2, 4], '단골의 편지', '옛 단골이 가게 자리 앞에서 찍은 사진을 보내왔다. 아직 그 간판 색을 기억한다고 했다.', { joy: 3 })] }],
  ], { when: job('merchant') }],
  ['mis-work-plagiarism', 24, 62, '남의 이름으로 나온 논문', '학회지에 실린 논문을 읽다 손이 멈췄다. 내 관찰 기록이 그대로였다. 저자는 다른 연구소 사람이었다.', [
    ['이의를 제기한다', 'bold', { courage: 3 }, '원본 기록을 제출했다. 학회가 저자를 정정했다.', check('wisdom', 15, '기록이 부족했다. 학회는 판단을 보류했고 당신만 이상한 사람이 됐다.', { joy: -5, reputation: -2 })],
    ['공개적으로 폭로한다', 'bold', { courage: 4, reputation: 2 }, '학회장에서 자료를 공개했다. 박수와 눈총을 동시에 받았다.', { work: { satisfaction: -5 } }],
    ['다음 연구로 넘어간다', 'easygoing', { wisdom: 3, joy: -4 }, '빼앗긴 건 돌려받지 못했다. 다음 기록은 날짜까지 남겼다.'],
  ], { when: job('researcher') }],
  ['mis-work-care-accident', 20, 65, '돌봄 중의 사고', '맡은 포켓몬이 잠깐 눈을 뗀 사이 울타리를 넘어 다쳤다. 보호자가 저녁에 온다.', [
    ['사실대로 말하고 책임진다', 'caring', { bond: 2, money: -300, reputation: -1 }, '치료비를 냈다. 보호자는 화를 냈지만 다음에도 맡겼다.', { work: { satisfaction: -3 } }],
    ['숨긴다', 'pragmatic', { infamy: 3 }, '작은 상처라고만 말했다. 보호자는 믿었다.', { follow: [echoLater([1, 2], '센터의 기록', '보호자가 센터 진료 기록을 보았다. 날짜와 말이 맞지 않았다. 센터에 민원이 들어왔다.', { reputation: -4, joy: -3 }, 0.6)] }],
    ['센터에 보고한다', 'pragmatic', { wisdom: 3 }, '사고 보고서를 썼다. 울타리가 높아졌고 당신의 평가는 조금 낮아졌다.', { work: { satisfaction: -5 } }],
  ], { when: job('keeper') }],
  ['mis-work-license-suspended', 16, 55, '자격 정지', '심판 판정에 항의하다 선을 넘었다. 리그 위원회가 1년 출전 정지를 통보했다.', [
    ['항소한다', 'bold', { courage: 3 }, '위원회 앞에서 사정을 설명했다. 정지가 경고로 줄었다.', check('courage', 15, '항소는 기각됐다. 심판에게 한 말이 녹음되어 있었다.', { joy: -4, reputation: -2 }, { flag: 'license-suspended', work: { cut: 2 } })],
    ['받아들이고 훈련만 한다', 'pragmatic', { wisdom: 3 }, '1년 동안 대회 없이 훈련했다. 수입은 줄었다.', { flag: 'license-suspended', work: { cut: 2 }, training: 25 }],
    ['다른 지방의 비공식 대회에 나간다', 'easygoing', { money: 200, infamy: 3 }, '정지 기간에 다른 이름으로 출전했다. 들키면 끝이다.', { flag: 'license-suspended' }],
  ], { when: job('traveler') }],
  ['mis-work-license-return', 16, 56, '복귀전', '출전 정지가 풀렸다. 첫 대회장의 공기가 낯설었다.', [
    ['정면으로 나선다', 'bold', { courage: 3, joy: 3 }, '첫 경기를 이겼다. 심판에게 먼저 인사했다.', { unflag: 'license-suspended', training: 15 }],
    ['조용히 복귀한다', 'easygoing', { wisdom: 2 }, '작은 대회부터 다시 시작했다.', { unflag: 'license-suspended' }],
  ], { when: s => Boolean(s.flags['license-suspended']) }],
  ['mis-work-recession-cut', 20, 65, '줄어든 일감', '경기 침체로 일감이 눈에 띄게 줄었다. 윗사람이 근무 시간을 줄이자고 했다.', [
    ['받아들인다', 'easygoing', { joy: -2, wisdom: 1 }, '반나절 근무가 됐다. 오후엔 파트너와 들판에 갔다.', { work: { cut: 2 }, affection: 2 }],
    ['부업을 찾는다', 'pragmatic', { vitality: -3, money: 250 }, '저녁마다 다른 일을 했다. 몸은 고됐지만 통장은 지켰다.'],
    ['다른 지방으로 옮긴다', 'bold', { courage: 3, joy: -1 }, '경기가 나은 곳으로 짐을 쌌다.', { move: true }],
  ], repeat(5, { when: s => ordinaryJob(s) && hasCondition(s, 'recession') })],
  ['mis-work-protection-fee', 20, 65, '보호비', '{villain} 사람들이 가게에 와서 "동네가 요즘 험하다"며 봉투를 내밀었다. 매달이라고 했다.', [
    ['낸다', 'easygoing', { money: -300, joy: -3, infamy: 1 }, '봉투를 채웠다. 가게는 조용했고 밤잠은 아니었다.'],
    ['거절한다', 'bold', { courage: 4 }, '문을 가리켰다. 다음 날 파트너가 가게 앞을 지켰다. 그들은 오지 않았다.', check('courage', 15, '며칠 뒤 가게 유리가 깨져 있었다.', { money: -500, joy: -4 }, { world: { safety: -2 } })],
    ['경찰과 상인회에 알린다', 'pragmatic', { wisdom: 3, reputation: 2 }, '상인들이 함께 신고했다. 순찰이 늘었다.', { world: { safety: 3 } }],
  ], { when: s => job('merchant')(s) && hasCondition(s, 'syndicate') }],
  ['mis-work-tax', 26, 70, '세금 고지서', '몇 년치 누락분이 한꺼번에 고지됐다. 가산세까지 붙어 있었다.', [
    ['한 번에 낸다', 'pragmatic', { money: -600, joy: -3 }, '통장에서 뭉텅이가 빠져나갔다.'],
    ['분할 납부한다', 'easygoing', { joy: -2, debt: 650 }, '열두 달로 나눴다. 이자가 붙었다.'],
    ['세무사를 찾는다', 'curious', { wisdom: 3, money: -200 }, '세무사가 공제 항목을 찾아 세금을 반으로 줄였다.', check('wisdom', 5, '세무사 비용만 더 들었다. 세금은 그대로였다.', { money: -400 })],
  ], repeat(9, { when: s => s.age >= 26 })],
  ['mis-work-disaster-volunteer', 18, 70, '재난 소식', '다른 마을에 큰 피해가 났다. 자원봉사자 모집 공고가 센터에 붙었다.', [
    ['자원봉사를 간다', 'caring', { vitality: -3, reputation: 3 }, '일주일 동안 잔해를 치우고 포켓몬을 구조했다.', { world: { safety: 2 }, training: 10, follow: [echoLater([2, 5], '그 마을의 편지', '복구된 마을에서 감사 편지와 함께 마을 축제 초대장이 왔다.', { joy: 4, reputation: 2 })] }],
    ['기부한다', 'pragmatic', { money: -200, reputation: 1 }, '갈 수 없어 돈을 보냈다.'],
    ['외면한다', 'easygoing', { joy: -1 }, '내 일만으로도 벅찼다. 뉴스를 껐다.', { follow: [echoLater([2, 4], '거꾸로 온 부탁', '이번엔 우리 마을 차례였다. 그때 도우러 가지 않았던 마을이 제일 먼저 트럭을 보냈다.', { joy: -2, wisdom: 3 }, 0.5)] }],
  ]],
  ['mis-work-suspected', 20, 60, '사라진 금고의 돈', '일터 금고에서 돈이 사라졌다. 마지막으로 금고를 연 사람이 당신이었다.', [
    ['결백을 증명한다', 'bold', { courage: 3, wisdom: 2 }, '출입 기록을 뒤져 진짜 범인을 찾았다. 동료였다.', check('wisdom', 10, '증거가 부족했다. 혐의는 벗었지만 눈초리는 남았다.', { reputation: -3, joy: -4 }, { work: { satisfaction: -8 } })],
    ['조용히 넘긴다', 'easygoing', { joy: -3, reputation: -2 }, '아무 말도 하지 않았다. 사람들은 각자의 결론을 내렸다.', { work: { satisfaction: -6 } }],
    ['그만둔다', 'pragmatic', { joy: -2, courage: 1 }, '의심받으며 일할 수는 없었다.', { leaveCareer: true }],
  ], { when: ordinaryJob }],
  ['mis-work-early-retire', 54, 66, '명예퇴직 권고', '윗사람이 "이제 쉬셔도 되지 않겠느냐"고 했다. 권고라고 했지만 권고가 아니었다.', [
    ['받아들인다', 'easygoing', { joy: -2, money: 500 }, '퇴직금을 받고 나왔다. 아침이 길어졌다.', { work: { retired: true } }],
    ['버틴다', 'bold', { courage: 2, joy: -3 }, '자리에 남았다. 책상은 창가에서 구석으로 옮겨졌다.', { work: { satisfaction: -10 } }],
    ['조건을 협상한다', 'pragmatic', { wisdom: 3, money: 800 }, '퇴직금을 올려 받고 명예롭게 나왔다.', check('wisdom', 10, '협상은 실패했다. 처음 조건으로 나왔다.', { money: 300, joy: -2 }, { work: { retired: true } }), { work: { retired: true } }],
  ], { when: ordinaryJob }],
]);

// ── 6. 유혹과 작은 잘못 ──
const temptation = table('misfortune', [
  ['mis-temp-wallet', 10, 80, '주운 지갑', '벤치 밑에서 두툼한 지갑을 주웠다. 신분증이 들어 있었다.', [
    ['주인을 찾아 준다', 'caring', { bond: 2, reputation: 2 }, '주소를 찾아 직접 돌려줬다. 주인은 몇 번이나 고개를 숙였다.', { follow: [echoLater([1, 3], '지갑 주인의 선물', '지갑 주인이 가게를 연다며 초대장을 보냈다. 가게 이름 옆에 작은 글씨로 고맙다고 적혀 있었다.', { joy: 3, money: 200 })] }],
    ['돈만 꺼낸다', 'pragmatic', { money: 300, infamy: 2 }, '지갑은 우체통에 넣었다. 돈은 아니었다.'],
    ['경찰서에 맡긴다', 'pragmatic', { wisdom: 2 }, '서류를 쓰고 나왔다. 뒤는 모른다.'],
  ]],
  ['mis-temp-exam', 12, 22, '시험지 옆자리', '트레이너 자격 시험장. 옆자리 답안이 훤히 보였다. 감독관은 졸고 있었다.', [
    ['베낀다', 'pragmatic', { wisdom: 1 }, '합격했다. 기분은 생각보다 가벼웠다. 그게 더 찜찜했다.', check('wisdom', 10, '감독관이 깨어 있었다. 시험장에서 쫓겨났고 소문이 학교에 퍼졌다.', { reputation: -3, infamy: 2, joy: -4 })],
    ['내 답을 쓴다', 'bold', { courage: 2, wisdom: 3 }, '아는 만큼 썼다. 턱걸이로 붙었다.', check('wisdom', 0, '떨어졌다. 다음 해에 다시 봤다.', { joy: -2 })],
    ['감독관을 깨운다', 'caring', { reputation: 1 }, '헛기침을 했다. 옆자리가 눈을 흘겼다.'],
  ]],
  ['mis-temp-lie', 10, 70, '망가진 화단', '{partner|이|가} 이웃집 화단을 뒤집어 놓았다. 이웃이 누가 그랬느냐고 물었다.', [
    ['사실대로 말한다', 'caring', { bond: 2, money: -100, reputation: 1 }, '화단 값을 물어 주고 함께 다시 심었다.'],
    ['야생 포켓몬 탓을 한다', 'pragmatic', { infamy: 3 }, '이웃은 믿었다. 파트너는 고개를 숙이고 있었다.', { follow: [echoLater([1, 2], '들통', '이웃집 창문에 달린 카메라를 몰랐다. 이웃이 영상을 들고 왔다.', { reputation: -3, joy: -3 }, 0.6)] }],
    ['모른다고 한다', 'easygoing', { joy: -1, infamy: 1 }, '어깨를 으쓱했다. 이웃은 그 뒤로 인사를 받지 않았다.'],
  ]],
  ['mis-temp-hit-and-run', 16, 75, '뺑소니', '밤길에서 자전거가 포켓몬을 치고 그대로 달아났다. 번호판 비슷한 걸 봤다.', [
    ['쫓는다', 'bold', { courage: 4 }, '{partner|이|가} 앞질러 자전거를 막았다. 운전자는 고개를 떨궜다.', check('courage', 10, '놓쳤다. 다친 포켓몬을 센터로 옮기는 게 먼저였다.', { vitality: -2, joy: -2 }, { world: { safety: -1 } })],
    ['포켓몬을 먼저 구한다', 'caring', { bond: 3, reputation: 2 }, '센터로 안고 뛰었다. 보호자가 뒤늦게 찾아와 몇 번이나 고개를 숙였다.', { world: { safety: 1 }, follow: [echoLater([1, 3], '그 포켓몬의 소식', '그날 센터로 옮긴 포켓몬이 건강해졌다며 보호자가 사진을 보냈다. 다리 하나가 짧아졌지만 잘 달린다고 했다.', { joy: 4 })] }],
    ['못 본 척 지나간다', 'easygoing', { joy: -3 }, '발걸음을 빨리했다. 돌아보지 않았다.', { world: { safety: -2 } }],
  ]],
  ['mis-temp-smuggle', 18, 65, '묻지 않는 상자', '항구에서 만난 사람이 상자 하나를 옆 마을까지 옮겨 달라고 했다. 안을 묻지 않으면 600P.', [
    ['거절한다', 'pragmatic', { wisdom: 3 }, '묻지 않아야 하는 상자는 받지 않는다고 했다.'],
    ['옮긴다', 'bold', { money: 600, infamy: 6 }, '상자는 가벼웠고 돈은 무거웠다. 그 사람은 당신 이름을 기억했다.', { follow: [choiceLater([1, 2], '두 번째 상자', '항구의 그 사람이 다시 찾아왔다. 이번엔 상자가 셋이고 돈은 두 배였다.', [
      ['이번엔 거절한다', 'pragmatic', { wisdom: 3, joy: -1 }, '한 번으로 끝내기로 했다. 그 사람은 웃으며 "그럴 줄 알았다"고 했다.'],
      ['옮긴다', 'bold', { money: 1200, infamy: 10, reputation: -2 }, '세 상자를 옮겼다. 이름이 어딘가의 명단에 올랐다.'],
    ], 0.8)] }],
    ['경찰에 알린다', 'bold', { courage: 2, reputation: 2 }, '다음 날 항구에 경찰이 깔렸다. 그 사람은 보이지 않았다.', { world: { safety: 2 } }],
  ], { when: env('바다', '도시') }],
  ['mis-temp-rage', 14, 70, '터진 화', '사소한 말에 화가 터졌다. 소리를 질렀고 물건이 날아갔다. {friend|이|가} 그 자리에 있었다.', [
    ['바로 사과한다', 'caring', { bond: 2, joy: -1 }, '물건을 주워 올리며 사과했다. {friend|은|는} 괜찮다고 했지만 한동안 조심스러웠다.', { cast: { friend: { affinity: -3 } } }],
    ['자리를 박차고 나간다', 'bold', { joy: -3, reputation: -2 }, '문을 세게 닫았다. 소리가 골목 끝까지 갔다.', { cast: { friend: { affinity: -8 } } }],
    ['이유를 들여다본다', 'curious', { wisdom: 4, vitality: -1 }, '화의 뿌리가 그 말이 아니란 걸 알았다. 며칠 뒤 {friend}에게 긴 편지를 썼다.', { cast: { friend: { affinity: 4 } } }],
  ], repeat(7)],
  ['mis-temp-shoplift', 10, 18, '주머니 속 몬스터볼', '친구들이 가게에서 몬스터볼을 슬쩍 집어넣으며 눈짓했다. 주인은 뒤를 돌아보고 있었다.', [
    ['따라 한다', 'easygoing', { joy: 1 }, '가슴이 뛰었다. 들키지 않았다. 몬스터볼은 쓰지 못했다.', check('courage', 5, '주인이 뒷덜미를 잡았다. 부모님이 불려 왔다.', { reputation: -3, infamy: 2, joy: -4 }, { cast: { family: { health: -2 } } })],
    ['친구들을 말린다', 'bold', { courage: 3, wisdom: 2 }, '팔을 잡아당겼다. 친구들은 "재미없다"고 했지만 물건은 내려놨다.', { cast: { friend: { affinity: -2 } } }],
    ['가게를 나온다', 'pragmatic', { wisdom: 2 }, '모른 척 먼저 나왔다. 친구들이 어떻게 됐는지는 묻지 않았다.'],
  ]],
  ['mis-temp-bribe', 18, 60, '져 주면', '대회 전날 낯선 사람이 찾아왔다. 내일 경기에서 져 주면 500P. 아무도 모를 거라고 했다.', [
    ['거절한다', 'bold', { courage: 3, reputation: 1 }, '문을 닫았다. 다음 날 경기는 진심으로 싸웠다.', { training: 10 }],
    ['받는다', 'pragmatic', { money: 500, infamy: 5, joy: -3 }, '2라운드에서 일부러 틀린 지시를 했다. {partner|이|가} 이상하다는 듯 돌아봤다.', { affection: -3, follow: [echoLater([1, 3], '승부 조작 조사', '리그 위원회가 그해 경기를 조사했다. 당신 이름이 명단에 있었다.', { reputation: -5, infamy: 3 }, 0.5)] }],
    ['위원회에 신고한다', 'pragmatic', { wisdom: 2, reputation: 2 }, '그 사람은 대회장 입구에서 체포됐다.', { world: { safety: 2 } }],
  ], { when: s => s.party.length > 0 }],
  ['mis-temp-gossip', 14, 70, '들은 비밀', '{rival}의 비밀을 우연히 알게 됐다. 사람들이 당신 입만 보고 있었다.', [
    ['입을 다문다', 'caring', { wisdom: 3 }, '모른다고 했다. {rival|은|는} 나중에 그걸 알게 됐다.', { cast: { rival: { affinity: 8 } } }],
    ['퍼뜨린다', 'easygoing', { joy: 1, infamy: 2 }, '그날 밤 마을 전체가 알았다. {rival|은|는} 다음 날 당신 앞을 지나며 아무 말도 하지 않았다.', { cast: { rival: { affinity: -15 } } }],
    ['{rival}에게 직접 말한다', 'bold', { courage: 2, bond: 2 }, '알고 있다고, 아무에게도 말하지 않겠다고 했다.', { cast: { rival: { affinity: 5 } } }],
  ]],
  ['mis-temp-found-pokemon', 12, 65, '목걸이를 한 포켓몬', s => { const id = localSpecies(s); return `들판에서 이름표 목걸이를 한 ${poke(id, '이', '가')} 따라왔다. 주인이 있다. 그런데 당신을 아주 좋아한다.`; }, [
    ['주인을 찾아 준다', 'caring', { bond: 2, reputation: 2 }, '이름표의 번호로 연락했다. 주인은 울면서 달려왔다.', { follow: [echoLater([1, 3], '주인의 답례', '그때 돌려보낸 포켓몬의 주인이 직접 키운 나무열매 한 상자를 보내왔다.', { joy: 3, money: 150 })] }],
    ['데리고 간다', 'pragmatic', { joy: 2, infamy: 4 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'stolen', outcome: `목걸이를 벗겨 서랍에 넣었다. ${poke(id, '은', '는')} 따라왔지만, 가끔 문 쪽을 봤다.`, follow: [choiceLater([1, 3], '찾아온 주인', '전단을 들고 다니던 사람이 집 앞에 섰다. 창가의 포켓몬을 보고 있었다.', [
      ['돌려준다', 'caring', { joy: -3, wisdom: 3 }, '목걸이를 서랍에서 꺼냈다. 주인은 고소하지 않겠다고 했다.', { losePokemon: 'random' }],
      ['모른다고 한다', 'bold', { infamy: 5, reputation: -3 }, '문을 닫았다. 주인은 경찰과 함께 다시 왔다가 증거가 없어 돌아갔다.'],
    ], 0.7)] }; }],
    ['들판에 둔다', 'easygoing', { wisdom: 2 }, '한참 쓰다듬다가 집으로 가라고 등을 밀었다. 뒤를 몇 번 돌아봤다.'],
  ]],
  ['mis-temp-insurance', 24, 65, '보험금 제안', '지인이 창고에 불이 난 걸로 하면 보험금을 나눠 주겠다고 했다. 창고엔 아무것도 없다고 했다.', [
    ['거절한다', 'pragmatic', { wisdom: 3 }, '그런 일에 이름을 빌려주지 않는다고 했다. 지인은 다른 사람을 찾았다.'],
    ['이름을 빌려준다', 'easygoing', { money: 400, infamy: 5 }, '서류에 서명했다. 돈은 들어왔다.', { follow: [echoLater([1, 3], '보험 조사관', '조사관이 창고 사진을 들고 찾아왔다. 서명한 서류가 문제였다. 벌금과 함께 기록이 남았다.', { money: -700, reputation: -4, infamy: 3 }, 0.6)] }],
    ['말린다', 'caring', { bond: 2, courage: 1 }, '그 돈은 결국 값을 치른다고 말렸다. 지인은 듣는 둥 마는 둥 했다.', { cast: { friend: { affinity: 3 } } }],
  ]],
  ['mis-temp-undeclared', 24, 68, '신고하지 않은 수입', '올해 부수입이 꽤 됐다. 신고하지 않아도 아무도 모를 금액이었다.', [
    ['신고한다', 'pragmatic', { wisdom: 2, money: -150 }, '세금을 냈다. 밤에 편히 잤다.'],
    ['숨긴다', 'easygoing', { money: 300, infamy: 2 }, '통장에 그대로 두었다.', { follow: [echoLater([2, 4], '세무조사', '무작위 세무조사에 걸렸다. 숨긴 수입에 가산세가 붙었다.', { money: -600, reputation: -2 }, 0.4)] }],
  ]],
]);

// ── 7. 지방 재난 ──
const disasters = table('misfortune', [
  ['mis-dis-storm', 8, 90, '태풍의 밤', '태풍이 상륙했다. 지붕이 흔들리고 부두의 배들이 서로 부딪친다.', [
    ['부두로 나가 돕는다', 'bold', { courage: 4, reputation: 2 }, '어부들과 밤새 밧줄을 당겼다. 배 두 척을 살렸다.', check('courage', 15, '파도에 휩쓸려 하마터면 큰일 날 뻔했다.', { vitality: -6 }, { world: { economy: -1 } }), { world: { economy: 2 } }],
    ['집을 지킨다', 'pragmatic', { wisdom: 2, money: -150 }, '창문에 널빤지를 댔다. 지붕 한쪽이 날아갔지만 그뿐이었다.', { cost: 0 }],
    ['센터로 대피한다', 'easygoing', { joy: -2, money: -300 }, '파티와 센터 바닥에서 밤을 보냈다. 집은 물이 찼다.', { cost: 0 }],
  ], repeat(6, { when: env('바다') })],
  ['mis-dis-earthquake', 8, 90, '흔들린 땅', '새벽에 땅이 흔들렸다. 책장이 쓰러지고 거리에 사람들이 쏟아져 나왔다.', [
    ['무너진 집에서 사람을 찾는다', 'bold', { courage: 5, reputation: 3 }, '파티 포켓몬이 잔해를 들어 올렸다. 할머니 한 분을 꺼냈다.', { world: { safety: 2 }, training: 20, follow: [echoLater([1, 2], '잔해 속의 손', '그때 구한 할머니가 손수 만든 목도리를 들고 찾아왔다. 파트너 것도 있었다.', { joy: 4, bond: 2 })] }],
    ['집을 정리한다', 'pragmatic', { wisdom: 2, money: -250 }, '깨진 것들을 치웠다. 벽의 금은 그대로 남았다.', { cost: 0 }],
    ['여진이 무서워 밖에서 잔다', 'easygoing', { vitality: -3, joy: -2 }, '공원에서 사흘을 잤다. 파트너가 밤마다 곁을 지켰다.', { affection: 2 }],
  ]],
  ['mis-dis-volcano', 8, 90, '화산의 기침', '산이 재를 뿜었다. 하늘이 잿빛이 되고 온천물이 끓어올랐다.', [
    ['마을 사람들을 대피시킨다', 'bold', { courage: 4, reputation: 3 }, '불꽃 포켓몬이 길을 열었다. 마을 사람 모두가 아래로 내려갔다.', { world: { safety: 3 }, training: 15 }],
    ['집에 남는다', 'bold', { courage: 2, vitality: -5 }, '재를 마시며 집을 지켰다. 기침이 한 계절 갔다.', { cost: 0 }],
    ['먼저 내려간다', 'pragmatic', { wisdom: 2, joy: -2, money: -200 }, '짐만 챙겨 내려갔다. 집은 재에 묻혔다가 나중에 파냈다.', { cost: 0, world: { economy: -2 } }],
  ], { when: s => s.town === 'lavaridge' }],
  ['mis-dis-tsunami', 8, 90, '물러난 바다', '바닷물이 갑자기 멀리 물러났다. 노인들이 소리쳤다. 뛰라고.', [
    ['높은 곳으로 사람들을 이끈다', 'bold', { courage: 5, reputation: 3 }, '파도가 마을을 덮치기 전에 언덕에 올랐다. 당신 뒤로 스무 명이 따라왔다.', { world: { safety: 3 }, follow: [echoLater([1, 3], '언덕의 기념비', '그날 올랐던 언덕에 작은 비석이 섰다. 이름들 사이에 당신 이름도 있었다.', { reputation: 3, joy: 3 })] }],
    ['파트너와 달린다', 'easygoing', { vitality: -3, joy: -3, money: -400 }, '살았다. 집은 바다가 가져갔다.', { cost: 0, affection: 2 }],
    ['배를 지키러 간다', 'pragmatic', { courage: 2 }, '배를 먼바다로 몰았다. 돌아와 보니 부두만 없었다.', check('courage', 20, '늦었다. 배와 함께 떠밀렸다가 구조됐다.', { vitality: -8, money: -500 })],
  ], { when: env('바다') }],
  ['mis-dis-wildfire', 8, 90, '숲의 연기', '건조한 바람에 산불이 번졌다. 연기가 마을까지 왔고 숲의 포켓몬들이 길로 쏟아져 나왔다.', [
    ['물 포켓몬과 불길을 막는다', 'bold', { courage: 4, vitality: -3 }, '밤새 방화선을 지켰다. 마을 어귀에서 불이 멈췄다.', { world: { ecology: 2 }, training: 25 }],
    ['쏟아져 나온 포켓몬을 돌본다', 'caring', { bond: 4, reputation: 2 }, '마당에 물과 먹이를 두었다. 수십 마리가 하룻밤을 묵고 갔다.', { world: { ecology: 3 }, follow: [echoLater([1, 2], '돌아온 손님', '산불 때 마당에서 묵었던 포켓몬들이 봄에 다시 나타났다. 새끼들을 데리고.', { joy: 4, bond: 2 })] }],
    ['마을을 떠나 피한다', 'easygoing', { joy: -3, money: -200 }, '옆 마을에서 한 달을 보냈다. 돌아오니 뒷산이 검었다.', { cost: 0, world: { ecology: -3 } }],
  ], repeat(8, { when: env('숲') })],
  ['mis-dis-blizzard', 8, 90, '길을 지운 눈', '사흘째 눈이 내린다. 길이 끊기고 마을의 식량이 줄었다.', [
    ['눈길을 뚫고 물자를 나른다', 'bold', { courage: 4, vitality: -4 }, '파티 포켓몬과 썰매로 아랫마을을 오갔다. 노인들이 먼저 먹었다.', { world: { safety: 2 }, training: 15 }],
    ['집에서 버틴다', 'easygoing', { joy: -2, vitality: -2 }, '저장한 것으로 일주일을 났다. 파트너와 번갈아 눈을 치웠다.', { affection: 2 }],
    ['고립된 등산객을 찾는다', 'caring', { courage: 3, reputation: 3 }, '산장의 등산객 셋을 찾아 내려왔다.', check('vitality', 15, '길을 잃고 하루를 헤맸다. 손가락 끝이 하얗게 얼었다.', { vitality: -7 })],
  ], repeat(6, { when: env('산') })],
  ['mis-dis-blackout', 8, 90, '꺼진 도시', '도시 전체가 정전됐다. 신호등이 꺼지고 센터의 비상 전원도 두 시간뿐이었다.', [
    ['전기 포켓몬으로 센터를 돕는다', 'caring', { bond: 3, reputation: 3 }, '파티의 전기가 센터 치료기를 밤새 돌렸다.', { training: 15, world: { safety: 2 } }],
    ['교차로에서 교통을 정리한다', 'bold', { courage: 2, reputation: 1 }, '손전등을 들고 밤새 서 있었다. 사고는 없었다.', { world: { safety: 1 } }],
    ['집에서 촛불을 켠다', 'easygoing', { joy: 2 }, '파트너와 촛불 아래서 오랜만에 이야기했다. 냉장고는 녹았다.', { affection: 2, cost: 0 }],
  ], repeat(6, { when: env('도시') })],
  ['mis-dis-drought', 10, 90, '마른 강', '비가 넉 달째 오지 않았다. 강바닥이 드러나고 나무열매가 떨어졌다.', [
    ['물 포켓몬으로 밭을 적신다', 'caring', { bond: 3, reputation: 2 }, '마을 밭을 돌며 물을 뿌렸다. 절반은 살았다.', { world: { economy: 2, ecology: 1 }, training: 10 }],
    ['우물을 판다', 'bold', { vitality: -4, courage: 2 }, '땅 포켓몬과 사흘을 팠다. 물이 나왔다.', check('vitality', 10, '사흘을 팠지만 물은 없었다.', { vitality: -4, joy: -2 })],
    ['물을 사서 버틴다', 'pragmatic', { money: -250, joy: -1 }, '물값이 세 배였다. 그래도 샀다.'],
  ], repeat(6, { when: s => hasCondition(s, 'climate') })],
  ['mis-dis-landslide', 10, 90, '무너진 비탈', '폭우 뒤 뒷산 비탈이 무너졌다. 흙이 길과 집 몇 채를 덮었다.', [
    ['구조에 나선다', 'bold', { courage: 4, reputation: 3 }, '격투 포켓몬과 흙더미를 걷었다. 갇힌 가족이 모두 나왔다.', check('courage', 15, '2차 붕괴에 휘말렸다. 구조대가 오히려 당신을 꺼냈다.', { vitality: -7, joy: -3 })],
    ['피해 조사를 돕는다', 'curious', { wisdom: 3, reputation: 1 }, '무너진 범위를 기록해 복구 계획에 보탰다.', { world: { safety: 2 } }],
    ['내 집만 지킨다', 'pragmatic', { money: -200, joy: -2 }, '집 뒤에 모래주머니를 쌓았다. 옆집은 흙에 반쯤 묻혔다.', { cost: 0, world: { safety: -1 } }],
  ], { when: env('산', '강') }],
  ['mis-dis-outbreak-center', 8, 90, '꽉 찬 센터', '포켓몬 감기가 번져 센터 복도까지 환자가 누웠다. 간호사들이 사흘째 집에 못 갔다.', [
    ['센터 일을 돕는다', 'caring', { vitality: -3, reputation: 2, bond: 2 }, '일주일 동안 밥을 나르고 열을 쟀다. 간호사가 처음으로 웃었다.', { world: { economy: 1 }, follow: [echoLater([1, 2], '간호사의 카드', '그때 센터의 간호사들이 손으로 쓴 카드를 보냈다. 파트너 진료는 평생 줄 안 서도 된다고 적혀 있었다.', { joy: 4 })] }],
    ['파티를 집에 격리한다', 'pragmatic', { wisdom: 3 }, '한 달 동안 아무 데도 가지 않았다. 아무도 앓지 않았다.', { affection: 1 }],
    ['평소처럼 지낸다', 'easygoing', { joy: 1 }, '별일 없겠지 했다. 파티 절반이 앓아누웠다.', { affection: -3, money: -200, cost: 0 }],
  ], repeat(5, { when: s => hasCondition(s, 'outbreak') && s.party.length > 0 })],
]);

export const MISFORTUNE = [...health, ...aging, ...money, ...pokemonTrouble, ...pokemonDaily, ...relationships, ...familyTrouble, ...work, ...temptation, ...disasters];
