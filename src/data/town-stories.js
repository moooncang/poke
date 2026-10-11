// Town stories: three events for each of the 40 towns, built on the canon landmarks of each place.
// Some are repeatable, some open a second stage through a flag (town-<id>-…), and about a third leave a
// delayed record or decision behind. Category: 'local'.
import { table, check, echoLater, choiceLater, localSpecies, fill } from './event-kit.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────
// {pk} is the species name; {pk:을} / {pk:이} / {pk:은} / {pk:과} / {pk:으로} add the matching particle.
const PARTICLE = { 을: ['을', '를'], 이: ['이', '가'], 은: ['은', '는'], 과: ['과', '와'], 으로: ['으로', '로'] };
const say = (s, id, text) => fill(s, text.replace(/\{pk(?::(을|이|은|과|으로))?\}/g, (_, p) => (p ? poke(id, ...PARTICLE[p]) : poke(id))));
const species = (s, from) => (from === undefined || from === 'local' ? localSpecies(s) : Array.isArray(from) ? pick(s, from) : from);

/** Observe a species (the town's pool unless `from` is given). */
const spot = (text, more = {}, from) => s => { const id = species(s, from); return { ...more, observe: id, outcome: say(s, id, text) }; };
/** Catch a species on a stat check. */
const lure = (text, stat, difficulty, failText, failEffects = {}, more = {}, from) => s => {
  const id = species(s, from);
  return { ...more, captureJoin: id, outcome: say(s, id, text), ...check(stat, difficulty, say(s, id, failText), failEffects) };
};
/** An automatic battle; `from: null` lets the engine pick the opponent. */
const duel = (kind, text, { capture = false, from = 'local', level, win, lose, ...more } = {}) => s => {
  const id = from === null ? undefined : species(s, from);
  const fix = a => (a.outcome ? { ...a, outcome: say(s, id, a.outcome) } : a);
  const after = {};
  if (win) after.win = fix(win);
  if (lose) after.lose = fix(lose);
  return { ...more, battle: { kind, ...(id ? { opponent: id } : {}), ...(capture ? { capture: true } : {}), ...(level ? { level } : {}) },
    ...(text ? { outcome: say(s, id, text) } : {}), ...(win || lose ? { after } : {}) };
};
const wild = (text, opts = {}) => duel('wild', text, { capture: true, ...opts });

/** Only in this town (plus an optional extra condition and other meta). */
const at = (townId, more = {}) => { const { when, ...rest } = more; return { ...rest, when: s => s.town === townId && (!when || when(s)) }; };
/** Second stage: in this town, after the flag of the first stage. */
const after = (townId, flag, more = {}) => { const { when, ...rest } = more; return at(townId, { ...rest, when: s => Boolean(s.flags[flag]) && (!when || when(s)) }); };
const again = (cooldown, more = {}) => ({ once: false, cooldown, ...more });

// ── 관동 ─────────────────────────────────────────────────────────────────────────────────────────
const kanto = [
  // 태초마을
  ['town-pallet-oak-parcel', 8, 15, '오박사의 심부름', '오박사 연구소 조수가 감기에 걸렸다. 상록시티 가게에 맡겨 둔 소포를 대신 찾아와 줄 수 있느냐는 부탁이 들어왔다.', [
    ['1번도로를 걸어간다', 'bold', { courage: 3, wisdom: 1 }, '', spot('풀숲에서 튀어나온 {pk:을} 피해 가며 소포를 무사히 받아 왔다. 오박사가 그 이야기를 수첩에 적었다.', { flag: 'town-pallet-oak-errand' })],
    ['가족과 함께 다녀온다', 'caring', { bond: 2, joy: 2 }, '가족과 손을 잡고 다녀왔다. 오박사가 고맙다며 연구소 뒷마당 구경을 시켜 주었다.', { flag: 'town-pallet-oak-errand' }],
    ['무서워서 사양한다', 'easygoing', { joy: 1 }, '다른 아이가 심부름을 맡았다. 저녁 내내 그 아이가 본 포켓몬 이야기가 부러웠다.'],
  ], at('pallet')],
  ['town-pallet-oak-survey', 10, 22, '연구소의 조사 노트', '심부름을 기억한 오박사가 1번도로 서식 조사를 거들어 달라며 빈 조사 노트를 내밀었다.', [
    ['한 계절 동안 기록한다', 'curious', { wisdom: 5 }, '', spot('새벽마다 같은 덤불에 나타나는 {pk}의 습관을 기록했다. 오박사가 노트를 연구소 서가에 꽂아 두었다.', {
      follow: [echoLater([3, 6], '연구소에서 온 소포', '오박사 연구소에서 소포가 왔다. 그때 쓴 1번도로 조사 노트가 새 논문의 부록에 실렸다며 인쇄본이 들어 있었다.', { wisdom: 3, reputation: 2 })] })],
    ['파트너와 함께 돌아다닌다', 'bold', { courage: 2, bond: 2 }, '파트너가 풀숲을 먼저 헤치고 들어가 포켓몬을 찾아냈다.', { training: 15 }],
    ['노트만 받아 둔다', 'easygoing', { joy: 1 }, '노트는 책상 서랍에 들어갔지만 표지의 연구소 도장은 오래 자랑거리가 되었다.'],
  ], after('pallet', 'town-pallet-oak-errand')],
  ['town-pallet-send-off', 35, 90, '첫 여행을 떠나는 아이', '오늘 아침 태초마을의 한 아이가 첫 포켓몬을 받아 1번도로로 나선다. 동네 사람들이 연구소 앞에 모였다.', [
    ['여행의 요령을 일러 준다', 'caring', { wisdom: 2, reputation: 1 }, '포켓몬센터부터 찾으라는 말에 아이가 고개를 크게 끄덕였다.'],
    ['연습 배틀을 해 준다', 'bold', { courage: 2 }, '살살 상대해 주며 첫 배틀의 긴장을 풀어 주었다.', { training: 15, affection: 1 }],
    ['손을 흔들어 배웅한다', 'easygoing', { joy: 3 }, '멀어지는 작은 등을 보며 자신의 첫 여행을 떠올렸다.'],
  ], at('pallet', again(6))],

  // 상록시티
  ['town-viridian-bug-catcher', 8, 18, '상록숲의 곤충채집 소년', '밀짚모자를 쓴 곤충채집 소년이 상록숲 입구를 막아서고 승부를 걸어 왔다. 이기면 숲에서 제일 좋은 채집 자리를 알려 준단다.', [
    ['승부를 받는다', 'bold', { courage: 3 }, '', wild('소년이 가르쳐 준 나무 아래에서 {pk:과} 맞닥뜨렸다.', { win: { effects: { joy: 2 }, outcome: '소년이 분하다며 다음엔 지지 않겠다고 했다.' } })],
    ['채집망 쓰는 법을 배운다', 'curious', { wisdom: 3 }, '', spot('소년의 채집망 기술로 {pk:을} 가까이서 관찰했다.')],
    ['다음에 하자고 한다', 'easygoing', { joy: 1 }, '소년은 숲 쪽으로 뛰어가며 내일도 여기 있겠다고 외쳤다.'],
  ], at('viridian')],
  ['town-viridian-gym-open', 14, 40, '다시 열린 체육관', '오랫동안 닫혀 있던 상록시티 체육관에 불이 켜졌다. 새 관장이 누구인지는 아무도 모른다.', [
    ['도전장을 내민다', 'bold', { courage: 4 }, '체육관 문을 밀고 들어섰다.', duel('gym', '', { from: null, flag: 'town-viridian-gym-seen', win: { effects: { reputation: 1 } } })],
    ['관중석에서 지켜본다', 'curious', { wisdom: 3 }, '도전자들이 땅 타입 포켓몬에게 줄줄이 지는 것을 보며 상성을 메모했다.', { flag: 'town-viridian-gym-seen' }],
    ['괜히 엮이지 않는다', 'pragmatic', { joy: 1 }, '소문만 듣고 지나쳤다.'],
  ], at('viridian')],
  ['town-viridian-gym-coach', 20, 60, '체육관의 보조 코치', '상록시티 체육관에서 당신을 기억한 관장이 수련생 몇 명을 맡아 줄 수 있느냐고 물었다.', [
    ['수련생을 맡는다', 'caring', { reputation: 2, vitality: -2, money: 200 }, '주말마다 체육관에서 기초 훈련을 가르쳤다.', {
      follow: [choiceLater([3, 5], '제자의 리그 출전', '상록시티에서 가르친 수련생이 리그 예선에 나간다며 출전 전날 조언을 구하러 왔다.', [
        ['밤새 전략을 함께 짠다', 'caring', { bond: 3, vitality: -2 }, '수련생이 예선을 통과했다는 소식이 다음 날 들려왔다.', { effects: { bond: 3, vitality: -2, reputation: 2 } }],
        ['스스로 하라고 등을 떠민다', 'pragmatic', { wisdom: 2 }, '수련생은 혼자 고민한 끝에 자기만의 전술을 들고 나갔다.'],
      ])] }],
    ['함께 훈련만 한다', 'bold', { courage: 2 }, '수련생들과 땀을 흘리며 파티도 단련했다.', { training: 25 }],
    ['정중히 거절한다', 'easygoing', { joy: 1 }, '관장은 언제든 찾아오라며 웃었다.'],
  ], after('viridian', 'town-viridian-gym-seen')],

  // 블루시티
  ['town-cerulean-nugget-bridge', 12, 28, '너겟브리지 연승전', '블루시티 북쪽 너겟브리지에서 트레이너 다섯 명을 연달아 이기면 상품을 준다는 행사가 열렸다. 다리 끝에는 정장 차림의 남자가 서 있다.', [
    ['연승전에 도전한다', 'bold', { courage: 4 }, '다리 위 트레이너들과 차례로 맞섰다.', duel('wild', '', { from: 'local', level: 18, win: { effects: { money: 300 }, outcome: '다섯 번째 상대까지 꺾고 금빛 기념품을 받았다.' } })],
    ['다리 끝 남자를 수상히 여긴다', 'curious', { wisdom: 2 }, '정장 남자가 로켓단 가입을 권하는 것을 듣고 경찰에 알렸다.', { world: { safety: 2 } }],
    ['다리 아래 강가에서 쉰다', 'easygoing', { joy: 2 }, '물소리를 들으며 연승전 함성을 멀리서 들었다.'],
  ], at('cerulean')],
  ['town-cerulean-cave', 25, 60, '봉쇄된 동굴', '블루시티 근처의 동굴은 강한 포켓몬이 산다는 이유로 오래 봉쇄되어 있다. 최근 동굴 안에서 이상한 울음이 들린다는 말이 돈다.', [
    ['허가를 받아 입구까지 조사한다', 'bold', { courage: 5 }, '입구의 발자국을 석고로 떠서 연구소에 보냈다.', {
      ...check('courage', 20, '입구에서 쏟아지는 압박감에 발이 떨어지지 않았다.', { vitality: -3 }),
      follow: [echoLater([2, 5], '석고 발자국의 정체', '블루시티 동굴 입구에서 떠 온 발자국을 분석한 연구소가 결과를 보내왔다. 기록에 없는 크기의 에스퍼 포켓몬일 가능성이 높다고 했다.', { wisdom: 4 })] }],
    ['봉쇄 유지 서명에 참여한다', 'caring', { reputation: 1 }, '아이들이 들어가지 못하도록 울타리를 보강하는 데 힘을 보탰다.', { world: { safety: 2 } }],
    ['소문으로만 듣는다', 'easygoing', { joy: 1 }, '동굴 이야기는 술자리 안줏거리로 남았다.'],
  ], at('cerulean')],
  ['town-cerulean-water-show', 8, 80, '체육관 수중 쇼', '블루시티 체육관이 수영장을 개방하고 물 포켓몬 수중 쇼를 열었다.', [
    ['맨 앞줄에서 본다', 'curious', { joy: 3 }, '', spot('물속에서 원을 그리며 헤엄치는 {pk:을} 넋을 잃고 바라봤다.')],
    ['수영 강습을 받는다', 'bold', { vitality: 4 }, '체육관 트레이너에게 물 포켓몬과 함께 헤엄치는 법을 배웠다.', { affection: 1 }],
    ['매표소 일을 돕는다', 'pragmatic', { money: 150 }, '쇼가 끝날 때까지 표를 팔았다.'],
  ], at('cerulean', again(5))],

  // 무지개시티
  ['town-celadon-department', 10, 80, '백화점 옥상', '무지개시티 백화점 옥상에 새 자판기와 작은 정원이 생겼다. 계단 아래 층마다 사람이 북적인다.', [
    ['옥상 자판기 음료를 산다', 'easygoing', { joy: 3, money: -100 }, '파트너와 시원한 음료를 나눠 마시며 시내를 내려다보았다.', { affection: 2 }],
    ['층마다 구경한다', 'curious', { wisdom: 2 }, '', spot('옥상 정원 화단 사이에 숨어든 {pk:을} 발견했다.')],
    ['그냥 지나간다', 'pragmatic', { money: 0, wisdom: 1 }, '사람이 너무 많아 다음에 오기로 했다.'],
  ], at('celadon', again(6))],
  ['town-celadon-game-corner', 16, 50, '게임코너의 포스터', '무지개시티 게임코너 벽에 붙은 포스터 뒤에서 바람이 새어 나온다는 이야기를 들었다.', [
    ['포스터를 살짝 들춰 본다', 'curious', { courage: 2, wisdom: 2 }, '포스터 뒤에 지하로 내려가는 스위치가 있었다. 오가는 사람들의 옷에 R 자가 보였다.', {
      flag: 'town-celadon-hideout', ...check('wisdom', 10, '경비원이 다가와 서둘러 손을 뗐다.', { joy: -1 }) }],
    ['슬롯머신을 해 본다', 'easygoing', { joy: 2, money: -100 }, '코인 몇 개를 잃고 웃으며 나왔다.'],
    ['수상하다고 경찰에 말한다', 'pragmatic', { reputation: 1 }, '경찰이 순찰을 늘리겠다고 했다.', { world: { safety: 1 } }],
  ], at('celadon')],
  ['town-celadon-hideout', 16, 60, '게임코너 지하', '게임코너 포스터 뒤의 계단이 아직 그대로다. 오늘 밤 로켓단 조직원들이 짐을 옮긴다는 소문이 돌았다.', [
    ['지하로 내려간다', 'bold', { courage: 5 }, '어두운 통로에서 로켓단 조직원과 마주쳤다.', duel('villain', '', { from: null, win: { effects: { reputation: 3 }, world: { safety: 3 },
      follow: [echoLater([1, 3], '경찰서의 감사장', '무지개시티 경찰서에서 감사장이 왔다. 게임코너 지하에서 찾아낸 장부 덕분에 조직의 다른 거점까지 찾아냈다고 한다.', { reputation: 3, joy: 2 })] },
      lose: { effects: { vitality: -3 }, outcome: '조직원들이 짐을 챙겨 달아났다.' } })],
    ['입구를 지키며 경찰을 부른다', 'caring', { reputation: 2 }, '경찰이 도착할 때까지 입구에서 버텼다.', { world: { safety: 2 } }],
    ['못 본 척한다', 'easygoing', { joy: -1 }, '며칠 뒤 게임코너는 공사 중이라며 문을 닫았다.', { unflag: 'town-celadon-hideout' }],
  ], after('celadon', 'town-celadon-hideout')],

  // 갈색시티
  ['town-vermilion-st-anne', 14, 70, '상트앙느호 입항', '호화 여객선 상트앙느호가 갈색시티에 들어왔다. 선상 파티 초대장이 동네에 몇 장 풀렸다.', [
    ['선상 파티에 간다', 'bold', { joy: 4, money: -150 }, '갑판 위 트레이너들과 차례로 배틀하며 밤을 보냈다.', { training: 20,
      follow: [echoLater([2, 4], '상트앙느호의 엽서', '선상 파티에서 배틀했던 선원이 먼 항구에서 엽서를 보냈다. 상트앙느호가 세계를 한 바퀴 돌고 있다고 적혀 있었다.', { joy: 3 })] }],
    ['선원 일손을 돕는다', 'pragmatic', { money: 250, vitality: -2 }, '짐을 실어 나르며 선원들의 바다 이야기를 들었다.'],
    ['부두에서 배를 구경한다', 'easygoing', { joy: 2 }, '거대한 굴뚝에서 피어오르는 김을 오래 바라보았다.'],
  ], at('vermilion')],
  ['town-vermilion-fishing-guru', 6, 15, '낚시광 아저씨', '갈색시티 부두의 낚시광 아저씨가 낡은 낚싯대를 빌려줄 테니 아무거나 낚아 보라고 했다.', [
    ['찌를 던져 본다', 'bold', { joy: 3 }, '', lure('한참 만에 {pk:을} 낚아 올렸다. 아저씨가 손뼉을 쳤다.', 'joy', 0, '줄이 끊어져 {pk:이} 물속으로 사라졌다.', { joy: -1 })],
    ['아저씨 옆에서 구경한다', 'curious', { wisdom: 2 }, '', spot('아저씨가 낚은 {pk:을} 바로 앞에서 보았다.')],
    ['집에 간다', 'easygoing', { vitality: 1 }, '낚싯대는 다음에 빌리기로 했다.'],
  ], at('vermilion')],
  ['town-vermilion-dock', 18, 65, '부두 아르바이트', '갈색시티 부두에 화물선이 몰려 하역 일손이 모자란다.', [
    ['힘센 포켓몬과 짐을 나른다', 'bold', { money: 300, vitality: -3 }, '하루 만에 화물 칸 하나를 다 비웠다.', { training: 15 }],
    ['장부 정리를 맡는다', 'pragmatic', { money: 200, wisdom: 1 }, '창고 장부의 오래된 오류를 찾아냈다.'],
    ['파도만 보고 온다', 'easygoing', { joy: 2 }, '뱃고동이 울릴 때마다 먼 항구를 상상했다.'],
  ], at('vermilion', again(6))],

  // 보라타운
  ['town-lavender-tower', 10, 40, '포켓몬타워의 안개', '보라타운 포켓몬타워 꼭대기 층에 짙은 안개가 끼었다. 안개 속에서 무언가가 웃는 소리가 들린다고 한다.', [
    ['안개 속으로 들어간다', 'bold', { courage: 4 }, '', wild('안개 사이로 {pk:이} 모습을 드러냈다.', { win: { effects: { courage: 1 }, outcome: '안개가 걷히고 층 전체가 조용해졌다.' } })],
    ['향을 피우고 기도한다', 'caring', { bond: 3 }, '안개가 천천히 옅어졌다. 관리인이 고개를 숙여 인사했다.'],
    ['계단을 내려간다', 'easygoing', { joy: -1 }, '등 뒤의 웃음소리가 한동안 귀에 남았다.'],
  ], at('lavender')],
  ['town-lavender-shelter', 18, 90, '포켓몬하우스의 노인', '보라타운의 포켓몬하우스에서 주인 잃은 포켓몬을 돌보는 노인이 일손을 찾는다.', [
    ['정기 봉사를 시작한다', 'caring', { bond: 4, vitality: -2 }, '밥그릇을 닦고 털을 빗기며 한 해를 보냈다.', { reputation: 1 }],
    ['한 마리를 입양한다', 'caring', { bond: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'adopted', outcome: `구석에서 경계하던 ${poke(id, '이', '가')} 마침내 당신의 손을 핥았다.` }; }],
    ['간식을 기부한다', 'pragmatic', { money: -150, reputation: 1 }, '노인이 간식 봉지를 받아 들고 포켓몬들 이름을 하나하나 불렀다.'],
    ['다음에 들르겠다고 한다', 'easygoing', { joy: 1 }, '노인이 차 한 잔을 내주었다.'],
  ], at('lavender', again(7))],
  ['town-lavender-radio', 22, 75, '라디오탑 사연', '보라타운 라디오탑의 밤 방송이 함께한 포켓몬과의 추억 사연을 받는다.', [
    ['파트너와의 사연을 보낸다', 'caring', { bond: 3 }, '처음 만난 날의 이야기를 꾹꾹 눌러 적어 보냈다.', {
      follow: [echoLater([1, 3], '라디오에서 들린 이름', '밤 라디오에서 당신이 보낸 사연이 흘러나왔다. 진행자가 잠시 말을 잇지 못하다가 파트너에게 노래 한 곡을 선물했다.', { joy: 5, bond: 2 })] }],
    ['방송국 견학을 신청한다', 'curious', { wisdom: 3 }, '송신기와 녹음실을 둘러보았다.'],
    ['라디오만 켜 둔다', 'easygoing', { joy: 2 }, '다른 사람들의 사연을 들으며 잠들었다.'],
  ], at('lavender')],
];

