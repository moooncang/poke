// Life with the party's types and species: everyday scenes that open when a pokemon of a given type (or a given
// species family) is with the player. Rows follow event-kit's table format, except that the body, labels, outcomes
// and extras may be functions of (member, state) — `member` is the party (or box) pokemon the scene is about.
import { option, fill, check, echoLater, choiceLater, localSpecies } from './event-kit.js';
import { typesOf } from '../sim/battle.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';

const P = (m, withFinal, withoutFinal) => poke(m.id, withFinal, withoutFinal);
const N = m => poke(m.id);
const at = (value, m, s) => typeof value === 'function' ? value(m, s) : value;
const repeat = cooldown => ({ once: false, cooldown });
/** A stat check that also uses one talent field. */
const tcheck = (talent, ...args) => { const c = check(...args); c.challenge.talent = talent; return c; };

const ofType = type => s => s.party.find(m => typesOf(m.id).includes(type));
const ofSpecies = (ids, box = false) => s => s.party.find(m => ids.includes(m.id)) || (box ? s.box.find(m => ids.includes(m.id)) : undefined);

/** Rows → storylets of category 'pokemon', gated on `find(s)` returning a member. */
function companions(find, rows) {
  return rows.map(([id, min, max, title, body, options, meta = {}]) => {
    const { when, ...rest } = meta;
    return {
      id, category: 'pokemon', min, max, ...rest,
      when: s => { const m = find(s); return Boolean(m) && (!when || when(s, m)); },
      build: s => {
        const m = find(s);
        return { kind: 'choice', title: fill(s, title), body: fill(s, at(body, m, s)),
          choices: options.map(([label, tone, effects, outcome, extra = {}]) =>
            option(s, [at(label, m, s), tone, effects, at(outcome, m, s), structuredClone(at(extra, m, s))])) };
      },
    };
  });
}

const BUGS = [10, 13, 48, 123, 127, 165, 167, 193, 204, 214, 283, 290, 401, 415];

// ── 불꽃 ──
const fire = companions(ofType('불꽃'), [
  ['type-fire-winter', 8, 85, '겨울 난롯가', m => `한파가 몰아친 밤에 보일러가 멈췄다. ${P(m, '이', '가')} 거실 한가운데 엎드려 따뜻한 숨을 내쉬고 있다.`, [
    ['꼭 붙어서 잔다', 'caring', { bond: 4, vitality: 2 }, m => `${N(m)}의 체온 덕분에 식구 모두 감기 없이 그 밤을 넘겼다.`, { affection: 3 }],
    ['옆집 아궁이도 데운다', 'bold', { reputation: 2, vitality: -1 }, m => `${P(m, '과', '와')} 함께 혼자 사는 옆집 노인의 아궁이에 불을 지펴 드렸다.`,
      { follow: [echoLater([1, 3], '아궁이의 답례', '지난겨울 불을 지펴 드렸던 옆집 노인이 직접 졸인 나무열매 잼을 한 상자 보내왔다.', { joy: 3, money: 100 }, 0.7)] }],
    ['보일러 기사를 부른다', 'pragmatic', { money: -150, wisdom: 1 }, '기사님이 배관을 고치는 동안 난로 앞에서 수리 요령을 어깨너머로 배웠다.'],
  ], repeat(7)],
  ['type-fire-cooking', 10, 80, '숯불 요리 대회', '마을 축제의 야외 요리 대회에서 숯불이 모자라 참가자들이 발을 구르고 있다.', [
    [m => `${P(m, '과', '와')} 불 조절에 도전한다`, 'bold', { joy: 3, reputation: 2, money: 150 }, '센 불과 약한 불을 번갈아 다뤄 고기를 겉은 바삭하게, 속은 촉촉하게 구워 냈다.',
      m => tcheck('craft', 'wisdom', 5, `${P(m, '이', '가')} 신이 나서 불을 너무 세게 뿜는 바람에 고기가 숯처럼 타 버렸다.`, { joy: -2 })],
    ['다른 참가자에게 불씨를 나눠 준다', 'caring', { bond: 2, reputation: 1 }, '불씨를 받은 참가자들이 완성한 요리를 한 접시씩 건네주었다.', { world: { economy: 1 } }],
    ['시식 코너를 돈다', 'easygoing', { joy: 3 }, '배가 터질 만큼 먹고 돌아왔다.'],
  ]],
  ['type-fire-alarm', 12, 80, '연기와 신고', m => `마당에서 ${P(m, '이', '가')} 불꽃을 뿜으며 놀다가 연기가 피어올랐다. 지나가던 사람이 화재 신고를 해서 소방차가 왔다.`, [
    ['소방대 앞에서 불을 다루는 시범을 보인다', 'bold', { courage: 3, reputation: 2 }, '불꽃을 정확히 뿜고 거두는 모습을 본 대원들이 고개를 끄덕였다.',
      { ...check('courage', 0, '긴장한 탓에 불씨가 잔디로 번졌다. 벌금 고지서를 받았다.', { money: -100, joy: -2 }), world: { safety: 1 } }],
    ['정중히 사과하고 불을 끈다', 'caring', { reputation: 1, joy: -1 }, '대원들은 소화기를 두는 위치까지 알려 주고 돌아갔다.',
      m => ({ follow: [choiceLater([2, 5], '소방대의 부탁', `그날 출동했던 소방대가 ${P(m, '과', '와')} 함께 어린이 불조심 교실을 맡아 달라고 연락해 왔다.`, [
        ['강사를 맡는다', 'caring', { reputation: 2, joy: 2 }, '아이들이 불꽃을 무서워하지 않고 조심하는 법을 배웠다.', { world: { safety: 1 } }],
        ['정중히 사양한다', 'easygoing', { joy: 1 }, '대신 소방서에 감사 편지를 보냈다.'],
      ], 0.6)] })],
    ['억울하다고 따진다', 'pragmatic', { courage: 1, reputation: -1 }, '말다툼 끝에 대원들은 서류만 남기고 떠났다.'],
  ]],
]);

// ── 물 ──
const water = companions(ofType('물'), [
  ['type-water-rain', 8, 85, '비 오는 날', m => `장맛비가 사흘째 내린다. ${P(m, '은', '는')} 마당 웅덩이를 오가며 혼자 신이 났다.`, [
    ['우비를 입고 같이 뛰어논다', 'easygoing', { joy: 4, vitality: -1 }, '흠뻑 젖었지만 오랜만에 소리 내어 웃었다.', { affection: 3 }],
    ['빗물 저장통을 단다', 'pragmatic', { money: -80, wisdom: 2 }, '모은 빗물로 여름 내내 화단에 물을 줬다.', { world: { ecology: 1 } }],
    ['창가에서 빗소리를 듣는다', 'curious', { wisdom: 2, bond: 2 }, m => `${P(m, '이', '가')} 빗방울 소리에 맞춰 꼬리를 톡톡 두드렸다.`],
  ], repeat(6)],
  ['type-water-swim', 10, 60, '호수 횡단 대회', '포켓몬과 함께 호수를 건너는 수영 대회가 열린다.', [
    ['함께 헤엄쳐 출전한다', 'bold', { courage: 3, reputation: 2, money: 200 }, m => `${P(m, '이', '가')} 앞에서 물살을 갈라 주어 상위권으로 결승선을 밟았다.`,
      { ...check('vitality', 8, '중간에 다리에 쥐가 나 구조 보트에 올랐다.', { vitality: -2, joy: -1 }), training: 25 }],
    ['포켓몬부에만 내보낸다', 'pragmatic', { bond: 3 }, m => `${P(m, '은', '는')} 포켓몬부에서 끝까지 완주해 기념 메달을 받았다.`, { training: 30 }],
    ['안전요원으로 자원한다', 'caring', { reputation: 1, bond: 1 }, '물에 빠진 참가자 두 명을 보트로 끌어올렸다.', { world: { safety: 1 } }],
  ]],
  ['type-water-drought', 14, 80, '가뭄 든 밭', '석 달째 비가 오지 않아 마을 밭이 갈라지고 있다. 농부들이 하늘만 쳐다본다.', [
    [m => `${P(m, '과', '와')} 밭에 물을 뿌린다`, 'caring', { reputation: 3, vitality: -2 }, '며칠 동안 해 질 녘마다 밭고랑을 따라 물을 뿌렸다.',
      { world: { ecology: 2 }, follow: [echoLater([1, 2], '풍년 소식', '가뭄 때 물을 뿌려 준 밭에서 올해 첫 수확물을 보내왔다. 상자 위에 서툰 글씨로 고맙다고 적혀 있었다.', { joy: 3, money: 120 }, 0.8)] }],
    ['급수 일을 맡아 일당을 받는다', 'pragmatic', { money: 250, vitality: -2 }, '농협에서 하루 단위로 급수 일을 맡겼다.', { training: 15 }],
    ['물 아껴 쓰기 안내문을 만든다', 'curious', { wisdom: 2 }, '마을 게시판에 붙인 안내문을 보고 이웃들이 세차를 미뤘다.', { world: { ecology: 1 } }],
  ]],
]);

