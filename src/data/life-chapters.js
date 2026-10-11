// Life chapters: the long middle of a person's life. A child growing up (from a sleepless first year to a
// grandchild's walk), years with a spouse, the turns in the lives of a friend, sibling and rival, ageing, and the
// worries of the twenties. Rows: [id, min, max, title, body, options, meta]; see event-kit.js.
//
// The child's age is counted from the first child event ('lc-kid-night', urgent), which stores the parent's age
// at the birth as the flag `lc-born-<age>`. Later child stages require that flag, so they stay in step even when
// the child was born years after the wedding. Without the flag the age falls back to the years since marriage.
import { table, check, later, echoLater, choiceLater, localSpecies, farTown, region, working, option, fill } from './event-kit.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';
import { partnerOf } from '../sim/party.js';

const married = s => s.relationship.status === 'married';
const BORN = 'lc-born-';
const bornAt = s => { const key = Object.keys(s.flags).find(k => k.startsWith(BORN)); return key ? Number(key.slice(BORN.length)) : null; };
const kidAge = s => { const born = bornAt(s); return born !== null ? s.age - born : s.age - (s.relationship.marriedAt ?? s.age) - 1; };
const parent = s => s.relationship.children > 0 && bornAt(s) !== null;
const kid = (from, to, more) => s => parent(s) && kidAge(s) >= from && kidAge(s) <= to && (!more || more(s));
const born = (more = {}) => s => ({ flag: `${BORN}${s.age}`, ...more });
const grandkid = s => parent(s) && Boolean(s.flags['lc-grandkid']);

const friendOk = s => s.cast.friend.path !== 'gone';
const siblingOk = s => Boolean(s.cast.sibling) && s.cast.sibling.path !== 'gone';
const rivalOk = s => s.cast.rival.met && !['gone', 'unknown'].includes(s.cast.rival.path);
const partnerYears = s => { const p = partnerOf(s); return p ? s.age - p.joined : 0; };

/** A stat check that also uses the player's talent field. */
const talentCheck = (talent, ...args) => { const c = check(...args); c.challenge.talent = talent; return c; };
/** A storylet whose body and options share values drawn once (a species, a town). */
/**
 * Delayed records keep their text in the save until they arrive; names are filled in when the event is built so
 * the stored text has no raw {friend}… tokens.
 */
const fillDeep = (s, value) => typeof value === 'string' ? fill(s, value)
  : Array.isArray(value) ? value.map(v => fillDeep(s, v))
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(s, v)])) : value;
const fillFollows = (s, a) => {
  if (!a || typeof a !== 'object') return;
  if (a.follow) a.follow = a.follow.map(f => f.id.startsWith('pack-') ? { ...f, data: fillDeep(s, f.data) } : f);
  fillFollows(s, a.challenge?.failure);
  for (const branch of Object.values(a.after || {})) fillFollows(s, branch);
};
const filled = storylet => ({ ...storylet, build: s => { const event = storylet.build(s); event.choices.forEach(c => fillFollows(s, c)); return event; } });
const scene = (category, id, min, max, meta, make) => ({ id, category, min, max, ...meta,
  build: s => { const { title, body, options } = make(s); return { kind: 'choice', title: fill(s, title), body: fill(s, body), choices: options.map(o => option(s, o)) }; } });

