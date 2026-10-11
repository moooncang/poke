import { TOWNS } from './world.js';
import { currentRegion } from '../sim/world.js';
// More small automatic moments between decisions (same format as vignettes.js). Each appears once per life.
// Rows: [id, min, max, title, body, effects, when?]
const season = n => s => s.season === n;
const env = name => s => TOWNS.find(t => t.id === s.town).environment === name;
const region = id => s => currentRegion(s) === id;
const job = career => s => s.career === career && !s.work?.retired;
const all = (...tests) => s => tests.every(test => test(s));
const party = n => s => s.party.length >= n;
const boxed = s => s.box.length > 0;
const married = s => s.relationship.status === 'married';
const kids = s => s.relationship.children > 0;
const friendNear = s => s.cast.friend.path !== 'gone';
const rivalMet = s => Boolean(s.cast.rival?.met);
const hasSibling = s => Boolean(s.cast.sibling) && s.cast.sibling.path !== 'gone';
const legend = s => s.party.some(m => m.locked);
const shiny = s => s.party.some(m => m.shiny);
const hatched = s => s.party.some(m => m.origin === 'egg');

const rows = [
  // 날씨·하늘
  ['vx-sky-rainbow', 6, 100, '쌍무지개', '소나기가 그친 뒤 하늘에 무지개가 두 겹으로 걸렸다. {partner|이|가} 무지개 끝을 찾겠다며 앞장섰다.', { joy: 2 }, all(season(1), party(1))],
  ['vx-sky-fog', 6, 100, '짙은 안개', '아침 안개가 너무 짙어 집 앞 우체통도 보이지 않았다. 발소리에 귀를 기울이며 천천히 걸었다.', { courage: 1, wisdom: 1 }, season(2)],
  ['vx-sky-thunder', 6, 100, '천둥 치는 밤', '천둥이 칠 때마다 이불 속으로 파고드는 파티 포켓몬이 하나씩 늘어났다.', { bond: 2, vitality: -1 }, all(season(1), party(2))],
  ['vx-sky-yellowdust', 8, 100, '황사', '봄바람에 누런 모래먼지가 날아와 창틀에 쌓였다. 하루 종일 창문을 닫고 지냈다.', { vitality: -1, wisdom: 1 }, season(0)],
  ['vx-sky-firstsnow', 4, 100, '첫눈', '올해 첫눈이 소리 없이 내렸다. {partner|이|가} 고개를 젖히고 눈송이를 받아먹었다.', { joy: 2 }, all(season(3), party(1))],
  ['vx-sky-aurora', 8, 100, '오로라', '밤하늘에 초록빛 커튼이 일렁였다. 평생 한 번 볼까 말까 한 광경이라고 누군가 속삭였다.', { joy: 2, wisdom: 1 }, all(season(3), env('산'))],
  ['vx-sky-meteor', 8, 100, '유성우', '유성우가 쏟아진다는 밤, 마당에 돗자리를 깔고 누웠다. 소원을 다 빌기도 전에 별이 지나갔다.', { joy: 2 }, season(1)],
  ['vx-sky-hail', 6, 100, '우박', '갑자기 쏟아진 우박이 지붕을 요란하게 두드렸다. 단단한 바위 포켓몬만 태연하게 마당에 서 있었다.', { wisdom: 1 }, season(0)],
  ['vx-sky-monsoon', 10, 100, '장마', '장맛비가 일주일째 그치지 않았다. 빨래가 마르지 않아 방 안이 눅눅했다.', { joy: -1, wisdom: 1 }, season(1)],
  ['vx-sky-sunshower', 6, 100, '여우비', '해가 쨍한데 빗방울이 떨어졌다. 어른들은 어딘가에서 잔치가 열리는 날이라고 했다.', { joy: 1 }, season(1)],
  ['vx-sky-typhoon', 12, 100, '태풍 전야', '태풍이 온다는 소식에 창문에 테이프를 붙이고 화분을 모두 들여놓았다.', { wisdom: 1, vitality: -1 }, season(2)],
  ['vx-sky-highsky', 8, 100, '높은 하늘', '구름 한 점 없는 가을 하늘이 유난히 높았다. 비행 포켓몬 한 마리가 점처럼 멀어졌다.', { joy: 1, wisdom: 1 }, season(2)],
  ['vx-sky-frost', 6, 100, '첫서리', '아침 풀잎마다 하얀 서리가 앉았다. {partner|이|가} 발을 디딜 때마다 바삭바삭 소리가 났다.', { joy: 1 }, all(season(2), party(1))],
  ['vx-sky-blizzard', 10, 100, '눈보라', '눈보라 때문에 이틀 동안 집 밖에 나가지 못했다. 덕분에 미뤄 둔 정리를 끝냈다.', { wisdom: 1, vitality: -1 }, season(3)],
  ['vx-sky-icicle', 6, 100, '고드름', '처마 끝 고드름이 팔뚝만큼 자랐다. 햇볕에 녹아 떨어지는 물소리가 하루 종일 났다.', { joy: 1 }, season(3)],
  ['vx-sky-halo', 10, 100, '달무리', '달 주위에 커다란 빛 고리가 생겼다. 내일 비가 온다는 옛말이 맞을지 궁금했다.', { wisdom: 1 }, season(0)],
  ['vx-sky-dusk', 8, 100, '물드는 구름', '저녁 구름이 분홍색에서 보라색으로 천천히 물들었다. 아무도 먼저 집에 들어가자고 하지 않았다.', { joy: 2 }, season(2)],
  ['vx-sky-gale', 8, 100, '바람 센 날', '바람이 세서 널어 둔 빨래가 담장 너머로 날아갔다. 이웃집 포켓몬이 물어다 주었다.', { joy: 1 }, season(0)],
  ['vx-sky-rainsound', 8, 100, '빗소리', '창문을 두드리는 빗소리를 들으며 아무것도 하지 않았다. {partner|이|가} 무릎 위에서 잠들었다.', { vitality: 1, bond: 1 }, all(season(2), party(1))],
  ['vx-sky-eclipse', 8, 100, '한낮의 어둠', '한낮에 해가 조금씩 가려졌다. 마을 포켓몬들이 일제히 조용해져 이상한 기분이 들었다.', { wisdom: 2 }],
  ['vx-sky-blackout', 8, 100, '벼락과 정전', '벼락이 떨어져 마을 전체가 정전됐다. 촛불을 켜고 파티 포켓몬들과 둘러앉아 이야기를 나눴다.', { bond: 1, joy: 1 }, all(season(1), party(2))],
  ['vx-sky-haze', 10, 100, '아지랑이', '한낮의 길 위로 아지랑이가 피어올랐다. 멀리서 걸어오는 사람이 물결처럼 흔들려 보였다.', { wisdom: 1 }, season(1)],
  ['vx-sky-wintersky', 8, 100, '겨울 별자리', '겨울밤 공기가 차고 맑아 손가락으로 별자리를 이어 보았다.', { wisdom: 1, joy: 1 }, season(3)],
  ['vx-sky-cloudgame', 5, 20, '구름 맞히기', '풀밭에 누워 구름 모양 맞히기 놀이를 했다. 모든 구름이 포켓몬처럼 보였다.', { joy: 2 }, season(0)],
  ['vx-sky-thaw', 8, 100, '눈 녹는 소리', '쌓였던 눈이 녹아 처마에서 물방울이 똑똑 떨어졌다. 봄이 가까워졌다.', { joy: 1 }, season(0)],

  // 마을 환경 — 숲
  ['vx-forest-fairyring', 6, 100, '버섯 고리', '나무 밑에 버섯이 동그랗게 원을 그리며 자라 있었다. 밟지 않으려고 조심조심 돌아갔다.', { wisdom: 1, joy: 1 }, env('숲')],
  ['vx-forest-hollow', 8, 100, '나무 구멍', '큰 나무 구멍 안에 누군가 모아 둔 나무열매가 가득했다. 하나도 건드리지 않고 돌아 나왔다.', { wisdom: 1 }, env('숲')],
  ['vx-forest-moss', 6, 100, '이끼 융단', '비 온 뒤 숲 바닥의 이끼가 융단처럼 푹신했다. {partner|이|가} 그 위를 데굴데굴 굴렀다.', { joy: 2 }, all(env('숲'), party(1))],
  ['vx-forest-shelter', 6, 40, '나뭇가지 쉼터', '쓰러진 가지를 모아 작은 쉼터를 지었다. 저녁 무렵 가 보니 벌레 포켓몬 한 마리가 먼저 들어가 있었다.', { joy: 1, courage: 1 }, env('숲')],
  ['vx-forest-overgrown', 10, 100, '사라진 오솔길', '늘 다니던 오솔길이 웃자란 풀에 덮여 있었다. 기억을 더듬어 겨우 길을 찾았다.', { courage: 1, wisdom: 1 }, env('숲')],
  ['vx-forest-acorns', 6, 100, '도토리 비', '바람이 불 때마다 머리 위로 도토리가 후두둑 떨어졌다. 작은 숲 포켓몬들이 줍느라 바빠졌다.', { joy: 1 }, all(env('숲'), season(2))],
  ['vx-forest-sap', 8, 100, '나무 수액', '나무껍질에서 흐른 단 수액에 벌레 포켓몬들이 모여들었다. 한참을 쪼그려 앉아 지켜봤다.', { wisdom: 2 }, all(env('숲'), season(1))],
  ['vx-forest-stillness', 12, 100, '숲의 정적', '바람이 멎자 숲이 완전히 고요해졌다. 내 숨소리와 {partner}의 숨소리만 들렸다.', { bond: 1, wisdom: 1 }, all(env('숲'), party(1))],

  // 마을 환경 — 바다
  ['vx-sea-auction', 10, 100, '새벽 부두', '{town} 부두는 해 뜨기 전부터 시끌벅적했다. 경매인의 외침이 바닷바람을 타고 골목까지 들려왔다.', { joy: 1, vitality: 1 }, env('바다')],
  ['vx-sea-lighthouse', 6, 100, '등대 불빛', '밤마다 등대 불빛이 방 창문을 한 번씩 스치고 지나갔다. 그 박자에 맞춰 잠이 들었다.', { joy: 1 }, env('바다')],
  ['vx-sea-horn', 6, 100, '뱃고동', '먼바다로 떠나는 배의 뱃고동이 길게 울렸다. {partner|이|가} 따라서 길게 울었다.', { joy: 1, courage: 1 }, all(env('바다'), party(1))],
  ['vx-sea-rockpool', 6, 100, '바위틈 웅덩이', '썰물 때 바위틈 웅덩이에 갇힌 작은 물 포켓몬을 두 손으로 떠서 바다로 돌려보냈다.', { bond: 1, joy: 1 }, env('바다')],
  ['vx-sea-sandcastle', 4, 60, '모래성', '{partner|과|와} 모래성을 쌓았다. 파도가 한 번에 쓸어 갔지만 둘 다 웃었다.', { joy: 2, bond: 1 }, all(env('바다'), party(1))],
  ['vx-sea-rust', 14, 100, '소금기', '바닷바람에 자전거가 또 녹슬었다. 바닷가 마을에서는 무엇이든 금방 녹이 슨다.', { wisdom: 1 }, env('바다')],
  ['vx-sea-driftwood', 14, 100, '떠밀려 온 나무', '해변에 떠밀려 온 커다란 나무토막을 주워 와 툇마루 의자로 만들었다.', { joy: 1, wisdom: 1 }, env('바다')],
  ['vx-sea-glow', 8, 100, '빛나는 밤바다', '밤바다에 발을 담그자 파도마다 푸른 빛이 반짝였다. 작은 바다 포켓몬들이 내는 빛이라고 했다.', { joy: 2 }, all(env('바다'), season(1))],

  // 마을 환경 — 강
  ['vx-river-reeds', 6, 100, '갈대밭', '강변 갈대밭이 바람에 은빛으로 흔들렸다. {partner|이|가} 그 사이로 숨바꼭질을 했다.', { joy: 2 }, all(env('강'), party(1))],
  ['vx-river-stones', 6, 60, '징검다리', '징검다리를 건너다 한 발이 물에 빠졌다. 젖은 신발을 손에 들고 맨발로 집에 왔다.', { joy: 1, courage: 1 }, env('강')],
  ['vx-river-paperboat', 5, 50, '종이배', '종이배를 접어 강물에 띄웠다. 물 포켓몬 한 마리가 한참을 따라 헤엄쳤다.', { joy: 2 }, env('강')],
  ['vx-river-frozen', 6, 100, '언 강', '겨울 강이 꽁꽁 얼어 아이들이 썰매를 탔다. 얼음 밑으로 물 포켓몬 그림자가 천천히 지나갔다.', { joy: 1, courage: 1 }, all(env('강'), season(3))],
  ['vx-river-steam', 10, 100, '물안개', '새벽 강 위로 물안개가 피어올랐다. 다리 난간에 기대 한참을 바라봤다.', { wisdom: 1, joy: 1 }, env('강')],
  ['vx-river-bikepath', 8, 100, '강둑 자전거', '강둑을 따라 자전거를 탔다. {partner|이|가} 앞 바구니에 앉아 바람을 맞았다.', { vitality: 2 }, all(env('강'), party(1))],
  ['vx-river-wader', 10, 100, '물가의 사냥꾼', '다리가 긴 새 포켓몬이 얕은 물에 꼼짝 않고 서 있었다. 누가 먼저 움직이나 겨루다 내가 졌다.', { wisdom: 1 }, env('강')],
  ['vx-river-lullaby', 6, 100, '물소리', '밤에 창문을 열면 강물 흐르는 소리가 자장가처럼 들렸다.', { vitality: 1 }, env('강')],

  // 마을 환경 — 도시
  ['vx-city-elevator', 6, 100, '엘리베이터 버튼', '백화점 엘리베이터에서 {partner|이|가} 층 버튼을 전부 눌러 버렸다. 사람들에게 연신 고개를 숙였다.', { joy: 1 }, all(env('도시'), party(1))],
  ['vx-city-busking', 8, 100, '거리 공연', '광장에서 포켓몬과 함께하는 거리 공연을 봤다. 동전 한 닢을 악기 상자에 넣었다.', { joy: 2 }, env('도시')],
  ['vx-city-construction', 12, 100, '공사장 소음', '집 앞 공사장에서 힘센 격투 포켓몬들이 철근을 날랐다. 소음 때문에 낮잠은 포기했다.', { vitality: -1, wisdom: 1 }, env('도시')],
  ['vx-city-crosswalk', 6, 100, '횡단보도', '신호가 바뀌자 사람과 포켓몬이 한꺼번에 길을 건넜다. 그 물결 속에서 {partner|이|가} 내 옷자락을 꼭 잡았다.', { bond: 1 }, all(env('도시'), party(1))],
  ['vx-city-vending', 8, 100, '자판기 행운', '자판기에서 음료가 두 개 나왔다. 하나는 {partner}의 몫이 됐다.', { joy: 1 }, all(env('도시'), party(1))],
  ['vx-city-lunchpark', 16, 100, '빌딩 사이 공원', '빌딩 사이 작은 공원 벤치에서 점심을 먹었다. 작은 새 포켓몬들이 발치로 모여들었다.', { joy: 1, vitality: 1 }, env('도시')],
  ['vx-city-alley', 12, 100, '골목 미로', '지름길을 찾다 처음 보는 골목에 들어섰다. 간판도 없는 오래된 찻집 하나를 발견했다.', { joy: 1, courage: 1 }, env('도시')],
  ['vx-city-lastbus', 14, 100, '막차', '막차 버스 맨 뒷자리에서 {town} 야경을 바라봤다. 창에 비친 얼굴이 조금 피곤해 보였다.', { joy: 1, wisdom: 1 }, env('도시')],

  // 마을 환경 — 산
  ['vx-mountain-spring', 10, 100, '약수터', '새벽 약수터에 물을 뜨러 가는 어르신들 틈에 끼었다. 물맛이 유난히 달았다.', { vitality: 2 }, env('산')],
  ['vx-mountain-cloudsea', 10, 100, '운해', '산마루에 오르니 발아래로 구름 바다가 펼쳐졌다.', { joy: 2, wisdom: 1 }, env('산')],
  ['vx-mountain-rockfall', 14, 100, '낙석', '밤사이 굴러 내려온 바위가 마을 길을 막았다. 바위 포켓몬들과 힘을 합쳐 길을 텄다.', { vitality: -1, courage: 1 }, env('산')],
  ['vx-mountain-onsen', 8, 100, '노천 온천', '산 중턱 노천 온천에 몸을 담갔다. {partner|이|가} 수건을 머리에 얹고 따라 들어왔다.', { vitality: 2, joy: 1 }, all(env('산'), party(1))],
  ['vx-mountain-maple', 8, 100, '단풍 능선', '능선을 따라 붉은 단풍이 불길처럼 번져 내려왔다.', { joy: 2 }, all(env('산'), season(2))],
  ['vx-mountain-pass', 10, 100, '숨 가쁜 고개', '고개 하나를 넘는데 숨이 턱까지 찼다. {partner|이|가} 몇 번이고 뒤돌아 기다려 주었다.', { vitality: 1, bond: 1 }, all(env('산'), party(1))],
  ['vx-mountain-cave', 8, 100, '동굴 입구', '동굴 입구에서 서늘한 바람이 불어왔다. 안쪽 어둠 속에서 날갯짓 소리가 들렸다.', { courage: 2 }, env('산')],
  ['vx-mountain-hut', 14, 100, '산장 난로', '산장 난로 앞에서 처음 보는 등산객들과 차를 나눠 마셨다.', { joy: 1, wisdom: 1 }, env('산')],

  // 지방 — 관동
  ['vx-kanto-rooftop', 8, 100, '백화점 옥상', '무지개시티 백화점 옥상 자판기 앞에서 오래 고민했다. 결국 처음 고른 음료를 샀다.', { joy: 1 }, region('kanto')],
  ['vx-kanto-lecture', 8, 100, '라디오 강좌', '라디오에서 오박사의 포켓몬 강좌 재방송이 흘러나왔다. 몇 번을 들어도 새로운 이야기가 있었다.', { wisdom: 2 }, region('kanto')],
  ['vx-kanto-cycling', 10, 60, '사이클링 로드', '사이클링 로드의 긴 내리막을 자전거로 내달렸다. 바람이 귓가를 세차게 스쳤다.', { joy: 2, courage: 1 }, region('kanto')],
  ['vx-kanto-seafoam', 10, 100, '쌍둥이섬 소문', '쌍둥이섬 깊은 곳에 얼음 날개를 가진 포켓몬이 잠들어 있다는 이야기를 들었다.', { wisdom: 1, courage: 1 }, region('kanto')],

  // 지방 — 성도
  ['vx-johto-bell', 8, 100, '저녁 종소리', '인주시티 쪽에서 저녁 종소리가 바람을 타고 들려왔다. 하던 일을 멈추고 귀를 기울였다.', { wisdom: 1, joy: 1 }, region('johto')],
  ['vx-johto-radio', 8, 100, '라디오탑 음악', '금빛시티 라디오탑에서 보내는 음악 방송을 틀어 두고 집안일을 했다.', { joy: 1 }, region('johto')],
  ['vx-johto-bugcontest', 6, 100, '벌레잡기 대회', '자연공원에서 열린 벌레잡기 대회를 구경했다. 우승한 포켓몬의 날개가 햇빛에 반짝였다.', { joy: 2 }, region('johto')],
  ['vx-johto-apricorn', 8, 100, '규토리 열매', '길가 나무에서 규토리 열매를 주웠다. 볼 장인에게 가져가면 몬스터볼이 된다고 했다.', { wisdom: 1, joy: 1 }, region('johto')],

  // 지방 — 호연
  ['vx-hoenn-ash', 10, 100, '화산재', '바람을 타고 화산재가 날아와 지붕이 잿빛이 됐다. 털어 내도 다음 날이면 또 쌓였다.', { vitality: -1, wisdom: 1 }, region('hoenn')],
  ['vx-hoenn-secretbase', 6, 30, '비밀기지', '덩굴 뒤 작은 구멍에 비밀기지를 꾸몄다. 방석 하나와 인형 하나가 가구의 전부였다.', { joy: 2 }, region('hoenn')],
  ['vx-hoenn-contest', 8, 100, '콘테스트 구경', '포켓몬 콘테스트를 처음부터 끝까지 봤다. 아름다움 부문의 연기가 오래 눈에 남았다.', { joy: 1, wisdom: 1 }, region('hoenn')],
  ['vx-hoenn-islands', 12, 100, '섬바람', '배를 타고 이웃 섬에 다녀왔다. 섬마다 바람 냄새가 조금씩 달랐다.', { joy: 1, wisdom: 1 }, region('hoenn')],

  // 지방 — 신오
  ['vx-sinnoh-underground', 8, 100, '지하통로', '지하통로에서 화석 조각을 캐냈다. 손톱만 했지만 하루 종일 기분이 좋았다.', { joy: 2 }, region('sinnoh')],
  ['vx-sinnoh-coronet', 8, 100, '천관산', '어느 마을에서나 천관산 봉우리가 보였다. 신오 사람들은 그 산을 보며 길을 찾는다고 했다.', { wisdom: 1 }, region('sinnoh')],
  ['vx-sinnoh-stew', 12, 100, '설원의 국물', '눈이 많이 온 날 신오 사람들처럼 뜨거운 국물 요리를 한 솥 끓였다.', { vitality: 1, joy: 1 }, region('sinnoh')],
  ['vx-sinnoh-myth', 12, 100, '신화 강연', '시간과 공간을 만든 포켓몬에 관한 옛이야기 강연을 들었다. 묻고 싶은 것이 잔뜩 생겼다.', { wisdom: 2 }, region('sinnoh')],

  // 지방 — 하나
  ['vx-unova-subway', 12, 100, '서브웨이 전광판', '배틀 서브웨이 승강장에서 연승 기록 전광판을 올려다봤다. 맨 위 이름은 몇 달째 그대로였다.', { courage: 1, joy: 1 }, region('unova')],
  ['vx-unova-musical', 6, 100, '포켓몬 뮤지컬', '뇌문시티에서 포켓몬 뮤지컬을 봤다. 무대 위 포켓몬들의 장식이 조명에 반짝였다.', { joy: 2 }, region('unova')],
  ['vx-unova-icecream', 6, 100, '노점 아이스크림', '구름시티 노점 아이스크림을 사려고 줄을 섰다. 줄이 길었지만 기다린 보람이 있었다.', { joy: 2 }, region('unova')],
  ['vx-unova-ferris', 10, 100, '관람차', '뇌문시티 관람차 꼭대기에서 하나지방의 불빛이 내려다보였다.', { joy: 1, wisdom: 1 }, region('unova')],

  // 지방 — 칼로스
  ['vx-kalos-prism', 8, 100, '프리즘타워', '미르시티 한가운데 프리즘타워에 불이 켜지자 거리 전체가 환해졌다.', { joy: 1 }, region('kalos')],
  ['vx-kalos-terrace', 16, 100, '테라스 카페', '테라스 카페에서 차 한 잔을 시켜 놓고 오가는 사람들의 옷차림을 구경했다.', { joy: 1, wisdom: 1 }, region('kalos')],
  ['vx-kalos-boutique', 12, 100, '부티크', '부티크에서 모자 하나를 오래 만지작거렸다. 거울 속 {partner|이|가} 고개를 끄덕였다.', { joy: 2 }, all(region('kalos'), party(1))],
  ['vx-kalos-chateau', 10, 100, '오래된 성', '언덕 위 오래된 성의 돌담을 따라 걸었다. 성 안에 아무도 입지 않는 갑옷이 있다는 소문을 들었다.', { wisdom: 1, courage: 1 }, region('kalos')],

  // 지방 — 알로라
  ['vx-alola-malasada', 6, 100, '말라사다', '갓 튀긴 말라사다를 한 입 베어 물었다. 설탕 가루가 {partner}의 코끝에도 묻었다.', { joy: 2 }, all(region('alola'), party(1))],
  ['vx-alola-challengers', 14, 100, '섬순례 아이들', '섬순례 표식을 단 아이들이 바쁘게 마을을 지나갔다. 그 나이 때의 내가 떠올랐다.', { joy: 1, wisdom: 1 }, region('alola')],
  ['vx-alola-dance', 8, 100, '해변의 춤', '해변 축제에서 마을 사람들이 원을 그리며 춤을 췄다. 어색하게 따라 하다 금세 웃음이 터졌다.', { joy: 2 }, region('alola')],
  ['vx-alola-squall', 8, 100, '열대 소나기', '세찬 소나기가 십 분 만에 그치고 다시 해가 났다. 알로라의 날씨에는 아직 적응하는 중이다.', { joy: 1 }, region('alola')],

  // 지방 — 가라르
  ['vx-galar-curry', 10, 100, '캠프 카레', '와일드에리어에 텐트를 치고 카레를 끓였다. 파티 포켓몬들이 냄비 주위에 둘러앉았다.', { joy: 2, bond: 1 }, all(region('galar'), party(2))],
  ['vx-galar-stadium', 8, 100, '스타디움 함성', '짐 챌린지 경기가 열리는 날, 스타디움 함성이 {town}까지 들려왔다.', { joy: 1, courage: 1 }, region('galar')],
  ['vx-galar-tea', 14, 100, '오후의 홍차', '오후 네 시가 되면 가라르 사람들은 홍차를 마신다. 어느새 나도 그 시간이 기다려졌다.', { joy: 1, vitality: 1 }, region('galar')],
  ['vx-galar-beam', 10, 100, '붉은 빛기둥', '멀리 들판에서 붉은 빛기둥이 솟아올랐다. 누군가 맥스레이드배틀을 시작한 모양이었다.', { courage: 1, wisdom: 1 }, region('galar')],

  // 지방 — 팔데아
  ['vx-paldea-sandwich', 8, 100, '피크닉 샌드위치', '피크닉 테이블에 재료를 늘어놓고 샌드위치를 만들었다. 속 재료가 자꾸 옆으로 빠져나왔다.', { joy: 2 }, region('paldea')],
  ['vx-paldea-treasure', 10, 100, '보물찾기 기간', '보물찾기 기간이 되자 지도를 든 학생들이 팔데아 곳곳으로 흩어졌다.', { joy: 1, courage: 1 }, region('paldea')],
  ['vx-paldea-crystal', 10, 100, '들판의 결정', '들판 한가운데 반짝이는 결정이 박혀 있었다. 다가가자 은은한 빛이 맥박처럼 뛰었다.', { wisdom: 1, courage: 1 }, region('paldea')],
  ['vx-paldea-siesta', 12, 100, '긴 점심시간', '한낮에는 가게들이 문을 닫고 다들 그늘에서 쉬었다. 나도 {partner|과|와} 그늘을 찾아 누웠다.', { vitality: 2 }, all(region('paldea'), party(1))],

  // 직업 — 여행하는 트레이너
  ['vx-trav-blister', 16, 80, '물집', '새 신발에 발뒤꿈치가 까졌다. 길가 바위에 앉아 반창고를 붙이는 동안 {partner|이|가} 망을 봤다.', { vitality: -1, bond: 1 }, all(job('traveler'), party(1))],
  ['vx-trav-postcards', 16, 100, '그림엽서', '들르는 마을마다 그림엽서를 한 장씩 사 모았다. 가방 속 엽서 묶음이 제법 두꺼워졌다.', { joy: 1, wisdom: 1 }, job('traveler')],
  ['vx-trav-centernight', 16, 80, '센터 숙소의 밤', '포켓몬센터 숙소에서 처음 만난 트레이너들과 밤늦도록 배틀 이야기를 했다.', { joy: 1, courage: 1 }, job('traveler')],
  ['vx-trav-wrongbus', 16, 100, '잘못 탄 버스', '반대 방향 버스를 타고 한참을 갔다. 내린 정류장 앞 국숫집이 의외로 맛있었다.', { joy: 1 }, job('traveler')],
  ['vx-trav-laundry', 16, 100, '여행 빨래', '여관 세면대에서 양말을 빨아 창틀에 널었다. 여행의 절반은 빨래라는 걸 알게 됐다.', { wisdom: 1 }, job('traveler')],
  ['vx-trav-mapnotes', 18, 100, '지도 여백', '낡은 지도 여백에 지나온 길의 메모가 빼곡해졌다. 지워지지 않게 펜으로 덧썼다.', { wisdom: 1, joy: 1 }, job('traveler')],

  // 직업 — 연구원
  ['vx-res-coffee', 18, 100, '고장 난 커피 머신', '연구실 커피 머신이 고장 나 하루 종일 집중이 되지 않았다.', { vitality: -1 }, job('researcher')],
  ['vx-res-labels', 18, 100, '표본 라벨', '표본 상자 라벨을 하나하나 다시 붙였다. 지루했지만 끝내고 나니 마음이 개운했다.', { wisdom: 1 }, job('researcher')],
  ['vx-res-raincoat', 18, 80, '우비 속까지', '비 오는 날 현장 조사를 나갔다. 우비 속까지 젖었지만 비 오는 날에만 나오는 포켓몬을 봤다.', { wisdom: 2, vitality: -1 }, job('researcher')],
  ['vx-res-revisions', 20, 100, '수정 요청', '보낸 논문이 수정 요청과 함께 돌아왔다. 빨간 글씨가 가득했지만 하나하나 맞는 말이었다.', { wisdom: 2, joy: -1 }, job('researcher')],
  ['vx-res-microscope', 18, 100, '현미경 너머', '현미경으로 포켓몬 털 한 가닥을 들여다봤다. 작은 세계가 생각보다 복잡했다.', { wisdom: 1, joy: 1 }, job('researcher')],
  ['vx-res-assistant', 26, 100, '새 조수', '연구실에 새 조수가 왔다. 첫날의 나처럼 모든 게 신기하다는 얼굴이었다.', { joy: 1, wisdom: 1 }, job('researcher')],

  // 직업 — 돌보미
  ['vx-keep-bath', 18, 100, '목욕 시간', '맡은 포켓몬들을 차례로 씻겼다. 마지막 한 마리가 몸을 털어 나까지 흠뻑 젖었다.', { joy: 1, vitality: -1 }, job('keeper')],
  ['vx-keep-nametags', 18, 100, '밥그릇 이름표', '밥그릇마다 이름표를 새로 달았다. 서로 바꿔 먹는 일이 눈에 띄게 줄었다.', { wisdom: 1 }, job('keeper')],
  ['vx-keep-nightshift', 18, 100, '천둥 치는 당직', '천둥 치는 밤 당직을 섰다. 겁먹은 포켓몬들 곁에서 작은 목소리로 노래를 불렀다.', { bond: 2, vitality: -1 }, job('keeper')],
  ['vx-keep-tangled', 18, 100, '엉킨 산책 줄', '맡은 포켓몬 다섯을 데리고 산책을 했다. 줄이 자꾸 엉켜 한 바퀴에 한 시간이 걸렸다.', { vitality: 1, joy: 1 }, job('keeper')],
  ['vx-keep-update', 20, 100, '근황 사진', '예전에 돌봤던 포켓몬의 보호자가 근황 사진을 보내왔다. 몰라보게 살이 올라 있었다.', { joy: 2 }, job('keeper')],
  ['vx-keep-shedding', 18, 100, '털갈이 철', '털갈이 철이라 하루 종일 빗질을 했다. 모인 털로 쿠션 하나는 채울 수 있을 것 같았다.', { bond: 1, joy: 1 }, job('keeper')],

  // 직업 — 가게 주인
  ['vx-shop-stockroom', 18, 100, '창고 속 상자', '창고 선반을 정리하다 잊고 있던 물건 한 상자를 찾았다. 오늘은 그걸 진열대 맨 앞에 내놓았다.', { wisdom: 1 }, job('merchant')],
  ['vx-shop-shutter', 18, 100, '셔터 소리', '아침에 가게 셔터를 올리는 소리가 하루의 시작이 됐다.', { vitality: 1 }, job('merchant')],
  ['vx-shop-littleguest', 18, 100, '꼬마 손님', '동전을 꼭 쥔 꼬마 손님이 사탕 하나를 사 갔다. 봉투에 몰래 하나를 더 넣어 주었다.', { joy: 2 }, job('merchant')],
  ['vx-shop-window', 18, 100, '진열창', '계절에 맞춰 진열창을 새로 꾸몄다. {partner|이|가} 진열창 안에 들어가 자리를 잡았다.', { joy: 1, bond: 1 }, all(job('merchant'), party(1))],
  ['vx-shop-wholesale', 18, 100, '새벽 도매시장', '새벽 도매시장에서 물건을 떼 왔다. 상인들과 값을 흥정하는 요령이 조금 늘었다.', { wisdom: 1, vitality: -1 }, job('merchant')],
  ['vx-shop-neighbor', 18, 100, '옆 가게', '옆 가게 주인과 거스름돈을 바꿔 주다 친해졌다. 이제 서로의 가게를 잠깐씩 봐 주는 사이다.', { joy: 1, wisdom: 1 }, job('merchant')],

  // 인생 단계 — 유년
  ['vx-kid-recess', 6, 12, '쉬는 시간', '쉬는 시간 종이 울리자마자 운동장으로 뛰어나갔다. 공을 차다가 무릎이 까졌다.', { joy: 2, vitality: -1 }],
  ['vx-kid-allowance', 6, 11, '첫 용돈', '처음 받은 용돈으로 무엇을 살지 사흘을 고민했다. 결국 {partner}의 간식을 샀다.', { bond: 2 }, party(1)],
  ['vx-kid-fort', 6, 10, '이불 요새', '이불과 의자로 요새를 지었다. {partner|이|가} 문지기를 맡았다.', { joy: 2 }, party(1)],
  ['vx-kid-stickers', 6, 12, '스티커 공책', '포켓몬 스티커를 모아 공책에 붙였다. 한 장이 모자라 마지막 칸이 비어 있었다.', { joy: 1, wisdom: 1 }],
  ['vx-kid-shadow', 6, 9, '옷장 그림자', '불을 끄자 옷장 그림자가 무서웠다. {partner|이|가} 이불 끝으로 와서 누웠다.', { courage: 1, bond: 1 }, party(1)],
  ['vx-kid-fieldtrip', 7, 12, '현장 학습', '반 아이들과 포켓몬 연구소로 현장 학습을 갔다. 질문을 제일 많이 한 건 나였다.', { wisdom: 2 }],

  // 인생 단계 — 청소년
  ['vx-teen-cram', 13, 18, '시험 전날', '시험 전날 밤 벼락치기를 했다. {partner|이|가} 책장 넘기는 소리가 날 때마다 눈을 떴다.', { wisdom: 1, vitality: -1 }, party(1)],
  ['vx-teen-diary', 13, 17, '자물쇠 일기장', '자물쇠 달린 일기장을 샀다. 첫 장에 비밀을 적고 열쇠는 {partner}의 잠자리 밑에 숨겼다.', { joy: 1 }, party(1)],
  ['vx-teen-repeat', 13, 18, '반복 재생', '이어폰을 끼고 같은 노래만 몇 시간째 반복해 들었다. 그 노래가 꼭 내 이야기 같았다.', { joy: 1 }],
  ['vx-teen-firstpay', 15, 18, '첫 아르바이트', '첫 아르바이트 월급날, 가족에게 작은 케이크를 사 갔다.', { joy: 2 }],
  ['vx-teen-curfew', 14, 18, '늦은 귀가', '해가 지고 한참 뒤에야 집에 들어갔다. 현관에는 불이 켜져 있었다.', { wisdom: 1, courage: 1 }],
  ['vx-teen-blue', 13, 18, '이유 없는 기분', '이유 없이 기분이 가라앉는 날이었다. {partner|이|가} 말없이 옆에 앉아 있었다.', { bond: 2, joy: -1 }, party(1)],

  // 인생 단계 — 청년
  ['vx-young-unpack', 19, 28, '이삿짐 상자', '혼자 살 방에서 이삿짐 상자를 풀었다. 제일 먼저 꺼낸 건 {partner}의 잠자리였다.', { bond: 1, courage: 1 }, party(1)],
  ['vx-young-suit', 19, 30, '첫 정장', '처음 산 정장이 어색했다. 거울 앞에서 옷깃을 세 번이나 다시 고쳐 세웠다.', { courage: 1 }],
  ['vx-young-classmate', 24, 34, '동창의 결혼식', '동창의 결혼식에 다녀왔다. 축가를 들으며 시간이 참 빠르다고 생각했다.', { joy: 1, wisdom: 1 }],
  ['vx-young-latenoodle', 19, 34, '야식 라면', '밤늦게 끓인 라면 냄비 앞에 파티 포켓몬들이 동그랗게 모여 앉았다.', { joy: 2 }, party(2)],
  ['vx-young-savings', 22, 34, '적금 만기', '처음 든 적금이 만기가 됐다. 통장의 숫자보다 꾸준히 해낸 일이 더 뿌듯했다.', { wisdom: 1, joy: 1 }],
  ['vx-young-homecoming', 20, 34, '명절 귀향', '명절에 고향에 내려가니 내 방이 그대로였다. 책상 위 먼지만 조금 늘어 있었다.', { joy: 1, bond: 1 }, s => s.town !== s.hometown],

  // 인생 단계 — 중년
  ['vx-mid-back', 38, 59, '삐끗한 허리', '무거운 상자를 들다 허리가 삐끗했다. 사흘 동안 {partner|이|가} 물건을 날라 주었다.', { vitality: -2, bond: 1 }, party(1)],
  ['vx-mid-checkup', 38, 59, '건강검진', '건강검진 결과지를 받아 들고 숫자 하나하나를 읽었다. 내일부터 계단으로 다니기로 했다.', { vitality: 1, wisdom: 1 }],
  ['vx-mid-painting', 40, 59, '늦깎이 그림', '마흔 넘어 그림을 배우기 시작했다. 첫 그림 속 {partner}는 실제보다 조금 통통했다.', { joy: 2 }, party(1)],
  ['vx-mid-youngsters', 35, 59, '어린 트레이너들', '길에서 배틀하는 어린 트레이너들을 보며 걸음을 멈췄다. 서툰 기술 지시에 웃음이 났다.', { joy: 1, wisdom: 1 }],
  ['vx-mid-insomnia', 35, 59, '잠 못 드는 밤', '이유 없이 잠이 오지 않아 새벽까지 뒤척였다. {partner}의 고른 숨소리를 세다 겨우 잠들었다.', { vitality: -1, bond: 1 }, party(1)],
  ['vx-mid-oldnotebook', 35, 59, '스무 살의 수첩', '서랍에서 스무 살 때 쓰던 수첩을 찾았다. 그때의 고민이 지금 보니 귀여웠다.', { wisdom: 1, joy: 1 }],

  // 인생 단계 — 노년
  ['vx-old-exercise', 60, 100, '아침 체조', '공원에서 이웃 어르신들과 아침 체조를 했다. {partner|이|가} 동작을 제일 잘 따라 했다.', { vitality: 2 }, party(1)],
  ['vx-old-teacup', 60, 100, '금 간 찻잔', '아끼던 찻잔에 금이 갔다. 버리지 않고 작은 화분으로 쓰기로 했다.', { wisdom: 1 }],
  ['vx-old-tipoftongue', 62, 100, '혀끝의 이름', '오래 알던 포켓몬 이름이 혀끝에서 맴돌았다. 한참 뒤 설거지를 하다 불쑥 떠올랐다.', { wisdom: 1 }],
  ['vx-old-radio', 60, 100, '고친 라디오', '고장 난 라디오를 직접 고쳤다. 지직거리는 소리 뒤로 옛 노래가 흘러나왔다.', { joy: 1, wisdom: 1 }],
  ['vx-old-porch', 60, 100, '툇마루', '툇마루에 앉아 지나가는 아이들에게 손을 흔들었다. 몇몇은 꼬박꼬박 인사를 하고 갔다.', { joy: 2 }],
  ['vx-old-handwriting', 70, 100, '떨리는 글씨', '편지를 쓰는데 글씨가 조금 떨렸다. 그래도 한 글자씩 또박또박 끝까지 썼다.', { wisdom: 1, courage: 1 }],

  // 인연 — 친구
  ['vx-ties-friend-call', 16, 100, '용건 없는 전화', '{friend|이|가} 별일 없다며 전화를 걸어왔다. 한 시간을 떠들고서야 끊었다.', { joy: 2 }, friendNear],
  ['vx-ties-friend-photo', 18, 100, '앞니 빠진 사진', '{friend|과|와} 어릴 때 찍은 사진을 찾았다. 둘 다 앞니가 빠져 있었다.', { joy: 2 }, friendNear],
  ['vx-ties-friend-book', 25, 100, '돌아온 책', '{friend|이|가} 십 년 전에 빌려 간 책을 돌려주었다. 책갈피가 그때 그 자리에 꽂혀 있었다.', { joy: 1, wisdom: 1 }, friendNear],
  ['vx-ties-friend-twins', 8, 30, '같은 옷', '{friend|과|와} 같은 날 똑같은 옷을 입고 나왔다. 서로 한참을 웃었다.', { joy: 2 }, s => s.cast.friend.affinity >= 50],
  ['vx-ties-friend-worry', 16, 100, '짧은 안부', '{friend|이|가} 요즘 힘들어 보인다는 이야기를 들었다. 짧은 안부 문자를 보냈다.', { wisdom: 1, bond: 1 }, s => friendNear(s) && s.cast.friend.affinity < 45],
  ['vx-ties-friend-invite', 20, 100, '청첩장', '{friend|이|가} 결혼한다며 청첩장을 보내왔다. 사진 속 얼굴이 낯설면서도 반가웠다.', { joy: 2 }, s => friendNear(s) && Boolean(s.cast.friend.married)],

  // 인연 — 라이벌
  ['vx-ties-rival-poster', 14, 100, '대회 포스터', '거리 게시판에 {rival}의 대회 포스터가 붙어 있었다. 괜히 한참을 쳐다봤다.', { courage: 2 }, s => rivalMet(s) && ['trainer', 'elite', 'gymleader'].includes(s.cast.rival.path)],
  ['vx-ties-rival-dream', 10, 100, '꿈속 배틀', '꿈에서 {rival|과|와} 배틀을 했다. 승부가 나기 직전에 잠이 깼다.', { courage: 1 }, rivalMet],
  ['vx-ties-rival-diner', 16, 100, '같은 단골집', '단골 식당에서 {rival|과|와} 마주쳤다. 눈인사만 하고 서로 다른 메뉴를 시켰다.', { joy: 1 }, rivalMet],
  ['vx-ties-rival-rumor', 12, 100, '라이벌의 근황', '{rival|이|가} 요즘 새 포켓몬을 키운다는 소문을 들었다. 나도 모르게 훈련 계획을 다시 짰다.', { courage: 1, wisdom: 1 }, rivalMet],
  ['vx-ties-rival-grey', 50, 100, '여전한 눈빛', '오랜만에 본 {rival}의 머리가 하얗게 셌다. 눈빛만은 그대로였다.', { wisdom: 1, joy: 1 }, rivalMet],

  // 인연 — 형제
  ['vx-ties-sib-remote', 6, 18, '리모컨 다툼', '{sibling|과|와} 리모컨을 두고 다퉜다. 결국 둘 다 {partner}에게 리모컨을 빼앗겼다.', { joy: 1 }, s => hasSibling(s) && s.party.length > 0],
  ['vx-ties-sib-latecall', 18, 100, '늦은 밤 전화', '{sibling|이|가} 늦은 밤 고민 상담 전화를 걸어왔다. 끝까지 들어 주기만 했다.', { wisdom: 1, bond: 1 }, hasSibling],
  ['vx-ties-sib-taste', 20, 100, '어릴 적 그 맛', '{sibling|이|가} 어릴 적 먹던 음식을 똑같이 만들어 보내왔다. 한 입 먹자마자 옛집 부엌이 떠올랐다.', { joy: 2 }, hasSibling],
  ['vx-ties-sib-bag', 10, 30, '물려받은 가방', '{sibling}에게서 쓰던 여행 가방을 물려받았다. 손잡이에 낯익은 흠집이 있었다.', { joy: 1 }, hasSibling],

  // 인연 — 배우자
  ['vx-ties-spouse-tea', 20, 100, '두 잔의 차', '일어나 보니 {spouse|이|가} 차 두 잔을 끓여 두었다.', { joy: 2 }, married],
  ['vx-ties-spouse-anniv', 20, 100, '결혼기념일', '결혼기념일을 깜빡할 뻔했다. 급히 꽃 한 송이를 사 들고 들어갔다.', { joy: 1, wisdom: 1 }, married],
  ['vx-ties-spouse-snore', 20, 100, '코 고는 이중주', '{spouse}의 코 고는 소리와 {partner}의 코 고는 소리가 번갈아 들렸다.', { joy: 1 }, all(married, party(1))],
  ['vx-ties-spouse-family', 20, 100, '한 식구', '{spouse}의 포켓몬과 내 파티 포켓몬들이 이제 한 식구처럼 뭉쳐서 잔다.', { bond: 2 }, all(married, party(1))],
  ['vx-ties-spouse-grey', 45, 100, '흰머리 뽑기', '{spouse|과|와} 서로의 흰머리를 뽑아 주며 웃었다.', { joy: 1, wisdom: 1 }, married],

  // 인연 — 자녀
  ['vx-ties-kid-schoolroad', 26, 60, '등굣길', '아이 손을 잡고 등굣길을 걸었다. {partner|이|가} 가방을 들어 주겠다고 나섰다.', { joy: 2 }, all(kids, party(1))],
  ['vx-ties-kid-why', 24, 80, '아이의 질문', '아이가 포켓몬은 왜 몬스터볼에 들어가느냐고 물었다. 대답하다 보니 나도 잘 모르고 있었다.', { wisdom: 2 }, kids],
  ['vx-ties-kid-firstmon', 32, 100, '아이의 첫 포켓몬', '아이가 처음으로 자기 포켓몬을 데려왔다. 내 첫날이 떠올라 괜히 눈시울이 뜨거워졌다.', { joy: 2 }, kids],
  ['vx-ties-kid-doorframe', 24, 70, '문틀의 눈금', '문틀에 아이 키를 표시했다. 새 눈금이 작년보다 한 뼘 위에 그어졌다.', { joy: 1 }, kids],
  ['vx-ties-kid-emptyroom', 45, 100, '빈방', '다 자란 아이가 여행을 떠났다. 빈방을 정리하다 어릴 적 그림 한 장을 발견했다.', { joy: -1, wisdom: 2 }, kids],

  // 파티·박스·포켓몬 생활
  ['vx-pk-legend-bow', 10, 100, '전설의 기척', '전설의 포켓몬이 마당에 내려앉자 동네 포켓몬들이 일제히 고개를 숙였다.', { wisdom: 1, courage: 1 }, legend],
  ['vx-pk-legend-curl', 10, 100, '전설의 잠버릇', '전설의 포켓몬도 잘 때는 몸을 동그랗게 웅크린다는 걸 알게 됐다.', { joy: 2 }, legend],
  ['vx-pk-legend-onlookers', 10, 100, '집 앞 구경꾼', '전설의 포켓몬을 보려고 낯선 사람들이 집 앞을 기웃거렸다. 조용히 커튼을 쳤다.', { wisdom: 1, joy: -1 }, legend],
  ['vx-pk-shiny-sun', 8, 100, '햇빛 아래의 색', '햇빛 아래에서 색이 다른 포켓몬의 몸이 유난히 반짝였다. 지나가던 아이가 사진을 찍어도 되느냐고 물었다.', { joy: 2 }, shiny],
  ['vx-pk-shiny-glances', 8, 100, '뒤돌아보는 사람들', '색이 다른 포켓몬을 데리고 나가면 다들 한 번씩 뒤돌아본다. 정작 본인은 무심하다.', { joy: 1 }, shiny],
  ['vx-pk-egg-day', 8, 100, '부화 기념일', '알에서 태어난 포켓몬의 부화 기념일이라 작은 나무열매 케이크를 만들었다.', { bond: 2 }, hatched],
  ['vx-pk-egg-follow', 8, 100, '졸졸', '알에서 깨어난 포켓몬은 지금도 내가 가는 곳마다 졸졸 따라온다.', { bond: 1, joy: 1 }, hatched],
  ['vx-pk-egg-shell', 8, 100, '알껍데기 병', '알에서 깨어난 포켓몬의 껍데기 조각을 작은 유리병에 담아 창가에 두었다.', { joy: 1 }, hatched],
  ['vx-pk-six-bowls', 10, 100, '여섯 개의 밥그릇', '파티가 꽉 차 밥그릇이 여섯 개가 됐다. 설거지 시간이 두 배로 늘었다.', { joy: 1, vitality: -1 }, party(6)],
  ['vx-pk-secretgame', 8, 100, '둘만의 놀이', '파티 포켓몬 둘이 나 모르게 만든 놀이를 하고 있었다. 규칙은 끝내 알아내지 못했다.', { joy: 2 }, party(2)],
  ['vx-pk-sulk', 8, 100, '등 돌린 파트너', '간식을 늦게 줬더니 {partner|이|가} 하루 종일 등을 돌리고 앉아 있었다.', { bond: 1 }, party(1)],
  ['vx-pk-hideseek', 6, 100, '숨바꼭질', '파티 포켓몬들과 숨바꼭질을 했다. 꼬리가 다 보이는데도 다들 진지했다.', { joy: 2 }, party(3)],
  ['vx-pk-doorknob', 8, 100, '문고리', '{partner|이|가} 혼자서 문고리 여는 법을 터득했다. 이제 간식 서랍도 안전하지 않다.', { joy: 1, wisdom: 1 }, party(1)],
  ['vx-pk-scale', 10, 100, '체중계', '포켓몬센터 체중계에 올라간 {partner}의 몸무게가 늘어 있었다. 간식을 조금 줄이기로 했다.', { wisdom: 1 }, party(1)],
  ['vx-pk-groupphoto', 10, 100, '단체 사진', '파티 포켓몬들을 한 줄로 세워 사진을 찍었다. 스무 장을 찍었지만 다 같이 앞을 본 사진은 없었다.', { joy: 2 }, party(4)],
  ['vx-pk-box-outing', 12, 100, '박스 나들이', 'PC 박스에 맡겨 둔 포켓몬들을 오랜만에 꺼내 함께 들판을 걸었다.', { bond: 2 }, boxed],
  ['vx-pk-box-rename', 14, 100, '박스 이름 짓기', 'PC 박스 이름을 계절별로 바꾸고 포켓몬들의 자리를 새로 정했다.', { wisdom: 1 }, s => s.box.length >= 5],
  ['vx-pk-box-miss', 14, 100, '화면 너머', '박스에 있는 오래된 동료가 문득 생각나 화면 너머로 한참 바라봤다.', { bond: 1, joy: 1 }, boxed],
  ['vx-pk-oldpartner', 30, 100, '느려진 걸음', '{partner}의 걸음이 예전보다 느려졌다. 걸음을 맞추니 못 보던 꽃들이 보였다.', { bond: 2, wisdom: 1 }, s => s.party.some(m => m.origin === 'partner' && s.age - m.joined >= 25)],
  ['vx-pk-newcomer', 8, 100, '구석의 밥그릇', '새로 합류한 포켓몬이 아직 구석에서 밥을 먹는다. 매일 그릇을 조금씩 가운데로 옮기고 있다.', { bond: 1, wisdom: 1 }, s => s.party.some(m => m.joined === s.age && m.origin !== 'partner')],
  ['vx-pk-doorwait', 8, 100, '문 앞에서', '가장 정이 든 포켓몬이 이제는 잠깐 자리를 비워도 문 앞에서 기다린다.', { bond: 2 }, s => s.party.some(m => m.affection >= 80)],
  ['vx-pk-twoofus', 8, 100, '단둘이', '파티에 {partner} 하나뿐이라 어디든 단둘이 다녔다. 둘이면 충분했다.', { bond: 2 }, s => s.party.length === 1],
  ['vx-pk-dexpage', 10, 100, '도감 넘기기', '도감에 기록한 포켓몬이 서른 종을 넘었다. 처음 기록한 날짜를 다시 찾아봤다.', { wisdom: 1, joy: 1 }, s => s.seen.length >= 30],
  ['vx-pk-toyfight', 6, 100, '장난감 쟁탈전', '새로 사 온 공 하나를 두고 파티 포켓몬 셋이 뒤엉켰다. 결국 공은 소파 밑으로 사라졌다.', { joy: 2 }, party(3)],
  ['vx-pk-nightwatch', 10, 100, '밤의 파수꾼', '밤마다 파티 포켓몬 하나가 창가에 앉아 바깥을 지켜본다. 덕분에 마음 놓고 잔다.', { vitality: 1, bond: 1 }, party(2)],

  // 기분·소소한 사건
  ['vx-mood-keys', 12, 100, '사라진 열쇠', '열쇠를 찾느라 온 집을 뒤졌다. 결국 {partner}의 잠자리 밑에서 나왔다.', { joy: 1 }, party(1)],
  ['vx-mood-flying', 6, 100, '하늘을 나는 꿈', '하늘을 나는 꿈을 꿨다. 깨고 나서도 한참 몸이 가벼웠다.', { joy: 2 }],
  ['vx-mood-oversleep', 8, 100, '긴 낮잠', '잠깐 눈을 붙인다는 게 해가 질 때까지 잤다.', { vitality: 2 }],
  ['vx-mood-burnt', 12, 100, '탄 냄비', '나무열매 조림을 하다 냄비를 태웠다. 탄 냄새에 파티 포켓몬들이 창밖으로 고개를 내밀었다.', { joy: -1, wisdom: 1 }, party(1)],
  ['vx-mood-misdelivered', 10, 100, '잘못 온 편지', '주소를 잘못 쓴 편지가 우리 집에 왔다. 직접 그 집까지 가져다주었다.', { joy: 1, courage: 1 }, s => s.age >= 10 && s.season !== 3],
  ['vx-mood-pocketcoin', 8, 100, '외투 주머니', '겨울 외투 주머니에서 작년의 동전이 나왔다. 그걸로 따뜻한 음료를 사 마셨다.', { joy: 1 }, season(3)],
  ['vx-mood-hiccups', 6, 100, '딸꾹질', '딸꾹질이 멈추지 않았다. {partner|이|가} 뒤에서 갑자기 놀래 준 덕분에 겨우 멈췄다.', { joy: 1 }, party(1)],
  ['vx-mood-luckyday', 10, 100, '잘 풀리는 날', '버스는 바로 왔고, 가게엔 찾던 물건이 마지막 하나 남아 있었다. 이상하게 다 잘 풀리는 날이었다.', { joy: 2 }],
  ['vx-mood-badday', 10, 100, '되는 게 없는 날', '우산을 두고 나온 날 비가 왔고, 신발 끈도 두 번이나 풀렸다.', { joy: -1 }],
  ['vx-mood-forgot', 14, 100, '깜빡한 약속', '약속을 깜빡하는 바람에 {friend|이|가} 한 시간을 기다렸다. 밥을 사며 사과했다.', { wisdom: 1 }, friendNear],
  ['vx-mood-pollen', 6, 100, '꽃가루', '{partner|이|가} 꽃가루 때문에 재채기를 연달아 했다. 그 소리에 둘 다 웃음이 터졌다.', { joy: 1 }, all(season(0), party(1))],
  ['vx-mood-puzzle', 10, 100, '마지막 퍼즐 조각', '천 조각짜리 퍼즐을 끝냈다. 마지막 한 조각은 {partner}의 몸 밑에서 나왔다.', { joy: 1, wisdom: 1 }, party(1)],
  ['vx-mood-note', 15, 100, '서랍 속 쪽지', '서랍 정리를 하다 오래전 내가 나에게 쓴 쪽지를 찾았다.', { wisdom: 1, joy: 1 }],
  ['vx-mood-earworm', 8, 100, '맴도는 노래', '하루 종일 같은 노래 한 소절이 머리에서 떠나지 않았다.', { joy: 1 }],
  ['vx-mood-sunspot', 8, 100, '햇볕 자리', '오후 햇볕이 드는 자리를 두고 {partner|과|와} 조용한 자리싸움을 했다.', { joy: 1, bond: 1 }, party(1)],
];

export const VIGNETTES_EXTRA = rows.map(([id, min, max, title, body, effects, when]) => ({ id, min, max, title, body, effects, when }));