// ── 성도 ─────────────────────────────────────────────────────────────────────────────────────────
const johto = [
  // 연두마을
  ['town-new-bark-elm-egg', 10, 18, '공박사의 알', '연두마을 공박사가 이상한 무늬의 알을 받았다며, 알이 사람 곁에서 더 빨리 부화하는지 실험하고 싶다고 했다.', [
    ['알을 맡는다', 'caring', { bond: 3 }, '알을 목도리로 감싸 늘 가방에 넣고 다녔다.', { flag: 'town-new-bark-egg' }],
    ['연구소에서 관찰만 돕는다', 'curious', { wisdom: 3 }, '하루 세 번 알의 온도를 재서 기록했다.'],
    ['책임질 자신이 없다고 한다', 'easygoing', { joy: 0, wisdom: 1 }, '공박사는 다른 조수에게 알을 맡겼다.'],
  ], at('new-bark')],
  ['town-new-bark-egg-hatch', 11, 25, '흔들리는 알', '맡아 둔 알이 밤새 덜컥거렸다. 아침이 되자 껍질에 금이 가 있다.', [
    ['곁에서 부화를 지켜본다', 'caring', { bond: 4, joy: 3 }, '껍질을 깨고 나온 작은 포켓몬이 당신을 처음 보고 울었다. 공박사가 이 아이는 당신과 지내야 한다고 했다.', { join: 175, joinOrigin: 'egg' }],
    ['연구소로 데려간다', 'curious', { wisdom: 4 }, '', spot('공박사와 함께 갓 태어난 {pk:을} 관찰했다. 부화 기록에 당신의 이름이 들어갔다.', {}, 175)],
  ], after('new-bark', 'town-new-bark-egg')],
  ['town-new-bark-wind', 6, 80, '새바람 부는 언덕', '연두마을에 새 계절의 바람이 불어온다. 29번도로 풀숲이 술렁인다.', [
    ['풀숲으로 들어간다', 'bold', { courage: 3 }, '', wild('바람을 타고 나타난 {pk:과} 마주쳤다.')],
    ['언덕에서 바람을 맞는다', 'easygoing', { joy: 3, vitality: 2 }, '풍차 소리를 들으며 한참 누워 있었다.'],
    ['연구소 창문 너머를 엿본다', 'curious', { wisdom: 2 }, '', spot('공박사 연구소 창가에서 낮잠을 자는 {pk:을} 보았다.')],
  ], at('new-bark', again(7))],

  // 도라지시티
  ['town-violet-sprout-tower', 8, 30, '모다피의 탑 수행', '도라지시티 모다피의 탑은 기둥 하나가 늘 흔들린다. 탑의 스님들이 수행 대련 상대를 찾는다.', [
    ['스님과 대련한다', 'bold', { courage: 3 }, '', duel('wild', '흔들리는 마룻바닥 위에서 스님의 {pk:과} 맞섰다.', { from: 69, level: 12, win: { effects: { wisdom: 2 }, outcome: '스님이 흔들림에 맞서지 말고 함께 흔들리라고 일러 주었다.' } })],
    ['흔들리는 기둥 앞에서 명상한다', 'curious', { wisdom: 4 }, '기둥의 흔들림이 숨소리처럼 느껴질 때까지 앉아 있었다.'],
    ['탑 바깥에서 구경한다', 'easygoing', { joy: 1 }, '', spot('탑 처마 아래 {pk:이} 둥지를 틀고 있었다.')],
  ], at('violet')],
  ['town-violet-school', 6, 14, '트레이너 학교 칠판', '도라지시티 트레이너 학교 칠판에 상성표 퀴즈가 붙었다. 다 맞히면 선생님이 상품을 준다.', [
    ['문제를 다 푼다', 'curious', { wisdom: 4 }, '빈칸을 모두 채우고 상품으로 공책을 받았다.', check('wisdom', 5, '땅 타입 칸에서 막혀 버렸다.', { wisdom: 1 })],
    ['친구들과 맞혀 본다', 'caring', { joy: 2, bond: 1 }, '{friend|과|와} 머리를 맞대고 반쯤 맞혔다.', { cast: { friend: { affinity: 3 } } }],
    ['운동장에서 논다', 'easygoing', { vitality: 3 }, '칠판보다 운동장이 더 좋았다.'],
  ], at('violet', again(4))],
  ['town-violet-ruins-trip', 20, 60, '알프의 유적 가는 길', '도라지시티에서 남쪽으로 이어진 길 끝, 알프의 유적 조사단이 짐꾼을 구한다.', [
    ['조사단에 합류한다', 'curious', { wisdom: 4, vitality: -2 }, '벽에 새겨진 글자를 탁본했다.', {
      follow: [echoLater([2, 5], '해독된 탁본', '알프의 유적에서 뜬 탁본 일부가 해독되었다. 그 문장이 포켓몬의 이름을 부르는 노래였다는 소식이 왔다.', { wisdom: 3, joy: 2 })] }],
    ['짐만 나르고 돈을 받는다', 'pragmatic', { money: 250 }, '무거운 장비를 유적 앞까지 날랐다.'],
    ['길만 걷고 돌아온다', 'easygoing', { joy: 2 }, '들판의 바람이 좋았다.'],
  ], at('violet')],

  // 금빛시티
  ['town-goldenrod-radio-job', 14, 45, '라디오탑 보조', '금빛시티 라디오탑이 주말 방송 보조를 뽑는다.', [
    ['방송 보조를 한다', 'pragmatic', { money: 200, wisdom: 2 }, '음향 조정실에서 케이블 감는 법부터 배웠다.', { flag: 'town-goldenrod-radio' }],
    ['청취자 퀴즈 코너 진행을 맡는다', 'bold', { courage: 3, reputation: 1 }, '떨리는 목소리로 첫 퀴즈를 읽었다.', { flag: 'town-goldenrod-radio', ...check('courage', 5, '말을 더듬어 진행자가 대신 읽었다.', { joy: -1 }) }],
    ['견학만 한다', 'curious', { wisdom: 1 }, '스튜디오 유리창 너머를 구경했다.'],
  ], at('goldenrod')],
  ['town-goldenrod-radio-takeover', 16, 60, '점거된 라디오탑', '라디오탑에서 일한 적이 있어 안을 잘 안다. 그런데 오늘 아침 로켓단 잔당이 방송국을 점거하고 이상한 방송을 내보내기 시작했다.', [
    ['비상계단으로 들어간다', 'bold', { courage: 5 }, '조정실로 향하는 복도에서 조직원과 맞닥뜨렸다.', duel('villain', '', { from: null, win: { world: { safety: 3 },
      follow: [echoLater([1, 3], '라디오탑 감사 방송', '정상화된 라디오탑이 특별 방송에서 당신의 이름을 불렀다. 그날 비상계단 이야기가 금빛시티의 작은 전설이 되었다.', { reputation: 3, joy: 3 })] },
      lose: { effects: { vitality: -3 } } })],
    ['건물 도면을 경찰에 건넨다', 'pragmatic', { wisdom: 3, reputation: 1 }, '진입로를 알려 진압을 도왔다.', { world: { safety: 2 } }],
    ['라디오를 끈다', 'easygoing', { joy: -1 }, '며칠 뒤 방송은 돌아왔다.'],
  ], after('goldenrod', 'town-goldenrod-radio')],
  ['town-goldenrod-bike-shop', 8, 45, '자전거가게 대여', '금빛시티 자전거가게가 새 자전거 시승을 해 주면 하루 무료로 빌려준단다. 지하상가에서는 할인 행사도 한다.', [
    ['자전거로 교외까지 달린다', 'bold', { courage: 3, vitality: 2 }, '', wild('길 한가운데 나무처럼 서 있던 {pk:이} 갑자기 움직였다.', { from: 185 })],
    ['지하상가에서 흥정한다', 'pragmatic', { money: 150, wisdom: 1 }, '상인과 한참 흥정해 상처약을 싸게 샀다.'],
    ['도시를 천천히 돈다', 'easygoing', { joy: 3 }, '', spot('분수대 옆에서 낮잠 자는 {pk:을} 보았다.')],
  ], at('goldenrod', again(6))],

  // 인주시티
  ['town-ecruteak-burned-tower', 12, 40, '불탄탑 지하', '인주시티 불탄탑 바닥이 무너지면서 지하층이 드러났다. 그 아래 세 마리 포켓몬이 잠들어 있다는 옛이야기가 있다.', [
    ['구멍 아래로 내려간다', 'bold', { courage: 4 }, '', spot('그을린 기둥 사이로 {pk:이} 번개처럼 스쳐 지나갔다.', {
      follow: [echoLater([2, 4], '탑을 떠난 그림자', '성도 곳곳에서 불탄탑의 세 포켓몬을 보았다는 목격담이 이어지고 있다. 그날 당신이 본 그림자가 그 시작이었다.', { courage: 2, wisdom: 2 })] }, [243, 244, 245])],
    ['장로에게 옛이야기를 듣는다', 'curious', { wisdom: 4 }, '탑이 불탄 밤에 무지개빛 새가 날아갔다는 이야기를 들었다.'],
    ['출입 금지선 밖에 머문다', 'pragmatic', { joy: 1 }, '구경꾼들 사이에서 소문만 들었다.'],
  ], at('ecruteak')],
  ['town-ecruteak-dancers', 8, 70, '가무연장의 무희', '인주시티 가무연장에서 무희들이 포켓몬과 함께 춤을 춘다. 공연 뒤에는 무희와 대련도 할 수 있다.', [
    ['무희에게 대련을 청한다', 'bold', { courage: 3 }, '', duel('wild', '부채를 든 무희가 {pk:과} 함께 나섰다.', { from: [134, 135, 136, 196, 197], level: 25 })],
    ['춤을 배운다', 'easygoing', { joy: 4, vitality: 1 }, '파트너와 함께 발을 맞추다 몇 번이나 넘어졌다.', { affection: 2 }],
    ['공연만 본다', 'curious', { wisdom: 2 }, '부채 끝 동작 하나하나에 오랜 전통이 담겨 있었다.'],
  ], at('ecruteak', again(6))],
  ['town-ecruteak-bell-tower', 30, 90, '방울탑의 허락', '인주시티 방울탑은 아무에게나 열리지 않는다. 오랜 세월 이 고장을 지킨 사람에게 수행이 허락된다는 말이 있다.', [
    ['탑지기에게 수행을 청한다', 'curious', { wisdom: 5 }, '', spot('꼭대기 층 창밖으로 무지개빛 깃털을 가진 {pk:이} 멀리 지나갔다.', check('wisdom', 15, '탑지기는 아직 때가 아니라며 고개를 저었다.', { wisdom: 1 }), 250)],
    ['탑 주변 낙엽을 쓴다', 'caring', { bond: 2, reputation: 1 }, '탑지기가 매일 아침 낙엽 쓰는 모습을 눈여겨보았다.'],
    ['멀리서 탑을 바라본다', 'easygoing', { joy: 2 }, '노을 진 탑 위에 방울 소리가 울렸다.'],
  ], at('ecruteak')],
];

