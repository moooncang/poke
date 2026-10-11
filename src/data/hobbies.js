// Hobbies, leisure and festivals: three hobby chains (fishing, berry farming, photography), each region's own pastimes,
// seasonal festivals and everyday pastimes for every age.
// Chains use flags and the stage cooldown (like career-sagas): a stage opens two years after the previous one fired.
import { table, check, echoLater, choiceLater, fill, localSpecies, town } from './event-kit.js';
import { currentRegion } from '../sim/world.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';

const PARTICLES = { 을: ['을', '를'], 이: ['이', '가'], 과: ['과', '와'], 은: ['은', '는'], 으로: ['으로', '로'] };
// {pk} is the species name; {pk:을}, {pk:이}, {pk:과}, {pk:은}, {pk:으로} add the matching particle.
const named = (text, id) => text.replace(/\{pk(?::([^}]+))?\}/g, (_, p) => (p ? poke(id, ...PARTICLES[p]) : poke(id)));
const choose = (s, ids) => (typeof ids === 'function' ? ids(s) : pick(s, ids));
/** Registers a species in the dex and names it in the outcome. */
const spot = (ids, text, more = {}) => s => { const id = choose(s, ids); return { observe: id, outcome: named(text, id), ...more }; };
/** A fishing (or other wild) encounter with a chance to catch. */
const fish = (ids, level, text, more = {}) => s => {
  const id = choose(s, ids);
  return { battle: { kind: 'wild', opponent: id, level, capture: true }, outcome: named(text, id), ...more };
};

const inRegion = (...ids) => ({ when: s => ids.includes(currentRegion(s)) });
const nearWater = s => ['바다', '강'].includes(town(s).environment);
const seasonal = (season, cooldown, extra) => ({ once: false, cooldown, when: s => s.season === season && (!extra || extra(s)) });
const again = cooldown => ({ once: false, cooldown });

/**
 * A hobby that grows over the years. Each stage sets its own flag; the next stage opens once that flag is set and two
 * years have passed since the previous stage fired. Choosing the `hobby-<key>-closed` flag ends the chain.
 */
function chain(category, key, flags, first, rows, always = () => true) {
  const ids = rows.map(r => r[0]);
  const closed = `hobby-${key}-closed`;
  return table(category, rows).map((st, i) => ({ ...st, once: false, cooldown: 3, weight: () => (i ? 3 : 1),
    when: s => always(s) && !s.flags[flags[i]] && !s.flags[closed]
      && (i === 0 ? first(s) : Boolean(s.flags[flags[i - 1]]) && s.age >= (s.cooldowns[ids[i - 1]] ?? 0) + 2) }));
}

// ── 1. 낚시: 낡은낚싯대 → 좋은낚싯대 → 대단한낚싯대 ──
const ROD = ['hobby-rod-old', 'hobby-fish-spot', 'hobby-rod-good', 'hobby-fish-night', 'hobby-rod-super', 'hobby-fish-legend'];
const fishing = chain('local', 'fish', ROD, nearWater, [
  ['hobby-fish-old-rod', 8, 80, '낡은낚싯대', '선착장 끝에서 낚시하던 할아버지가 손때 묻은 낚싯대를 내밀었다. "물가에 사는 사람이면 하나쯤은 있어야지."', [
    ['받자마자 던져 본다', 'bold', { joy: 3 }, '', fish([129], 6, '찌가 쑥 들어가더니 {pk:이} 줄 끝에서 펄떡였다.', { flag: ROD[0],
      after: { win: { effects: { courage: 2 } }, lose: { effects: { joy: 1 } } } })],
    ['할아버지에게 요령을 배운다', 'curious', { wisdom: 3 }, '미끼 끼우는 법과 물때 읽는 법을 하나하나 배웠다.', { flag: ROD[0],
      follow: [echoLater([2, 4], '선착장의 빈자리', '낚시 요령을 알려 주던 할아버지가 먼 마을로 이사를 갔다. 선착장 기둥에 "고기 많이 낚아라"라는 쪽지가 남아 있었다.', { joy: 2, bond: 1 }, 0.6)] }],
    ['정중히 사양한다', 'easygoing', { joy: 1 }, '낚싯대는 할아버지 손에 그대로 남았다. 물가에서는 구경만 하기로 했다.', { flag: 'hobby-fish-closed' }],
  ]],
  ['hobby-fish-spot', 9, 80, '나만의 낚시터', '갈대숲 사이로 물살이 느려지는 곳을 찾았다. 아무도 모르는 자리 같다.', [
    ['매일 아침 들른다', 'easygoing', { joy: 3, vitality: 2 }, '', fish([118, 60, 72, 98, 120, 116], 12, '아침 안개 속에서 {pk:이} 미끼를 덥석 물었다.', { flag: ROD[1] })],
    ['물가의 낚싯줄을 걷어 낸다', 'caring', { bond: 3 }, '버려진 낚싯줄과 바늘을 한 봉지 가득 주웠다. 물가 포켓몬들이 다시 모여들었다.', { flag: ROD[1], world: { ecology: 2 }, affection: 2 }],
    ['{friend}에게만 알려 준다', 'caring', { joy: 2 }, '{friend|과|와} 둘만의 낚시터가 생겼다. 누가 더 큰 걸 낚는지 내기가 시작됐다.', { flag: ROD[1], cast: { friend: { affinity: 6 } } }],
  ]],
  ['hobby-fish-good-rod', 12, 80, '좋은낚싯대', '낚시 용품점에 탄력 좋은 낚싯대가 들어왔다. 낚시꾼 모임 대회의 상품으로도 같은 낚싯대가 걸렸다.', [
    ['돈을 모아 산다', 'pragmatic', { money: -300, joy: 3 }, '손에 착 감기는 낚싯대가 생겼다. 줄이 한결 깊은 곳까지 닿았다.', { flag: ROD[2] }],
    ['모임 대회에서 따낸다', 'bold', { courage: 3, reputation: 1 }, '가장 긴 물고기 포켓몬을 올려 좋은낚싯대를 상품으로 받았다.', { flag: ROD[2],
      ...check('courage', 8, '아깝게 2등을 했다. 좋은낚싯대는 다음 대회로 미뤘다.', { joy: -1 }) }],
    ['모임 선배의 낚싯대를 물려받는다', 'caring', { bond: 2, wisdom: 1 }, '손잡이가 닳은 낚싯대에 선배의 이십 년이 묻어 있었다.', { flag: ROD[2] }],
  ]],
  ['hobby-fish-night', 14, 80, '밤낚시', '달 없는 밤, 물속에서 희미한 불빛이 깜빡인다. 밤에만 올라오는 포켓몬이 있다고 한다.', [
    ['불빛을 노린다', 'bold', { courage: 3 }, '', fish([170, 223, 90, 222], 20, '어둠 속에서 {pk:이} 수면 위로 튀어 올랐다.', { flag: ROD[3] })],
    ['조용히 관찰만 한다', 'curious', { wisdom: 3 }, '', spot([170, 171, 211], '불빛의 정체는 {pk}였다. 수첩에 시간과 물때를 적어 두었다.', { flag: ROD[3] })],
    ['보온병을 챙겨 {sibling|과|와} 간다', 'caring', { bond: 2, joy: 2 }, '{sibling|과|와} 컵라면을 나눠 먹으며 찌만 바라보다 밤을 새웠다.', s => ({ flag: ROD[3], cast: { sibling: { affinity: 5 } },
      follow: [echoLater([3, 6], '그날 밤의 사진', fill(s, '{sibling|이|가} 밤낚시 때 찍은 흔들린 사진을 액자에 넣어 보내왔다. 둘 다 졸린 얼굴이었다.'), { joy: 3, bond: 1 })] })],
  ]],
  ['hobby-fish-super-rod', 16, 80, '대단한낚싯대', '전국을 도는 낚시 명인이 마을에 들렀다. 솜씨를 보이면 손수 만든 대단한낚싯대를 넘긴다고 한다.', [
    ['명인과 낚시 승부', 'bold', { courage: 4, reputation: 2 }, '해 질 녘 바구니를 비교하던 명인이 웃으며 대단한낚싯대를 건넸다.', { flag: ROD[4],
      ...check('wisdom', 12, '명인의 바구니가 두 배는 무거웠다. 실력을 길러 다시 오라고 했다.', { joy: -1 }) }],
    ['짐을 들어 주며 따라다닌다', 'caring', { wisdom: 4 }, '사흘 동안 명인을 따라다니며 물속 지형 읽는 법을 배웠다. 떠나는 날 명인이 낚싯대를 두고 갔다.', { flag: ROD[4],
      follow: [choiceLater([3, 5], '명인의 편지', '낚시 명인이 편지를 보냈다. 먼바다에 대물이 올라온다는 소식을 들었으니 함께 가겠냐고 한다.', [
        ['배를 타고 따라간다', 'bold', { courage: 4, joy: 4, money: -200 }, '거친 파도 끝에서 명인과 함께 대물을 끌어올렸다.', { training: 20 }],
        ['답장만 보낸다', 'easygoing', { joy: 2 }, '근황과 직접 그린 낚시터 지도를 넣어 답장을 보냈다.'],
      ], 0.7)] }],
    ['값을 치르고 산다', 'pragmatic', { money: -600, joy: 2 }, '명인이 값을 꽤 깎아 주었다. 그래도 지갑이 가벼워졌다.', { flag: ROD[4] }],
  ]],
  ['hobby-fish-legend', 18, 85, '전설의 대물', '대단한낚싯대에 처음 느껴 보는 무게가 걸렸다. 줄이 바닥 깊은 곳으로 끌려 들어간다.', [
    ['끝까지 버틴다', 'bold', { courage: 5 }, '', fish([130, 369, 349], 35, '한참의 줄다리기 끝에 물보라 속에서 {pk:이} 모습을 드러냈다.', { flag: ROD[5],
      after: { win: { effects: { reputation: 3 } }, lose: { effects: { joy: -1 } } } })],
    ['줄을 끊어 놓아준다', 'caring', { bond: 3, joy: 2 }, '', spot([130, 369, 349], '수면 아래로 돌아가는 {pk}의 그림자만 오래 기억에 남겼다.', { flag: ROD[5], world: { ecology: 1 } })],
    ['계측해 기록으로 남긴다', 'pragmatic', { reputation: 3, money: 400 }, '계측 직후 놓아준 대물이 지방 낚시 기록에 올랐다. 기록 상금도 나왔다.', { flag: ROD[5],
      ...check('vitality', 10, '마지막 순간 줄이 끊어졌다. 흐릿한 사진만 남았다.', { joy: -2 }) }],
  ]],
], nearWater);

