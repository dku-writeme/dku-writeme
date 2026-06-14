// README 생성에 우선 활용할 파일을 선별함

// 파일명을 기준으로 중요한 파일과 선별 이유
const IMPORTANT_FILE_REASONS = {
    'readme.md': '기존 README 파일',
    'readme.txt': '기존 README 파일',
    'readme.rst': '기존 README 파일',
    '.env.example': '환경 변수 예시 파일',
    '.env.local.example': '환경 변수 예시 파일',
    '.env.sample': '환경 변수 예시 파일',
    '.env.template': '환경 변수 예시 파일',
    'package.json': 'Node.js 의존성 및 실행 스크립트 파일',
    'requirements.txt': 'Python 의존성 파일',
    'pyproject.toml': 'Python 프로젝트 설정 및 의존성 파일',
    'setup.py': 'Python 패키지 설정 파일',
    'build.gradle': 'Gradle 빌드 설정 파일',
    'pom.xml': 'Maven 빌드 설정 파일',
    'go.mod': 'Go 모듈 의존성 파일',
    'cargo.toml': 'Rust 패키지 설정 파일',
}

// 경로에 포함되면 주요 소스 파일로 판단할 폴더명과 역할
const DIRECTORY_ROLE_INFO = {
    src: { priority: 2, role: 'source' },
    app: { priority: 2, role: 'source' },
    pages: { priority: 2, role: 'page' },
    views: { priority: 2, role: 'page' },
    routes: { priority: 1, role: 'route' },
    routers: { priority: 1, role: 'route' },
    controllers: { priority: 1, role: 'controller' },
    handlers: { priority: 1, role: 'controller' },
    services: { priority: 1, role: 'service' },
    usecases: { priority: 1, role: 'service' },
    components: { priority: 2, role: 'component' },
    hooks: { priority: 2, role: 'hook' },
    store: { priority: 2, role: 'store' },
    stores: { priority: 2, role: 'store' },
    state: { priority: 2, role: 'store' },
    models: { priority: 1, role: 'data' },
    entities: { priority: 1, role: 'data' },
    schemas: { priority: 1, role: 'data' },
    repositories: { priority: 1, role: 'data' },
    api: { priority: 2, role: 'api' },
    lib: { priority: 2, role: 'library' },
    utils: { priority: 2, role: 'utility' },
    helpers: { priority: 2, role: 'utility' },
    commands: { priority: 2, role: 'cli' },
    cli: { priority: 2, role: 'cli' },
    bin: { priority: 2, role: 'cli' },
    scripts: { priority: 2, role: 'script' },
    test: { priority: 2, role: 'test' },
    tests: { priority: 2, role: 'test' },
    __tests__: { priority: 2, role: 'test' },
    spec: { priority: 2, role: 'test' },
}

// 파일명만으로도 프로젝트 동작 파악에 중요한 소스 파일
const IMPORTANT_SOURCE_PATTERNS = [
    {
        pattern: /Application\.(java|kt)$/,
        priority: 1,
        role: 'entry',
    },
    {
        pattern: /(Controller|Handler|Route|Router)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        role: 'controller',
    },
    {
        pattern: /(Service|UseCase)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        role: 'service',
    },
    {
        pattern: /(Repository|Dao|Model|Entity)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        role: 'data',
    },
    {
        pattern: /(Configuration|Config)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 2,
        role: 'config',
    },
]

const ROLE_WORDS = new Set([
    'app',
    'application',
    'index',
    'main',
    'server',
    'client',
    'api',
    'route',
    'router',
    'controller',
    'handler',
    'service',
    'use',
    'usecase',
    'model',
    'entity',
    'schema',
    'repository',
    'dao',
    'config',
    'configuration',
    'component',
    'format',
    'formatter',
    'page',
    'view',
    'hook',
    'store',
    'state',
    'util',
    'utils',
    'helper',
    'helpers',
    'test',
    'spec',
])