// ── 1. A child grows up ──────────────────────────────────────────────────────────────────────────
const childhood = [
  ...table('family', [
    ['lc-kid-night', 19, 70, '아기와의 밤', '아이가 태어난 뒤로 밤이 길어졌다. 새벽 두 시, 또 울음소리가 들린다.', [
      ['내가 일어난다', 'caring', { bond: 3, vitality: -2 }, '아이를 안고 거실을 몇 바퀴 돌았다. 창밖이 밝아 올 즈음 둘 다 잠들었다.', born()],
      ['{partner|이|가} 요람을 지킨다', 'easygoing', { joy: 2 }, '파트너가 요람 곁에 엎드려 숨소리를 맞췄다. 아이가 거짓말처럼 조용해졌다.', born({ affection: 2 })],
      ['자장가를 지어 부른다', 'curious', { wisdom: 2, joy: 2 }, '가사가 엉망인 노래를 낮게 불렀다. 아이는 세 번째 소절에서 잠들었다.',
        born({ follow: [echoLater([6, 9], '그 자장가', '아이가 블록을 쌓으며 혼자 노래를 흥얼거렸다. 아기 때 밤마다 불러 주던, 가사가 엉망인 그 노래였다.', { joy: 4, bond: 2 })] })],
    ], { urgent: true, when: s => s.relationship.children > 0 && bornAt(s) === null }],
    ['lc-kid-steps', 20, 75, '아이의 첫걸음', '소파를 붙잡고 선 아이가 {partner|을|를} 빤히 바라본다. 손을 놓을 것 같다.', [
      ['팔을 벌리고 기다린다', 'caring', { bond: 3 }, '두 걸음 만에 주저앉았지만 아이는 울지 않고 웃었다.'],
      ['파트너가 한 발씩 물러난다', 'bold', { courage: 1, joy: 2 }, '파트너가 물러날 때마다 아이가 한 발씩 따라왔다. 모두 다섯 걸음이었다.', { affection: 3 }],
      ['얼른 사진기를 든다', 'easygoing', { joy: 3 }, '초점이 나간 사진 한 장이 남았다. 그래도 가장 좋아하는 사진이 됐다.'],
    ], { when: kid(1, 2) }],
    ['lc-kid-first-word', 20, 75, '첫 단어', '아이가 처음 또렷하게 한 말은 가족을 부르는 말이 아니었다. 파트너의 울음소리를 흉내 낸 소리였다.', [
      ['서운한 척한다', 'easygoing', { joy: 3 }, '서운한 얼굴을 했더니 아이가 그 소리를 한 번 더 냈다.'],
      ['파트너를 칭찬해 준다', 'caring', { bond: 2 }, '파트너가 자랑스러운 듯 가슴을 폈다.', { affection: 3 }],
      ['포켓몬 그림책을 사 온다', 'curious', { wisdom: 2, money: -80 }, '그날부터 잠들기 전 그림책 읽기가 시작됐다.'],
    ], { when: kid(1, 3) }],
  ]),
  scene('family', 'lc-kid-yard-guest', 21, 80, { when: kid(3, 6) }, s => {
    const id = localSpecies(s);
    return { title: '마당의 손님', body: `아이가 요즘 마당에 찾아오는 ${poke(id, '과', '와')} 노는 데 푹 빠졌다. 해 질 때까지 들어오지 않는다.`, options: [
      ['함께 지켜본다', 'curious', { wisdom: 2, joy: 2 }, `${poke(id, '이', '가')} 무엇을 좋아하는지 아이와 같이 적었다.`, { observe: id }],
      ['거리 두는 법을 가르친다', 'pragmatic', { wisdom: 3 }, '손을 뻗기 전에 먼저 기다리는 법을 알려 주었다. 아이는 그 말을 진지하게 들었다.'],
      ['나무열매를 놓아 둔다', 'caring', { bond: 2, money: -40 }, '마당 구석에 작은 그릇을 두었다. 아이가 매일 아침 그릇을 확인했다.',
        { follow: [echoLater([5, 8], '돌아온 손님', `그때 마당에 오던 ${poke(id, '이', '가')} 새끼를 데리고 다시 나타났다. 아이가 먼저 알아봤다.`, { joy: 4, bond: 2 }, 0.8)] }],
    ] };
  }),
  ...table('family', [
    ['lc-kid-fever', 21, 80, '밤중의 열', '자정 넘어 아이의 이마가 뜨겁다. 해열제가 하필 다 떨어졌다.', [
      ['아이를 업고 포켓몬센터로 뛴다', 'bold', { bond: 3 }, '센터 간호사가 문을 열어 주었다. 약 한 번에 아이는 금방 잠들었다.', check('vitality', 8, '도중에 숨이 차 몇 번이나 멈췄다. 다행히 열은 새벽에 내렸다.', { vitality: -4, bond: 2 })],
      ['물수건을 갈며 밤새 지킨다', 'caring', { bond: 4, vitality: -3 }, '아침에 아이가 배고프다고 했다. 그 말이 그렇게 반가울 수 없었다.'],
      ['이웃 의사에게 왕진을 부탁한다', 'pragmatic', { wisdom: 2, money: -120 }, '잠옷 차림으로 온 의사가 목감기라고 했다. 이웃의 고마움을 오래 기억했다.'],
    ], { when: kid(2, 7) }],
    ['lc-kid-why-battle', 22, 80, '왜 싸워?', '배틀 중계를 보던 아이가 물었다. "포켓몬은 아픈데 왜 싸워?"', [
      ['연습 배틀을 보여 준다', 'bold', { courage: 2 }, '기술을 쓰기 전과 후 파트너의 표정을 아이와 같이 살폈다.', { training: 15 }],
      ['모르겠다고 솔직하게 말한다', 'easygoing', { wisdom: 2, joy: 1 }, '같이 답을 찾아보자고 했다. 아이는 고개를 끄덕였다.',
        { follow: [echoLater([7, 10], '그때의 질문', '여행 중인 아이에게서 편지가 왔다. "왜 싸우는지 조금 알 것 같아요. 같이 강해지고 싶어서인가 봐요."', { joy: 5, bond: 2 })] }],
      ['돌봄 센터에 데려간다', 'caring', { bond: 3 }, '치료받는 포켓몬 곁을 지키는 트레이너들을 보며 아이가 오래 말이 없었다.'],
    ], { when: kid(5, 8) }],
  ]),
  ...table('family', [
    ['lc-kid-partner', 26, 85, '아이가 받을 파트너', '다음 달이면 아이가 열 살이다. 연구소에서 받을 첫 파트너를 두고 아이보다 내가 더 고민한다.', [
      ['연구소에 같이 가 본다', 'curious', { joy: 4 }, '', s => {
        const id = pick(s, region(s).starters);
        return { observe: id, outcome: `아이는 한참 망설이다 ${poke(id, '을', '를')} 골랐다. 고른 이유를 세 가지나 댔다.`,
          follow: [choiceLater([2, 3], '아이와 파트너의 다툼', '여행 준비 중인 아이가 파트너가 말을 안 듣는다며 울면서 돌아왔다.', [
            ['파트너 입장에서 생각해 보게 한다', 'caring', { bond: 3 }, '아이가 파트너 앞에 쪼그려 앉아 먼저 사과했다.'],
            ['연습 배틀 상대를 해 준다', 'bold', { courage: 2 }, '몇 번 지고 나서 아이와 파트너가 같은 쪽을 보기 시작했다.', { training: 15 }],
            ['며칠 그냥 둔다', 'easygoing', { joy: 1 }, '사흘 뒤 둘은 같은 이불 속에서 잠들어 있었다.'],
          ])] };
      }],
      ['함께 자란 포켓몬을 권한다', 'caring', { bond: 3 }, '아이는 늘 곁에 있던 포켓몬을 끌어안았다. 고민할 것도 없었다는 얼굴이었다.', { affection: 2 }],
      ['아이가 정하게 둔다', 'easygoing', { wisdom: 2 }, '아무 말도 하지 않기로 했다. 아이는 연구소에서 돌아와 결정을 먼저 들려주었다.'],
    ], { when: kid(9, 10) }],
    ['lc-kid-departure', 27, 85, '배웅하는 날', '아이가 파트너와 함께 첫 여행을 떠난다. 현관에 놓인 가방이 아이 몸집만 하다.', [
      ['가방에 비상금을 몰래 넣는다', 'caring', { bond: 3, money: -200 }, '봉투 겉에 "정말 급할 때만"이라고 적었다.',
        { follow: [echoLater([1, 2], '첫 엽서', '아이에게서 엽서가 왔다. "가방 속 봉투 봤어요. 아직 안 썼어요."', { joy: 5 })] }],
      ['지도를 펴고 길을 짚어 준다', 'pragmatic', { wisdom: 3 }, '포켓몬센터 위치마다 동그라미를 쳐 주었다.'],
      ['문 앞에서 손만 흔든다', 'easygoing', { bond: 2, joy: -1 }, '모퉁이를 돌기 전 아이가 한 번 뒤돌아봤다. 그거면 충분했다.'],
      ['첫 마을까지만 따라간다', 'bold', { courage: 1, vitality: -1 }, '마을 입구에서 아이가 이제 됐다며 등을 떠밀었다.'],
    ], { when: kid(10, 12) }],
    ['lc-kid-first-gym', 28, 88, '첫 체육관의 패배', '아이에게서 전화가 왔다. 첫 체육관에서 졌다고, 목소리가 잠겨 있다.', [
      ['타입 상성을 같이 정리한다', 'curious', { wisdom: 3 }, '전화로 한 시간 동안 상대 포켓몬의 기술을 하나씩 짚었다.',
        { follow: [echoLater([1, 1], '첫 배지', '아이가 배지 사진을 보내왔다. 손이 떨렸는지 사진이 흔들려 배지 모양이 잘 보이지 않았다.', { joy: 6 })] }],
      ['끝까지 들어 준다', 'caring', { bond: 3 }, '아이는 지는 순간 파트너의 얼굴이 가장 아팠다고 했다.'],
      ['"나도 처음엔 졌어"라고 말한다', 'easygoing', { joy: 2 }, '정말이냐며 아이가 웃었다. 사실이었다.'],
    ], { when: kid(11, 15) }],
    ['lc-kid-not-like-you', 30, 90, '닮고 싶지 않은 것', '말다툼 끝에 아이가 소리쳤다. "나는 절대 그렇게 안 살 거야."', [
      ['그 말의 이유를 묻는다', 'curious', { wisdom: 2, bond: 2 }, '한참 뒤 아이가 입을 열었다. 늘 바빠 보여서 싫었다고 했다.',
        check('bond', 10, '아이는 대답 대신 방문을 닫았다.', { joy: -2 }, { follow: [choiceLater([1, 2], '닫힌 문 앞', '그날 이후 아이와 하루에 세 마디도 하지 않는다. 오늘은 아이 방 앞에 저녁상이 그대로 남아 있다.', [
          ['문 앞에 편지를 둔다', 'caring', { bond: 3 }, '다음 날 아침, 편지 아래에 "알았어"라는 짧은 답이 적혀 있었다.'],
          ['파트너를 방에 들여보낸다', 'easygoing', { joy: 2 }, '한참 뒤 방 안에서 웃음소리가 새어 나왔다.', { affection: 2 }],
          ['규칙대로 밥은 같이 먹자고 한다', 'pragmatic', { wisdom: 1, joy: -1 }, '말없이 밥만 먹는 저녁이 이어졌다. 그래도 아이는 식탁에 앉았다.'],
        ])] })],
      ['하루 쉬고 같이 나간다', 'caring', { joy: 3, money: -100 }, '말은 별로 없었지만 돌아오는 길에 아이가 먼저 손을 잡았다.'],
      ['"그래, 너는 너대로 살아"', 'easygoing', { wisdom: 2, joy: -1 }, '아이가 의외라는 얼굴로 쳐다봤다.',
        { follow: [echoLater([5, 8], '그때의 대답', '어른이 된 아이가 말했다. 그때 화내지 않아서 오히려 오래 생각하게 됐다고.', { bond: 3, joy: 3 })] }],
    ], { when: kid(13, 16) }],
    ['lc-kid-career', 34, 92, '아이의 진로', '아이가 트레이너 대신 요리 학교에 가겠다고 했다. 파트너도 찬성했다고 한다.', [
      ['첫 학비를 보탠다', 'caring', { bond: 3, money: -400 }, '아이가 입학 서류에 보호자 서명을 받아 갔다.',
        { follow: [echoLater([3, 5], '아이의 첫 메뉴', '아이가 일하는 식당에서 처음으로 아이 이름이 붙은 메뉴가 나왔다. 포켓몬 간식도 함께 낸다고 했다.', { joy: 6 })] }],
      ['현실적인 질문을 몇 개 한다', 'pragmatic', { wisdom: 3 }, '아이는 질문마다 이미 답을 준비해 두고 있었다.'],
      ['배틀을 그만두는 게 아쉽다고 말한다', 'bold', { courage: 1, joy: -2 }, '말하고 바로 후회했다. 아이는 그래도 솔직하게 말해 줘서 고맙다고 했다.'],
    ], { when: kid(17, 20) }],
    ['lc-kid-moving-out', 37, 95, '아이 방의 짐', '독립하는 아이가 짐을 싸다가 머뭇거렸다. 집의 포켓몬 하나를 데려가고 싶다고 한다.', [
      ['주말마다 오가며 지내게 한다', 'caring', { bond: 3 }, '포켓몬이 두 집 살림을 시작했다. 일요일 저녁마다 현관이 시끌벅적하다.', { affection: 2 }],
      ['알 하나를 구해 준다', 'bold', { joy: 2, money: -200 }, '키우기 센터에서 알을 하나 받아 아이 손에 쥐여 주었다.',
        { follow: [echoLater([1, 2], '아이 집의 새 식구', '아이가 알에서 깬 포켓몬 사진을 보냈다. 첫 끼니를 거의 다 흘렸다고 한다.', { joy: 4 })] }],
      ['혼자 서는 연습부터 하라고 한다', 'pragmatic', { wisdom: 2 }, '아이는 조금 섭섭해했지만 고개를 끄덕였다.'],
    ], { when: kid(19, 23) }],
    ['lc-kid-came-back', 40, 98, '돌아온 아이', '연락도 없이 아이가 큰 가방을 들고 현관에 서 있었다. 일이 잘 안 됐다고만 했다.', [
      ['아무것도 묻지 않고 밥을 차린다', 'caring', { bond: 4 }, '아이는 두 그릇을 비우고 오래 잤다.',
        { follow: [choiceLater([1, 2], '아이의 다음 걸음', '집에 돌아온 지 한 해, 아이가 다시 일을 찾아보겠다며 고민을 털어놓았다.', [
          ['다시 떠나도록 돕는다', 'caring', { bond: 2, money: -300 }, '아이가 새 일터 근처에 방을 구했다. 보증금 일부를 보탰다.'],
          ['집안일을 나눠 맡긴다', 'pragmatic', { wisdom: 2, joy: 2 }, '아이가 집 앞 화단을 맡았다. 몇 달 만에 얼굴이 밝아졌다.'],
          ['서두르지 말라고 한다', 'easygoing', { joy: 2 }, '한 해를 더 함께 보냈다. 봄이 되자 아이는 스스로 짐을 쌌다.'],
        ])] }],
      ['같이 계획을 세운다', 'pragmatic', { wisdom: 3 }, '식탁에 종이를 펴고 할 수 있는 일을 적었다. 생각보다 많았다.'],
      ['파트너들과 산책을 나간다', 'easygoing', { joy: 2, vitality: 1 }, '말없이 걷다 보니 아이가 먼저 이야기를 꺼냈다.', { affection: 1 }],
    ], { when: kid(22, 30) }],
    ['lc-kid-paycheck', 40, 98, '아이의 첫 월급', '아이가 첫 월급으로 샀다며 상자를 내밀었다.', [
      ['그 자리에서 열어 본다', 'easygoing', { joy: 5 }, '파트너 몫의 간식까지 들어 있었다.', { affection: 2 }],
      ['"너 쓰지 그랬어"라고 한다', 'pragmatic', { joy: 2, wisdom: 1 }, '아이가 그럴 줄 알았다며 웃었다. 상자는 끝내 돌려받지 않았다.'],
      ['저녁은 내가 사겠다고 한다', 'caring', { bond: 3, money: -150 }, '계산대 앞에서 아이가 먼저 지갑을 꺼냈다. 결국 반씩 냈다.'],
    ], { when: kid(21, 28) }],
    ['lc-kid-wedding', 43, 100, '아이의 결혼', '아이가 결혼한다고 알려 왔다. 식에서 한마디 해 달라고 한다.', [
      ['준비한 축사를 읽는다', 'bold', { joy: 6, reputation: 1 }, '아이가 처음 걸음마하던 날 이야기를 했다. 하객 몇이 눈가를 훔쳤다.',
        { flag: 'lc-kid-wed', ...check('wisdom', 5, '종이를 쥔 손이 떨려 몇 줄을 건너뛰었다. 그래도 끝에는 박수가 나왔다.', { joy: 3 }, { flag: 'lc-kid-wed' }) }],
      ['말 대신 포켓몬들과 꽃길을 만든다', 'caring', { joy: 5 }, '파티 포켓몬들이 꽃잎을 물고 입장길을 따라 섰다.', { flag: 'lc-kid-wed', affection: 2 }],
      ['식 비용을 보탠다', 'pragmatic', { bond: 3, money: -500 }, '아이는 받지 않으려 했지만 결국 고맙다고 했다.', { flag: 'lc-kid-wed' }],
    ], { when: kid(25, 36) }],
    ['lc-grand-born', 55, 100, '손주', '아이에게서 전화가 왔다. 손주가 태어났다고 한다.', [
      ['첫 기차로 달려간다', 'bold', { joy: 6, money: -150 }, '신생아실 유리창 너머로 손주가 하품을 했다.', { flag: 'lc-grandkid' }],
      ['손수 만든 이불을 보낸다', 'caring', { bond: 3 }, '바느질이 삐뚤었지만 포켓몬 무늬만은 또렷했다.',
        { flag: 'lc-grandkid', follow: [echoLater([4, 6], '낡은 이불', '손주가 그 이불을 끌고 다닌다는 사진이 왔다. 귀퉁이가 다 해져 있었다.', { joy: 4 })] }],
      ['파트너와 축하 사진을 찍어 보낸다', 'easygoing', { joy: 3 }, '파트너가 카메라 앞에서 한껏 점잖은 표정을 지었다.', { flag: 'lc-grandkid', affection: 1 }],
    ], { when: s => parent(s) && !s.flags['lc-grandkid'] && (s.flags['lc-kid-wed'] || kidAge(s) >= 30) }],
  ]),
  scene('family', 'lc-grand-walk', 57, 100, { once: false, cooldown: 5, when: grandkid }, s => {
    const id = localSpecies(s);
    return { title: '손주와 산책', body: '놀러 온 손주가 {partner|과|와} 산책을 가자고 현관에서 신발을 신고 기다린다.', options: [
      ['풀숲의 포켓몬 이름을 알려 준다', 'curious', { wisdom: 2, joy: 2 }, `손주가 ${poke(id, '을', '를')} 가리키며 이름을 세 번 따라 했다.`, { observe: id }],
      ['손주를 파트너 등에 태운다', 'bold', { joy: 4 }, '파트너가 평소보다 훨씬 천천히 걸었다.', { affection: 2 }],
      ['벤치에서 쉬며 이야기한다', 'easygoing', { vitality: 2, joy: 2 }, '손주가 여행 이야기를 하나만 더 해 달라고 졸랐다.'],
    ] };
  }),
  scene('family', 'lc-grand-egg', 58, 100, { when: grandkid }, s => {
    const id = localSpecies(s);
    return { title: '손주가 주운 알', body: '손주가 뒷산에서 주인 없는 알을 주웠다며 두 손으로 받쳐 들고 왔다. 둥지는 이미 비어 있었다고 한다.', options: [
      ['함께 품어 부화시킨다', 'caring', { bond: 3 }, `손주와 번갈아 알을 돌봤다. 몇 주 뒤 ${poke(id, '이', '가')} 껍질을 깨고 나왔다.`, { join: id, joinOrigin: 'egg' }],
      ['돌봄 센터에 맡기자고 한다', 'pragmatic', { wisdom: 2 }, '센터 직원이 손주에게 알의 상태를 살피는 법을 알려 주었다.'],
      ['손주에게 맡겨 본다', 'easygoing', { joy: 2, bond: 1 }, '손주가 알을 안은 채로 잠들었다. 그 모습을 한참 들여다봤다.'],
    ] };
  }),
];

