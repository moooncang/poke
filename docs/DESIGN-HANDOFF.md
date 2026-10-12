# 디자인 인계 — HUD · 파티 관리 · 엔딩 카드 · 가문의 전당

작업: Claude · 2026-10-11 · 기준 `54558b8`
대상: GPT/Codex(디자인 담당). 이번 작업에서 Claude는 **로직·상태·저장·테스트**와 **기능만 갖춘 화면**을 만들었습니다. 색·배치·장식·애니메이션은 비워 두었습니다. 아래 구조와 `data-*` 상태를 쓰면 로직을 건드리지 않고 디자인할 수 있습니다.

## GPT 시작 체크리스트 (디자인만 하면 됩니다)

> 아이콘·화면 **향상 지침**(무엇을 어떻게 더 좋게 만들지)은 [DESIGN-BRIEF-icons-ui.md](DESIGN-BRIEF-icons-ui.md)에 따로 있습니다. 이 문서는 구조와 규칙입니다.

로직·저장·테스트는 끝난 상태입니다. 아래 순서로 진행하면 엔진 코드를 건드릴 일이 없습니다.

1. **현재 화면 보기.** 개발 서버를 켠 뒤 전체 화면 스크린샷을 만듭니다.
   ```sh
   npm run dev   # 다른 터미널에서
   SCREENSHOTS=1 CHROMIUM_PATH=<chromium 경로> npx playwright test screens
   ```
   `docs/screenshots/review/`에 데스크톱·모바일 각 11장이 생깁니다(git에는 올라가지 않음). 결정창, 게임 화면(HUD), 도감, 여행 기록, 시뮬레이션 리포트, 가문의 전당, 파티 관리, 새 삶, 엔딩 카드, 트레이너 카드, 다음 세대 화면입니다.
2. **디자인할 화면과 우선순위**(지금은 배치만 된 최소 스타일):
   1. 트레이너 HUD(모바일에서 특히 중요)
   2. 엔딩 카드·트레이너 카드
   3. 시뮬레이션 리포트 그래프
   4. 파티 관리
   5. 가문의 전당(기록실·가계도·카드 도감)
   6. 새 삶 옵션(가문 혜택·도전 규칙)
   7. 사건 기록의 "스스로 정한 일" 카드
   8. 콘테스트 리본표·프런티어 심볼
3. **어디를 고치나.**
   - 스타일은 `src/life.css` 끝에 추가합니다. 마크업이 부족하면 `src/ui/*.jsx`의 JSX를 고쳐도 됩니다.
   - 색은 기존 토큰(`--ui-bg`, `--ui-panel`, `--ui-raised`, `--ui-line`, `--ui-text`, `--ui-muted`, `--ui-mint`, `--ui-rose`)을 쓰고, 금색은 `#f1cf7c`를 씁니다. 새 토큰은 `:root`에 추가하세요.
4. **끝나면 확인.**
   - `npm test`(엔진, 약 3분): 디자인만 바꿨다면 그대로 통과해야 합니다.
   - `npm run test:browser`(화면 16개, 데스크톱·모바일): 아래 "바꾸면 안 되는 것"의 역할 이름·클래스를 바꿨다면 테스트도 같이 고쳐 주세요.
   - `PAGES_BASE_PATH=/poke/ npm run build`
5. **기록.** 바꾼 내용은 `docs/CHANGES-<주제>.md`에 남기고 README 협업 기록 목록에 한 줄을 추가하세요.

### 화면별 파일 지도

| 화면 | 파일 | 이 문서의 절 |
|---|---|---|
| 트레이너 HUD | `src/ui/Hud.jsx` | 1 |
| 파티 관리 | `src/ui/PartyManager.jsx` | 2 |
| 엔딩(생애 기록관) | `src/ui/Ending.jsx` + `src/ui/Legacy.jsx` | 3 |
| 가문의 전당 | `src/ui/Legacy.jsx` `LegacyHall` | 4, 8 |
| 출생·새 삶 | `src/ui/modals.jsx` (`BirthModal`, `NewLifeModal`, `NewLifeOptions`) | 5, 7 |
| 시뮬레이션 리포트 | `src/ui/Report.jsx` | 6 |
| 사건 카드("스스로 정한 일" 포함) | `src/ui/StoryCard.jsx` | 9 |
| 앱 골격·탭 | `src/App.jsx` (상태와 레이아웃만) | — |
| 사이드바(파트너·세계·리그) | `src/ui/LifeView.jsx` | — |

