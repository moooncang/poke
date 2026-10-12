# AGENTS.md — Pokélife 작업 안내

이 저장소는 여러 AI 에이전트(Claude, GPT 등)와 사람이 함께 작업합니다. 코드를 고치기 전에 이 문서를 읽어 주세요.
최근 구조 변경 내역은 [docs/CHANGES-v2.md](docs/CHANGES-v2.md)에 있습니다. 삶의 목표·파티 직접 관리·전 지방 리그·다회차 기록은 [docs/CHANGES-legacy-league.md](docs/CHANGES-legacy-league.md), 시뮬레이션 리포트·콘테스트·배틀 시설·가문 혜택·도전 규칙·이벤트 팩 6개·스스로 정한 일은 [docs/CHANGES-depth.md](docs/CHANGES-depth.md), 그 화면들의 디자인 인계는 [docs/DESIGN-HANDOFF.md](docs/DESIGN-HANDOFF.md)에 있습니다.

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
| `src/engine.js` | 공개 API: `createLife({ goal, heritage, perks, rules, starter })`, `advance`, `choose`, `autoChoice`, `acknowledge`, `toggleMemory`, `parseSave`, `setGoal`, `setPartyMode`, `togglePin`, `movePokemon`, `setLead`, `renamePokemon`. 연간 진행(`advanceYear`), 선택 해결(`resolveChoice`), 스스로 정한 일(`AUTO_SHARE`) |
| `src/sim/history.js` · `analytics.js` | 연간 기록(`s.history`)과 리포트용 분석(결정·판정·배틀·연대기·동료 이야기). analytics는 읽기 전용 |
| `src/sim/contest.js` · `src/data/contests.js` | 콘테스트 5부문 × 4랭크, 리본(`ribbon-<부문>-<랭크>` 플래그와 개체 `ribbons`) |
| `src/data/frontier.js` | 호연 배틀프런티어 7시설(심볼)과 지방 배틀 시설 8곳(연승 단계). 배틀 종류 `facility` |
| `src/sim/perks.js` · `src/sim/achievements.js` | 가문 혜택·도전 규칙 / 메달·트레이너 카드·엔딩 카드·지방 도감 |
| `src/sim/standing.js` | 사회적 위치: 명성·악명 등급, 직업 등급명(`careerTitle`), 빚·이자·파산, 수배·체포·복역, 조직(`syndicate`) 직업. 연간 처리 `tickStanding` |
| `src/data/misfortune.js` · `villain-route.js` | 불운 팩, 어두운 길 팩(유혹·조직 생활·탈출·감옥·악명의 그림자) |
| `src/data/town-stories.js` · `type-companions.js` · `villain-arcs.js` · `hobbies.js` · `life-chapters.js` · `vignettes-extra.js` | 이벤트 팩: 마을 120, 타입·종 67, 악당 조직 45, 취미·축제 75, 삶의 장 75, 일상 220. 검증은 `node scripts/check-pack.mjs <파일> <EXPORT> [vignettes]` |
| `src/sim/goals.js` | 삶의 목표(`GOALS`, 8종)와 사건 분류 가중치·자동 결정·육성 보정. 조직 가입·악명 선택은 `outlaw` 목표가 아니면 자동 결정이 거의 고르지 않음 |
| `src/sim/legacy.js` | 다회차 기록(`pokelife.legacy.v1`): 엔딩 카드, 메달, 트레이너 카드, 누적 도감, 다음 세대 알(`heritageFor`). 모두 순수 함수 |
| `src/sim/talent.js` · `src/data/talent-events.js` | 5단계 재능·20개 사건·판정 보정. 저장 v3. [규칙](docs/CHANGES-talents.md) |
| `src/sim/random.js` | 결정적 난수(`random`, `pick`, `chance`, `between`, `weighted`) |
| `src/sim/world.js` | 지방별 경기·치안·생태, 지방 상황(`CONDITIONS`), `tickWorld` |
| `src/sim/people.js` | 소꿉친구·라이벌·형제·가족(`cast`)의 삶, `tickPeople` |
| `src/sim/party.js` | 파티·PC 박스·자동 재편성·진화. 성향(`DISPOSITIONS`). 플레이어 관리(`partyPlan`: 고정·직접 편성·이동·선두) |
| `src/sim/battle.js` | 자동 배틀 `autoBattle`, 장비 규칙, 타입 상성 |
| `src/sim/consequences.js` | 선택의 지연 결과(seed) 심기·해소 |
| `src/sim/director.js` | 매년의 주 사건 선택. 모든 사건 풀을 storylet으로 모음 |
| `src/sim/save.js` | 저장 검증과 이전 형식 변환(`SAVE_VERSION`) |
| `src/sim/text.js` | 한국어 조사 `josa`, 포켓몬 이름 토큰 `poke` |
| `src/data/storylets.js` | 상태 조건으로 열리는 사건(인물·지방 상황·기회) |
| `src/data/more-life.js` · `more-work.js` · `more-places.js` | 표 형식으로 쓴 사건 184개(인생 단계·성향·가족·포켓몬·직업·마을 환경·지방 문화·지방 상황) |
| `src/data/career-sagas.js` · `league-sagas.js` | 직업 32개 프로젝트(96단계 사건), 지방별 리그·챔피언 경로(90개)와 다른 지방 원정. 리그 레벨은 딴 타이틀 수로 오름(`leagueLevels`). [작업 기록](docs/CHANGES-career-sagas.md), [리그 단계화](docs/CHANGES-legacy-league.md) |
| `src/data/legacy-events.js` | 알을 물려받은 삶에만 열리는 가문 사건 3개 |
| `src/data/adventure-projects.js` · `adventure-sagas.js` · `breeding-events.js` | 108개 모험 장면, 교배와 알 돌봄. [추가 규칙](docs/CHANGES-breeding-adventures.md). 교배 데이터는 `scripts/build_breeding_rules.mjs`로 생성 |
| `src/data/event-kit.js` | 표 형식 사건 작성 도구(`table`, `check`, `later`, `fill`) |
| `src/data/vignettes.js` | 결정 사이에 나오는 일상 기록(계절·환경·나이·가족·파티 조건) |
| `src/data/consequences.js` | 선택의 여파 정의 |
| `src/data/milestones.js` | 나이 고정 사건(7·12·18·22세 학습, 16세 진로) |
| `src/data/progression.js` | 경력 평가(`careerReview`)와 연간 파티 경험치(`annualTraining`) |
| `src/data/life-events.js` | 출생 배경, 동네 사건 32종, 야생·체육관·레이드·장비 사건 |
| `src/data/challenges.js` · `quests.js` · `regional-stories.js` · `relationships.js` | 판정 사건 60종, 장기 경로 32종, 지방 사건 27종, 관계 18단계 |
| `src/data/species-rules.js` | **생성 파일.** `node scripts/build_species_rules.mjs`로 다시 만듭니다. 직접 수정하지 마세요 |
| `src/ui/` | 화면 구성 요소. `App.jsx`는 상태와 레이아웃만 담당 |

