# 내집사 Claude 실행 연결

상태: VS Code의 기존 Claude Code를 기본 작업 환경으로 사용한다. 아래 로컬 인계 절차는 준비되었으며, 사용자의 PC에서 GitHub 인증과 이슈 읽기는 직접 확인해야 한다. GitHub 서버 실행은 별도 선택 경로로, App·인증·main 반영·실행 확인이 아직 필요하다.

## VS Code에서 이어서 작업하기 — 민준님 기본 실행 방식

민준님은 기존 VS Code의 Claude Code를 계속 사용한다. GitHub에는 작업 지시·브랜치·PR·검증 결과를 남기고, Claude는 해당 기록을 읽어 이어서 작업한다. 아래 로컬 작업에는 GitHub Actions용 App 설치나 Actions secret 등록이 필요하지 않다. Claude 로그인과 GitHub 저장소 접근 인증은 별개다.

1. VS Code에서 기존 `naezipsa` 프로젝트 폴더와 Claude Code를 연다. 같은 PC의 기존 대화는 확장 프로그램의 대화 기록에서 선택할 수 있다. 터미널 CLI를 설치해 사용하는 경우 `claude --resume`으로 세션을 선택한다.
2. GitHub CLI를 사용하는 경로라면 VS Code 터미널에서 `gh auth status`로 연결 계정을 확인한다. 설치/인증이 없으면 공식 GitHub CLI를 설치하고 `gh auth login`으로 본인 계정을 연결한다. GitHub MCP가 이미 연결되어 있으면 해당 도구를 사용해도 된다.
3. 아래 프롬프트를 Claude Code에 넣는다. #52는 작업 목록, #51은 이번 데이터 계측 작업의 원문이다. 안내 문서는 현재 PR #53 브랜치에 있으므로 main에서 파일이 안 보이면 아래 GitHub 링크와 이슈 본문을 직접 읽는다.
4. 작업 결과는 브랜치에 commit·push하고 draft PR과 #51에 검증 결과·남은 작업을 연결한다. GitHub에 올라오지 않은 수정·대화는 다른 실행 환경에서 볼 수 없다.
5. 다음 실행에서는 해당 브랜치와 최신 PR·작업 기록을 먼저 읽는다. 로컬 작업 중에는 같은 작업의 GitHub Actions 실행을 시작하지 않는다. Actions의 동시 실행 제한은 로컬 VS Code 작업을 잠그지 않는다.

### VS Code에 넣을 시작 프롬프트

```text
내집사 niju0114/naezipsa 프로젝트를 VS Code의 Claude Code에서 이어서 작업한다.
공동 작업실 https://github.com/niju0114/naezipsa/issues/52 와
계측 작업 https://github.com/niju0114/naezipsa/issues/51 의 본문·댓글,
관련 열린 PR #44/#45/#53 및 실제 구현 PR을 먼저 읽어라.
GitHub CLI가 연결되어 있으면 gh issue view 51 --repo niju0114/naezipsa --comments 등을 사용하라.
접근에 실패하면 읽었다고 가정하지 말고 누락된 접근 설정을 알려라.

현재 git status, 브랜치, 원격 저장소를 확인하고 기존 미커밋 작업을 보존하라.
git fetch 후 로컬과 원격 차이를 확인하되, 자동 reset·clean·강제 push·임의 브랜치 전환은 하지 마라.
적용되는 AGENTS.md와 CLAUDE.md를 읽고 기존 작업/다른 담당자 PR과 중복되는지 확인하라.
기존 작업 브랜치가 있으면 해당 변경을 먼저 이해하고, 새 구현일 때만 적절한 별도 브랜치를 정하라.

이번에는 #51의 현재 코드 점검(audit)부터 하라.
가설 검증에 필요한 행동 기록이 어디서 생성·저장·내보내기되는지 확인하라.
확인한 커밋, 현재 구현, 빠진 기록, 지표 왜곡 위험, 다음 단계 하나를 한국어로 정리하라.
외부 GA·시트 권한이 없으면 미확인으로 남겨라.
진수님 #47~#50 작업, 자동 병합, 배포, 운영 DB 변경은 수행하지 마라.
제품 코드는 이 점검 단계에서 변경하지 마라.
결과를 #51에 기록하되 비밀키·사용자 원문·전체 대화는 올리지 마라.
이후 내가 "#51 1단계 구현"을 지시하면 점검 결과와 이슈의 프롬프트 1을 기준으로 구현하라.
```

### 작업을 넘길 때 남기는 최소 기록

아래 내용은 해당 작업 이슈의 진행 기록으로 남긴다. 별도 작업 목록 파일에 복사하지 않는다.

```text
실행 위치: VS Code / GitHub Actions 중 하나
작업 이슈:
현재 브랜치·push된 커밋:
관련 PR:
완료한 것·검증 결과:
남은 것·막힌 것:
다음에 할 작업 하나:
미커밋/미push 변경 존재 여부:
```

GitHub로 동기화되는 것은 push된 코드와 이슈·PR 기록이다. VS Code의 대화 전체, 로컬 전용 메모, 미커밋 파일, 로컬 환경변수가 GitHub Actions에 자동 전달되는 것으로 가정하지 않는다. 실행 환경을 옮길 때는 위 기록과 브랜치를 기준으로 인계한다.

## GitHub 서버에서 실행하기 — 선택 경로

[공동 작업실 #52](https://github.com/niju0114/naezipsa/issues/52)에서 [데이터 작업 #51](https://github.com/niju0114/naezipsa/issues/51)로 이동한다. 연결 완료 후 저장소 소유자 `niju0114`가 아래 한 줄을 새 댓글로 작성하면 GitHub Actions가 Claude를 실행한다.

| 새 댓글 | 하는 일 |
|---|---|
| `@claude audit` | 코드와 계측 설계를 점검하고 결과를 이슈에 기록 |
| `@claude implement 1` | #51의 1단계만 구현하고 검토용 draft PR 준비 |

공백·설명 등을 덧붙이지 않고 한 줄 그대로 사용한다. 수정한 댓글과 다른 이슈/PR의 댓글은 실행하지 않는다. 봇 댓글은 재실행을 일으키지 않는다. 진수님 작업은 자동실행 대상이 아니다.

실행 한 건은 최대 20분, Claude 12턴으로 설정했다. 이 제한은 정액 요금 상한이 아니다. 선택한 Claude 인증 계정의 사용량이 발생할 수 있다. 반복 스케줄로 코드를 계속 실행하는 구성은 없고, 사용자가 지정한 작업 단계가 끝나면 멈춘다. 기존 시간당 알림은 작업 상태 확인 용도로 유지한다.

## GitHub 서버 실행을 선택할 때 연결할 항목

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

- https://code.claude.com/docs/en/vs-code
- https://cli.github.com/manual/gh_issue_view

- https://code.claude.com/docs/en/github-actions
- https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md
- https://github.com/anthropics/claude-code-action/blob/main/docs/security.md