// ── 2. 나무열매 농사: 화분 → 밭 → 품종 개량 → 대회 → 직판장 → 장인 ──
const BERRY = ['hobby-berry-pot', 'hobby-berry-field', 'hobby-berry-breed', 'hobby-berry-fair', 'hobby-berry-market', 'hobby-berry-master'];
const berries = chain('stage', 'berry', BERRY, () => true, [
  ['hobby-berry-pot', 8, 85, '첫 나무열매 화분', '시장 할머니가 덤이라며 오랭열매 씨앗 세 알을 손에 쥐여 주었다.', [
    ['창가 화분에 심는다', 'caring', { bond: 2, joy: 2 }, '매일 물을 주었더니 두 달 만에 작은 잎이 돋았다.', s => ({ flag: BERRY[0],
      follow: [echoLater([1, 3], '첫 열매', fill(s, '창가 화분에서 오랭열매 한 알이 익었다. {partner|이|가} 냄새를 맡고 한참을 떠나지 않았다.'), { joy: 3, bond: 1 }, 0.8)] })],
    ['포켓몬에게 맡겨 본다', 'curious', { wisdom: 2 }, '파티의 포켓몬이 화분 옆에서 낮잠을 잤다. 이상하게 싹이 빨리 텄다.', { flag: BERRY[0], affection: 2 }],
    ['볶아서 먹는다', 'easygoing', { joy: 1 }, '씨앗은 프라이팬에 볶아 먹었다. 고소했다.', { flag: 'hobby-berry-closed' }],
  ]],
  ['hobby-berry-field', 10, 85, '작은 밭', '마을 외곽 공터를 빌려 나무열매 밭을 일굴 수 있다고 한다.', [
    ['밭을 빌린다', 'pragmatic', { money: -200, vitality: 2 }, '두렁을 내고 다섯 그루를 심었다.', { flag: BERRY[1] }],
    ['이웃 밭을 거들고 한 고랑 얻는다', 'caring', { vitality: -1, bond: 2, reputation: 1 }, '한 철 내내 일을 거든 대가로 이웃 농부가 고랑 하나를 내주었다.', { flag: BERRY[1] }],
    ['포켓몬과 직접 갈아엎는다', 'bold', { courage: 2 }, '파티의 포켓몬이 돌을 골라내고 흙을 뒤집었다. 땀 흘린 만큼 밭이 넓어졌다.', { flag: BERRY[1], training: 15 }],
  ]],
  ['hobby-berry-breed', 12, 85, '품종 개량', '서로 다른 나무열매를 나란히 심으면 처음 보는 색의 열매가 맺힌다는 이야기를 들었다.', [
    ['교배 기록을 꼼꼼히 남긴다', 'curious', { wisdom: 4 }, '세 번째 해에 처음 보는 줄무늬 열매가 맺혔다.', { flag: BERRY[2],
      ...check('wisdom', 10, '열매가 맺히기 전에 벌레 포켓몬이 잎을 다 갉아 먹었다.', { joy: -2 }, { observe: 10 }) }],
    ['연구소에 토양 검사를 맡긴다', 'pragmatic', { wisdom: 2, money: -150 }, '연구원이 보내 준 검사표대로 흙을 바꿨더니 개량이 빨라졌다.', { flag: BERRY[2] }],
    ['자연에 맡긴다', 'easygoing', { joy: 2 }, '', spot([415, 165, 193], '{pk:이} 꽃가루를 옮겨 준 덕분에 뜻밖의 열매가 열렸다.', { flag: BERRY[2] })],
  ]],
  ['hobby-berry-fair', 14, 85, '나무열매 품평회', '지방 나무열매 품평회가 열린다. 크기와 당도, 모양을 겨룬다. 참가비는 50P다.', [
    ['가장 큰 열매를 출품한다', 'bold', { reputation: 2, money: 400, joy: 3 }, '우승 리본과 상금을 받았다. 밭 입구에 리본을 걸었다.', { flag: BERRY[3], cost: 50,
      ...check('wisdom', 8, '당도가 조금 모자란다는 평을 들었다. 참가상만 받았다.', { joy: -1 }, { flag: BERRY[3] }) }],
    ['포켓몬 간식 부문에 나간다', 'caring', { bond: 3, money: 150 }, '파트너가 시식 심사를 맡았다. 간식 부문 2등 상금을 받았다.', { flag: BERRY[3], affection: 3 }],
    ['구경하며 품종을 배운다', 'curious', { wisdom: 3 }, '다른 농가의 접붙이기 요령을 공책 가득 옮겨 적었다.', { flag: BERRY[3] }],
  ]],
  ['hobby-berry-market', 16, 85, '주말 직판장', '수확이 늘어 다 먹을 수가 없다. 주말 직판장에 자리가 하나 났다.', [
    ['직판장을 연다', 'pragmatic', { money: 500, vitality: -2 }, '오전에 다 팔렸다. 다음 주에도 오겠다는 단골이 생겼다.', { flag: BERRY[4],
      follow: [choiceLater([2, 4], '대량 주문', '근처 포켓몬센터가 회복용 나무열매를 정기적으로 납품해 달라고 한다.', [
        ['계약한다', 'pragmatic', { money: 700, vitality: -3 }, '한 해 동안 밭이 쉴 틈 없이 돌아갔다.'],
        ['무리하지 않는 양만 보낸다', 'caring', { money: 250, joy: 2 }, '보낼 수 있는 만큼만 보냈다. 밭도 사람도 숨을 돌렸다.'],
      ], 0.7)] }],
    ['아이들에게 나눠 준다', 'caring', { reputation: 2, joy: 3 }, '열매를 받은 아이들의 포켓몬이 신이 나서 뛰어다녔다.', { flag: BERRY[4] }],
    ['잼으로 만든다', 'curious', { wisdom: 2, money: 250 }, '나무열매 잼이 동네 빵집 진열대에 올랐다.', { flag: BERRY[4] }],
  ]],
  ['hobby-berry-master', 20, 85, '나무열매 장인', '어느새 마을 사람들이 열매 키우는 법을 물으러 밭으로 찾아온다.', [
    ['주말 농장 교실을 연다', 'caring', { reputation: 3, bond: 2 }, '아이들과 포켓몬이 줄지어 첫 화분을 심었다.', { flag: BERRY[5], world: { ecology: 2 } }],
    ['희귀 품종 모종을 나눈다', 'curious', { wisdom: 3, reputation: 2 }, '개량한 모종을 이웃 마을들에 보냈다.', { flag: BERRY[5], world: { ecology: 2 },
      follow: [echoLater([3, 6], '들판의 새 열매', '나눠 준 모종이 퍼져 들판 곳곳에 열매가 열렸다. 야생 포켓몬이 늘었다는 소식이 들려왔다.', { joy: 3, reputation: 1 })] }],
    ['조용히 혼자 가꾼다', 'easygoing', { joy: 3, vitality: 2 }, '이른 아침 밭에서 보내는 한 시간이 하루의 낙이 되었다.', { flag: BERRY[5] }],
  ]],
]);