const SUBJECT_LABELS = {
    ai: 'AI',
    api: 'API',
    auth: '인증',
    authorization: '인증',
    billing: '결제',
    cart: '장바구니',
    chat: '채팅',
    comment: '댓글',
    download: '다운로드',
    email: '이메일',
    file: '파일',
    filter: '필터',
    date: '날짜',
    github: 'GitHub',
    gitlab: 'GitLab',
    google: 'Google',
    image: '이미지',
    input: '입력',
    issue: '이슈',
    jwt: 'JWT',
    language: '언어',
    login: '로그인',
    markdown: 'Markdown',
    media: '미디어',
    message: '메시지',
    notification: '알림',
    oauth: 'OAuth',
    order: '주문',
    password: '비밀번호',
    payment: '결제',
    post: '게시글',
    product: '상품',
    profile: '프로필',
    prompt: '프롬프트',
    readme: 'README',
    repo: '저장소',
    repository: '저장소',
    request: '요청',
    response: '응답',
    search: '검색',
    session: '세션',
    token: '토큰',
    upload: '업로드',
    url: 'URL',
    user: '사용자',
    validation: '검증',
    validator: '검증',
}

// README 분석 대상에서 제외할 폴더명
const IGNORED_DIRECTORIES = [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'coverage',
]

const MAX_SELECTED_FILES = 50

function getPathParts(path) {
    // 파일 경로를 폴더/파일명 단위로 나눔
    return path.split('/').filter(Boolean)
}

function isIgnoredPath(path) {
    // 분석에 불필요한 빌드 결과물과 외부 의존성 폴더는 제외
    const parts = getPathParts(path)
    return parts.some((part) => IGNORED_DIRECTORIES.includes(part))
}

function getFilename(path) {
    return path.split('/').pop() || ''
}

function stripKnownExtensions(filename) {
    return filename
        .replace(/\.(test|spec|config|module|d)$/i, '')
        .replace(/\.[^.]+$/i, '')
}

function splitWords(value) {
    return stripKnownExtensions(value)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .map((word) => word.toLowerCase())
        .filter(Boolean)
}

function normalizeWord(word) {
    if (SUBJECT_LABELS[word]) {
        return word
    }

    if (word.endsWith('ies')) {
        return `${word.slice(0, -3)}y`
    }

    if (word.endsWith('s') && word.length > 3) {
        return word.slice(0, -1)
    }

    return word
}

function toTitleWord(word) {
    if (['api', 'css', 'db', 'html', 'http', 'json', 'sql', 'ui', 'url', 'xml'].includes(word)) {
        return word.toUpperCase()
    }

    return word.charAt(0).toUpperCase() + word.slice(1)
}

function getSubjectLabel(path) {
    const parts = getPathParts(path)
    const filename = getFilename(path)
    const fileWords = splitWords(filename)
    const parentWords = parts
        .slice(0, -1)
        .flatMap((part) => splitWords(part))
    const words = [...fileWords, ...parentWords]
    const meaningfulWords = words
        .map(normalizeWord)
        .filter((word) => !ROLE_WORDS.has(word))

    const knownWord = meaningfulWords.find((word) => SUBJECT_LABELS[word])
    if (knownWord) {
        return SUBJECT_LABELS[knownWord]
    }

    const fallbackWord = meaningfulWords.find((word) => word.length > 1)
    return fallbackWord ? toTitleWord(fallbackWord) : null
}

function getDirectoryRoleInfo(parts) {
    const directory = parts.find((part) =>
        DIRECTORY_ROLE_INFO[part] && !['src', 'app'].includes(part)
    ) || parts.find((part) => DIRECTORY_ROLE_INFO[part])

    return directory ? DIRECTORY_ROLE_INFO[directory] : null
}

function scopedReason(path, reason) {
    const parts = getPathParts(path)
    if (parts.length <= 1) {
        return reason
    }

    return `${parts[0]} 영역의 ${reason}`
}

