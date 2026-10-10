// Canon locations and species; travel costs and field layouts are original game rules.
export const REGIONS = [
 {id:'kanto',name:'관동',color:'#63c9a7',theme:'숲과 해안',legend:[144,145,146,150,151],starters:[1,4,7],special:'포켓몬 리그'},
 {id:'johto',name:'성도',color:'#d9b86c',theme:'유적과 전통',legend:[243,244,245,249,250,251],starters:[152,155,158],special:'유적 조사'},
 {id:'hoenn',name:'호연',color:'#5ebde0',theme:'바다와 화산',legend:[377,378,379,380,381,382,383,384],starters:[252,255,258],special:'메가진화'},
 {id:'sinnoh',name:'신오',color:'#a5a9ee',theme:'설산과 신화',legend:[480,481,482,483,484,487,488],starters:[387,390,393],special:'지하대동굴'},
 {id:'unova',name:'하나',color:'#e3a278',theme:'도시와 자연',legend:[638,639,640,641,642,643,644,645,646],starters:[495,498,501],special:'배틀 서브웨이'},
 {id:'kalos',name:'칼로스',color:'#e799ca',theme:'도시와 고성',legend:[716,717,718],starters:[650,653,656],special:'메가진화'},
 {id:'alola',name:'알로라',color:'#e4cd71',theme:'열대의 섬',legend:[785,786,787,788,791,792],starters:[722,725,728],special:'Z기술'},
 {id:'galar',name:'가라르',color:'#eb809c',theme:'와일드에리어',legend:[888,889,890],starters:[810,813,816],special:'다이맥스'},
 {id:'paldea',name:'팔데아',color:'#b5a3ff',theme:'오픈 필드',legend:[1007,1008,1001,1002,1003,1004],starters:[906,909,912],special:'테라스탈'},
];
const rows = [
 ['johto','new-bark','연두마을','숲',[161,163,179,187,152]],['johto','violet','도라지시티','산',[163,177,194,216,155]],['johto','goldenrod','금빛시티','도시',[133,175,183,209,158]],['johto','ecruteak','인주시티','산',[92,200,234,163,215]],
 ['sinnoh','twinleaf','떡잎마을','숲',[396,399,403,406,387]],['sinnoh','jubilife','축복시티','도시',[403,418,427,390,433]],['sinnoh','hearthome','연고시티','숲',[280,406,425,440,393]],['sinnoh','snowpoint','선단시티','산',[215,220,361,459,436]],
 ['unova','nuvema','마름꽃마을','숲',[504,506,519,495,509]],['unova','castelia','구름시티','도시',[519,543,551,498,572]],['unova','nimbasa','뇌문시티','도시',[522,554,568,595,501]],['unova','driftveil','물풍경시티','바다',[529,532,580,588,602]],
 ['kalos','vaniville','조아마을','숲',[659,661,664,650,669]],['kalos','lumiose','미르시티','도시',[25,133,659,653,677]],['kalos','shalour','사라시티','바다',[447,307,656,690,692]],['kalos','anistar','향전시티','산',[677,679,703,704,710]],
 ['alola','iki','이키마을','숲',[722,731,734,736,744]],['alola','hauoli','하우올리시티','바다',[725,728,739,742,753]],['alola','heahea','환대시티','바다',[746,747,751,755,759]],['alola','malie','말리에시티','도시',[764,767,769,774,777]],
 ['galar','postwick','펄롱마을','숲',[810,819,821,831,848]],['galar','motostoke','엔진시티','도시',[813,833,837,850,859]],['galar','hammerlocke','너클시티','산',[816,843,846,854,885]],['galar','wedgehurst','브래시마을','숲',[827,829,835,840,856]],
 ['paldea','cabo-poco','코사지마을','바다',[906,915,917,921,926]],['paldea','mesagoza','테이블시티','도시',[909,912,924,927,935]],['paldea','levincia','누룩스시티','바다',[940,944,948,952,963]],['paldea','montenevera','프리지마을','산',[361,459,924,971,974]],
];
export const EXTRA_TOWNS = rows.map(([map,id,name,environment,pool],i)=>({id,name,map,region:REGIONS.find(r=>r.id===map).name,environment,pool,caption:`${environment} 필드 · 야생 포켓몬 5종`,description:'포켓몬센터, 연구소, 배틀 시설을 이용할 수 있습니다.',x:22+(i%4)*18,y:[65,38,58,25][i%4]}));
export const regionOf = town => REGIONS.find(r=>r.id===town.map);
