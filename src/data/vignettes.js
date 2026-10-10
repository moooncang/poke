import { TOWNS } from './world.js';
// Small automatic moments between decisions. Each appears once per life and only when it fits the moment:
// season (0 봄 · 1 여름 · 2 가을 · 3 겨울), town environment, life stage, family and party.
// Rows: [id, min, max, title, body, effects, when?]
const season = n => s => s.season === n;
const env = name => s => TOWNS.find(t => t.id === s.town).environment === name;
const married = s => s.relationship.status === 'married';
const kids = s => s.relationship.children > 0;
const party = n => s => s.party.length >= n;
const boxed = s => s.box.length > 0;

const rows = [
  // 계절
  ['v-spring-blossom', 4, 100, '꽃비', '나무열매 꽃잎이 바람에 흩날렸다. {partner|이|가} 꽃잎을 잡으려고 폴짝 뛰었다.', { joy: 2 }, season(0)],
  ['v-spring-cleaning', 15, 100, '봄맞이 대청소', '겨우내 쌓인 짐을 정리하다 오래된 사진첩을 발견했다.', { wisdom: 1, joy: 1 }, season(0)],
  ['v-spring-hatch', 6, 100, '봄의 둥지', '처마 밑 둥지에서 새끼 포켓몬들이 첫 울음을 터뜨렸다.', { joy: 2 }, season(0)],
  ['v-spring-rain', 6, 100, '봄비 산책', '가랑비 속을 우산 없이 걸었다. 풀 포켓몬들이 신나 보였다.', { vitality: 1, joy: 1 }, season(0)],
  ['v-spring-seed', 10, 100, '씨앗 심기', '{partner|과|와} 화단에 나무열매 씨앗을 심었다.', { bond: 2 }, season(0)],
  ['v-summer-swim', 6, 80, '물놀이', '물가에서 파티와 물장구를 쳤다. 불꽃 포켓몬만 멀찍이 앉아 있었다.', { joy: 3 }, season(1)],
  ['v-summer-night', 8, 100, '여름밤', '창문을 열어 두자 벌레 포켓몬 울음소리가 밤새 들렸다.', { joy: 1 }, season(1)],
  ['v-summer-heat', 10, 100, '폭염', '너무 더워 하루 종일 얼음 포켓몬 곁에 붙어 있었다.', { vitality: -1, bond: 1 }, season(1)],
  ['v-summer-festival', 6, 100, '여름 축제', '불꽃놀이 소리에 {partner|이|가} 깜짝 놀라 품으로 파고들었다.', { joy: 2, bond: 1 }, season(1)],
  ['v-summer-watermelon', 4, 100, '수박', '수박 한 통을 파티와 나눠 먹었다. 씨 뱉기 시합은 {partner|이|가} 이겼다.', { joy: 2 }, season(1)],
  ['v-autumn-leaves', 6, 100, '낙엽 더미', '쌓인 낙엽 더미에 {partner|이|가} 뛰어들었다 나오기를 반복했다.', { joy: 2 }, season(2)],
  ['v-autumn-harvest', 10, 100, '가을 수확', '창가 화분의 나무열매가 빨갛게 익었다.', { joy: 1, bond: 1 }, season(2)],
  ['v-autumn-moon', 8, 100, '보름달', '보름달 아래에서 삐삐 무리가 춤춘다는 이야기를 떠올렸다.', { wisdom: 1, joy: 1 }, season(2)],
  ['v-autumn-reading', 12, 100, '독서의 계절', '서늘한 바람이 불어 오랜만에 두꺼운 책을 펼쳤다.', { wisdom: 2 }, season(2)],
  ['v-autumn-migration', 10, 100, '떠나는 무리', '남쪽으로 떠나는 비행 포켓몬 무리가 하늘을 가로질렀다.', { wisdom: 1 }, season(2)],
  ['v-winter-snowman', 4, 70, '눈사람', '파티와 함께 눈사람을 만들었다. 얼음 포켓몬이 눈사람 옆에서 자리를 지켰다.', { joy: 3 }, season(3)],
  ['v-winter-blanket', 6, 100, '담요 한 장', '추운 밤, 불꽃 포켓몬 옆이 가장 인기 있는 자리였다.', { bond: 2 }, season(3)],
  ['v-winter-cold', 10, 100, '감기 기운', '목이 칼칼해 따뜻한 차를 끓였다. {partner|이|가} 이불을 끌어다 덮어 주었다.', { vitality: -2, bond: 2 }, season(3)],
  ['v-winter-yearend', 15, 100, '한 해의 끝', '달력의 마지막 장을 넘기며 올해 있었던 일을 적었다.', { wisdom: 2 }, season(3)],
  ['v-winter-tracks', 8, 100, '눈 위의 발자국', '눈 위에 낯선 포켓몬의 발자국이 숲까지 이어져 있었다.', { wisdom: 1, courage: 1 }, season(3)],
  // 마을 환경
  ['v-forest-birdsong', 4, 100, '새벽 새소리', '{town}의 새벽, 숲에서 들려오는 새소리에 눈을 떴다.', { joy: 1, vitality: 1 }, env('숲')],
  ['v-forest-mist', 8, 100, '숲 안개', '안개 낀 숲길을 걷다 고스트 포켓몬의 웃음소리를 들은 것 같다.', { courage: 1 }, env('숲')],
  ['v-forest-berry', 6, 100, '야생 열매', '숲길에서 잘 익은 야생 나무열매를 따 먹었다.', { joy: 1, vitality: 1 }, env('숲')],
  ['v-forest-firefly', 6, 100, '반딧불', '밤 숲에 볼비트와 네오비트가 빛의 춤을 추었다.', { joy: 2 }, env('숲')],
  ['v-forest-woodpecker', 10, 100, '나무 두드리는 소리', '아침마다 나무를 두드리는 소리가 알람이 됐다.', { joy: 1 }, env('숲')],
  ['v-sea-sunset', 6, 100, '바다의 노을', '{town} 방파제에서 붉은 노을을 바라봤다.', { joy: 2 }, env('바다')],
  ['v-sea-shells', 4, 60, '조개껍데기', '모래사장에서 예쁜 조개껍데기를 주워 창가에 두었다.', { joy: 1 }, env('바다')],
  ['v-sea-wingull', 6, 100, '갈모매', '갈모매가 도시락을 노리고 머리 위를 맴돌았다.', { joy: 1 }, env('바다')],
  ['v-sea-tide', 10, 100, '밀물 시간표', '물때를 확인하는 게 습관이 됐다. 오늘은 썰물이 크다.', { wisdom: 1 }, env('바다')],
  ['v-sea-storm', 10, 100, '바닷바람', '거센 바닷바람에 창문이 밤새 덜컹거렸다.', { vitality: -1 }, env('바다')],
  ['v-mountain-echo', 6, 100, '메아리', '산을 향해 소리치자 {partner}의 울음소리까지 메아리로 돌아왔다.', { joy: 2 }, env('산')],
  ['v-mountain-stars', 8, 100, '산마을의 별', '공기가 맑아 은하수가 선명했다.', { joy: 1, wisdom: 1 }, env('산')],
  ['v-mountain-climb', 10, 100, '아침 등산', '산 중턱까지 오르니 {town}이 한눈에 들어왔다.', { vitality: 2 }, env('산')],
  ['v-mountain-cold', 10, 100, '산바람', '저녁이 되자 산바람이 차가워져 일찍 불을 지폈다.', { vitality: -1, bond: 1 }, env('산')],
  ['v-mountain-rocks', 8, 100, '돌 수집', '반짝이는 돌을 모았다. 바위 포켓몬이 한 개를 먹으려 했다.', { joy: 1 }, env('산')],
  ['v-river-skip', 6, 70, '물수제비', '강가에서 물수제비를 떴다. 다섯 번이나 튀었다.', { joy: 2 }, env('강')],
  ['v-river-fishing', 10, 100, '아침 낚시', '강가에 낚싯대를 드리우고 해 뜨는 것을 봤다.', { joy: 1, wisdom: 1 }, env('강')],
  ['v-river-bridge', 6, 100, '다리 위에서', '다리 위에서 물 포켓몬 무리가 지나가는 것을 내려다봤다.', { joy: 1 }, env('강')],
  ['v-river-flood', 12, 100, '불어난 강', '밤새 내린 비로 강물이 불어 산책을 미뤘다.', { wisdom: 1 }, env('강')],
  ['v-river-frogs', 6, 100, '개구리 합창', '저녁이면 강가의 수륙챙이들이 합창을 했다.', { joy: 1 }, env('강')],
  ['v-city-neon', 12, 100, '네온사인', '{town}의 밤거리는 전기 포켓몬 덕분에 늘 밝다.', { joy: 1 }, env('도시')],
  ['v-city-rush', 18, 70, '출근길', '꽉 찬 지하철에서 {partner|을|를} 몬스터볼에 넣었다 꺼냈다 했다.', { vitality: -1 }, env('도시')],
  ['v-city-rooftop', 12, 100, '옥상', '옥상에 올라 도시의 불빛을 내려다봤다.', { joy: 2 }, env('도시')],
  ['v-city-cafe', 16, 100, '단골 카페', '단골 카페 주인이 {partner}의 간식까지 챙겨 주었다.', { joy: 1, bond: 1 }, env('도시')],
  ['v-city-trubbish', 8, 100, '골목의 손님', '쓰레기통을 뒤지는 깨봉이와 눈이 마주쳤다.', { joy: 1 }, env('도시')],
  // 인생 단계
  ['v-child-scribble', 3, 7, '벽 낙서', '벽에 포켓몬 그림을 그렸다가 혼났다. 그래도 그림은 지우지 않았다.', { joy: 2 }],
  ['v-child-tooth', 5, 8, '첫 젖니', '첫 젖니가 빠졌다. 지붕 위로 던지며 강한 이빨을 빌었다.', { joy: 1 }],
  ['v-child-bedtime', 2, 8, '잠자리 이야기', '가족이 전설의 포켓몬 이야기를 들려주었다.', { wisdom: 1, joy: 1 }],
  ['v-child-homework', 7, 13, '숙제', '{partner|이|가} 숙제 공책 위에서 잠들어 버렸다.', { joy: 1, bond: 1 }],
  ['v-teen-mirror', 13, 18, '거울 앞', '머리 모양을 이리저리 바꿔 봤다. {partner|이|가} 고개를 갸웃했다.', { joy: 1 }],
  ['v-teen-latenight', 14, 19, '밤샘 통화', '{friend|과|와} 밤새 통화하며 미래 이야기를 했다.', { joy: 2 }],
  ['v-teen-growth', 13, 17, '훌쩍 큰 키', '작년 옷이 맞지 않는다. 어느새 {partner}보다 훨씬 커졌다.', { vitality: 1 }],
  ['v-adult-bills', 20, 60, '고지서', '우편함에 고지서가 쌓였다. 어른이 된다는 건 이런 것이다.', { wisdom: 1 }],
  ['v-adult-cook', 20, 70, '혼자 해 먹는 밥', '처음으로 제대로 된 요리를 했다. {partner|이|가} 맛있게 먹어 주었다.', { joy: 1, bond: 1 }],
  ['v-adult-overtime', 22, 60, '늦은 퇴근', '늦게 돌아오자 파티 포켓몬들이 현관에서 기다리고 있었다.', { bond: 2, vitality: -1 }, s => Boolean(s.career)],
  ['v-mid-greyhair', 38, 60, '흰머리', '거울 속에서 흰머리 한 가닥을 발견했다.', { wisdom: 1 }],
  ['v-mid-nostalgia', 35, 70, '옛 노래', '라디오에서 학창 시절 노래가 흘러나왔다.', { joy: 2 }],
  ['v-mid-glasses', 42, 70, '돋보기', '도감 글씨가 잘 안 보여 돋보기를 샀다.', { wisdom: 1 }],
  ['v-late-nap', 60, 105, '오후의 낮잠', '{partner|과|와} 나란히 볕 드는 자리에서 낮잠을 잤다.', { vitality: 1, bond: 1 }],
  ['v-late-letters', 60, 105, '손편지', '오랜 친구들에게 손편지를 썼다.', { joy: 2 }],
  ['v-late-walk', 65, 105, '느린 산책', '천천히 걸으니 예전엔 못 보던 작은 포켓몬들이 보인다.', { wisdom: 1, joy: 1 }],
  // 가족
  ['v-fam-breakfast', 20, 100, '함께하는 아침', '{spouse|과|와} 아침을 먹으며 오늘 일정을 나눴다.', { joy: 2 }, married],
  ['v-fam-argument', 20, 100, '사소한 다툼', '설거지 문제로 {spouse|과|와} 투닥거렸다. 저녁에는 다시 웃었다.', { joy: -1, wisdom: 1 }, married],
  ['v-fam-walk', 20, 100, '저녁 산책', '{spouse|과|와} 포켓몬들을 데리고 동네를 한 바퀴 돌았다.', { joy: 2, bond: 1 }, married],
  ['v-fam-kid-drawing', 24, 80, '아이의 그림', '아이가 우리 가족과 포켓몬들을 그려 냉장고에 붙였다.', { joy: 3 }, kids],
  ['v-fam-kid-sick', 24, 80, '아이의 열', '아이가 열이 나 밤새 곁을 지켰다. 파트너도 침대 옆을 지켰다.', { vitality: -2, bond: 2 }, kids],
  ['v-fam-kid-firstword', 22, 70, '첫 말', '아이의 첫 말은 엄마도 아빠도 아닌 포켓몬 이름이었다.', { joy: 3 }, kids],
  // 파티
  ['v-party-pile', 8, 100, '포켓몬 더미', '소파 위에 파티 포켓몬들이 겹겹이 쌓여 잠들었다.', { joy: 2 }, party(3)],
  ['v-party-chores', 12, 100, '집안일 돕기', '파티 포켓몬이 빨래를 개는 흉내를 냈다.', { joy: 1 }, party(2)],
  ['v-party-rivalry', 10, 100, '밥그릇 경쟁', '파티 포켓몬들이 같은 밥그릇을 두고 신경전을 벌였다.', { joy: 1 }, party(2)],
  ['v-party-lineup', 10, 100, '줄 서기', '산책 갈 때마다 파티 포켓몬들이 현관에 일렬로 선다.', { bond: 1 }, party(4)],
  ['v-box-checkin', 12, 100, '박스 점검', 'PC 박스의 포켓몬들 상태를 확인했다. 모두 잘 지내고 있었다.', { bond: 1 }, boxed],
  ['v-party-grooming', 8, 100, '털 고르기', '빗질을 해 주자 {partner|이|가} 눈을 가늘게 떴다.', { bond: 2 }, party(1)],
];

export const VIGNETTES = rows.map(([id, min, max, title, body, effects, when]) => ({ id, min, max, title, body, effects, when }));
