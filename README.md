# dku-writeme

![GitHub top language](https://img.shields.io/github/languages/top/dku-writeme/dku-writeme?style=flat-square) ![GitHub stars](https://img.shields.io/github/stars/dku-writeme/dku-writeme?style=flat-square) ![GitHub forks](https://img.shields.io/github/forks/dku-writeme/dku-writeme?style=flat-square)

> GitHub 저장소 URL을 입력하면 저장소 구조와 핵심 파일을 분석해 README 초안을 생성하는 웹 애플리케이션입니다.

## 📌 개요

dku-writeme는 GitHub 저장소의 기본 정보, 파일 트리, 주요 소스 파일, 의존성 정보를 수집해 README Markdown 초안을 생성합니다.

프론트엔드에서는 생성할 섹션을 선택하고, 결과 Markdown을 편집하거나 미리보기로 확인할 수 있습니다. 백엔드는 GitHub API로 저장소 정보를 수집하고, FastAPI 기반 AI 서버와 연동해 주요 기능 요약을 보완합니다.

## ✨ 주요 기능

**GitHub 저장소 분석**

- GitHub 저장소 URL에서 owner와 repo를 추출하고 저장소 기본 정보와 파일 트리를 가져옵니다.

**핵심 파일 선별**

- README 생성에 필요한 설정 파일, 패키지 파일, 주요 소스 파일을 우선순위에 따라 선별합니다.

**AI 기반 기능 요약**

- 선별된 파일 내용을 AI 서버로 전달해 저장소의 주요 기능과 한 줄 요약을 생성합니다.

**Rule-based README 구성**

- AI 분석이 실패하거나 시간 초과되는 경우에도 저장소 구조와 감지된 기술 스택을 바탕으로 README를 생성합니다.

**Markdown 편집과 미리보기**

- 생성된 README를 에디터에서 수정하고, Markdown 렌더링 결과를 미리보기로 확인할 수 있습니다.

**섹션 선택**

- 개요, 주요 기능, 기술 스택, 프로젝트 구조, 핵심 파일, 설치 및 실행 방법, 라이선스, 링크 섹션을 선택적으로 포함할 수 있습니다.

**복사와 다운로드**

- 완성된 README를 클립보드에 복사하거나 `README.md` 파일로 다운로드할 수 있습니다.

**생성 진행 상태 표시**

- 저장소 정보 조회, 파일 트리 분석, 핵심 파일 선택, AI 분석, 문서 작성 상태를 단계별로 표시합니다.

## 🛠 기술 스택

### Frontend

| 분류 | 기술 |
| --- | --- |
| 언어 | JavaScript |
| 프레임워크 | React 19 |
| 빌드 도구 | Vite 8 |
| Markdown 편집 | CodeMirror |
| Markdown 렌더링 | react-markdown, remark-gfm |
| 스타일링 | CSS |

### Backend API

| 분류 | 기술 |
| --- | --- |
| 언어 | JavaScript |
| 런타임 | Node.js |
| 모듈 시스템 | ES Modules |
| 서버 | Node.js HTTP Server |
| 환경 변수 | dotenv |
| 외부 API | GitHub API |

### AI Server

| 분류 | 기술 |
| --- | --- |
| 언어 | Python |
| 프레임워크 | FastAPI |
| 서버 | Uvicorn |
| 데이터 검증 | Pydantic |
| AI 연동 | Hugging Face Inference API |

## 📁 프로젝트 구조

```text
.
├── backend/
│   ├── package.json
│   ├── requirements.txt
│   └── src/
│       ├── ai_server.py
│       ├── server.js
│       ├── lib/
│       │   ├── deliverInfo.js
│       │   ├── organizeReadmeData.js
│       │   └── selectImportantFiles.js
│       └── repository-analysis/
│           ├── fileSelector.js
│           ├── index.js
│           └── schema.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/
        ├── components/
        ├── utils/
        ├── App.jsx
        └── main.jsx
```

## 🔑 핵심 파일

| 경로 | 설명 |
| --- | --- |
| `backend/src/server.js` | GitHub API 호출, 파일 선별, AI 분석 요청, README 생성 API를 처리합니다. |
| `backend/src/ai_server.py` | Hugging Face 모델을 호출해 저장소 요약과 주요 기능을 생성합니다. |
| `backend/src/lib/deliverInfo.js` | GitHub 저장소 정보, 파일 트리, 파일 내용을 가져옵니다. |
| `backend/src/lib/selectImportantFiles.js` | README 생성에 사용할 핵심 파일 후보를 선별합니다. |
| `backend/src/lib/organizeReadmeData.js` | 기술 스택, 프로젝트 구조, 실행 명령어 등 README 구성 데이터를 정리합니다. |
| `frontend/src/api/repoApi.js` | 백엔드 응답을 README Markdown으로 변환하고 API 요청을 처리합니다. |
| `frontend/src/App.jsx` | README 생성 화면의 상태, 스트리밍 진행 상황, 편집/미리보기 흐름을 관리합니다. |
| `frontend/src/components/MarkdownEditor.jsx` | 생성된 README Markdown을 편집하는 에디터 컴포넌트입니다. |
| `frontend/src/components/MarkdownPreview.jsx` | README Markdown 미리보기를 렌더링합니다. |

## 🚀 설치 및 실행 방법

### 1. 저장소 복제

```bash
git clone https://github.com/dku-writeme/dku-writeme.git
cd dku-writeme
```

### 2. Backend API 의존성 설치

```bash
cd backend
npm install
```

### 3. AI Server 의존성 설치

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell에서는 가상환경 활성화 명령이 다릅니다.

```powershell
.\.venv\Scripts\Activate.ps1
```

### 4. Frontend 의존성 설치

```bash
cd frontend
npm install
```

### 5. 환경 변수 설정

#### Backend

```bash
cd backend
cp .env.example .env
```

`.env` 예시:

```env
GITHUB_TOKEN=github_token
HF_TOKEN=hugging_face_token
HOST=0.0.0.0
PORT=3000
AI_ANALYSIS_URL=http://localhost:8000/analyze
AI_ANALYSIS_TIMEOUT_MS=60000
AI_RESPONSE_RETRIES=2
```

| 변수 | 설명 |
| --- | --- |
| `GITHUB_TOKEN` | GitHub API 요청 한도 완화와 private 저장소 접근에 사용합니다. |
| `HF_TOKEN` | Hugging Face Inference API 호출에 사용합니다. |
| `HOST` | Node 백엔드 서버 호스트입니다. |
| `PORT` | Node 백엔드 서버 포트입니다. |
| `AI_ANALYSIS_URL` | FastAPI AI 서버의 분석 엔드포인트입니다. |
| `AI_ANALYSIS_TIMEOUT_MS` | Node 백엔드에서 AI 서버 응답을 기다리는 최대 시간입니다. |

#### Frontend

```bash
cd frontend
cp .env.example .env
```

`.env` 예시:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 6. 개발 서버 실행

터미널을 각각 열어 아래 서버를 실행합니다.

#### AI Server

```bash
cd backend
source .venv/bin/activate
uvicorn src.ai_server:app --reload --port 8000
```

#### Backend API

```bash
cd backend
npm run dev
```

#### Frontend

```bash
cd frontend
npm run dev
```

기본 접속 주소:

```text
Frontend: http://localhost:5173
Backend API: http://localhost:3000
AI Server docs: http://localhost:8000/docs
```

## 🔗 링크

[GitHub Repository](https://github.com/dku-writeme/dku-writeme)
