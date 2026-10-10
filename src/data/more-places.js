// Place-shaped events: the town's surroundings, each region's own culture and extra reactions to regional conditions.
import { table, check, later, localSpecies, town } from './event-kit.js';
import { hasCondition, currentRegion } from '../sim/world.js';
import { poke } from '../sim/text.js';

const env = name => ({ when: s => town(s).environment === name });
const inRegion = id => ({ when: s => currentRegion(s) === id });
const during = id => ({ once: false, cooldown: 4, weight: () => 2, when: s => hasCondition(s, id) });
// {pk} is the species name; {pk:을} / {pk:이} add the matching particle.
const sight = text => s => { const id = localSpecies(s); return { observe: id, outcome: text.replace('{pk:을}', poke(id, '을', '를')).replace('{pk:이}', poke(id, '이', '가')).replace('{pk}', poke(id)) }; };

const surroundings = table('local', [
  // 숲
  ['forest-mushrooms', 8, 85, '버섯 채집철', '숲 바닥에 버섯이 가득 올라왔다. 독버섯도 섞여 있다.', [
    ['꼼꼼히 구별해 딴다', 'curious', { wisdom: 4, money: 120 }, '좋은 버섯만 골라 시장에 팔았다.'],
    ['포켓몬에게 냄새로 찾게 한다', 'caring', { bond: 4 }, '파트너가 맛있는 버섯만 쏙쏙 찾아냈다.', { affection: 2 }],
    ['구경만 한다', 'easygoing', { joy: 2 }, '숲 냄새를 맡으며 산책했다.'],
  ], env('숲')],
  ['forest-cabin', 10, 85, '숲속 오두막', '숲 깊은 곳에서 버려진 오두막을 발견했다.', [
    ['안을 탐색한다', 'bold', { courage: 4 }, '', sight('오두막 다락에 둥지를 튼 {pk} 가족을 발견했다.')],
    ['고쳐서 쉼터로 만든다', 'caring', { bond: 3, money: -100 }, '여행자와 포켓몬의 쉼터가 생겼다.', { world: { ecology: 1 } }],
    ['위치만 기록한다', 'curious', { wisdom: 2 }, '지도에 표시해 두었다.'],
  ], env('숲')],
  ['forest-nest', 6, 80, '떨어진 둥지', '태풍이 지나간 뒤 나무 아래 둥지가 떨어져 있다.', [
    ['나무에 올려 둔다', 'bold', { courage: 3, bond: 2 }, '어미 포켓몬이 돌아와 둥지에 앉았다.', check('vitality', -5, '나무에서 미끄러져 무릎이 까졌다.', { vitality: -3 })],
    ['레인저에게 알린다', 'pragmatic', { wisdom: 2 }, '레인저가 와서 둥지를 옮겼다.', { world: { ecology: 1 } }],
  ], env('숲')],
  ['forest-watchtower', 16, 75, '산불 감시탑', '건조한 계절, 산불 감시 자원봉사자를 모집한다.', [
    ['감시탑을 지킨다', 'caring', { reputation: 2, vitality: -2 }, '작은 연기를 일찍 발견해 큰불을 막았다.', { world: { ecology: 3 } }],
    ['물 포켓몬과 순찰한다', 'bold', { courage: 3 }, '파티의 포켓몬과 숲을 돌며 불씨를 껐다.', { training: 15 }],
    ['다른 사람에게 맡긴다', 'easygoing', { joy: 1 }, '이번 계절은 다른 사람들이 맡았다.'],
  ], env('숲')],
  // 바다
  ['sea-shipwreck', 12, 75, '난파선', '썰물 때 드러나는 난파선이 있다는 소문이 돈다.', [
    ['잠수해 탐사한다', 'bold', { courage: 5, money: 200 }, '선실에서 오래된 동전 상자를 건졌다.', check('vitality', 10, '물살이 거세 금방 돌아왔다.', { vitality: -4 })],
    ['기록을 조사한다', 'curious', { wisdom: 4 }, '배의 이름과 침몰 연도를 알아냈다.'],
  ], env('바다')],
  ['sea-fisher', 10, 80, '어부의 부탁', '그물에 걸린 포켓몬이 날뛰어 어부가 도움을 청한다.', [
    ['그물을 풀어 준다', 'caring', { bond: 4, reputation: 1 }, '', sight('그물에서 풀려난 {pk:이} 물살을 가르며 사라졌다.')],
    ['배틀로 진정시킨다', 'bold', { courage: 3 }, '파티 포켓몬이 날뛰는 포켓몬을 진정시켰다.', { training: 20 }],
  ], env('바다')],
  ['sea-cleanup', 8, 85, '해변 정화', '폭풍 뒤 해변에 쓰레기가 밀려왔다.', [
    ['정화 활동에 나선다', 'caring', { vitality: -2, reputation: 1 }, '깨끗해진 모래사장에 포켓몬이 돌아왔다.', { world: { ecology: 3 } }],
    ['쓸 만한 걸 줍는다', 'pragmatic', { money: 100 }, '고철을 모아 팔았다.'],
  ], env('바다')],
  ['sea-lighthouse', 14, 85, '등대지기의 휴가', '등대지기가 휴가를 간 동안 등대를 맡아 달라고 한다.', [
    ['맡는다', 'caring', { wisdom: 3, money: 200 }, '밤바다를 지키며 일주일을 보냈다.'],
    ['전기 포켓몬에게 맡긴다', 'curious', { bond: 2, money: 150 }, '파티의 전기 포켓몬이 불빛을 대신 밝혔다.'],
  ], env('바다')],
  // 산
  ['mountain-avalanche', 14, 75, '눈사태 경고', '등산로에 눈사태 경고가 내려졌다. 산장에 등산객이 남아 있다.', [
    ['구조대에 합류한다', 'bold', { courage: 5, reputation: 3 }, '등산객 전원을 무사히 데리고 내려왔다.', check('vitality', 10, '중간에 길이 막혀 돌아섰다.', { vitality: -5 })],
    ['아래에서 물자를 지원', 'pragmatic', { wisdom: 2 }, '따뜻한 음식과 담요를 날랐다.'],
  ], env('산')],
  ['mountain-hotspring', 8, 95, '숨은 온천', '산허리에서 김이 피어오르는 웅덩이를 발견했다.', [
    ['파티와 몸을 담근다', 'easygoing', { vitality: 6, joy: 4 }, '포켓몬들도 눈을 감고 늘어졌다.', { affection: 3 }],
    ['마을에 알린다', 'caring', { reputation: 2 }, '마을의 새 쉼터가 생겼다.'],
  ], env('산')],
  ['mountain-alpine', 12, 80, '고산 식물', '희귀한 고산 꽃이 피었다는 소식이 왔다.', [
    ['사진만 찍는다', 'curious', { wisdom: 3, joy: 2 }, '꽃 위에 앉은 포켓몬까지 찍었다.'],
    ['보호 울타리를 세운다', 'caring', { bond: 2 }, '등산객이 밟지 않도록 울타리를 세웠다.', { world: { ecology: 2 } }],
  ], env('산')],
  ['mountain-rockslide', 16, 75, '낙석 도로', '낙석으로 마을로 들어오는 길이 막혔다.', [
    ['힘센 포켓몬으로 치운다', 'bold', { courage: 3, reputation: 2 }, '하루 만에 길을 텄다.', { training: 25 }],
    ['우회로를 안내한다', 'pragmatic', { wisdom: 2 }, '우회로 표지판을 세웠다.'],
  ], env('산')],
  // 강
  ['river-bridge', 14, 80, '낡은 다리', '마을의 나무다리가 삐걱거린다.', [
    ['보수를 돕는다', 'caring', { vitality: -2, reputation: 2 }, '이웃들과 판자를 새로 깔았다.'],
    ['수리비를 기부한다', 'pragmatic', { reputation: 2, money: -200 }, '튼튼한 새 다리가 놓였다.'],
  ], env('강')],
  ['river-fishing-contest', 8, 90, '강 낚시 대회', '강변에서 낚시 대회가 열린다.', [
    ['출전한다', 'bold', { joy: 4, money: 150 }, '', s => ({ ...sight('대어 {pk:을} 낚아 상금을 받았다.')(s), ...check('joy', 0, '하루 종일 입질 한 번 없었다.', { joy: -1 }) })],
    ['구경한다', 'easygoing', { joy: 3 }, '강바람을 맞으며 응원했다.'],
  ], env('강')],
  ['river-flood-prep', 16, 80, '장마 대비', '장마를 앞두고 둑을 보강한다.', [
    ['모래주머니를 쌓는다', 'caring', { vitality: -3, reputation: 2 }, '마을 사람들과 둑을 높였다.', { world: { safety: 2 } }],
    ['물길을 조사한다', 'curious', { wisdom: 4 }, '약한 둑 위치를 찾아 알렸다.'],
  ], env('강')],
  ['river-promenade', 10, 95, '강변 산책로', '새 강변 산책로가 열렸다.', [
    ['매일 아침 걷는다', 'easygoing', { vitality: 4 }, '파트너와 아침마다 산책로를 걸었다.', { affection: 2 }],
    ['관찰 일지를 쓴다', 'curious', { wisdom: 3 }, '', sight('산책로 덤불에서 {pk}의 둥지를 찾았다.')],
  ], env('강')],
  // 도시
  ['city-subway', 10, 80, '지하철의 포켓몬', '지하철 선로에 포켓몬이 들어가 운행이 멈췄다.', [
    ['구조를 돕는다', 'bold', { courage: 4, reputation: 2 }, '포켓몬을 무사히 꺼냈다.'],
    ['역무원에게 맡긴다', 'pragmatic', { wisdom: 1 }, '운행이 곧 재개됐다.'],
  ], env('도시')],
  ['city-construction', 18, 75, '고층 공사장', '공사장 소음 때문에 근처 포켓몬들이 불안해한다.', [
    ['민원을 넣는다', 'pragmatic', { wisdom: 2 }, '공사 시간이 조정됐다.', { world: { ecology: 1 } }],
    ['공사장에서 일한다', 'bold', { money: 300, vitality: -3 }, '격투 포켓몬과 함께 자재를 날랐다.'],
  ], env('도시')],
  ['city-night-photo', 14, 85, '야경 촬영', '도시 야경과 포켓몬을 함께 찍는 사진 대회가 열린다.', [
    ['출품한다', 'curious', { joy: 3, reputation: 1 }, '빛나는 포켓몬과 도시 불빛을 함께 담았다.', check('wisdom', 0, '사진이 흔들려 탈락했다.', { joy: -1 })],
    ['구경한다', 'easygoing', { joy: 2 }, '전시회를 둘러봤다.'],
  ], env('도시')],
  ['city-busking', 12, 80, '거리 공연', '광장에서 포켓몬과 함께하는 거리 공연이 유행이다.', [
    ['파트너와 공연한다', 'bold', { joy: 5, money: 100 }, '모자에 동전이 가득 찼다.', { affection: 2 }],
    ['구경꾼이 된다', 'easygoing', { joy: 3 }, '다른 트레이너의 공연에 박수를 쳤다.'],
  ], env('도시')],
]);