// ── 2. Years with a spouse ───────────────────────────────────────────────────────────────────────
const spouse = [
  ...table('family', [
    ['lc-sp-first-place', 24, 85, '처음 만난 곳', '결혼기념일 아침, {spouse|이|가} 처음 만난 곳에 다시 가 보자고 한다.', [
      ['그곳에 가 본다', 'caring', { joy: 5, bond: 2, money: -100 }, '가게 이름은 바뀌었지만 창가 자리는 그대로였다.'],
      ['그동안의 사진을 정리한다', 'curious', { wisdom: 2, joy: 3 }, '사진 속 포켓몬들이 해마다 조금씩 커져 있었다.',
        { follow: [echoLater([9, 12], '두 번째 앨범', '{spouse|이|가} 오래전 함께 만든 앨범 옆에 새 앨범을 꽂았다. 두 권을 나란히 놓고 한참 웃었다.', { joy: 5, bond: 2 })] }],
      ['평소처럼 보낸다', 'easygoing', { joy: 2 }, '저녁을 먹고 산책하고 잤다. 그게 좋았다.'],
    ], { when: married }],
    ['lc-sp-new-path', 30, 60, '배우자의 새 길', '{spouse|이|가} 다니던 일을 그만두고 포켓몬 간호사 공부를 하고 싶다고 했다.', [
      ['학비를 함께 마련한다', 'caring', { bond: 3, money: -400 }, '{spouse|이|가} 책상에 교재를 쌓아 두고 밤마다 공부했다.',
        { follow: [choiceLater([2, 4], '첫 근무지', '간호사 자격을 딴 {spouse|이|가} 첫 근무지를 고민한다. 집에서 먼 큰 센터와 동네 작은 센터다.', [
          ['큰 센터를 권한다', 'bold', { courage: 2, joy: 2 }, '{spouse|은|는} 매일 첫차를 탔다. 지쳐 보여도 즐거워 보였다.'],
          ['동네 센터를 권한다', 'caring', { bond: 3 }, '{spouse|이|가} 동네 포켓몬들 이름을 하나씩 외워 왔다.'],
          ['스스로 정하게 둔다', 'easygoing', { joy: 2 }, '{spouse|은|는} 두 곳을 다 가 보고 나서 정했다.'],
        ])] }],
      ['1년만 더 생각해 보자고 한다', 'pragmatic', { wisdom: 2, joy: -1 }, '{spouse|은|는} 알겠다고 했지만 교재는 버리지 않았다.'],
      ['같이 공부한다', 'curious', { wisdom: 4, vitality: -2 }, '식탁이 공부방이 됐다. 시험 문제를 서로 내 주었다.'],
    ], { when: married }],
  ]),
  scene('family', 'lc-sp-journey', 30, 75, { when: married }, s => {
    const t = farTown(s), id = pick(s, t.pool);
    return { title: '둘만의 여행', body: `{spouse|이|가} 달력에 동그라미를 쳤다. 이번 휴가에는 ${t.region}지방 ${t.name}까지 가 보자고 한다.`, options: [
      ['기차로 천천히 간다', 'easygoing', { joy: 5, money: -300 }, `창밖 풍경을 보다 졸다 했다. ${t.name}에서 ${poke(id, '을', '를')} 처음 봤다.`, { observe: id }],
      ['파트너들과 걸어서 간다', 'bold', { vitality: 3, courage: 2 }, '발에 물집이 잡혔지만 둘 다 끝까지 걸었다.', { training: 15 }],
      ['이번엔 가까운 동네로 간다', 'pragmatic', { joy: 2 }, '두 정거장 떨어진 마을도 처음 보는 것투성이였다.'],
    ] };
  }),
  ...table('family', [
    ['lc-sp-silence', 30, 70, '말이 줄어든 저녁', '언제부턴가 저녁 식탁에서 {spouse|과|와} 나눌 말이 없다. 수저 소리만 크다.', [
      ['먼저 오늘 있었던 일을 꺼낸다', 'caring', { bond: 4, joy: 3 }, '{spouse|이|가} 수저를 내려놓고 웃었다. 그날은 늦게까지 이야기했다.',
        check('bond', 12, '{spouse|은|는} 짧게 대답하고 방으로 들어갔다.', { joy: -3 }, { follow: [choiceLater([1, 2], '다시 식탁에서', '{spouse|이|가} 오랜만에 둘이 저녁을 먹자고 했다. 할 이야기가 있다고 한다.', [
          ['먼저 사과한다', 'caring', { bond: 4, joy: 2 }, '{spouse}도 미안했다고 했다. 둘 다 같은 걸 오래 참고 있었다.'],
          ['서운했던 일을 솔직하게 말한다', 'bold', { courage: 2, bond: 2 }, '목소리가 몇 번 높아졌지만 끝까지 자리를 지켰다.'],
          ['다음에 이야기하자고 한다', 'easygoing', { joy: -3 }, '{spouse|은|는} 알겠다고 했다. 식탁이 다시 조용해졌다.'],
        ])] })],
      ['부부 상담을 예약한다', 'pragmatic', { wisdom: 3, money: -200 }, '상담사가 매일 십 분씩 서로의 하루를 묻는 숙제를 냈다.',
        { follow: [echoLater([2, 3], '십 분의 숙제', '상담실에서 받은 숙제를 아직 하고 있다. 십 분이 한 시간이 되는 날도 있다.', { bond: 3, joy: 3 })] }],
      ['각자 시간이 필요하다고 생각한다', 'easygoing', { joy: 1 }, '서로 조금씩 거리를 두었다.',
        { follow: [choiceLater([2, 3], '다시 식탁에서', '{spouse|이|가} 오랜만에 둘이 저녁을 먹자고 했다. 할 이야기가 있다고 한다.', [
          ['먼저 사과한다', 'caring', { bond: 4, joy: 2 }, '{spouse}도 미안했다고 했다. 둘 다 같은 걸 오래 참고 있었다.'],
          ['서운했던 일을 솔직하게 말한다', 'bold', { courage: 2, bond: 2 }, '목소리가 몇 번 높아졌지만 끝까지 자리를 지켰다.'],
          ['다음에 이야기하자고 한다', 'easygoing', { joy: -3 }, '{spouse|은|는} 알겠다고 했다. 식탁이 다시 조용해졌다.'],
        ])] }],
    ], { when: married }],
    ['lc-sp-stash', 28, 70, '비상금 봉투', '{spouse|이|가} 서랍 깊숙한 곳에서 내 비상금 봉투를 찾아 들고 섰다.', [
      ['같이 쓰자고 한다', 'caring', { joy: 5, money: -200 }, '그 돈으로 둘이 오랜만에 비싼 저녁을 먹었다.'],
      ['용도를 설명한다', 'pragmatic', { joy: 2 }, '파트너 생일 선물 자금이었다고 하자 {spouse|이|가} 웃으며 봉투를 돌려줬다.', check('wisdom', 5, '설명이 길어질수록 더 수상해졌다. 봉투는 가계부로 들어갔다.', { joy: -1 })],
      ['{spouse}의 비상금도 찾아낸다', 'bold', { joy: 3, courage: 1 }, '서로의 봉투를 맞바꿔 들고 한참 웃었다.'],
    ], { when: married }],
    ['lc-sp-hospital', 40, 85, '병실의 밤', '{spouse|이|가} 수술을 받게 됐다. 큰 수술은 아니라지만 보호자 침대가 좁다.', [
      ['매일 밤 곁을 지킨다', 'caring', { bond: 5, vitality: -2 }, '퇴원하던 날 {spouse|이|가} 내 손이 거칠어졌다고 했다.', check('vitality', 10, '보름째 되던 날 같이 쓰러질 뻔했다. 간호사가 집에 가서 자라고 등을 떠밀었다.', { vitality: -5, bond: 2 })],
      ['파트너를 병원 정원에 데려간다', 'easygoing', { joy: 3 }, '창문 너머로 파트너를 본 {spouse|이|가} 입원 후 처음으로 크게 웃었다.',
        { affection: 2, follow: [echoLater([1, 1], '퇴원 후 첫 산책', '{spouse|과|와} 천천히 동네를 한 바퀴 돌았다. 파트너가 몇 번이나 뒤를 돌아보며 기다렸다.', { joy: 4, bond: 2 })] }],
      ['간병인을 쓰고 일을 지킨다', 'pragmatic', { wisdom: 1, money: -400 }, '저녁마다 들러 그날 있었던 일을 들었다.'],
    ], { when: married }],
    ['lc-sp-cushion', 25, 75, '방석 하나', '{spouse}의 포켓몬과 {partner|이|가} 창가 방석 하나를 두고 몇 주째 다툰다.', [
      ['방석을 하나 더 산다', 'pragmatic', { joy: 2, money: -60 }, '둘 다 새 방석은 거들떠보지 않았다.'],
      ['둘을 같이 훈련시킨다', 'bold', { courage: 1 }, '연습이 끝나자 둘은 지쳐서 같은 방석에 나란히 누웠다.', { training: 20 }],
      ['{spouse|과|와} 웃으며 지켜본다', 'easygoing', { joy: 3 }, '결국 방석은 반씩 나눠 쓰는 것으로 정리된 모양이다.', { affection: 1 }],
    ], { when: s => married(s) && s.party.length > 0 }],
  ]),
  scene('family', 'lc-sp-slow-walk', 60, 100, { once: false, cooldown: 6, when: married }, s => {
    const id = localSpecies(s);
    return { title: '나란히 걷기', body: '아침마다 {spouse|과|와} 걷는 길이 해마다 조금씩 짧아진다.', options: [
      ['걸음을 맞춘다', 'caring', { bond: 3, vitality: 2 }, '서두르지 않으니 길가의 꽃이 보였다.'],
      ['새 산책길을 찾는다', 'curious', { wisdom: 2, joy: 2 }, fill(s, `처음 가 본 개울가에서 ${poke(id, '을', '를')} 봤다. {spouse|이|가} 먼저 발견했다.`), { observe: id }],
      ['오늘은 집에서 차를 마신다', 'easygoing', { joy: 2 }, '창밖을 보며 별말 없이 차 한 주전자를 비웠다.'],
    ] };
  }),
  ...table('family', [
    ['lc-sp-teahouse', 58, 85, '둘이 하는 가게', '{spouse|이|가} 은퇴하면 작은 나무열매 찻집을 해 보자고 한다.', [
      ['해 본다', 'bold', { joy: 4, money: -600 }, '간판은 {spouse|이|가} 직접 썼다. 첫날 손님은 셋이었다.',
        { follow: [choiceLater([2, 3], '찻집 두 해째', '찻집에 단골이 생겼지만 둘이 꾸리기엔 일이 많아졌다.', [
          ['아르바이트를 둔다', 'pragmatic', { joy: 2, money: -200 }, '동네 학생이 주말을 맡았다.'],
          ['문 여는 날을 줄인다', 'easygoing', { vitality: 3, joy: 2 }, '일주일에 사흘만 열었다. 단골들은 그 사흘을 기다렸다.'],
          ['가게를 넘긴다', 'caring', { money: 400, joy: -1 }, '단골이던 젊은 부부가 가게를 이어받았다.'],
        ])] }],
      ['텃밭부터 가꾼다', 'caring', { joy: 3, vitality: 2 }, '마당 한쪽에 나무열매 묘목을 심었다.', { flag: 'garden' }],
      ['꿈으로 남겨 둔다', 'easygoing', { joy: 1 }, '가끔 가게 이름을 지어 보며 웃었다.'],
    ], { when: married }],
    ['lc-sp-letters', 40, 85, '오래된 편지', '짐을 정리하다가 연애 시절 {spouse|이|가} 보낸 편지 묶음이 나왔다.', [
      ['소리 내어 읽어 준다', 'bold', { joy: 4, bond: 2 }, '{spouse|이|가} 그만 읽으라며 편지를 빼앗았다. 귀가 빨갰다.'],
      ['답장을 새로 쓴다', 'caring', { bond: 3 }, '수십 년 늦은 답장을 {spouse}의 베개 밑에 넣어 두었다.',
        { follow: [echoLater([3, 6], '서랍 속 답장', '{spouse}의 서랍에서 그때 쓴 답장이 나왔다. 몇 번을 펼쳐 봤는지 접힌 자국이 하얗게 닳아 있었다.', { joy: 4 })] }],
      ['조용히 다시 넣어 둔다', 'easygoing', { wisdom: 1, joy: 1 }, '묶음 끈을 처음처럼 묶어 두었다.'],
    ], { when: married }],
  ]),
];