// ── 3. 포켓몬 사진: 카메라 → 스냅 → 사진전 → 희귀한 순간 → 사진집 ──
const PHOTO = ['hobby-photo-camera', 'hobby-photo-snap', 'hobby-photo-exhibit', 'hobby-photo-rare', 'hobby-photo-book'];
const photos = chain('opportunity', 'photo', PHOTO, () => true, [
  ['hobby-photo-camera', 10, 80, '첫 카메라', '전파상 진열장에 카메라가 놓여 있다. 셔터 소리가 경쾌하다.', [
    ['새 카메라를 산다', 'pragmatic', { money: -300, joy: 3 }, '첫 장은 {partner}의 얼굴이었다. 초점이 조금 나갔다.', { flag: PHOTO[0] }],
    ['{sibling}의 옛 카메라를 빌린다', 'caring', { bond: 2 }, '먼지를 털어 내자 아직 잘 찍혔다. 필름 냄새가 좋았다.', { flag: PHOTO[0], cast: { sibling: { affinity: 4 } } }],
    ['휴대폰이면 충분하다', 'easygoing', { joy: 1 }, '카메라는 사지 않았다. 휴대폰 사진첩만 늘었다.', { flag: 'hobby-photo-closed' }],
  ]],
  ['hobby-photo-snap', 11, 80, '포켓몬 스냅', '사진 동호회가 야생 포켓몬의 자연스러운 모습을 찍는 출사를 떠난다.', [
    ['풀숲에 엎드려 기다린다', 'curious', { wisdom: 3 }, '', spot(localSpecies, '세 시간을 기다린 끝에 {pk:이} 하품하는 순간을 찍었다.', { flag: PHOTO[1] })],
    ['나무열매로 불러낸다', 'bold', { joy: 2, courage: 2 }, '', spot(localSpecies, '{pk:이} 열매를 굴리며 노는 장면을 연속으로 담았다.', { flag: PHOTO[1] })],
    ['동호회 사람들과 어울린다', 'easygoing', { joy: 3 }, '사진보다 도시락 시간이 더 즐거웠다. 다음 출사 날짜도 정했다.', { flag: PHOTO[1] }],
  ]],
  ['hobby-photo-exhibit', 14, 80, '사진전 출품', '지방 포켓몬 사진전이 작품을 공모한다. 대상 상금이 꽤 된다.', [
    ['가장 아끼는 사진을 낸다', 'bold', { reputation: 3, money: 500, joy: 3 }, '대상이었다. 사진이 미술관 입구에 크게 걸렸다.', { flag: PHOTO[2],
      ...check('wisdom', 12, '입선에 그쳤다. 그래도 사진은 전시장 한쪽 벽에 걸렸다.', { joy: 1, reputation: 1 }, { flag: PHOTO[2] }) }],
    ['파트너 사진으로 출품한다', 'caring', { bond: 3, money: 100 }, '관람객 인기상을 받았다. 사진 앞에 선 파트너가 어깨를 으쓱했다.', { flag: PHOTO[2], affection: 3 }],
    ['관람만 한다', 'curious', { wisdom: 2 }, '다른 작가들의 구도를 공책에 따라 그려 보았다.', { flag: PHOTO[2] }],
  ]],
  ['hobby-photo-rare', 16, 80, '희귀한 순간', '새벽 호숫가, 안개 너머로 좀처럼 보기 힘든 포켓몬의 실루엣이 비친다.', [
    ['숨죽여 셔터를 누른다', 'curious', { wisdom: 4, joy: 3 }, '', spot([147, 246, 443, 371, 633, 610], '안개가 걷히는 순간 {pk:이} 렌즈에 담겼다. 연구소가 사진 사본을 요청했다.', { flag: PHOTO[3],
      follow: [echoLater([2, 5], '도감에 실린 사진', '새벽 호숫가에서 찍은 사진이 지방 도감 개정판의 대표 사진으로 실렸다.', { reputation: 3, joy: 2 }, 0.7)] })],
    ['한 걸음 더 다가간다', 'bold', { courage: 3, joy: 2 }, '', s => ({ ...spot([147, 246, 443, 371, 633, 610], '숨소리가 들릴 만큼 가까이에서 {pk:을} 찍었다.', { flag: PHOTO[3] })(s),
      ...check('courage', 10, '발밑 나뭇가지가 부러졌다. 실루엣은 안개 속으로 사라졌다.', { joy: -1 }) })],
    ['카메라를 내린다', 'caring', { bond: 2, joy: 1 }, '방해하지 않고 그저 바라보았다. 그것으로 충분했다.', { flag: PHOTO[3] }],
  ]],
  ['hobby-photo-book', 20, 85, '사진집', '출판사가 그동안 찍은 포켓몬 사진을 모아 사진집을 내자고 한다.', [
    ['사진집을 낸다', 'pragmatic', { money: 600, reputation: 3 }, '첫 쇄가 한 달 만에 다 팔렸다.', { flag: PHOTO[4],
      follow: [choiceLater([2, 4], '사진집 순회전', '사진집을 본 다른 지방 미술관이 순회 전시를 열자고 제안했다.', [
        ['순회전을 연다', 'bold', { reputation: 3, money: 300, vitality: -2 }, '여러 도시를 돌며 관람객과 사진 이야기를 나눴다.'],
        ['사진만 보낸다', 'easygoing', { joy: 2 }, '액자만 보내고 전시 소식은 편지로 받아 보았다.'],
      ])] }],
    ['수익을 보호 기금에 낸다', 'caring', { reputation: 3, joy: 3 }, '사진집 수익 전부를 야생 포켓몬 보호 기금에 보냈다.', { flag: PHOTO[4], world: { ecology: 3 } }],
    ['가족 앨범으로만 남긴다', 'easygoing', { joy: 4, bond: 2 }, '두툼한 앨범 한 권을 만들어 거실 책장에 꽂았다.', { flag: PHOTO[4] }],
  ]],
]);