// ── 호연 ─────────────────────────────────────────────────────────────────────────────────────────
const hoenn = [
  // 미로마을
  ['town-littleroot-birch-rescue', 8, 14, '쫓기는 박사님', '미로마을 바로 옆 101번도로에서 털보박사가 야생 포켓몬에게 쫓기며 살려 달라고 외치고 있다.', [
    ['파트너와 막아선다', 'bold', { courage: 4 }, '', duel('wild', '박사를 쫓던 {pk:과} 맞섰다.', { win: { effects: { reputation: 1 }, outcome: '박사가 숨을 몰아쉬며 고맙다고 몇 번이나 말했다.' } })],
    ['박사의 가방을 열어 몬스터볼을 꺼낸다', 'curious', { courage: 2, wisdom: 2 }, '가방 속 몬스터볼을 던져 박사가 위기를 넘기게 도왔다.'],
    ['어른을 부르러 뛴다', 'caring', { bond: 1 }, '마을 어른들이 달려와 박사를 구했다.'],
  ], at('littleroot')],
  ['town-littleroot-moving', 20, 55, '이삿짐 트럭', '미로마을에 이삿짐 트럭이 들어왔다. 먼 지방에서 이사 온 가족의 짐이 산더미다.', [
    ['짐 옮기기를 돕는다', 'caring', { vitality: -2, bond: 2 }, '격투 포켓몬과 함께 장롱을 나르며 새 이웃과 인사했다.', {
      follow: [echoLater([1, 3], '새 이웃의 답례', '미로마을로 이사 온 이웃이 고향 특산 나무열매 한 상자를 들고 찾아왔다. 이제는 길에서 먼저 손을 흔드는 사이가 되었다.', { joy: 4, money: 100 })] }],
    ['마을 지도를 그려 준다', 'curious', { wisdom: 2 }, '포켓몬센터와 연구소 위치를 그려 주었다.'],
    ['창문으로 구경한다', 'easygoing', { joy: 1 }, '트럭에서 내린 아이가 바로 연구소 쪽으로 뛰어갔다.'],
  ], at('littleroot')],
  ['town-littleroot-fieldwork', 12, 40, '털보박사의 현장 조사', '연구소보다 풀숲을 좋아하는 털보박사가 현장 조사에 동행할 사람을 구한다.', [
    ['풀숲에 엎드려 관찰한다', 'curious', { wisdom: 4 }, '', spot('진흙투성이가 된 끝에 {pk}의 먹이 습관을 기록했다.')],
    ['조사 중 만난 포켓몬과 겨룬다', 'bold', { courage: 2 }, '박사가 배틀 데이터를 수첩에 빠르게 적었다.', { training: 20 }],
    ['도시락만 챙겨 준다', 'caring', { bond: 1 }, '박사는 도시락을 들고 고맙다며 풀숲으로 사라졌다.'],
  ], at('littleroot', again(6))],

  // 등화도시
  ['town-petalburg-gym-rooms', 10, 25, '체육관의 방들', '등화도시 체육관은 스피드의 방, 방어의 방처럼 방마다 다른 수련을 한다. 관장이 아이들에게 방 하나를 골라 보라고 했다.', [
    ['스피드의 방', 'bold', { courage: 3, vitality: 2 }, '숨이 턱에 찰 때까지 달리기 훈련을 했다.', { training: 15, flag: 'town-petalburg-rooms' }],
    ['방어의 방', 'pragmatic', { wisdom: 2, vitality: 2 }, '버티는 법을 배우며 파트너의 체력을 살피는 눈이 생겼다.', { training: 15, flag: 'town-petalburg-rooms' }],
    ['오늘은 구경만 한다', 'easygoing', { joy: 1 }, '방문 틈으로 다른 아이들의 훈련을 보았다.'],
  ], at('petalburg')],
  ['town-petalburg-gym-match', 16, 50, '관장과의 정식 배틀', '방마다 수련을 거친 당신에게 등화도시 체육관 관장이 정식 배틀을 제안했다. 자식처럼 키운 수련생에게도 봐주지 않는 사람이다.', [
    ['정면으로 맞선다', 'bold', { courage: 5 }, '마지막 방의 문이 열렸다.', duel('gym', '', { from: null, win: { effects: { joy: 3 } }, lose: { effects: { wisdom: 2 } } })],
    ['대련으로 대신한다', 'pragmatic', { wisdom: 3 }, '관장이 승패보다 자세를 보겠다며 가벼운 대련을 받아 주었다.', { training: 20 }],
    ['아직 이르다고 한다', 'easygoing', { joy: 1 }, '관장은 언제든 기다리겠다고 했다.'],
  ], after('petalburg', 'town-petalburg-rooms')],
  ['town-petalburg-first-catch', 8, 18, '이웃 아이의 첫 포획', '몸이 약해 늘 집에만 있던 이웃 아이가 시골로 요양을 떠나기 전, 포켓몬 한 마리를 잡아 보고 싶다고 한다.', [
    ['함께 102번도로로 간다', 'caring', { bond: 3 }, '', wild('아이와 함께 {pk:을} 찾아냈다. 아이가 몬스터볼을 꼭 쥐고 지켜보았다.', { win: { effects: { joy: 3 }, outcome: '아이가 볼을 들고 처음으로 소리 내어 웃었다.' } })],
    ['포획 요령만 가르친다', 'curious', { wisdom: 2 }, '', spot('아이와 풀숲 앞에 앉아 {pk}의 움직임을 함께 보았다.')],
    ['다음에 같이 가자고 한다', 'easygoing', { joy: 0, bond: 1 }, '아이는 아쉬워하면서도 약속을 받아 들고 떠났다.'],
  ], at('petalburg')],

  // 잿빛도시
  ['town-slateport-museum', 8, 75, '해양박물관', '잿빛도시 해양박물관에 심해 탐사 기록이 새로 전시되었다.', [
    ['전시를 꼼꼼히 본다', 'curious', { wisdom: 4 }, '', spot('심해 영상 속 {pk}의 빛나는 몸이 인상적이었다.')],
    ['도슨트 봉사를 한다', 'caring', { reputation: 1, wisdom: 2 }, '아이들에게 바다 포켓몬 이야기를 들려주었다.'],
    ['기념품만 산다', 'easygoing', { joy: 2, money: -80 }, '잠수정 모형 열쇠고리를 샀다.'],
  ], at('slateport', again(6))],
  ['town-slateport-shipyard', 18, 55, '조선소의 잠수정', '잿빛도시 조선소가 심해 탐사 잠수정을 만들고 있다. 시민 후원과 견습생을 모집한다.', [
    ['후원금을 낸다', 'pragmatic', { money: -500, reputation: 1 }, '후원자 명판에 이름이 올라갔다.', {
      follow: [choiceLater([3, 5], '잠수정 진수식', '후원했던 잠수정이 완성되었다. 조선소가 진수식에서 첫 시험 잠항에 동승하지 않겠느냐고 물었다.', [
        ['잠수정에 탄다', 'bold', { courage: 5, joy: 4 }, '창밖으로 빛 하나 없는 바다와 그 속을 헤엄치는 포켓몬을 보았다.'],
        ['육지에서 지켜본다', 'easygoing', { joy: 3, money: 300 }, '조선소가 후원금 일부를 기념 배당으로 돌려주었다.'],
      ])] }],
    ['견습생이 된다', 'curious', { wisdom: 3, vitality: -2 }, '용접 불꽃 사이에서 설계도 읽는 법을 배웠다.', { training: 10 }],
    ['진척만 지켜본다', 'easygoing', { joy: 1 }, '조선소 앞을 지날 때마다 선체가 조금씩 커졌다.'],
  ], at('slateport')],
  ['town-slateport-pier', 10, 80, '잿빛시장 뒤 부두', '잿빛시장이 끝나는 곳, 부둣가에 낚싯대를 드리운 사람들이 늘어섰다.', [
    ['낚싯대를 드리운다', 'bold', { joy: 3 }, '', lure('물보라를 일으키며 {pk:이} 걸려 올라왔다.', 'joy', 5, '{pk:이} 미끼만 떼어 먹고 사라졌다.')],
    ['시장 상인을 돕는다', 'pragmatic', { money: 150 }, '먼 지방에서 온 나무열매를 상자째 날랐다.'],
    ['갈모매 무리를 본다', 'easygoing', { joy: 2 }, '', spot('부두 기둥에 앉은 {pk:을} 한참 구경했다.')],
  ], at('slateport')],

  // 검방울시티
  ['town-fortree-treehouse', 6, 15, '나무 위 우리 집', '검방울시티 아이들은 자기만의 나무 위 집을 갖는 게 꿈이다. 부모님이 큰 나무 하나를 써도 된다고 허락했다.', [
    ['직접 판자를 엮는다', 'bold', { courage: 3, vitality: -1 }, '삐뚤빼뚤하지만 바람에도 끄떡없는 집이 생겼다.', { flag: 'town-fortree-treehouse' }],
    ['어른에게 설계를 배운다', 'curious', { wisdom: 3 }, '도르래까지 달린 작은 집을 완성했다.', { flag: 'town-fortree-treehouse' }],
    ['친구 집에 놀러 간다', 'easygoing', { joy: 2 }, '{friend}의 나무 집에서 해가 질 때까지 놀았다.', { cast: { friend: { affinity: 3 } } }],
  ], at('fortree')],
  ['town-fortree-treehouse-guests', 7, 35, '나무 집의 손님', '직접 지은 나무 위 집에 언제부턴가 포켓몬이 드나든다. 아침이면 지붕에서 날갯짓 소리가 난다.', [
    ['나무열매로 불러들인다', 'caring', { bond: 3 }, '', lure('나무열매를 받아먹던 {pk:이} 결국 창틀에 자리를 잡았다.', 'bond', 5, '{pk:은} 열매만 물고 날아갔다.')],
    ['관찰 일기를 쓴다', 'curious', { wisdom: 3 }, '', spot('창틈으로 {pk}의 둥지 짓기를 기록했다.', {
      follow: [echoLater([3, 6], '나무 집의 관찰 일기', '어릴 적 나무 집에서 쓴 관찰 일기가 검방울시티 도서관 지역 자료실에 기증되었다. 아이들이 그 일기를 보며 나무 집을 짓는다고 한다.', { joy: 3, reputation: 2 })] })],
    ['손님이 편하게 둔다', 'easygoing', { joy: 2 }, '나무 집을 비워 두니 지붕 위 노랫소리가 더 커졌다.'],
  ], after('fortree', 'town-fortree-treehouse')],
  ['town-fortree-invisible', 14, 60, '보이지 않는 무언가', '검방울시티 동쪽 다리 위에서 보이지 않는 무언가가 길을 막고 있다. 사람들이 다리 앞에서 발만 구른다.', [
    ['손을 더듬어 정체를 찾는다', 'bold', { courage: 3 }, '', wild('허공이 흔들리더니 {pk:이} 색을 바꾸며 나타났다.', { from: 352 })],
    ['투명한 것을 비추는 도구를 빌려 온다', 'curious', { wisdom: 3 }, '', spot('렌즈 너머로 다리 난간에 매달린 {pk:이} 보였다.', {}, 352)],
    ['다른 길로 돌아간다', 'pragmatic', { vitality: -1 }, '조금 멀어도 확실한 길을 택했다.'],
  ], at('fortree')],

  // 용암마을
  ['town-lavaridge-hot-spring', 8, 95, '용암마을 온천', '용암마을 온천에 김이 자욱하다. 할머니들은 온천물이 포켓몬에게도 좋다고 입을 모은다.', [
    ['파티와 온천에 들어간다', 'easygoing', { vitality: 5, joy: 3 }, '포켓몬들도 눈을 지그시 감고 물에 몸을 맡겼다.', { affection: 2 }],
    ['모래찜질을 해 본다', 'curious', { vitality: 3, wisdom: 1 }, '뜨거운 모래 속에 누워 땀을 흠뻑 흘렸다.'],
    ['온천 청소를 돕는다', 'caring', { reputation: 1, money: 100 }, '탕을 닦고 수건을 갰다.'],
  ], at('lavaridge', again(5))],
  ['town-lavaridge-ash', 12, 60, '화산재 모으기', '굴뚝산에서 날아온 화산재가 113번도로를 덮었다. 유리공방이 재를 모아 오면 피리를 만들어 준다고 한다.', [
    ['재 자루를 가득 채운다', 'pragmatic', { vitality: -2, wisdom: 1 }, '자루가 무거워질 때마다 발밑에서 재가 흩날렸다.', {
      follow: [echoLater([1, 2], '유리공방의 피리', '모아 온 화산재로 만든 유리 피리가 완성되었다. 불어 보니 파티 포켓몬들이 귀를 쫑긋 세웠다.', { joy: 3, bond: 2 })] }],
    ['재 속 포켓몬을 찾아본다', 'curious', { wisdom: 3 }, '', spot('잿빛 풀숲 사이에서 {pk:이} 고개를 내밀었다.')],
    ['마스크를 쓰고 지나간다', 'easygoing', { joy: 0, vitality: 1 }, '재 날리는 길을 서둘러 지나갔다.'],
  ], at('lavaridge')],
  ['town-lavaridge-volcano', 16, 55, '굴뚝산 정상의 소란', '용암마을 위 굴뚝산 정상에서 붉은 옷을 입은 무리가 화구에 장치를 설치한다는 신고가 들어왔다.', [
    ['정상으로 올라간다', 'bold', { courage: 5 }, '화구 가장자리에서 마그마단 조직원과 맞섰다.', duel('villain', '', { from: null, win: { world: { safety: 3, ecology: 2 } }, lose: { effects: { vitality: -3 } } })],
    ['등산로에서 포켓몬을 대피시킨다', 'caring', { bond: 3 }, '', wild('놀라 뛰쳐나온 {pk:을} 진정시키려 나섰다.')],
    ['마을에서 소식을 기다린다', 'easygoing', { joy: -1 }, '밤늦게 화산이 잠잠하다는 소식이 왔다.'],
  ], at('lavaridge')],

  // 해안시티
  ['town-lilycove-department', 10, 85, '해안백화점 옥상 세일', '해안백화점 옥상에서 깜짝 세일이 열렸다. 바다가 내려다보이는 옥상에 사람이 몰렸다.', [
    ['파티 장식품을 산다', 'easygoing', { joy: 3, money: -150 }, '포켓몬들이 새 방석을 차지하려고 다퉜다.', { affection: 2 }],
    ['한정 상품을 사서 되판다', 'pragmatic', { money: 200 }, '한정 머그잔이 웃돈을 얹어 팔렸다.', check('wisdom', 10, '인기가 없어 원가에 넘겼다.', { money: 0 })],
    ['옥상에서 바다를 본다', 'curious', { joy: 2 }, '', spot('먼바다에서 물줄기를 뿜는 {pk:이} 보였다.')],
  ], at('lilycove', again(6))],
  ['town-lilycove-contest', 10, 45, '콘테스트홀 첫 무대', '해안시티 콘테스트홀에서 노멀 랭크 대회가 열린다. 파트너의 매력을 보여 줄 무대다.', [
    ['파트너와 무대에 선다', 'bold', { joy: 4, courage: 2 }, '조명 아래에서 파트너가 멋지게 기술을 펼쳤다.', { flag: 'town-contest-debut', affection: 2,
      ...check('courage', 5, '긴장해서 순서를 놓쳤지만 박수는 받았다.', { joy: 1 }, { flag: 'town-contest-debut' }) }],
    ['리본 장식을 만든다', 'caring', { bond: 3 }, '출전자들의 리본을 손질해 주었다.'],
    ['객석에서 구경한다', 'easygoing', { joy: 2 }, '무대 뒤 긴장한 얼굴들이 귀여웠다.'],
  ], at('lilycove')],
  ['town-lilycove-aqua', 16, 55, '해안 동굴의 아지트', '해안시티 앞바다의 동굴에 아쿠아단 아지트가 있다는 소문이 돈다. 밤마다 잠수정 불빛이 오간다.', [
    ['동굴로 숨어든다', 'bold', { courage: 5 }, '젖은 통로에서 아쿠아단 단원과 마주쳤다.', duel('villain', '', { from: null, win: { world: { safety: 2 },
      follow: [echoLater([2, 4], '아지트의 끝', '해안시티 앞바다 동굴의 아지트가 텅 비었다는 보도가 나왔다. 당신이 경찰에 넘긴 지도가 결정적이었다고 한다.', { reputation: 3 })] } })],
    ['해변에서 불빛을 기록한다', 'curious', { wisdom: 3 }, '', spot('불빛 아래 물가에서 놀란 {pk:이} 뛰어올랐다.', { world: { safety: 1 } })],
    ['모른 척한다', 'easygoing', { joy: 0, vitality: 1 }, '바다는 오늘도 조용해 보였다.'],
  ], at('lilycove')],
];

