// Six workplace decisions per career. They only appear while the player works in that career.
import { table, check, later, localSpecies, farTown, working } from './event-kit.js';
import { pick } from '../sim/random.js';
import { poke } from '../sim/text.js';

const job = career => ({ when: s => working(s) && s.career === career });
const rows = (career, list) => table('work', list.map(([id, title, body, options]) => [id, 17, 75, title, body, options, job(career)]));

const traveler = rows('traveler', [
  ['work-tr-sponsor', '스폰서 제안', '용품 회사가 경기복에 로고를 달아 달라고 한다.', [
    ['계약한다', 'pragmatic', { money: 600, reputation: 2 }, '계약금을 받았지만 경기 일정이 빡빡해졌다.', { work: { satisfaction: -3 } }],
    ['조건을 협상한다', 'curious', { money: 400 }, '훈련 시간을 보장받는 조건으로 계약했다.', { work: { satisfaction: 5 }, ...check('wisdom', 5, '협상이 결렬됐다.', { wisdom: 1 }) }],
    ['거절한다', 'bold', { courage: 2 }, '내 방식대로 싸우기로 했다.', { work: { satisfaction: 5 } }],
  ]],
  ['work-tr-injured', '경기 중 부상', '준결승 도중 선두 포켓몬이 다리를 절기 시작했다.', [
    ['기권한다', 'caring', { bond: 5, reputation: -1 }, '포켓몬을 먼저 챙겼다. 관중석에서 박수가 나왔다.', { affection: 4 }],
    ['다른 포켓몬으로 교체', 'curious', { wisdom: 3 }, '교체 전술로 버텼지만 결승은 놓쳤다.'],
    ['밀어붙인다', 'bold', { courage: 3, money: 300 }, '이겼지만 포켓몬은 한동안 치료를 받았다.', { affection: -5 }],
  ]],
  ['work-tr-exhibition', '시범 경기 초청', '지방 축제에서 시범 경기를 부탁했다.', [
    ['화려하게 싸운다', 'bold', { reputation: 3, money: 300 }, '관중이 환호하는 경기를 보여 주었다.', check('courage', 5, '긴장해서 실수가 잦았다.', { joy: -2 })],
    ['해설을 곁들인다', 'curious', { reputation: 2, wisdom: 2 }, '아이들이 기술 원리를 이해하며 경기를 봤다.'],
    ['후배에게 양보한다', 'caring', { bond: 2 }, '후배의 첫 무대를 뒤에서 지켜봤다.'],
  ]],
  ['work-tr-tour', '원정 순회', '다른 지방 체육관을 도는 원정 일정이 잡혔다.', [
    ['장기 원정을 떠난다', 'bold', { courage: 5, money: -300 }, '', s => { const t = farTown(s), id = pick(s, t.pool); return { observe: id, training: 30, outcome: `${t.name}까지 원정을 다녀왔다. ${poke(id, '과', '와')}도 마주쳤다.` }; }],
    ['근거리 대회만 나간다', 'pragmatic', { money: 200 }, '가까운 대회에서 꾸준히 상금을 모았다.'],
  ]],
  ['work-tr-fanmail', '팬레터', '어린 팬에게서 손편지가 왔다.', [
    ['정성껏 답장한다', 'caring', { joy: 4, reputation: 1 }, '답장과 함께 사인 사진을 보냈다.'],
    ['사인회를 연다', 'bold', { reputation: 3, vitality: -2 }, '줄이 마을 끝까지 이어졌다.'],
    ['훈련에 집중한다', 'pragmatic', { courage: 2 }, '편지를 훈련장 벽에 붙여 두었다.'],
  ]],
  ['work-tr-rules', '리그 규정 변경', '리그가 사용 가능한 기술 규정을 바꿨다.', [
    ['새 규정에 맞춰 훈련', 'pragmatic', { wisdom: 2 }, '바뀐 규정에 맞게 기술 구성을 바꿨다.', { training: 40 }],
    ['규정을 분석한다', 'curious', { wisdom: 4 }, '새 규정의 빈틈을 찾아냈다.'],
    ['공개적으로 항의한다', 'bold', { courage: 3, reputation: -1 }, '항의는 받아들여지지 않았지만 동료들의 지지를 얻었다.'],
  ]],
]);

