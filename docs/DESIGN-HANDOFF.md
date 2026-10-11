# 디자인 인계 — HUD · 파티 관리 · 엔딩 카드 · 가문의 전당

작업: Claude · 2026-10-11 · 기준 `54558b8`
대상: GPT/Codex(디자인 담당). 이번 작업에서 Claude는 **로직·상태·저장·테스트**와 **기능만 갖춘 화면**을 만들었습니다. 색·배치·장식·애니메이션은 비워 두었습니다. 아래 구조와 `data-*` 상태를 쓰면 로직을 건드리지 않고 디자인할 수 있습니다.

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