// ── 신오 ─────────────────────────────────────────────────────────────────────────────────────────
const sinnoh = [
  // 떡잎마을
  ['town-twinleaf-route201', 6, 15, '201번도로의 가방', '떡잎마을 어귀를 벗어나면 바로 풀숲이다. 길가에 누군가 두고 간 가방이 놓여 있다.', [
    ['가방 주인을 기다린다', 'caring', { bond: 2, wisdom: 1 }, '', spot('기다리는 동안 풀숲에서 {pk:이} 기웃거렸다. 가방 주인은 고맙다며 박사님 연구소에 놀러 오라고 했다.')],
    ['풀숲에 들어가 본다', 'bold', { courage: 4 }, '', wild('풀숲에서 튀어나온 {pk:과} 맞섰다.')],
    ['어른에게 맡긴다', 'pragmatic', { wisdom: 1 }, '가방은 무사히 주인에게 돌아갔다.'],
  ], at('twinleaf')],
  ['town-twinleaf-lake-mist', 20, 85, '호숫가의 안개', '떡잎마을 가까운 호수에 안개가 짙게 낀 날, 물 위에 무언가 떠 있는 것을 보았다는 사람이 있다.', [
    ['안개 낀 호숫가에 간다', 'curious', { wisdom: 3, joy: 2 }, '', spot('안개 속에서 {pk:이} 웃듯이 맴돌다 사라졌다.', {
      follow: [echoLater([1, 3], '호수의 꿈', '호숫가에 다녀온 뒤로 같은 꿈을 꾼다. 꿈속에서 누군가 웃으며 함께 기뻐해 주었다.', { joy: 4 }, 0.7)] }, 481)],
    ['호숫가 쓰레기를 줍는다', 'caring', { reputation: 1 }, '물가가 깨끗해졌다.', { world: { ecology: 2 } }],
    ['따뜻한 집에 있는다', 'easygoing', { vitality: 2 }, '창밖 안개를 보며 차를 마셨다.'],
  ], at('twinleaf', again(8))],
  ['town-twinleaf-sled', 6, 14, '눈썰매 언덕', '떡잎마을에 첫눈이 쌓였다. 아이들이 마을 뒤 언덕에서 썰매를 끈다.', [
    ['맨 꼭대기에서 탄다', 'bold', { courage: 3, joy: 3 }, '눈보라를 일으키며 언덕 아래까지 미끄러졌다.', check('vitality', 0, '중간에 뒤집혀 눈 속에 처박혔다.', { vitality: -2, joy: 1 })],
    ['{sibling}의 썰매를 끌어 준다', 'caring', { bond: 3 }, '썰매를 끄는 동안 웃음소리가 언덕을 메웠다.', { cast: { sibling: { affinity: 4 } } }],
    ['눈사람을 만든다', 'easygoing', { joy: 3 }, '파트너 모양 눈사람을 만들었다.'],
  ], at('twinleaf', again(4))],

  // 축복시티
  ['town-jubilife-tv-interview', 14, 60, 'TV방송국 거리 인터뷰', '축복시티 TV방송국 리포터가 거리에서 트레이너 인터뷰를 하고 있다. 카메라가 당신 쪽을 향했다.', [
    ['파트너 자랑을 한다', 'bold', { joy: 3, reputation: 2 }, '저녁 뉴스에 파트너가 크게 나왔다.', { flag: 'town-jubilife-tv', affection: 1 }],
    ['차분히 답한다', 'pragmatic', { wisdom: 2, reputation: 1 }, '짧은 대답이 오히려 자막으로 남았다.', { flag: 'town-jubilife-tv' }],
    ['카메라를 피한다', 'easygoing', { joy: 1 }, '골목으로 슬쩍 빠졌다.'],
  ], at('jubilife')],
  ['town-jubilife-tv-segment', 20, 70, '고정 코너 제안', '인터뷰를 본 축복시티 방송국 PD가 일주일에 한 번 나오는 짧은 코너를 제안했다.', [
    ['포켓몬 돌보기 코너를 맡는다', 'caring', { reputation: 3, money: 300 }, '시청자 질문에 답하며 한 시즌을 보냈다.', {
      follow: [choiceLater([2, 4], '코너 연장 계약', '축복시티 방송국이 코너를 정규 편성하겠다며 계약 연장을 제안했다. 출연료는 오르지만 시간도 더 든다.', [
        ['연장한다', 'bold', { money: 600, reputation: 2, vitality: -3 }, '이제 거리에서 알아보는 사람이 늘었다.'],
        ['후배에게 넘긴다', 'caring', { joy: 3, bond: 2 }, '코너를 넘기며 마지막 방송에서 파트너와 인사했다.'],
      ])] }],
    ['배틀 해설을 맡는다', 'bold', { courage: 2, reputation: 2 }, '말이 빠르다는 평을 들었지만 해설은 정확했다.', { training: 10 }],
    ['한 번만 나간다', 'easygoing', { joy: 2 }, '방송 한 편으로 충분했다.'],
  ], after('jubilife', 'town-jubilife-tv')],
  ['town-jubilife-school', 6, 14, '트레이너즈스쿨 야외 수업', '축복시티 트레이너즈스쿨이 도시 공원에서 야외 수업을 한다.', [
    ['포켓몬 관찰 과제를 한다', 'curious', { wisdom: 4 }, '', spot('공원 벤치 밑 {pk:을} 그림으로 그려 냈다.')],
    ['연습 배틀 시범을 본다', 'bold', { courage: 2 }, '선생님의 시범을 따라 하며 기술 순서를 외웠다.', { training: 10 }],
    ['친구들과 도시락을 먹는다', 'easygoing', { joy: 3 }, '{friend|과|와} 반찬을 나눠 먹었다.', { cast: { friend: { affinity: 2 } } }],
  ], at('jubilife', again(4))],

  // 연고시티
  ['town-hearthome-contest', 10, 50, '연고시티 콘테스트', '연고시티 콘테스트 회장에서 옷차림, 춤, 연기를 함께 겨루는 대회가 열린다.', [
    ['파트너와 출전한다', 'bold', { joy: 4, courage: 2 }, '춤 심사에서 관객의 박수를 끌어냈다.', { flag: 'town-contest-debut', affection: 2,
      ...check('joy', 5, '박자를 놓쳤지만 무대 경험은 남았다.', { joy: 1 }, { flag: 'town-contest-debut' }) }],
    ['의상 만들기를 돕는다', 'caring', { bond: 2, money: 100 }, '참가자들의 의상 단추를 달아 주었다.'],
    ['객석에서 응원한다', 'easygoing', { joy: 2 }, '모르는 참가자를 응원하다 목이 쉬었다.'],
  ], at('hearthome')],
  ['town-hearthome-park', 8, 90, '포켓몬 공원 산책', '연고시티 포켓몬 공원에서는 작은 포켓몬과 함께 산책할 수 있다.', [
    ['파트너와 산책한다', 'easygoing', { joy: 3, vitality: 2 }, '파트너가 풀밭에서 무언가를 주워 왔다.', { affection: 2 }],
    ['공원 포켓몬을 관찰한다', 'curious', { wisdom: 3 }, '', spot('분수 옆에서 {pk:이} 아이들과 놀고 있었다.')],
    ['공원 관리 봉사를 한다', 'caring', { reputation: 1 }, '산책로 화단을 정리했다.', { world: { ecology: 1 } }],
  ], at('hearthome', again(6))],
  ['town-hearthome-contest-master', 16, 60, '마스터 랭크 초청', '첫 콘테스트 무대를 기억한 연고시티 콘테스트 협회가 마스터 랭크 특별 무대에 초청했다.', [
    ['최고의 무대를 준비한다', 'bold', { joy: 5, courage: 3 }, '마지막 연기에서 객석이 일제히 일어났다.', { affection: 3,
      ...check('joy', 15, '실수 없이 마쳤지만 우승은 다른 참가자에게 갔다.', { joy: 2 }),
      follow: [echoLater([2, 5], '콘테스트 명예 리본', '연고시티 콘테스트 협회가 마스터 랭크 무대 영상을 교본으로 쓰겠다며 명예 리본을 보내왔다.', { reputation: 3, joy: 3 })] }],
    ['심사위원 보조를 맡는다', 'curious', { wisdom: 4 }, '무대 밖에서 연기를 보는 눈을 길렀다.'],
    ['정중히 사양한다', 'easygoing', { joy: 1 }, '첫 무대의 추억으로 충분했다.'],
  ], at('hearthome', { when: s => Boolean(s.flags['town-contest-debut']) })],

  // 선단시티
  ['town-snowpoint-temple', 25, 80, '선단신전 지하', '선단시티 북쪽 선단신전에 들어가려면 체육관 관장의 허락이 필요하다. 지하 깊은 곳에 거대한 석상이 잠들어 있다는 이야기가 있다.', [
    ['허락을 받아 내려간다', 'bold', { courage: 4, wisdom: 2 }, '', spot('얼어붙은 계단 끝에서 {pk}의 석상을 마주했다. 눈 부분이 잠깐 빛난 것 같았다.', {
      ...check('courage', 15, '미끄러운 얼음 계단에서 더 내려가지 못했다.', { vitality: -3 }),
      follow: [echoLater([3, 6], '신전의 진동', '선단신전 근처에서 미세한 땅울림이 관측되었다는 소식이 왔다. 그날 본 석상의 빛이 다시 떠올랐다.', { wisdom: 3, courage: 2 })] }, 486)],
    ['신전 입구 눈을 치운다', 'caring', { reputation: 1, vitality: -1 }, '신전지기가 따뜻한 차를 내주었다.'],
    ['멀리서 신전을 본다', 'easygoing', { joy: 1 }, '눈 덮인 신전이 고요했다.'],
  ], at('snowpoint')],
  ['town-snowpoint-blizzard', 8, 70, '눈보라 속 포켓몬', '선단시티에 눈보라가 몰아친 다음 날, 길을 잃은 포켓몬이 마을 어귀에 웅크리고 있다.', [
    ['다가가 데려온다', 'caring', { bond: 3 }, '', wild('경계하던 {pk:이} 몸을 일으켰다.', { win: { effects: { bond: 2 }, outcome: '몸을 녹인 뒤 포켓몬은 한결 순해졌다.' } })],
    ['포켓몬센터에 알린다', 'pragmatic', { reputation: 1 }, '', spot('센터 직원이 {pk:을} 데려가 담요로 감쌌다.')],
    ['창밖으로 지켜본다', 'easygoing', { joy: 0, wisdom: 1 }, '저녁이 되자 포켓몬은 숲으로 돌아갔다.'],
  ], at('snowpoint', again(7))],
  ['town-snowpoint-gym', 12, 45, '얼음 체육관의 눈벽', '선단시티 체육관은 눈 덩이를 굴려 길을 뚫어야 관장에게 갈 수 있다.', [
    ['눈덩이를 굴려 길을 낸다', 'bold', { courage: 3, vitality: -1 }, '얼음 바닥을 지나 관장 앞에 섰다.', duel('gym', '', { from: null })],
    ['얼음 위 연습만 한다', 'pragmatic', { vitality: 2 }, '미끄러운 바닥에서 버티는 훈련을 했다.', { training: 15 }],
    ['따뜻한 곳으로 피한다', 'easygoing', { joy: 1 }, '센터 난롯가에서 몸을 녹였다.'],
  ], at('snowpoint')],
];