// ── 4. 지방의 여가 ──
const regional = [
  ...table('local', [
    ['hobby-galar-curry', 8, 85, '캠핑 카레', '와일드에어리어 강가에 텐트를 쳤다. 커다란 냄비에 카레를 끓일 차례다.', [
      ['아주 맵게 끓인다', 'bold', { courage: 3, joy: 2 }, '파티 전원이 땀을 뻘뻘 흘리며 한 그릇씩 비웠다. 몸이 후끈해졌다.', { affection: 3, training: 10 }],
      ['나무열매를 듬뿍 넣는다', 'caring', { bond: 3, money: -80 }, '', spot(localSpecies, '달콤한 냄새를 맡고 들판의 {pk:이} 텐트 근처까지 다가왔다.', { affection: 2 })],
      ['옆 텐트와 나눠 먹는다', 'easygoing', { joy: 3 }, '옆 텐트의 트레이너와 카레를 바꿔 먹고 연락처를 주고받았다.', {
        follow: [echoLater([2, 4], '캠핑장 친구', '캠핑장에서 카레를 나눠 먹었던 트레이너가 지방 대회에서 입상했다며 사진을 보내왔다.', { joy: 3 })] }],
    ], inRegion('galar')],
    ['hobby-paldea-picnic', 8, 85, '샌드위치 피크닉', '들판에 피크닉 테이블을 펼쳤다. 빵 사이에 무엇을 넣을지가 오늘의 고민이다.', [
      ['재료를 산처럼 쌓는다', 'bold', { joy: 4, money: -100 }, '샌드위치가 와르르 무너졌다. 포켓몬들이 떨어진 재료를 신나게 주워 먹었다.', { affection: 3 }],
      ['레시피대로 정성껏 만든다', 'curious', { wisdom: 3 }, '단면이 완벽한 샌드위치가 나왔다. 사진부터 찍었다.'],
      ['포켓몬들을 지켜본다', 'caring', { bond: 3 }, '설거지를 마치고 돌아보니 바구니 안에 따뜻한 알이 하나 들어 있었다.', s => ({ join: pick(s, [915, 921, 924, 926]), joinOrigin: 'egg',
        ...check('bond', 12, '포켓몬들이 서로 기대어 잠들었다. 평화로운 오후였다.', { joy: 2 }) })],
    ], inRegion('paldea')],
    ['hobby-johto-pokeathlon', 10, 60, '포켓슬론', '포켓슬론 돔에서 포켓몬 체력 경기가 열린다. 허들, 원반 던지기, 릴레이가 이어진다.', [
      ['스피드 코스에 출전한다', 'bold', { courage: 3, money: 300 }, '파트너가 결승선을 1등으로 통과했다.', { training: 20,
        ...check('vitality', 8, '출발 신호에 놀라 한 박자 늦게 뛰었다.', { joy: -1 }, { training: 10 }) }],
      ['기술 코스에 출전한다', 'curious', { wisdom: 3, money: 250 }, '원반을 정확히 받아 내 기술 부문 메달을 땄다.', { cost: 50,
        ...check('wisdom', 6, '원반이 자꾸 엉뚱한 곳으로 날아갔다.', { joy: -1 }) }],
      ['응원석에 앉는다', 'easygoing', { joy: 3 }, '응원 깃발을 흔들다 목이 쉬었다.'],
    ], inRegion('johto')],
    ['hobby-safari-zone', 10, 75, '사파리존', '사파리존 입장권이 할인 중이다. 정해진 볼 개수로 포켓몬을 잡아야 하는 곳이다.', [
      ['입장해 포획에 도전한다', 'bold', { money: -300, courage: 2 }, '', fish(s => pick(s, currentRegion(s) === 'kanto' ? [115, 128, 123, 113, 111] : [203, 84, 177, 270, 43]), 22,
        '풀숲을 헤치다 {pk:과} 마주쳤다.')],
      ['관람차에서 망원경으로 본다', 'curious', { wisdom: 3 }, '', spot(s => pick(s, currentRegion(s) === 'kanto' ? [115, 128, 123, 113, 111] : [203, 84, 177, 270, 43]),
        '망원경 너머로 {pk:이} 무리를 이끄는 모습을 보았다.')],
      ['기념품만 산다', 'easygoing', { joy: 2, money: -50 }, '사파리 모자를 쓰고 사진을 찍었다.'],
    ], inRegion('kanto', 'hoenn')],
    ['hobby-unova-musical', 8, 60, '포켓몬 뮤지컬', '뮤지컬 홀에서 포켓몬 드레스업 공연 오디션이 열린다.', [
      ['소품을 직접 만들어 나간다', 'caring', { bond: 3, joy: 3 }, '리본을 단 파트너가 무대 가운데에 섰다. 관객이 일어나 박수를 쳤다.', { affection: 4,
        ...check('bond', 10, '조명에 놀란 파트너가 무대 뒤로 숨어 버렸다.', { joy: -1 }) }],
      ['화려한 의상을 빌린다', 'bold', { money: -200, reputation: 2 }, '반짝이는 망토 덕분에 객석 맨 뒤에서도 파트너가 보였다.'],
      ['객석에서 본다', 'easygoing', { joy: 3 }, '다른 포켓몬들의 춤을 보며 박자를 맞췄다.'],
    ], inRegion('unova')],
    ['hobby-hoenn-secret-base', 8, 50, '비밀기지', '덤불 뒤 나무 구멍이 딱 한 사람 들어갈 크기다. 비밀기지로 쓰기 좋아 보인다.', [
      ['방석과 인형으로 꾸민다', 'easygoing', { joy: 4, money: -80 }, '아무도 모르는 작은 쉼터가 생겼다.'],
      ['{friend|을|를} 초대한다', 'caring', { joy: 3 }, '{friend|과|와} 기지에 깃발을 걸고 둘만의 암호를 정했다.', s => ({ cast: { friend: { affinity: 7 } },
        follow: [echoLater([4, 8], '비밀기지의 쪽지', fill(s, '오랜만에 찾은 비밀기지에 {friend|이|가} 남긴 쪽지가 있었다. "아직도 여기 오니?"'), { joy: 4 })] })],
      ['기지 앞에서 연습 배틀을 한다', 'bold', { courage: 3 }, '옆 기지 주인과 해 질 때까지 연습 배틀을 했다.', { training: 20 }],
    ], inRegion('hoenn')],
    ['hobby-sinnoh-underground', 12, 70, '지하통로 발굴', '지하통로 벽에 반짝이는 흔적이 보인다. 곡괭이와 망치를 빌렸다.', [
      ['조심스럽게 망치질한다', 'curious', { wisdom: 3 }, '벽 속에서 화석이 온전히 나왔다. 복원 센터에 맡기자 포켓몬으로 되살아났다.', s => ({ join: pick(s, [408, 410]), joinOrigin: 'gift',
        ...check('wisdom', 12, '벽이 무너지며 화석이 산산조각 났다.', { joy: -2 }) })],
      ['구슬과 보석만 캔다', 'pragmatic', { money: 300, vitality: -1 }, '반짝이는 구슬을 한 자루 모아 팔았다.'],
      ['깃발 뺏기 놀이를 한다', 'bold', { courage: 3, joy: 3 }, '지하통로에서 만난 사람들과 깃발 뺏기를 하며 하루를 보냈다.'],
    ], inRegion('sinnoh')],
    ['hobby-johto-radio', 10, 85, '라디오 사연', '금빛시티 라디오탑 프로그램이 청취자 사연을 받는다. 당첨되면 포켓몬 피리 연주를 신청할 수 있다.', [
      ['파트너 자랑 사연을 보낸다', 'caring', { joy: 3, bond: 2 }, '진행자가 파트너 이야기를 또박또박 읽어 주었다.', { affection: 2 }],
      ['퀴즈 코너에 전화한다', 'curious', { wisdom: 2, money: 200 }, '정답이었다. 상품권이 우편으로 왔다.', check('wisdom', 6, '한 문제 차이로 떨어졌다.', { joy: -1 })],
      ['조용히 듣는다', 'easygoing', { joy: 2, vitality: 1 }, '잔잔한 자장가 방송을 틀어 놓고 잠들었다.'],
    ], inRegion('johto')],
    ['hobby-hoenn-pokeblock', 8, 70, '포켓블록 만들기', '콘테스트 회장 옆 블렌더 앞에 사람들이 모여 있다. 나무열매를 넣고 함께 돌린다.', [
      ['타이밍에 맞춰 누른다', 'bold', { joy: 3 }, '최고 등급의 포켓블록이 나왔다. 파티가 서로 먹겠다고 다퉜다.', { affection: 3,
        ...check('courage', 5, '타이밍이 어긋나 새까만 블록이 나왔다.', { joy: -1 }) }],
      ['남은 블록을 판다', 'pragmatic', { money: 150 }, '콘테스트 대기실 앞에서 금세 다 팔렸다.'],
      ['레시피를 바꿔 본다', 'curious', { wisdom: 3 }, '처음 보는 사람들과 나무열매 조합표를 주고받았다.'],
    ], inRegion('hoenn')],
  ]),
  ...table('opportunity', [
    ['hobby-kalos-amie', 8, 85, '포켓파를레', '미르시티 카페에서 포켓몬과 교감하는 놀이를 배웠다. 쓰다듬고, 먹이고, 같이 논다.', [
      ['하루 종일 놀아 준다', 'caring', { bond: 5 }, '파트너가 처음 보는 표정으로 웃었다.', { affection: 4 }],
      ['포켓몬 디저트를 굽는다', 'curious', { wisdom: 2, joy: 2, money: -80 }, '크림을 올린 디저트를 파티 모두가 한입씩 먹었다.', { affection: 3 }],
      ['쓰다듬다 같이 잠든다', 'easygoing', { joy: 3, vitality: 2 }, '햇볕 드는 창가에서 파트너와 낮잠을 잤다.'],
    ], inRegion('kalos')],
    ['hobby-alola-resort', 10, 85, '포케리조트', '바다 위 작은 섬들에 박스 속 포켓몬을 쉬게 하는 리조트가 있다.', [
      ['박스의 포켓몬들을 보낸다', 'caring', { bond: 3, money: -100 }, '일주일 뒤 포켓몬들이 햇볕에 그을린 채 돌아왔다.', { training: 15 }],
      ['섬 탐험을 거든다', 'bold', { courage: 3 }, '', spot([741, 742, 746, 747, 764], '탐험 섬의 동굴 앞에서 {pk:과} 마주쳤다.')],
      ['해먹에서 쉰다', 'easygoing', { joy: 4, vitality: 2 }, '파도 소리를 들으며 오후 내내 해먹에서 흔들렸다.'],
    ], inRegion('alola')],
    ['hobby-ball-craft', 12, 85, '몬스터볼 공예', '공방에서 나무열매 껍질로 볼을 깎는 전통 공예 교실이 열린다.', [
      ['볼 하나를 끝까지 깎는다', 'curious', { wisdom: 3 }, '투박하지만 딸깍 잘 닫히는 볼이 완성되었다.', {
        follow: [echoLater([2, 4], '손수 만든 볼', '직접 깎은 볼을 벼룩시장에 내놓았더니 수집가가 꽤 비싼 값에 사 갔다.', { money: 300, joy: 2 }, 0.6)] }],
      ['볼 씰로 장식한다', 'easygoing', { joy: 3, money: -60 }, '볼에서 나올 때마다 반짝이는 별이 쏟아지게 꾸몄다.', { affection: 2 }],
      ['공방 일을 돕는다', 'pragmatic', { money: 150, vitality: -1 }, '껍질 손질을 거들고 수고비를 받았다.'],
    ]],
    ['hobby-battle-video', 12, 60, '배틀 비디오', '지난 배틀을 녹화한 영상을 돌려 보았다. 그때는 안 보이던 실수가 눈에 들어온다.', [
      ['장면마다 멈춰 분석한다', 'curious', { wisdom: 4 }, '교체 타이밍을 공책에 고쳐 적었다.', { training: 20 }],
      ['영상을 올린다', 'bold', { reputation: 2 }, '하룻밤 사이에 댓글이 수백 개 달렸다.', {
        follow: [choiceLater([1, 3], '영상의 반응', '올린 배틀 영상이 화제가 되어 방송국에서 해설 출연을 제안했다.', [
          ['출연한다', 'bold', { reputation: 3, money: 300 }, '떨리는 목소리로 첫 해설 방송을 마쳤다.'],
          ['정중히 거절한다', 'easygoing', { joy: 1 }, '유명해지는 일은 사양했다.'],
        ], 0.5)] }],
      ['추억으로 다시 본다', 'easygoing', { joy: 3, bond: 2 }, '파트너와 화면 앞에 나란히 앉아 웃었다.', { affection: 2 }],
    ]],
    ['hobby-dex-quiz', 10, 70, '도감 퀴즈 대회', '지방 도감 퀴즈 대회가 열린다. 실루엣만 보고 포켓몬을 맞혀야 한다.', [
      ['혼자 출전한다', 'curious', { wisdom: 3, money: 300, reputation: 2 }, '결승 문제의 꼬리 모양을 알아보고 우승했다.', check('wisdom', 14, '비슷한 실루엣에 헷갈려 예선에서 떨어졌다.', { joy: -1, wisdom: 1 })],
      ['{friend|과|와} 팀으로 나간다', 'caring', { joy: 3, money: 100 }, '둘이 번갈아 답을 외쳐 3등을 했다.', { cast: { friend: { affinity: 5 } } }],
      ['객석 퀴즈만 푼다', 'easygoing', { joy: 2 }, '객석에서 몰래 맞혀 보며 혼자 뿌듯해했다.'],
    ]],
    ['hobby-marathon', 14, 70, '포켓몬 마라톤', '마을 한 바퀴를 도는 마라톤에 포켓몬과 함께 달리는 부문이 생겼다.', [
      ['완주에 도전한다', 'bold', { vitality: 4, courage: 3 }, '결승선을 넘자마자 파트너가 먼저 드러누웠다.', { affection: 2,
        ...check('vitality', 8, '반환점에서 다리가 풀려 걸어서 돌아왔다.', { vitality: -2 }) }],
      ['급수대 봉사를 한다', 'caring', { reputation: 2 }, '물 포켓몬이 지친 주자들에게 시원한 물을 뿌려 주었다.'],
      ['기부 레이스로 걷는다', 'pragmatic', { money: -100, reputation: 2, vitality: 2 }, '참가비가 포켓몬센터에 기부되었다.'],
    ]],
    ['hobby-pokemon-exercise', 45, 95, '포켓몬 체조', '공원에서 아침마다 포켓몬과 함께하는 체조 모임이 열린다.', [
      ['매일 아침 나간다', 'easygoing', { vitality: 5, joy: 2 }, '허리가 한결 가벼워졌다.', {
        follow: [echoLater([2, 4], '체조 모임 개근상', '체조 모임에서 개근상을 받았다. 상품은 파트너용 머리띠였다.', { joy: 3, vitality: 2 })] }],
      ['체조 반장을 맡는다', 'caring', { reputation: 2, bond: 2 }, '구령을 붙이다 보니 동네 사람 이름을 다 외웠다.'],
      ['격투 포켓몬 동작을 따라 한다', 'bold', { courage: 2, vitality: 3 }, '', spot([66, 236, 296], '체조 모임에 놀러 온 {pk:이} 시범을 보였다. 따라 하다 쥐가 났다.')],
    ]],
  ]),
];

