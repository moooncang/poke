import { selectWildEncounter } from '../sim/encounters.js';
// Everyday decisions across a life: growing up, adulthood, middle and later life, personality-driven moments,
// family life and the party's own small dramas. Rows: [id, min, max, title, body, options, meta].
import { table, check, later, localSpecies, farTown, working } from './event-kit.js';
import { pick } from '../sim/random.js';
import { dominantDisposition } from '../sim/party.js';
import { poke } from '../sim/text.js';

const married = s => s.relationship.status === 'married';
const hasKids = s => s.relationship.children > 0;
const leaning = tone => ({ weight: s => 0.6 + (dominantDisposition(s) === tone ? 2 : 0) });
const farSighting = s => { const t = farTown(s), id = pick(s, t.pool); return { observe: id, outcome: `${t.region}지방 ${t.name}에서 ${poke(id, '을', '를')} 처음 봤다.` }; };

// Ages 1–5: small choices made with the family before the first partner arrives.
const earlyYears = table('childhood', [
  ['tot-first-steps', 1, 2, '첫걸음', '가구를 붙잡고 서 있다가 처음으로 손을 놓았다.', [
    ['포켓몬 인형 쪽으로', 'bold', { courage: 3 }, '인형을 향해 세 걸음을 걸었다.'],
    ['가족 품으로', 'caring', { bond: 3 }, '활짝 웃으며 가족 품에 안겼다.'],
  ]],
  ['tot-bath', 1, 4, '목욕 시간', '목욕을 싫어해 욕실 문 앞에서 버틴다.', [
    ['물 포켓몬 장난감과 함께', 'easygoing', { joy: 3 }, '장난감 잉어킹과 노느라 목욕을 잊었다.'],
    ['노래를 부르며', 'caring', { bond: 2, joy: 1 }, '가족이 부르는 노래에 맞춰 첨벙거렸다.'],
  ]],
  ['tot-picture-book', 2, 5, '그림책 고르기', '서점에서 그림책 한 권을 골라도 된다고 한다.', [
    ['전설의 포켓몬 이야기', 'bold', { courage: 2, joy: 2 }, '하늘을 나는 전설의 포켓몬 그림을 몇 번이고 넘겨 봤다.'],
    ['포켓몬 도감 그림책', 'curious', { wisdom: 3 }, '포켓몬 이름을 하나씩 외웠다.'],
    ['포켓몬과 아이의 우정 이야기', 'caring', { bond: 3 }, '책을 덮을 때마다 언젠가 만날 파트너를 상상했다.'],
  ]],
  ['tot-visitor', 2, 5, '이웃집 포켓몬', '이웃집 포켓몬이 마당 울타리 너머로 고개를 내밀었다.', [
    ['손을 뻗는다', 'bold', { courage: 3 }, '포켓몬이 손바닥을 킁킁 맡더니 핥았다.'],
    ['가족 뒤에 숨는다', 'easygoing', { joy: 1 }, '숨어서 한참을 지켜봤다.'],
    ['간식을 나눠 준다', 'caring', { bond: 3 }, '포켓몬이 다음 날도 찾아왔다.'],
  ]],
  ['tot-rain', 2, 5, '빗소리', '천둥이 치자 무서워서 잠이 오지 않는다.', [
    ['창밖을 구경한다', 'curious', { wisdom: 2, courage: 1 }, '번개 속에서 날아가는 포켓몬의 그림자를 봤다.'],
    ['가족 곁에서 잔다', 'caring', { bond: 2 }, '가족의 품에서 금방 잠들었다.'],
  ]],
  ['tot-park', 3, 5, '공원 나들이', '주말에 가족과 공원에 갔다.', [
    ['미끄럼틀로 달려간다', 'bold', { vitality: 2, courage: 2 }, '하루 종일 미끄럼틀을 탔다.'],
    ['연못의 포켓몬을 본다', 'curious', { wisdom: 2 }, '연못에서 헤엄치는 포켓몬을 한참 지켜봤다.'],
    ['다른 아이와 논다', 'caring', { joy: 3 }, '처음 만난 아이와 모래성을 쌓았다.'],
  ]],
]);

const childhood = table('stage', [
  ['child-sleepover', 8, 12, '첫 외박', '{friend|이|가} 자기 집에서 자고 가라고 했다. 가족은 네가 정하라고 한다.', [
    ['{friend}네 집에 간다', 'bold', { joy: 4, courage: 2 }, '밤늦게까지 포켓몬 이야기를 하다 잠들었다.', { cast: { friend: { affinity: 8 } } }],
    ['집에서 파트너와 보낸다', 'caring', { bond: 4 }, '파트너와 담요를 덮고 창밖의 별을 셌다.'],
    ['가족 캠핑을 제안한다', 'easygoing', { vitality: 3, joy: 3 }, '가족과 마당에 텐트를 쳤다.'],
  ]],
  ['child-lost-forest', 7, 11, '숲에서 길을 잃다', '산책하다 보니 익숙한 길이 보이지 않는다. 해가 지기 시작했다.', [
    ['파트너를 믿고 따라간다', 'caring', { bond: 5, courage: 3 }, '파트너가 냄새를 따라 집 앞 길까지 안내했다.', check('bond', -10, '한참을 헤맨 끝에 마을 사람에게 발견됐다.', { vitality: -4, joy: -2 })],
    ['제자리에서 기다린다', 'curious', { wisdom: 4 }, '배운 대로 제자리에 있었더니 금방 가족이 찾아왔다.'],
    ['큰 소리로 도움을 청한다', 'bold', { courage: 3 }, '목이 쉬도록 외친 끝에 순찰 중이던 레인저를 만났다.'],
  ]],
  ['child-school-play', 7, 12, '학예회', '학예회에서 포켓몬 연극을 한다. 주인공을 뽑는다고 한다.', [
    ['주인공에 지원한다', 'bold', { courage: 5, joy: 4 }, '대사를 한 번도 틀리지 않고 박수를 받았다.', check('courage', 0, '대사를 잊어 무대 위에서 얼어붙었다. 그래도 끝까지 서 있었다.', { courage: 2, joy: -2 })],
    ['무대 소품을 맡는다', 'curious', { wisdom: 3 }, '종이로 만든 나무열매 나무가 가장 칭찬받았다.'],
    ['파트너와 함께 나온다', 'caring', { bond: 5, joy: 3 }, '파트너가 무대에서 꾸벅 인사하자 객석이 웃음바다가 됐다.'],
  ]],
  ['child-bully', 8, 13, '괴롭힘을 목격하다', '덩치 큰 아이가 어린 트레이너의 몬스터볼을 빼앗았다.', [
    ['직접 막아선다', 'bold', { courage: 5, reputation: 1 }, '몬스터볼을 되찾아 주었다. 그 아이는 오래 고마워했다.', { follow: [later('childhood-ally', [10, 18], 0.6)] }],
    ['어른에게 알린다', 'curious', { wisdom: 3 }, '선생님이 와서 일을 정리했다.', { world: { safety: 1 } }],
    ['못 본 척 지나간다', 'easygoing', { joy: -3 }, '집에 와서도 그 장면이 계속 떠올랐다.'],
  ]],
  ['child-allowance', 6, 10, '첫 용돈', '처음으로 매달 용돈을 받게 됐다.', [
    ['돼지저금통에 모은다', 'pragmatic', { wisdom: 2 }, '동전이 쌓이는 소리가 좋았다.', { follow: [later('savings-grow', [8, 12], 1, { amount: 300 })] }],
    ['파트너 장난감을 산다', 'caring', { bond: 4, money: -50 }, '파트너가 새 공을 하루 종일 굴리며 놀았다.'],
    ['친구와 간식을 나눠 먹는다', 'easygoing', { joy: 3, money: -50 }, '{friend|과|와} 나눠 먹은 아이스크림이 제일 맛있었다.', { cast: { friend: { affinity: 6 } } }],
  ]],
  ['child-broken-window', 7, 11, '깨진 창문', '공놀이를 하다 이웃집 창문을 깨뜨렸다.', [
    ['솔직하게 사과한다', 'caring', { wisdom: 3, reputation: 1, money: -100 }, '이웃은 사과하러 온 것을 기특하게 여겼다.'],
    ['파트너 탓을 한다', 'easygoing', { joy: 1, bond: -4 }, '파트너가 억울한 눈으로 한참 바라보았다.'],
    ['몰래 유리를 사 온다', 'pragmatic', { courage: 2, wisdom: 1, money: -150 }, '결국 들켰지만 고치려는 마음은 전해졌다.'],
  ]],
  ['child-bug-contest', 6, 12, '벌레잡기 대회', '마을 풀숲에서 어린이 벌레잡기 대회가 열린다.', [
    ['출전한다', 'bold', { courage: 3, joy: 3 }, '', s => ({ observe: localSpecies(s), ...check('courage', -5, '아무것도 잡지 못했지만 풀숲 지도를 머릿속에 그렸다.', { wisdom: 2 }), outcome: '날렵하게 포켓몬을 찾아내 상위권에 들었다.' })],
    ['관찰 일지를 쓴다', 'curious', { wisdom: 4 }, '참가자들이 잡은 포켓몬을 꼼꼼히 기록했다.'],
    ['응원석에 앉는다', 'easygoing', { joy: 3 }, '친구들을 큰 소리로 응원했다.'],
  ]],
  ['child-sick-partner', 6, 12, '아픈 파트너', '파트너가 열이 나고 밥을 먹지 않는다.', [
    ['밤새 곁을 지킨다', 'caring', { bond: 6, vitality: -3 }, '새벽녘에 파트너가 다시 꼬리를 흔들었다.', { affection: 4 }],
    ['포켓몬센터에 데려간다', 'pragmatic', { bond: 3, money: -100 }, '간호사가 금방 원인을 찾아 주었다.'],
    ['가족에게 도움을 청한다', 'curious', { wisdom: 2 }, '가족과 번갈아 가며 돌봤다.'],
  ], { when: s => s.party.length > 0 }],
  ['child-summer', 7, 12, '여름방학 계획', '긴 여름방학이 시작됐다.', [
    ['먼 친척 집에 다녀온다', 'bold', { courage: 3, joy: 3 }, '', farSighting],
    ['도서관에서 지낸다', 'curious', { wisdom: 5 }, '도감 시리즈를 처음부터 끝까지 읽었다.'],
    ['매일 수영을 배운다', 'easygoing', { vitality: 5 }, '방학이 끝날 무렵 강 건너까지 헤엄칠 수 있게 됐다.'],
  ]],
  ['child-cards', 8, 12, '포켓몬 카드 열풍', '학교에서 포켓몬 카드 교환이 대유행이다.', [
    ['교환에 열중한다', 'easygoing', { joy: 4, money: -60 }, '원하던 카드를 손에 넣었다.', { cast: { friend: { affinity: 4 } } }],
    ['희귀 카드를 판다', 'pragmatic', { money: 200 }, '희귀 카드를 팔아 용돈을 크게 불렸다.'],
    ['진짜 포켓몬 공부를 한다', 'curious', { wisdom: 3 }, '카드보다 실제 생태가 더 재미있다는 걸 알았다.'],
  ]],
]);