### 표시할 문자열과 숫자

- **화면에 쓰는 이름·설명은 모두 데이터에 있습니다:** `GOALS`, `PERKS`, `RULES`, `MEDALS`, `CARD_KINDS`, `CONTEST_CATEGORIES`, `FACILITIES`, `RECORDS` 등.
- **화면에서 따로 계산하지 마세요.** 문구를 바꾸려면 해당 데이터 파일에서 고칩니다.
- **본문 텍스트는 반드시 `formatText(text, life, entry)`를 거쳐 표시하세요.** 시뮬레이션 문장에는 `{poke:25|이|가}` 같은 토큰이 들어 있습니다.

## 디자인 작업 규칙

- 스타일은 `src/life.css` 끝에 추가합니다. 지금 들어간 규칙은 `/* ── Trainer HUD, party manager, ending cards, legacy hall (Claude) ── */` 블록에 모여 있으며 **배치용 최소 규칙**입니다. 자유롭게 지우거나 바꿔도 됩니다.
- **JSX 구조와 클래스 이름은 바꿔도 됩니다.** 단, 아래 "바꾸면 안 되는 것"은 지켜 주세요.
- 상태는 클래스보다 `data-*` 속성으로 노출했습니다. 예: `.ending-card[data-rarity="legendary"]`, `.medal[data-earned="true"]`. CSS 선택자로 바로 쓰면 됩니다.
- 브라우저 테스트(`tests/browser/life.spec.js`)가 쓰는 이름: 역할 `region "트레이너 요약"`, `dialog "파티 관리"`, 버튼 `파티 관리…`(aria-label), `.hud-stat`, `.pm-member`, `.ending-card`, `.trainer-card`, `.heir-option button`, `.heir-chosen`, `.heir-toggle`, `.legacy-life`, 탭 버튼 이름 `트레이너 카드`·`다음 세대`·`가문의 전당`. 이름을 바꾸면 테스트도 같이 고쳐 주세요.

### 바꾸면 안 되는 것

- 엔진 함수 호출(`setGoal`, `setPartyMode`, `togglePin`, `movePokemon`, `setLead`, `chooseHeir`, `recordLife`)과 그 인자.
- 저장 키: 생애 `pokelife.story.v1`, 가문 기록 `pokelife.legacy.v1`.
- 표시 숫자는 `sim/legacy.js`·`sim/party.js`에서 계산합니다. 화면에서 따로 계산하지 마세요(예: 별 개수는 `trainerCard(life).stars`).

## 1. 트레이너 HUD — `src/ui/Hud.jsx`

메인 열 맨 위, 모든 탭에서 보입니다. 커뮤니티 피드백: "모바일에서 스탯·돈이 안 보인다". 현재 `position: sticky; top: 0`.

```
section.hud[aria-label="트레이너 요약"]
├─ .hud-identity  > b.hud-name, span.hud-age          이름 · 나이 · 인생 단계
├─ .hud-money     > span, b(소지금), small.hud-ledger.up|.down   작년 순수입(+/−)
├─ ul.hud-stats   > li.hud-stat[data-stat][data-level]  × 5
│                     > span(라벨) b(값) meter
├─ .hud-league    > .hud-badges, .hud-titles[data-count], .hud-reputation
├─ label.hud-goal > select                               삶의 목표 변경
└─ button.hud-party                                      파티 관리 열기
     ├─ .hud-party-slots > .hud-slot[data-lead][data-pinned][data-locked] × 6 (빈 칸은 .hud-slot.empty)
     │                     > img, small(레벨), 아이콘(자물쇠=전설, 핀=고정)
     └─ .hud-party-label                                  "자동 편성 · 박스 N"
```