// ── 풀 ──
const grass = companions(ofType('풀'), [
  ['type-grass-garden', 8, 85, '텃밭 가꾸기', m => `${P(m, '이', '가')} 볕 좋은 마당 구석에 자리를 잡더니 하루 종일 떠나지 않는다.`, [
    ['그 자리에 텃밭을 만든다', 'caring', { joy: 2, money: -60 }, '씨앗과 모종을 사다 심고 이름표를 꽂았다.',
      m => ({ follow: [echoLater([1, 2], '첫 수확', `${P(m, '과', '와')} 가꾼 텃밭에서 토마토와 상추를 한 바구니 거뒀다. 식탁이 한결 푸짐해졌다.`, { joy: 3, vitality: 2 })] })],
    ['나무열매 묘목을 심는다', 'curious', { wisdom: 3 }, '어떤 나무열매가 이 땅에 잘 맞는지 기록을 시작했다.', { world: { ecology: 1 } }],
    ['나란히 낮잠을 잔다', 'easygoing', { joy: 3, vitality: 1 }, '햇볕 아래에서 둘 다 코를 골았다.', { affection: 2 }],
  ], repeat(8)],
  ['type-grass-pollen', 10, 85, '꽃가루 철', m => `봄이 되자 ${N(m)}의 몸에서 꽃가루가 날려 이웃집 아이가 재채기를 멈추지 못한다.`, [
    ['매일 꼼꼼히 빗질해 준다', 'caring', { bond: 3, vitality: -1 }, '아침저녁으로 빗질을 하자 날리는 꽃가루가 눈에 띄게 줄었다.', { affection: 2 }],
    ['산책 시간을 이웃과 맞춘다', 'pragmatic', { wisdom: 2, reputation: 1 }, '아이가 학교에 간 시간에만 산책을 나가기로 했다.'],
    ['알레르기 약을 선물한다', 'caring', { money: -50, reputation: 2 }, '이웃이 고마워하며 아이 손에 쿠키를 들려 보냈다.'],
  ], repeat(8)],
  ['type-grass-forest', 12, 80, '뒷산 복원', '작년 산불로 그을린 뒷산에 나무를 다시 심는 행사가 열린다.', [
    [m => `${P(m, '과', '와')} 씨앗을 틔운다`, 'caring', { reputation: 2, joy: 2 }, '포켓몬의 기운을 받은 씨앗들이 이듬해 봄 한꺼번에 싹을 틔웠다.',
      { ...tcheck('care', 'bond', 0, '싹이 몇 개밖에 나지 않았다. 다음 해를 기약했다.', { joy: -1 }), world: { ecology: 3 } }],
    ['새로 돌아온 포켓몬을 조사한다', 'curious', { wisdom: 3 }, '타 버린 숲에 처음 돌아온 포켓몬을 기록했다.', (m, s) => ({ observe: localSpecies(s) })],
    ['묘목값을 기부한다', 'pragmatic', { money: -200, reputation: 2 }, '기부자 명판에 이름이 새겨졌다.', { world: { ecology: 2 } }],
  ]],
]);

// ── 전기 ──
const electric = companions(ofType('전기'), [
  ['type-electric-blackout', 12, 85, '정전의 밤', '폭풍으로 마을 전체에 전기가 끊겼다. 병원의 비상 발전기도 말썽이라고 한다.', [
    [m => `${P(m, '과', '와')} 병원으로 달려간다`, 'bold', { reputation: 3, courage: 3 }, '전기를 조금씩 흘려 넣어 수술실 불이 꺼지지 않게 버텼다.',
      { ...check('courage', 5, '과부하로 포켓몬과 함께 쓰러져 아침에야 깨어났다.', { vitality: -3 }), world: { safety: 2 },
        follow: [echoLater([1, 2], '정전의 밤 감사장', '정전 때 버텨 준 덕분에 무사히 태어난 아기의 가족이 감사장과 사진을 보내왔다.', { joy: 4, reputation: 1 }, 0.8)] }],
    ['집 전등만 밝힌다', 'caring', { bond: 3, joy: 2 }, '식구들이 작은 불빛 아래 모여 보드게임을 했다.'],
    ['이웃 휴대폰을 충전해 준다', 'pragmatic', { money: 120, reputation: 1 }, '줄 선 이웃들이 조금씩 건넨 사례금이 모였다.'],
  ]],
  ['type-electric-bill', 10, 85, '전기요금 고지서', m => `이번 달 전기요금이 두 배로 나왔다. 알고 보니 ${P(m, '이', '가')} 밤마다 콘센트에서 전기를 몰래 빨아 먹고 있었다.`, [
    ['전용 충전 패드를 사 준다', 'pragmatic', { money: -200, bond: 2 }, '충전 패드 위에서 자는 습관이 들자 요금이 제자리로 돌아왔다.', { affection: 2 }],
    ['발전기를 돌리게 한다', 'curious', { wisdom: 2, money: 100 }, '자가 발전 장치를 만들어 오히려 남는 전기를 팔았다.', { training: 15 }],
    ['따끔하게 혼낸다', 'bold', { bond: -2, wisdom: 1 }, '한동안 시무룩했지만 콘센트 근처에는 가지 않았다.', { affection: -2 }],
    ['요금을 그냥 낸다', 'easygoing', { money: -150, joy: 1 }, '배부르게 잔 포켓몬의 얼굴을 보니 아깝지 않았다.'],
  ], repeat(8)],
  ['type-electric-plant', 14, 75, '발전소 측정', '발전소 연구원이 전기 포켓몬의 전력량을 측정하고 있다며 협조를 부탁했다.', [
    ['측정에 협조한다', 'curious', { wisdom: 4, money: 150 }, '전압 그래프가 화면을 가득 채우자 연구원들이 환호했다.',
      m => ({ follow: [choiceLater([2, 5], '발전소의 편지', `발전소가 ${N(m)}의 측정 결과를 바탕으로 정식 연구 협력 계약을 제안해 왔다.`, [
        ['계약한다', 'pragmatic', { money: 400, joy: -1 }, '한 달에 한 번 발전소에 들러 측정을 돕기로 했다.'],
        ['연구 자료만 공개해 달라고 한다', 'curious', { wisdom: 3 }, '자료가 공개되어 다른 트레이너들도 참고하게 됐다.'],
        ['포켓몬이 지칠까 봐 거절한다', 'caring', { bond: 2 }, '편지를 정중히 돌려보냈다.'],
      ], 0.7)] })],
    ['견학만 하고 돌아온다', 'easygoing', { joy: 2 }, '발전소 주변을 떠도는 포켓몬을 구경했다.', { observe: 81 }],
  ]],
]);

// ── 얼음 ──
const ice = companions(ofType('얼음'), [
  ['type-ice-summer', 8, 85, '한여름 피서', m => `폭염이 계속되자 ${P(m, '이', '가')} 냉장고 앞에서 떠나지 않는다.`, [
    ['함께 빙수 가게를 연다', 'pragmatic', { money: 350, reputation: 1 }, '곱게 간 얼음에 나무열매 시럽을 올린 빙수가 동네 명물이 됐다.',
      tcheck('craft', 'wisdom', 5, '얼음이 금방 녹아 손님들이 국물만 받아 갔다.', { joy: -2 })],
    ['에어컨을 들인다', 'caring', { money: -300, bond: 3 }, '시원한 방에서 둘 다 그제야 숨을 돌렸다.', { affection: 3 }],
    ['산골 계곡으로 피서를 간다', 'easygoing', { joy: 3, vitality: 2 }, '계곡물에서 처음 보는 포켓몬과 마주쳤다.', (m, s) => ({ observe: localSpecies(s) })],
  ], repeat(7)],
  ['type-ice-rink', 10, 80, '얼음 썰매장', m => `${P(m, '이', '가')} 숨을 불어 마을 연못을 꽁꽁 얼려 버렸다. 아이들이 하나둘 모여든다.`, [
    ['아이들에게 무료로 연다', 'caring', { reputation: 2, joy: 3 }, '하루 종일 연못에 웃음소리가 끊이지 않았다.', { world: { economy: 1 } }],
    ['입장료를 받는다', 'pragmatic', { money: 200, reputation: -1 }, '돈은 모였지만 몇몇 부모가 눈살을 찌푸렸다.'],
    ['둘이서만 탄다', 'easygoing', { joy: 3, bond: 2 }, '해 질 녘 얼음 위에 긴 그림자 두 개가 미끄러졌다.'],
  ]],
  ['type-ice-blizzard', 16, 70, '눈보라 속 조난자', '산장에 등산객이 눈보라 속에서 돌아오지 않았다는 연락이 왔다.', [
    [m => `${P(m, '과', '와')} 수색에 나선다`, 'bold', { courage: 4, reputation: 3 }, '눈 속에서 웅크린 등산객을 찾아 업고 내려왔다.',
      { ...check('courage', 10, '눈보라가 거세 중간에 돌아왔다. 등산객은 구조대가 찾았다.', { vitality: -4 }), world: { safety: 1 },
        follow: [echoLater([1, 3], '구조된 등산객', '눈보라 속에서 구했던 등산객이 가족과 함께 찾아와 고개 숙여 인사했다.', { joy: 4, reputation: 1 }, 0.8)] }],
    ['구조대에 길을 알려 준다', 'pragmatic', { wisdom: 2 }, '지도에 얼음 동굴의 위치를 표시해 주었다.', { world: { safety: 1 } }],
    ['산장에서 따뜻한 차를 끓인다', 'caring', { bond: 2, joy: 1 }, '돌아온 사람들에게 차를 나눠 주었다.'],
  ]],
]);