const teens = table('stage', [
  ['teen-part-time', 15, 19, '첫 아르바이트', '방학 동안 일할 곳을 구한다.', [
    ['포켓몬센터 접수', 'caring', { money: 300, bond: 2 }, '아픈 포켓몬과 트레이너를 맞이하며 여름을 보냈다.'],
    ['상점 판매원', 'pragmatic', { money: 350, wisdom: 2 }, '손님을 대하는 법과 장부 정리를 배웠다.'],
    ['일 대신 훈련한다', 'bold', { courage: 2 }, '방학 내내 파트너와 훈련했다.', { training: 40 }],
  ]],
  ['teen-exam', 13, 18, '시험 기간', '중요한 시험이 일주일 앞으로 다가왔다.', [
    ['밤새 공부한다', 'curious', { wisdom: 6, vitality: -5 }, '성적은 올랐지만 몸이 무거워졌다.'],
    ['계획대로 차근차근', 'pragmatic', { wisdom: 5, joy: 2 }, '계획표대로 공부해 좋은 결과를 얻었다.', check('wisdom', 0, '계획이 어긋나 아쉬운 점수를 받았다.', { wisdom: 2 })],
    ['산책하며 머리를 식힌다', 'easygoing', { joy: 4, wisdom: -2 }, '시험은 망쳤지만 마음은 편했다.'],
  ]],
  ['teen-argument', 14, 18, '가족과의 다툼', '진로 문제로 가족과 크게 다퉜다.', [
    ['차분히 대화한다', 'caring', { bond: 4, wisdom: 2 }, '서로의 걱정을 이해하게 됐다.'],
    ['{friend}네 집에서 하룻밤', 'bold', { courage: 3, joy: -2 }, '친구 덕분에 마음을 정리했다.', { cast: { friend: { affinity: 6 } } }],
    ['혼자 짧은 여행을 떠난다', 'bold', { courage: 4, money: -150 }, '', farSighting],
  ]],
  ['teen-online-battle', 13, 19, '온라인 배틀 대회', '통신 배틀 대회의 학생부 참가자를 모집한다.', [
    ['출전한다', 'bold', { courage: 4, reputation: 2 }, '학생부 상위권에 이름을 올렸다.', check('courage', 5, '초반에 탈락했지만 상대의 전술을 기록했다.', { wisdom: 2 })],
    ['해설 영상을 만든다', 'curious', { wisdom: 3, reputation: 1 }, '경기 분석 영상이 친구들 사이에서 화제가 됐다.'],
    ['구경만 한다', 'easygoing', { joy: 3 }, '결승전을 보며 다음 대회를 꿈꿨다.'],
  ]],
  ['teen-dream', 14, 17, '장래 희망 발표', '수업 시간에 장래 희망을 발표해야 한다.', [
    ['체육관 관장', 'bold', { courage: 4 }, '체육관 관장이 되겠다고 말했다. 몇몇이 웃었지만 개의치 않았다.', { flag: 'dream-gym', follow: [later('dream-recall', [14, 20], 1, { dream: '체육관 관장' })] }],
    ['포켓몬 박사', 'curious', { wisdom: 4 }, '새로운 포켓몬을 발견하겠다고 말했다.', { flag: 'dream-research', follow: [later('dream-recall', [14, 20], 1, { dream: '포켓몬 박사' })] }],
    ['아직 모르겠다', 'easygoing', { joy: 2 }, '솔직하게 모르겠다고 하자 선생님이 그것도 답이라고 했다.'],
  ]],
  ['teen-club', 13, 17, '동아리 선택', '새 학기 동아리 모집이 시작됐다.', [
    ['배틀부', 'bold', { courage: 4 }, '방과 후마다 연습 배틀을 했다.', { training: 25 }],
    ['생태 관찰부', 'curious', { wisdom: 4 }, '', s => ({ observe: localSpecies(s), outcome: '관찰 캠프에서 처음 보는 포켓몬을 기록했다.' })],
    ['요리부', 'caring', { bond: 3, joy: 3 }, '포켓몬 간식 만드는 법을 배웠다.', { affection: 3 }],
  ]],
  ['teen-first-trip', 15, 19, '혼자 떠난 첫 여행', '처음으로 혼자 다른 마을에 가 보기로 했다.', [
    ['다른 지방까지 간다', 'bold', { courage: 5, money: -200 }, '', farSighting],
    ['고향의 산 정상에 오른다', 'easygoing', { vitality: 5 }, '정상에서 내려다본 {town}은 생각보다 작았다.'],
    ['계획을 다시 세운다', 'pragmatic', { wisdom: 2 }, '다음 방학을 위해 경비를 모으기로 했다.'],
  ]],
  ['teen-volunteer', 13, 19, '봉사 활동', '학교에서 봉사 시간을 채워야 한다.', [
    ['센터에서 봉사한다', 'caring', { bond: 5, reputation: 1 }, '아픈 포켓몬을 씻기고 먹였다.'],
    ['해변·강가 청소', 'easygoing', { vitality: 2 }, '쓰레기를 치운 자리에 포켓몬이 돌아왔다.', { world: { ecology: 2 } }],
    ['노인정 말벗', 'curious', { joy: 4, wisdom: 2 }, '옛날 이 마을에 살던 포켓몬 이야기를 들었다.'],
  ]],
  ['teen-graduation-trip', 17, 19, '졸업 여행', '친구들이 졸업 여행을 계획한다.', [
    ['다 같이 바다로', 'easygoing', { joy: 6, money: -150 }, '밤새 해변에서 이야기를 나눴다.', { cast: { friend: { affinity: 8 } } }],
    ['파트너와 둘이 캠핑', 'caring', { bond: 6 }, '조용한 호숫가에서 앞으로를 생각했다.', { affection: 3 }],
    ['여행 대신 일한다', 'pragmatic', { money: 250 }, '여행 경비만큼 돈을 모았다.'],
  ]],
  ['teen-injury', 14, 19, '운동 중 부상', '훈련 중 발목을 크게 접질렸다. 대회가 코앞이다.', [
    ['쉬면서 회복한다', 'easygoing', { vitality: 6, joy: -2 }, '대회는 놓쳤지만 완전히 나았다.'],
    ['참고 출전한다', 'bold', { courage: 4, vitality: -6 }, '대회는 마쳤지만 다리가 오래 아팠다.', { follow: [later('chronic-pain', [4, 8], 0.3)] }],
    ['재활 공부를 한다', 'curious', { wisdom: 4 }, '부상 회복 원리를 공부해 파트너 관리에도 써먹었다.'],
  ]],
  ['teen-wallet', 13, 19, '주운 지갑', '길에서 두툼한 지갑을 주웠다.', [
    ['주인을 직접 찾아준다', 'caring', { joy: 3, reputation: 2 }, '주인이 몇 번이고 고개를 숙였다.', { follow: [later('community-thanks', [3, 7], 0.3)] }],
    ['파출소에 맡긴다', 'pragmatic', { wisdom: 2 }, '절차대로 맡기고 돌아왔다.', { world: { safety: 1 } }],
    ['현금만 챙긴다', 'bold', { money: 300, joy: -3 }, '돈은 생겼지만 마음 한구석이 무거웠다.', { follow: [later('guilty-conscience', [2, 5], 0.6)] }],
  ]],
  ['teen-confession', 14, 19, '고백', '같은 반 친구가 쪽지로 마음을 전해 왔다.', [
    ['만나 본다', 'bold', { joy: 6 }, '서툴지만 설레는 몇 달을 보냈다.'],
    ['친구로 남자고 한다', 'caring', { wisdom: 2 }, '조심스럽게 마음을 전했고, 둘은 좋은 친구로 남았다.'],
    ['지금은 훈련이 먼저다', 'pragmatic', { courage: 3 }, '정중하게 거절하고 훈련에 집중했다.'],
  ]],
]);