// ── 3. Friend, sibling, rival and family at the turns of their lives ────────────────────────────
const sorry = '뒤늦은 편지';
const sorryBody = '{friend|이|가} 짧은 편지를 보냈다. "그때 내가 너무 쉽게 믿었어."';
const sorryRows = [
  ['바로 전화를 건다', 'caring', { bond: 3, joy: 4 }, '첫마디가 동시에 "미안"이었다.', { cast: { friend: { affinity: 12 } } }],
  ['답장을 쓴다', 'curious', { wisdom: 2, joy: 2 }, '석 장짜리 답장을 보냈다. 다음 달 둘은 예전 식당에서 만났다.', { cast: { friend: { affinity: 8 } } }],
  ['아직은 어렵다', 'pragmatic', { joy: -1 }, '편지를 책상 위에 올려 두었다.'],
];
const cast = [
  ...table('cast', [
    ['lc-fr-speech', 24, 45, '축사 부탁', '{friend|이|가} 결혼한다며 축사를 맡아 달라고 했다.', [
      ['어린 시절 이야기로 웃긴다', 'bold', { joy: 4 }, '비밀기지 이야기에 {friend|이|가} 얼굴을 감쌌다. 식장이 한참 웃었다.',
        { cast: { friend: { affinity: 8, married: true } }, ...check('courage', 5, '첫 농담에서 아무도 웃지 않았다. 남은 원고를 그냥 읽었다.', { joy: -1 }, { cast: { friend: { affinity: 3, married: true } } }) }],
      ['짧게 진심만 담는다', 'caring', { bond: 3 }, '세 문장으로 끝냈다. {friend|이|가} 식이 끝나고 그 종이를 달라고 했다.',
        { cast: { friend: { affinity: 6, married: true } }, follow: [echoLater([5, 9], '액자 속 축사', '{friend}의 집에 갔더니 그날 축사 종이가 액자에 걸려 있었다.', { joy: 3, bond: 2 })] }],
      ['파트너들과 축하 공연을 한다', 'easygoing', { joy: 3 }, '포켓몬들이 박자를 놓쳤지만 박수는 가장 컸다.', { affection: 2, cast: { friend: { affinity: 5, married: true } } }],
    ], { when: s => friendOk(s) && !s.cast.friend.married && s.cast.friend.affinity >= 45 }],
    ['lc-fr-closed', 28, 60, '문 닫은 가게', '{friend|이|가} 몇 년 꾸려 온 일을 접었다. 전화 너머 목소리가 낯설게 가라앉아 있었다.', [
      ['일자리를 같이 알아본다', 'pragmatic', { wisdom: 2 }, '구인 공고를 함께 뒤지며 이력서를 고쳐 주었다.',
        { cast: { friend: { affinity: 8, path: 'unemployed' } }, follow: [echoLater([1, 3], '{friend}의 새 명함', '{friend|이|가} 새 명함을 보내왔다. 뒷면에 "그때 고마웠어"라고 손으로 적혀 있었다.', { joy: 4 }, 0.8)] }],
      ['돈을 빌려준다', 'caring', { bond: 2, money: -500 }, '{friend|은|는} 꼭 갚겠다며 차용증을 직접 썼다.',
        { cast: { friend: { affinity: 12, path: 'unemployed' } }, follow: [later('friend-repay', [2, 5], 0.7, { amount: 500 })] }],
      ['말없이 들어 준다', 'caring', { bond: 2 }, '밤늦도록 {friend}의 이야기를 들었다. 해결된 건 없지만 목소리가 조금 밝아졌다.', { cast: { friend: { affinity: 6, path: 'unemployed' } } }],
    ], { when: s => friendOk(s) && ['shopkeeper', 'worker'].includes(s.cast.friend.path) && s.cast.friend.affinity >= 30 }],
    ['lc-fr-ward', 40, 85, '병문안', '{friend|이|가} 입원했다는 소식을 다른 동창에게서 들었다.', [
      ['꽃 대신 파트너를 데려간다', 'caring', { joy: 3 }, '병원 정원에서 {friend|이|가} 파트너를 쓰다듬으며 오래 앉아 있었다.', { affection: 1, cast: { friend: { affinity: 8 } } }],
      ['어린 시절 사진을 뽑아 간다', 'curious', { wisdom: 1, bond: 2 }, '사진마다 누가 먼저 울었는지를 두고 다퉜다.',
        { cast: { friend: { affinity: 6 } }, follow: [echoLater([1, 2], '퇴원 소식', '{friend|이|가} 퇴원했다며 그 사진을 거실에 걸었다고 연락해 왔다.', { joy: 4 })] }],
      ['바빠서 전화만 한다', 'pragmatic', { joy: -2 }, '짧은 통화였다. 끊고 나서 한참 휴대폰을 들여다봤다.', { cast: { friend: { affinity: -3 } } }],
    ], { when: friendOk }],
  ]),
  scene('cast', 'lc-fr-secret-base', 35, 75, { when: friendOk }, s => {
    const id = localSpecies(s);
    return { title: '비밀기지', body: '{friend|이|가} 어릴 적 비밀기지가 있던 뒷산 공터가 곧 공사에 들어간다고 알려 왔다.', options: [
      ['마지막으로 같이 가 본다', 'caring', { joy: 4 }, fill(s, `녹슨 깡통 속에 그때 묻은 쪽지가 그대로 있었다. 돌아오는 길에 ${poke(id, '이', '가')} 풀숲에서 고개를 내밀었다.`), { observe: id, cast: { friend: { affinity: 8 } } }],
      ['주민 모임에서 반대 의견을 낸다', 'bold', { courage: 3, reputation: 1 }, '공터 절반이 작은 숲으로 남게 됐다. {friend|이|가} 그 소식을 듣고 한참 웃었다.',
        { world: { ecology: 2 }, cast: { friend: { affinity: 6 } }, ...check('courage', 12, '의견은 기록에만 남았다. 그래도 {friend|과|와} 함께 목소리를 냈다.', { joy: -1 }, { cast: { friend: { affinity: 4 } } }) }],
      ['사진으로만 남긴다', 'easygoing', { joy: 1, wisdom: 1 }, '보내온 사진 속 공터는 기억보다 훨씬 작았다.'],
    ] };
  }),
  ...table('cast', [
    ['lc-fr-farewell', 30, 70, '먼 이사', '{friend|이|가} 다른 지방으로 이사한다. 짐 싸는 날 와 줄 수 있냐고 묻는다.', [
      ['이삿짐을 나른다', 'caring', { bond: 2, vitality: -2 }, '마지막 상자를 싣고 둘이 빈방 바닥에 앉아 컵라면을 먹었다.', s => ({ cast: { friend: { affinity: 6, town: farTown(s).id } } })],
      ['송별회를 연다', 'bold', { joy: 4, money: -150 }, '옛 친구들이 다 모였다. {friend|이|가} 끝내 울었다.', s => ({ cast: { friend: { affinity: 8, town: farTown(s).id } } })],
      ['"금방 놀러 갈게"라고 한다', 'easygoing', { joy: 1 }, '정말 갈 수 있을지는 둘 다 몰랐다.',
        s => ({ cast: { friend: { town: farTown(s).id } }, follow: [echoLater([2, 4], '{friend}의 새 동네', '{friend|이|가} 새 동네 사진을 보냈다. 창밖으로 처음 보는 포켓몬들이 지나간다고 했다.', { joy: 3 }, 0.8)] })],
    ], { when: s => friendOk(s) && s.cast.friend.town === s.town }],
    ['lc-fr-old-pals', 62, 100, '느린 승부', '{friend|과|와} 매주 공원 벤치에서 만나 옛 배틀 기록을 펼쳐 놓고 수를 다툰다.', [
      ['옛날 이야기로 빠진다', 'caring', { joy: 3 }, '결국 오늘도 전술 이야기는 십 분, 옛날 이야기는 두 시간이었다.', { cast: { friend: { affinity: 4 } } }],
      ['새 전술을 연구해 온다', 'curious', { wisdom: 3 }, '{friend|이|가} 그 전술에 구멍이 있다며 신나게 따졌다.', { training: 10 }],
      ['말없이 볕을 쬔다', 'easygoing', { vitality: 2, joy: 2 }, '포켓몬들이 발치에서 졸았다. 둘도 졸았다.', { affection: 1 }],
    ], { once: false, cooldown: 6, when: s => friendOk(s) && s.cast.friend.affinity >= 30 }],
    ['lc-fr-rumor', 20, 55, '어긋난 말', '내가 했다는 말이 부풀려져 {friend}의 귀에 들어갔다. 연락이 끊긴 지 두 달째다.', [
      ['찾아가서 직접 설명한다', 'bold', { bond: 3 }, '{friend|이|가} 한숨을 쉬더니 들어오라고 했다.',
        { cast: { friend: { affinity: 8 } }, ...check('bond', 10, '{friend|은|는} 끝까지 듣지 않고 문을 닫았다.', { joy: -3 }, { cast: { friend: { affinity: -5 } }, follow: [choiceLater([2, 4], sorry, sorryBody, sorryRows)] }) }],
      ['시간을 둔다', 'easygoing', { joy: -1 }, '휴대폰에 쓰다 만 메시지가 쌓였다.', { cast: { friend: { affinity: -4 } }, follow: [choiceLater([2, 4], sorry, sorryBody, sorryRows, 0.8)] }],
      ['공통 친구에게 부탁한다', 'pragmatic', { wisdom: 1 }, '오해는 조금 풀렸지만 직접 들은 말은 아니었다.', { cast: { friend: { affinity: 3 } } }],
    ], { when: s => friendOk(s) && s.cast.friend.affinity >= 30 }],
    // Sibling
    ['lc-sib-wedding', 22, 55, '{sibling}의 결혼식', '{sibling|이|가} 결혼한다. 가족 대표로 한마디 해 달라고 한다.', [
      ['어릴 때 싸운 이야기로 시작한다', 'bold', { joy: 4 }, '{sibling|이|가} 단상 아래에서 주먹을 쥐어 보였다. 하객들이 웃었다.', { cast: { sibling: { affinity: 6 } } }],
      ['부모님 대신 감사 인사를 전한다', 'caring', { bond: 3 }, '말을 마치고 돌아보니 부모님이 손수건을 쥐고 있었다.', { cast: { sibling: { affinity: 8 } } }],
      ['축의금을 넉넉히 한다', 'pragmatic', { joy: 1, money: -400 }, '{sibling|이|가} 봉투를 열어 보고 전화로 고맙다고 했다.', { cast: { sibling: { affinity: 5 } } }],
    ], { when: siblingOk }],
    ['lc-sib-care', 35, 75, '부모님 돌봄', '고향 부모님이 부쩍 기력이 없다. {sibling|이|가} 돌봄을 어떻게 나눌지 이야기하자고 한다.', [
      ['고향에 자주 내려간다', 'caring', { bond: 3, vitality: -2 }, '격주로 기차를 탔다. 부모님 집 냉장고가 조금씩 채워졌다.', { cast: { sibling: { affinity: 8 } } }],
      ['비용을 더 맡는다', 'pragmatic', { wisdom: 1, money: -500 }, '{sibling|은|는} 몸으로, 나는 돈으로 돕기로 했다.', { cast: { sibling: { affinity: 6 } } }],
      ['{sibling}에게 맡긴다', 'easygoing', { joy: 1 }, '가까이 사는 쪽이 낫다고 말했다. {sibling|은|는} 대답이 없었다.',
        { cast: { sibling: { affinity: -8 } }, follow: [choiceLater([2, 3], '{sibling}의 하소연', '{sibling|이|가} 혼자 부모님을 돌보느라 지쳤다며 전화로 목이 메었다.', [
          ['당장 내려간다', 'caring', { bond: 3, vitality: -2 }, '한 달을 고향에서 지냈다. 그동안 {sibling|이|가} 처음으로 푹 잤다.', { cast: { sibling: { affinity: 10 } } }],
          ['돌봄 도우미를 구한다', 'pragmatic', { wisdom: 1, money: -300 }, '주 3일 도우미가 오기로 했다. {sibling}의 목소리가 조금 풀렸다.', { cast: { sibling: { affinity: 5 } } }],
          ['미안하다는 말만 한다', 'easygoing', { joy: -2 }, '{sibling|은|는} 대답 없이 전화를 끊었다.', { cast: { sibling: { affinity: -6 } } }],
        ])] }],
    ], { when: s => siblingOk(s) && s.cast.family.path !== 'gone' }],
    ['lc-sib-shop', 28, 60, '{sibling}의 가게', '{sibling|이|가} 포켓몬 용품 가게를 열었다가 반년 만에 빚을 졌다.', [
      ['함께 장부를 본다', 'curious', { wisdom: 3 }, '새는 돈 세 군데를 찾았다. 가게는 다음 분기에 겨우 흑자가 났다.',
        { cast: { sibling: { affinity: 8, path: 'shopkeeper' } }, ...talentCheck('craft', 'wisdom', 10, '결국 가게를 접었다. 그래도 {sibling|은|는} 같이 봐 줘서 고맙다고 했다.', { joy: -2 }, { cast: { sibling: { affinity: 4, path: 'unemployed' } } }) }],
      ['돈을 보탠다', 'caring', { bond: 2, money: -600 }, '{sibling|은|는} 그 돈으로 밀린 물건값부터 갚았다.',
        { cast: { sibling: { affinity: 10, path: 'shopkeeper' } }, follow: [later('sibling-return', [4, 8], 0.6)] }],
      ['스스로 해결하게 둔다', 'pragmatic', { wisdom: 1 }, '조언 몇 마디만 보탰다. {sibling|은|는} 조금 서운한 눈치였다.', { cast: { sibling: { affinity: -4 } } }],
    ], { when: s => siblingOk(s) && s.cast.sibling.path !== 'shopkeeper' }],
    ['lc-sib-old-house', 55, 95, '고향 집 정리', '부모님이 떠나고 비어 있던 고향 집을 {sibling|과|와} 함께 정리한다.', [
      ['물건마다 이야기를 나눈다', 'caring', { bond: 3, joy: -1 }, '어릴 적 키를 재던 문틀 앞에서 둘이 오래 서 있었다.', { cast: { sibling: { affinity: 8 } } }],
      ['집을 팔아 반씩 나눈다', 'pragmatic', { money: 600, wisdom: 1 }, '계약서에 도장을 찍고 둘이 말없이 국밥을 먹었다.', { cast: { sibling: { affinity: 2 } } }],
      ['집을 남겨 두고 함께 쓴다', 'bold', { joy: 3, money: -200 }, '지붕만 고치고 대문 열쇠를 하나씩 나눠 가졌다.',
        { cast: { sibling: { affinity: 6 } }, follow: [echoLater([2, 5], '고향 집의 여름', '여름마다 {sibling}의 가족과 고향 집에 모였다. 마당에 야생 포켓몬이 다시 찾아왔다.', { joy: 5 })] }],
    ], { when: s => siblingOk(s) && s.cast.family.path === 'gone' }],
    // Rival
    ['lc-rv-injury', 30, 70, '라이벌의 부상', '{rival|이|가} 경기 중 사고로 크게 다쳐 은퇴를 고민한다는 기사를 봤다.', [
      ['병실을 찾아간다', 'caring', { bond: 2 }, '{rival|은|는} 처음엔 퉁명스러웠지만, 돌아갈 때 다음 주에도 오라고 했다.', { cast: { rival: { affinity: 12 } } }],
      ['"빨리 나아서 붙자"고 문자한다', 'bold', { courage: 2 }, '답장은 한 글자였다. "당연."',
        { cast: { rival: { affinity: 6 } }, follow: [echoLater([1, 3], '재활 후 첫 경기', '{rival|이|가} 재활을 마치고 첫 경기에서 이겼다. 인터뷰에서 아직 빚진 승부가 있다고 말했다.', { courage: 2, joy: 3 })] }],
      ['은퇴도 길이라고 말해 준다', 'pragmatic', { wisdom: 2 }, '몇 달 뒤 {rival|은|는} 은퇴를 발표했다. 회견 마지막 줄에 내 이름이 있었다.', { cast: { rival: { affinity: 3, path: 'retired' } } }],
    ], { when: s => rivalOk(s) && ['trainer', 'elite', 'gymleader'].includes(s.cast.rival.path) }],
    ['lc-rv-grudge', 25, 65, '묵은 앙금', '{rival|과|와} 오래전 한 경기의 판정을 두고 아직도 말을 섞지 않는다. 같은 행사에 둘 다 초대받았다.', [
      ['먼저 인사한다', 'caring', { bond: 2 }, '{rival|이|가} 잠시 멈칫하더니 고개를 숙였다. 행사 내내 옆자리에 앉았다.',
        { cast: { rival: { affinity: 10 } }, ...check('bond', 8, '{rival|은|는} 못 본 척 지나갔다. 그래도 먼저 인사한 건 잘한 일이었다.', { joy: -1 }, { cast: { rival: { affinity: 2 } } }) }],
      ['그날 경기 영상을 같이 보자고 한다', 'curious', { wisdom: 3 }, '돌려 보니 둘 다 틀렸다. 그걸 확인하고 같이 웃었다.', { cast: { rival: { affinity: 10 } } }],
      ['행사에 가지 않는다', 'easygoing', { joy: 1 }, '그날 저녁 집에서 파트너와 조용히 보냈다.', { cast: { rival: { affinity: -3 } } }],
    ], { when: s => rivalOk(s) && s.cast.rival.affinity < 50 }],
    ['lc-rv-class', 30, 75, '라이벌의 교실', '{rival|이|가} 아이들을 위한 배틀 교실을 열었다며 하루 특별 강사로 와 달라고 한다.', [
      ['시범 배틀을 맡는다', 'bold', { courage: 2 }, '아이들 앞에서 {rival|과|와} 맞붙었다.',
        { battle: { kind: 'rival' }, after: { win: { effects: { reputation: 2 }, cast: { rival: { affinity: 5 } } }, lose: { effects: { joy: -1 }, cast: { rival: { affinity: 8 } } } } }],
      ['돌봄 수업을 맡는다', 'caring', { bond: 3, reputation: 1 }, '배틀 뒤 상처를 살피는 법을 가르쳤다. {rival|이|가} 뒤에서 같이 받아 적었다.', { cast: { rival: { affinity: 6 } } }],
      ['정중히 거절한다', 'pragmatic', { wisdom: 1 }, '다음 기회에 가겠다고 답장을 보냈다.'],
    ], { when: s => rivalOk(s) && ['trainer', 'elite', 'gymleader', 'retired', 'reformed'].includes(s.cast.rival.path) }],
    ['lc-rv-last-match', 60, 90, '마지막 대결', '{rival|이|가} 지팡이를 짚고 찾아왔다. "몸이 더 굳기 전에 한 판 하자."', [
      ['전력으로 맞선다', 'bold', { courage: 3 }, '오랜만에 경기장 흙을 밟았다.',
        { battle: { kind: 'rival' }, after: { win: { effects: { joy: 5 }, cast: { rival: { affinity: 6 } } }, lose: { effects: { joy: 2 }, cast: { rival: { affinity: 8 } } } },
          follow: [echoLater([2, 5], '액자 속 기록지', '{rival|이|가} 그날 배틀 기록지를 액자에 넣어 보냈다. 뒷면에 "다음에도"라고 적혀 있었다.', { joy: 4 })] }],
      ['승부 대신 차를 마신다', 'caring', { bond: 3, joy: 3 }, '서로의 첫 포켓몬 이야기만으로 해가 졌다.', { cast: { rival: { affinity: 6 } } }],
      ['"다음에 하자"고 한다', 'easygoing', { joy: 1 }, '{rival|은|는} 다음은 없을지도 모른다며 웃었다.'],
    ], { when: s => s.cast.rival.met && s.cast.rival.path !== 'gone' }],
    // Parents
    ['lc-fam-portrait', 35, 80, '가족사진', '고향 부모님이 사진관에서 가족사진을 한 장 남기고 싶다고 했다.', [
      ['모두 모여 찍는다', 'caring', { joy: 5, bond: 2, money: -150 }, '사진사가 웃으라고 할 때마다 누군가 먼저 웃음을 터뜨렸다.'],
      ['파트너들도 함께 찍는다', 'easygoing', { joy: 4 }, '포켓몬들이 앞줄에 앉으니 사람들 얼굴이 반쯤 가려졌다. 그래서 더 좋았다.', { affection: 2 }],
      ['다음에 하자고 한다', 'pragmatic', { joy: -1 }, '요즘 바쁘다고 말했다.',
        { follow: [echoLater([3, 6], '찍지 못한 사진', '부모님 앨범의 마지막 장이 비어 있었다. 그때 찍을걸 그랬다.', { joy: -3, wisdom: 2 }, 0.6)] }],
    ], { when: s => s.cast.family.path !== 'gone' }],
  ]),
];