// ── 격투 ──
const fighting = companions(ofType('격투'), [
  ['type-fighting-dojo', 10, 70, '도장의 권유', m => `동네 도장 관장이 ${P(m, '을', '를')} 보더니 함께 수련하자고 권했다.`, [
    ['정식으로 입문한다', 'bold', { vitality: 4, courage: 2, money: -150 }, '새벽마다 도장 마루를 닦고 기본기를 반복했다.', { training: 30 }],
    ['사범의 포켓몬과 대련한다', 'bold', { courage: 3 }, '도장 한가운데서 사범의 포켓몬과 맞섰다.',
      { battle: { kind: 'gym', opponent: 57, level: 30 }, after: { win: { effects: { reputation: 2 }, training: 20 }, lose: { effects: { wisdom: 2 } } } }],
    ['구경만 하고 돌아온다', 'easygoing', { joy: 2 }, '기합 소리를 들으며 차 한 잔을 마셨다.'],
  ]],
  ['type-fighting-moving', 12, 85, '이삿짐 나르기', m => `옆집이 이사를 한다. ${P(m, '이', '가')} 냉장고를 번쩍 들어 보이며 팔을 걷어붙였다.`, [
    ['무료로 돕는다', 'caring', { reputation: 2, vitality: -1 }, '이웃이 새집 주소와 함께 놀러 오라는 쪽지를 남겼다.'],
    ['이삿짐센터 아르바이트를 한다', 'pragmatic', { money: 300, vitality: -2 }, '하루에 세 집 이사를 해치웠다.', { training: 15 }],
    ['오늘은 쉬게 한다', 'easygoing', { joy: 2 }, '포켓몬은 아쉬운 듯 창밖으로 트럭을 지켜봤다.'],
  ], repeat(6)],
  ['type-fighting-street', 14, 60, '길거리 도전자', '광장에서 격투 포켓몬을 데리고 다니는 떠돌이 트레이너가 손짓으로 대결을 청했다.', [
    ['도전을 받는다', 'bold', { courage: 3 }, '광장 한복판에서 대결이 시작됐다.',
      (m, s) => ({ battle: { kind: 'wild', opponent: pick(s, [56, 66, 106, 107, 236, 297, 307]) }, after: { win: { effects: { reputation: 2 } }, lose: { effects: { joy: -2 } } } })],
    ['구경꾼을 모아 시범 경기로 만든다', 'pragmatic', { money: 120, reputation: 1 }, '둘이 합을 맞춘 시범에 모자 가득 동전이 쌓였다.', { training: 10 }],
    ['정중히 사양한다', 'caring', { wisdom: 2 }, '트레이너는 웃으며 다음 마을로 떠났다.'],
  ]],
]);

// ── 독 ──
const poison = companions(ofType('독'), [
  ['type-poison-antidote', 14, 80, '해독제 연구', m => `대학 연구실에서 ${N(m)}의 독을 조금 채취해 새 해독제 연구에 쓰고 싶다고 한다.`, [
    ['채취에 협조한다', 'curious', { wisdom: 3, money: 200 }, '조심스러운 손길에 포켓몬도 얌전히 있었다.',
      m => ({ ...tcheck('research', 'bond', 0, `낯선 기구에 놀란 ${P(m, '이', '가')} 도망쳐 채취는 미뤄졌다.`, { joy: -1 }, { affection: -2 }),
        follow: [echoLater([3, 6], '해독제 완성', `${N(m)}의 독으로 만든 해독제가 정식 허가를 받았다. 연구 보고서 감사의 글에 이름이 실렸다.`, { reputation: 2, joy: 3 }, 0.7)] })],
    ['아플까 봐 거절한다', 'caring', { bond: 3 }, '연구원은 아쉬워했지만 이해한다며 돌아갔다.'],
  ]],
  ['type-poison-cleanup', 16, 80, '오염된 개울', m => `공장 폐수로 마을 개울이 탁해졌다. ${P(m, '은', '는')} 독 성분을 몸에 받아들일 수 있다.`, [
    ['정화 작업에 나선다', 'caring', { reputation: 2, vitality: -2 }, '몇 주 만에 개울 바닥이 다시 보이기 시작했다.', { world: { ecology: 3 } }],
    ['공장에 정식으로 항의한다', 'bold', { courage: 3, reputation: 2 }, '수질 검사 결과를 들고 공장장을 찾아갔다.',
      { ...check('courage', 5, '문전박대를 당하고 돌아왔다.', { joy: -2 }), world: { ecology: 2 },
        follow: [choiceLater([2, 4], '공장의 답장', '공장이 정화 설비를 들이겠다며 감시 위원을 맡아 달라고 했다.', [
          ['감시 위원을 맡는다', 'pragmatic', { reputation: 2, wisdom: 2 }, '분기마다 배수구를 확인하러 갔다.', { world: { ecology: 2 } }],
          ['다른 사람을 추천한다', 'easygoing', { joy: 1 }, '환경 단체 활동가를 추천했다.'],
        ], 0.6)] }],
    ['조용히 지켜본다', 'easygoing', { wisdom: 1 }, '누군가 나서 주기를 바랐다.'],
  ]],
  ['type-poison-sign', 10, 85, '출입 금지 팻말', '공원 입구에 \'독 포켓몬 출입 금지\' 팻말이 새로 붙었다.', [
    ['주민 회의에서 설득한다', 'bold', { reputation: 3, courage: 2 }, '독을 다루는 법을 차근차근 설명하자 팻말이 내려갔다.',
      check('wisdom', 8, '말이 꼬여 오히려 반대가 늘었다.', { reputation: -1, joy: -2 })],
    ['독 포켓몬 관리 강좌를 수료한다', 'pragmatic', { money: -100, wisdom: 3, reputation: 1 }, '수료증을 보여 주자 관리인이 출입을 허락했다.'],
    ['다른 산책길을 찾는다', 'easygoing', { joy: 1, bond: 2 }, m => `${P(m, '과', '와')} 강둑을 따라 걷는 새 산책길을 찾았다.`],
  ]],
]);

// ── 땅 ──
const ground = companions(ofType('땅'), [
  ['type-ground-site', 16, 75, '공사 현장', '마을 도로 공사 현장 감독이 땅 다지기를 도울 포켓몬을 찾는다.', [
    ['일을 맡는다', 'pragmatic', { money: 400, vitality: -3 }, '하루 종일 흙을 다지고 나니 길 하나가 반듯해졌다.', { training: 20, world: { economy: 1 } }],
    ['지반을 점검한다', 'curious', { wisdom: 3, reputation: 2 }, '포켓몬이 땅속 빈 공간을 찾아내 붕괴를 막았다.',
      { ...tcheck('research', 'wisdom', 5, '아무 문제도 찾지 못했다. 감독은 고맙다며 음료수를 건넸다.', { joy: 1 }), world: { safety: 2 } }],
    ['사양한다', 'easygoing', { joy: 2 }, '소음을 피해 강가로 산책을 나갔다.'],
  ]],
  ['type-ground-fossil', 8, 85, '마당의 화석', m => `${P(m, '이', '가')} 마당을 파다가 기묘한 무늬가 박힌 돌 조각을 물고 왔다.`, [
    ['박물관에 기증한다', 'caring', { reputation: 3, wisdom: 2 }, '학예사가 돋보기를 들고 한참 들여다봤다.',
      { follow: [echoLater([2, 4], '화석 전시', '기증한 화석이 박물관 특별전에 걸렸다. 설명판 아래에 발견자의 이름이 적혀 있었다.', { joy: 3, reputation: 1 })] }],
    ['감정받아 판다', 'pragmatic', { money: 500 }, '수집가가 생각보다 높은 값을 불렀다.'],
    ['도로 묻어 둔다', 'easygoing', { joy: 2 }, '언젠가 다시 꺼내 볼 보물로 남겨 두었다.', { flag: 'type-ground-fossil-buried' }],
  ]],
  ['type-ground-quake', 10, 85, '지진 뒤', m => `밤사이 지진이 지나가고 마을 길이 갈라졌다. ${P(m, '이', '가')} 갈라진 틈에 코를 대고 킁킁거린다.`, [
    ['틈을 메운다', 'caring', { reputation: 2, vitality: -2 }, '흙을 날라 갈라진 길을 메웠다.', { world: { safety: 2 }, training: 15 }],
    ['땅의 흔들림을 기록한다', 'curious', { wisdom: 4 }, '포켓몬이 여진을 먼저 느끼는 시간을 표로 정리했다.'],
    ['집 안을 정리한다', 'pragmatic', { vitality: 1, bond: 1 }, '넘어진 가구를 세우고 깨진 그릇을 치웠다.'],
  ], repeat(9)],
]);