const adulthood = table('stage', [
  ['ya-first-home', 19, 26, '첫 독립', '집을 나와 혼자 살 곳을 구한다.', [
    ['넓고 비싼 집', 'bold', { joy: 6, money: -600 }, '포켓몬들이 마음껏 뛸 수 있는 거실이 생겼다.', { affection: 3 }],
    ['작은 원룸', 'pragmatic', { wisdom: 2, money: -200 }, '좁지만 내 공간이 생겼다.'],
    ['{friend|과|와} 함께 산다', 'caring', { joy: 3, money: -300 }, '{friend|과|와} 생활비를 나누며 살게 됐다.', { cast: { friend: { affinity: 10 } } }],
    ['조금 더 가족과 산다', 'easygoing', { bond: 2 }, '돈을 더 모을 때까지 가족과 지내기로 했다.'],
  ]],
  ['ya-installment', 20, 30, '할부의 유혹', '최신 훈련 장비를 할부로 살 수 있다고 한다.', [
    ['할부로 산다', 'bold', { joy: 3 }, '최신 장비로 훈련 효율이 올랐다. 할부금은 나중 일이다.', { training: 40, follow: [later('debt-due', [2, 4], 1, { amount: 500 })] }],
    ['돈을 모아서 산다', 'pragmatic', { wisdom: 3 }, '1년 뒤 같은 장비를 할인가에 샀다.'],
    ['지금 장비로 충분하다', 'easygoing', { joy: 1 }, '익숙한 장비를 계속 쓰기로 했다.'],
  ]],
  ['ya-reunion', 22, 34, '동창회', '오랜만에 동창회 소식이 왔다.', [
    ['참석한다', 'easygoing', { joy: 5, money: -80 }, '다들 달라졌지만 웃음소리는 그대로였다.', { cast: { friend: { affinity: 5 } } }],
    ['사회를 맡는다', 'bold', { courage: 3, reputation: 2 }, '능숙한 진행으로 모임을 이끌었다.', check('courage', 0, '진행이 매끄럽지 않았지만 다들 즐거워했다.', { joy: 2 })],
    ['조용히 넘어간다', 'pragmatic', { wisdom: 1 }, '단체 사진만 받아 보았다.'],
  ]],
  ['ya-burnout', 24, 45, '번아웃', '몇 달째 아침에 일어나기가 힘들다.', [
    ['휴가를 낸다', 'easygoing', { vitality: 8, joy: 4, money: -300 }, '푹 쉬고 나니 일이 다시 보였다.', { work: { satisfaction: 10 } }],
    ['버틴다', 'bold', { vitality: -5, money: 200 }, '일은 해냈지만 많이 지쳤다.', { work: { satisfaction: -8 } }],
    ['상담을 받는다', 'curious', { wisdom: 4, joy: 3, money: -150 }, '지친 이유를 하나씩 정리했다.'],
  ], { when: working }],
  ['ya-side-project', 22, 35, '사이드 프로젝트', '퇴근 후 시간을 어떻게 쓸지 고민이다.', [
    ['포켓몬 돌봄 블로그', 'curious', { wisdom: 3 }, '첫 글을 올렸다. 조회수는 아직 한 자리다.', { follow: [later('blog-result', [3, 6], 1)] }],
    ['동네 배틀 교실', 'bold', { money: 200, reputation: 2 }, '주말마다 아이들에게 기본기를 가르쳤다.', { training: 20 }],
    ['그냥 쉰다', 'easygoing', { vitality: 4, joy: 2 }, '쉬는 것도 일이라고 생각하기로 했다.'],
  ]],
  ['ya-pet-sitting', 20, 40, '이웃의 부탁', '출장을 가는 이웃이 포켓몬을 한 달간 맡아 달라고 한다.', [
    ['맡아 준다', 'caring', { bond: 5, money: 150 }, '한 달 내내 집이 시끌벅적했다.'],
    ['아예 입양을 제안받는다', 'caring', { joy: 4 }, '', s => { const { id } = selectWildEncounter(s); return { join: id, joinOrigin: 'adopted', outcome: `이웃이 이사를 가게 되어 ${poke(id, '을', '를')} 가족으로 맞았다.` }; }],
    ['정중히 거절한다', 'pragmatic', { joy: 1 }, '다른 돌보미를 소개해 주었다.'],
  ]],
  ['ya-language', 20, 35, '다른 지방 말 배우기', '다른 지방 출신 친구가 언어 교환을 제안했다.', [
    ['강좌에 등록한다', 'curious', { wisdom: 6, money: -200 }, '간단한 대화를 할 수 있게 됐다.', { flag: 'polyglot' }],
    ['교환 수업만 한다', 'caring', { wisdom: 3, joy: 2 }, '서로의 고향 이야기를 나눴다.'],
    ['관심 없다', 'easygoing', { joy: 1 }, '지금 쓰는 말로도 충분하다.'],
  ]],
  ['ya-transport', 21, 35, '이동 수단', '일과 훈련으로 이동이 잦아졌다.', [
    ['자전거를 산다', 'easygoing', { vitality: 4, money: -100 }, '매일 자전거로 출퇴근했다.'],
    ['중고 자동차를 산다', 'pragmatic', { joy: 4, money: -900 }, '먼 서식지까지도 쉽게 다닐 수 있게 됐다.', { flag: 'vehicle' }],
    ['비행 포켓몬과 연습한다', 'bold', { courage: 5 }, '파트너와 함께 하늘을 나는 법을 익혔다.', check('bond', 10, '아직 호흡이 맞지 않아 몇 번 떨어질 뻔했다.', { vitality: -3 })],
  ]],
  ['ya-final-ticket', 18, 40, '리그 결승 티켓', '리그 결승전 티켓을 구할 기회가 생겼다. 값이 만만치 않다.', [
    ['비싸도 간다', 'easygoing', { joy: 8, money: -300 }, '경기장의 함성을 평생 잊지 못할 것 같다.'],
    ['중계로 본다', 'pragmatic', { joy: 3 }, '집에서 파트너와 함께 응원했다.'],
    ['표를 되판다', 'pragmatic', { money: 200, joy: -2 }, '웃돈을 받고 표를 넘겼다.'],
  ]],
  ['ya-scout', 22, 32, '선배의 스카우트', '실력 있는 선배가 자기 팀에 들어오라고 한다.', [
    ['팀에 합류한다', 'bold', { courage: 4, reputation: 2 }, '팀 훈련으로 실력이 부쩍 늘었다.', { training: 40 }],
    ['정보만 얻는다', 'curious', { wisdom: 3 }, '선배의 훈련 방식을 정리해 두었다.'],
    ['정중히 거절한다', 'easygoing', { joy: 2 }, '지금의 속도를 지키기로 했다.'],
  ]],
  ['ya-checkup', 25, 45, '건강검진 결과', '검진 결과지에 주의 표시가 몇 개 있다.', [
    ['운동을 시작한다', 'bold', { vitality: 6 }, '파트너와 매일 아침 달리기를 시작했다.', { follow: [later('fitness-payoff', [3, 6], 0.8)] }],
    ['식단을 바꾼다', 'pragmatic', { vitality: 4, joy: -2 }, '좋아하던 야식을 끊었다.'],
    ['괜찮겠지', 'easygoing', { joy: 1 }, '결과지를 서랍에 넣었다.', { follow: [later('chronic-pain', [4, 8], 0.35)] }],
  ]],
  ['ya-moving-help', 20, 40, '이사 돕기', '{friend|이|가} 이사를 간다며 도와 달라고 한다.', [
    ['하루 종일 돕는다', 'caring', { vitality: -3, joy: 2 }, '짐을 다 옮기고 함께 짜장면을 먹었다.', { cast: { friend: { affinity: 8 } } }],
    ['힘센 포켓몬을 빌려준다', 'pragmatic', { bond: 2 }, '파티의 힘센 포켓몬이 큰 짐을 도맡았다.', { cast: { friend: { affinity: 4 } }, training: 10 }],
    ['바쁘다고 한다', 'easygoing', { joy: 1 }, '나중에 밥을 사기로 했다.', { cast: { friend: { affinity: -4 } } }],
  ]],
  ['ya-lottery', 20, 70, '복권 한 장', '편의점 계산대 옆에서 복권이 눈에 띄었다.', [
    ['한 장 산다', 'easygoing', { money: 2500, joy: 8 }, '믿기지 않지만 2등에 당첨됐다!', { cost: 20, ...check('joy', 95, '역시나 꽝이었다. 그래도 일주일 동안 즐거웠다.', { joy: 1 }) }],
    ['그냥 지나친다', 'pragmatic', { wisdom: 1 }, '복권 대신 저축을 택했다.'],
  ]],
  ['ya-night-market', 18, 45, '야시장', '{town}에 주말 야시장이 열렸다.', [
    ['노점을 연다', 'pragmatic', { money: 250, vitality: -2 }, '직접 만든 포켓몬 간식이 다 팔렸다.'],
    ['구경한다', 'easygoing', { joy: 4, money: -50 }, '이것저것 사 먹으며 밤을 보냈다.'],
    ['길거리 배틀에 나선다', 'bold', { courage: 3 }, '야시장 배틀에서 몇 판을 이겼다.', { training: 20 }],
  ]],
]);