- `data-stat`: `vitality | joy | courage | wisdom | bond`(건강·행복·용기·지식·유대).
- `data-level`: `low`(<35) · `mid` · `high`(>65).
- `.hud-titles[data-count]`: 챔피언 타이틀 수. 0이 아니면 강조하면 좋습니다.
- 제안: 모바일에서는 2줄 압축 바(이름/돈 + 스탯 5칸), 스크롤 시 축소 등.

## 2. 파티 관리 — `src/ui/PartyManager.jsx`

HUD의 파티 버튼으로 엽니다. 커뮤니티 피드백: "AI가 아끼는 포켓몬을 박스에 넣고 키우지 않는다".

```
Modal.party-manager (dialog "파티 관리")
├─ fieldset.pm-mode > label[data-active] × 2 (radio: auto | manual)
├─ p.pm-rule
├─ section.pm-party
│   ├─ p.pm-swap-hint (박스에서 교체할 포켓몬을 고른 동안만)
│   └─ ol > li.pm-member[data-lead][data-pinned][data-locked]
│         ├─ .pm-info > img, b(이름), small(Lv), small.pm-meta(출신·친밀도·함께한 해)
│         ├─ .pm-tags > em.pm-tag.lead | .locked | .pinned
│         └─ .pm-actions > button(선두로 | 고정/고정 해제[aria-pressed] | 박스로 | 교체)
└─ section.pm-box > ul > li.pm-member.boxed[data-selected] > .pm-info, .pm-actions > button(파티로 | 파티와 교체)
```

동작(로직은 `sim/party.js`):

| 행동 | 규칙 |
|---|---|
| 자동 편성(`auto`) | 캐릭터가 성향대로 매년 다시 짬. **고정(pin)한 포켓몬은 절대 빼지 않음** |
| 직접 편성(`manual`) | 연간 재편성 없음. 새 포켓몬은 PC 박스로. 전설은 예외로 파티에 들어오고, 고정하지 않은 포켓몬 중 하나가 박스로 감 |
| 박스 → 파티 | 자리가 있으면 바로, 6마리면 교체 대상을 고름. 데려온 포켓몬은 자동으로 고정됨 |
| 파티 → 박스 | 전설과 마지막 1마리는 불가 |
| 선두로 | 파티 맨 앞. 상성이 크게 불리하지 않으면 선두가 먼저 나가 배틀 경험치를 받음 |
| 박스 육성 | 박스 포켓몬도 연간 경험치의 25% |

## 3. 엔딩(생애 기록관) — `src/ui/Ending.jsx` + `src/ui/Legacy.jsx`

탭 순서: **엔딩 카드 · 트레이너 카드 · 생애 연표 · 동료 앨범 · 업적·발자취 · 다음 세대**. 첫 화면은 엔딩 카드입니다.

### 엔딩 카드 `EndingCards`

```
ul.ending-cards > li.ending-card[data-kind][data-rarity]
   ├─ span.ending-card-rarity     일반 | 레어 | 에픽 | 레전드
   ├─ img.ending-card-art         (포켓몬 카드만)
   ├─ span.ending-card-party > img × n   (hall 카드만)
   ├─ h4, p
```

- `data-rarity`: `common | rare | epic | legendary`
- `data-kind`: `hall`(마지막 파티) · `partner` · `champion` · `legend` · `shiny` · `badges` · `dex` · `rival` · `friend` · `family` · `career` · `talent` · `travel` · `heritage` · `epitaph`(마지막 한 줄 칭호, 항상 마지막)
- 제안: 포켓몬 카드처럼 세로 카드, 레어도별 테두리/광택, 하나씩 넘겨 보는 연출, 레전드 카드 반짝임.

### 트레이너 카드 `TrainerCardView`

```
article.trainer-card[data-color][data-stars] (.compact = 가문의 전당용 작은 카드)
├─ header > .trainer-card-label, .trainer-card-stars > svg[data-earned] × 5
├─ h3(이름 + n대째), p.trainer-card-epithet(칭호)
├─ dl(나이·배지·챔피언·도감·배틀 승리·명성)
└─ ul.trainer-card-star-list > li[data-earned] × 5   (큰 카드만)
```