// ── 비행 ──
const flying = companions(ofType('비행'), [
  ['type-flying-delivery', 12, 75, '급한 약 배달', '산골 마을에서 급한 약이 필요하다는 연락이 왔다. 도로는 산사태로 막혔다.', [
    [m => `${N(m)}에게 약을 맡긴다`, 'caring', { reputation: 2, money: 200 }, '약이 제시간에 닿아 아픈 아이가 고비를 넘겼다.',
      { ...check('bond', 5, '바람에 밀려 늦게 도착했지만 다행히 큰일은 없었다.', { joy: -2 }), training: 20 }],
    ['배달 일을 계속 맡는다', 'pragmatic', { money: 300, vitality: -2 }, '하늘 배달부로 등록하고 매주 산골 마을까지 날아다녔다.',
      { flag: 'type-flying-courier', follow: [echoLater([2, 4], '하늘 배달부의 단골', '매주 소포를 받던 산골 마을 사람들이 배달부를 위한 작은 잔치를 열어 주었다.', { joy: 3, reputation: 2 }, 0.7)] }],
    ['구조대에 맡긴다', 'easygoing', { joy: 1 }, '헬기가 뜨기를 기다렸다.'],
  ], repeat(7)],
  ['type-flying-balloon', 10, 80, '열기구 축제', m => `열기구 축제가 열렸다. ${P(m, '이', '가')} 떠오르는 열기구를 따라 날아오르고 싶어 한다.`, [
    ['열기구에 오른다', 'bold', { joy: 5, money: -250 }, '구름 위에서 지방 전체를 내려다봤다.', (m, s) => ({ observe: localSpecies(s) })],
    ['언덕에서 마음껏 날게 한다', 'caring', { bond: 3 }, '열기구 사이를 누비고 돌아온 포켓몬이 숨을 헐떡였다.', { affection: 2, training: 10 }],
    ['바람의 흐름을 관찰한다', 'curious', { wisdom: 3 }, '연기 기둥으로 상승 기류를 그려 보았다.'],
  ]],
  ['type-flying-nest', 8, 85, '떨어진 둥지', '강풍에 가로수 위의 둥지가 떨어졌다. 새끼 한 마리가 땅 위에서 떨고 있다.', [
    [m => `${P(m, '과', '와')} 둥지를 다시 올려 준다`, 'caring', { bond: 3, reputation: 1 }, '어미가 돌아와 둥지 위를 맴돌았다.', { world: { ecology: 1 } }],
    ['집에 데려와 돌본다', 'caring', { bond: 2, joy: 3 }, '새끼는 무럭무럭 자라 집을 떠나지 않았다.',
      { ...check('bond', 10, '정성껏 돌봤지만 다 자라자 무리를 따라 날아갔다.', { joy: 1 }, { observe: 276 }), join: 276, joinOrigin: 'rescued' }],
    ['레인저에게 연락한다', 'pragmatic', { wisdom: 2 }, '레인저가 새끼를 보호소로 데려갔다.'],
  ]],
]);

// ── 에스퍼 ──
const psychic = companions(ofType('에스퍼'), [
  ['type-psychic-dream', 10, 85, '같은 꿈', m => `${P(m, '이', '가')} 곁에서 잠든 밤마다 같은 꿈을 꾼다. 안개 낀 호숫가와 그 위에 떠 있는 빛.`, [
    ['꿈 일기를 쓴다', 'curious', { wisdom: 4 }, '꿈속 호수의 모양을 매일 아침 그렸다.',
      { flag: 'type-psychic-dream-lake', follow: [choiceLater([3, 6], '꿈에서 본 호수', '여행 중에 꿈속과 꼭 닮은 호수를 만났다. 물 위로 희미한 빛이 떠올랐다.', [
        ['호수 가까이 다가간다', 'bold', { courage: 3, wisdom: 3 }, '빛은 사라졌지만 마음 한구석이 조용해졌다.'],
        ['멀리서 지켜본다', 'easygoing', { joy: 3 }, '꿈은 그날 이후 다시 찾아오지 않았다.'],
      ], 0.6)] }],
    ['포켓몬을 쓰다듬으며 잔다', 'caring', { bond: 3 }, '꿈은 점점 따뜻한 색으로 바뀌었다.', { affection: 2 }],
    ['신경 쓰지 않는다', 'easygoing', { joy: 1 }, '아침이 되면 금방 잊었다.'],
  ]],
  ['type-psychic-warning', 12, 85, '외출을 막는 날', m => `아침부터 ${P(m, '이', '가')} 현관을 막고 비켜 주지 않는다. 눈빛이 유난히 진지하다.`, [
    ['오늘은 집에 있는다', 'caring', { bond: 4 }, '오후에 늘 지나던 다리에서 낙석 사고가 났다는 소식이 들려왔다.'],
    ['이웃에게도 알린다', 'pragmatic', { reputation: 2 }, '다리를 우회한 이웃들이 저녁에 고맙다며 찾아왔다.',
      { ...check('wisdom', 5, '아무도 믿지 않았다. 그래도 사고는 피해 갔다.', { reputation: -1 }), world: { safety: 1 } }],
    ['웃으며 넘어서 나간다', 'bold', { courage: 3 }, '아무 일도 없었다. 포켓몬은 하루 종일 토라져 있었다.',
      check('courage', 10, '빗길에 미끄러져 무릎을 다쳤다.', { vitality: -4 })],
  ]],
  ['type-psychic-spoons', 8, 85, '숟가락 소동', m => `부엌 서랍의 숟가락이 모두 휘어 있다. ${P(m, '이', '가')} 시치미를 떼고 천장만 본다.`, [
    ['마술 공연을 연다', 'pragmatic', { money: 200, reputation: 1 }, '동네 아이들 앞에서 숟가락을 휘었다 펴는 공연이 대성공이었다.',
      check('courage', 0, '사람들 앞에서 포켓몬이 긴장해 아무것도 휘지 않았다.', { joy: -1 })],
    ['새 숟가락을 산다', 'caring', { money: -60, bond: 1 }, '휜 숟가락은 포켓몬의 장난감 상자에 넣었다.'],
    ['웃어넘긴다', 'easygoing', { joy: 3 }, '휜 숟가락으로 국을 떠먹었다.'],
  ], repeat(8)],
]);

