// schema.js
// GitHub 저장소 분석 및 README 생성 공통 상수 정의

// ═══════════════════════════════════════════════════════
// JSDoc 타입 정의
// ═══════════════════════════════════════════════════════

/**
 * @typedef {Object} ProjectFile
 * @property {string} path     - 파일 경로 (예: "src/index.ts")
 * @property {string} content  - 파일 원본 내용
 * @property {'config'|'source'|'docs'|'ci'} role
 */

/**
 * @typedef {Object} SelectedFiles
 * @property {ProjectFile|null} packageConfig   - package.json / pyproject.toml 등
 * @property {ProjectFile|null} lockFile        - lock 파일
 * @property {ProjectFile|null} envExample      - .env.example
 * @property {ProjectFile|null} dockerfile      - Dockerfile / docker-compose
 * @property {ProjectFile|null} ciConfig        - CI 설정 파일
 * @property {ProjectFile|null} makeFile        - Makefile
 * @property {ProjectFile|null} requirementsTxt - requirements.txt (Python)
 * @property {ProjectFile[]}    entryPoints     - 진입점 파일 목록
 */

/**
 * @typedef {Object} ReadmeFileContent
 * @property {string} path    - 파일 경로
 * @property {string} content - 파일 내용
 */

/**
 * @typedef {Object} ReadmeData
 * @property {string}             name                 - 프로젝트명
 * @property {string}             description          - 프로젝트 설명
 * @property {ReadmeFileContent[]} selectedFileContents - HuggingFace 모델 입력용 파일 목록
 */

// ═══════════════════════════════════════════════════════
// 1. FILE_PRIORITY_RULES
// README 생성에 필요한 핵심 파일 선별 규칙
// ═══════════════════════════════════════════════════════

/**
 * 각 카테고리별 파일 패턴 목록 (앞에 있을수록 높은 우선순위)
 * - 정확한 파일명: "package.json"
 * - 와일드카드:    "*.csproj"
 * - 경로 패턴:     ".github/workflows/ci.yml"
 *
 * @type {{
 *   packageConfig: string[],
 *   lockFile:      string[],
 *   envExample:    string[],
 *   dockerfile:    string[],
 *   ciConfig:      string[],
 *   makeFile:      string[],
 *   entryPoints:   string[],
 * }}
 */
export const FILE_PRIORITY_RULES = {

  // ── 패키지 설정 파일 ────────────────────────
  packageConfig: [
    // Node
    'package.json',
    // Python
    'requirements.txt',
    'pyproject.toml',
    'setup.py',
    'setup.cfg',
    'Pipfile',
    // JVM
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'settings.gradle',
    'settings.gradle.kts',
    // Go
    'go.mod',
    // Rust
    'Cargo.toml',
    // Ruby
    'Gemfile',
    // PHP
    'composer.json',
    // .NET
    '*.csproj',
    '*.fsproj',
    '*.vbproj',
    '*.sln',
  ],

  // ── Lock 파일 ────────────────────────────────
  lockFile: [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'poetry.lock',
    'Pipfile.lock',
    'Cargo.lock',
    'Gemfile.lock',
    'composer.lock',
    'go.sum',
  ],

  // ── 환경변수 예시 파일 ───────────────────────
  envExample: [
    '.env.example',
    '.env.sample',
    '.env.template',
    '.env.local.example',
  ],

  // ── 컨테이너 설정 ────────────────────────────
  dockerfile: [
    'docker-compose.yml',
    'docker-compose.yaml',
    'docker-compose.override.yml',
    'Dockerfile',
    'Dockerfile.dev',
    'Dockerfile.prod',
  ],

  // ── CI/CD 설정 ───────────────────────────────
  ciConfig: [
    '.github/workflows/ci.yml',
    '.github/workflows/ci.yaml',
    '.github/workflows/build.yml',
    '.github/workflows/build.yaml',
    '.github/workflows/test.yml',
    '.github/workflows/main.yml',
    '.github/workflows/deploy.yml',
    '.travis.yml',
    '.circleci/config.yml',
    'Jenkinsfile',
    'azure-pipelines.yml',
    '.gitlab-ci.yml',
  ],

  // ── Makefile ─────────────────────────────────
  makeFile: [
    'Makefile',
    'makefile',
    'GNUmakefile',
  ],

  // ── 진입점 파일 ──────────────────────────────
  // 핵심 비즈니스 로직 흐름을 파악하기 위한 파일
  // (routes/*, controllers/*, api/*, service/* 포함)
  entryPoints: [
    // Node — 앱 진입점
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/main.js',
    'index.ts',
    'index.js',
    'src/app.ts',
    'src/app.js',
    'app.ts',
    'app.js',
    'src/server.ts',
    'src/server.js',
    'server.ts',
    'server.js',
    'main.ts',
    'main.js',
    // Node — 라우팅 (어떤 기능을 제공하는지)
    'src/routes/index.ts',
    'src/routes/index.js',
    'routes/index.ts',
    'routes/index.js',
    'src/api/index.ts',
    'src/api/index.js',
    'api/index.ts',
    'api/index.js',
    // Node — 컨트롤러 루트
    'src/controllers/index.ts',
    'src/controllers/index.js',
    'controllers/index.ts',
    'controllers/index.js',
    // Node — 서비스 루트
    'src/service/index.ts',
    'src/service/index.js',
    'src/services/index.ts',
    'src/services/index.js',
    // React / Next.js
    'src/App.tsx',
    'src/App.jsx',
    'src/App.ts',
    'src/App.js',
    'App.tsx',
    'App.jsx',
    'pages/_app.tsx',
    'pages/_app.js',
    'app/layout.tsx',
    'app/layout.js',
    'app/page.tsx',
    'app/page.js',
    // Python
    'main.py',
    'app.py',
    'run.py',
    'asgi.py',
    'wsgi.py',
    'manage.py',
    // Python — 라우팅
    'routes.py',
    'api.py',
    'views.py',
    // Go
    'main.go',
    'cmd/main.go',
    'cmd/root.go',
    // Rust
    'src/main.rs',
    'src/lib.rs',
    // Java
    'src/main/java/Application.java',
    'Application.java',
    'Main.java',
    // .NET
    'Program.cs',
    'Startup.cs',
  ],
};