// ── 하나 ─────────────────────────────────────────────────────────────────────────────────────────
const unova = [
  // 마름꽃마을
  ['town-nuvema-juniper', 10, 18, '주박사의 데이터 수집', '마름꽃마을 주박사가 근처 1번도로 포켓몬 분포를 조사할 아이들을 모았다.', [
    ['도감을 들고 뛰어다닌다', 'curious', { wisdom: 3, vitality: 1 }, '', spot('풀숲 끝에서 {pk:을} 발견해 도감에 등록했다.')],
    ['포획 시범을 맡는다', 'bold', { courage: 3 }, '', wild('박사가 보는 앞에서 {pk:과} 맞섰다.')],
    ['연구소에서 정리를 돕는다', 'pragmatic', { wisdom: 2 }, '아이들이 가져온 기록을 표로 정리했다.'],
  ], at('nuvema')],
  ['town-nuvema-letter', 16, 40, '주박사의 추천서', '주박사가 당신이 쓴 관찰 기록을 보고 먼 연구소에 보낼 추천서를 써 주겠다고 했다.', [
    ['추천서를 받아 연구 보조를 한다', 'curious', { wisdom: 4 }, '한 해 동안 연구소의 표본 정리를 도왔다.', {
      follow: [echoLater([2, 4], '공저자 명단', '주박사 연구소의 새 논문 공저자 명단에 당신의 이름이 들어갔다. 마름꽃마을에서 시작한 기록이 하나지방 도감에 반영되었다.', { wisdom: 3, reputation: 2 })] }],
    ['지금 하는 일에 집중한다', 'pragmatic', { money: 150 }, '추천서는 고이 접어 두었다.'],
    ['고맙다는 인사만 한다', 'easygoing', { joy: 2 }, '박사가 언제든 문은 열려 있다고 했다.'],
  ], at('nuvema')],
  ['town-nuvema-sea-view', 25, 90, '바닷가 언덕', '마름꽃마을 끝 언덕에서는 바다가 한눈에 보인다. 노을 무렵 마을 사람들이 하나둘 올라온다.', [
    ['파트너와 저녁놀을 본다', 'easygoing', { joy: 3, bond: 2 }, '바다가 붉게 물드는 동안 아무 말도 하지 않았다.', { affection: 1 }],
    ['언덕 벤치를 고친다', 'caring', { reputation: 1, vitality: -1 }, '삐걱이던 벤치가 단단해졌다.'],
    ['언덕 풀숲을 살핀다', 'curious', { wisdom: 2 }, '', spot('해풍에 흔들리는 풀 사이 {pk:이} 보였다.')],
  ], at('nuvema', again(7))],

  // 구름시티
  ['town-castelia-pier', 14, 80, '구름시티 부두', '구름시티 부두에서 섬 유람선이 출발한다. 부두 앞 노점에서는 이 도시 명물 아이스크림을 판다.', [
    ['유람선을 탄다', 'easygoing', { joy: 4, money: -150 }, '바다 위에서 빌딩숲을 돌아보았다.'],
    ['아이스크림 줄을 선다', 'easygoing', { joy: 3, money: -50 }, '한 시간을 기다린 아이스크림을 파트너와 나눠 먹었다.', { affection: 2 }],
    ['부두 하역을 돕는다', 'pragmatic', { money: 250, vitality: -2 }, '컨테이너 사이를 오가며 땀을 흘렸다.'],
  ], at('castelia', again(6))],
  ['town-castelia-alley', 12, 45, '빌딩숲 뒷골목', '구름시티 빌딩 사이 좁은 골목에 야생 포켓몬이 모여 산다는 이야기를 들었다.', [
    ['골목 끝까지 가 본다', 'bold', { courage: 3 }, '', wild('쓰레기통 뒤에서 {pk:이} 튀어나왔다.')],
    ['골목 포켓몬에게 먹이를 둔다', 'caring', { bond: 3, money: -60 }, '', spot('다음 날 먹이 그릇 옆에 {pk:이} 앉아 있었다.')],
    ['큰길로 돌아간다', 'pragmatic', { wisdom: 1 }, '빌딩 그늘을 벗어나니 햇볕이 따가웠다.'],
  ], at('castelia')],
  ['town-castelia-startup', 22, 55, '빌딩 속 작은 회사', '구름시티 고층 빌딩 한 층을 빌린 작은 회사가 포켓몬 배달 앱을 만든다며 투자자를 찾는다.', [
    ['투자한다', 'bold', { money: -600 }, '대표가 계약서에 서명하며 손을 덥석 잡았다.', {
      follow: [choiceLater([3, 5], '회사의 갈림길', '투자했던 구름시티 회사가 더 큰 기업의 인수 제안을 받았다. 대표가 투자자의 뜻을 묻는다.', [
        ['인수에 찬성한다', 'pragmatic', { money: 1000 }, '지분을 정리해 투자금의 곱절 가까이 돌려받았다.'],
        ['독립을 지지한다', 'bold', { reputation: 2, joy: 2 }, '회사는 작게나마 자기 길을 갔다. 대표가 감사 편지를 보냈다.'],
      ])] }],
    ['사업 계획을 조언한다', 'curious', { wisdom: 3 }, '배달 포켓몬의 쉬는 시간을 계획에 넣으라고 했다.'],
    ['관심 없다', 'easygoing', { joy: 1 }, '엘리베이터를 타고 내려왔다.'],
  ], at('castelia')],

  // 뇌문시티
  ['town-nimbasa-musical', 8, 55, '포켓몬 뮤지컬', '뇌문시티 뮤지컬 극장에서 포켓몬에게 소품을 달아 무대에 세우는 공연이 열린다.', [
    ['파트너를 무대에 세운다', 'bold', { joy: 4 }, '파트너가 작은 모자를 쓰고 박자에 맞춰 몸을 흔들었다.', { affection: 3 }],
    ['소품을 고른다', 'caring', { bond: 2, money: -100 }, '파트너에게 어울리는 리본을 골랐다.'],
    ['객석에서 본다', 'easygoing', { joy: 3 }, '무대 위 포켓몬들이 저마다 귀여웠다.'],
  ], at('nimbasa', again(6))],
  ['town-nimbasa-ferris', 16, 35, '놀이공원 관람차', '뇌문시티 놀이공원 관람차가 밤에 불을 밝혔다. {friend|이|가} 함께 타자며 표 두 장을 흔든다.', [
    ['함께 탄다', 'caring', { joy: 4, bond: 2 }, '꼭대기에서 도시 불빛을 내려다보며 오래된 이야기를 나눴다.', s => ({ cast: { friend: { affinity: 6 } },
      follow: [echoLater([3, 6], '관람차 사진', fill(s, '{friend|이|가} 그날 관람차에서 찍은 사진을 액자에 넣어 보내왔다. 뒷면에 또 타자고 적혀 있었다.'), { joy: 4 })] })],
    ['롤러코스터로 바꾼다', 'bold', { courage: 3, joy: 2 }, '비명을 지르며 내려와 한참 웃었다.', { cast: { friend: { affinity: 3 } } }],
    ['다음에 타자고 한다', 'easygoing', { joy: 0, vitality: 1 }, '{friend|은|는} 아쉬운 얼굴로 표를 접었다.'],
  ], at('nimbasa')],
  ['town-nimbasa-stadium', 12, 60, '빅스타디움 경기', '뇌문시티 빅스타디움에서 포켓몬과 함께하는 스포츠 경기가 열린다. 경기 전 몸풀기 상대를 구한다.', [
    ['몸풀기 상대가 된다', 'bold', { courage: 3 }, '', duel('wild', '선수가 데려온 {pk:과} 가볍게 겨뤘다.', { level: 22 })],
    ['관중석에서 응원한다', 'easygoing', { joy: 3 }, '파도타기 응원에 함께 일어섰다.'],
    ['경기장 매점 일을 한다', 'pragmatic', { money: 200 }, '하프타임에 음료가 날개 돋친 듯 팔렸다.'],
  ], at('nimbasa', again(5))],

  // 물풍경시티
  ['town-driftveil-cold-storage', 16, 50, '냉동창고 아르바이트', '물풍경시티 항구 옆 냉동창고가 단기 일손을 뽑는다. 밤에만 들어오는 상자가 있다는 소문도 있다.', [
    ['밤 근무를 선다', 'curious', { money: 250, wisdom: 2 }, '명세서에 없는 상자 하나에서 포켓몬 울음소리가 났다.', { flag: 'town-driftveil-crates' }],
    ['낮 근무만 한다', 'pragmatic', { money: 200, vitality: -1 }, '추위 속에서 상자를 옮겼다.'],
    ['추운 일은 사양한다', 'easygoing', { joy: 1 }, '항구 카페에서 시간을 보냈다.'],
  ], at('driftveil')],
  ['town-driftveil-crates', 16, 60, '울음소리 나는 상자', '냉동창고에서 들은 울음소리가 마음에 걸린다. 오늘 밤 그 상자들이 배에 실린다고 한다.', [
    ['창고에 숨어 확인한다', 'bold', { courage: 5 }, '상자를 지키던 플라스마단 단원과 맞섰다.', duel('villain', '', { from: null, win: { effects: { bond: 2 }, world: { safety: 3 },
      outcome: '상자 속에 갇혀 있던 포켓몬들이 풀려났다.' }, lose: { effects: { vitality: -3 } } })],
    ['항만 경찰에 신고한다', 'pragmatic', { reputation: 2 }, '경찰이 배를 붙잡아 상자를 열었다.', { world: { safety: 2 } }],
    ['잊으려 한다', 'easygoing', { joy: -2 }, '그날 밤 배는 조용히 떠났다.'],
  ], after('driftveil', 'town-driftveil-crates')],
  ['town-driftveil-harbor', 8, 80, '물풍경 항구 낚시', '물풍경시티 항구 방파제는 낚시꾼들의 단골 자리다.', [
    ['방파제 끝에서 낚는다', 'bold', { joy: 3 }, '', lure('물살을 가르며 {pk:이} 걸려들었다.', 'joy', 5, '{pk:이} 줄을 끊고 달아났다.', { joy: -1 })],
    ['낚시꾼들의 이야기를 듣는다', 'curious', { wisdom: 2 }, '먼바다에 산다는 큰 포켓몬 이야기를 들었다.', {
      follow: [echoLater([2, 4], '방파제의 대어', '그때 이야기를 들려준 낚시꾼이 전설 같던 대어를 정말 낚았다며 사진을 보내왔다.', { joy: 3 }, 0.8)] }],
    ['바닷바람만 쐰다', 'easygoing', { vitality: 2 }, '갈매기 소리를 들으며 걸었다.'],
  ], at('driftveil', again(7))],
];