// ── 벌레 ──
const bug = companions(ofType('벌레'), [
  ['type-bug-contest', 8, 70, '곤충채집 대회', m => `자연공원에서 곤충채집 대회가 열린다. ${P(m, '이', '가')} 더듬이를 바짝 세웠다.`, [
    ['출전해서 잡아 본다', 'bold', { courage: 3 }, '풀숲을 뒤지다 커다란 벌레 포켓몬과 마주쳤다.',
      (m, s) => ({ battle: { kind: 'wild', opponent: pick(s, BUGS), capture: true }, after: { win: { effects: { reputation: 2, money: 150 } }, lose: { effects: { joy: -1 } } } })],
    ['심사위원을 돕는다', 'curious', { wisdom: 3 }, '참가자들이 잡아 온 포켓몬의 무게를 쟀다.', (m, s) => ({ observe: pick(s, BUGS) })],
    ['응원석에 앉는다', 'easygoing', { joy: 2 }, '우승자의 포켓몬을 보며 박수를 쳤다.'],
  ], repeat(8)],
  ['type-bug-neighbor', 10, 85, '벌레를 무서워하는 이웃', m => `새로 이사 온 이웃이 ${P(m, '을', '를')} 보자마자 비명을 지르고 문을 닫았다.`, [
    ['천천히 인사시킨다', 'caring', { reputation: 2, bond: 2 }, '몇 번을 만나자 이웃이 먼저 손을 내밀었다.',
      tcheck('care', 'bond', 0, '포켓몬이 반가워 다가가는 바람에 이웃이 더 놀랐다.', { joy: -1 })],
    ['벌레 포켓몬 설명회를 연다', 'curious', { wisdom: 3 }, '사람들이 벌레 포켓몬이 숲에 하는 일을 처음 알았다.', { world: { ecology: 1 } }],
    ['산책 시간을 피한다', 'pragmatic', { wisdom: 1, joy: -1 }, '이웃과 마주치지 않도록 이른 아침에만 나갔다.'],
  ]],
  ['type-bug-lights', 10, 85, '여름밤 빛의 춤', m => `여름밤 강가에 빛나는 벌레 포켓몬 무리가 군무를 춘다. ${N(m)}도 끼고 싶은 눈치다.`, [
    ['함께 강가로 간다', 'easygoing', { joy: 4 }, '빛의 무리 사이를 맴도는 포켓몬을 오래 바라봤다.', { affection: 3, observe: 313 }],
    ['사진 공모전에 낸다', 'curious', { wisdom: 2, money: 200, reputation: 1 }, '긴 노출로 찍은 빛의 궤적 사진이 상을 받았다.',
      { ...check('wisdom', 5, '사진이 모두 흔들려 쓸 수 없었다.', { joy: -1 }),
        follow: [echoLater([1, 3], '달력 사진', '공모전 사진이 지방 관광 달력의 7월 사진으로 실렸다.', { joy: 3, reputation: 1 }, 0.7)] }],
    ['일찍 잔다', 'pragmatic', { vitality: 2 }, '창밖으로 희미한 빛만 보며 잠들었다.'],
  ], repeat(9)],
]);

// ── 바위 ──
const rock = companions(ofType('바위'), [
  ['type-rock-cave', 12, 70, '동굴 탐사', '마을 뒷산 동굴의 지도가 절반만 그려져 있다. 탐사대가 동행할 포켓몬을 찾는다.', [
    [m => `${P(m, '과', '와')} 깊이 들어간다`, 'bold', { wisdom: 3, reputation: 2 }, '아무도 가 보지 못한 지하 호수까지 지도에 그려 넣었다.',
      { ...check('courage', 8, '낙석에 길이 막혀 되돌아왔다.', { vitality: -3 }), observe: 41, flag: 'type-rock-cave-map' }],
    ['입구 근처만 조사한다', 'curious', { wisdom: 2 }, '입구 암벽의 지층을 꼼꼼히 기록했다.'],
    ['밖에서 기다린다', 'easygoing', { joy: 1 }, '탐사대가 들려준 이야기만으로도 충분했다.'],
  ]],
  ['type-rock-wall', 14, 85, '무너진 돌담', '태풍에 마을 돌담이 무너졌다. 돌이 무거워 사람 힘으로는 엄두가 안 난다.', [
    ['돌을 나른다', 'caring', { reputation: 2, vitality: -2 }, m => `${P(m, '이', '가')} 큰 돌을 하나씩 들어 날라 하루 만에 담이 섰다.`, { world: { safety: 2 }, training: 20 }],
    ['석공에게 쌓는 법을 배운다', 'curious', { wisdom: 4 }, '돌끼리 맞물리는 각도를 익혔다.',
      tcheck('craft', 'wisdom', 5, '돌이 자꾸 어긋나 석공이 다시 쌓았다.', { joy: -1 })],
    ['일당을 받고 일한다', 'pragmatic', { money: 250, vitality: -2 }, '마을 회관에서 일당을 받았다.'],
  ]],
  ['type-rock-show', 10, 85, '돌 품평회', '마을 장터에서 바위 포켓몬의 윤기와 단단함을 겨루는 품평회가 열린다.', [
    ['정성껏 닦아 출품한다', 'bold', { reputation: 2, money: 150 }, m => `반들반들 윤이 나는 ${P(m, '이', '가')} 우수상을 받았다.`,
      { ...tcheck('care', 'bond', 5, '심사 직전에 진흙탕에 굴러 버렸다.', { joy: -2 }), affection: 2 }],
    ['집에서 손질만 해 준다', 'caring', { bond: 3 }, '젖은 천으로 몸 구석구석을 닦아 주었다.', { affection: 2 }],
    ['구경만 한다', 'easygoing', { joy: 2 }, '다른 바위 포켓몬들의 무늬를 구경했다.'],
  ], repeat(8)],
]);

// ── 고스트 ──
const ghost = companions(ofType('고스트'), [
  ['type-ghost-prank', 8, 85, '사라진 물건들', m => `이웃집 열쇠와 안경이 자꾸 사라진다고 한다. 밤마다 ${P(m, '이', '가')} 벽을 통과해 나가는 것을 봤다.`, [
    ['물건을 들고 사과하러 간다', 'caring', { reputation: 1, bond: 1 }, '이웃은 웃으며 장난꾸러기에게 사탕을 건넸다.'],
    ['단단히 혼낸다', 'pragmatic', { wisdom: 2, bond: -2 }, '한동안 벽을 통과하지 않았다.', { affection: -2 }],
    ['모른 척한다', 'easygoing', { joy: 2, reputation: -1 }, '동네에 이상한 소문이 퍼졌다.'],
  ], repeat(7)],
  ['type-ghost-visitor', 10, 85, '밤의 방문자', m => `며칠째 자정이 되면 창밖에 낯선 그림자가 와서 ${P(m, '과', '와')} 무언가를 속삭인다.`, [
    ['창문을 열어 맞이한다', 'bold', { courage: 3, joy: 2 }, '그림자가 방 안으로 스며들더니 그대로 눌러앉았다.',
      { ...check('courage', 5, '창문을 열자 그림자는 놀라서 사라졌다.', { joy: -1 }, { observe: 353 }), join: 353, joinOrigin: 'adopted' }],
    ['조용히 관찰한다', 'curious', { wisdom: 3 }, '방문자의 정체를 도감에 기록했다.', { observe: 353 }],
    ['커튼을 친다', 'easygoing', { vitality: 1 }, '그날 밤은 푹 잤다.'],
  ]],
  ['type-ghost-house', 14, 75, '흉가 소문', '마을 외곽 빈집에서 밤마다 웃음소리가 난다는 소문에 집주인이 조사를 부탁했다.', [
    [m => `${P(m, '과', '와')} 들어가 본다`, 'bold', { courage: 3 }, '어두운 복도 끝에서 무언가가 튀어나왔다.',
      (m, s) => ({ battle: { kind: 'wild', opponent: pick(s, [92, 200, 355, 353, 425]) }, after: { win: { effects: { reputation: 2 }, world: { safety: 1 } }, lose: { effects: { courage: -2 } } } })],
    ['소문의 출처를 추적한다', 'curious', { wisdom: 3 }, '웃음소리는 바람 부는 굴뚝 소리였다.',
      { follow: [echoLater([2, 4], '흉가의 새 주인', '소문이 걷힌 빈집에 젊은 부부가 이사 와 빵집을 열었다.', { joy: 2, reputation: 1 }, 0.6)] }],
    ['거절한다', 'easygoing', { joy: 1 }, '밤에는 그쪽 길로 다니지 않기로 했다.'],
  ]],
]);

// ── 드래곤 ──
const dragon = companions(ofType('드래곤'), [
  ['type-dragon-permit', 16, 70, '드래곤 등록제', m => `시청이 드래곤 포켓몬 보유자 등록제를 시작했다. ${P(m, '과', '와')} 함께 도심을 다니려면 시험을 통과해야 한다.`, [
    ['시험을 본다', 'bold', { reputation: 2, courage: 2 }, '필기와 실기를 한 번에 통과해 등록증을 받았다.',
      { ...check('wisdom', 10, '실기에서 포켓몬이 신호를 무시해 떨어졌다.', { joy: -2 }), cost: 150, flag: 'type-dragon-permit' }],
    ['도심을 피해 다닌다', 'easygoing', { bond: 2, joy: -1 }, '산길로 돌아가는 습관이 생겼다.'],
  ]],
  ['type-dragon-scales', 12, 85, '탈피철 비늘', m => `${P(m, '이', '가')} 탈피를 시작해 마당에 반짝이는 비늘이 수북하다.`, [
    ['비늘을 모아 판다', 'pragmatic', { money: 400 }, '공예상이 비늘을 한 장씩 불빛에 비춰 보고 값을 매겼다.'],
    ['몸을 정성껏 손질해 준다', 'caring', { bond: 4 }, '새 비늘이 나는 자리를 꼼꼼히 닦아 주었다.', { affection: 3 }],
    ['비늘로 장신구를 만든다', 'curious', { wisdom: 2, reputation: 2 }, '비늘 펜던트가 공예전에서 눈길을 끌었다.',
      tcheck('craft', 'wisdom', 5, '비늘이 생각보다 단단해 공구만 망가졌다.', { joy: -1 })],
  ], repeat(8)],
  ['type-dragon-kids', 10, 85, '드래곤 구경꾼', m => `동네 아이들이 ${P(m, '을', '를')} 보려고 대문 앞에 몰려들었다.`, [
    ['등에 태워 준다', 'bold', { reputation: 3, joy: 3 }, '아이들이 줄을 서서 한 바퀴씩 마당을 돌았다.',
      check('bond', 5, '포켓몬이 귀찮아하며 꼬리로 대문을 닫아 버렸다.', { reputation: -1 })],
    ['드래곤 이야기를 들려준다', 'curious', { wisdom: 2, reputation: 2 }, '아이들이 눈을 반짝이며 질문을 쏟아 냈다.',
      { follow: [echoLater([6, 10], '그날의 아이', '대문 앞에서 드래곤 이야기를 듣던 아이가 드래곤 조련사 견습생이 됐다며 편지를 보냈다.', { joy: 4, reputation: 1 }, 0.7)] }],
    ['조용히 돌려보낸다', 'easygoing', { vitality: 1 }, '포켓몬은 그제야 다시 낮잠을 이었다.'],
  ]],
]);