// ── 4. Growing old ───────────────────────────────────────────────────────────────────────────────
const later50 = [
  ...table('stage', [
    ['lc-old-recheck', 50, 72, '재검사 권고', '검진 결과지에 재검사 권고가 붙어 나왔다. 숫자 몇 개에 빨간 줄이 그어져 있다.', [
      ['바로 정밀 검사를 받는다', 'pragmatic', { vitality: 4, wisdom: 1, money: -300 }, '큰 문제는 아니었다. 대신 생활 습관을 바꾸라는 숙제를 받았다.'],
      ['파트너와 매일 걷는다', 'caring', { vitality: 3 }, '아침마다 같은 길을 걸었다. 파트너가 먼저 현관에서 기다렸다.',
        { affection: 2, follow: [echoLater([3, 5], '몸이 기억한 길', '{partner|과|와} 걷던 길이 일과가 됐다. 이번 검진에서는 재검사 표시가 사라졌다.', { vitality: 5 })] }],
      ['다음에 받는다', 'easygoing', { joy: 1 }, '결과지를 서랍에 넣었다.', { follow: [later('chronic-pain', [3, 6], 0.4)] }],
    ]],
    ['lc-old-cane', 65, 95, '지팡이', '계단에서 한 번 휘청인 뒤로 가족이 지팡이를 사 왔다.', [
      ['고집을 꺾고 쓴다', 'pragmatic', { vitality: 3, joy: -1 }, '생각보다 걷기가 편했다. 산책 거리가 다시 늘었다.'],
      ['지팡이에 파트너 장식을 단다', 'easygoing', { joy: 3, money: -50 }, '동네 아이들이 지팡이를 보고 먼저 말을 걸었다.'],
      ['아직은 버틴다', 'bold', { courage: 2, vitality: 2 }, '다리에 힘을 붙이는 운동을 시작했다. 지팡이는 현관에 세워 둔 채였다.', check('vitality', 15, '빗길에서 결국 넘어졌다. 그 뒤로는 지팡이를 들었다.', { vitality: -5 })],
    ]],
    ['lc-old-names', 65, 100, '흐려지는 이름', '오래 함께한 포켓몬을 부르려는데 이름이 한순간 떠오르지 않았다.', [
      ['매일 일기를 쓴다', 'curious', { wisdom: 3 }, '그날 있었던 일을 세 줄씩 적기 시작했다.',
        { follow: [echoLater([3, 6], '일기장 세 권', '책장에 일기장이 세 권 쌓였다. 펼칠 때마다 잊고 있던 하루가 돌아왔다.', { wisdom: 2, joy: 3 })] }],
      ['파트너를 더 자주 부른다', 'caring', { bond: 3 }, '하루에도 몇 번씩 이름을 불렀다. 그때마다 파트너가 귀를 세웠다.', { affection: 3 }],
      ['웃어넘긴다', 'easygoing', { joy: 2 }, '젊을 때도 가끔 그랬다고 생각하기로 했다.'],
    ]],
    ['lc-old-partner-winter', 50, 100, '파트너의 겨울', '요즘 {partner|이|가} 좋아하던 언덕까지 가지 못한다. 대신 창가에서 그쪽을 오래 바라본다.', [
      ['업고라도 언덕에 오른다', 'bold', { bond: 5, vitality: -2 }, '꼭대기에서 {partner|이|가} 눈을 감고 오래 바람을 맞았다.',
        { affection: 5, ...check('vitality', 12, '언덕 중턱에서 함께 쉬었다. 거기서도 바람은 같았다.', { vitality: -3, bond: 2 }, { affection: 4 }) }],
      ['창가에 자리를 만들어 준다', 'caring', { bond: 3 }, '언덕이 보이는 창가에 방석을 깔았다. 오후 햇볕이 그 자리에 오래 머물렀다.', { affection: 4 }],
      ['함께한 해들을 기록한다', 'curious', { wisdom: 3 }, '처음 만난 날부터 지금까지를 공책 한 권에 적었다.',
        { follow: [echoLater([2, 5], '파트너의 기록', '정리해 둔 공책을 젊은 트레이너가 빌려 갔다. 노년기 포켓몬 돌봄 모임에서 교재로 쓰인다고 했다.', { reputation: 2, joy: 3 })] }],
    ], { when: s => partnerYears(s) >= 25 }],
    ['lc-old-volunteer', 58, 88, '센터의 봉사자', '은퇴하고 남는 오전 시간에, 포켓몬센터에서 봉사자를 구한다는 공고를 봤다.', [
      ['접수 창구를 돕는다', 'caring', { bond: 3, reputation: 1 }, '대기실의 초보 트레이너들에게 차를 따라 주었다.', { world: { safety: 1 } }],
      ['초보 트레이너 상담을 맡는다', 'curious', { wisdom: 2, reputation: 2 }, '처음 여행을 떠나는 아이들의 질문은 끝이 없었다.',
        { follow: [echoLater([3, 6], '상담받던 아이', '센터에서 상담해 주던 아이가 첫 배지를 달고 찾아왔다. 배지보다 파트너 자랑을 더 오래 했다.', { joy: 5 })] }],
      ['아직은 쉬고 싶다', 'easygoing', { vitality: 2 }, '공고를 냉장고에 붙여 두었다. 언젠가는 갈지도 모른다.'],
    ], { when: s => !working(s) }],
    ['lc-old-oral-history', 62, 98, '구술 기록', '지역 도서관이 마을 노인들의 삶을 녹음해 남기고 있다. 첫 녹음 차례가 왔다.', [
      ['처음 파트너를 만난 날부터 말한다', 'caring', { joy: 3, bond: 2 }, '말하다 보니 그날 날씨까지 생각났다.'],
      ['실패했던 일들을 이야기한다', 'bold', { wisdom: 3, reputation: 1 }, '녹음기 앞에서 오래 묻어 둔 이야기를 꺼냈다.',
        { follow: [echoLater([4, 8], '도서관의 목소리', '도서관에서 연락이 왔다. 녹음을 들은 학생이 그 실패담 덕분에 진로를 다시 생각했다고 했다.', { joy: 4, reputation: 1 })] }],
      ['짧게 마친다', 'easygoing', { joy: 1 }, '살아온 이야기를 십 분에 담았다. 담당자가 아쉬워했다.'],
    ]],
    ['lc-old-pass-on', 55, 88, '기술 전수', '이웃의 젊은 트레이너가 내가 오래 다듬은 훈련법을 배우고 싶다고 찾아왔다.', [
      ['처음부터 차근차근 가르친다', 'caring', { reputation: 3, wisdom: 2 }, '석 달 동안 매주 같은 공터에서 만났다.',
        { training: 20, ...talentCheck('battle', 'wisdom', 10, '설명이 길어져 젊은이가 지루해했다. 손으로 보여 주는 편이 나았다.', { joy: -1 }, { training: 10 }),
          follow: [echoLater([3, 6], '제자의 소식', '가르쳤던 트레이너가 지역 대회에서 입상했다. 시상대에서 그 훈련법 이야기를 했다고 한다.', { joy: 5, reputation: 2 })] }],
      ['실전으로 보여 준다', 'bold', { courage: 2, vitality: -2 }, '말보다 한 번의 연습 배틀이 빨랐다.', { training: 25 }],
      ['노트만 건넨다', 'pragmatic', { wisdom: 1, reputation: 1 }, '손때 묻은 훈련 노트를 통째로 넘겨주었다.'],
    ]],
  ]),
  scene('stage', 'lc-old-first-road', 60, 92, {}, s => {
    const id = localSpecies(s);
    return { title: '처음 걸었던 길', body: '처음 여행을 떠나던 날 걸었던 길을 다시 걸어 보고 싶어졌다.', options: [
      ['{partner|과|와} 끝까지 걷는다', 'bold', { joy: 6, vitality: -1 }, `길은 넓어졌지만 풀숲은 그대로였다. ${poke(id, '이', '가')} 그때처럼 튀어나왔다.`,
        { observe: id, ...check('vitality', 10, '반쯤 걷고 벤치에 앉았다. 그 벤치도 옛날 그 자리였다.', { vitality: -2, joy: 2 }) }],
      ['버스를 타고 가서 조금만 걷는다', 'easygoing', { joy: 4, money: -80 }, '첫 마을 입구에서 내렸다. 표지판 글씨만 새것이었다.'],
      ['지도를 펴고 기억만 더듬는다', 'curious', { wisdom: 2, joy: 2 }, '지도 위를 손가락으로 걸었다. 그것만으로도 충분히 멀리 갔다.'],
    ] };
  }),
  ...table('stage', [
    ['lc-old-hometown', 55, 92, '고향 방문', '수십 년 만에 고향에 들렀다. 살던 집 자리에 다른 건물이 서 있다.', [
      ['아예 고향으로 돌아온다', 'caring', { joy: 4 }, '남은 해는 어릴 적 하늘 아래에서 보내기로 했다.', { home: true }],
      ['옛 이웃을 찾아다닌다', 'curious', { wisdom: 2, joy: 3 }, '세 집 건너 한 집은 아직 그대로였다. 서로 이름을 기억해 냈다.',
        { follow: [echoLater([1, 3], '고향에서 온 상자', '고향의 옛 이웃이 직접 딴 나무열매를 한 상자 보냈다. 상자 위에 어릴 적 별명이 적혀 있었다.', { joy: 3 })] }],
      ['조용히 한 바퀴 돌고 온다', 'easygoing', { joy: 1, wisdom: 1 }, '골목 끝 나무만은 기억보다 커져 있었다.'],
    ], { when: s => s.town !== s.hometown }],
  ]),
  scene('stage', 'lc-old-dawn', 55, 95, { once: false, cooldown: 8 }, s => {
    const id = localSpecies(s);
    return { title: '새벽 네 시', body: '요즘은 새벽 네 시면 눈이 떠진다. 다시 잠이 오지 않는다.', options: [
      ['{partner|과|와} 새벽길을 걷는다', 'easygoing', { vitality: 2, joy: 1 }, `아무도 없는 길에서 ${poke(id, '과', '와')} 마주쳤다. 서로 놀라 한참 서 있었다.`, { observe: id }],
      ['밀린 책을 읽는다', 'curious', { wisdom: 3 }, '해가 뜰 때까지 한 권을 다 읽었다.'],
      ['억지로라도 다시 눕는다', 'pragmatic', { vitality: 1 }, '눈을 감고 숫자를 셌다. 해 뜰 무렵 겨우 다시 잠들었다.'],
    ] };
  }),
  ...table('stage', [
    ['lc-old-ice', 65, 98, '빙판길', '첫눈이 온 다음 날, 집 앞 빙판에서 미끄러졌다.', [
      ['파트너를 불러 일어선다', 'bold', { bond: 3, vitality: -2 }, '{partner|이|가} 어깨를 내주었다. 천천히 일어나 집까지 걸었다.', check('vitality', 12, '혼자 일어서지 못했다. 파트너가 이웃집 문을 두드려 사람을 불러왔다.', { vitality: -6 }, { affection: 3 })],
      ['바로 병원에 간다', 'pragmatic', { vitality: 2, money: -200 }, '손목에 금이 갔다. 석 달 동안 깁스를 했다.'],
      ['이웃과 눈 치우기 당번을 짠다', 'caring', { bond: 2 }, '골목 사람들과 아침마다 돌아가며 눈을 치우기로 했다.', { world: { safety: 1 } }],
    ]],
    ['lc-old-hearing', 65, 100, '멀어진 소리', '{partner|의|의} 울음소리가 예전보다 멀게 들린다.', [
      ['보청기를 맞춘다', 'pragmatic', { joy: 3, money: -300 }, '처음 소리가 또렷이 들어온 날, 파트너가 부르는 소리에 바로 돌아봤다.'],
      ['몸짓 신호를 함께 익힌다', 'caring', { bond: 4 }, '앞발을 두 번 구르면 "밥", 꼬리를 흔들면 "산책"이 됐다.', { affection: 3, training: 10 }],
      ['그냥 지낸다', 'easygoing', { wisdom: 1, joy: -1 }, '들리는 만큼만 들으며 지냈다. 파트너가 더 가까이 와서 울었다.'],
    ]],
    ['lc-old-footage', 55, 92, '옛 경기 영상', '리그 기록 보관소가 오래된 지역 대회 영상을 공개했다. 화면 속에 젊은 내가 있다.', [
      ['파티와 함께 본다', 'easygoing', { joy: 4 }, '화면 속 자기를 알아본 포켓몬이 텔레비전 앞으로 다가갔다.', { affection: 2 }],
      ['그날의 실수를 분석한다', 'curious', { wisdom: 3 }, '수십 년이 지나서야 그때 왜 졌는지 알았다.', { training: 10 }],
      ['영상을 지역 학교에 기증한다', 'caring', { bond: 1, reputation: 2 }, '학교 배틀 수업 시간에 영상이 쓰이게 됐다.'],
    ]],
    ['lc-old-downsize', 60, 92, '집 줄이기', '혼자 관리하기에 집이 너무 넓어졌다. 작은 집으로 옮기며 짐을 줄인다.', [
      ['물건마다 새 주인을 찾아 준다', 'caring', { bond: 3, reputation: 1 }, '낚싯대는 옆집 아이에게, 오래된 도감은 학교 도서실에 갔다.'],
      ['중고로 팔고 같은 지방 작은 마을로 간다', 'pragmatic', { money: 400, wisdom: 1 }, '짐이 트럭 한 대에서 반 대로 줄었다.', { move: 'region' }],
      ['포켓몬들 물건만은 남긴다', 'easygoing', { joy: 2 }, '낡은 방석과 장난감 상자가 새집 거실 한가운데를 차지했다.', { affection: 2 }],
    ]],
    ['lc-old-morning-drill', 55, 88, '아침 체조 모임', '공원에서 동네 어르신들이 포켓몬과 함께 아침 체조를 한다. 같이 하자고 손짓한다.', [
      ['매일 나간다', 'bold', { vitality: 5, joy: 2 }, '한 달 만에 계단을 쉬지 않고 올랐다.', check('vitality', 5, '사흘째 근육통으로 앓아누웠다. 다음 주부터 천천히 다시 나갔다.', { vitality: -1 })],
      ['주말에만 나간다', 'easygoing', { vitality: 2, joy: 2 }, '토요일 아침이 기다려지기 시작했다.'],
      ['모임 기록을 맡는다', 'curious', { wisdom: 2, bond: 1 }, '누가 몇 번 나왔는지, 어느 포켓몬이 제일 열심인지 적었다.'],
    ]],
    ['lc-old-their-future', 65, 100, '남겨질 친구들', '내가 먼저 떠나면 파티의 포켓몬들은 어떻게 될까. 밤에 그 생각이 자주 든다.', [
      ['믿을 만한 돌보미와 약속해 둔다', 'pragmatic', { wisdom: 2, money: -200 }, '보호소 돌보미와 서류를 썼다. 포켓몬마다 좋아하는 것을 적어 두었다.'],
      ['포켓몬마다 편지를 쓴다', 'caring', { bond: 4 }, '읽지 못할 걸 알면서도 한 장씩 썼다. 쓰다 보니 마음이 가벼워졌다.', { affection: 3 }],
      ['지금을 더 즐긴다', 'easygoing', { joy: 4 }, '걱정은 접고 오늘 산책을 한 바퀴 더 돌았다.'],
    ], { when: s => s.party.length > 0 }],
    ['lc-old-sixty', 60, 66, '환갑 생일상', '생일상 앞에 가족과 오랜 지인들이 모였다. 누군가 한마디 하라며 잔을 두드린다.', [
      ['고마운 사람들 이름을 하나씩 부른다', 'caring', { bond: 3, joy: 4 }, '이름을 다 부르는 데 한참 걸렸다. 아무도 지루해하지 않았다.'],
      ['파트너에게 먼저 건배한다', 'easygoing', { joy: 4 }, '파트너가 영문도 모르고 꼬리를 흔들었다. 다들 웃었다.', { affection: 3 }],
      ['다음 목표를 발표한다', 'bold', { courage: 3, joy: 2 }, '일흔 전에 아직 못 가 본 지방에 가겠다고 했다. 다들 웃었지만 진심이었다.',
        { follow: [echoLater([3, 6], '약속한 여행', '생일상에서 한 약속대로 처음 가 보는 지방행 기차에 올랐다. 창가 자리를 잡았다.', { joy: 5 }, 0.7)] }],
    ]],
  ]),
];

