# 내집사 AI 주간 리뷰

Sheet의 계산 결과와 인터뷰 코딩을 읽어 검토 초안을 만드는 **EXP-001 전용** Google Apps Script입니다. 제품의 매물 인사이트 기능과는 별개입니다. 추가 npm 패키지 없이 Responses API를 호출합니다. Node SDK를 별도로 사용할 때 패키지명은 `openai`입니다.

## Source of Truth

| 정보 | 원본 |
| --- | --- |
| 행동·결제·인터뷰 증거와 계산 | Google Sheet |
| 확정 가설·실험·주간 판단 | Notion |
| UX | Figma |
| 이 코드·계측 구현 | GitHub |
| 녹음·리서치 원본 | Drive |

AI는 가설 상태와 다음 실험을 **제안**합니다. 기존 Sheet 값을 수정하거나 Notion의 확정 가설·Decision Log를 덮어쓰지 않습니다. 초안은 임시 캐시에 보관하고, 별도 메뉴 실행 때만 Notion 하위 페이지에 저장합니다. Notion에 raw data를 복사하지 않고 근거 범위 링크를 붙입니다.

## 현재 상태와 설치

코드와 로컬 모의 테스트 제공 상태입니다. Apps Script 설치·Google 권한 승인·실제 OpenAI 및 Notion REST 호출은 별도 검증이 필요합니다. 기존 제품→Sheet export는 이 기능에서 구현하지 않습니다. 수집 상태가 NOT_CONNECTED이면 유료 API 호출이 일어나지 않습니다.

1. 기존 `내집사_Validation_Data`에서 **확장 프로그램 → Apps Script**를 엽니다. 기존 스크립트가 있다면 덮어쓰지 말고 이름 충돌부터 확인하세요.
2. `Code.gs`를 새 파일로 추가합니다. 프로젝트 설정에서 매니페스트 표시를 켜고 `appsscript.json`의 런타임·시간대·권한을 적용합니다. 기존 권한은 이유를 확인하고 병합하세요.
3. 채팅에 노출한 키는 폐기합니다. 새 OpenAI 프로젝트 키를 발급해 프로젝트 설정 → 스크립트 속성의 `OPENAI_API_KEY`에 **직접** 입력합니다. 채팅, Sheet 셀, GitHub, 프론트엔드에 넣지 않습니다.
4. 선택 속성 `OPENAI_MODEL` 기본값은 요청한 `gpt-6-luna`입니다. 해당 프로젝트의 모델 접근 권한을 확인하세요. 모델이 없으면 조용히 다른 모델로 바꾸지 않고 중단합니다.
5. 저장 후 시트를 새로고침합니다. `내집사 AI → 1. 준비 상태 / 전송 내용 확인` 실행 시 Google 권한을 승인합니다. 이 단계는 OpenAI를 호출하지 않습니다.
6. 담당 B가 실제 export와 수식·중복·출처 차감을 확인한 뒤 Dashboard B9를 READY, B10을 마지막 수집시각으로 설정합니다. B7 기준시각까지 수집되어야 합니다. 실행을 통과하려고 임의로 READY를 설정하지 않습니다.
7. 전송할 집계·가명 행동 플래그를 확인하고 `2. 주간 리뷰 초안 생성`을 실행합니다. 두 명이 근거와 반증을 검토합니다.
8. Notion 저장은 아래 선택 설정 후 `4. Notion에 검토 초안 저장`을 사용하거나, `3. 최근 초안 보기`에서 복사해 Notion Weekly Review에 붙입니다.

Script Properties는 **스크립트 편집자에게 공유되는 설정**입니다. 두 명의 신뢰할 수 있는 팀원만 편집 권한을 가져야 합니다. 이 설정은 전문 비밀관리 저장소가 아닙니다.

## 선택: Notion 저장

Notion 내부 integration에 해당 Validation OS 상위 페이지의 콘텐츠 삽입 권한을 연결하고, `NOTION_TOKEN`과 `NOTION_PARENT_ID`를 스크립트 속성에 입력합니다. ID에는 페이지 UUID만 입력합니다. 기존 ChatGPT의 Notion 연결 토큰을 재사용하거나 추출하지 않습니다.

저장 버튼은 읽은 시점의 **AI 검토 초안** 하위 페이지 하나를 추가합니다. 사람이 확정하기 전에는 Current Hypotheses나 Decision Log에 자동 반영되지 않습니다. 동일 입력의 저장은 중복 방지됩니다. HTTP 실패/시간초과는 성공 여부를 확인할 수 없으므로 재시도 전에 Notion을 확인하세요. 미생성이 확인된 경우에만 관리자가 해당 `PUBLISHED_<hash>` 속성을 삭제하고 다시 시도합니다.

## 정확도·비용·개인정보 경계