- `data-color`는 별 개수 0–5에 따라 `basic → green → blue → red → silver → gold`(본가 트레이너 카드 색 단계).
- 별 5개: 리그 정상 · 도감 200종 · 전설의 동행 · 배지 24개 · 배틀 100승.

### 메달 `MedalCase`

```
.medal-case > section.medal-group[data-group] > h4, ul > li.medal[data-earned][data-collected]
   > svg, b(이름), small(설명), small.medal-record(가문 기록: 처음 얻은 사람·횟수)
```

- 그룹: `partner` · `collection` · `battle` · `life` · `world` · `legacy`. 메달 35종.
- `data-earned`: 이번 삶에서 얻음. `data-collected`: 지난 삶 포함 한 번이라도 얻음.

### 지방별 도감 `DexProgress`

`.dex-progress > p.dex-progress-total, ul > li[data-region][data-percent][data-complete] > span, progress, small`

### 다음 세대 `HeirPicker`

```
.heir-picker > p, ul > li.heir-option[data-selected] > button[aria-pressed] > svg(알), img, b, small
p.heir-chosen (선택 후)
```

- 알은 진화 계열당 하나, 친밀도 순, 최대 6개. 전설은 제외.
- 고른 알은 다음 "새로운 삶"에서 6세 첫 파트너로 부화합니다. 색이 다른 부모의 알은 색이 다릅니다. 소지금의 20%(최대 3,000P)가 유산으로 전해집니다.
- 제안: 알 흔들림·부화 연출, 가계도 줄(선대 → 현재).

## 4. 가문의 전당 탭 — `LegacyHall`

주 메뉴 5번째 탭(`가문의 전당`). 이 브라우저에서 끝낸 삶이 쌓입니다(최대 60개).

```
section.legacy-hall
├─ ul.legacy-totals > li × 9 > b, span        끝낸 삶·햇수·최대 세대·리그 타이틀·누적 관측·누적 동료 종·색이 다른 종·메달·카드 종류
├─ p.legacy-heir                               다음 세대 알이 대기 중일 때
├─ ol.legacy-lives > li.legacy-life[data-generation]
│     ├─ TrainerCardView (compact)
│     └─ .legacy-life-detail > p, p.legacy-partner > img, span.legacy-party > img × n, small
├─ DexProgress (누적)
└─ MedalCase (현재 삶 + 가문 기록)
```

## 5. 출생·새 삶 화면

- `BirthModal`: `dt 물려받은 알 / dd.birth-heritage`(상속 시), `dt 삶의 목표 / dd > select + small.goal-detail`.
- `NewLifeModal`: `label > select(삶의 목표) + small.goal-detail`, `label.heir-toggle > input[type=checkbox] + span > b, small`(대기 중인 알이 있을 때).

## 데이터 출처 요약

| 화면 | 함수 |
|---|---|
| HUD | `badgeCount`, `championships`(sim/battle.js), `GOALS`, `partyPlan` |
| 엔딩 카드 | `endingCards(life)` |
| 트레이너 카드 | `trainerCard(life)` / 지난 삶은 `legacy.lives[i].card` |
| 메달 | `medalsOf(life)`, `MEDALS`, `MEDAL_GROUPS`, `legacy.medals` |
| 도감 진행 | `dexProgress(ids)`, `legacy.dex.seen` |
| 다음 세대 | `heirCandidates(life)`, `chooseHeir(legacy, life, uid)` |
| 전당 합계 | `legacyTotals(legacy)` |

---

# 2부 — 시뮬레이션 리포트 · 새 삶 옵션 · 전당 확장 · 스스로 정한 일

작업: Claude · 기준 `57eb8f4`. 규칙은 1부와 같습니다(구조·클래스는 바꿔도 되고, 엔진 함수 호출과 저장 키는 유지). 이 부분의 최소 스타일은 `life.css` 끝 `/* ── Simulation report, new-life options, records room (Claude) … */` 블록에 있습니다.

## 6. 시뮬레이션 리포트 탭 — `src/ui/Report.jsx`

주 메뉴 `시뮬레이션 리포트`. 섹션은 모두 `section.report-section`.