// ── 칼로스 ───────────────────────────────────────────────────────────────────────────────────────
const kalos = [
  // 조아마을
  ['town-vaniville-neighbors', 6, 14, '이웃집 아이들', '조아마을에 이사 온 이웃집 아이들이 마을 뒤 풀밭에서 포켓몬을 쫓아다니자고 한다.', [
    ['함께 쫓아간다', 'bold', { courage: 3, joy: 2 }, '', wild('풀밭 끝에서 {pk:이} 멈춰 섰다.')],
    ['조용히 따라가며 본다', 'curious', { wisdom: 3 }, '', spot('{pk:이} 꽃잎 사이로 숨는 모습을 보았다.')],
    ['집 앞에서 논다', 'easygoing', { joy: 2 }, '아이들이 돌아와 무용담을 늘어놓았다.'],
  ], at('vaniville')],
  ['town-vaniville-departure', 16, 30, '떠나는 날의 꽃길', '조아마을 사람들이 여행을 떠나는 젊은이에게 꽃을 한 송이씩 건네는 풍습이 있다. 오늘은 당신 차례다.', [
    ['꽃을 받아 길을 나선다', 'bold', { courage: 4, joy: 2 }, '꽃을 가방에 꽂고 마을 문을 나섰다.', {
      follow: [echoLater([2, 4], '고향의 편지', '조아마을에서 편지가 왔다. 떠나던 날 받은 꽃씨가 마을 길가에 피었다며 사진이 동봉되어 있었다.', { joy: 4, bond: 1 })] }],
    ['꽃을 집 앞에 심는다', 'caring', { bond: 3 }, '떠나지 않고도 꽃은 피었다.', { world: { ecology: 1 } }],
    ['조금 더 있다 떠난다', 'easygoing', { joy: 1 }, '마을 사람들은 언제든 꽃은 남아 있다고 했다.'],
  ], at('vaniville')],
  ['town-vaniville-flower-road', 30, 90, '마을 꽃길 가꾸기', '조아마을 주민들이 봄마다 마을 꽃길을 함께 가꾼다.', [
    ['화단을 맡는다', 'caring', { reputation: 1, vitality: -1 }, '맡은 화단이 가장 먼저 꽃을 피웠다.', { world: { ecology: 2 } }],
    ['꽃 사진을 찍는다', 'curious', { joy: 2, wisdom: 1 }, '', spot('꽃잎 위에 앉은 {pk:을} 찍었다.')],
    ['그늘에서 쉰다', 'easygoing', { joy: 2, vitality: 2 }, '꽃향기를 맡으며 졸았다.'],
  ], at('vaniville', again(6))],

  // 미르시티
  ['town-lumiose-prism', 14, 80, '프리즘타워 점등', '미르시티 한가운데 프리즘타워가 축제를 맞아 밤새 빛을 바꾼다.', [
    ['광장에서 점등을 본다', 'easygoing', { joy: 4 }, '', spot('불빛 아래 광장을 뛰어다니는 {pk:을} 보았다.')],
    ['축제 질서 요원으로 일한다', 'caring', { reputation: 1, money: 150 }, '길 잃은 아이를 부모에게 데려다주었다.'],
    ['타워 체육관 견학을 신청한다', 'curious', { wisdom: 3 }, '타워 안 발전 설비를 둘러보았다.'],
  ], at('lumiose', again(6))],
  ['town-lumiose-cafe', 18, 60, '골목 카페 단골', '미르시티 골목의 작은 카페 주인이 자주 오는 당신에게 주말 일을 거들어 달라고 했다.', [
    ['주말마다 일한다', 'caring', { money: 200, joy: 2 }, '커피 내리는 법과 단골 이름을 익혔다.', { flag: 'town-lumiose-cafe' }],
    ['카페 메뉴를 제안한다', 'curious', { wisdom: 2 }, '포켓몬용 과자 메뉴가 생겼다.', { flag: 'town-lumiose-cafe' }],
    ['손님으로만 간다', 'easygoing', { joy: 2, money: -50 }, '창가 자리는 여전히 당신 차지였다.'],
  ], at('lumiose')],
  ['town-lumiose-cafe-owner', 25, 70, '카페를 맡아 줄 사람', '미르시티 골목 카페 주인이 은퇴를 앞두고, 함께 일한 당신에게 가게를 넘기고 싶다고 했다.', [
    ['가게를 인수한다', 'bold', { money: -800, reputation: 2 }, '간판은 그대로 두고 문을 다시 열었다.', {
      follow: [choiceLater([2, 4], '카페의 두 번째 겨울', '인수한 미르시티 카페가 자리를 잡았다. 옆 가게가 비어 확장 제안이 들어왔다.', [
        ['확장한다', 'bold', { money: 500, vitality: -3 }, '포켓몬이 쉬어 가는 테라스가 생겼다.', check('wisdom', 10, '공사비가 예상보다 많이 들었다.', { money: -200 })],
        ['지금 크기로 지킨다', 'easygoing', { joy: 4 }, '단골들이 이대로가 좋다고 했다.'],
      ])] }],
    ['단골 레시피만 물려받는다', 'curious', { wisdom: 3 }, '주인이 공책 한 권을 건넸다.'],
    ['은퇴 파티만 열어 준다', 'caring', { joy: 3, bond: 1 }, '단골들이 모여 주인에게 박수를 보냈다.'],
  ], after('lumiose', 'town-lumiose-cafe')],

  // 사라시티
  ['town-shalour-tower', 14, 40, '마스터타워의 시험', '사라시티 앞바다 마스터타워는 썰물 때만 걸어서 갈 수 있다. 메가진화를 이어받으려면 탑의 시험을 통과해야 한다.', [
    ['계승자의 시험을 받는다', 'bold', { courage: 4 }, '', duel('wild', '탑을 지키는 {pk:과} 맞섰다.', { from: 447, level: 25, win: { flag: 'town-shalour-trial', outcome: '시험관이 고개를 끄덕이며 다음 단계를 허락했다.' } })],
    ['탑의 벽화를 공부한다', 'curious', { wisdom: 4 }, '메가진화에 얽힌 옛 그림을 오래 들여다봤다.'],
    ['밀물 전에 돌아간다', 'pragmatic', { vitality: 1 }, '물이 차오르기 전에 해변으로 돌아왔다.'],
  ], at('shalour')],
  ['town-shalour-key-stone', 15, 60, '열쇠돌의 주인', '마스터타워 시험을 통과한 당신에게 사라시티 탑의 계승자가 열쇠돌을 건네려 한다.', [
    ['열쇠돌을 받는다', 'bold', { courage: 3, bond: 3 }, '파트너와 손을 맞대자 돌이 희미하게 빛났다.', { equipment: 'mega' }],
    ['더 수련하고 오겠다고 한다', 'caring', { wisdom: 3 }, '계승자는 그 마음이면 충분하다며 웃었다.', { training: 20 }],
  ], after('shalour', 'town-shalour-trial')],
  ['town-shalour-tide', 8, 80, '썰물의 갯벌', '사라시티 바다가 크게 빠지는 날, 갯벌 위로 바위 웅덩이가 드러났다.', [
    ['웅덩이를 살핀다', 'curious', { wisdom: 3 }, '', spot('바위 웅덩이에서 {pk:이} 물을 튀기고 있었다.')],
    ['조개를 줍는다', 'pragmatic', { money: 120 }, '바구니 가득 조개를 주웠다.'],
    ['갯벌을 맨발로 걷는다', 'easygoing', { joy: 3, vitality: 1 }, '발가락 사이로 진흙이 차가웠다.'],
  ], at('shalour', again(6))],

  // 향전시티
  ['town-anistar-sundial', 12, 65, '해시계의 빛', '향전시티 해시계는 하늘에서 떨어진 돌이라고 한다. 오늘 저녁 해시계가 빛난다는 예보가 돌았다.', [
    ['해시계 앞에서 기다린다', 'curious', { wisdom: 4 }, '', spot('빛이 번지는 순간 돌 틈에서 {pk:이} 반짝였다.', {
      follow: [echoLater([1, 3], '해시계 아래의 꿈', '해시계가 빛나던 밤 이후로 가끔 미래의 장면 같은 꿈을 꾼다. 꿈에서 본 길을 따라가니 정말 오래된 표지석이 있었다.', { wisdom: 3, joy: 2 }, 0.8)] }, 703)],
    ['해시계 관리인과 이야기한다', 'caring', { wisdom: 2, bond: 1 }, '관리인이 해시계에 손을 대 보게 해 주었다.'],
    ['사람이 많아 돌아간다', 'easygoing', { joy: 1 }, '먼발치에서 빛을 보았다.'],
  ], at('anistar')],
  ['town-anistar-gym', 14, 45, '별자리 체육관', '향전시티 체육관 바닥은 별자리 판으로 되어 있다. 관장은 앞날을 보는 사람이라고 한다.', [
    ['별자리 판을 건너 도전한다', 'bold', { courage: 4 }, '별자리 판이 길을 열어 주었다.', duel('gym', '', { from: null })],
    ['관장에게 점을 본다', 'curious', { wisdom: 3 }, '관장이 당신의 길에 빛나는 순간이 있다고 했다.'],
    ['구경만 한다', 'easygoing', { joy: 1 }, '천장의 별빛이 예뻤다.'],
  ], at('anistar')],
  ['town-anistar-pumpkin', 8, 60, '호박 축제', '향전시티 가을 호박 축제에 밤마다 호박 등불이 켜진다. 등불 사이로 진짜 포켓몬이 섞여 있다는 소문이다.', [
    ['등불 사이를 살핀다', 'bold', { courage: 3 }, '', wild('등불인 줄 알았던 {pk:이} 눈을 떴다.', { from: 710 })],
    ['호박 등을 만든다', 'caring', { joy: 3 }, '파트너 얼굴을 새긴 등을 걸었다.', { affection: 2 }],
    ['축제 음식을 먹는다', 'easygoing', { joy: 3, money: -60 }, '호박 수프가 달았다.'],
  ], at('anistar', again(6))],
];

