# AGENTS.md — Pokélife 작업 안내

이 저장소는 여러 AI 에이전트(Claude, GPT 등)와 사람이 함께 작업합니다. 코드를 고치기 전에 이 문서를 읽어 주세요.
최근 구조 변경 내역은 [docs/CHANGES-v2.md](docs/CHANGES-v2.md)에 있습니다.

## 실행

```sh
npm ci
npm run dev          # http://localhost:5173
npm test             # node:test 단위 테스트 (약 20초)
npm run test:browser # Playwright. Chromium 경로는 CHROMIUM_PATH로 지정
PAGES_BASE_PATH=/poke/ npm run build
```

`main`에 푸시하면 GitHub Actions가 테스트·빌드 후 GitHub Pages에 배포합니다. 작업은 별도 브랜치에서 하고 PR로 합쳐 주세요.

## 폴더 구조

| 경로 | 역할 |
|---|---|
| `src/engine.js` | 공개 API: `createLife`, `advance`, `choose`, `autoChoice`, `acknowledge`, `toggleMemory`, `parseSave`. 연간 진행(`advanceYear`)과 선택 적용(`applyActions`) |
| `src/sim/random.js` | 결정적 난수(`random`, `pick`, `chance`, `between`, `weighted`) |
| `src/sim/world.js` | 지방별 경기·치안·생태, 지방 상황(`CONDITIONS`), `tickWorld` |
| `src/sim/people.js` | 소꿉친구·라이벌·형제·가족(`cast`)의 삶, `tickPeople` |
| `src/sim/party.js` | 파티·PC 박스·자동 재편성·진화. 성향(`DISPOSITIONS`) |
| `src/sim/battle.js` | 자동 배틀 `autoBattle`, 장비 규칙, 타입 상성 |
| `src/sim/consequences.js` | 선택의 지연 결과(seed) 심기·해소 |
| `src/sim/director.js` | 매년의 주 사건 선택. 모든 사건 풀을 storylet으로 모음 |
| `src/sim/save.js` | 저장 검증과 이전 형식 변환(`SAVE_VERSION`) |
| `src/sim/text.js` | 한국어 조사 `josa`, 포켓몬 이름 토큰 `poke` |
| `src/data/storylets.js` | 상태 조건으로 열리는 사건(인물·지방 상황·기회) |
| `src/data/consequences.js` | 선택의 여파 정의 |
| `src/data/milestones.js` | 나이 고정 사건(7·12·18·22세 학습, 16세 진로) |
| `src/data/progression.js` | 경력 평가(`careerReview`)와 연간 파티 경험치(`annualTraining`) |
| `src/data/life-events.js` | 출생 배경, 동네 사건 32종, 야생·체육관·레이드·장비 사건 |
| `src/data/challenges.js` · `quests.js` · `regional-stories.js` · `relationships.js` | 판정 사건 60종, 장기 경로 32종, 지방 사건 27종, 관계 18단계 |
| `src/data/species-rules.js` | **생성 파일.** `node scripts/build_species_rules.mjs`로 다시 만듭니다. 직접 수정하지 마세요 |
| `src/ui/` | 화면 구성 요소. `App.jsx`는 상태와 레이아웃만 담당 |

CSS는 `styles.css` → `game.css` → `life.css` 순서로 겹칩니다. 새 스타일은 `life.css` 끝에 추가하세요.

## 꼭 지켜야 할 규칙

1. **결정성.** 시뮬레이션 코드(`src/sim`, `src/data`, `src/engine.js`)에서 `Math.random`, `Date`를 쓰지 마세요. 모든 무작위는 `state.rng`를 쓰는 `random.js` 함수로만 뽑습니다. 같은 시드와 같은 선택이면 같은 삶이 나와야 하고, 저장 후 다시 불러와도 결과가 바뀌면 안 됩니다.
2. **불변 입력.** `advance`, `choose` 등은 입력을 바꾸지 않고 `structuredClone`한 새 상태를 돌려줍니다. 할 수 없는 행동이면 입력 객체를 그대로 돌려줍니다.
3. **`advance` 한 번 = 기록 한 줄.** 선택 사건은 직전 선택 이후 자동 기록이 4~7개 쌓인 뒤에 뜹니다(`scheduledEvent`로 미뤄 둠). 그 사이에는 큐(`state.queue`)의 소식·인연·파티·여파 기록, 일상 기록이 채워집니다.
4. **상태는 순수 JSON.** 사건과 선택지는 저장 파일에 그대로 들어갑니다. 함수나 클래스를 넣지 마세요.
5. **포켓몬 추가는 `addPokemon`으로만.** 파티가 6마리를 넘으면 자동 재편성이 일어나고, 전설의 포켓몬(`locked`)은 언제나 파티에 남습니다. `s.party.push`를 직접 쓰지 마세요.
6. **새 상태 필드를 추가하면** `src/sim/save.js`의 `validState`에 검증을 추가하세요. 기존 저장에 없는 필드라면 `SAVE_VERSION`을 올리고 변환 함수(`migrateV1` 참고)를 추가해야 합니다. 그러지 않으면 기존 사용자의 저장 파일이 거부됩니다.
7. **새 선택지 필드를 추가하면** `save.js`의 `validActions`도 함께 고치세요.
8. **한국어 문장.** 이름 뒤 조사는 `josa(이름, '이', '가')`를 쓰고, 포켓몬 이름은 `poke(id, '을', '를')` 토큰으로 넣습니다(UI가 실제 이름으로 바꿉니다). 본문에는 `{town}`, `{partner}` 토큰도 쓸 수 있습니다.