CSS는 `src/main.jsx`에서 `styles.css` → `game.css` → `life.css` 순서로 불러오며, 뒤의 파일이 이깁니다. 이 순서를 바꾸거나 다른 파일에서 CSS를 다시 import하지 마세요. 새 스타일은 `life.css` 끝에 추가하고, 예전 밝은 테마 규칙에 `!important`를 새로 붙이지 마세요.

## 꼭 지켜야 할 규칙

1. **결정성.** 시뮬레이션 코드(`src/sim`, `src/data`, `src/engine.js`)에서 `Math.random`, `Date`를 쓰지 마세요. 모든 무작위는 `state.rng`를 쓰는 `random.js` 함수로만 뽑습니다. 같은 시드와 같은 선택이면 같은 삶이 나와야 하고, 저장 후 다시 불러와도 결과가 바뀌면 안 됩니다.
2. **불변 입력.** `advance`, `choose` 등은 입력을 바꾸지 않고 `structuredClone`한 새 상태를 돌려줍니다. 할 수 없는 행동이면 입력 객체를 그대로 돌려줍니다.
3. **`advance` 한 번 = 기록 한 줄.** 선택 사건은 직전 선택 이후 자동 기록이 4~7개 쌓인 뒤에 뜹니다(`scheduledEvent`로 미뤄 둠). 그 사이에는 큐(`state.queue`)의 소식·인연·파티·여파 기록, 일상 기록이 채워집니다.
4. **상태는 순수 JSON.** 사건과 선택지는 저장 파일에 그대로 들어갑니다. 함수나 클래스를 넣지 마세요.
5. **포켓몬 추가는 `addPokemon`으로만.** 파티가 6마리를 넘으면 자동 재편성이 일어나고, 전설의 포켓몬(`locked`)은 언제나 파티에 남습니다. `s.party.push`를 직접 쓰지 마세요. 플레이어가 고정한 포켓몬(`partyPlan.pinned`)은 자동 재편성이 빼지 않고, 직접 편성 모드에서는 재편성 자체가 일어나지 않습니다. 파티를 옮기는 코드를 새로 쓰면 고정 목록에서 빠진 uid를 지워 주세요(`validState`가 없는 uid를 거부합니다).
6. **새 상태 필드를 추가하면** `src/sim/save.js`의 `validState`에 검증을 추가하세요. 기존 저장에 없는 필드라면 `SAVE_VERSION`을 올리고 변환 함수(`migrateV1` 참고)를 추가해야 합니다. 그러지 않으면 기존 사용자의 저장 파일이 거부됩니다.
7. **새 선택지 필드를 추가하면** `save.js`의 `validActions`도 함께 고치세요.
8. **한국어 문장.** 이름 뒤 조사는 `josa(이름, '이', '가')`를 쓰고, 포켓몬 이름은 `poke(id, '을', '를')` 토큰으로 넣습니다(UI가 실제 이름으로 바꿉니다). 본문에는 `{town}`, `{partner}` 토큰도 쓸 수 있습니다.