function buildFileReason(path, role) {
    const subject = getSubjectLabel(path)
    const subjectPrefix = subject ? `${subject} ` : ''

    switch (role) {
        case 'entry':
            return subject
                ? `${subject} 기능의 애플리케이션 진입점 파일`
                : '애플리케이션 실행 흐름을 시작하는 진입점 파일'
        case 'controller':
            return subject
                ? `${subject} 요청 흐름을 처리하는 컨트롤러/핸들러 파일`
                : '요청 처리 흐름을 보여주는 컨트롤러/핸들러 파일'
        case 'route':
            return subject
                ? `${subject} 라우팅을 정의하는 파일`
                : '요청 경로와 라우팅을 정의하는 파일'
        case 'service':
            return subject
                ? `${subject} 비즈니스 로직을 담당하는 서비스 파일`
                : '비즈니스 로직을 담당하는 서비스 파일'
        case 'data':
            return subject
                ? `${subject} 데이터 구조와 저장소 흐름을 정의하는 파일`
                : '데이터 모델과 저장소 흐름을 정의하는 파일'
        case 'config':
            return subject
                ? `${subject} 설정을 관리하는 파일`
                : '프로젝트 설정 흐름을 관리하는 파일'
        case 'api':
            return subject
                ? `${subject} API 연동을 담당하는 파일`
                : 'API 요청과 서버 통신을 담당하는 파일'
        case 'component':
            return subject
                ? `${subject} 화면을 구성하는 UI 컴포넌트`
                : '화면을 구성하는 재사용 UI 컴포넌트'
        case 'page':
            return subject
                ? `${subject} 페이지 화면을 구성하는 파일`
                : '페이지 단위 화면을 구성하는 파일'
        case 'hook':
            return subject
                ? `${subject} 흐름을 재사용하는 커스텀 훅`
                : '화면 로직을 재사용하는 커스텀 훅'
        case 'store':
            return subject
                ? `${subject} 상태 관리 로직`
                : '애플리케이션 상태 관리 로직'
        case 'utility':
            return subject
                ? `${subject} 처리에 사용하는 유틸리티 파일`
                : '공통으로 사용하는 유틸리티 파일'
        case 'library':
            return subject
                ? `${subject} 기능을 재사용하기 위한 라이브러리 코드`
                : '공통 기능을 재사용하기 위한 라이브러리 코드'
        case 'cli':
            return subject
                ? `${subject} CLI 명령을 처리하는 파일`
                : 'CLI 명령어와 실행 보조 로직'
        case 'script':
            return subject
                ? `${subject} 작업을 자동화하는 스크립트`
                : '반복 작업을 자동화하는 스크립트'
        case 'test':
            return subject
                ? `${subject} 동작을 검증하는 테스트 파일`
                : '주요 동작을 검증하는 테스트 파일'
        case 'source':
        default:
            return subject
                ? `${subjectPrefix}기능 구현을 담은 주요 소스 파일`
                : '프로젝트 동작 이해에 필요한 주요 소스 파일'
    }
}

function getImportantFileInfo(path) {
    // 파일명 기준으로 README 생성에 직접 필요한 설정 파일인지 확인함
    const filename = getFilename(path).toLowerCase()
    const originalFilename = getFilename(path)
    if (filename === 'readme' || filename.startsWith('readme.')) {
        return {
            priority: 1,
            reason: '기존 README 파일',
        }
    }

    if (IMPORTANT_FILE_REASONS[filename]) {
        return {
            priority: 1,
            reason: scopedReason(path, IMPORTANT_FILE_REASONS[filename]),
        }
    }

    const sourcePattern = IMPORTANT_SOURCE_PATTERNS.find(({ pattern }) => pattern.test(originalFilename))
    if (sourcePattern) {
        return {
            priority: sourcePattern.priority,
            reason: buildFileReason(path, sourcePattern.role),
        }
    }

    // 경로에 핵심 소스 폴더가 포함되어 있으면 분석 후보로 선별
    const parts = getPathParts(path)
    const directoryInfo = getDirectoryRoleInfo(parts)
    if (directoryInfo) {
        return {
            priority: directoryInfo.priority,
            reason: buildFileReason(path, directoryInfo.role),
        }
    }

    return null
}

export function selectImportantFiles(files) {
    // 전체 파일 트리 중 README 생성에 필요한 파일만 선별
    return files
        .filter((file) => file.type === 'blob')
        .filter((file) => !isIgnoredPath(file.path))
        .map((file) => {
            const info = getImportantFileInfo(file.path)
            return {
                ...file,
                ...info,
            }
        })
        .filter((file) => file.reason)
        .sort((a, b) => {
            // 설정 파일을 우선하고, 같은 우선순위에서는 루트에 가까운 파일을 먼저 배치
            const priorityDiff = a.priority - b.priority
            if (priorityDiff !== 0) {
                return priorityDiff
            }

            const sizeDiff = a.size - b.size
            if (sizeDiff !== 0 && a.priority > 1) {
                return sizeDiff
            }

            return getPathParts(a.path).length - getPathParts(b.path).length
        })
        .slice(0, MAX_SELECTED_FILES)
}