- 입력 크기: Users 100행, Events 2,000행, 선택 cohort 인터뷰 60건, 전송 JSON 45,000자. 초과하면 잘라내지 않고 중단합니다. 기존 Sheet 수식 범위를 확장할 때 코드도 함께 수정합니다.
- READY, 기준시각, 마지막 수집시각, user/event/payment/생성 insight 중복, 날짜, 토큰 차감 출처, cohort와 주 지표 분모를 검증합니다. **모든 계측 결함을 검출하는 검증기는 아닙니다.** 서버 export의 누락·PG webhook 검증은 담당 B 책임입니다.
- D0~7 핵심행동, D7~14 재방문·후속결제, 첫 유료 생성 후14일 반복사용을 구별합니다. 미성숙 표본은 이탈이 아닙니다. mixed 생성은 출처별 집계에 중복 포함되므로 합산하지 않습니다.
- 7일 성숙 Qualified가 20명 미만이면 제안 결정은 Insufficient Data, 다음 실험은 미정으로 고정합니다. 20명은 충분한 통계 검정력이나 성공 기준이 아닙니다. EXP-001에는 사전 성공 임계값이 없으므로 기준선과 질적 증거를 사람이 해석합니다.
- H1/H2/H3 근거 ID를 검사하지만 **문장의 사실성까지 보증하지 않습니다.** 인간 검토가 필수입니다. source별 소표본·UT/보상·도움받은 사용·가구 상관을 고려하세요.
- raw events, 실제 user_id, 연락처, 메모, 인터뷰 원문, 자유형 해석은 OpenAI로 보내지 않습니다. 집계와 U001 형태의 임시 가명, 행동 플래그, 인터뷰 Y/N/Mixed/Unknown 코딩만 보냅니다. 익명성의 보장은 아닙니다. 원문은 Sheet 근거 링크에서 사람이 확인합니다. 인터뷰 코딩 미입력은 Unknown으로 처리합니다.
- `store:false`, 최대 출력 4,500토큰, 하루 시도 최대3회, 중복 실행 잠금, 같은 스냅샷 캐시 재사용(최대6시간)을 사용합니다. 캐시는 일찍 만료될 수 있습니다. 요청 실패도 시도 횟수에 포함하며 자동 재시도하지 않습니다. 이 제한은 **금액 상한이 아니므로** OpenAI 프로젝트 예산/알림도 설정하세요. `store:false`를 무보관 보장으로 해석하지 않습니다.
- 토큰 사용량은 `LAST_USAGE` 설정에 저장합니다. 서비스의 유료/보상 토큰과 OpenAI API 토큰은 다른 단위입니다. 영구 리뷰 원본은 Notion입니다. 캐시 만료 전 저장하세요.
- 예약 트리거, 자동 발송, 사용자 연락, 자동 가설 확정은 없습니다. 다음 Experiment가 확정되면 가설·기간·최소 관찰 기준을 바꾼 새 코드 리뷰가 필요합니다.

## 내일부터의 운영

**B:** 계측 export를 연결하고 테스트 사용자를 제외합니다. **A:** Qualified 모집과 동의받은 인터뷰를 진행합니다. 매주 B가 기준시각과 수집완전성을 확인하고 초안을 생성합니다. A/B가 Sheet 근거·인터뷰 원문을 확인해 Notion에서 결정과 다음 실험 하나를 확정합니다. 그 실험이 정해진 다음 Figma/GitHub 작업을 시작합니다.

## 검증

```sh
node --test tools/validation-review/Code.test.cjs
```

로컬 검증은 순수 계산·게이트·개인정보 제외·응답 검증·호출 제한을 모의 실행합니다. Google 메뉴/승인, 실제 모델 권한·과금, 실제 Notion 저장은 설치 후 스모크 테스트가 필요합니다. 첫 실제 실행에서는 생성 전 전송 내용, 생성 후 근거 링크, Notion 초안 중복 방지를 확인합니다.

공식 문서: [Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [모델](https://developers.openai.com/api/docs/models/gpt-6-luna), [Apps Script Properties](https://developers.google.com/apps-script/guides/properties), [메뉴](https://developers.google.com/apps-script/guides/menus), [UrlFetch](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app), [Notion 버전](https://developers.notion.com/reference/versioning).


## 한글 시트 호환 (1.1.0)

화면 탭·열 제목·선택값은 한글입니다. `locale-ko.json`이 원래 수집 필드/값과 한글 표시의 대응표이며, 설치용 `Code.gs`에도 같은 표가 포함되어 있습니다. 기존 영문 시트도 읽습니다. 인터뷰 지지/반박/판단 유보를 기존 Support/Contradict/Unknown과 함께 인식합니다.

제품 내보내기 담당자는 원래 이벤트 코드를 임의로 바꾸지 않습니다. Sheet에 반영할 때 대응표로 열 제목과 선택값만 한글화합니다. 원본 식별자와 실험 식별자(EXP-001)는 그대로 유지합니다. 수집 상태는 ‘수집 미연결’/‘수집 준비 완료’, 전체 유입 선택은 ‘전체’입니다. Notion의 원래 결정값과 한글 표시의 대응도 이 표로 유지합니다.