// ═══════════════════════════════════════════════════════
// 2. PROJECT_SIGNATURES
// 프로젝트 유형 판별용 시그니처
// ═══════════════════════════════════════════════════════

/**
 * 언어/프레임워크별 감지 시그니처
 * - files: 해당 언어의 대표 config 파일명 목록
 * - exts:  해당 언어의 소스 파일 확장자 목록
 *
 * @type {Record<string, { files: string[], exts: string[] }>}
 */
export const PROJECT_SIGNATURES = {
  node: {
    files: ['package.json'],
    exts:  ['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx'],
  },
  python: {
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    exts:  ['.py'],
  },
  java: {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    exts:  ['.java'],
  },
  kotlin: {
    files: ['build.gradle.kts', 'build.gradle'],
    exts:  ['.kt'],
  },
  go: {
    files: ['go.mod'],
    exts:  ['.go'],
  },
  rust: {
    files: ['Cargo.toml'],
    exts:  ['.rs'],
  },
  ruby: {
    files: ['Gemfile'],
    exts:  ['.rb'],
  },
  php: {
    files: ['composer.json'],
    exts:  ['.php'],
  },
  dotnet: {
    files: ['*.csproj', '*.fsproj', '*.sln'],
    exts:  ['.cs', '.fs', '.vb'],
  },
  cpp: {
    files: ['CMakeLists.txt', 'Makefile'],
    exts:  ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp'],
  },
};

// ═══════════════════════════════════════════════════════
// 3. PACKAGE_MANAGER_MAP
// lock 파일명 → 패키지 매니저 이름
// ═══════════════════════════════════════════════════════

/**
 * lock 파일 기반 패키지 매니저 감지 맵
 * 주의: package.json 존재 여부를 먼저 확인한 뒤 이 맵을 참조해야
 *       Cargo.lock만 있는 Rust 프로젝트를 npm으로 오탐하지 않는다.
 *
 * @type {Record<string, string>}
 */
export const PACKAGE_MANAGER_MAP = {
  // Node
  'package-lock.json': 'npm',
  'yarn.lock':         'yarn',
  'pnpm-lock.yaml':    'pnpm',
  'bun.lockb':         'bun',
  // Python
  'poetry.lock':       'poetry',
  'Pipfile.lock':      'pipenv',
  // Rust
  'Cargo.lock':        'cargo',
  // Ruby
  'Gemfile.lock':      'bundler',
  // PHP
  'composer.lock':     'composer',
  // Go (go.sum은 lock이 아니라 체크섬 파일이지만 관용적으로 포함)
  'go.sum':            'go modules',
};

// ═══════════════════════════════════════════════════════
// 4. README_DATA_SCHEMA
// HuggingFace 모델 입력용 스키마 정의
// ═══════════════════════════════════════════════════════

/**
 * ReadmeData 스키마 메타데이터
 * - 실제 데이터 생성은 readmeDataGenerator.js 의 generateReadmeData() 사용
 * - 이 객체는 필드 명세·기본값·제약 조건을 문서화하는 용도
 *
 * @type {{
 *   fields: Record<string, { type: string, required: boolean, description: string, default?: * }>,
 *   constraints: { maxSelectedFiles: number, maxContentLength: number },
 *   example: ReadmeData,
 * }}
 */
export const README_DATA_SCHEMA = {

  /** 필드 명세 */
  fields: {
    name: {
      type:        'string',
      required:    true,
      description: '저장소(프로젝트)명. GitHub repoInfo.name 사용.',
      default:     '',
    },
    description: {
      type:        'string',
      required:    false,
      description: '프로젝트 한 줄 설명. GitHub repoInfo.description 사용. 없으면 빈 문자열.',
      default:     '',
    },
    selectedFileContents: {
      type:        'Array<{ path: string, content: string }>',
      required:    true,
      description: '선별된 핵심 파일 목록. path는 저장소 루트 기준 상대 경로.',
      default:     [],
    },
  },

  /** 제약 조건 */
  constraints: {
    maxSelectedFiles:  15,      // selectedFileContents 최대 항목 수
    maxContentLength:  8_000,   // 파일 1개 content 최대 문자 수
  },

  /** 출력 예시 */
  example: {
    name:        'todo-app',
    description: 'Simple Todo App built with Next.js and PostgreSQL',
    selectedFileContents: [
      {
        path:    'package.json',
        content: '{ "name": "todo-app", "scripts": { "dev": "next dev" } }',
      },
      {
        path:    'src/app/page.tsx',
        content: 'export default function Page() { return <main>Hello</main> }',
      },
    ],
  },
};