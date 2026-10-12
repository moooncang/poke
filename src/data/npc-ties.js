// Famous trainers you have met keep turning up. Every row opens only after the engine has recorded the meeting in
// `s.people` (the age-10 encounter, or the director's npc-meet). Category 'npc' (director CATEGORY_WEIGHT): the player decides these.
// Steven (성호) is the road to a key stone and mega evolution outside Kalos; Oak (오박사) pays for the Pokédex;
// the Kanto gym leaders run camps and rematches; Red (레드) waits on the mountain.
import { table, check, echoLater, choiceLater, localSpecies } from './event-kit.js';
import { badgeCount } from '../sim/battle.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';

const met = (...ids) => s => ids.some(id => (s.people || []).some(p => p.id === id));
const all = (...tests) => s => tests.every(test => test(s));
const noGear = kind => s => !s.game.gear.includes(kind);
const partyOf = n => s => s.party.length >= n;
const flagged = flag => s => Boolean(s.flags[flag]);
const unflagged = flag => s => !s.flags[flag];
const ROCK = [74, 95, 299, 304, 337, 338, 345, 347];

export const NPC_TIES = table('npc', [
  // ── 성호 ──
  ['npc-steven-letter', 11, 30, '성호의 편지', '성호가 보낸 소포가 도착했다. 작은 돌 하나와 편지. "이 돌이 무엇에 반응하는지 알아내면 다시 연락해." 돌은 손바닥에서 미지근했다.', [
    ['파트너에게 대 본다', 'curious', { wisdom: 3, bond: 2 }, '돌이 파트너 곁에서 희미하게 빛났다. 성호에게 결과를 적어 보냈다.', { flag: 'npc-steven-stone', follow: [echoLater([1, 2], '성호의 답장', '"역시 그랬군." 성호의 답장에는 다음 조사 장소의 지도가 들어 있었다.', { joy: 2, wisdom: 1 })] }],
    ['연구소에 분석을 맡긴다', 'pragmatic', { wisdom: 4, money: -150 }, '분석 결과는 "미분류 광물"이었다. 성호는 그 말에 더 재미있어했다.', { flag: 'npc-steven-stone' }],
    ['서랍에 넣어 둔다', 'easygoing', { joy: 1 }, '돌은 서랍 속에서 가끔 빛났다. 나중에 꺼내 볼 생각이다.'],
  ], { when: all(met('steven'), unflagged('npc-steven-stone')) }],
  ['npc-steven-cave', 15, 55, '성호와의 동굴 조사', '성호가 희귀한 돌이 나오는 동굴을 조사하러 간다며 동행을 청했다. 바위 포켓몬이 많은 곳이라고 했다.', [
    ['함께 들어간다', 'bold', { courage: 3, wisdom: 2 }, '', s => { const id = pick(s, ROCK); return { battle: { kind: 'wild', opponent: id, capture: true }, flag: 'npc-steven-cave-done', outcome: `동굴 깊은 곳에서 ${poke(id, '과', '와')} 마주쳤다. 성호는 돌만 들여다보고 있었다.` }; }],
    ['입구에서 기록만 돕는다', 'curious', { wisdom: 3 }, '성호가 가져온 돌을 하나씩 기록했다. 돌마다 사연이 있었다.', { flag: 'npc-steven-cave-done', observe: 74 }],
    ['거절한다', 'easygoing', {}, '다음에 가겠다고 했다. 성호는 혼자 들어갔다.'],
  ], { when: all(met('steven'), partyOf(1)), once: false, cooldown: 6 }],
  ['npc-steven-keystone', 17, 65, '열쇠돌', '성호가 작은 상자를 내밀었다. "네 파트너와 네가 서로를 믿는다면 이게 반응할 거야." 열쇠돌이었다. 메가스톤 몇 개도 함께였다.', [
    ['파트너와 손을 맞댄다', 'caring', { bond: 4, courage: 2 }, '열쇠돌이 빛났다. 이제 대응하는 파트너는 배틀에서 메가진화한다.', { equipment: 'mega', ...check('bond', 5, '돌은 잠깐 빛나다 멈췄다. 성호는 "아직 서로를 더 알아야 해"라며 상자를 도로 가져갔다.', { bond: 2 }) }],
    ['받을 자격이 없다고 한다', 'pragmatic', { wisdom: 3 }, '성호는 웃으며 상자를 닫았다. "그 말을 하는 사람이 자격이 있는 건데."'],
  ], { when: all(met('steven'), noGear('mega'), s => s.flags['npc-steven-cave-done'] || s.flags['npc-steven-stone']), once: false, cooldown: 5 }],
  ['npc-steven-meteor', 22, 75, '떨어진 운석', '성호가 밤중에 전화했다. 근처 산에 운석이 떨어졌고, 먼저 가는 사람이 조각을 갖는다고.', [
    ['밤길을 달린다', 'bold', { courage: 3, vitality: -2 }, '', s => { const id = pick(s, [337, 338]); return { observe: id, outcome: `운석 구덩이 가장자리에서 ${poke(id, '을', '를')} 보았다. 성호가 조각을 하나 쥐여 주었다.`, effects: { courage: 3, vitality: -2, money: 400 } }; }],
    ['아침에 간다', 'easygoing', { wisdom: 2 }, '아침에는 조각이 남아 있지 않았다. 대신 성호가 커피를 샀다.'],
  ], { when: met('steven'), once: false, cooldown: 7 }],
  ['npc-steven-trade', 20, 75, '돌 거래', '성호가 수집가 모임에 당신이 주운 돌을 가져가 보라고 했다. 값을 제대로 받으려면 설명을 잘해야 한다.', [
    ['직접 설명한다', 'curious', { wisdom: 2, money: 600 }, '돌의 내력을 설명하자 수집가가 600P에 샀다.', check('wisdom', 10, '설명이 꼬였다. 200P에 넘겼다.', { money: 200 })],
    ['성호에게 맡긴다', 'easygoing', { money: 300, bond: 1 }, '성호가 대신 팔아 주고 절반을 가져갔다. 공정한 몫이었다.'],
  ], { when: met('steven'), once: false, cooldown: 6 }],
  ['npc-steven-challenge', 24, 60, '성호의 도전', '성호가 "내 강철 파티와 겨뤄 보지 않겠어?"라며 메타그로스의 볼을 꺼냈다. 상금은 없고 자존심만 걸렸다.', [
    ['받아들인다', 'bold', { courage: 4 }, '성호가 메타그로스를 내보냈다. 강철의 벽과 마주했다.', { battle: { kind: 'rival', opponent: 376, level: 58 }, after: { win: { effects: { reputation: 10, joy: 6 }, flag: 'npc-steven-beaten', outcome: '메타그로스가 무릎을 꿇었다. 성호가 모자를 벗고 악수를 청했다.' }, lose: { effects: { wisdom: 4 }, outcome: '강철의 벽을 넘지 못했다. 성호가 다음에 또 오라고 했다.' } } }],
    ['다음으로 미룬다', 'easygoing', { wisdom: 1 }, '파티가 준비되면 겨루기로 했다.'],
  ], { when: all(met('steven'), partyOf(2), unflagged('npc-steven-beaten')), once: false, cooldown: 5 }],

  // ── 오박사 ──
  ['npc-oak-assignment', 11, 40, '오박사의 조사 의뢰', '오박사가 "근처 서식지를 조사해 주지 않겠나"라며 조사 용지를 보냈다. 보고서를 내면 조사비가 나온다.', [
    ['서식지를 돈다', 'curious', { wisdom: 3, money: 300 }, '', s => { const id = localSpecies(s); return { observe: id, outcome: `${poke(id, '의', '의')} 서식지를 기록해 보냈다. 오박사가 조사비 300P를 보내 주었다.` }; }],
    ['파트너와 함께 조사한다', 'caring', { bond: 3, money: 300 }, '', s => { const id = localSpecies(s); return { observe: id, training: 10, outcome: `파트너가 먼저 ${poke(id, '을', '를')} 찾아냈다. 보고서에 파트너의 이름도 적었다.` }; }],
    ['이번에는 거절한다', 'easygoing', {}, '다음 조사 때 돕겠다고 답장했다.'],
  ], { when: met('oak'), once: false, cooldown: 4 }],
  ['npc-oak-evaluation', 16, 85, '도감 평가', '오박사가 도감을 평가해 주겠다고 연구소로 불렀다. 관측 기록이 많을수록 연구 지원금이 나온다.', [
    ['도감을 보여 준다', 'curious', { wisdom: 2 }, '', s => { const n = s.seen.length, money = Math.min(2000, n * 8); return { effects: { wisdom: 2, money, reputation: n >= 150 ? 6 : n >= 60 ? 3 : 1 }, outcome: `관측 ${n}종. 오박사는 ${n >= 150 ? '"훌륭하군!"이라며 연구비 ' : n >= 60 ? '"착실하군"이라며 지원금 ' : '"이제 시작이군"이라며 격려금 '}${money.toLocaleString()}P를 주었다.` }; }],
    ['조언만 듣고 온다', 'easygoing', { wisdom: 3 }, '어느 지방에서 어떤 포켓몬을 찾을지 메모를 받았다.'],
  ], { when: met('oak'), once: false, cooldown: 6 }],
  ['npc-oak-assistant', 18, 45, '연구소 조수 제안', '오박사가 연구소의 조수 자리를 제안했다. "자네라면 도감을 끝까지 채울 수 있을 것 같아서."', [
    ['조수가 된다', 'curious', { wisdom: 4 }, '연구소 명찰을 받았다. 연구원의 길이 시작됐다.', { career: 'researcher', ...check('wisdom', 8, '면접에서 기초 지식이 부족하다는 평을 들었다. 오박사는 "다음에 다시 보자"고 했다.', { wisdom: 2 }) }],
    ['지금 하는 일을 지킨다', 'pragmatic', { wisdom: 1, joy: 1 }, '정중히 거절했다. 오박사는 언제든 오라고 했다.'],
  ], { when: all(met('oak'), s => s.career !== 'researcher') }],
  ['npc-oak-lecture', 28, 85, '연구소 강연', '오박사가 트레이너 양성 강좌에서 한 시간 강연을 맡아 달라고 했다. 당신의 여정이 아이들에게 좋은 교재가 된다고.', [
    ['강연한다', 'bold', { courage: 3, reputation: 5, money: 400 }, '아이들이 파트너 이야기에 가장 크게 웃었다.', check('courage', 5, '긴장해서 준비한 절반밖에 못 했다. 그래도 아이들은 박수를 쳤다.', { reputation: 2, money: 400 })],
    ['파트너를 데려가 시범만 보인다', 'caring', { bond: 3, reputation: 2 }, '파트너의 시범에 강당이 조용해졌다. 말보다 나았다.', { training: 10 }],
    ['사양한다', 'easygoing', {}, '무대는 체질이 아니라고 했다.'],
  ], { when: all(met('oak'), s => s.reputation >= 25), once: false, cooldown: 8 }],

  // ── 관동 체육관 관장 (이슬·웅·민화) ──
  ['npc-gym-camp', 13, 40, '관장들의 합동 캠프', '관동 체육관 관장들이 여는 사흘짜리 훈련 캠프 안내가 왔다. 참가비가 있지만 봉사로 대신할 수도 있다.', [
    ['참가비를 내고 참가한다', 'bold', { courage: 2, money: -250 }, '사흘 동안 파트너와 기본기를 다시 다졌다.', { training: 35 }],
    ['캠프 보조로 일하며 배운다', 'caring', { bond: 3 }, '설거지와 정리 사이에 어깨너머로 배웠다. 관장이 따로 몇 가지를 더 가르쳐 주었다.', { training: 20, money: 100 }],
    ['가지 않는다', 'easygoing', { joy: 1 }, '혼자 하던 훈련을 이어 갔다.'],
  ], { when: all(met('misty', 'brock', 'erika'), partyOf(1)), once: false, cooldown: 5 }],
  ['npc-gym-rematch', 17, 60, '관장과의 재대결', '관장이 "배지는 걸지 않고, 진심으로 한 판 하자"며 재대결을 청했다.', [
    ['받아들인다', 'bold', { courage: 3 }, '', s => { const [id, who] = pick(s, [[121, '이슬'], [95, '웅'], [45, '민화']].filter(([, who]) => (s.people || []).some(p => ({ 이슬: 'misty', 웅: 'brock', 민화: 'erika' })[who] === p.id)) || [[95, '웅']]);
      return { battle: { kind: 'rival', opponent: id, level: 45 }, after: { win: { effects: { reputation: 6, joy: 5 }, outcome: `${who}의 ${poke(id, '을', '를')} 쓰러뜨렸다. "많이 늘었네." 관장이 웃었다.` }, lose: { effects: { wisdom: 3 }, outcome: `${who}의 ${poke(id, '이', '가')} 벽처럼 버텼다. 복기할 것이 많았다.` } }, outcome: `${who}와의 재대결이 시작됐다.` }; }],
    ['훈련 상대로만 부탁한다', 'caring', { bond: 2 }, '승부 대신 파트너의 약점을 짚어 주는 시간이 됐다.', { training: 15 }],
  ], { when: all(met('misty', 'brock', 'erika'), partyOf(1)), once: false, cooldown: 5 }],
  ['npc-gym-substitute', 24, 60, '체육관 대리 관장', '관장이 한 계절 자리를 비운다며 체육관 대리를 부탁했다. 도전자들을 상대하고 체육관을 지키는 일이다.', [
    ['맡는다', 'bold', { courage: 4, reputation: 6, money: 900 }, '한 계절 동안 도전자 서른 명을 상대했다. 배지를 건네는 쪽의 기분을 알게 됐다.', { training: 25, flag: 'npc-gym-substitute-done', ...check('courage', 12, '도전자 몇 명에게 연달아 지자 관장이 서둘러 돌아왔다. 수고비는 받았다.', { reputation: -2, money: 300 }) }],
    ['체육관 수습만 돕는다', 'caring', { bond: 2, money: 300 }, '배지 대신 청소와 접수를 맡았다. 도전자들의 눈빛을 가까이서 봤다.'],
    ['거절한다', 'easygoing', {}, '책임이 무거워 보였다. 관장은 이해했다.'],
  ], { when: all(met('misty', 'brock', 'erika'), s => badgeCount(s) >= 4, unflagged('npc-gym-substitute-done')) }],

  // ── 레드 ──
  ['npc-red-silence', 15, 70, '지나가는 레드', '레드가 마을을 지나갔다. 말은 없었다. 피카츄가 당신의 파트너에게 다가가 뺨을 비볐다.', [
    ['함께 걷는다', 'caring', { bond: 3, courage: 1 }, '마을 끝까지 말없이 걸었다. 헤어질 때 레드가 고개를 한 번 끄덕였다.', { training: 15 }],
    ['훈련을 지켜본다', 'curious', { wisdom: 3 }, '강가에서 레드의 훈련을 보았다. 명령이 거의 없었다. 신호만 있었다.', { training: 10 }],
    ['길을 비켜 준다', 'easygoing', { joy: 1 }, '레드는 아무 일 없다는 듯 지나갔다.'],
  ], { when: all(met('red'), partyOf(1)), once: false, cooldown: 5 }],
  ['npc-red-mountain', 20, 60, '은빛산의 정상', '레드가 은빛산 정상에서 기다린다는 소문이 돌았다. 올라가면 승부를 받아 준다고 한다. 혹한의 산이다.', [
    ['오른다', 'bold', { courage: 5, vitality: -4 }, '', { battle: { kind: 'rival', opponent: 25, level: 80 }, after: { win: { effects: { reputation: 15, joy: 10 }, flag: 'npc-red-beaten', outcome: '피카츄가 쓰러졌다. 레드가 처음으로 입을 열었다. "……고마워."' }, lose: { effects: { wisdom: 5, courage: 2 }, outcome: '눈보라 속에서 졌다. 레드는 말없이 센터까지 바래다주었다.' } }, outcome: '정상에서 레드가 모자를 눌러쓰고 볼을 꺼냈다.' }],
    ['산 아래서 준비만 한다', 'pragmatic', { wisdom: 2 }, '아직 때가 아니었다. 파티를 다시 짜기로 했다.', { training: 20 }],
  ], { when: all(met('red'), partyOf(3), unflagged('npc-red-beaten')), once: false, cooldown: 6 }],

  // ── 모두 ──
  ['npc-reunion', 30, 85, '트레이너들의 저녁', '여정에서 만났던 유명 트레이너들이 한자리에 모이는 저녁에 초대받았다. 당신 이야기가 안주가 될 참이다.', [
    ['참석한다', 'caring', { bond: 3, reputation: 4, joy: 4, money: -200 }, '그날 밤 이야기의 절반은 당신 파트너의 이야기였다.', { follow: [echoLater([1, 3], '저녁 모임의 사진', '그날 찍은 사진이 액자에 담겨 도착했다. 뒷면에 모두의 사인이 있었다.', { joy: 3 })] }],
    ['파트너를 데리고 잠깐 들른다', 'easygoing', { joy: 3, bond: 2 }, '파트너가 가장 인기였다. 당신은 한 시간 만에 나왔다.'],
    ['편지로 인사만 한다', 'pragmatic', { wisdom: 1 }, '모임 대신 편지를 보냈다. 답장이 세 통 왔다.'],
  ], { when: s => (s.people || []).length >= 2, once: false, cooldown: 8 }],
  ['npc-stone-second', 26, 75, '두 번째 돌', '성호가 "이건 네 파티의 다른 아이한테 반응할 돌"이라며 메가스톤을 하나 더 건넸다. 어느 쪽이 맞는지는 직접 알아보라고 했다.', [
    ['파티 모두에게 대 본다', 'curious', { bond: 3, wisdom: 2 }, '세 번째 아이에게서 돌이 반응했다. 이제 그 아이도 메가진화한다.', { training: 15 }],
    ['성호에게 돌려준다', 'pragmatic', { wisdom: 2 }, '"더 필요한 사람에게 주라"고 했다. 성호는 고개를 끄덕였다.'],
  ], { when: all(met('steven'), s => s.game.gear.includes('mega'), partyOf(2)), once: false, cooldown: 9 }],
]);