const regions = table('regional', [
  ['kanto-safari', 12, 75, '사파리존 개장일', '관동의 사파리존이 특별 개장한다.', [
    ['사파리볼로 도전한다', 'bold', { joy: 4 }, '', s => { const id = localSpecies(s); return { cost: 100, captureJoin: id, outcome: `${poke(id, '을', '를')} 사파리볼로 잡았다.`, ...check('courage', 5, '미끼만 다 쓰고 빈손으로 나왔다.', { joy: 1 }) }; }],
    ['관찰만 한다', 'curious', { wisdom: 4 }, '', sight('초원에서 {pk} 무리를 관찰했다.')],
  ], inRegion('kanto')],
  ['kanto-power-plant', 16, 70, '무인발전소 점검', '관동 무인발전소에 전기 포켓몬이 몰려든다.', [
    ['점검대에 합류한다', 'bold', { courage: 4, money: 200 }, '전기 포켓몬을 진정시키며 설비를 점검했다.', { training: 20 }],
    ['원인을 분석한다', 'curious', { wisdom: 4 }, '누전된 송전선이 포켓몬을 끌어들인 원인이었다.'],
  ], inRegion('kanto')],
  ['johto-radio-quiz', 10, 85, '라디오 퀴즈', '금빛 라디오가 포켓몬 퀴즈 청취자를 찾는다.', [
    ['전화를 건다', 'curious', { money: 300, joy: 3 }, '마지막 문제까지 맞혀 상품을 받았다.', check('wisdom', 10, '아깝게 두 번째 문제에서 탈락했다.', { joy: 1 })],
    ['듣기만 한다', 'easygoing', { joy: 2 }, '정답을 속으로 맞히며 들었다.'],
  ], inRegion('johto')],
  ['johto-bug-catching', 8, 60, '국립공원 벌레잡기 대회', '성도 국립공원에서 정기 벌레잡기 대회가 열린다.', [
    ['출전한다', 'bold', { courage: 3, joy: 3 }, '', s => { const id = localSpecies(s); return { captureJoin: id, outcome: `${poke(id, '을', '를')} 잡아 입상했다.`, ...check('courage', 0, '제한 시간 안에 아무것도 잡지 못했다.', { joy: -1 }) }; }],
    ['심사 보조를 맡는다', 'curious', { wisdom: 3 }, '참가자들이 잡은 포켓몬의 크기를 쟀다.'],
  ], inRegion('johto')],
  ['hoenn-secret-base', 8, 50, '비밀기지', '호연의 아이들이 덤불과 나무 구멍에 비밀기지를 만드는 게 유행이다.', [
    ['나만의 비밀기지', 'bold', { joy: 5 }, '나무 구멍 안에 작은 기지를 꾸몄다.'],
    ['친구들과 함께 만든다', 'caring', { joy: 4 }, '{friend|과|와} 기지를 꾸미며 해가 지는 줄 몰랐다.', { cast: { friend: { affinity: 6 } } }],
  ], inRegion('hoenn')],
  ['hoenn-contest', 12, 70, '포켓몬 콘테스트', '호연 콘테스트 회장에서 신인 부문이 열린다.', [
    ['멋짐 부문 출전', 'bold', { reputation: 2, joy: 4 }, '박력 있는 연기로 리본을 받았다.', check('courage', 5, '연기 순서가 꼬여 입상하지 못했다.', { joy: -1 })],
    ['귀여움 부문 출전', 'caring', { bond: 4, joy: 3 }, '파트너의 애교에 심사위원이 웃었다.', check('bond', 0, '파트너가 무대에서 얼어 버렸다.', { joy: -1 })],
    ['관람한다', 'easygoing', { joy: 2 }, '기술 연계의 아름다움을 배웠다.'],
  ], inRegion('hoenn')],
  ['sinnoh-underground', 12, 70, '지하통로 탐험', '신오 지하통로에서 화석과 구슬을 캘 수 있다.', [
    ['깊이 파 내려간다', 'bold', { courage: 3, money: 250 }, '반짝이는 구슬을 캐냈다.', check('vitality', 5, '벽이 무너질 것 같아 물러났다.', { vitality: -2 })],
    ['다른 탐험가와 교환한다', 'caring', { joy: 3 }, '교환으로 원하던 장식품을 얻었다.'],
  ], inRegion('sinnoh')],
  ['sinnoh-poketch', 12, 80, '포켓치 앱 개발', '신오의 포켓치 회사가 새 앱 아이디어를 공모한다.', [
    ['아이디어를 낸다', 'curious', { wisdom: 3, money: 200 }, '포켓몬 친밀도 기록 앱이 채택됐다.', check('wisdom', 5, '비슷한 앱이 이미 있었다.', { wisdom: 1 })],
    ['사용 후기만 쓴다', 'easygoing', { joy: 1 }, '후기 이벤트로 작은 선물을 받았다.'],
  ], inRegion('sinnoh')],
  ['unova-musical', 10, 70, '포켓몬 뮤지컬', '하나의 뮤지컬 극장에서 일반인 무대를 연다.', [
    ['파트너와 무대에 선다', 'bold', { joy: 5, reputation: 1 }, '소품을 단 파트너가 박수를 독차지했다.', { affection: 3 }],
    ['소품을 만든다', 'curious', { wisdom: 2, money: 100 }, '만든 소품이 극장 기념품이 됐다.'],
  ], inRegion('unova')],
  ['unova-subway', 16, 70, '배틀 서브웨이', '하나의 배틀 서브웨이 연승 기록에 도전할 수 있다.', [
    ['연승에 도전한다', 'bold', { courage: 4 }, '연승을 이어 가며 서브웨이 마스터와 마주했다.', { battle: { kind: 'league' } }],
    ['관전칸에 탄다', 'easygoing', { joy: 3 }, '창밖으로 스치는 터널 속 배틀을 구경했다.'],
  ], { ...inRegion('unova'), when: s => currentRegion(s) === 'unova' && s.party.length > 0 }],
  ['kalos-cafe', 16, 90, '미르시티 카페', '칼로스의 카페에서 포켓몬 동반 손님을 환영한다.', [
    ['단골이 된다', 'easygoing', { joy: 4, money: -60 }, '창가 자리가 내 자리가 됐다.'],
    ['아르바이트를 한다', 'pragmatic', { money: 250 }, '포켓몬 전용 디저트를 만드는 법을 배웠다.'],
  ], inRegion('kalos')],
  ['kalos-fashion', 14, 70, '트레이너 패션', '칼로스에서는 옷차림이 트레이너의 개성이다.', [
    ['새 옷을 맞춘다', 'bold', { joy: 4, money: -250, reputation: 1 }, '새 옷을 입고 거리를 걸으니 기분이 달라졌다.'],
    ['포켓몬 리본을 산다', 'caring', { bond: 3, money: -80 }, '파트너에게 리본을 달아 주었다.', { affection: 2 }],
    ['거리 패션을 구경한다', 'easygoing', { joy: 2 }, '쇼윈도를 구경하며 거리를 걸었다.'],
  ], inRegion('kalos')],
  ['alola-ride', 12, 80, '포켓몬 라이드', '알로라에서는 포켓몬 라이드로 섬을 오간다.', [
    ['라이드 자격을 딴다', 'bold', { courage: 4 }, '라프라스 등에 타고 섬 사이를 건넜다.', check('courage', 0, '물 위에서 몇 번이나 떨어졌다.', { vitality: -2 })],
    ['배를 탄다', 'pragmatic', { money: -50 }, '배에서 바닷바람을 맞았다.'],
  ], inRegion('alola')],
  ['alola-malasada', 8, 95, '말라사다 가게', '알로라의 명물 말라사다 가게에 줄이 길다.', [
    ['줄을 선다', 'easygoing', { joy: 5, money: -40 }, '갓 튀긴 말라사다를 파트너와 나눠 먹었다.', { affection: 2 }],
    ['가게 일을 돕는다', 'caring', { money: 150 }, '반죽 비법을 조금 배웠다.'],
  ], inRegion('alola')],
  ['galar-curry', 10, 95, '캠프 카레', '가라르 와일드에리어에서 캠프를 하며 카레를 끓인다.', [
    ['정성껏 끓인다', 'caring', { bond: 4, joy: 3 }, '파티 포켓몬들이 냄비 주위로 모여들었다.', { affection: 4 }],
    ['매운 카레에 도전', 'bold', { courage: 3, joy: 2 }, '모두 땀을 흘리며 웃었다.', { training: 10 }],
  ], inRegion('galar')],
  ['galar-weather', 12, 80, '와일드에리어의 날씨', '와일드에리어의 날씨가 바뀌자 다른 포켓몬이 나타났다.', [
    ['날씨를 쫓아간다', 'bold', { courage: 3 }, '', sight('모래바람 속에서 {pk:을} 발견했다.')],
    ['날씨 기록을 남긴다', 'curious', { wisdom: 4 }, '날씨별 출현 포켓몬 표를 만들었다.'],
  ], inRegion('galar')],
  ['paldea-picnic', 8, 95, '팔데아 피크닉', '팔데아에서는 들판에서 피크닉을 즐기는 게 일상이다.', [
    ['샌드위치를 만든다', 'caring', { joy: 4, bond: 3 }, '파티 포켓몬들과 들판에서 점심을 먹었다.', { affection: 3 }],
    ['피크닉 중 알을 발견', 'curious', { joy: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'egg', outcome: `바구니 옆에서 발견한 알에서 ${poke(id, '이', '가')} 태어났다.` }; }],
  ], inRegion('paldea')],
  ['paldea-academy-trip', 12, 22, '아카데미 보물찾기', '팔데아 아카데미 학생들의 보물찾기에 초대받았다.', [
    ['함께 탐험한다', 'bold', { courage: 4 }, '', sight('보물찾기 중 {pk:을} 만났다.')],
    ['길잡이를 맡는다', 'caring', { reputation: 1, wisdom: 2 }, '어린 학생들을 안전하게 안내했다.'],
  ], inRegion('paldea')],
]);