const researcher = rows('researcher', [
  ['work-rs-grant', '연구비 공모', '지방 연구 재단이 대형 연구비를 공모한다.', [
    ['대형 과제에 지원', 'curious', { money: 800, reputation: 3 }, '연구비를 따냈다. 연구실이 활기를 띠었다.', check('wisdom', 15, '심사에서 떨어졌다. 심사평을 꼼꼼히 읽었다.', { wisdom: 2 })],
    ['소규모 과제에 지원', 'pragmatic', { money: 200, wisdom: 2 }, '작지만 확실한 연구비를 받았다.'],
    ['올해는 쉰다', 'easygoing', { vitality: 3 }, '지난 연구를 정리하며 한 해를 보냈다.'],
  ]],
  ['work-rs-fraud', '조작된 데이터', '동료의 논문 데이터에서 조작 흔적을 발견했다.', [
    ['공식적으로 문제 삼는다', 'bold', { reputation: 3, joy: -2 }, '조사가 시작됐고 연구실 분위기가 얼어붙었다.', { work: { satisfaction: -5 } }],
    ['동료에게 직접 말한다', 'caring', { wisdom: 3 }, '동료가 논문을 스스로 철회했다.'],
    ['못 본 척한다', 'easygoing', { money: 200, joy: -4 }, '공동 저자로 성과급을 받았다.', { follow: [later('lab-scandal', [2, 5], 0.6)] }],
  ]],
  ['work-rs-fieldwork', '오지 조사', '아무도 조사하지 않은 계곡에 탐사대를 보낸다.', [
    ['직접 간다', 'bold', { reputation: 3, vitality: -3 }, '', s => { const t = farTown(s), id = pick(s, t.pool); return { observe: id, outcome: `계곡 깊은 곳에서 ${poke(id, '을', '를')} 관찰했다.`, ...check('vitality', 5, '폭우로 조사를 접고 돌아왔다.', { vitality: -3 }) }; }],
    ['원격 장비로 분석', 'curious', { wisdom: 4 }, '무인 카메라 영상을 분석했다.'],
    ['후배를 보낸다', 'pragmatic', { reputation: 1 }, '후배가 무사히 자료를 가져왔다.'],
  ]],
  ['work-rs-conference', '학회 발표', '전국 학회에서 발표 기회가 생겼다.', [
    ['구두 발표', 'bold', { reputation: 3, courage: 2 }, '질문이 끊이지 않았다.', check('courage', 5, '긴장해서 준비한 내용의 절반만 말했다.', { joy: -2 })],
    ['포스터 발표', 'curious', { wisdom: 2, reputation: 1 }, '포스터 앞에서 깊은 토론이 오갔다.'],
    ['불참한다', 'easygoing', { vitality: 2 }, '다음 학회를 기약했다.'],
  ]],
  ['work-rs-student', '대학원생 지도', '연구실에 새 대학원생이 들어왔다.', [
    ['직접 지도한다', 'caring', { wisdom: 2, vitality: -2 }, '밤늦게까지 함께 실험했다.', { follow: [later('student-success', [4, 8], 0.7)] }],
    ['자율에 맡긴다', 'easygoing', { joy: 2 }, '알아서 크라고 했다.'],
  ]],
  ['work-rs-discovery', '새로운 행동 관찰', '포켓몬이 도구를 쓰는 듯한 장면을 기록했다.', [
    ['곧바로 발표한다', 'bold', { reputation: 4 }, '학계가 들썩였다.'],
    ['추가 검증한다', 'curious', { wisdom: 5 }, '1년을 더 관찰해 확실한 근거를 쌓았다.', { follow: [later('paper-cited', [3, 7], 0.7)] }],
    ['비공개로 둔다', 'caring', { bond: 2 }, '서식지가 알려지지 않도록 기록을 묻어 두었다.', { world: { ecology: 2 } }],
  ]],
]);

const keeper = rows('keeper', [
  ['work-kp-crowded', '보호소 과밀', '보호소 우리가 모자랄 만큼 포켓몬이 늘었다.', [
    ['입양 행사를 연다', 'caring', { reputation: 3, bond: 3 }, '주말 입양 행사로 열두 마리가 새 가족을 찾았다.'],
    ['한 마리를 직접 입양', 'caring', { joy: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'adopted', outcome: `${poke(id, '을', '를')} 직접 입양했다.` }; }],
    ['확장 예산을 요청한다', 'pragmatic', { reputation: 2 }, '예산이 승인돼 우리를 늘렸다.', { world: { ecology: 2 }, ...check('wisdom', 5, '예산 요청이 반려됐다.', { joy: -2 }) }],
  ]],
  ['work-kp-abuse', '학대 의심 신고', '이웃 트레이너가 포켓몬을 굶긴다는 신고가 들어왔다.', [
    ['직접 출동한다', 'bold', { courage: 4, reputation: 2 }, '굶주린 포켓몬을 구조했다.', { world: { safety: 2 } }],
    ['경찰과 함께 간다', 'pragmatic', { wisdom: 3 }, '절차에 따라 포켓몬을 보호소로 옮겼다.', { world: { safety: 1 } }],
    ['증거부터 모은다', 'curious', { wisdom: 4 }, '빈틈없는 기록으로 소유권을 박탈시켰다.', check('wisdom', 10, '증거가 부족해 경고로 끝났다.', { joy: -3 })],
  ]],
  ['work-kp-night', '야간 응급', '늦은 밤 다친 포켓몬이 실려 왔다. 담당자가 없다.', [
    ['밤샘 처치를 맡는다', 'caring', { bond: 5, vitality: -4, money: 150 }, '새벽에 포켓몬이 눈을 떴다.'],
    ['선배를 부른다', 'pragmatic', { wisdom: 2 }, '선배가 와서 함께 처치했다.'],
  ]],
  ['work-kp-eggs', '한꺼번에 부화', '맡겨진 알 다섯 개가 동시에 흔들린다.', [
    ['직접 하나하나 돌본다', 'caring', { bond: 5, vitality: -2 }, '다섯 마리 모두 무사히 태어났다.'],
    ['연구소와 협력한다', 'curious', { wisdom: 4 }, '부화 과정을 기록해 연구소에 넘겼다.'],
    ['한 마리를 맡아 키운다', 'caring', { joy: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'egg', outcome: `막내로 태어난 ${poke(id, '을', '를')} 맡아 키우기로 했다.` }; }],
  ]],
  ['work-kp-hospice', '마지막을 지키는 일', '나이 든 포켓몬이 보호소에서 마지막 날들을 보내고 있다.', [
    ['곁을 지킨다', 'caring', { bond: 6, wisdom: 3, joy: -3 }, '조용한 마지막을 함께했다.'],
    ['동료에게 맡긴다', 'pragmatic', { joy: 1 }, '다른 업무를 챙겼다.'],
  ]],
  ['work-kp-license', '돌봄 자격 과정', '상급 돌봄 자격 과정이 열린다.', [
    ['수강한다', 'curious', { wisdom: 5, money: -300 }, '상급 자격을 땄다.', { work: { satisfaction: 8 } }],
    ['내년에 한다', 'easygoing', { joy: 1 }, '올해는 넘기기로 했다.'],
  ]],
]);