const midlife = table('stage', [
  ['mid-repair', 35, 60, '집수리', '비가 오면 지붕에서 물이 샌다.', [
    ['직접 고친다', 'bold', { wisdom: 3, vitality: -3, money: -150 }, '주말 내내 지붕 위에서 보냈다.'],
    ['업체에 맡긴다', 'pragmatic', { joy: 3, money: -500 }, '깔끔하게 수리됐다.'],
    ['다음에 하자', 'easygoing', { joy: 1 }, '양동이를 받쳐 두었다.', { follow: [later('leak-damage', [1, 3], 0.6)] }],
  ]],
  ['mid-health-scare', 40, 58, '몸이 보내는 신호', '계단을 오를 때 숨이 차고 가슴이 답답하다.', [
    ['정밀 검사를 받는다', 'pragmatic', { vitality: 5, money: -400 }, '일찍 발견해 가볍게 치료했다.'],
    ['생활 습관을 바꾼다', 'caring', { vitality: 4, joy: -2 }, '파트너와 함께 걷는 시간을 늘렸다.'],
    ['나이 탓이겠지', 'easygoing', { joy: 1 }, '대수롭지 않게 넘겼다.', { follow: [later('chronic-pain', [2, 5], 0.5)] }],
  ]],
  ['mid-old-partner', 35, 60, '나이 든 파트너', '{partner|이|가} 예전처럼 오래 뛰지 못한다.', [
    ['배틀에서 은퇴시킨다', 'caring', { bond: 6 }, '파트너는 이제 볕 좋은 창가에서 쉰다.', { affection: 5 }],
    ['함께 계속 달린다', 'bold', { courage: 3 }, '속도는 느려졌지만 호흡은 더 잘 맞았다.', { training: 20 }],
    ['후배 포켓몬 교육을 맡긴다', 'curious', { wisdom: 4 }, '파트너가 어린 포켓몬들의 선생님이 됐다.', { training: 30 }],
  ], { when: s => s.party.length > 0 }],
  ['mid-hobby', 35, 58, '새 취미', '주말이 생각보다 길다.', [
    ['나무열매 정원 가꾸기', 'caring', { joy: 5, money: -200 }, '첫 수확한 나무열매를 파트너에게 주었다.', { flag: 'garden', affection: 3 }],
    ['포켓몬 사진 촬영', 'curious', { joy: 4 }, '', s => ({ observe: localSpecies(s), outcome: '새벽 풀숲에서 귀한 장면을 찍었다.' })],
    ['낚시', 'easygoing', { vitality: 3, joy: 3 }, '', { observe: 129, outcome: '하루 종일 잉어킹만 낚였다. 그래도 즐거웠다.' }],
  ]],
  ['mid-village-head', 38, 65, '마을 대표 제안', '이웃들이 마을 대표를 맡아 달라고 한다.', [
    ['맡는다', 'bold', { reputation: 5, vitality: -3 }, '마을 회의를 이끌며 순찰과 축제를 챙겼다.', { world: { safety: 3 } }],
    ['보좌만 한다', 'caring', { reputation: 2 }, '대표를 도와 궂은일을 맡았다.'],
    ['거절한다', 'easygoing', { joy: 2 }, '아직은 자신의 일에 집중하고 싶었다.'],
  ], { when: s => s.reputation >= 20 }],
  ['mid-investment-club', 35, 58, '투자 모임', '지인들이 공동 투자 모임에 들어오라고 한다.', [
    ['1000P를 넣는다', 'pragmatic', {}, '공동 투자 계좌에 이름을 올렸다.', { cost: 1000, effects: { money: -1000 }, follow: [later('investment-result', [3, 6], 1, { amount: 1000 })] }],
    ['공부만 한다', 'curious', { wisdom: 3 }, '시장 공부만 열심히 했다.'],
    ['사양한다', 'easygoing', { joy: 1 }, '돈 이야기는 피곤하다.'],
  ], { when: s => s.money >= 2000 }],
  ['mid-documentary', 35, 65, '다큐멘터리 출연', '방송국이 포켓몬과 함께한 삶을 취재하고 싶어 한다.', [
    ['출연한다', 'bold', { reputation: 5, money: 300 }, '방송 이후 길에서 알아보는 사람이 생겼다.'],
    ['파트너만 나간다', 'caring', { bond: 3, reputation: 2 }, '파트너가 화면을 독차지했다.'],
    ['거절한다', 'easygoing', { joy: 2 }, '조용한 일상을 지켰다.'],
  ], { when: s => s.reputation >= 30 }],
  ['mid-guest-lecture', 35, 65, '학교 특강', '모교에서 특강을 부탁했다.', [
    ['배틀 이야기', 'bold', { courage: 3, reputation: 2 }, '아이들이 배틀 이야기에 눈을 반짝였다.', { follow: [later('student-success', [5, 9], 0.2)] }],
    ['생태 이야기', 'curious', { wisdom: 3, reputation: 2 }, '포켓몬의 사는 모습을 사진과 함께 소개했다.', { follow: [later('student-success', [5, 9], 0.2)] }],
    ['돌봄 이야기', 'caring', { bond: 3, reputation: 2 }, '포켓몬과 함께 사는 법을 이야기했다.', { follow: [later('student-success', [5, 9], 0.2)] }],
  ]],
  ['mid-lost-keepsake', 40, 65, '잃어버린 추억', '어릴 적 첫 몬스터볼을 이사하다 잃어버렸다.', [
    ['파트너에게 찾게 한다', 'caring', { joy: 5, bond: 3 }, '파트너가 상자 밑에서 몬스터볼을 물고 나왔다.', check('bond', 10, '끝내 찾지 못했다. 그래도 파트너가 곁에 있다.', { joy: -2 })],
    ['고향 집을 뒤진다', 'bold', { joy: 4, money: -200 }, '고향 다락방에서 찾아냈다.'],
    ['마음속에 둔다', 'easygoing', { wisdom: 3 }, '물건보다 기억이 남아 있으면 된다.'],
  ]],
  ['mid-neighbor-dispute', 35, 65, '이웃 분쟁', '옆집 포켓몬이 밤마다 울어 잠을 못 잔다.', [
    ['중재를 시도한다', 'curious', { wisdom: 4, reputation: 1 }, '방음 둥지를 함께 만들며 문제를 풀었다.', check('wisdom', 5, '대화가 어긋나 사이가 서먹해졌다.', { joy: -2 })],
    ['참는다', 'caring', { joy: -2, bond: 2 }, '귀마개를 사서 버텼다.'],
    ['관리 사무소에 알린다', 'pragmatic', { wisdom: 1 }, '규정에 따라 해결됐다.', { world: { safety: 1 } }],
  ]],
  ['mid-sabbatical', 40, 55, '안식년', '오래 일한 사람에게 1년 휴직을 허락한다고 한다.', [
    ['1년간 여행한다', 'bold', { courage: 5, joy: 8 }, '', s => ({ ...farSighting(s), work: { cut: 1 } })],
    ['연구에 몰두한다', 'curious', { wisdom: 6 }, '오래 미뤄 둔 공부를 마쳤다.', { work: { cut: 1, satisfaction: 10 } }],
    ['계속 일한다', 'pragmatic', { money: 300, joy: -3 }, '휴직 대신 수당을 받았다.'],
  ], { when: working }],
  ['mid-marathon', 35, 58, '포켓몬 마라톤', '트레이너와 포켓몬이 함께 달리는 마라톤이 열린다.', [
    ['완주에 도전한다', 'bold', { vitality: 4, joy: 5 }, '파트너와 나란히 결승선을 넘었다.', check('vitality', 5, '중간에 멈췄지만 다음 대회를 약속했다.', { vitality: -2 })],
    ['응원한다', 'easygoing', { joy: 3 }, '길가에서 물을 건넸다.'],
    ['음료 부스를 연다', 'pragmatic', { money: 150 }, '나무열매 음료가 불티나게 팔렸다.'],
  ]],
]);