```
section.simulation-report
├─ 생애 그래프
│   ├─ .report-charts > figure.report-chart[data-lines] × 6
│   │     figcaption, svg > line.axis, g.tick, text.max-label, polyline.series[data-series][data-index]
│   │     ul.chart-legend > li[data-series][data-index] > b(마지막 값)
│   ├─ ul.report-highlights > li > span, b                      가장 부유/가난/행복/힘든 해 …
│   └─ details.report-table > .table-scroll > table              연도별 기록(모든 HISTORY_KEYS)
├─ 결정과 판정
│   ├─ ul.report-numbers > li > b, span   × 7                   선택 사건·스스로 정한 일·전체 기록·여파…
│   ├─ p.report-luck × 0~2
│   └─ .report-columns > ul.report-bars > li[data-id] > span, span.bar(style --share 0~1) > i, b
├─ 머문 곳: ul.report-bars + p.report-note
├─ 동료 이야기
│   ├─ .member-picker[role=tablist] > button[role=tab][aria-selected][data-in-party] > img, span, small
│   └─ article.member-story[data-in-party][data-shiny] > header, dl, form.member-rename, details > ul.member-mentions
├─ 리본과 배틀 시설
│   ├─ table.ribbon-grid > td[data-earned]
│   ├─ ul.symbol-list > li[data-tier="none|silver|gold"]
│   └─ ul.facility-list > li[data-tier="0..3"]
├─ (있을 때) ul.rule-list > li[data-kind="rule|perk"]
└─ 세계와 사람들의 연대기
    ├─ label.chronicle-filter > select
    └─ ol.chronicle > li[data-kind="news|people|echo|party"] > span.chronicle-age, b, p
```

- 그래프 색은 `polyline.series[data-index]`(0~4)와 `chart-legend li[data-index]`를 맞춰 칠하세요. 지금은 민트·로즈·골드·블루·퍼플입니다.
- `.report-bars .bar`의 `--share`는 그 목록 최대값 대비 비율입니다.
- 제안: 그래프에 마우스오버 툴팁, 하이라이트 카드에 아이콘, 연대기를 세로 타임라인으로.

## 7. 새 삶 옵션 — `NewLifeOptions` (`src/ui/modals.jsx`)

```
fieldset.perk-picker > legend(n/3), ul > li[data-unlocked][data-selected] > label > input[type=checkbox], span > b, small
  label.perk-detail > select (출생지 선택권: 마을 / 파트너 선택권: 첫 파트너)
fieldset.rule-picker > legend, ul > li[data-selected] > label > input, span > b, small
```

잠긴 혜택은 `data-unlocked="false"`, 설명 자리에 해금 조건이 나옵니다.

## 8. 가문의 전당 추가 블록 — `LegacyHall`

```
ul.legacy-records > li[data-record][data-set] > span(부문), b(값+단위), small(보유자·세대)
ol.legacy-lineages > li > ol.lineage > li[data-generation] > img, b, small     (화살표는 CSS ::before)
ul.perk-status > li[data-unlocked] > b, small, small.perk-unlock
ul.card-catalog > li[data-kind][data-collected] > b, small
```

- 트레이너 카드 `dl`에 리본·심볼 줄이 추가됐습니다.
- 지난 삶 카드에는 도전 규칙이 표시됩니다.

## 9. 스스로 정한 일 (사건 기록)

`StoryCard`의 `article.story-row.kind-auto`는 캐릭터가 혼자 결정한 사건입니다. 아이콘은 Feather, 라벨은 "스스로 정한 일"이고, `.choice-result`가 바로 붙어 나옵니다. 플레이어 결정(`kind-choice`)과 시각적으로 구분해 주세요(예: 더 작게, 옅게, 접힌 형태).

## 10. 엔딩 카드 종류 추가

`data-kind`: `ribbons` · `frontier` · `named` · `ace` · `graph` · `rules`. 전체 목록과 이름은 `CARD_KINDS`(`src/sim/achievements.js`).

---

# 3부 — 인물 카드 · 상태 배지 · 저장 슬롯 · 그늘의 길