## 사건(storylet) 추가하기

간단한 사건은 `event-kit.js`의 `table`로 한 줄씩 쓰는 편이 쉽습니다. `more-*.js` 파일의 기존 행을 참고하세요.

```js
table('stage', [
  ['my-event', 20, 60, '제목', '{friend|이|가} 찾아왔다.', [
    ['선택지', 'caring', { bond: 3, money: -100 }, '결과 문장', { follow: [later('friend-repay', [2, 5])] }],
    ['판정 선택지', 'bold', { courage: 4 }, '성공 문장', check('courage', 10, '실패 문장', { joy: -2 })],
    ['무료 선택지', 'easygoing', { joy: 1 }, '결과 문장'],
  ], { when: s => s.money > 500 }],
]);
```

- 선택지 설명은 효과에서 자동으로 만들어집니다. 판정 없이 돈이 드는 선택지에는 `cost`가 자동으로 붙습니다.
- **사건마다 돈이 들지 않는 선택지를 하나 이상 두세요.** `tests/events.test.js`가 확인합니다. 엔진도 고를 수 있는 선택지가 없으면 "지금은 형편이 안 된다"를 덧붙이지만, 이건 안전장치일 뿐입니다.
- 문장에는 `{friend}`, `{rival}`, `{sibling}`, `{spouse}`, `{region}`, `{villain}`, `{partner}`, `{town}`을 쓸 수 있습니다. 조사가 붙으면 `{friend|이|가}`처럼 씁니다.

직접 객체로 쓰는 방식:

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
| `effects` | `joy·vitality·courage·wisdom·bond·money·reputation·infamy·debt` 증감. 능력치·명성은 70 이상에서 절반, 85 이상에서 3분의 1만 오릅니다(`diminished`). 손실은 그대로 |
| `loan`, `prison`, `losePokemon` | 대출(빚으로 남음, 총 5,000P 한도) · 징역(1~8년, 복역 중엔 `prison` 분류 사건만) · 동료 상실(`'random'·'box'·'party'`, 파트너·전설 제외) |
| `challenge.talent` | 재능 적용 분야 battle/research/care/craft. 생략하면 재능 보정 없음. 스탯 판정의 5–95% 상한 유지 |
| `cost` | 이 금액이 없으면 고를 수 없음. 판정 없는 선택지는 `effects.money`에 `-cost`를 직접 넣어야 하고, 판정 선택지는 성공·실패와 관계없이 자동으로 지불 |
| `challenge` | `{ stat, difficulty, failure: { outcome, effects, ...다른 필드 } }`. 성공률 `25 + 스탯×0.7 − 난이도 + 해당 분야 재능·숙련 보정`, 5~95% |
| `world` | 현재 지방의 `economy·safety·ecology` 증감 |
| `cast` | `{ friend: { affinity: 10, path: 'worker' } }`처럼 인물 상태 변경 |
| `follow` | `[{ id, delay: [최소, 최대], p, data }]` 몇 년 뒤의 여파. `id`는 `src/data/consequences.js`의 키 |
| `battle` | `{ kind: 'wild'·'gym'·'raid'·'rival'·'villain'·'league'·'facility', opponent?, opponents?, level?, levels?, flags?, capture? }` 자동 배틀 |
| `contest` | `{ category: 'cool'·'beauty'·'cute'·'clever'·'tough', rank: 0~3 }` 콘테스트 출전(가장 잘 맞는 파티 포켓몬) |
| `after` | `{ win: {...}, lose: {...} }` 배틀 결과별 추가 효과 |
| `join`, `joinOrigin`, `joinLevel`, `joinNickname` | 포켓몬 합류(`egg·gift·rescued·adopted·starter·legend·stolen`), 선택적으로 레벨(5~100)·별명 |
| `career`, `education`, `work` | 진로·학습 방식·직업 상태(`satisfaction`, `cut`, `retired`). `career: 'syndicate'`는 조직 가입(경력 평가에는 나오지 않는 숨은 직업, `flags['syndicate-region']` 기록) |
| `promotion`, `leaveCareer` | 경력 등급 +1(최대 5, 등급당 수입 +15%), 직업 내려놓기 |
| `captureJoin` | 판정 포획 성공 시 해당 종 합류(경험치는 파트너의 65%) |
| `destination`, `move`, `home` | 이주(`move: 'region'`은 같은 지방 안) |
| `flag`, `unflag` | 이후 사건 조건용 플래그 |
| `observe`, `training`, `equipment`, `relationship` | 도감 등록, 파티 경험치, 장비 해금, 관계 사건 |
| `affection` | 파티 전체의 친밀도 증감 |
| `tone` | 이 선택이 쌓는 성향. 생략하면 효과가 가장 큰 능력치로 추정 |

