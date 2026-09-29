# Validation event contract v1

상태: 계측 구현용 계약. 제품 계측이나 export가 배포되었다는 의미가 아니다.

## 책임 경계

Sheet=사용자 행동·증거, Notion=가설·판단·실험, Figma=UX, GitHub=코드·구현, Drive=원본 자료. 공개 저장소에는 실제 user_id, 사용자 인터뷰, 내부 문서 주소, 연락처, 원본 데이터 CSV를 커밋하지 않는다.

기존 구현 지점은 `backend/app/dashboard`, `backend/app/group`, `backend/app/insight`, `backend/app/inspection`, `frontend`다. 이 계약은 현재 DB에 존재한다고 가정하지 않는다. 별도의 analytics 저장소/테이블 도입은 구현 PR에서 검토한다.

## 이벤트 envelope

`event_id, user_id, event_time, event_name, session_id, candidate_id, acquisition_source, properties, experiment_id`는 기본 필드다.

추가 export 컬럼: `is_test, decision_action_YN, token_type, insight_id, payment_id, amount_paid, paid_spent, free_trial_spent, survey_reward_spent, interview_reward_spent, ut_reward_spent, refund_amount, exposure_id`.

- event_id는 서버 생성 UUID 또는 재시도에도 동일한 idempotency key. 고유 제약 필수.
- UTC ISO 시각을 저장하고 export에서는 KST typed date로 변환한다. 서로 다른 원본 시간대를 문자열 비교하지 않는다.
- 모집 익명ID와 로그인ID 매핑을 서버에서 유지한다. 인증 후 1명으로 합치며 기기별 ID를 사람 수로 중복 집계하지 않는다. 스크리닝되지 않은 익명 방문은 core 퍼널 분모에 넣지 않는다.
- experiment_id는 노출/등록 시점 스냅샷. Users.enrolled_at 이전 이벤트는 현재 cohort 성과로 소급 계산하지 않는다.
- acquisition_source는 등록 시 first touch를 고정하고 unknown을 허용한다. 민감한 URL query나 원문 메모를 properties에 저장하지 않는다.
- 테스트 계정·결제 sandbox·직원은 is_test=Y. UT/도움받은 행동은 assisted_YN과 reward source로 구분한다.

## 발생 조건

| event_name | 발생 조건 | 주요 properties |
|---|---|---|
| landing_view | 실제 랜딩 렌더, 세션당 1회 | landing_version |
| signup | 서버 계정 생성 성공, 1회 | auth_provider |
| candidate_added | 후보 저장 commit 성공 | candidate_id, distinct_count |
| second_candidate_added | 실험 내 서로 다른 후보 2개 확보를 처음 달성 | candidate_ids, distinct_count |
| comparison_viewed | 실제 서로 다른 후보 2개 이상 표시 | candidate_ids, rendered_count |
| candidate_rejected | 상태가 실제로 탈락으로 변경 완료 | reason_present, previous_state |
| candidate_priority_changed | 이전 값과 다른 우선순위 저장 성공 | before, after |
| memo_added | 비어있지 않은 메모 최초 저장 또는 의미 있는 변경 성공 | length, never raw memo |
| visit_planned | 유효한 임장 계획 저장 성공 | visit_date_present |
| share | 공유 링크 생성/복사 성공 | share_type |
| insight_requested | 서버 유효 요청 수락 | insight_id, candidate_ids |
| insight_generated | 서버 결과와 PDF 준비 성공, insight_id당1회 | model_version, report_version, consumption allocations |
| insight_viewed | 생성 완료 인사이트 화면 실제 열람 | insight_id |
| pdf_downloaded | PDF 다운로드 응답 성공 | insight_id |
| paywall_view | 가격과 pack이 실제 보임 | exposure_id, price, currency, pack, copy_version |
| purchase_attempt | checkout 생성 요청 수락 | exposure_id, payment_id, pack, amount |
| token_purchase | PG webhook 검증 후 실제 유료 결제 확정 | payment_id, exposure_id, amount_paid, granted_tokens |
| token_refund | PG에서 환불 확정 | refund_id, payment_id, refund_amount |
| revisit | 첫 방문 +24h 이후 새 session의 의미 있는 방문, 세션당1회 | original_visit_at, meaningful_event |