// ── 5. 계절 축제 (0 봄 · 1 여름 · 2 가을 · 3 겨울) ──
const festivals = table('local', [
  // 봄
  ['hobby-spring-blossom', 8, 90, '벚꽃 축제', '강둑의 벚나무가 일제히 피었다. 꽃잎 사이로 작은 포켓몬들이 고개를 내민다.', [
    ['파티와 꽃놀이를 간다', 'easygoing', { joy: 4 }, '돗자리 위에서 포켓몬들이 떨어지는 꽃잎을 쫓아다녔다.', { affection: 2 }],
    ['포토존 아르바이트', 'pragmatic', { money: 200, vitality: -1 }, '하루 종일 관광객 사진을 찍어 주고 일당을 받았다.'],
    ['꽃 그늘을 살핀다', 'curious', { wisdom: 2 }, '', spot([421, 420, 187, 406], '꽃 그늘 아래에서 {pk:이} 꾸벅꾸벅 졸고 있었다.')],
  ], seasonal(0, 4)],
  ['hobby-spring-flower-show', 12, 90, '꽃 박람회', '마을 광장에 꽃 박람회가 열렸다. 화분 경연도 함께 열린다. 참가비는 50P다.', [
    ['직접 기른 화분을 낸다', 'caring', { bond: 2, reputation: 2, money: 200 }, '심사위원 특별상을 받았다.', { cost: 50,
      ...check('wisdom', 8, '옆 화분이 너무 화려했다. 화분은 박람회 입구 장식으로 쓰였다.', { joy: 1 }) }],
    ['꽃모종을 산다', 'easygoing', { joy: 3, money: -120 }, '베란다가 작은 꽃밭이 되었다.', {
      follow: [echoLater([1, 2], '베란다의 손님', '베란다 꽃밭에 벌레 포켓몬이 찾아와 작은 둥지를 틀었다.', { joy: 2, wisdom: 1 })] }],
    ['구경하며 걷는다', 'curious', { wisdom: 2 }, '', spot([669, 191, 315], '꽃밭 사이에서 {pk:이} 꽃잎을 고르고 있었다.')],
  ], seasonal(0, 5)],
  ['hobby-spring-kite', 14, 75, '연날리기 대회', '봄바람 좋은 날 강변에서 연날리기 대회가 열린다. 비행 포켓몬이 연줄을 물고 날기도 한다.', [
    ['비행 포켓몬과 출전한다', 'bold', { courage: 3, joy: 2, money: 150 }, '연이 가장 높이 올라 우승 상금을 받았다.', check('bond', 8, '연줄이 엉켜 강물에 빠졌다.', { joy: -1 })],
    ['아이들 연을 고쳐 준다', 'caring', { reputation: 1, joy: 2 }, '찢어진 연을 테이프로 붙여 다시 띄워 주었다.'],
    ['언덕에 누워 구경한다', 'easygoing', { joy: 3, vitality: 1 }, '하늘에 떠 있는 연을 세다가 깜빡 잠들었다.'],
  ], seasonal(0, 4)],
  // 여름
  ['hobby-summer-fireworks', 11, 90, '불꽃놀이', '여름밤 강변에서 불꽃놀이가 열린다. 불꽃 포켓몬 공연도 함께라고 한다.', [
    ['{friend|과|와} 노점을 돈다', 'easygoing', { joy: 4, money: -80 }, '{friend|과|와} 솜사탕을 나눠 들고 불꽃이 터질 때마다 소리를 질렀다.', { cast: { friend: { affinity: 5 } } }],
    ['불꽃 포켓몬 공연을 돕는다', 'bold', { courage: 2, reputation: 2 }, '파티의 포켓몬도 공연 무대에 올라 불꽃을 뿜었다.', { training: 15 }],
    ['옥상에서 조용히 본다', 'caring', { bond: 3 }, '불꽃이 터질 때마다 파트너가 몸을 바짝 붙여 왔다.', { affection: 2 }],
  ], seasonal(1, 4)],
  ['hobby-summer-beach', 11, 85, '해변 축제', '모래사장에 모래성 대회와 수박 깨기가 열린다.', [
    ['모래성 대회에 나간다', 'curious', { wisdom: 2, joy: 3, money: 150 }, '포켓몬과 함께 쌓은 모래성이 1등을 했다.', check('wisdom', 6, '밀물에 모래성이 반쯤 쓸려 갔다.', { joy: -1 })],
    ['물 포켓몬과 파도를 탄다', 'bold', { courage: 4 }, '높은 파도 위에서 파트너와 함께 균형을 잡았다.', { training: 10 }],
    ['그늘에서 빙수를 먹는다', 'easygoing', { joy: 3, money: -40 }, '파라솔 아래에서 빙수를 나눠 먹었다.'],
    ['축제 뒤 해변을 치운다', 'caring', { reputation: 1, vitality: -1 }, '축제가 끝난 밤 모래사장의 쓰레기를 주웠다.', { world: { ecology: 2 } }],
  ], seasonal(1, 3, s => town(s).environment === '바다')],
  ['hobby-summer-fireflies', 24, 90, '반딧불 밤', '개울가에 반딧불 포켓몬이 모여 빛으로 무늬를 그린다는 소식이다.', [
    ['밤길을 걸어 보러 간다', 'curious', { wisdom: 2, joy: 3 }, '', spot([313, 314], '{pk:이} 꼬리 빛으로 별자리 같은 무늬를 그렸다.')],
    ['가족과 함께 간다', 'caring', { bond: 3, joy: 2 }, '가족과 손전등을 끄고 개울가에 나란히 앉았다.'],
    ['가로등 줄이기 운동을 한다', 'pragmatic', { reputation: 2 }, '마을 회의에서 개울가 가로등을 줄이자고 설득했다.', { world: { ecology: 2 },
      follow: [echoLater([2, 4], '돌아온 빛', '가로등을 줄인 뒤 개울가의 반딧불 포켓몬 무리가 눈에 띄게 늘었다.', { joy: 3 })] }],
  ], seasonal(1, 5)],
  // 가을
  ['hobby-autumn-harvest', 15, 90, '수확제', '마을 수확제가 열렸다. 가장 큰 호박을 겨루고, 저녁에는 큰 솥에 스튜를 끓인다.', [
    ['수확물을 출품한다', 'pragmatic', { money: 300, reputation: 1 }, '호박 무게 부문에서 1등을 했다.', check('wisdom', 10, '옆집 호박이 두 배는 컸다.', { joy: -1 })],
    ['스튜 솥을 젓는다', 'caring', { reputation: 2, vitality: -1 }, '밤늦게까지 솥을 저으며 마을 사람들에게 스튜를 퍼 주었다.'],
    ['포켓몬 힘겨루기에 나간다', 'bold', { courage: 2, joy: 2 }, '파트너가 큰 수레를 끌어 박수를 받았다.', { training: 15 }],
  ], seasonal(2, 4)],
  ['hobby-autumn-moon', 15, 90, '달맞이', '보름달이 뜨면 언덕 위에서 달 포켓몬들이 둥글게 춤춘다는 옛이야기가 있다.', [
    ['언덕에 올라 기다린다', 'curious', { wisdom: 2, joy: 3 }, '', spot([35, 173, 36], '달빛 아래에서 {pk:이} 빙글빙글 돌고 있었다.')],
    ['가족과 떡을 빚는다', 'caring', { bond: 3, joy: 2, money: -60 }, '둘러앉아 떡을 빚었다. 파트너 몫도 하나 남겨 두었다.', { affection: 2 }],
    ['달에게 소원을 빈다', 'easygoing', { joy: 3 }, '아무에게도 말하지 않은 소원을 하나 빌었다.', {
      follow: [echoLater([1, 3], '달에게 빈 소원', '그해 달맞이 밤에 빈 소원이 조금은 이루어진 것 같았다.', { joy: 4 }, 0.5)] }],
  ], seasonal(2, 4)],
  ['hobby-autumn-foliage', 16, 85, '단풍 산행', '산이 붉게 물들었다. 단풍잎 사이로 풀 포켓몬들이 겨울 준비를 한다.', [
    ['정상까지 오른다', 'bold', { vitality: 3, courage: 2 }, '정상에서 내려다본 골짜기가 온통 붉었다.', check('vitality', 6, '중턱에서 숨이 차 되돌아왔다.', { vitality: -1 })],
    ['낙엽을 모아 퇴비를 만든다', 'caring', { bond: 1, reputation: 1 }, '마을 공동 밭에 낙엽 퇴비를 쌓았다.', { world: { ecology: 1 } }],
    ['단풍 사진을 찍는다', 'curious', { joy: 3 }, '', spot([43, 191, 273, 406], '단풍잎 더미 속에서 {pk:이} 고개를 내밀었다.')],
  ], seasonal(2, 3)],
  // 겨울
  ['hobby-winter-snow', 6, 85, '눈축제', '첫눈이 쌓이자 마을 광장에 눈 조각 대회가 열렸다.', [
    ['얼음 포켓몬과 조각한다', 'curious', { wisdom: 2, joy: 3, money: 200 }, '파트너 모양 눈 조각이 우수상을 받았다.', check('wisdom', 8, '햇볕에 조각 귀가 녹아내렸다.', { joy: -1 })],
    ['눈싸움 대회에 나간다', 'bold', { courage: 3, joy: 3 }, '포켓몬까지 합세한 눈싸움에서 마지막까지 버텼다.'],
    ['눈 속 포켓몬을 찾는다', 'caring', { bond: 2 }, '', spot([225, 220, 361, 459, 872], '눈더미 옆에서 {pk:이} 추위도 모르고 뒹굴고 있었다.')],
  ], seasonal(3, 4)],
  ['hobby-winter-yearend', 8, 90, '연말 파티', '한 해의 마지막 밤, 동네 회관에서 연말 파티를 연다.', [
    ['선물 교환에 참여한다', 'caring', { joy: 3, bond: 2, money: -100 }, '포장을 뜯자 손뜨개 목도리가 나왔다.'],
    ['파트너와 장기자랑을 한다', 'bold', { courage: 3, reputation: 1 }, '파트너의 재주에 회관이 웃음바다가 되었다.', { affection: 2 }],
    ['집에서 새해 계획을 적는다', 'curious', { wisdom: 3 }, '수첩 첫 장에 올해 하고 싶은 일을 열 줄 적었다.', {
      follow: [choiceLater([1, 1], '새해 다짐의 결과', '작년 연말에 적은 새해 다짐 목록이 책상 위에 그대로 있다.', [
        ['끝까지 지킨다', 'bold', { courage: 2, vitality: 2 }, '목록의 절반을 지워 냈다.'],
        ['짧게 다시 적는다', 'easygoing', { joy: 2 }, '올해 목록은 세 줄로 줄였다. 마음이 가벼워졌다.'],
      ], 0.8)] }],
  ], seasonal(3, 3)],
  ['hobby-winter-sunrise', 13, 90, '새해 첫 일출', '새해 첫날 동이 트기 전, 사람들이 언덕으로 줄지어 올라간다.', [
    ['언덕 꼭대기까지 걷는다', 'bold', { vitality: 2, courage: 2, joy: 2 }, '구름 사이로 첫 해가 떠올랐다. 비행 포켓몬 떼가 해를 가로질렀다.'],
    ['가족과 떡국을 먹는다', 'caring', { bond: 3, joy: 2 }, '따뜻한 떡국 한 그릇으로 새해를 맞았다.'],
    ['늦잠을 잔다', 'easygoing', { vitality: 3 }, '일어나 보니 해가 중천이었다. 그래도 개운했다.'],
  ], seasonal(3, 5)],
]);