// ── 악 ──
const dark = companions(ofType('악'), [
  ['type-dark-rumor', 10, 85, '수군거림', m => `동네 사람들이 ${P(m, '을', '를')} 볼 때마다 수군거린다. 눈빛이 사납다는 이유만으로.`, [
    ['동네 청소에 함께 나선다', 'caring', { reputation: 2, vitality: -1 }, '골목을 쓸고 다니는 모습에 사람들의 표정이 누그러졌다.', { world: { safety: 1 } }],
    ['반상회에서 정면으로 이야기한다', 'bold', { reputation: 3, courage: 2 }, '포켓몬의 습성을 차분히 설명하자 박수가 나왔다.',
      check('courage', 5, '언성이 높아져 분위기만 나빠졌다.', { reputation: -2 })],
    ['신경 쓰지 않는다', 'easygoing', { joy: 1, bond: 2 }, '포켓몬도 개의치 않는 듯 하품을 했다.'],
  ]],
  ['type-dark-thief', 14, 75, '시장 좀도둑', m => `시장에 좀도둑이 들었다. ${P(m, '이', '가')} 낯선 냄새를 맡고 골목 쪽으로 고개를 돌렸다.`, [
    ['냄새를 따라 쫓는다', 'bold', { courage: 3 }, '골목 끝에서 도둑과 그의 포켓몬을 막아섰다.',
      { battle: { kind: 'villain' }, after: { win: { effects: { reputation: 2 }, world: { safety: 2 } }, lose: { effects: { money: -100, joy: -2 } } } }],
    ['경찰에 인상착의를 알린다', 'pragmatic', { wisdom: 2 }, '사흘 뒤 도둑이 붙잡혔다는 소식이 들렸다.', { world: { safety: 1 } }],
    ['상관하지 않는다', 'easygoing', { joy: 1 }, '장만 보고 돌아왔다.'],
  ]],
  ['type-dark-night', 12, 85, '밤 산책', m => `${P(m, '은', '는')} 해가 지면 눈을 반짝이며 문 앞을 서성인다.`, [
    ['밤 산책을 나간다', 'easygoing', { joy: 3, bond: 2 }, '달빛 아래 조용한 골목을 걸었다.', (m, s) => ({ affection: 2, observe: localSpecies(s) })],
    ['야간 순찰대에 가입한다', 'bold', { reputation: 1, vitality: -2 }, '순찰 조끼를 입고 밤거리를 돌았다.',
      { world: { safety: 2 }, flag: 'type-dark-patrol', follow: [echoLater([2, 4], '순찰대 표창', '야간 순찰대가 동네 범죄를 절반으로 줄였다며 구청에서 표창을 받았다.', { reputation: 2, joy: 2 }, 0.7)] }],
    ['낮 생활에 맞추게 한다', 'pragmatic', { vitality: 2 }, '한동안 투덜댔지만 아침잠에 익숙해졌다.', { affection: -2 }],
  ], repeat(8)],
]);

// ── 강철 ──
const steel = companions(ofType('강철'), [
  ['type-steel-rust', 10, 85, '장마 뒤 녹', m => `긴 장마가 끝나자 ${N(m)}의 몸 군데군데에 붉은 녹이 슬었다.`, [
    ['고급 방청제를 산다', 'pragmatic', { money: -200, bond: 2 }, '바르자마자 몸이 거울처럼 빛났다.', { affection: 3 }],
    ['직접 기름칠을 한다', 'caring', { bond: 4, vitality: -1 }, '밤새 천으로 문지르고 기름을 먹였다.'],
    ['대장장이에게 관리법을 배운다', 'curious', { wisdom: 3 }, '녹이 스는 원리와 막는 법을 배웠다.',
      tcheck('craft', 'wisdom', 5, '설명이 너무 어려워 반도 알아듣지 못했다.', { joy: -1 })],
  ], repeat(7)],
  ['type-steel-foundry', 16, 70, '철공소의 부탁', '철공소에서 뜨거운 쇳물을 다룰 강철 포켓몬의 도움을 청했다.', [
    ['일을 돕는다', 'pragmatic', { money: 350, vitality: -2 }, '불꽃 튀는 작업장에서 한 달을 보냈다.', { training: 20, world: { economy: 1 } }],
    ['안전 장비를 고안한다', 'curious', { wisdom: 4 }, '포켓몬 전용 보호대를 설계했다.',
      m => ({ ...tcheck('craft', 'wisdom', 8, '시제품이 너무 무거워 쓰이지 못했다.', { joy: -1 }),
        follow: [choiceLater([2, 4], '보호대 특허', `${P(m, '과', '와')} 함께 만든 보호대를 사겠다는 회사가 나타났다.`, [
          ['특허를 판다', 'pragmatic', { money: 600 }, '목돈이 들어왔다.'],
          ['설계도를 무료로 공개한다', 'caring', { reputation: 3 }, '여러 작업장이 보호대를 만들어 쓰기 시작했다.', { world: { safety: 1 } }],
        ], 0.6)] })],
    ['거절한다', 'easygoing', { joy: 1 }, '뜨거운 작업장은 내키지 않았다.'],
  ]],
  ['type-steel-airport', 14, 85, '금속 탐지기 소동', m => `공항 검색대에서 ${P(m, '이', '가')} 지나가자 경보음이 쉬지 않고 울렸다.`, [
    ['차분히 서류를 보여 준다', 'pragmatic', { wisdom: 2 }, '보안 요원이 웃으며 통과시켰다.'],
    ['화물칸 운송을 신청한다', 'caring', { money: -150, bond: -1 }, '도착하자마자 포켓몬을 꼭 안아 주었다.'],
    ['웃어넘긴다', 'easygoing', { joy: 3 }, '뒤에 선 승객들까지 함께 웃었다.'],
  ]],
]);

// ── 페어리 ──
const fairy = companions(ofType('페어리'), [
  ['type-fairy-festival', 8, 85, '축제 장식', m => `마을 축제 준비 위원회가 ${P(m, '과', '와')} 함께 광장 장식을 맡아 달라고 했다.`, [
    ['꽃 장식을 꾸민다', 'caring', { reputation: 3, joy: 3 }, '반짝이는 꽃 아치가 축제의 사진 명소가 됐다.',
      { ...tcheck('craft', 'bond', 0, '장식이 바람에 날아가 다시 매달았다.', { vitality: -1 }), world: { economy: 1 } }],
    ['무대에서 함께 공연한다', 'bold', { courage: 3, reputation: 2 }, '포켓몬의 춤에 맞춰 관객이 손뼉을 쳤다.', { affection: 2 }],
    ['구경꾼으로 즐긴다', 'easygoing', { joy: 3 }, '솜사탕을 나눠 먹으며 퍼레이드를 봤다.'],
  ], repeat(8)],
  ['type-fairy-moon', 10, 85, '보름달 밤', m => `보름달이 뜨자 ${P(m, '이', '가')} 창가에 서서 달을 향해 작게 노래한다.`, [
    ['언덕에 데려가 춤추게 한다', 'caring', { joy: 4, bond: 3 }, '달빛 아래에서 둘이 빙글빙글 돌았다.', { affection: 2 }],
    ['노래를 녹음해 연구한다', 'curious', { wisdom: 3 }, '음의 높낮이가 달의 고도와 함께 바뀐다는 것을 알아냈다.'],
    ['커튼을 걷어 둔다', 'easygoing', { vitality: 2 }, '노랫소리를 들으며 잠들었다.'],
  ]],
  ['type-fairy-ward', 14, 85, '소아 병동', m => `병원 소아 병동에서 ${P(m, '과', '와')} 함께 아이들을 만나 달라는 부탁이 왔다.`, [
    ['병동을 찾아간다', 'caring', { reputation: 3, joy: 2, vitality: -1 }, '한 아이가 처음으로 침대에서 일어나 포켓몬을 안았다.',
      { follow: [choiceLater([1, 3], '병동의 편지', '병원이 정기 방문 봉사자로 등록해 달라고 요청했다.', [
        ['매달 찾아간다', 'caring', { reputation: 2, bond: 2 }, '봉사자 명찰을 받았다.', { flag: 'type-fairy-ward-volunteer' }],
        ['가끔만 간다', 'easygoing', { joy: 1 }, '시간 날 때 들르기로 했다.'],
      ], 0.7)] }],
    ['그림 편지를 보낸다', 'easygoing', { bond: 1, joy: 1 }, '포켓몬 발자국을 찍은 편지를 보냈다.'],
  ]],
]);