// ── 5. The worries of the twenties ───────────────────────────────────────────────────────────────
const sickDay = ['혼자 버틴다', 'bold', { courage: 1, vitality: 1 }, '하루 푹 자고 일어나니 열이 내렸다.', check('vitality', 10, '사흘을 앓고 나서야 병원에 갔다.', { vitality: -4 })];
const youth = table('stage', [
  ['lc-ya-cold-room', 19, 27, '자취방의 첫 겨울', '자취방 보일러가 고장 났다. 집주인은 다음 주에나 온다고 한다.', [
    ['{partner|과|와} 이불 속에서 버틴다', 'easygoing', { bond: 2, vitality: -2 }, '파트너 곁이 생각보다 따뜻했다. 일주일 내내 붙어 잤다.', { affection: 3 }],
    ['직접 고쳐 본다', 'curious', { wisdom: 3, joy: 2 }, '설명서를 세 번 읽고 밸브를 갈았다. 따뜻한 물이 나오자 혼자 박수를 쳤다.', check('wisdom', 10, '부품 하나를 더 망가뜨렸다. 수리비가 두 배로 나왔다.', { money: -150 })],
    ['{friend}의 집에 신세 진다', 'caring', { joy: 2 }, '{friend}의 소파에서 일주일을 지냈다. 밤마다 늦게까지 수다를 떨었다.', { cast: { friend: { affinity: 5 } } }],
  ]],
  ['lc-ya-first-pay', 18, 26, '첫 월급', '통장에 처음으로 내가 번 돈이 찍혔다.', [
    ['고향에 선물을 보낸다', 'caring', { bond: 3, money: -200 }, '고향에서 전화가 왔다. 목소리가 평소보다 높았다.'],
    ['파트너에게 좋은 장비를 사 준다', 'bold', { joy: 2, money: -250 }, '새 목도리를 두른 파트너가 하루 종일 거울 앞을 떠나지 않았다.', { affection: 3 }],
    ['절반을 떼어 저금한다', 'pragmatic', { wisdom: 2 }, '이름 없는 통장을 하나 만들었다.',
      { follow: [echoLater([5, 8], '첫 월급 통장', '첫 월급 때 만든 통장을 정리하다 잔고를 봤다. 생각보다 많이 모여 있었다.', { money: 400, joy: 3 })] }],
  ], { when: working }],
  ['lc-ya-3am', 22, 30, '새벽 세 시', '마감에 쫓겨 새벽까지 일하는 날이 몇 주째다. 오늘은 {partner|이|가} 밥그릇을 그대로 남겼다.', [
    ['일을 내려놓고 파트너를 챙긴다', 'caring', { bond: 3 }, '마감 하나를 놓쳤다. 대신 파트너가 다시 밥을 먹기 시작했다.', { affection: 3, work: { satisfaction: -3 } }],
    ['이번 주만 버틴다', 'bold', { vitality: -4, money: 200 }, '마감은 지켰다. 거울 속 얼굴이 낯설었다.',
      { follow: [echoLater([1, 2], '몸이 보낸 청구서', '결국 한 주를 앓아누웠다. 미뤄 둔 피로가 한꺼번에 찾아왔다.', { vitality: -4 }, 0.6)] }],
    ['업무 조정을 요청한다', 'pragmatic', { vitality: 3, wisdom: 1 }, '마감 하나를 다음 달로 미뤘다. 말하길 잘했다.', { work: { satisfaction: 5 }, ...check('courage', 8, '"다들 힘들어"라는 대답만 돌아왔다.', { joy: -2 }) }],
  ], { when: working }],
  ['lc-ya-study-away', 18, 28, '유학 제안', '다른 지방의 포켓몬 연구 학교에서 1년 과정 장학 제안이 왔다. 생활비는 직접 마련해야 한다.', [
    ['떠난다', 'bold', { wisdom: 5, courage: 2, money: -500 }, '짐 가방 두 개와 파티를 데리고 낯선 기숙사에 들어갔다.',
      s => ({ destination: farTown(s).id, follow: [choiceLater([1, 1], '귀국 갈림길', '유학 과정이 끝나 간다. 그곳 연구실에서 1년 더 있어 달라는 제안이 왔다.', [
        ['남는다', 'curious', { wisdom: 4, reputation: 2 }, '연구실 창가 자리가 내 자리가 됐다.'],
        ['고향으로 돌아간다', 'caring', { bond: 3, joy: 2 }, '배운 것을 들고 익숙한 동네로 돌아왔다.', { home: true }],
        ['다른 지방으로 옮긴다', 'bold', { courage: 3 }, '짐을 다시 싸 낯선 마을로 향했다.', { move: 'random' }],
      ])] })],
    ['온라인 과정으로 듣는다', 'pragmatic', { wisdom: 3 }, '화면 너머 강의실이었지만 질문은 누구보다 많이 했다.'],
    ['지금 자리를 지킨다', 'easygoing', { joy: 1 }, '제안 메일을 지우지는 않았다.'],
  ]],
  ['lc-ya-deposit', 20, 30, '돌아오지 않는 보증금', '계약 만료를 앞두고 집주인이 연락을 끊었다. 같은 건물 세입자 여럿이 같은 처지다.', [
    ['세입자들과 함께 대응한다', 'bold', { wisdom: 3, courage: 2 }, '함께 모은 증거로 보증금을 돌려받았다. 세입자 모임은 그 뒤로도 이어졌다.',
      { world: { safety: 1 }, ...check('wisdom', 12, '재판이 길어졌고 절반만 돌려받았다.', { money: -200, joy: -2 }) }],
    ['법률 상담을 받는다', 'pragmatic', { wisdom: 2, money: -150 }, '상담사가 내용증명부터 보내라고 했다.',
      { follow: [echoLater([1, 2], '돌아온 보증금', '몇 달 만에 보증금 대부분이 통장으로 돌아왔다.', { money: 500 })] }],
    ['잊고 새로 시작한다', 'easygoing', { joy: -3, wisdom: 2 }, '비싼 수업료를 냈다고 생각하기로 했다.'],
  ]],
  ['lc-ya-offer', 23, 30, '이직 제안', '다른 회사에서 월급을 더 주겠다는 연락이 왔다. 지금 팀은 막 손발이 맞기 시작했다.', [
    ['옮긴다', 'bold', { money: 300, joy: 1 }, '새 명함을 받았다. 첫 주는 모든 게 낯설었다.', { work: { satisfaction: 4 } }],
    ['제안을 들고 협상한다', 'pragmatic', { wisdom: 2 }, '팀장이 직급을 올려 주겠다고 했다.', { promotion: true, ...check('courage', 10, '팀장은 생각해 보겠다고만 했다. 몇 달째 답이 없다.', { joy: -2 }) }],
    ['지금 팀에 남는다', 'caring', { bond: 2 }, '팀원들에게는 말하지 않았다. 다음 날 출근길이 조금 가벼웠다.', { work: { satisfaction: 5 } }],
  ], { when: working }],
  ['lc-ya-dream', 18, 26, '꿈과 현실', '리그에 도전하려면 몇 년은 수입 없이 훈련해야 한다. 고향에서는 안정된 일을 권한다.', [
    ['꿈에 건다', 'bold', { courage: 4 }, '훈련 일정표를 벽에 붙였다.',
      { training: 30, follow: [choiceLater([3, 4], '세 번째 해', '꿈에 걸고 버틴 지 3년째다. 성적은 조금씩 오르는데 통장은 바닥이다.', [
        ['한 해만 더', 'bold', { courage: 3 }, '마지막이라 다짐하고 다시 훈련장에 나갔다.', { training: 25 }],
        ['코치 일을 구한다', 'pragmatic', { money: 300, wisdom: 2 }, '아이들을 가르치며 내 훈련도 이어 갔다.'],
        ['여기까지라고 인정한다', 'easygoing', { joy: -1, wisdom: 3 }, '트로피 대신 많은 친구가 남았다.'],
      ])] }],
    ['일하면서 주말에 훈련한다', 'pragmatic', { wisdom: 2 }, '평일엔 일하고 주말엔 공터로 나갔다.', { training: 15 }],
    ['꿈을 접고 일에 집중한다', 'easygoing', { joy: -2, money: 300 }, '리그 중계를 보지 않게 됐다.',
      { follow: [echoLater([8, 12], '접어 둔 꿈', '서랍에서 젊을 때 써 둔 리그 출전 신청서를 찾았다. 아쉽기도, 다행이기도 했다.', { wisdom: 3 })] }],
  ]],
  ['lc-ya-roommate', 19, 27, '룸메이트', '룸메이트가 {partner|의|의} 털 때문에 재채기가 멈추지 않는다며 날을 세운다.', [
    ['공기청정기를 산다', 'pragmatic', { joy: 1, money: -200 }, '룸메이트가 청정기 앞에 의자를 끌어다 놓고 앉았다.'],
    ['털 손질 당번을 정한다', 'caring', { bond: 2 }, '매일 저녁 베란다에서 빗질을 했다. 룸메이트도 가끔 거들었다.', { affection: 2 }],
    ['방을 옮긴다', 'bold', { courage: 1, joy: 1 }, '같은 지방의 다른 마을에 혼자 살 방을 구했다.', { move: 'region' }],
  ]],
  ['lc-ya-spring-weddings', 26, 30, '결혼식이 몰린 봄', '이번 봄에만 청첩장이 여섯 장이다. 달력이 토요일마다 빨갛다.', [
    ['모두 간다', 'caring', { bond: 3, money: -400 }, '여섯 번 정장을 입었다. 사진마다 같은 넥타이였다.', { cast: { friend: { affinity: 4 } } }],
    ['가까운 사람만 간다', 'pragmatic', { wisdom: 1, money: -150 }, '두 곳에 가고 나머지는 축하 메시지를 길게 보냈다.'],
    ['마음만 전한다', 'easygoing', { joy: 1 }, '주말마다 파트너와 늦잠을 잤다.'],
  ]],
  ['lc-ya-night-class', 20, 30, '퇴근 후 강의실', '퇴근 후 야간 포켓몬 생태학 강의를 들을지 고민한다.', [
    ['등록한다', 'curious', { wisdom: 4 }, '졸린 눈으로 한 학기를 버텼다.',
      { follow: [echoLater([2, 4], '수료증', '야간 강의 수료증이 나왔다. 회사가 연구 쪽 업무를 맡아 보라고 권했다.', { reputation: 2, money: 200 })],
        ...talentCheck('research', 'wisdom', 8, '학기 중반부터 결석이 늘었다. 수료는 하지 못했다.', { vitality: -2 }) }],
    ['책으로 혼자 공부한다', 'pragmatic', { wisdom: 2 }, '출퇴근 기차에서 한 장씩 읽었다.'],
    ['쉬는 시간도 필요하다', 'easygoing', { vitality: 3 }, '저녁에는 파트너와 산책만 했다.'],
  ], { when: working }],
  ['lc-ya-resignation', 22, 30, '사표', '사표를 써 둔 지 한 달째, 주머니 속에서 종이가 구겨져 간다.', [
    ['낸다', 'bold', { joy: 4, courage: 2 }, '사무실을 나서는데 하늘이 이상하게 넓었다.',
      { leaveCareer: true, follow: [choiceLater([1, 1], '빈 일정표', '일을 그만둔 지 몇 달째, 달력이 비어 있다. 무엇을 할지 정해야 한다.', [
        ['포켓몬 돌보미 일을 시작한다', 'caring', { bond: 3 }, '보호소에 이력서를 냈다. 첫날부터 손이 바빴다.', { career: 'keeper' }],
        ['다시 여행 트레이너로 나선다', 'bold', { courage: 3 }, '배낭을 꺼내 먼지를 털었다.', { career: 'traveler' }],
        ['조금 더 쉰다', 'easygoing', { vitality: 4, joy: 2 }, '서두르지 않기로 했다. 쉬는 것도 일이었다.'],
      ])] }],
    ['휴가부터 써 본다', 'easygoing', { vitality: 4 }, '일주일 쉬고 나니 사표를 낼지 다시 생각해 볼 여유가 생겼다.', { work: { satisfaction: 6 } }],
    ['찢어 버린다', 'pragmatic', { wisdom: 1, joy: -1 }, '조각난 종이를 쓰레기통에 넣었다. 마음 한쪽은 그대로였다.'],
  ], { when: working }],
  ['lc-ya-home-call', 20, 30, '고향의 전화', '고향에서 전화가 왔다. 별일 없다면서 한참을 끊지 않는다.', [
    ['주말에 내려간다', 'caring', { bond: 3, joy: 2, money: -100 }, '현관에 들어서자 좋아하던 반찬 냄새가 났다.'],
    ['영상 통화로 파티를 보여 준다', 'easygoing', { joy: 3 }, '화면 앞에 포켓몬들이 차례로 얼굴을 들이밀었다.', { affection: 1 }],
    ['바쁘다며 짧게 끊는다', 'pragmatic', { joy: -1 }, '끊고 나서 무슨 일이었는지 묻지 않은 게 마음에 걸렸다.',
      { follow: [echoLater([1, 2], '그날의 전화', '나중에야 알았다. 그날은 부모님의 결혼기념일이었다.', { joy: -2, wisdom: 2 }, 0.7)] }],
  ], { when: s => s.cast.family.path !== 'gone' }],
  ['lc-ya-pace', 22, 30, '남의 속도', '동창들 소식을 보다가 휴대폰을 엎어 놓았다. 다들 나보다 앞서 가는 것 같다.', [
    ['내가 지나온 길을 적어 본다', 'curious', { wisdom: 3, joy: 2 }, '적고 보니 생각보다 많이 걸어왔다.'],
    ['오늘 할 일 하나만 정한다', 'pragmatic', { courage: 2 }, '방 정리 하나를 끝냈다. 그걸로 됐다.'],
    ['파트너와 공원에 간다', 'easygoing', { joy: 3, vitality: 1 }, '파트너는 누구와도 자기를 비교하지 않았다.', { affection: 2 }],
  ]],
  ['lc-ya-sick-alone', 19, 30, '혼자 아픈 날', '자취방에서 몸살이 났다. 약도 물도 손 닿는 곳에 없다.', [
    ['{partner|이|가} 물을 가져오게 한다', 'easygoing', { bond: 2 }, '파트너가 컵을 굴려 침대 맡까지 가져왔다. 반은 쏟았다.', { affection: 3 }],
    ['{friend}에게 연락한다', 'caring', { joy: 2 }, '{friend|이|가} 죽을 사 들고 왔다.',
      { cast: { friend: { affinity: 6 } }, follow: [echoLater([3, 6], '죽 한 그릇', '{friend|이|가} 몸살로 누웠다는 연락을 받았다. 그때 받은 죽을 그대로 사 들고 갔다.', { bond: 2, joy: 2 })] }],
    sickDay,
  ]],
]);

export const LIFE_CHAPTERS = [...childhood, ...spouse, ...cast, ...later50, ...youth].map(filled);
