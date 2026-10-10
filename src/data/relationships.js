const stories=[
 ['첫 만남','지역 포켓몬 행사에서 활동을 함께한 사람이 다음 만남을 제안했다.','둘이 다시 만나기','친구로 지내기','dating'],
 ['서로 다른 생활 방식','상대는 안정적인 생활을 원하지만 당신의 일정에는 여행이 많다.','함께 지킬 일정을 정한다','서로의 독립적인 시간을 보장한다','schedule'],
 ['가족에게 소개','상대가 가족 모임에 함께 가자고 한다.','가족 모임에 참석한다','둘이 먼저 더 알아간다','family'],
 ['파트너 포켓몬의 갈등','두 사람의 포켓몬이 같은 공간에서 자꾸 충돌한다.','함께 적응 훈련을 한다','각자의 공간을 마련한다','pokemon'],
 ['장거리 생활 제안','상대가 다른 지방에서 일할 기회를 얻었다.','장거리 교제를 시도한다','같은 지방에서 살 방법을 찾는다','distance'],
 ['관계의 미래','상대가 앞으로 어떤 관계를 원하는지 묻는다.','결혼을 진지하게 논의한다','결혼하지 않고 교제를 이어간다','commitment'],
 ['청혼','서로의 진로와 생활을 충분히 이야기했다. 결혼에 대한 결정을 내릴 때다.','청혼하고 결혼을 약속한다','지금은 교제를 유지한다','engaged'],
 ['결혼식 준비','가족과 포켓몬이 함께할 결혼식의 규모를 정한다.','작은 가족 결혼식','마을 친구들도 초대한다','married'],
 ['신혼집 선택','새로운 공동생활에 맞는 집이 필요하다.','현재 마을에 함께 정착','일터 가까운 임대주택 선택','home'],
 ['가계 운영','포켓몬 돌봄비와 생활비를 어떻게 나눌지 이야기한다.','공동 예산을 정한다','개인 예산과 공동 지출을 나눈다','budget'],
 ['자녀에 대한 대화','아이를 키울지, 두 사람의 생활에 집중할지 충분히 논의한다.','함께 자녀를 계획한다','아이 없이 둘의 생활을 선택한다','children'],
 ['배우자의 진로 전환','배우자가 새로운 일을 공부하고 싶어 한다.','생활을 분담하며 지원한다','일과 학업을 병행할 계획을 세운다','career'],
 ['갈등 이후의 대화','일정이 겹치면서 집안일과 포켓몬 돌봄이 한쪽에 몰렸다.','역할 분담을 다시 정한다','외부 돌봄 도움을 구한다','conflict'],
 ['가족 여행 계획','배우자가 둘만의 여행과 가족 전체 여행 중 하나를 제안한다.','둘만의 여행을 계획한다','가족과 포켓몬 모두 함께한다','holiday'],
 ['배우자의 건강','배우자가 당분간 휴식이 필요하다는 진단을 받았다.','일정을 줄이고 곁을 지킨다','가족과 돌봄 일정을 나눈다','health'],
 ['기념일의 약속','지난 생활을 돌아보며 다음 목표를 정한다.','공동 목표를 새로 정한다','각자의 목표를 지원한다','anniversary'],
 ['아이의 첫 파트너','아이가 첫 포켓몬과 함께할 준비를 하고 있다.','함께 연구소를 방문한다','돌봄 연습부터 함께 한다','child-partner'],
 ['노후의 거주지','두 사람의 일하는 시간이 줄어들었다. 앞으로 살 곳을 이야기한다.','지금의 이웃들과 계속 산다','가족 가까이에서 살 계획을 세운다','retirement'],
];
export function relationshipEvent(s){
 const rel=s.relationship;if(s.age<18||s.season!==2||s.age%2!==0)return null;
 const index=rel.chapter||0;if(index>=stories.length||(index===17&&s.age<62))return null;
 if(index===16&&!rel.children){rel.chapter++;return relationshipEvent(s);}
 const [title,body,a,b,key]=stories[index];
 const choice=(label,variant)=>({label,description:variant?'대화와 합의 · 유대 +4':'관계에 투자 · 유대 +6',relationship:{key,variant},effects:{bond:variant?4:6,joy:3},outcome:`${rel.name||'상대'}와 이야기한 뒤 ${label}로 합의했다.`});
 const options=[choice(a,0),choice(b,1)];
 if(index>0&&index<7)options.push({label:'교제를 끝내고 각자의 길로',description:'관계 종료 · 이후 새로운 만남 가능',relationship:{key:'separate'},effects:{joy:-3,wisdom:4},outcome:'대화 끝에 관계를 정리했다. 서로의 결정을 존중하기로 했다.'});
 if(index===0)options.push({label:'지금은 만남을 원하지 않는다',description:'혼자 지내기 · 다음 만남은 나중에',relationship:{key:'decline'},effects:{wisdom:2},outcome:'제안을 정중히 거절하고 현재 생활에 집중한다.'});
 return {kind:'choice',title,body:`${rel.name||'지역 연구원 유진'}${index?'와의 생활. ':'. '}${body}`,choices:options};
}
export function resolveRelationship(s,action){const r=s.relationship;
 if(action.key==='decline')return;
 if(action.key==='separate'){r.status='single';r.chapter=0;r.name=['서윤','지호','도윤','유진'][(r.meetings=(r.meetings||0)+1)%4];return;}
 r.chapter++;r.trust=Math.min(100,r.trust+(action.variant?4:7));
 if(action.key==='dating')r.status=action.variant?'friends':'dating';
 if(action.key==='commitment'&&action.variant)r.chapter=9;
 if(action.key==='engaged'){if(action.variant)r.chapter=6;else r.status='engaged';}
 if(action.key==='married') {r.status='married';r.marriedAt=s.age;}
 if(action.key==='children')r.children=action.variant?0:1;
}