// ── 노말 ──
const normal = companions(ofType('노말'), [
  ['type-normal-day', 8, 90, '평범한 하루', m => `아무 약속도 없는 일요일이다. ${P(m, '이', '가')} 발치에서 기지개를 켰다.`, [
    ['하루 종일 같이 뒹군다', 'easygoing', { joy: 4 }, '아무것도 하지 않아서 더 좋은 하루였다.', { affection: 2 }],
    ['동네를 한 바퀴 돈다', 'curious', { wisdom: 1, joy: 2 }, '늘 다니던 길에서 처음 보는 포켓몬을 발견했다.', (m, s) => ({ observe: localSpecies(s) })],
    ['사진을 한 장 남긴다', 'caring', { bond: 3 }, '창가 햇살 속의 포켓몬을 찍었다.',
      m => ({ follow: [echoLater([8, 14], '오래된 사진', `서랍 정리를 하다가 그 일요일의 사진을 찾았다. 사진 속 ${P(m, '이', '가')} 여전히 하품을 하고 있었다.`, { joy: 4, bond: 2 })] })],
  ], repeat(10)],
  ['type-normal-mimic', 8, 85, '집안일 흉내', m => `${P(m, '이', '가')} 빗자루를 끌고 다니며 집안일을 흉내 낸다.`, [
    ['제대로 가르친다', 'pragmatic', { wisdom: 2 }, '이제는 빨래를 개는 것도 돕는다.', { training: 15 }],
    ['크게 칭찬한다', 'caring', { bond: 3 }, '신이 나서 집 안을 몇 번이고 쓸었다.', { affection: 3 }],
    ['영상을 찍어 올린다', 'bold', { joy: 2, reputation: 2 }, '영상이 퍼져 동네에서 알아보는 사람이 생겼다.'],
  ]],
  ['type-normal-picky', 10, 85, '편식 고민', m => `요즘 ${P(m, '이', '가')} 사료는 거들떠보지도 않고 간식만 찾는다.`, [
    ['영양 공부를 한다', 'curious', { wisdom: 3, vitality: 1 }, '나무열매를 섞은 사료를 만들자 그릇을 싹 비웠다.',
      tcheck('care', 'wisdom', 5, '여러 조합을 시도했지만 결국 간식만 먹었다.', { joy: -1 })],
    ['비싼 사료로 바꾼다', 'caring', { money: -100, joy: 2 }, '새 사료를 맛있게 먹었다.', { affection: 2 }],
    ['간식을 끊는다', 'pragmatic', { bond: -2, vitality: 1 }, '며칠 토라졌지만 결국 사료를 먹기 시작했다.', { affection: -2 }],
  ]],
]);

// ── 종 특화 ──
const eevee = companions(ofSpecies([133]), [
  ['species-eevee-stones', 10, 70, '진화의 돌', m => `상점 진열장 앞에서 ${P(m, '이', '가')} 불꽃의 돌, 물의 돌, 천둥의 돌을 번갈아 들여다본다.`, [
    ['불꽃의 돌을 사 둔다', 'bold', { courage: 2, money: -300 }, '돌은 서랍에 넣어 두었다. 정할 때가 오면 함께 정하기로 했다.', { flag: 'eevee-stone-fire' }],
    ['물의 돌을 사 둔다', 'caring', { bond: 2, money: -300 }, '물의 돌을 창가에 두자 은은한 빛이 방을 채웠다.', { flag: 'eevee-stone-water' }],
    ['천둥의 돌을 사 둔다', 'pragmatic', { wisdom: 2, money: -300 }, '돌을 만질 때마다 털이 정전기로 부풀었다.', { flag: 'eevee-stone-thunder' }],
    ['지금 모습 그대로가 좋다', 'easygoing', { bond: 4 }, '진열장을 뒤로하고 나오자 포켓몬이 품으로 뛰어들었다.',
      m => ({ flag: 'eevee-stay', affection: 3, follow: [echoLater([4, 8], '그대로의 너', `여전히 그 모습인 ${P(m, '이', '가')} 아침마다 머리맡에서 꼬리를 흔든다. 그날의 선택을 후회한 적은 없었다.`, { joy: 3, bond: 2 })] })],
  ]],
]);