// ── 알로라 ───────────────────────────────────────────────────────────────────────────────────────
const alola = [
  // 이키마을
  ['town-iki-festival', 6, 40, '이키마을 축제', '이키마을 언덕 위 무대에서 섬의 수호신에게 바치는 축제 배틀이 열린다.', [
    ['봉납 배틀에 나선다', 'bold', { courage: 3, joy: 2 }, '', duel('wild', '북소리 속에서 {pk:과} 맞섰다.', { level: 15, win: { effects: { reputation: 1 }, outcome: '관중이 발을 구르며 환호했다.' } })],
    ['춤을 배운다', 'easygoing', { joy: 4 }, '마을 어르신들과 원을 그리며 춤을 췄다.', { affection: 1 }],
    ['음식 준비를 돕는다', 'caring', { bond: 2 }, '말라사다 반죽을 산더미처럼 빚었다.'],
  ], at('iki', again(6))],
  ['town-iki-kahuna-trial', 14, 40, '섬킹의 대시련', '이키마을 섬킹이 섬 순례를 마친 젊은이들에게 대시련을 열어 준다.', [
    ['대시련에 도전한다', 'bold', { courage: 5 }, '섬킹의 포켓몬이 무대 위로 뛰어올랐다.', duel('gym', '', { from: null, win: { flag: 'town-iki-trial', effects: { joy: 3 } }, lose: { effects: { wisdom: 2 } } })],
    ['섬킹에게 순례 이야기를 듣는다', 'curious', { wisdom: 4 }, '섬마다 다른 수호신과 시련의 의미를 들었다.'],
    ['아직 준비가 덜 됐다', 'easygoing', { joy: 1 }, '섬킹이 크게 웃으며 기다리겠다고 했다.'],
  ], at('iki')],
  ['town-iki-z-ring', 15, 50, 'Z링의 무게', '대시련을 통과한 당신에게 이키마을 섬킹이 수호신의 돌로 만든 팔찌를 내밀었다.', [
    ['팔찌를 받는다', 'bold', { courage: 3, bond: 3 }, '팔찌를 차고 파트너와 함께 포즈를 맞췄다.', { equipment: 'z' }],
    ['마을 아이들 순례를 돕겠다고 한다', 'caring', { reputation: 2 }, '섬킹이 팔찌는 그 마음과 함께 가져가라고 했다.', { equipment: 'z', training: 10 }],
  ], after('iki', 'town-iki-trial')],

  // 하우올리시티
  ['town-hauoli-shopping', 12, 70, '하우올리 쇼핑가', '하우올리시티 쇼핑가에 새 옷가게와 말라사다 가게가 문을 열었다.', [
    ['알로라풍 셔츠를 산다', 'easygoing', { joy: 3, money: -120 }, '파트너가 셔츠 무늬를 신기하게 쳐다봤다.'],
    ['말라사다를 사 먹는다', 'easygoing', { joy: 2, money: -40 }, '설탕 묻은 손가락을 파트너가 핥았다.', { affection: 1 }],
    ['가게 홍보를 돕는다', 'pragmatic', { money: 150 }, '전단을 돌리며 거리를 누볐다.'],
  ], at('hauoli', again(6))],
  ['town-hauoli-beach', 8, 80, '하우올리 해변', '하우올리시티 해변에 파도가 잔잔하다. 모래사장 곳곳에 포켓몬 발자국이 있다.', [
    ['발자국을 따라간다', 'bold', { courage: 2, joy: 2 }, '', wild('바위 뒤에서 {pk:이} 고개를 내밀었다.')],
    ['모래성을 쌓는다', 'easygoing', { joy: 4 }, '파도가 성벽을 넘을 때까지 파트너와 쌓았다.', { affection: 2 }],
    ['해변을 청소한다', 'caring', { reputation: 1 }, '', spot('깨끗해진 모래사장에 {pk:이} 돌아왔다.', { world: { ecology: 2 } })],
  ], at('hauoli')],
  ['town-hauoli-skull', 12, 30, '스컬단의 행패', '하우올리시티 거리에서 스컬단 단원들이 관광객의 포켓몬을 빼앗으려 한다.', [
    ['막아선다', 'bold', { courage: 4 }, '해골 모자를 쓴 단원이 랩을 하며 덤벼들었다.', duel('villain', '', { from: null, win: { world: { safety: 2 },
      follow: [echoLater([2, 5], '사과 편지', '그날 하우올리시티에서 맞섰던 스컬단 단원이 조직을 나와 일을 시작했다며 서툰 글씨로 사과 편지를 보냈다.', { joy: 3, wisdom: 2 })] } })],
    ['단원과 이야기해 본다', 'caring', { wisdom: 2, bond: 1 }, '갈 곳이 없어 스컬단에 들어갔다는 이야기를 들었다.', {
      follow: [echoLater([2, 5], '사과 편지', '하우올리시티에서 이야기를 나눴던 스컬단 단원이 조직을 나와 새 일을 시작했다고 편지를 보냈다.', { joy: 3 })] }],
    ['경찰을 부른다', 'pragmatic', { reputation: 1 }, '경찰관이 오자 단원들이 흩어졌다.', { world: { safety: 1 } }],
  ], at('hauoli')],

  // 환대시티
  ['town-heahea-hotel', 18, 75, '환대시티 호텔', '환대시티 호텔이 관광철을 맞아 프런트 일손을 구한다. 로비에는 다른 지방 손님이 가득하다.', [
    ['프런트에서 일한다', 'pragmatic', { money: 300, vitality: -2 }, '세 지방 말로 길을 안내하게 되었다.'],
    ['하룻밤 묵는다', 'easygoing', { joy: 4, vitality: 3, money: -200 }, '바다가 보이는 방에서 푹 잤다.'],
    ['로비에서 여행자와 이야기한다', 'curious', { wisdom: 2 }, '먼 지방 이야기를 잔뜩 들었다.'],
  ], at('heahea', again(7))],
  ['town-heahea-ferry', 12, 70, '연락선 기다리기', '환대시티 항구에서 다른 섬으로 가는 연락선이 늦어진다.', [
    ['부두 끝을 탐색한다', 'bold', { courage: 2 }, '', wild('방파제 바위틈에서 {pk:이} 튀어나왔다.')],
    ['대합실에서 관찰 일지를 쓴다', 'curious', { wisdom: 3 }, '', spot('창밖 물가를 오가는 {pk:을} 기록했다.')],
    ['그냥 기다린다', 'easygoing', { vitality: 2 }, '꾸벅꾸벅 졸다 보니 배가 들어왔다.'],
  ], at('heahea')],
  ['town-heahea-lab', 25, 70, '차원 연구소의 의뢰', '환대시티 차원 연구소가 하늘에 생긴 이상한 균열을 관측할 자원자를 찾는다.', [
    ['관측에 참여한다', 'curious', { wisdom: 4 }, '밤하늘의 일그러짐을 기록했다.', {
      follow: [choiceLater([2, 4], '다시 열린 균열', '환대시티 연구소에서 연락이 왔다. 그때 관측한 균열이 다시 열렸고, 현장 조사에 동행해 달라고 한다.', [
        ['현장에 간다', 'bold', { courage: 5, wisdom: 2 }, '균열 너머에서 낯선 빛이 쏟아졌다.', check('courage', 15, '빛에 눈이 부셔 물러섰다.', { vitality: -2 })],
        ['자료만 보낸다', 'pragmatic', { wisdom: 3 }, '정리한 관측 기록을 넘겼다.'],
      ])] }],
    ['장비 운반을 돕는다', 'pragmatic', { money: 200 }, '무거운 망원경을 옥상까지 날랐다.'],
    ['수상해서 거절한다', 'easygoing', { joy: 1 }, '하늘은 그냥 하늘로 두기로 했다.'],
  ], at('heahea')],

  // 말리에시티
  ['town-malie-old-book', 10, 65, '도서관의 낡은 책', '말리에시티 도서관 서가 맨 위 칸에서 이름 없는 낡은 책이 떨어졌다. 정원 지도가 끼워져 있다.', [
    ['책을 끝까지 읽는다', 'curious', { wisdom: 4 }, '정원 어딘가의 돌에 옛 노래가 새겨져 있다는 구절을 찾았다.', { flag: 'town-malie-book' }],
    ['사서에게 가져간다', 'caring', { reputation: 1, wisdom: 1 }, '사서가 고맙다며 지도 사본을 주었다.', { flag: 'town-malie-book' }],
    ['제자리에 꽂는다', 'easygoing', { joy: 1 }, '책은 다시 먼지 속으로 돌아갔다.'],
  ], at('malie')],
  ['town-malie-garden', 8, 90, '말리에 정원', '말리에시티 정원은 연못과 다리, 찻집이 있는 고요한 곳이다.', [
    ['연못가를 걷는다', 'easygoing', { joy: 3, vitality: 2 }, '', spot('연못의 다리 아래 {pk:이} 쉬고 있었다.')],
    ['찻집에서 차를 마신다', 'easygoing', { joy: 2, money: -50 }, '파트너가 찻잔 옆에서 꾸벅꾸벅 졸았다.', { affection: 1 }],
    ['정원 손질을 돕는다', 'caring', { reputation: 1 }, '정원사가 작은 묘목을 선물했다.', { world: { ecology: 1 } }],
  ], at('malie', again(6))],
  ['town-malie-garden-stone', 12, 75, '정원의 노래하는 돌', '낡은 책의 지도를 따라 말리에 정원 구석에 가 보니 이끼 낀 돌이 있다.', [
    ['이끼를 걷어 글자를 읽는다', 'curious', { wisdom: 4 }, '돌에는 섬의 수호신을 부르는 노래가 새겨져 있었다.', {
      follow: [echoLater([2, 4], '정원에서 들린 노래', '말리에 정원 돌의 노래를 도서관이 복원해 축제에서 불렀다. 노래가 끝나자 하늘에서 천둥 같은 울음이 대답했다고 한다.', { wisdom: 3, joy: 3 })] }],
    ['사진만 찍어 둔다', 'pragmatic', { wisdom: 2 }, '도서관에 사진을 기증했다.'],
    ['그대로 둔다', 'easygoing', { joy: 1 }, '이끼는 이끼대로 아름다웠다.'],
  ], after('malie', 'town-malie-book')],
];

// ── 가라르 ───────────────────────────────────────────────────────────────────────────────────────
const galar = [
  // 펄롱마을
  ['town-postwick-sheep', 6, 15, '목장의 털뭉치들', '펄롱마을 목장의 포켓몬들이 울타리 틈으로 빠져나왔다. 목장 주인이 아이들에게 도와 달라고 한다.', [
    ['한 마리씩 몰아 온다', 'caring', { bond: 3, vitality: -1 }, '', lure('마지막까지 버티던 {pk:이} 당신만 졸졸 따라왔다. 목장 주인이 데려가도 좋다고 했다.', 'bond', 10, '{pk:은} 울타리 안으로 돌아가 버렸다.', {}, {}, 831)],
    ['울타리 틈을 막는다', 'pragmatic', { wisdom: 2 }, '다시는 빠져나가지 못하게 판자를 댔다.'],
    ['털뭉치들과 뒹군다', 'easygoing', { joy: 4 }, '', spot('푹신한 {pk}에 파묻혀 한참 웃었다.', {}, 831)],
  ], at('postwick')],
  ['town-postwick-slumbering', 12, 30, '안개 낀 숲', '펄롱마을 옆 숲은 늘 안개가 끼어 아이들 출입이 금지되어 있다. 오늘 숲 안에서 늑대 같은 울음이 들렸다.', [
    ['안개 속으로 몰래 들어간다', 'bold', { courage: 5 }, '안개 너머에서 푸른 눈빛 두 개가 당신을 바라보았다.', {
      ...check('courage', 15, '안개에 길을 잃고 해 질 무렵에야 빠져나왔다.', { vitality: -3 }),
      follow: [echoLater([3, 6], '안개 숲의 그림자', '가라르 곳곳에서 검과 방패를 든 포켓몬의 전설이 다시 회자된다. 그날 숲에서 본 눈빛이 그것이었을지도 모른다.', { courage: 3, wisdom: 2 })] }],
    ['숲 입구에서 귀를 기울인다', 'curious', { wisdom: 3 }, '울음이 두 갈래로 나뉘어 메아리쳤다.'],
    ['어른에게 알린다', 'pragmatic', { reputation: 1 }, '어른들이 숲 입구 울타리를 다시 점검했다.'],
  ], at('postwick')],
  ['town-postwick-farm', 25, 90, '농장 일손', '펄롱마을 농장에 수확철이 왔다. 손이 모자란다.', [
    ['수확을 돕는다', 'caring', { money: 200, vitality: -2 }, '포켓몬들과 감자를 캐며 하루를 보냈다.', { training: 10 }],
    ['농장 장터에 판다', 'pragmatic', { money: 300 }, '이웃 마을 장터까지 짐수레를 끌고 갔다.'],
    ['농장 마당에서 쉰다', 'easygoing', { joy: 3, vitality: 2 }, '들판 너머로 해가 넘어갔다.'],
  ], at('postwick', again(7))],

  // 엔진시티
  ['town-motostoke-opening', 14, 30, '엔진스타디움 개막식', '엔진시티 엔진스타디움에서 짐 챌린지 개막식이 열린다. 추천장을 받은 도전자들이 유니폼을 입고 입장한다.', [
    ['도전자로 입장한다', 'bold', { courage: 4, joy: 3 }, '수만 관중의 함성이 쏟아졌다.', { flag: 'town-motostoke-challenger' }],
    ['자원봉사자로 일한다', 'caring', { reputation: 1, money: 100 }, '도전자들의 유니폼을 나눠 주었다.'],
    ['관중석에서 본다', 'easygoing', { joy: 3 }, '깃발을 흔들며 목이 쉬도록 응원했다.'],
  ], at('motostoke')],
  ['town-motostoke-gym-mission', 15, 40, '불꽃 체육관 미션', '개막식에 도전자로 섰던 당신에게 엔진시티 체육관의 미션 안내장이 왔다.', [
    ['미션을 통과하고 관장에게 도전한다', 'bold', { courage: 4 }, '스타디움 한가운데 섰다.', duel('gym', '', { from: null, win: { effects: { joy: 3 } } })],
    ['미션 연습만 한다', 'pragmatic', { wisdom: 2 }, '다음 기회를 위해 파티를 다듬었다.', { training: 20 }],
    ['도전을 미룬다', 'easygoing', { joy: 1 }, '유니폼은 옷장에 걸어 두었다.'],
  ], after('motostoke', 'town-motostoke-challenger')],
  ['town-motostoke-workshop', 18, 70, '증기 공방', '엔진시티의 증기 공방에서 톱니바퀴와 증기관을 수리할 사람을 찾는다.', [
    ['공방에서 일한다', 'pragmatic', { money: 250, vitality: -2 }, '증기가 새는 배관을 막았다.', {
      follow: [echoLater([2, 4], '공방의 시계탑', '엔진시티 공방이 그때 함께 고친 부품으로 광장 시계탑을 복원했다. 준공식 초대장이 왔다.', { joy: 3, reputation: 2 })] }],
    ['공방 포켓몬을 관찰한다', 'curious', { wisdom: 3 }, '', spot('보일러 옆에서 {pk:이} 몸을 데우고 있었다.')],
    ['증기를 피해 간다', 'easygoing', { joy: 1 }, '광장 벤치에서 쉬었다.'],
  ], at('motostoke', again(6))],

  // 너클시티
  ['town-hammerlocke-vault', 14, 65, '성곽의 보물고', '너클시티 성곽 안 보물고가 특별 공개된다. 옛 영웅의 태피스트리가 걸려 있다.', [
    ['태피스트리를 자세히 본다', 'curious', { wisdom: 4 }, '그림 속 영웅 곁의 두 포켓몬이 눈에 밟혔다.', {
      follow: [echoLater([2, 5], '태피스트리의 비밀', '너클시티 보물고 태피스트리 연구 결과가 발표되었다. 당신이 박물관에 남긴 관찰 메모가 감사의 말에 실렸다.', { wisdom: 3, reputation: 1 })] }],
    ['보물고 안내를 맡는다', 'caring', { reputation: 1, money: 150 }, '관광객에게 영웅 전설을 들려주었다.'],
    ['성벽을 따라 걷는다', 'easygoing', { joy: 3 }, '성벽 위에서 도시가 내려다보였다.'],
  ], at('hammerlocke')],
  ['town-hammerlocke-dragon', 14, 45, '드래곤 체육관 뒤뜰', '너클시티 드래곤 체육관 뒤뜰에 어린 포켓몬들이 모여 산다고 한다.', [
    ['뒤뜰에 들어가 본다', 'bold', { courage: 4 }, '', wild('돌담 위에서 {pk:이} 내려다보았다.')],
    ['체육관 트레이너에게 배운다', 'curious', { wisdom: 3 }, '드래곤 타입 기르는 법을 들었다.', { training: 10 }],
    ['멀리서 본다', 'easygoing', { joy: 2 }, '', spot('담장 너머로 {pk:이} 하품하는 것을 보았다.')],
  ], at('hammerlocke')],
  ['town-hammerlocke-raid', 16, 60, '에너지 플랜트 근처 레이드', '너클시티 에너지 플랜트 근처 들판에서 빛기둥이 솟았다. 다이맥스한 포켓몬이 둥지에 있다.', [
    ['레이드에 참가한다', 'bold', { courage: 4 }, '함께 모인 트레이너들과 빛기둥 안으로 들어갔다.', duel('raid', '', { from: null })],
    ['빛기둥을 관측한다', 'curious', { wisdom: 3 }, '빛기둥의 색과 시간을 기록했다.'],
    ['피한다', 'easygoing', { vitality: 1 }, '빛기둥이 사라질 때까지 기다렸다.'],
  ], at('hammerlocke', again(7))],

  // 브래시마을
  ['town-wedgehurst-lab', 10, 25, '연구소의 자료 정리', '브래시마을 연구소가 다이맥스 현상 자료를 정리할 사람을 찾는다.', [
    ['자료를 정리한다', 'curious', { wisdom: 4 }, '오래된 관측 기록 속에 하늘에서 떨어진 별 이야기가 있었다.', { flag: 'town-wedgehurst-lab' }],
    ['연구소 마당을 청소한다', 'caring', { bond: 1, money: 100 }, '박사가 차를 내주며 연구 이야기를 들려주었다.', { flag: 'town-wedgehurst-lab' }],
    ['안 한다', 'easygoing', { joy: 1 }, '연구소 앞 의자에서 졸았다.'],
  ], at('wedgehurst')],
  ['town-wedgehurst-wishing-star', 12, 45, '소원의 별', '연구소 자료에 나온 대로 브래시마을 근처 들판에 별 조각이 떨어졌다. 박사가 이를 다이맥스밴드로 가공해 주겠다고 한다.', [
    ['밴드를 받는다', 'bold', { courage: 3, joy: 3 }, '손목의 밴드가 붉게 빛났다.', { equipment: 'dynamax' }],
    ['별 조각을 연구소에 기증한다', 'caring', { reputation: 2, wisdom: 2 }, '박사가 연구가 끝나면 꼭 돌려주겠다고 했다.'],
  ], after('wedgehurst', 'town-wedgehurst-lab')],
  ['town-wedgehurst-station', 8, 80, '브래시역 앞', '브래시마을 역 앞 광장에 기차가 서고, 근처 풀숲에는 포켓몬이 드나든다.', [
    ['풀숲을 들여다본다', 'curious', { wisdom: 2 }, '', spot('철로 옆 풀숲에서 {pk:이} 기차 소리에 귀를 쫑긋 세웠다.')],
    ['기차를 타고 이웃 도시에 간다', 'bold', { joy: 3, money: -60 }, '창밖 들판을 지나 하루 나들이를 했다.'],
    ['역 앞 노점을 돕는다', 'pragmatic', { money: 120 }, '따뜻한 차를 팔았다.'],
  ], at('wedgehurst', again(6))],
];

