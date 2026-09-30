# 내집사 Claude 실행 연결

상태: 워크플로 준비. Claude GitHub App 설치·인증·main 반영·실행 확인은 별도 필요하다. 이 문서가 생겼다고 Claude가 가동된 것은 아니다.

## 실행 방식

[공동 작업실 #52](https://github.com/niju0114/naezipsa/issues/52)에서 [데이터 작업 #51](https://github.com/niju0114/naezipsa/issues/51)로 이동한다. 연결 완료 후 저장소 소유자 `niju0114`가 아래 한 줄을 새 댓글로 작성하면 GitHub Actions가 Claude를 실행한다.

| 새 댓글 | 하는 일 |
|---|---|
| `@claude audit` | 코드와 계측 설계를 점검하고 결과를 이슈에 기록 |
| `@claude implement 1` | #51의 1단계만 구현하고 검토용 draft PR 준비 |

공백·설명 등을 덧붙이지 않고 한 줄 그대로 사용한다. 수정한 댓글과 다른 이슈/PR의 댓글은 실행하지 않는다. 봇 댓글은 재실행을 일으키지 않는다. 진수님 작업은 자동실행 대상이 아니다.

실행 한 건은 최대 20분, Claude 12턴으로 설정했다. 이 제한은 정액 요금 상한이 아니다. 선택한 Claude 인증 계정의 사용량이 발생할 수 있다. 반복 스케줄로 코드를 계속 실행하는 구성은 없고, 사용자가 지정한 작업 단계가 끝나면 멈춘다. 기존 시간당 알림은 작업 상태 확인 용도로 유지한다.

## 계정 소유자가 연결할 항목

1. [Claude GitHub App](https://github.com/apps/claude)을 설치하고 `niju0114/naezipsa` 접근을 허용한다.
2. [저장소 Actions secrets](https://github.com/niju0114/naezipsa/settings/secrets/actions)에 아래 중 **하나만** 등록한다.
   - Claude 구독 계정 사용: 로컬 Claude Code에서 `claude setup-token` 실행 후 결과를 `CLAUDE_CODE_OAUTH_TOKEN`으로 저장.
   - Claude API 사용: Anthropic Console의 API 키를 `ANTHROPIC_API_KEY`로 저장.
3. 이 설정 PR을 검토한 뒤 main에 반영한다. issue_comment 워크플로는 기본 브랜치에 있어야 동작한다.
4. #51에 `@claude audit`을 새 댓글로 작성한다.
5. [Actions](https://github.com/niju0114/naezipsa/actions)에서 인증·실행 결과를 확인하고 #51의 audit 결과를 읽는다. 성공 확인 후 `@claude implement 1`을 실행한다.

키나 OAuth 토큰은 채팅·댓글·코드에 붙이지 않는다. 이 연결에서 과거에 공유한 OpenAI 키는 사용하지 않는다. 이 작업의 연결 도구는 GitHub App 설치와 Claude 계정 인증을 대신 완료하지 못하므로, 위 소유자 설정이 필요하다.

Claude Code의 공식 간편 설정은 `/install-github-app`이다. 이미 이 저장소에 본 워크플로가 준비되어 있으므로, 해당 명령이 다른 Claude 워크플로를 추가하면 동일 댓글에 두 작업이 실행되지 않도록 먼저 비교한다. 본 가이드의 수동 App+secret 연결을 사용하면 중복 파일을 만들 필요가 없다.

## 운영·검증

- 공식 Action과 checkout은 검토한 commit SHA에 고정했다. 업데이트할 때 공식 릴리스와 입력 스키마를 확인한다.
- 작업 진입 조건은 저장소·소유자·댓글 작성자·재실행 주체·이슈 번호·상태·정확한 명령으로 확인한다.
- Actions의 실제 실행 시점에도 이슈가 열려 있는지 다시 확인한다.
- 인증 secret이 0개 또는 2개면 Claude 호출 전에 중단한다. 사전 검사는 값의 존재만 확인하며 실제 자격 유효성은 Action에서 확인한다.
- 한 번에 하나만 실행한다. GitHub concurrency는 영구 작업 큐가 아니므로 여러 명령을 연속으로 올리지 말고 이전 결과를 기다린다.
- `show_full_output`은 끈다. 공개 저장소에서 Actions 디버그 전체 로그를 켜지 않는다.
- App의 권한 범위와 보호 브랜치 설정을 확인한다. ‘main에 push하지 않기’는 실행 지시이며 보호 규칙을 자동 설치한 것은 아니다.
- 중지하려면 Actions에서 `Claude validation task` 워크플로를 Disable 한다.

로컬 진입 조건 검증: `node --test tools/claude-task-gate.test.mjs`.
실제 Claude 인증·브랜치 생성·댓글·PR은 소유자 연결 후 첫 실행에서 확인한다.

## 공식 문서

- https://code.claude.com/docs/en/github-actions
- https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md
- https://github.com/anthropics/claude-code-action/blob/main/docs/security.md