## 여파(consequence) 추가하기

`src/data/consequences.js`에 추가합니다. `type: 'echo'`는 자동 기록(효과는 `effects`로), `type: 'choice'`는 새 결정입니다. `build(s, seed)`는 **만기 시점의 상태**를 보고 결과를 계산하므로, 투자처럼 세계 상태에 따라 결과가 달라지게 만들 수 있습니다. 조건(`when`)이 만기 후 5년 동안 맞지 않으면 여파는 조용히 사라집니다.

## 테스트

`tests/world.test.js`의 "every storylet builds a valid event" 테스트가 모든 storylet을 실제 상태에서 만들어 보고, 선택지를 하나씩 적용한 뒤 저장 파일이 유효한지 확인합니다. 사건을 추가했다면 이 테스트가 통과하는지 꼭 확인하세요. `tests/fixtures/v1-save.json`은 이전 엔진으로 만든 실제 저장 파일로, 형식 변환 테스트에 씁니다.

연전의 `battle.opponents`는 league·gym·facility 전용 종 ID 1–12개, `battle.level`은 1–100 정수입니다. `battle.levels`(상대별 레벨)와 `battle.flags`(상대별 승리 시 세울 플래그 또는 null)는 opponents와 길이가 같아야 합니다. 전체 연전을 이겨야 `after.win`이 적용되고, 리그 상금은 마지막 승리에서만, 체육관은 승리마다 지급됩니다. 체육관 연전은 그 지방 배지 8개가 되면 멈춥니다. 필드 검증은 `save.js`에 함께 있습니다.

**스스로 정한 일.** 결정 사이 자동 기록의 30%는 캐릭터가 혼자 해결하는 사건(`entry.auto`, `kind: 'auto'`)입니다. `director.js`의 `AUTO_CATEGORIES`에 속한 긴급하지 않은 사건만 쓰입니다. 선택 간격은 플레이어 결정(`choices && !auto`)만 셉니다. 테스트나 코드에서 "결정"을 찾을 때는 `e.choices && !e.auto`를 쓰세요. 관계·투자처럼 플레이어가 꼭 골라야 하는 사건은 `cast`·`world` 등 자동 대상이 아닌 분류에 두세요.

**팩의 지연 결과.** `consequences.js`를 고치지 않고 `echoLater(delay, title, body, effects, p)` / `choiceLater(delay, title, body, rows, p)`(event-kit)로 몇 년 뒤의 기록·결정을 사건 안에 쓸 수 있습니다. 문장은 만기 때 `fill`됩니다.

**사회적 위치.** `s.infamy`(악명, 조직 밖에서 매년 −1, 60 이상이면 수배·연 `infamy/400` 확률로 체포), `s.debt`(생활비 부족분이 쌓임, 이자 8%, 여유 돈의 30%로 자동 상환, 8,000P에서 파산: 돈 0·박스 절반 상실·명성 −15), `s.prison`(남은 형기). 체포·출소·파산은 그 해의 주 기록(milestone)입니다. 분류 `misfortune`(돈·빚·건강·치안이 나쁠수록), `dark`(조직원 ×3.5, 악명 비례), `prison`(복역 중에만). 행복의 기준값은 빚·빈 지갑·복역·건강에 따라 내려갑니다(`yearlyDrift`). 경력 등급은 `promotion-review`(일하는 중 4년마다)로도 오릅니다.

**인물 수치.** `cast` 변경에서 `affinity`·`power`·`health`는 증감이고 나머지 키는 값 덮어쓰기입니다.

다회차 기록(`pokelife.legacy.v1`)은 삶의 저장과 분리돼 있고 UI(`App.jsx`)만 읽고 씁니다. 시뮬레이션 코드에서 가문 기록을 읽지 마세요. 다음 삶에 넘어가는 것은 `createLife({ heritage })` 하나뿐입니다.