// ── 팔데아 ───────────────────────────────────────────────────────────────────────────────────────
const paldea = [
  // 코사지마을
  ['town-cabo-poco-lighthouse', 8, 16, '등대 아래 해변', '코사지마을 등대 아래 해변에 썰물이 지자 모래 위로 작은 발자국이 이어졌다.', [
    ['발자국을 따라간다', 'bold', { courage: 3 }, '', wild('발자국 끝 바위 뒤에서 {pk:이} 튀어나왔다.')],
    ['등대지기에게 묻는다', 'curious', { wisdom: 2 }, '', spot('등대지기가 망원경으로 {pk:을} 보여 주었다.')],
    ['모래사장에서 논다', 'easygoing', { joy: 3 }, '파도와 술래잡기를 했다.'],
  ], at('cabo-poco')],
  ['town-cabo-poco-cliff', 12, 30, '절벽 아래 동굴', '코사지마을 해변 절벽 아래 동굴에서 크게 다친 포켓몬을 보았다는 이야기를 들었다.', [
    ['동굴로 내려간다', 'bold', { courage: 4 }, '', spot('동굴 안에서 지친 {pk:이} 몸을 웅크리고 있었다. 샌드위치를 내밀자 조심스럽게 받아먹었다.', {
      follow: [echoLater([2, 5], '절벽의 손님', '절벽 동굴에서 만났던 큰 포켓몬이 회복해 팔데아 하늘을 나는 모습이 목격되었다. 코사지마을 아이들이 그 이야기를 그림으로 그렸다.', { joy: 4, bond: 2 })] }, [1007, 1008])],
    ['어른에게 알린다', 'pragmatic', { reputation: 1 }, '구조대가 절벽에 밧줄을 내렸다.'],
    ['무서워 돌아선다', 'easygoing', { joy: -1 }, '밤새 동굴 생각이 났다.'],
  ], at('cabo-poco')],
  ['town-cabo-poco-sunset', 30, 90, '코사지마을 노을', '코사지마을 언덕 위 집에서 보는 노을은 팔데아에서 손꼽히게 아름답다.', [
    ['파트너와 저녁놀을 본다', 'easygoing', { joy: 4, bond: 2 }, '바다가 붉게 물들었다.', { affection: 1 }],
    ['노을 사진 엽서를 판다', 'pragmatic', { money: 150 }, '관광객에게 엽서가 잘 팔렸다.'],
    ['이웃을 초대한다', 'caring', { joy: 3 }, '{friend|과|와} 함께 언덕에 앉았다.', { cast: { friend: { affinity: 3 } } }],
  ], at('cabo-poco', again(7))],

  // 테이블시티
  ['town-mesagoza-academy', 10, 18, '아카데미 입학', '테이블시티 언덕 꼭대기 아카데미가 새 학생을 받는다. 긴 계단 끝에 커다란 교문이 보인다.', [
    ['입학한다', 'curious', { wisdom: 4, joy: 2 }, '교복을 입고 계단을 올랐다. 입학 선물로 빛나는 구슬을 받았다.', { flag: 'town-mesagoza-student', equipment: 'tera' }],
    ['청강만 한다', 'pragmatic', { wisdom: 2 }, '수업 몇 개를 몰래 들었다.'],
    ['계단이 너무 길다', 'easygoing', { joy: 1 }, '광장에서 아카데미를 올려다봤다.'],
  ], at('mesagoza')],
  ['town-mesagoza-treasure', 11, 25, '보물찾기 과제', '아카데미에서 자기만의 보물을 찾아오라는 자율 학습 과제가 나왔다.', [
    ['팔데아 곳곳을 돌아다닌다', 'bold', { courage: 4, vitality: -2 }, '들판과 동굴을 누비며 기록장을 채웠다.', { training: 20,
      follow: [echoLater([2, 4], '보물의 의미', '아카데미 졸업 발표에서 보물찾기 과제를 다시 꺼냈다. 결국 보물은 길에서 만난 친구들이었다고 말하자 강당이 조용해졌다.', { joy: 4, bond: 3 })] }],
    ['도서관에서 보물을 찾는다', 'curious', { wisdom: 4 }, '옛 탐험가의 일지를 보물로 골랐다.'],
    ['친구와 함께 찾는다', 'caring', { bond: 3 }, '{friend|과|와} 서로의 보물을 바꿔 들었다.', { cast: { friend: { affinity: 4 } } }],
  ], after('mesagoza', 'town-mesagoza-student')],
  ['town-mesagoza-plaza', 14, 80, '광장 계단 배틀', '테이블시티 광장 계단에서 학생들이 즉석 배틀을 벌인다.', [
    ['도전을 받는다', 'bold', { courage: 3 }, '', duel('wild', '학생이 내보낸 {pk:과} 맞붙었다.', { level: 20, win: { effects: { joy: 2 } } })],
    ['해설을 해 준다', 'curious', { wisdom: 2 }, '구경꾼들이 해설에 고개를 끄덕였다.'],
    ['계단에 앉아 본다', 'easygoing', { joy: 2 }, '노점 샌드위치를 먹으며 구경했다.'],
  ], at('mesagoza', again(6))],

  // 누룩스시티
  ['town-levincia-stream', 12, 40, '스트리머 관장의 방송', '누룩스시티 체육관 관장은 유명한 동영상 스트리머다. 오늘 방송에서 시청자 숨은 포켓몬 찾기 미션이 열렸다.', [
    ['미션에 참가한다', 'bold', { joy: 3, courage: 2 }, '마지막 숨은 포켓몬을 찾아 방송에 얼굴이 나왔다.', { flag: 'town-levincia-viewer',
      ...check('wisdom', 5, '다른 참가자가 한발 빨랐다.', { joy: 1 }) }],
    ['채팅으로 응원한다', 'easygoing', { joy: 2 }, '관장이 당신의 닉네임을 읽어 주었다.'],
    ['방송 촬영을 돕는다', 'pragmatic', { money: 150 }, '조명 기사 일을 했다.', { flag: 'town-levincia-viewer' }],
  ], at('levincia')],
  ['town-levincia-collab', 16, 50, '합동 방송 제안', '누룩스시티 스트리머 관장이 당신과 파트너를 기억하고 합동 방송을 제안했다.', [
    ['합동 방송을 한다', 'bold', { reputation: 3, joy: 3 }, '파트너의 재롱에 조회수가 치솟았다.', { affection: 2,
      follow: [choiceLater([2, 4], '구독자의 요청', '합동 방송 이후 누룩스시티에서 당신만의 채널을 열어 달라는 요청이 쏟아졌다.', [
        ['채널을 연다', 'bold', { money: 400, reputation: 2, vitality: -2 }, '매주 파트너와 일상을 올렸다.'],
        ['조용한 삶을 택한다', 'easygoing', { joy: 3 }, '한 번의 방송으로 충분했다.'],
      ])] }],
    ['배틀 해설만 맡는다', 'curious', { wisdom: 3 }, '해설이 짧은 영상으로 퍼졌다.'],
    ['사양한다', 'easygoing', { joy: 1 }, '관장이 아쉽다며 이모티콘을 보냈다.'],
  ], after('levincia', 'town-levincia-viewer')],
  ['town-levincia-beach', 8, 80, '누룩스 해변', '누룩스시티 네온 거리 끝에 조용한 해변이 있다.', [
    ['밤바다 낚시를 한다', 'bold', { joy: 3 }, '', lure('불빛에 이끌린 {pk:이} 줄에 걸렸다.', 'joy', 5, '{pk:이} 미끼만 물고 사라졌다.')],
    ['해변 영상을 찍는다', 'curious', { wisdom: 2 }, '', spot('파도 속에서 {pk:이} 장난치는 장면을 찍었다.')],
    ['네온을 보며 걷는다', 'easygoing', { joy: 3 }, '파도에 비친 불빛이 일렁였다.'],
  ], at('levincia', again(6))],

  // 프리지마을
  ['town-montenevera-gym', 14, 45, '설산 체육관', '프리지마을 체육관은 눈 덮인 산 위에 있다. 관장은 고스트 포켓몬과 음악을 하는 사람이다.', [
    ['도전한다', 'bold', { courage: 4 }, '무대 조명이 켜지고 관장이 마이크를 잡았다.', duel('gym', '', { from: null })],
    ['공연만 본다', 'easygoing', { joy: 3 }, '눈 내리는 무대에서 노래가 울렸다.'],
    ['추위 대비 훈련을 한다', 'pragmatic', { vitality: 3 }, '눈길에서 파티와 달렸다.', { training: 15 }],
  ], at('montenevera')],
  ['town-montenevera-spirits', 20, 90, '영혼의 밤', '프리지마을에서는 겨울 밤마다 세상을 떠난 포켓몬의 영혼을 기리는 촛불을 켠다.', [
    ['촛불을 켠다', 'caring', { bond: 4 }, '', spot('촛불 사이로 {pk:이} 조용히 떠다녔다.')],
    ['마을 묘지를 돌본다', 'caring', { reputation: 1, vitality: -1 }, '눈을 치우고 꽃을 놓았다.'],
    ['멀리서 불빛을 본다', 'easygoing', { joy: 1, wisdom: 1 }, '설산 위 작은 불빛들이 별처럼 보였다.'],
  ], at('montenevera', again(7))],
  ['town-montenevera-snowman', 6, 15, '설산의 눈사람', '프리지마을 아이들이 마을 어귀에 커다란 눈사람을 만든다.', [
    ['제일 큰 눈사람을 만든다', 'bold', { joy: 4, vitality: -1 }, '눈사람이 지붕 높이까지 자랐다.', {
      follow: [echoLater([1, 2], '움직인 눈사람', '다음 해 겨울, 같은 자리에 만든 눈사람이 밤사이 조금 옮겨져 있었다. 마을 사람들은 산의 포켓몬이 장난친 것이라고 웃었다.', { joy: 3 })] }],
    ['눈사람에게 목도리를 둘러 준다', 'caring', { bond: 2 }, '{sibling}의 낡은 목도리를 둘렀다.'],
    ['눈싸움을 한다', 'easygoing', { joy: 3 }, '', spot('눈덩이가 날아다니는 사이 {pk:이} 구경하러 왔다.')],
  ], at('montenevera')],
];

export const TOWN_STORIES = table('local', [...kanto, ...johto, ...hoenn, ...sinnoh, ...unova, ...kalos, ...alola, ...galar, ...paldea]);