const laterLife = table('stage', [
  ['late-memoir', 55, 95, '회고록', '살아온 이야기를 글로 남겨 보라는 권유를 받았다.', [
    ['책으로 낸다', 'bold', { reputation: 4, money: 300, wisdom: 3 }, '작은 출판사에서 책이 나왔다.'],
    ['가족에게만 남긴다', 'caring', { bond: 4, joy: 4 }, '손글씨로 한 권을 채웠다.'],
    ['쓰지 않는다', 'easygoing', { joy: 1 }, '이야기는 말로 전하기로 했다.'],
  ]],
  ['late-joints', 60, 95, '관절 통증', '무릎이 아파 산책이 힘들어졌다.', [
    ['수술을 받는다', 'pragmatic', { vitality: 10, money: -600 }, '수술 후 다시 산책로를 걸었다.'],
    ['재활 운동', 'caring', { vitality: 4 }, '파트너와 천천히 걷는 연습을 했다.'],
    ['참는다', 'easygoing', { vitality: -4 }, '집 안에서 지내는 시간이 늘었다.'],
  ]],
  ['late-garden-club', 60, 95, '노인 정원회', '동네 어르신들이 정원회를 만들었다.', [
    ['가입한다', 'easygoing', { joy: 5, bond: 2 }, '매주 함께 나무열매를 가꿨다.'],
    ['회장을 맡는다', 'bold', { reputation: 2, vitality: -2 }, '정원회 축제를 열었다.'],
    ['혼자 가꾼다', 'curious', { wisdom: 2 }, '조용한 정원이 더 좋다.'],
  ]],
  ['late-donation', 60, 100, '재산 기부', '모아 둔 돈을 의미 있게 쓰고 싶다.', [
    ['보호소에 기부한다', 'caring', { reputation: 6, money: -1500 }, '보호소에 새 치료실이 생겼다.', { world: { ecology: 3 } }],
    ['장학금을 만든다', 'curious', { reputation: 6, money: -1500 }, '어린 트레이너들을 위한 장학금이 생겼다.', { world: { safety: 2 } }],
    ['가족을 위해 남긴다', 'pragmatic', { bond: 4 }, '가족의 미래를 위해 남겨 두었다.'],
  ], { when: s => s.money >= 3000 }],
  ['late-last-journey', 65, 95, '마지막 큰 여행', '몸이 허락할 때 큰 여행을 다녀오고 싶다.', [
    ['처음 가 보는 지방으로', 'bold', { joy: 8, money: -400 }, '', farSighting],
    ['고향으로 돌아간다', 'caring', { joy: 6 }, '어린 시절 뛰놀던 언덕에 다시 섰다.', { home: true }],
    ['집에서 앨범을 넘긴다', 'easygoing', { wisdom: 3, joy: 3 }, '사진 속 여행지들을 하나씩 떠올렸다.'],
  ]],
  ['late-young-visitor', 60, 100, '어린 방문자', '동네 아이가 포켓몬 이야기를 들려 달라고 찾아왔다.', [
    ['배틀을 가르쳐 준다', 'bold', { joy: 4 }, '아이의 첫 배틀을 지켜봤다.', { training: 20 }],
    ['옛날 이야기를 들려준다', 'curious', { wisdom: 3, joy: 4 }, '아이는 이야기가 끝날 때까지 꼼짝하지 않았다.'],
    ['파트너를 소개한다', 'caring', { bond: 4 }, '파트너가 아이의 손에 머리를 비볐다.', { affection: 3 }],
  ]],
  ['late-old-friend', 65, 100, '오랜 친구의 소식', '젊은 시절 함께 여행하던 동료가 세상을 떠났다는 연락이 왔다.', [
    ['장례식에 간다', 'caring', { joy: -4, wisdom: 5 }, '함께 다니던 길을 이야기하며 배웅했다.'],
    ['편지를 쓴다', 'curious', { wisdom: 3, joy: -2 }, '유족에게 함께한 시절의 이야기를 적어 보냈다.'],
  ]],
  ['late-new-device', 60, 95, '새 도감 기기', '손주뻘 연구원이 최신 도감 기기를 선물했다.', [
    ['사용법을 배운다', 'curious', { wisdom: 4, joy: 3 }, '음성 검색까지 익혔다.', check('wisdom', 10, '버튼이 너무 많아 서랍에 넣어 두었다.', { joy: -1 })],
    ['종이 도감을 고수한다', 'easygoing', { joy: 2 }, '손때 묻은 도감이 더 편하다.'],
  ]],
  ['late-hometown-festival', 60, 95, '고향 축제 초청', '고향 마을이 축제의 원로로 초대했다.', [
    ['연설을 한다', 'bold', { reputation: 3, joy: 4 }, '짧지만 따뜻한 연설로 박수를 받았다.', check('courage', 5, '말이 길어져 아이들이 하품을 했다. 그래도 다들 웃었다.', { joy: 2 })],
    ['조용히 참석한다', 'easygoing', { joy: 4 }, '어릴 적 먹던 음식을 다시 맛봤다.'],
    ['가지 않는다', 'pragmatic', { vitality: 2 }, '먼 길 대신 쉬기로 했다.'],
  ]],
  ['late-will', 70, 100, '유언장', '가족이 조심스럽게 유언장 이야기를 꺼냈다.', [
    ['차분히 정리한다', 'pragmatic', { wisdom: 3, joy: 2 }, '포켓몬들을 누가 돌볼지까지 꼼꼼히 적었다.'],
    ['아직 이르다', 'bold', { joy: 2 }, '아직 할 일이 많다며 웃어넘겼다.'],
  ]],
]);

