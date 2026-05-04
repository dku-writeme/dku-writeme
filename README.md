# dku-writeme

GitHub 저장소 URL을 입력하면 README 초안을 자동 생성해주는 웹 서비스입니다.

---

## ✨ 주요 기능

### 1. GitHub URL 입력 및 파싱
- 화면 중앙의 입력창에 GitHub 저장소 URL 예시 `https://github.com/facebook/react`를 입력하면 동작이 시작됩니다.
- 입력된 URL에서 **소유자(owner)** 와 **저장소 이름(repo)** 을 자동으로 추출합니다.

### 2. GitHub API 기반 저장소 데이터 수집
- 추출한 owner/repo 정보를 바탕으로 GitHub API에 요청을 보내 README 작성에 필요한 저장소 정보를 수집합니다.
- 수집 대상 정보는 다음과 같습니다.
  - 프로젝트 이름 및 설명
  - Star / Fork 수
  - 사용 언어
  - 저장소 URL
  - 라이선스 정보

### 3. README 템플릿 자동 조립
- 기본형 / 심플형 / 뱃지 강조형 등 미리 준비된 README 템플릿을 제공합니다.
- 선택한 템플릿에 GitHub 저장소 데이터를 자동으로 채워 넣어 Markdown 형식의 README 초안을 생성합니다.

### 4. Markdown 편집 및 미리보기
- 생성된 README Markdown을 에디터에서 직접 수정할 수 있습니다.
- 수정한 Markdown 결과를 미리보기 영역에서 확인할 수 있습니다.

### 5. 복사 및 다운로드
- 완성된 README를 클립보드에 복사할 수 있습니다.
- 완성된 README를 `README.md` 파일로 다운로드할 수 있습니다.

---

## ⚙️ 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React, Vite |
| Backend | TBD |
| API | GitHub REST API |

---

## 🚀 시작하기

```bash
# 추후 작성 예정