// ── 6. 일상 소일거리 ──
const pastimes = [
  ...table('stage', [
    ['hobby-cooking-class', 14, 85, '요리 교실', '문화센터에서 요리 교실 수강생을 모집한다. 포켓몬 간식 만들기 수업도 있다.', [
      ['정규 수업에 등록한다', 'pragmatic', { wisdom: 2, vitality: 2, money: -150 }, '칼질이 한결 빨라졌다. 저녁 메뉴가 다양해졌다.', s => ({
        follow: [echoLater([1, 3], '집들이 요리', fill(s, '요리 교실에서 배운 솜씨로 {friend|을|를} 초대해 한 상 차렸다. 접시가 깨끗하게 비었다.'), { joy: 3, bond: 1 })] })],
      ['포켓몬 간식 수업만 듣는다', 'caring', { bond: 3, money: -60 }, '집에 와서 구운 쿠키를 파티가 순식간에 먹어 치웠다.', { affection: 3 }],
      ['영상 보며 독학한다', 'easygoing', { joy: 2 }, '부엌이 좀 엉망이 됐지만 그럭저럭 먹을 만했다.'],
    ]],
    ['hobby-garden', 30, 90, '작은 정원', '집 앞 자투리땅에 꽃과 허브를 심어 볼까 싶다.', [
      ['허브 정원을 만든다', 'curious', { wisdom: 2, joy: 2 }, '', spot([10, 165, 191, 415], '허브 향을 맡고 {pk:이} 정원에 자리를 잡았다.')],
      ['이웃과 함께 꽃길을 낸다', 'caring', { reputation: 2, vitality: -1 }, '골목 끝까지 꽃길이 이어졌다.', { world: { ecology: 1 } }],
      ['잔디만 깎는다', 'easygoing', { vitality: 2 }, '잔디 깎는 소리를 들으며 하루가 지나갔다.'],
    ], again(6)],
    ['hobby-book-club', 16, 90, '독서회', '도서관 독서회에서 이번 달에는 포켓몬 연구자의 회고록을 읽는다.', [
      ['발제를 맡는다', 'curious', { wisdom: 4 }, '밤새 준비한 발제에 토론이 두 시간이나 이어졌다.', {
        follow: [choiceLater([2, 4], '독서회 회장', '독서회 회원들이 다음 회장을 맡아 달라고 한다.', [
          ['맡는다', 'caring', { reputation: 2, wisdom: 2 }, '매달 읽을 책을 고르는 즐거움이 생겼다.'],
          ['평회원으로 남는다', 'easygoing', { joy: 2 }, '부담 없이 읽고 말하는 자리가 더 좋았다.'],
        ], 0.6)] }],
      ['듣기만 한다', 'easygoing', { joy: 2, wisdom: 1 }, '다른 사람들의 해석을 들으며 책을 다시 읽고 싶어졌다.'],
      ['다과를 준비해 간다', 'caring', { bond: 2, money: -50 }, '직접 구운 과자가 토론보다 더 화제가 됐다.'],
    ], again(5)],
    ['hobby-board-game', 10, 85, '보드게임 밤', '거실에 포켓몬 보드게임을 펼쳤다. 주사위와 카드가 잔뜩이다.', [
      ['이길 때까지 한다', 'bold', { courage: 2, joy: 2 }, '새벽 세 시에 마침내 첫 승을 거뒀다.', check('wisdom', 6, '다섯 판을 내리 졌다.', { joy: -1 })],
      ['{rival|을|를} 부른다', 'bold', { courage: 2 }, '{rival|과|와} 보드게임으로도 승부를 냈다. 결과를 두고 한참 우겼다.', { cast: { rival: { affinity: 4 } } }],
      ['규칙을 새로 만든다', 'curious', { wisdom: 3, joy: 2 }, '직접 만든 확장 규칙이 가족들 사이에서 정식 규칙이 되었다.'],
    ], again(5)],
    ['hobby-cycling', 12, 70, '자전거 여행', '사이클링로드를 따라 이웃 마을까지 자전거로 가 보기로 했다.', [
      ['하루 만에 완주한다', 'bold', { vitality: 4, courage: 3 }, '해 질 녘 이웃 마을 표지판 앞에서 사진을 찍었다.', { ...check('vitality', 10, '오르막에서 체인이 빠져 끌고 돌아왔다.', { vitality: -2 }),
        follow: [echoLater([2, 5], '자전거 동호회', '자전거 길에서 만났던 동호회가 정기 라이딩 소식을 보내왔다.', { joy: 2, vitality: 2 }, 0.6)] }],
      ['쉬엄쉬엄 달린다', 'easygoing', { joy: 3, vitality: 2 }, '', spot(localSpecies, '길가 쉼터에서 {pk:과} 눈이 마주쳤다.')],
      ['자전거를 새로 산다', 'pragmatic', { money: -250, vitality: 3 }, '가벼운 자전거로 바꾸자 오르막이 무섭지 않았다.'],
    ]],
    ['hobby-stargazing', 10, 90, '별보기', '오늘 밤 유성우가 쏟아진다는 예보가 나왔다.', [
      ['언덕에 망원경을 세운다', 'curious', { wisdom: 3, joy: 2 }, '', spot([774, 35, 173], '유성 사이로 {pk:이} 하늘을 가로질렀다.', {
        follow: [echoLater([2, 4], '천문대 엽서', '그날 밤 관측 기록을 보냈더니 천문대에서 감사 엽서와 별자리 지도가 왔다.', { wisdom: 2, joy: 2 }, 0.6)] })],
      ['망원경을 장만한다', 'pragmatic', { money: -300, wisdom: 3 }, '집 옥상이 작은 관측소가 되었다.'],
      ['파트너와 누워서 본다', 'easygoing', { joy: 3, bond: 2 }, '별똥별이 떨어질 때마다 파트너의 귀가 쫑긋했다.', { affection: 2 }],
    ], again(6)],
    ['hobby-knitting', 45, 95, '뜨개질', '겨울을 앞두고 털실 한 바구니를 샀다. 파트너 목도리를 떠 볼까 싶다.', [
      ['파트너 목도리를 뜬다', 'caring', { bond: 4 }, '삐뚤빼뚤한 목도리를 두르자 파트너가 거울 앞을 떠나지 않았다.', { affection: 3 }],
      ['바자회에 내다 판다', 'pragmatic', { money: 200, vitality: -1 }, '모자와 장갑 열 켤레가 오전에 다 팔렸다.'],
      ['뜨개 모임에 나간다', 'easygoing', { joy: 3 }, '바늘보다 수다가 바빴다.'],
    ], again(6)],
    ['hobby-go-club', 50, 95, '바둑 모임', '경로당 바둑 모임에 실력자가 새로 들어왔다고 한다.', [
      ['한 판 둔다', 'bold', { wisdom: 3, courage: 2, reputation: 1 }, '반집 차이로 이겼다. 다음 주 복수전이 잡혔다.', check('wisdom', 10, '초반부터 밀려 돌을 던졌다.', { joy: -1 })],
      ['훈수만 둔다', 'easygoing', { joy: 3 }, '훈수가 더 재미있었다. 양쪽에서 핀잔을 들었다.'],
      ['아이들에게 가르친다', 'caring', { reputation: 2, bond: 2 }, '손주뻘 아이들이 바둑돌을 쥐고 진지해졌다.'],
    ]],
    ['hobby-swimming', 8, 60, '수영 강습', '시민 수영장에 물 포켓몬과 함께하는 수영 강습반이 생겼다.', [
      ['등록한다', 'pragmatic', { vitality: 4, money: -120 }, '석 달 만에 수영장 끝까지 쉬지 않고 헤엄쳤다.', { training: 10 }],
      ['물 포켓몬을 붙잡고 배운다', 'bold', { courage: 3, bond: 2 }, '파트너를 붙잡고 첫 발차기를 했다.', check('courage', 4, '물을 잔뜩 먹고 사다리로 기어 나왔다.', { joy: -1 })],
      ['물가에서 발만 담근다', 'easygoing', { joy: 2 }, '발만 담그고 있어도 시원했다.'],
    ]],
    ['hobby-band', 14, 35, '밴드 결성', '{friend|이|가} 같이 밴드를 하자고 한다. 드럼 자리가 비었다.', [
      ['드럼을 맡는다', 'bold', { joy: 4, courage: 2 }, '합주실 방음벽이 흔들릴 만큼 두드렸다.', { cast: { friend: { affinity: 6 } },
        follow: [choiceLater([2, 4], '첫 무대 제안', '동네 축제 무대에 밴드가 설 수 있겠냐는 연락이 왔다.', [
          ['무대에 선다', 'bold', { courage: 3, reputation: 2, joy: 3 }, '첫 곡에서 박자를 놓쳤지만 마지막 곡에는 관객이 따라 불렀다.'],
          ['합주실에서만 즐긴다', 'easygoing', { joy: 2 }, '무대보다 합주실이 우리에게 맞았다.'],
        ], 0.7)] }],
      ['악기를 새로 산다', 'pragmatic', { money: -350, joy: 3 }, '반짝이는 새 기타를 메고 거울 앞에 섰다.'],
      ['노래만 부른다', 'easygoing', { joy: 3 }, '연습 때만 마이크를 잡기로 했다.', { cast: { friend: { affinity: 3 } } }],
    ]],
    ['hobby-walk-club', 55, 95, '산책 모임', '아침 산책 모임 사람들이 포켓몬과 함께 동네 뒷산을 한 바퀴 돈다.', [
      ['맨 앞에서 걷는다', 'bold', { vitality: 4, courage: 1 }, '오르막에서도 숨이 덜 찼다.'],
      ['느린 회원과 함께 걷는다', 'caring', { bond: 2, reputation: 1 }, '지팡이를 짚은 회원의 보폭에 맞춰 걸었다.'],
      ['벤치에서 쉰다', 'easygoing', { joy: 2, vitality: 1 }, '', spot(localSpecies, '벤치 옆으로 {pk:이} 아장아장 지나갔다.')],
    ], again(5)],
    ['hobby-yoga', 25, 80, '요가 교실', '요가 교실 강사가 요가 포켓몬을 데리고 수업한다.', [
      ['한 달 수강권을 끊는다', 'pragmatic', { vitality: 4, wisdom: 1, money: -100 }, `${poke(307, '이', '가')} 보여 주는 동작을 따라 하다 보니 굳은 어깨가 풀렸다.`],
      ['파트너와 같이 따라 한다', 'caring', { bond: 3, vitality: 2 }, '파트너가 엉뚱한 자세로 굳어 버려 교실이 웃음바다가 되었다.', { affection: 2 }],
      ['명상만 한다', 'easygoing', { joy: 2, wisdom: 2 }, '눈을 감고 숨소리만 들었다.'],
    ]],
    ['hobby-pen-pal', 10, 80, '편지 친구', '포켓몬센터 게시판에 먼 지방 트레이너가 편지 친구를 구한다는 쪽지가 붙어 있다.', [
      ['답장을 쓴다', 'caring', { bond: 2, joy: 2 }, '파트너 발자국 도장을 찍어 첫 편지를 부쳤다.', {
        follow: [choiceLater([3, 6], '편지 친구의 초대', '몇 해째 편지를 주고받은 친구가 이번 여름에 자기 마을로 놀러 오라고 한다.', [
          ['찾아간다', 'bold', { joy: 5, courage: 2, money: -250 }, '편지로만 알던 얼굴을 처음 보자 어색함은 금세 사라졌다.', { training: 10 }],
          ['우리 마을로 초대한다', 'caring', { joy: 3, bond: 2 }, '마을 구석구석을 안내했다. 친구의 포켓몬이 우리 파티와 금세 친해졌다.', { affection: 2 }],
          ['편지로만 이어 간다', 'easygoing', { joy: 2 }, '만나지 않아도 편지는 계속 오갔다.'],
        ], 0.7)] }],
      ['사진을 동봉한다', 'curious', { wisdom: 1, joy: 2, money: -30 }, '{town}의 풍경 사진을 인화해 편지에 넣었다.'],
      ['지나친다', 'easygoing', { joy: 1 }, '게시판의 쪽지는 다음 주에 다른 사람이 떼어 갔다.'],
    ]],
    ['hobby-library-volunteer', 16, 85, '도서관 봉사', '어린이 도서관이 그림책 읽어 줄 자원봉사자를 찾는다.', [
      ['그림책을 읽어 준다', 'caring', { reputation: 2, joy: 2 }, '포켓몬 울음소리를 흉내 내자 아이들이 배를 잡고 웃었다.'],
      ['서가를 정리한다', 'pragmatic', { wisdom: 2 }, '포켓몬 도감 서가를 번호순으로 다시 꽂았다.'],
      ['파트너를 데려간다', 'bold', { bond: 2, joy: 3 }, '파트너가 아이들 사이에서 인기 스타가 되었다.', { affection: 2 }],
    ]],
    ['hobby-hotspring-trip', 30, 95, '온천 여행', '오랜만에 쉬는 날이다. 산속 온천 마을까지 다녀올까 싶다.', [
      ['포켓몬 동반 온천에 간다', 'easygoing', { vitality: 5, joy: 3, money: -300 }, '파티 모두가 탕에 들어가 눈을 감았다.', { affection: 3 }],
      ['당일치기로 다녀온다', 'pragmatic', { vitality: 3, money: -100 }, '짧았지만 몸이 한결 가벼워졌다.'],
      ['집 욕조로 대신한다', 'easygoing', { vitality: 2 }, '입욕제 하나로도 충분했다.'],
    ], again(6)],
    ['hobby-pottery', 20, 90, '도자기 공방', '도자기 공방에서 물레 체험을 한다. 땅 포켓몬이 흙을 반죽해 준다.', [
      ['찻잔 세트를 빚는다', 'curious', { wisdom: 3 }, '가마에서 나온 찻잔은 조금 기울었지만 정이 갔다.', {
        follow: [echoLater([1, 3], '공방 전시', '그때 빚은 찻잔이 공방 수강생 전시에 걸렸다. 사겠다는 사람도 있었다.', { money: 150, joy: 2 }, 0.6)] }],
      ['파트너 밥그릇을 만든다', 'caring', { bond: 3, money: -80 }, '이름을 새긴 밥그릇을 파트너가 소중히 핥았다.', { affection: 2 }],
      ['구경만 한다', 'easygoing', { joy: 2 }, '물레 돌아가는 소리가 마음을 차분하게 했다.'],
    ]],
    ['hobby-crossword', 50, 95, '십자말풀이', '신문 주말판 십자말풀이에 포켓몬 이름 문제가 가득하다. 다 맞히면 응모할 수 있다.', [
      ['끝까지 푼다', 'curious', { wisdom: 3 }, '마지막 칸까지 채워 응모 엽서를 보냈다.', {
        follow: [echoLater([1, 2], '십자말풀이 당첨', '응모한 십자말풀이가 당첨되어 상품권이 우편으로 왔다.', { money: 200, joy: 3 }, 0.4)] }],
      ['손주와 같이 푼다', 'caring', { bond: 3, joy: 2 }, '포켓몬 이름은 아이가, 옛날 지명은 내가 맞혔다.'],
      ['어려워서 덮는다', 'easygoing', { joy: 1 }, '정답은 다음 주 신문에서 보기로 했다.'],
    ], again(4)],
    ['hobby-choir', 30, 90, '동네 합창단', '구민회관 합창단이 단원을 모집한다. 정기 공연이 석 달 뒤다.', [
      ['입단한다', 'caring', { joy: 3, bond: 2 }, '화음이 처음 맞은 날 소름이 돋았다.', {
        follow: [choiceLater([1, 3], '독창 제안', '합창단 지휘자가 정기 공연에서 독창을 맡아 달라고 한다.', [
          ['독창을 맡는다', 'bold', { courage: 4, reputation: 2 }, '떨리는 첫 소절을 넘기자 목소리가 회관을 채웠다.'],
          ['합창에 남는다', 'easygoing', { joy: 2 }, '여럿이 함께 부르는 편이 더 좋았다.'],
        ], 0.6)] }],
      ['반주를 돕는다', 'curious', { wisdom: 2, joy: 2 }, '낡은 피아노로 연습 반주를 맡았다.'],
      ['공연만 보러 간다', 'easygoing', { joy: 2 }, '맨 앞줄에서 박수를 쳤다.'],
    ]],
    ['hobby-calligraphy', 40, 95, '서예', '서예 학원 앞에 붓글씨로 쓴 포켓몬 이름들이 걸려 있다.', [
      ['붓을 잡는다', 'curious', { wisdom: 3, joy: 1 }, '파트너 이름 석 자를 백 번 썼다.', {
        follow: [echoLater([2, 4], '서예 전시', '꾸준히 쓴 붓글씨가 구민 서예전에 걸렸다. 작품 옆에 파트너 사진도 붙었다.', { reputation: 2, joy: 2 })] }],
      ['한지와 붓을 장만한다', 'pragmatic', { money: -100, wisdom: 2 }, '좋은 붓으로 쓰니 획이 달랐다.'],
      ['구경만 한다', 'easygoing', { joy: 1, wisdom: 1 }, '먹 냄새가 좋았다.'],
    ]],
    ['hobby-grooming', 16, 80, '포켓몬 미용', '포켓몬 미용 자격증 강좌가 열린다. 털 손질과 발톱 다듬기를 배운다.', [
      ['자격증 강좌를 듣는다', 'pragmatic', { wisdom: 2, money: -250 }, '석 달 과정을 마치고 자격증을 받았다.', {
        follow: [echoLater([1, 3], '주말 미용 일', '자격증을 보고 동네 미용실에서 주말 일을 맡겼다. 쏠쏠한 부수입이 생겼다.', { money: 400, joy: 2 }, 0.8)] }],
      ['파트너만 다듬어 준다', 'caring', { bond: 3 }, '반들반들해진 파트너가 거울 앞을 떠나지 않았다.', { affection: 3 }],
      ['영상으로 배운다', 'easygoing', { joy: 1, wisdom: 1 }, '한쪽만 짧아졌지만 파트너는 개의치 않았다.'],
    ]],
    ['hobby-dance', 13, 45, '댄스 동아리', '춤추는 포켓몬을 따라 하는 댄스 동아리가 생겼다.', [
      ['무대 공연을 준비한다', 'bold', { courage: 3, joy: 3 }, '', spot([741], '{pk:과} 똑같은 동작으로 마지막 포즈를 맞췄다.')],
      ['파트너와 둘이 춘다', 'caring', { bond: 3 }, '파트너가 박자에 맞춰 꼬리를 흔들었다.', { affection: 2 }],
      ['구경하며 박수만 친다', 'easygoing', { joy: 2 }, '보기만 해도 신이 났다.'],
    ]],
  ]),
  ...table('local', [
    ['hobby-karaoke', 15, 70, '노래방', '퇴근길에 노래방 간판이 반짝인다. 포켓몬 주제가 신곡이 들어왔다고 한다.', [
      ['목이 쉬도록 부른다', 'bold', { joy: 4, courage: 1, money: -50 }, '마지막 곡 점수가 100점이 나왔다.'],
      ['{friend|과|와} 듀엣을 한다', 'caring', { joy: 3, money: -50 }, '{friend|과|와} 화음이 기가 막히게 맞았다.', { cast: { friend: { affinity: 5 } } }],
      ['집에서 혼자 부른다', 'easygoing', { joy: 2 }, `${poke(39, '의', '의')} 자장가를 흥얼거리다 그대로 잠들었다.`],
    ], again(5)],
    ['hobby-hiking-club', 25, 80, '등산 동호회', '마을 등산 동호회가 주말마다 근처 산을 오른다.', [
      ['정상 정복을 노린다', 'bold', { vitality: 3, courage: 3 }, '정상 표지석을 끌어안고 사진을 찍었다.', check('vitality', 8, '하산길에 발목을 삐었다.', { vitality: -2 })],
      ['산길 쓰레기를 줍는다', 'caring', { reputation: 2 }, '봉투 세 개를 가득 채워 내려왔다.', { world: { ecology: 2 } }],
      ['산 포켓몬을 찾는다', 'curious', { wisdom: 2 }, '', spot([74, 66, 95, 246], '바위틈에서 {pk:이} 졸고 있었다.')],
    ], { when: s => ['산', '숲'].includes(town(s).environment) }],
    ['hobby-sandlot-baseball', 10, 50, '동네 야구', '공터에서 동네 야구 시합이 벌어졌다. 한 명이 모자란다.', [
      ['4번 타자로 나선다', 'bold', { courage: 3, joy: 3 }, '끝내기 안타를 쳤다.', check('vitality', 6, '헛스윙 삼진을 세 번 당했다.', { joy: -1 })],
      ['{friend}네 팀에 들어간다', 'caring', { joy: 3 }, '{friend|과|와} 손바닥을 마주치며 이겼다.', { cast: { friend: { affinity: 5 } } }],
      ['공 줍기 담당을 한다', 'easygoing', { vitality: 2, joy: 1 }, '파트너가 공을 물어 오는 데 재미를 붙였다.', { affection: 1 }],
    ]],
    ['hobby-shell-collect', 8, 90, '조개껍질 수집', '태풍이 지나간 뒤 해변에 예쁜 조개껍질이 잔뜩 밀려왔다.', [
      ['병에 모은다', 'curious', { wisdom: 2, joy: 2 }, '', spot([90, 120, 222, 98], '조개껍질 더미 속에서 {pk:이} 꼼지락거렸다.')],
      ['목걸이를 만들어 판다', 'pragmatic', { money: 150 }, '관광객들이 조개 목걸이를 금세 사 갔다.'],
      ['바다로 돌려보낸다', 'caring', { bond: 2 }, '아직 주인이 있는 껍질은 물가에 살며시 내려놓았다.', { world: { ecology: 1 } }],
    ], { once: false, cooldown: 5, when: s => town(s).environment === '바다' }],
  ]),
  ...table('opportunity', [
    ['hobby-painting', 12, 90, '사생대회', '공원에서 포켓몬 사생대회가 열린다. 그림 그리는 포켓몬도 참가한다고 한다.', [
      ['진지하게 그린다', 'curious', { wisdom: 3, money: 250, reputation: 1 }, '파트너 그림이 금상을 받았다.', check('wisdom', 10, '물감이 번져 파트너가 구름처럼 보였다.', { joy: 1 })],
      ['포켓몬과 같이 그린다', 'easygoing', { joy: 3 }, '', spot([235], '옆 자리 {pk:이} 꼬리 붓으로 내 그림에 덧칠을 했다.')],
      ['물감 세트를 산다', 'pragmatic', { money: -120, wisdom: 2 }, '스물네 색 물감으로 집 창밖 풍경을 그렸다.'],
    ]],
    ['hobby-tcg', 9, 50, '카드 대회', '동네 카드 가게에서 포켓몬 카드 게임 대회가 열린다. 참가비는 30P다.', [
      ['덱을 짜서 출전한다', 'bold', { courage: 2, money: 300, joy: 3 }, '결승에서 마지막 한 장을 뽑아 역전승했다.', { cost: 30,
        ...check('wisdom', 10, '2회전에서 상성 나쁜 덱을 만났다.', { joy: -1 }) }],
      ['카드를 교환한다', 'easygoing', { joy: 3 }, '반짝이는 카드를 한 장 손에 넣었다.', { cast: { friend: { affinity: 3 } } }],
      ['안 쓰는 카드를 판다', 'pragmatic', { money: 120 }, '서랍 속 카드가 의외로 값이 나갔다.'],
    ]],
    ['hobby-arcade', 15, 60, '오락실 대회', '역 앞 오락실에서 고전 포켓몬 게임 기록 경신 대회가 열린다.', [
      ['기록에 도전한다', 'bold', { courage: 2, joy: 3, money: 200 }, '전광판 1위에 이름 세 글자를 새겼다.', check('courage', 8, '마지막 판에서 손이 떨렸다.', { joy: -1 })],
      ['구경꾼이 된다', 'easygoing', { joy: 2 }, '고수들의 손놀림을 보며 감탄했다.'],
      ['동전을 털어 넣는다', 'easygoing', { joy: 3, money: -40 }, '오랜만에 어린 시절로 돌아간 기분이었다.'],
    ]],
    ['hobby-model-kit', 12, 70, '조립 모형', '정밀한 포켓몬 조립 모형 신제품이 나왔다. 부품이 삼백 개다.', [
      ['밤새 조립한다', 'curious', { wisdom: 3, vitality: -1, money: -150 }, '완성한 모형이 책상 위에서 빛났다.'],
      ['조립 대행을 해 준다', 'pragmatic', { money: 250, wisdom: 1 }, '손이 정교하다는 소문이 나서 주문이 들어왔다.'],
      ['상자만 보고 만다', 'easygoing', { joy: 1 }, '언젠가 만들겠다며 상자를 책장에 올려 두었다.'],
    ]],
    ['hobby-birdwatch', 20, 90, '탐조', '쌍안경을 들고 새 포켓몬을 찾아 들판으로 나섰다.', [
      ['새벽부터 기다린다', 'curious', { wisdom: 3 }, '', spot([16, 21, 163, 276, 396, 519, 661, 731, 821], '수풀 위로 {pk:이} 날아올랐다. 탐조 수첩에 한 줄이 늘었다.')],
      ['탐조 모임을 꾸린다', 'caring', { reputation: 2, joy: 2 }, '모임 사람들과 지방 새 포켓몬 지도를 만들었다.', { world: { ecology: 1 } }],
      ['좋은 쌍안경을 산다', 'pragmatic', { money: -200, wisdom: 2 }, '날갯깃 무늬까지 또렷하게 보였다.'],
    ], again(6)],
  ]),
];

export const HOBBIES = [...fishing, ...berries, ...photos, ...regional, ...festivals, ...pastimes];