const temperament = table('stage', [
  ['tone-shortcut', 14, 70, '위험한 지름길', '절벽을 따라가면 반나절을 아낄 수 있다.', [
    ['지름길로 간다', 'bold', { courage: 5 }, '아슬아슬했지만 해 지기 전에 도착했다.', check('vitality', 5, '발을 헛디뎌 크게 다칠 뻔했다.', { vitality: -6 })],
    ['돌아간다', 'pragmatic', { wisdom: 2 }, '늦었지만 무사히 도착했다.'],
  ], leaning('bold')],
  ['tone-wager', 16, 60, '무모한 내기', '술자리에서 누군가 배틀 내기를 걸어왔다. 판돈이 크다.', [
    ['받아들인다', 'bold', { money: 400, courage: 3 }, '내기에서 이겼다.', { cost: 200, ...check('courage', 10, '내기에서 졌다. 비싼 수업료였다.', { joy: -3 }) }],
    ['웃으며 넘긴다', 'easygoing', { joy: 2 }, '농담으로 받아넘겼다.'],
  ], leaning('bold')],
  ['tone-tablet', 14, 80, '해독되지 않은 석판', '고물상에서 이상한 문양이 새겨진 석판을 발견했다.', [
    ['사서 연구한다', 'curious', { wisdom: 6, money: -150 }, '문양의 일부가 오래된 포켓몬 이름이라는 걸 알아냈다.', { follow: [later('paper-cited', [4, 9], 0.4)] }],
    ['연구소에 알린다', 'pragmatic', { reputation: 1 }, '연구원이 와서 석판을 가져갔다.'],
  ], leaning('curious')],
  ['tone-stargazing', 10, 90, '밤하늘 관측', '오늘 밤 유성우가 쏟아진다고 한다.', [
    ['밤새 관측한다', 'curious', { wisdom: 4, vitality: -2 }, '별똥별 사이로 무언가 날아가는 것을 본 것 같다.', { flag: 'meteor-watcher' }],
    ['파트너와 소원을 빈다', 'caring', { joy: 4, bond: 2 }, '둘이 같은 소원을 빌었을지도 모른다.'],
  ], leaning('curious')],
  ['tone-stray', 10, 90, '길 잃은 포켓몬', '비 오는 골목에서 떨고 있는 포켓몬을 발견했다.', [
    ['데려가 돌본다', 'caring', { bond: 4 }, '', s => { const { id } = selectWildEncounter(s); return { join: id, joinOrigin: 'rescued', outcome: `몸을 말리고 먹이를 주자 ${poke(id, '이', '가')} 곁을 떠나지 않았다.` }; }],
    ['센터에 맡긴다', 'pragmatic', { reputation: 1 }, '센터에서 보호를 맡았다.'],
  ], leaning('caring')],
  ['tone-cant-say-no', 18, 80, '거절하지 못하는 부탁', '이번 주만 세 번째 부탁이다. 오늘은 이웃이 이사를 도와 달라고 한다.', [
    ['또 돕는다', 'caring', { reputation: 2, vitality: -4 }, '고맙다는 말을 많이 들었지만 몹시 지쳤다.'],
    ['처음으로 거절한다', 'pragmatic', { wisdom: 3, joy: 2 }, '거절해도 세상이 무너지지 않는다는 걸 알았다.'],
  ], leaning('caring')],
  ['tone-budget', 18, 90, '가계부 정리', '한 해 지출을 정리해 보니 새는 돈이 많다.', [
    ['구독과 지출을 정리한다', 'pragmatic', { money: 300, wisdom: 2 }, '쓸데없는 지출을 줄였다.'],
    ['그래도 쓸 데는 쓴다', 'easygoing', { joy: 3 }, '행복을 위한 지출이라고 생각했다.'],
  ], leaning('pragmatic')],
  ['tone-haggle', 16, 80, '중고 장비 흥정', '중고 시장에서 좋은 장비를 발견했다.', [
    ['끝까지 흥정한다', 'pragmatic', { money: -150 }, '반값에 장비를 손에 넣었다.', { training: 30 }],
    ['제값 주고 산다', 'caring', { money: -300, joy: 2 }, '판매자가 덤으로 상처약을 챙겨 주었다.', { training: 30 }],
    ['구경만 한다', 'easygoing', { joy: 1 }, '오늘은 눈으로만 즐겼다.'],
  ], leaning('pragmatic')],
  ['tone-lazy-sunday', 10, 95, '게으른 일요일', '오늘은 아무 계획이 없다.', [
    ['하루 종일 뒹군다', 'easygoing', { vitality: 4, joy: 4 }, '파트너와 같이 낮잠을 세 번 잤다.', { affection: 2 }],
    ['그래도 뭔가 한다', 'pragmatic', { wisdom: 2 }, '밀린 정리를 했다.'],
  ], leaning('easygoing')],
  ['tone-spontaneous', 16, 85, '즉흥 여행', '아침에 눈을 뜨자마자 어딘가로 떠나고 싶어졌다.', [
    ['첫 기차를 탄다', 'easygoing', { joy: 6, money: -200 }, '', farSighting],
    ['다음 휴일로 미룬다', 'pragmatic', { wisdom: 1 }, '달력에 동그라미를 쳤다.'],
  ], leaning('easygoing')],
]);