const merchant = rows('merchant', [
  ['work-mc-rival-shop', '경쟁 가게 개업', '길 건너에 비슷한 가게가 문을 열었다.', [
    ['가격을 내린다', 'pragmatic', { money: -200 }, '손님은 지켰지만 이윤이 줄었다.', { work: { satisfaction: -3 } }],
    ['특화 상품을 만든다', 'curious', { money: 500 }, '직접 만든 나무열매 간식이 명물이 됐다.', check('wisdom', 10, '새 상품이 팔리지 않았다.', { joy: -2 })],
    ['함께 상가 축제를 연다', 'caring', { money: 200, bond: 3 }, '두 가게가 손잡고 거리 축제를 열었다.'],
  ]],
  ['work-mc-branch', '2호점', '다른 동네에 좋은 자리가 났다.', [
    ['2호점을 낸다', 'bold', {}, '2호점 간판을 달았다. 결과는 경기에 달려 있다.', { cost: 1500, effects: { money: -1500 }, follow: [later('branch-result', [2, 4], 1, { amount: 1500 })] }],
    ['지금 가게에 집중한다', 'pragmatic', { wisdom: 2 }, '한 곳을 제대로 키우기로 했다.'],
  ], ],
  ['work-mc-supplier', '공급처 문제', '주요 공급처가 갑자기 납품을 끊었다.', [
    ['새 거래처를 찾는다', 'pragmatic', { wisdom: 3, money: -100 }, '조건이 더 좋은 거래처를 찾았다.'],
    ['직접 재배한다', 'caring', { bond: 2, vitality: -3 }, '뒷마당에 나무열매 밭을 일궜다.', { flag: 'garden' }],
    ['가격을 올린다', 'bold', { money: 200, reputation: -1 }, '단골 몇이 발길을 끊었다.'],
  ]],
  ['work-mc-thief', '가게 도둑', '진열대의 상처약이 계속 없어진다. 범인이 포켓몬을 데리고 다닌다고 한다.', [
    ['잠복해서 붙잡는다', 'bold', { courage: 3 }, '도둑의 포켓몬과 맞섰다.', { battle: { kind: 'villain' }, after: { win: { effects: { reputation: 2 }, world: { safety: 2 } }, lose: { effects: { money: -100, joy: -2 } } } }],
    ['신고한다', 'pragmatic', { wisdom: 1 }, '경찰이 순찰을 늘렸다.', { world: { safety: 1 } }],
    ['보안 장치를 단다', 'pragmatic', { money: -300 }, '그 뒤로 물건이 사라지지 않았다.'],
  ]],
  ['work-mc-festival', '축제 납품', '{town} 축제 운영진이 대량 납품을 요청했다.', [
    ['밤새 준비해 납품한다', 'bold', { money: 450, vitality: -4 }, '축제는 대성공이었다.'],
    ['할 수 있는 만큼만', 'pragmatic', { money: 200 }, '무리하지 않고 약속을 지켰다.'],
    ['다른 가게와 나눈다', 'caring', { money: 150, reputation: 2 }, '이웃 가게들과 일감을 나눴다.'],
  ]],
  ['work-mc-online', '온라인 판매', '젊은 손님들이 온라인 주문을 원한다.', [
    ['온라인 상점을 연다', 'curious', { money: 600 }, '전국에서 주문이 들어오기 시작했다.', check('wisdom', 10, '배송 문제로 반품이 쏟아졌다.', { money: -100 })],
    ['동네 가게로 남는다', 'caring', { joy: 3 }, '얼굴 보고 파는 가게로 남기로 했다.'],
  ]],
]);

export const MORE_WORK = [...traveler, ...researcher, ...keeper, ...merchant];
