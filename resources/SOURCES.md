# 공개 자료 조사·출처 기록

이번 수집은 원본 저장소를 커밋 단위로 고정했다. 최신 상태를 계속 따라가는 다운로드가 아니다. GitHub 저장소 검색으로 지도·스프라이트 후보를 조사하고, 아래 원본의 README·데이터·라이선스를 직접 확인했다. 검색 결과만으로 이용 권한을 판단하지 않았다.

| 출처 | 사용 자료 | 고정 커밋 |
| --- | --- | --- |
| [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi) | 다국어 이름·도감, 진화, 지방, 장소, 출현, 아이템 등 CSV | `c80757193bd0889054e36f4209762360bdaa4b95` |
| [PokeAPI/sprites](https://github.com/PokeAPI/sprites) | 포켓몬 기본·이로치·뒷모습·공식 일러스트, 아이템 | `961f4fcc85b159f9c5fff356356dee1bf9069898` |
| [pret/pokefirered](https://github.com/pret/pokefirered) | 관동·일곱섬 지도, 연결 정보, NPC·트레이너 | `037335f4c725d7c9aecdac87066f2002b4bd7e14` |
| [pret/pokeemerald](https://github.com/pret/pokeemerald) | 호연 지도, 연결 정보, NPC·트레이너 | `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881` |

## 라이선스 구분

**PokéAPI**: [LICENSE.md](https://github.com/PokeAPI/pokeapi/blob/c80757193bd0889054e36f4209762360bdaa4b95/LICENSE.md)는 BSD 3-Clause 조건을 제시하고 포켓몬 및 캐릭터 명칭의 Nintendo 상표를 명시한다. 원문을 `raw/pokeapi/LICENSE.md`에 보존했다. 이 저장소의 라이선스가 원작 문구·캐릭터에 대한 모든 권리를 제공한다고 해석하지 않는다.

**Sprites**: [LICENCE.txt](https://github.com/PokeAPI/sprites/blob/961f4fcc85b159f9c5fff356356dee1bf9069898/LICENCE.txt)의 첫 문장은 `All image contents within are Copyright The Pokémon Company.`이며 이어 저장소에 CC0 1.0 Universal을 표시한다. 두 문장을 모두 유지했다. CC0 표시만 따로 떼어 포켓몬 이미지가 퍼블릭 도메인이라고 안내하지 않는다.

또한 [CONTRIBUTING_SPRITES.md](https://github.com/PokeAPI/sprites/blob/961f4fcc85b159f9c5fff356356dee1bf9069898/CONTRIBUTING_SPRITES.md)는 650번 이후의 5세대풍 도트에 Smogon 커뮤니티 제작 자료를 사용한다고 설명한다. 따라서 기본 도트 전체를 공식 원작 스프라이트라고 부르지 않는다. `artwork/`는 원본의 `other/official-artwork` 경로에서 가져온 별도 유형이다. 개별 커뮤니티 제작자 크레딧은 이 수집본만으로 모두 확인되지 않았다.

**pret**: 두 README는 각각 원작 FireRed/LeafGreen, Emerald의 디컴파일 프로젝트라고 설명한다. 조사한 압축 파일의 저장소 루트에는 게임 데이터 전체를 포괄하는 라이선스 파일이 없었다. `tools/`의 개별 도구 라이선스를 지도·인물 이미지에 적용하지 않았다. 이번에는 게임 ROM을 다운로드하거나 빌드하지 않고 공개 소스에 있는 지도·이미지·JSON을 수집했다. 변환 PNG의 원본 권리는 동일하게 남는다.

## 접근 경로

- GitHub 검색 페이지, HTTPS Git 읽기, `raw.githubusercontent.com`, `codeload.github.com`은 사용 가능했다.
- GitHub 검색 API와 `pokeapi.co` 실시간 API는 이 환경에서 403을 반환했다. 인증을 우회하지 않고 공개 Git 저장소의 고정 CSV를 사용했다.
- 별도 API 키나 계정은 필요하지 않았다.

## 저장 형태

`manifest.json`은 원본 파일별 출처를, `catalog/derived-maps.json`은 지도 포맷 변환의 입력·출력 해시를 보존한다. `catalog/*.json`의 데이터는 위 PokéAPI CSV와 pret 맵 JSON에서 생성한 색인이다. 한국어 누락값을 임의의 공식 명칭으로 채우지 않았다.