decision_action_YN은 comparison_viewed / candidate_rejected / candidate_priority_changed / memo_added / visit_planned가 위 조건을 만족할 때만 Y다. 나머지는 N. UI 클릭·실패 응답은 성공 이벤트로 보내지 않는다. API 저장은 commit 후 서버 emit, 클라이언트 렌더 이벤트는 인증/모집ID 및 중복 키를 검증한다.

## 토큰·결제

토큰은 제품 크레딧이며 LLM 입출력 토큰과 별도다. 서버 원장은 grant_id, user_id, source, quantity, remaining, payment_id, granted_at을 갖고, 소비는 insight_id별 allocation으로 연결한다. source는 paid/free_trial/survey_reward/interview_reward/ut_reward 중 하나. 한 생성이 둘 이상 소비하면 token_type=mixed, export의 다섯 spent 컬럼에 실제 수량을 쓴다. 소비 우선순위는 구현 전에 고정한다.

생성 실패 시 같은 source 잔액으로 복구한다. insight_generated를 실패 때 찍지 않는다. PG webhook 재전송은 payment_id의 결제 확정 이벤트를 중복 생성하지 않는다. 환불은 원 결제 행을 지우지 않고 refund_id별 이벤트로 남긴다. 부분환불 합계가 결제액을 넘지 않게 한다.

WTP 1행=exposure_id 1개. 같은 payment_id를 여러 노출에 매핑하지 않는다. 노출 없는 구매는 별도 행. `why_paid/why_not_paid`는 인터뷰 evidence 링크로 관리. `stated_wtp`는 발언이며 purchase_success를 대체하지 않는다. 귀속할 수 없는 사용량은 임의로 채우지 않는다.

## 최소 export 계약

1. Users: 스크리닝/모집과 가입 매핑, user_id당 한 행. enrolled_at, experiment_id, core/탐색군, is_test, assisted_YN 필수.
2. Events: 위 envelope + 정규화 컬럼. event_id 중복 제거 후 시간순. insight_generated는 insight_id당, token_purchase는 payment_id당 1개.
3. WTP: 가격 노출↔결제 join 결과. 결제 없는 노출도 유지. 인터뷰 원문은 복사하지 않는다.
4. Sheet 원본 입력 범위만 갱신하고 Dashboard/06_Cohort 수식을 보존한다. Users 수기 스크리닝을 서비스 export로 덮어쓰지 않고 user_id 기준으로 merge한다.
5. 마지막 export 시각과 행 수를 남긴다. 누락/중복/미연결ID/불명 source 소비가 있으면 READY로 표시하지 않는다.

## EXP-001 계측 구현 완료 조건

- 가입 전 모집자 포함 denominator가 보존된다.
- 서로 다른 두 후보 저장 후 비교/판단의 순서가 검증된다.
- 테스트 1명으로 가입→후보1→후보2→비교 이벤트를 확인한다.
- 재시도·삭제후재등록·새로고침은 거짓 활성/재방문을 만들지 않는다.
- 실패 결제, 중복 webhook, 전액 무료 토큰은 실결제가 되지 않는다.
- source별 혼합 토큰은 다섯 할당량 합계와 원장이 일치한다.
- 내보낸 CSV가 Sheet에 들어가고 기준시각 변경에 따라 7일/14일 분모가 바뀐다.
- 이 문서 작성만으로 계측 완료 처리하지 않는다.

## Label 제안

사용자 요청의 반복된 hypothesis label은 `hypothesis:H1`, `hypothesis:H2`, `hypothesis:H3`로 구분한다. 공통 label: `experiment`, `tracking`, `billing`, `insight`, `rag`, `ux`, `bug`, `tech-debt`. 가설 label은 한 Issue에 하나만. 이미 있는 bug 등은 재사용한다.

이 PR은 Issue form과 이벤트 계약만 추가한다. 저장소 label 생성은 별도 관리 작업이다. UI의 Settings가 아닌 Issues > Labels에서 위 이름을 추가하며 기존 label은 삭제하지 않는다.