## 사건(storylet) 추가하기

`src/data/storylets.js`의 `STORYLETS` 배열에 추가합니다.

```js
{ id: 'my-event', category: 'opportunity', min: 20, max: 60,
  once: false, cooldown: 5,             // 생략하면 평생 한 번
  urgent: false,                        // true면 조건이 맞는 해에 다른 사건보다 먼저
  when: s => s.money > 1000,            // 열리는 조건
  weight: s => 1,                       // 같은 분류 안에서의 비중
  build: s => ({ kind: 'choice', title: '...', body: '...', choices: [/* 선택지 */] }) }
```

분류(`category`)별 비중은 `src/sim/director.js`의 `CATEGORY_WEIGHT`에 있고, 지방 상황·관계 상태 등에 따라 매년 달라집니다.

## 선택지 필드

| 필드 | 효과 |
|---|---|
| `label`, `description`, `outcome` | 필수 문구 |
| `effects` | `joy·vitality·courage·wisdom·bond·money·reputation` 증감 |
| `cost` | 이 금액이 없으면 고를 수 없음. 판정 없는 선택지는 `effects.money`에 `-cost`를 직접 넣어야 하고, 판정 선택지는 성공·실패와 관계없이 자동으로 지불 |
| `challenge` | `{ stat, difficulty, failure: { outcome, effects, ...다른 필드 } }`. 성공률 `25 + 스탯×0.7 − 난이도`, 5~95% |
| `world` | 현재 지방의 `economy·safety·ecology` 증감 |
| `cast` | `{ friend: { affinity: 10, path: 'worker' } }`처럼 인물 상태 변경 |
| `follow` | `[{ id, delay: [최소, 최대], p, data }]` 몇 년 뒤의 여파. `id`는 `src/data/consequences.js`의 키 |
| `battle` | `{ kind: 'wild'·'gym'·'raid'·'rival'·'villain'·'league', opponent?, capture? }` 자동 배틀 |
| `after` | `{ win: {...}, lose: {...} }` 배틀 결과별 추가 효과 |
| `join`, `joinOrigin` | 포켓몬 합류(`egg·gift·rescued·adopted·starter·legend`) |
| `career`, `education`, `work` | 진로·학습 방식·직업 상태(`satisfaction`, `cut`, `retired`) |
| `promotion`, `leaveCareer` | 경력 등급 +1(최대 5, 등급당 수입 +15%), 직업 내려놓기 |
| `captureJoin` | 판정 포획 성공 시 해당 종 합류(경험치는 파트너의 65%) |
| `destination`, `move`, `home` | 이주(`move: 'region'`은 같은 지방 안) |
| `flag`, `unflag` | 이후 사건 조건용 플래그 |
| `observe`, `training`, `equipment`, `relationship` | 도감 등록, 파티 경험치, 장비 해금, 관계 사건 |
| `tone` | 이 선택이 쌓는 성향. 생략하면 효과가 가장 큰 능력치로 추정 |

## 여파(consequence) 추가하기

`src/data/consequences.js`에 추가합니다. `type: 'echo'`는 자동 기록(효과는 `effects`로), `type: 'choice'`는 새 결정입니다. `build(s, seed)`는 **만기 시점의 상태**를 보고 결과를 계산하므로, 투자처럼 세계 상태에 따라 결과가 달라지게 만들 수 있습니다. 조건(`when`)이 만기 후 5년 동안 맞지 않으면 여파는 조용히 사라집니다.

## 테스트

`tests/world.test.js`의 "every storylet builds a valid event" 테스트가 모든 storylet을 실제 상태에서 만들어 보고, 선택지를 하나씩 적용한 뒤 저장 파일이 유효한지 확인합니다. 사건을 추가했다면 이 테스트가 통과하는지 꼭 확인하세요. `tests/fixtures/v1-save.json`은 이전 엔진으로 만든 실제 저장 파일로, 형식 변환 테스트에 씁니다.