const conditions = table('world', [
  ['cond-recession-market', 18, 90, '중고 장터', '불황 탓에 동네에 중고 장터가 섰다.', [
    ['쓰지 않는 물건을 판다', 'pragmatic', { money: 250 }, '창고가 비고 지갑이 찼다.'],
    ['필요한 걸 싸게 산다', 'pragmatic', { money: -80 }, '좋은 장비를 헐값에 구했다.', { training: 20 }],
    ['물물교환을 연다', 'caring', { reputation: 2 }, '돈 없이도 필요한 걸 나누는 장터가 됐다.', { world: { safety: 1 } }],
  ], during('recession')],
  ['cond-recession-shared', 18, 70, '함께 사는 살림', '경기가 어려워지자 이웃들이 공동 부엌을 만들자고 한다.', [
    ['참여한다', 'caring', { bond: 3, money: 100 }, '식비가 줄고 이웃이 늘었다.'],
    ['혼자 버틴다', 'pragmatic', { wisdom: 2 }, '알뜰하게 지출을 줄였다.'],
  ], during('recession')],
  ['cond-boom-rent', 20, 80, '오르는 집세', '개발 호황으로 집세가 크게 올랐다.', [
    ['더 내고 산다', 'pragmatic', { money: -300 }, '익숙한 동네를 지켰다.'],
    ['같은 지방의 다른 마을로', 'bold', { courage: 2 }, '조용한 옆 마을로 이사했다.', { move: 'region' }],
  ], { ...during('boom'), when: s => hasCondition(s, 'boom') && !s.flags.homeowner }],
  ['cond-boom-hiring', 18, 60, '신규 채용 박람회', '개발 붐으로 채용 박람회가 열렸다.', [
    ['면접을 본다', 'bold', { money: 400 }, '단기 계약으로 큰돈을 벌었다.', check('courage', 0, '면접에서 떨어졌다.', { joy: -1 })],
    ['구경만 한다', 'curious', { wisdom: 2 }, '요즘 뜨는 직업들을 살펴봤다.'],
  ], during('boom')],
  ['cond-syndicate-flyer', 14, 80, '수상한 전단', '"포켓몬을 맡기면 강하게 키워 드립니다"라는 전단이 붙었다. {villain}의 수법 같다.', [
    ['전단을 떼고 신고한다', 'bold', { reputation: 2 }, '경찰이 가짜 육성소를 단속했다.', { world: { safety: 3 } }],
    ['이웃에게 알린다', 'caring', { bond: 2 }, '이웃들이 포켓몬을 맡기지 않았다.', { world: { safety: 1 } }],
  ], during('syndicate')],
  ['cond-syndicate-patrol', 16, 80, '자율 방범대', '{villain}의 활동이 늘자 이웃들이 방범대를 꾸렸다.', [
    ['방범대에 들어간다', 'bold', { courage: 3, vitality: -2 }, '밤마다 파트너와 골목을 돌았다.', { world: { safety: 4 }, training: 15 }],
    ['간식으로 응원한다', 'caring', { bond: 2, money: -50 }, '방범대원들에게 따뜻한 차를 돌렸다.'],
  ], during('syndicate')],
  ['cond-climate-water', 12, 90, '물 부족', '가뭄으로 우물이 말라 간다.', [
    ['물 포켓몬과 급수 봉사', 'caring', { reputation: 3, vitality: -2 }, '물 포켓몬이 마을에 물을 날랐다.', { world: { ecology: 2 } }],
    ['물을 비축한다', 'pragmatic', { money: -100 }, '집에 물을 넉넉히 받아 두었다.'],
  ], during('climate')],
  ['cond-climate-migrants', 12, 90, '서식지를 잃은 포켓몬', '이상 기후로 서식지를 잃은 포켓몬들이 마을로 내려왔다.', [
    ['임시 보금자리를 만든다', 'caring', { bond: 4 }, '', s => ({ ...sight('뒷마당에 {pk:이} 자리를 잡았다.')(s), world: { ecology: 2 } })],
    ['한 마리를 데려온다', 'bold', { joy: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'rescued', outcome: `떨고 있던 ${poke(id, '을', '를')} 데려왔다.` }; }],
  ], during('climate')],
  ['cond-outbreak-vaccine', 14, 90, '예방 접종 캠페인', '포켓몬 감기 예방 접종 일손이 모자란다.', [
    ['접종 보조를 한다', 'caring', { reputation: 3 }, '하루에 백 마리가 넘는 포켓몬을 달랬다.'],
    ['파티만 접종시킨다', 'pragmatic', { money: -80 }, '파티 모두 접종을 마쳤다.', { affection: -1 }],
  ], during('outbreak')],
  ['cond-outbreak-school', 8, 18, '휴교령', '감기 유행으로 학교가 문을 닫았다.', [
    ['집에서 공부한다', 'curious', { wisdom: 4 }, '혼자 공부하는 법을 익혔다.'],
    ['파트너와 실컷 논다', 'easygoing', { joy: 5 }, '오랜만에 하루 종일 파트너와 놀았다.', { affection: 3 }],
  ], during('outbreak')],
  ['cond-league-inn', 18, 85, '숙소 대란', '리그 관람객이 몰려 숙소가 모자란다.', [
    ['빈방을 빌려준다', 'pragmatic', { money: 400 }, '먼 지방에서 온 트레이너들이 묵어 갔다.'],
    ['무료로 재워 준다', 'caring', { reputation: 2, joy: 3 }, '손님 트레이너와 밤새 배틀 이야기를 했다.'],
  ], during('league')],
  ['cond-league-volunteer', 14, 80, '리그 자원봉사', '리그 운영진이 자원봉사자를 찾는다.', [
    ['선수 대기실 담당', 'curious', { wisdom: 3 }, '정상급 트레이너들의 준비 과정을 가까이서 봤다.'],
    ['포켓몬 회복 담당', 'caring', { bond: 3, reputation: 1 }, '경기를 마친 포켓몬들을 회복시켰다.'],
  ], during('league')],
  ['cond-discovery-photo', 12, 85, '미기록종 사진', '미기록 포켓몬 사진을 찍으면 연구소가 상금을 준다.', [
    ['카메라를 들고 나선다', 'bold', { courage: 3, money: 300 }, '', s => ({ ...sight('{pk}의 희귀한 행동을 사진에 담아 상금을 받았다.')(s), ...check('wisdom', 5, '흐릿한 사진밖에 건지지 못했다.', { joy: -1 }) })],
    ['연구소에 기부한다', 'caring', { reputation: 2, money: -100 }, '조사 기금에 이름이 올랐다.'],
  ], during('discovery')],
  ['cond-discovery-lecture', 14, 90, '공개 강연', '신종 발견 열풍으로 연구소가 공개 강연을 연다.', [
    ['강연을 듣는다', 'curious', { wisdom: 4 }, '신종 분류 기준을 배웠다.'],
    ['질문을 던진다', 'bold', { wisdom: 2, reputation: 1 }, '날카로운 질문에 박사가 웃었다.'],
  ], during('discovery')],
  ['cond-legend-tourists', 18, 85, '관광객 행렬', '전설 목격 소문에 관광객이 몰려 마을이 북적인다.', [
    ['안내 일을 한다', 'pragmatic', { money: 300 }, '관광객 안내로 짭짤한 수입을 올렸다.'],
    ['서식지 보호를 외친다', 'caring', { reputation: 2 }, '출입 제한 구역을 만들었다.', { world: { ecology: 3 } }],
  ], during('legend')],
  ['cond-legend-sky', 10, 95, '이상한 하늘', '전설의 포켓몬이 지나간 뒤 하늘에 오로라가 떴다.', [
    ['밤새 하늘을 본다', 'easygoing', { joy: 5 }, '평생 잊지 못할 하늘이었다.'],
    ['현상을 기록한다', 'curious', { wisdom: 4 }, '오로라의 색과 시간을 꼼꼼히 기록했다.', { follow: [later('paper-cited', [3, 7], 0.3)] }],
  ], during('legend')],
  ['cond-harvest-jam', 10, 95, '나무열매 잼', '풍작으로 나무열매가 남아돈다.', [
    ['잼을 만들어 판다', 'pragmatic', { money: 200 }, '병마다 이름표를 붙여 팔았다.'],
    ['이웃과 나눈다', 'caring', { joy: 4, reputation: 1 }, '골목마다 잼 냄새가 났다.'],
  ], during('harvest')],
  ['cond-harvest-help', 12, 80, '수확 일손', '농가에 수확 일손이 모자란다.', [
    ['일손을 돕는다', 'caring', { money: 200, vitality: -2 }, '풀 포켓몬과 함께 하루 종일 열매를 땄다.', { training: 15 }],
    ['구경하며 맛본다', 'easygoing', { joy: 3 }, '갓 딴 열매를 맛봤다.'],
  ], during('harvest')],
  ['cond-migration-lost', 8, 90, '길 잃은 새끼', '이동하던 무리에서 떨어진 새끼 포켓몬이 울고 있다.', [
    ['무리를 찾아 데려다준다', 'caring', { bond: 4, reputation: 1 }, '무리가 새끼를 받아 주었다.'],
    ['직접 키운다', 'bold', { joy: 3 }, '', s => { const id = localSpecies(s); return { join: id, joinOrigin: 'rescued', outcome: `${poke(id, '이', '가')} 새 가족이 됐다.` }; }],
  ], during('migration')],
  ['cond-migration-traffic', 16, 85, '교통 통제', '포켓몬 무리가 지나가느라 도로가 통제됐다.', [
    ['통제를 돕는다', 'caring', { reputation: 2 }, '무리가 무사히 길을 건넜다.', { world: { safety: 1 } }],
    ['멀찍이서 관찰한다', 'curious', { wisdom: 3 }, '', sight('행렬 끝에서 {pk:을} 봤다.')],
  ], during('migration')],
]);

export const MORE_PLACES = [...surroundings, ...regions, ...conditions];