const species = companions(ofSpecies([25, 26, 172]), [
  ['species-pikachu-ball', 8, 60, '몬스터볼이 싫어', m => `${P(m, '은', '는')} 몬스터볼에 들어가길 한사코 거부한다. 볼을 내밀면 꼬리로 휙 쳐 낸다.`, [
    ['어깨에 태우고 다닌다', 'caring', { bond: 4, vitality: -1 }, '어깨가 뻐근했지만 늘 같은 높이에서 세상을 보게 됐다.', { affection: 3 }],
    ['볼 적응 훈련을 한다', 'pragmatic', { wisdom: 2 }, '간식을 넣은 볼에 조금씩 익숙해졌다.',
      { ...check('bond', 10, '훈련 도중 전기 충격을 맞고 머리가 부스스해졌다.', { vitality: -2 }, { affection: -2 }), training: 15 }],
    ['볼을 예쁘게 꾸며 준다', 'easygoing', { joy: 2, money: -80 }, '스티커를 붙인 볼은 들어가지는 않아도 베개로 쓴다.', { affection: 2 }],
  ]],
]).concat(companions(ofSpecies([131]), [
  ['species-lapras-crossing', 12, 80, '바다 건너기', m => `태풍으로 배가 끊겨 섬 주민들이 뭍에 발이 묶였다. ${P(m, '이', '가')} 물가에서 등을 낮춘다.`, [
    ['주민들을 태워 나른다', 'caring', { reputation: 3, vitality: -2 }, '하루 여섯 번 바다를 오가며 모두를 집으로 데려다주었다.',
      { ...check('vitality', 5, '파도가 높아 두 번 만에 멈춰야 했다.', { vitality: -3 }), world: { safety: 1 },
        follow: [echoLater([1, 3], '섬마을의 초대', '바다를 건네주었던 섬마을에서 해마다 열리는 축제에 귀빈으로 초대했다.', { joy: 4, reputation: 1 }, 0.8)] }],
    ['둘이서 먼바다로 나간다', 'bold', { joy: 4, courage: 2 }, '수평선 너머에서 처음 보는 포켓몬 무리를 만났다.', (m, s) => ({ observe: localSpecies(s) })],
    ['등 위에서 노래를 듣는다', 'easygoing', { joy: 3, bond: 2 }, '잔잔한 바다 위로 낮은 노랫소리가 퍼졌다.'],
  ]],
])).concat(companions(ofSpecies([104, 105], true), [
  ['species-cubone-skull', 8, 85, '뼈 투구 아래', m => `비 오는 밤, 뼈 투구를 깊이 눌러쓴 ${N(m)}의 방에서 작게 우는 소리가 들린다.`, [
    ['곁에 앉아 있어 준다', 'caring', { bond: 6 }, '말없이 등을 쓰다듬자 울음이 잦아들었다.', { affection: 4 }],
    ['보라타운 위령탑에 데려간다', 'caring', { money: -200, bond: 3, joy: 2 }, '향을 피우고 오래 서 있었다.',
      { follow: [echoLater([2, 5], '투구를 벗은 날', '어느 맑은 아침, 투구를 벗어 둔 채 마당에서 햇볕을 쬐는 포켓몬을 보았다.', { joy: 4, bond: 2 }, 0.6)] }],
    ['혼자 있게 둔다', 'easygoing', { wisdom: 1 }, '아침이 되자 포켓몬은 평소처럼 뼈 곤봉을 들고 나왔다.'],
  ]],
])).concat(companions(ofSpecies([63, 64, 65]), [
  ['species-abra-teleport', 8, 75, '사라진 낮잠꾼', m => `자고 있던 ${P(m, '이', '가')} 감쪽같이 사라졌다. 잠결에 순간이동을 한 모양이다.`, [
    ['온 동네를 찾아다닌다', 'bold', { vitality: -2, bond: 3 }, '이웃 마을 도서관 소파에서 자고 있는 것을 찾았다.', { affection: 2 }],
    ['위치 방울을 달아 준다', 'pragmatic', { money: -120, wisdom: 2 }, '그 뒤로는 방울 소리로 위치를 금방 알 수 있었다.'],
    ['돌아올 때까지 기다린다', 'easygoing', { joy: 1 }, '저녁 무렵 아무 일 없었다는 듯 침대에 돌아와 있었다.',
      check('bond', 5, '사흘 만에 돌아왔다. 그동안 잠을 설쳤다.', { vitality: -2 })],
  ], repeat(7)],
])).concat(companions(ofSpecies([50, 51]), [
  ['species-diglett-yard', 8, 85, '구멍 난 마당', m => `${P(m, '이', '가')} 하룻밤 사이 마당을 구멍투성이로 만들었다. 옆집 농부가 그 흙을 보고 눈을 반짝인다.`, [
    ['옆집 밭을 갈아 준다', 'pragmatic', { money: 200, reputation: 1 }, '부드럽게 갈린 흙에서 채소가 쑥쑥 자랐다.', { world: { ecology: 1, economy: 1 } }],
    ['구멍을 메운다', 'caring', { vitality: -1, bond: 1 }, '메우는 족족 새 구멍이 생겼지만 함께 웃었다.'],
    ['구멍 지도를 그린다', 'curious', { wisdom: 3 }, '구멍이 땅속 물길을 따라 나 있다는 것을 알아냈다.'],
  ]],
])).concat(companions(ofSpecies([35, 36, 173], true), [
  ['species-clefairy-moon', 8, 85, '달맞이산의 부름', m => `보름이 다가오면 ${P(m, '이', '가')} 달맞이산 쪽 하늘을 오래 바라본다.`, [
    ['달맞이산에 데려간다', 'bold', { joy: 4, money: -200 }, '산꼭대기에서 동족들이 둥글게 모여 춤추는 것을 보았다.',
      { observe: 36, flag: 'clefairy-moon-visit', follow: [echoLater([1, 3], '달의 돌 조각', '그날 산에서 주운 반짝이는 돌 조각을 들여다보며 포켓몬이 행복하게 잠들었다.', { joy: 3, bond: 2 }, 0.6)] }],
    ['창가에 달맞이 자리를 만든다', 'caring', { bond: 3 }, '방석을 깔아 주자 밤새 그 자리를 지켰다.', { affection: 2 }],
    ['운석 이야기를 찾아 읽는다', 'curious', { wisdom: 3 }, '달맞이산에 떨어진 운석의 기록을 찾아 읽었다.'],
  ]],
])).concat(companions(ofSpecies([198, 430]), [
  ['species-murkrow-shinies', 8, 85, '반짝이 수집', m => `${P(m, '이', '가')} 어디선가 반지를 물고 돌아왔다. 둥지에는 단추와 열쇠가 수북하다.`, [
    ['주인을 찾아 돌려준다', 'caring', { reputation: 2 }, '반지 주인이 잃어버린 결혼반지였다며 눈물을 글썽였다.',
      check('wisdom', 5, '주인을 찾지 못해 파출소에 맡겼다.', { joy: -1 })],
    ['수집 상자를 만들어 준다', 'easygoing', { joy: 2 }, '쓸모없는 병뚜껑을 모으는 것으로 만족했다.', { affection: 2 }],
    ['물어 오지 않게 훈련한다', 'pragmatic', { wisdom: 1, bond: -1 }, '반짝이는 것을 보고도 참는 법을 배웠다.', { training: 10 }],
  ], repeat(8)],
])).concat(companions(ofSpecies([81, 82, 462]), [
  ['species-magnemite-radio', 10, 85, '가전제품 소동', m => `${P(m, '이', '가')} 집 안의 낡은 라디오에 찰싹 붙어 떨어지지 않는다. 라디오가 지직거리며 다시 켜졌다.`, [
    ['고장 난 가전을 고쳐 주는 일을 한다', 'pragmatic', { money: 300, wisdom: 1 }, '동네의 고장 난 가전이 줄지어 들어왔다.',
      tcheck('craft', 'wisdom', 5, '전압이 맞지 않아 토스터를 하나 태웠다.', { money: -80 })],
    ['라디오를 선물한다', 'caring', { bond: 3 }, '포켓몬은 라디오를 끌어안고 잤다.', { affection: 2 }],
    ['발전소 친구들을 보러 간다', 'curious', { wisdom: 2 }, '발전소에서 진화한 동족을 만났다.', { observe: 82 }],
  ]],
])).concat(companions(ofSpecies([66, 67, 68]), [
  ['species-machop-strength', 12, 70, '힘자랑 대회', m => `마을 장터에서 힘자랑 대회가 열린다. ${P(m, '이', '가')} 벌써 팔을 돌리며 몸을 풀고 있다.`, [
    ['출전시킨다', 'bold', { reputation: 2, money: 200 }, '쌀가마니 다섯 개를 한 번에 들어 우승했다.',
      { ...check('vitality', 8, '마지막 들기에서 미끄러졌다.', { joy: -1 }), training: 30 }],
    ['장터 짐 나르기를 돕는다', 'caring', { reputation: 1, vitality: -1 }, '상인들이 고맙다며 떡을 싸 주었다.', { world: { economy: 1 } }],
    ['응원만 한다', 'easygoing', { joy: 3 }, '다른 포켓몬들의 힘자랑을 구경했다.'],
  ]],
])).concat(companions(ofSpecies([147, 148, 149]), [
  ['species-dratini-collector', 14, 80, '수상한 수집가', m => `검은 양복을 입은 수집가가 찾아와 ${P(m, '을', '를')} 거액에 넘기라고 했다.`, [
    ['단호히 거절한다', 'caring', { bond: 5 }, '수집가는 명함만 남기고 떠났다.', { affection: 3, flag: 'dratini-refused' }],
    ['수집가의 정체를 조사한다', 'curious', { wisdom: 3, reputation: 2 }, '희귀 포켓몬 밀거래 조직의 꼬리를 잡아 경찰에 넘겼다.',
      { ...check('wisdom', 8, '단서를 찾지 못했다. 수집가는 다시 나타나지 않았다.', { joy: -1 }), world: { safety: 2 } }],
    ['협상하는 척 붙잡는다', 'bold', { courage: 3 }, '거래 장소에서 수집가의 포켓몬과 맞섰다.',
      { battle: { kind: 'villain' }, after: { win: { effects: { reputation: 3 }, world: { safety: 2 } }, lose: { effects: { joy: -3 } } } }],
  ]],
])).concat(companions(ofSpecies([302]), [
  ['species-sableye-gems', 10, 85, '보석상의 누명', m => `보석상 원석이 없어지자 주인이 ${P(m, '을', '를')} 범인으로 지목했다.`, [
    ['진짜 범인을 찾는다', 'bold', { reputation: 3, courage: 2 }, '진열장 뒤 쥐구멍에서 원석을 물어 간 다른 포켓몬을 찾아냈다.',
      check('wisdom', 8, '증거를 찾지 못해 원석값을 물어 주었다.', { money: -200 })],
    ['일해서 갚겠다고 한다', 'pragmatic', { wisdom: 2, vitality: -2 }, '한 달 동안 보석상에서 원석을 닦았다. 주인은 결국 누명이었음을 알고 사과했다.'],
    ['변상하고 끝낸다', 'easygoing', { money: -300, reputation: 1 }, '포켓몬은 억울한 듯 보석 같은 눈을 굴렸다.'],
  ]],
])).concat(companions(ofSpecies([447, 448]), [
  ['species-riolu-aura', 10, 75, '파동의 수련', m => `${P(m, '이', '가')} 눈을 감은 채 사람의 기분을 맞힌다. 산속의 파동 수련자가 소문을 듣고 찾아왔다.`, [
    ['산에서 수련한다', 'bold', { courage: 3, vitality: -2 }, '폭포 아래에서 파동을 모으는 법을 익혔다.', { training: 35, flag: 'riolu-aura-training' }],
    ['마음을 나누는 법을 배운다', 'caring', { bond: 5 }, '말하지 않아도 서로의 기분을 알게 됐다.', { affection: 3 }],
    ['수련자를 돌려보낸다', 'easygoing', { joy: 1 }, '지금처럼 지내는 것으로 충분했다.'],
  ]],
]));

export const TYPE_COMPANIONS = [
  ...fire, ...water, ...grass, ...electric, ...ice, ...fighting, ...poison, ...ground, ...flying,
  ...psychic, ...bug, ...rock, ...ghost, ...dragon, ...dark, ...steel, ...fairy, ...normal,
  ...eevee, ...species,
];