작업: Claude · 기준 `a5e8f26`(Codex 콘솔 디자인 반영). 규칙은 1·2부와 같습니다. 이 부분의 최소 스타일은 `life.css` 끝 `/* ── Character card, standing badges, save slots (Claude) … */` 블록입니다.

## 11. 인물 카드 — `src/ui/CharacterCard.jsx`

왼쪽 사이드바 맨 위, 기존 TRAINER LICENSE 패널 위에 놓입니다(라이선스 패널은 출생 환경·성향·육성·소지금만 남김). "지금 나는 누구이고 어디서 무엇을 하는가"를 한눈에.

```
section.character-card[data-mood="normal|debt|outlaw|wanted|prison"][data-career="traveler|…|syndicate|none"]
├─ header.cc-head > img.cc-portrait, .cc-identity > span.cc-epithet(칭호), h2.cc-name, span.cc-age
├─ ul.cc-conditions > li.cc-condition         복역 중·수배 중·조직 직함·빚 (있을 때만)
└─ dl.cc-facts
     dt 하는 일 / dd.cc-job > b(직함) · 직업명 · n년차 · 만족
     dt 사는 곳 / dd.cc-place (· n년째, small 고향)
     dt 세상의 평가 / dd.cc-standing > span.cc-reputation[data-value], span.cc-infamy[data-value]
     dt 배지 · 타이틀 / dt 가족 / dt 삶의 목표 / dt 가족 형편
```

- 직함은 `careerTitle(life)`(직업별 등급명: 신인 트레이너→거장, 말단 조직원→두목 등, `CAREER_RANKS` in `data/world.js`).
- 칭호는 `epithet(life)`(그늘의 길이면 "수배 중인 무법자", "〈조직〉의 두목" 등).
- `data-mood`로 카드 분위기를 바꾸세요(빚=금색, 조직·수배=로즈, 복역=회색이 지금의 최소 표현).

## 12. HUD 추가분 — `src/ui/Hud.jsx`

- `small.hud-delta[data-sign="up|down"]`: 마지막 플레이어 결정 이후 변한 값(능력치·소지금·명성·악명). 결정 직후 잠깐 강조하는 연출을 권합니다.
- `small.hud-debt`, `span.hud-infamy[data-value]`: 빚과 악명(0이면 표시 안 함).
- `div.hud-status > span.hud-badge[data-kind="prison|wanted|debt|outlaw"]`, `button.hud-skip`("다음 선택까지", 단축키 F).

## 13. 설정 — 저장 슬롯과 단축키 (`SettingsModal`)

```
.settings-slots > ul.slot-list > li.slot[data-filled][data-current] > span.slot-label, span.slot-detail, span.slot-actions > button × 2
.settings-keys > p > kbd × 4
```
"요약 복사" 버튼(`onShare`)은 설정과 엔딩 footer에 있습니다. 복사 실패 시 텍스트 파일을 내려받습니다.

## 14. 사건 기록의 새 종류

`article.story-row.kind-milestone`에 체포·출소·파산이 들어옵니다(제목 '체포'/'출소'/'파산'). `.story-row.kind-party`에는 '떠난 동료'가 추가됩니다. 분류 라벨: 불운(`misfortune`), 그늘의 길(`dark`), 감옥(`prison`)은 리포트의 사건 종류 표에 나옵니다.

## 15-1. 난이도

`NewLifeModal`의 `fieldset.difficulty-picker[data-difficulty] > .difficulty-options[role=radiogroup] > label[data-difficulty][data-selected] > input[type=radio], b` + `small.goal-detail`. 출생 화면 `dd.birth-difficulty[data-difficulty]`, 인물 카드 `span.cc-difficulty[data-difficulty]`, 전당 `span.legacy-difficulty[data-difficulty]`. 값은 `easy|normal|hard|legend`. 수치 표는 [CHANGES-difficulty.md](CHANGES-difficulty.md).

## 15. 엔딩 카드 종류 추가

`data-kind`: `shadow`(그늘의 길) · `hardship`(잃은 것들). 메달 그룹 `dark`(그늘의 길) 9종.