const family = table('family', [
  ['fam-honeymoon', 19, 70, '신혼여행', '{spouse|과|와} 어디로 떠날지 정한다.', [
    ['열대의 섬으로', 'bold', { joy: 8, money: -500 }, '바다 위로 지는 해를 함께 봤다.'],
    ['조용한 산장', 'caring', { joy: 6, bond: 3, money: -250 }, '벽난로 앞에서 앞으로의 이야기를 나눴다.'],
    ['돈을 아껴 집을 꾸민다', 'pragmatic', { joy: 3 }, '신혼집 마당에 나무열매 나무를 심었다.', { flag: 'garden' }],
  ], { when: s => married(s) && s.age - (s.relationship.marriedAt || 0) <= 2 }],
  ['fam-chores', 20, 90, '집안일 분담', '집안일이 한쪽으로 쏠린다며 {spouse|이|가} 서운해한다.', [
    ['표를 만들어 나눈다', 'pragmatic', { wisdom: 2, joy: 2 }, '냉장고에 분담표를 붙였다.'],
    ['당분간 내가 더 맡는다', 'caring', { bond: 3, vitality: -2 }, '{spouse|이|가} 고맙다며 웃었다.'],
    ['포켓몬에게 일을 가르친다', 'curious', { joy: 3 }, '파티 포켓몬들이 빨래 개기를 배웠다.', { training: 15 }],
  ], { when: married }],
  ['fam-gift', 20, 95, '기념일 선물', '결혼기념일이 다가온다.', [
    ['깜짝 여행을 준비한다', 'bold', { joy: 6, money: -300 }, '{spouse|이|가} 눈물을 글썽였다.'],
    ['직접 만든 선물', 'caring', { joy: 5, bond: 2 }, '서툰 솜씨지만 진심이 담겼다.'],
    ['함께 고른다', 'pragmatic', { joy: 3, money: -100 }, '둘 다 마음에 드는 그릇을 샀다.'],
  ], { when: married }],
  ['fam-spouse-offer', 25, 60, '배우자의 이직 제안', '{spouse|이|가} 다른 지방에서 좋은 자리를 제안받았다.', [
    ['함께 이사한다', 'caring', { bond: 4, money: -300 }, '새 지방에서 함께 다시 시작했다.', { move: 'random' }],
    ['장거리 부부로 지낸다', 'pragmatic', { joy: -2, money: 300 }, '주말마다 기차를 탔다.'],
    ['이번엔 거절하자고 한다', 'easygoing', { joy: -1 }, '{spouse|은|는} 아쉬워했지만 동의했다.'],
  ], { when: married }],
  ['fam-child-school', 25, 70, '아이의 입학', '아이가 학교에 갈 나이가 됐다.', [
    ['트레이너 스쿨', 'bold', { courage: 2, money: -300 }, '아이가 첫날부터 배틀 이야기를 쏟아냈다.'],
    ['집 근처 일반 학교', 'pragmatic', { wisdom: 2 }, '걸어서 데려다줄 수 있는 학교를 골랐다.'],
    ['가정학습', 'caring', { bond: 4, vitality: -2 }, '직접 아이를 가르치기로 했다.'],
  ], { when: hasKids }],
  ['fam-child-partner', 28, 75, '아이의 첫 포켓몬', '아이가 자기만의 포켓몬을 갖고 싶어 한다.', [
    ['연구소에 함께 간다', 'caring', { joy: 6, bond: 3 }, '아이가 고른 포켓몬을 품에 안고 한참을 웃었다.'],
    ['돌봄 연습부터 시킨다', 'pragmatic', { wisdom: 3 }, '한 달 동안 파트너 돌보기를 함께 연습했다.'],
    ['파티의 포켓몬을 맡긴다', 'bold', { bond: 2 }, '파티의 한 포켓몬이 아이의 단짝이 됐다.', { affection: 2 }],
  ], { when: hasKids }],
  ['fam-child-rebel', 35, 80, '사춘기 아이', '아이가 방문을 닫고 대화를 피한다.', [
    ['기다려 준다', 'caring', { bond: 3, joy: -2 }, '몇 주 뒤 아이가 먼저 말을 걸어왔다.'],
    ['함께 여행을 간다', 'bold', { joy: 4, money: -250 }, '산 정상에서 아이가 처음으로 속마음을 꺼냈다.'],
    ['규칙을 정한다', 'pragmatic', { wisdom: 2, joy: -2 }, '서로 지킬 규칙을 정했다.'],
  ], { when: hasKids }],
  ['fam-family-trip', 25, 85, '가족 여행', '온 가족이 여행을 떠날 수 있는 휴가가 생겼다.', [
    ['캠핑카 여행', 'bold', { joy: 7, money: -400 }, '가족과 포켓몬이 한 차에 끼어 앉아 웃었다.', { affection: 2 }],
    ['조부모 댁 방문', 'caring', { bond: 4 }, '오랜만에 3대가 한 상에 모였다.', { cast: { family: { health: 5 } } }],
    ['집에서 쉰다', 'easygoing', { vitality: 4 }, '푹 쉬는 것도 여행이다.'],
  ], { when: s => married(s) || hasKids(s) }],
  ['fam-in-laws', 22, 70, '처가·시가 방문', '{spouse}의 가족 모임에 초대받았다.', [
    ['정성껏 준비해 간다', 'caring', { bond: 3, money: -100 }, '정성 들인 나무열매 파이가 인기였다.'],
    ['포켓몬 배틀로 친해진다', 'bold', { courage: 3 }, '사돈 어른과의 배틀로 금세 친해졌다.'],
    ['짧게 인사만 한다', 'pragmatic', { joy: -1 }, '어색한 분위기를 피했다.'],
  ], { when: married }],
  ['fam-empty-nest', 45, 85, '빈 둥지', '아이가 독립해 집이 조용해졌다.', [
    ['둘만의 취미를 찾는다', 'caring', { joy: 5 }, '{spouse|과|와} 춤을 배우기 시작했다.'],
    ['새 포켓몬을 들인다', 'bold', { joy: 4 }, '', s => { const { id } = selectWildEncounter(s); return { join: id, joinOrigin: 'adopted', outcome: `빈 방에 ${poke(id, '이', '가')} 들어왔다.` }; }],
    ['조용함을 즐긴다', 'easygoing', { vitality: 3, wisdom: 2 }, '조용한 아침이 나쁘지 않다.'],
  ], { when: s => hasKids(s) && s.age >= 45 }],
  ['solo-trip', 28, 80, '혼자만의 여행', '혼자인 지금이 아니면 못 할 여행이 있다.', [
    ['한 달간 떠난다', 'bold', { joy: 7, money: -400 }, '', farSighting],
    ['집을 새로 꾸민다', 'easygoing', { joy: 4, money: -200 }, '파트너 전용 쿠션까지 마련했다.', { affection: 3 }],
    ['가까운 산책로를 걷는다', 'caring', { vitality: 3, bond: 2 }, '돈 들이지 않는 여행도 충분히 좋았다.'],
  ], { when: s => s.relationship.status === 'single' }],
  ['solo-blind-date', 25, 55, '소개팅 제안', '{friend|이|가} 소개팅을 주선하겠다고 한다.', [
    ['나가 본다', 'bold', { joy: 3, courage: 2 }, '대화는 즐거웠지만 인연은 아니었다.'],
    ['지금이 좋다', 'easygoing', { joy: 2 }, '혼자의 삶도 충분히 좋다고 답했다.'],
  ], { when: s => s.relationship.status === 'single' }],
  ['solo-friends-dinner', 30, 85, '친구들과의 저녁', '혼자 사는 친구들끼리 정기 모임을 만들자고 한다.', [
    ['모임을 만든다', 'caring', { joy: 5 }, '매달 첫 금요일은 모임 날이 됐다.', { cast: { friend: { affinity: 6 } } }],
    ['가끔만 나간다', 'pragmatic', { joy: 2 }, '부담 없는 거리를 유지했다.'],
  ], { when: s => s.relationship.status === 'single' }],
]);

