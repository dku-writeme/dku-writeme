// README 생성에 우선 활용할 파일을 선별함

// 파일명을 기준으로 중요한 파일과 선별 이유
const IMPORTANT_FILE_REASONS = {
    'readme.md': '기존 README 파일',
    'readme.txt': '기존 README 파일',
    'readme.rst': '기존 README 파일',
    'package.json': 'Node.js 의존성 및 실행 스크립트 파일',
    'requirements.txt': 'Python 의존성 파일',
    'pyproject.toml': 'Python 프로젝트 설정 및 의존성 파일',
    'setup.py': 'Python 패키지 설정 파일',
    'build.gradle': 'Gradle 빌드 설정 파일',
    'pom.xml': 'Maven 빌드 설정 파일',
    'go.mod': 'Go 모듈 의존성 파일',
    'cargo.toml': 'Rust 패키지 설정 파일',
}

// 경로에 포함되면 주요 소스 파일로 판단할 폴더명
const IMPORTANT_DIRECTORIES = [
    'src',
    'app',
    'pages',
    'routes',
    'controllers',
    'services',
    'components',
    'commands',
    'cli',
    'bin',
    'test',
    'tests',
    '__tests__',
]

// 파일명만으로도 프로젝트 동작 파악에 중요한 소스 파일
const IMPORTANT_SOURCE_PATTERNS = [
    {
        pattern: /Application\.(java|kt)$/,
        priority: 1,
        reason: '애플리케이션 진입점 파일',
    },
    {
        pattern: /(Controller|Handler|Route|Router)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        reason: '요청 처리 흐름을 보여주는 컨트롤러/라우터 파일',
    },
    {
        pattern: /(Service|UseCase)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        reason: '비즈니스 로직을 보여주는 서비스 파일',
    },
    {
        pattern: /(Repository|Dao|Model|Entity)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 1,
        reason: '데이터 모델과 저장소 흐름을 보여주는 파일',
    },
    {
        pattern: /(Configuration|Config)\.(java|kt|js|ts|jsx|tsx|py|go|rb|php)$/,
        priority: 2,
        reason: '프로젝트 설정 흐름을 보여주는 파일',
    },
]

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

function getImportantFileInfo(path) {
    // 파일명 기준으로 README 생성에 직접 필요한 설정 파일인지 확인함
    const filename = path.split('/').pop().toLowerCase()
    const originalFilename = path.split('/').pop()
    if (filename === 'readme' || filename.startsWith('readme.')) {
        return {
            priority: 1,
            reason: '기존 README 파일',
        }
    }

    if (IMPORTANT_FILE_REASONS[filename]) {
        return {
            priority: 1,
            reason: IMPORTANT_FILE_REASONS[filename],
        }
    }

    const sourcePattern = IMPORTANT_SOURCE_PATTERNS.find(({ pattern }) => pattern.test(originalFilename))
    if (sourcePattern) {
        return {
            priority: sourcePattern.priority,
            reason: sourcePattern.reason,
        }
    }

    // 경로에 핵심 소스 폴더가 포함되어 있으면 분석 후보로 선별
    const parts = getPathParts(path)
    const directory = parts.find((part) => IMPORTANT_DIRECTORIES.includes(part))
    if (directory) {
        return {
            priority: 2,
            reason: `${directory} 폴더의 주요 파일`,
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