const partyLife = table('pokemon', [
  ['pk-picky', 6, 90, '편식하는 포켓몬', '파티의 한 포켓몬이 새 사료를 거부한다.', [
    ['직접 간식을 만든다', 'caring', { bond: 3, money: -50 }, '나무열매 경단을 만들어 주자 접시를 비웠다.', { affection: 4 }],
    ['먹을 때까지 기다린다', 'pragmatic', { wisdom: 2 }, '사흘 만에 포기하고 먹기 시작했다.'],
    ['전문가에게 묻는다', 'curious', { wisdom: 3, money: -80 }, '알레르기가 원인이었다.'],
  ]],
  ['pk-nightmare', 6, 90, '악몽을 꾸는 파트너', '{partner|이|가} 밤마다 끙끙 앓는 소리를 낸다.', [
    ['곁에서 잔다', 'caring', { bond: 5, vitality: -2 }, '곁에 누운 뒤로는 조용히 잠들었다.', { affection: 5 }],
    ['원인을 조사한다', 'curious', { wisdom: 4 }, '창밖 가로등 불빛이 원인이었다.'],
    ['조용한 방으로 옮긴다', 'pragmatic', { bond: 1 }, '잠자리를 옮겨 주었다.'],
  ]],
  ['pk-runaway', 8, 85, '사라진 파트너', '아침에 일어나 보니 {partner|이|가} 보이지 않는다.', [
    ['동네를 샅샅이 찾는다', 'caring', { bond: 5, vitality: -3 }, '공터에서 다른 포켓몬들과 놀고 있는 파트너를 찾았다.', check('bond', -5, '해가 질 때쯤 파트너가 혼자 집으로 돌아왔다. 둘 다 녹초가 됐다.', { vitality: -3 })],
    ['평소 가던 곳을 추리한다', 'curious', { wisdom: 4 }, '추리대로 강가 바위 위에서 낮잠 자는 파트너를 찾았다.'],
    ['돌아올 거라 믿고 기다린다', 'easygoing', { joy: 1 }, '저녁밥 냄새에 파트너가 돌아왔다.'],
  ]],
  ['pk-party-fight', 10, 85, '파티 내 다툼', '파티의 두 포켓몬이 자리를 두고 계속 다툰다.', [
    ['함께 훈련시킨다', 'bold', { courage: 3 }, '같이 땀을 흘리고 나니 사이가 좋아졌다.', { training: 25 }],
    ['따로 시간을 낸다', 'caring', { bond: 3 }, '각자와 시간을 보내며 서운함을 풀어 줬다.', { affection: 3 }],
    ['서열이 정해질 때까지 둔다', 'easygoing', { joy: -1 }, '며칠 소란 끝에 저절로 정리됐다.', { affection: -2 }],
  ], { when: s => s.party.length >= 2 }],
  ['pk-new-move', 8, 85, '새 기술 연습', '{partner|이|가} 새 기술을 익히고 싶어 한다.', [
    ['강력한 공격 기술', 'bold', { courage: 4 }, '위력은 굉장했지만 아직 반동이 크다.', { training: 35 }],
    ['보조 기술', 'curious', { wisdom: 4 }, '상대의 움직임을 묶는 기술을 익혔다.', { training: 25 }],
    ['서두르지 않는다', 'caring', { bond: 3 }, '지금 기술을 더 다듬기로 했다.', { affection: 2 }],
  ]],
  ['pk-grooming', 10, 85, '털 손질 대회', '{town}에서 포켓몬 손질 대회가 열린다.', [
    ['정성껏 손질해 출전', 'caring', { bond: 4, money: 150, reputation: 1 }, '파트너가 반짝이는 털로 우승했다.', check('bond', 5, '입상은 못 했지만 파트너는 기분이 좋아 보였다.', { bond: 2 })],
    ['구경만 한다', 'easygoing', { joy: 3 }, '다른 트레이너들의 손질 비법을 구경했다.'],
  ]],
  ['pk-box-visit', 12, 95, '박스의 포켓몬들', 'PC 박스에 맡긴 포켓몬들이 문득 마음에 걸린다.', [
    ['하루 종일 함께 논다', 'caring', { bond: 4, joy: 3 }, '박스의 포켓몬들을 모두 꺼내 공원에서 놀았다.'],
    ['훈련 일정을 짠다', 'pragmatic', { wisdom: 2 }, '박스 포켓몬의 훈련 계획을 세웠다.'],
    ['잘 지내겠지', 'easygoing', { joy: 1 }, '다음에 시간을 내기로 했다.'],
  ], { when: s => s.box.length > 0 }],
  ['pk-jealous', 8, 90, '질투', '새 식구가 들어온 뒤로 {partner|이|가} 시무룩하다.', [
    ['파트너와 둘만의 시간', 'caring', { bond: 5 }, '둘이서만 옛 산책로를 걸었다.', { affection: 4 }],
    ['다 같이 어울리게 한다', 'bold', { joy: 3 }, '함께 소풍을 가니 금방 친해졌다.', { training: 15 }],
  ], { when: s => s.party.length >= 2 }],
  ['pk-photo', 8, 95, '가족사진', '사진관에서 포켓몬과 함께 찍는 사진을 할인한다.', [
    ['모두 함께 찍는다', 'caring', { joy: 5, money: -100 }, '모두 카메라를 보게 하는 데 한 시간이 걸렸다.', { affection: 2 }],
    ['파트너와 둘이서', 'caring', { bond: 3, money: -50 }, '사진 속 파트너가 활짝 웃고 있다.'],
    ['직접 찍는다', 'pragmatic', { joy: 2 }, '흔들렸지만 마음에 드는 사진이 나왔다.'],
  ]],
  ['pk-anniversary', 10, 95, '함께한 기념일', '{partner|과|와} 처음 만난 날이 돌아왔다.', [
    ['특별한 식사', 'caring', { bond: 4, joy: 4, money: -80 }, '파트너가 좋아하는 것만 잔뜩 차렸다.', { affection: 4 }],
    ['처음 만난 곳에 간다', 'easygoing', { joy: 5 }, '그날처럼 같은 길을 걸었다.'],
  ]],
  ['pk-plateau', 15, 70, '훈련 정체기', '몇 달째 파티의 실력이 제자리다.', [
    ['훈련 방식을 바꾼다', 'curious', { wisdom: 4 }, '새 방식으로 바꾸자 다시 성장하기 시작했다.', { training: 40 }],
    ['더 세게 몰아붙인다', 'bold', { courage: 3 }, '실력은 늘었지만 포켓몬들이 지쳐 보였다.', { training: 50, affection: -3 }],
    ['푹 쉬게 한다', 'easygoing', { vitality: 3 }, '쉬고 나니 몸놀림이 가벼워졌다.', { affection: 3 }],
  ]],
  ['pk-weather', 8, 90, '날씨와 포켓몬', '며칠째 이어진 궂은 날씨에 파티 포켓몬들이 예민하다.', [
    ['실내 놀이를 만든다', 'caring', { bond: 3, joy: 2 }, '거실에 장애물 코스를 만들었다.', { affection: 2 }],
    ['날씨를 이용해 훈련한다', 'bold', { courage: 3 }, '빗속 훈련으로 집중력을 길렀다.', { training: 20 }],
  ]],
  ['pk-old-friend-visit', 20, 95, '옛 동료 포켓몬', '예전에 함께 여행하던 트레이너가 포켓몬과 함께 놀러 왔다.', [
    ['함께 산책한다', 'caring', { joy: 4, bond: 2 }, '두 집 포켓몬이 금방 옛 친구처럼 어울렸다.'],
    ['연습 배틀을 한다', 'bold', { courage: 3 }, '오랜만의 배틀에 둘 다 신이 났다.', { training: 20 }],
  ]],
  ['pk-trick', 8, 80, '파트너의 장난', '{partner|이|가} 이웃의 빨래를 숨겨 놓았다.', [
    ['함께 사과하러 간다', 'caring', { bond: 3, reputation: 1 }, '파트너가 고개를 숙이자 이웃이 웃음을 터뜨렸다.'],
    ['훈련으로 버릇을 고친다', 'pragmatic', { wisdom: 2 }, '장난 대신 숨바꼭질 놀이를 가르쳤다.', { training: 10 }],
  ]],
  ['pk-shiny-rumor', 12, 80, '색이 다른 포켓몬 소문', '근처 풀숲에서 색이 다른 포켓몬을 봤다는 소문이 돈다.', [
    ['며칠 잠복한다', 'bold', { courage: 3, vitality: -3 }, '', s => ({ observe: localSpecies(s), outcome: '색은 평범했지만 처음 보는 무리를 발견했다.' })],
    ['소문을 정리한다', 'curious', { wisdom: 3 }, '목격담 대부분이 빛의 착시였다는 걸 밝혔다.'],
  ]],
]);

export const MORE_LIFE = [...earlyYears, ...childhood, ...teens, ...adulthood, ...midlife, ...laterLife, ...temperament, ...family, ...partyLife];
