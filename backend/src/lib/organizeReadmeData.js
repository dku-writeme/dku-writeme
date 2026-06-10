// README 생성에 바로 사용할 수 있도록 저장소/파일/분석 정보를 한 구조로 정리함
import { buildReadmeModelInput, selectFilesForLLM } from '../repository-analysis/fileSelector.js'

function getTopLevelDirectories(files) {
  // 전체 파일 경로에서 최상위 폴더명만 중복 없이 수집
  const directories = new Set()

  files.forEach((file) => {
    const [topLevelPath] = file.path.split('/')
    if (file.path.includes('/') && topLevelPath) {
      directories.add(topLevelPath)
    }
  })

  return Array.from(directories).sort()
}

function findFileByName(fileContents, filename) {
  // 조회된 파일 내용 목록에서 파일명과 일치하는 파일을 찾음
  return fileContents.find((file) => {
    const currentFilename = file.path.split('/').pop().toLowerCase()
    return currentFilename === filename
  })
}

function isReadmeFile(file) {
  // README, README.md, README.rst 등 README 계열 파일인지 확인
  const filename = file.path.split('/').pop().toLowerCase()
  return filename === 'readme' || filename.startsWith('readme.')
}

const NODE_TECH_STACK_PACKAGES = {
  '@angular/core': 'Angular',
  '@nestjs/core': 'NestJS',
  '@reduxjs/toolkit': 'Redux Toolkit',
  '@sveltejs/kit': 'SvelteKit',
  '@vitejs/plugin-react': 'Vite',
  '@vue/cli-service': 'Vue CLI',
  '@vue/runtime-core': 'Vue.js',
  astro: 'Astro',
  axios: 'Axios',
  cypress: 'Cypress',
  express: 'Express',
  fastify: 'Fastify',
  jest: 'Jest',
  jquery: 'jQuery',
  next: 'Next.js',
  nuxt: 'Nuxt',
  pinia: 'Pinia',
  playwright: 'Playwright',
  react: 'React',
  redux: 'Redux',
  sass: 'Sass',
  svelte: 'Svelte',
  tailwindcss: 'Tailwind CSS',
  typescript: 'TypeScript',
  vite: 'Vite',
  vitest: 'Vitest',
  vue: 'Vue.js',
  vuex: 'Vuex',
}

const PYTHON_TECH_STACK_PACKAGES = {
  django: 'Django',
  fastapi: 'FastAPI',
  flask: 'Flask',
  numpy: 'NumPy',
  pandas: 'Pandas',
  pydantic: 'Pydantic',
  pytest: 'pytest',
  requests: 'Requests',
  sqlalchemy: 'SQLAlchemy',
  uvicorn: 'Uvicorn',
}

function parsePackageJson(fileContents) {
  // 여러 package.json이 있으면 의존성과 스크립트를 합쳐 기술 스택 탐지에 활용
  const packageFiles = fileContents.filter((file) => {
    const currentFilename = file.path.split('/').pop().toLowerCase()
    return currentFilename === 'package.json'
  })

  if (packageFiles.length === 0) {
    return null
  }

  const mergedPackageJson = {
    name: null,
    version: null,
    scripts: {},
    dependencies: new Set(),
    devDependencies: new Set(),
  }

  try {
    // package.json 문자열을 객체로 변환해 필요한 항목만 정리
    packageFiles.forEach((packageFile) => {
      const packageJson = JSON.parse(packageFile.content)

      mergedPackageJson.name ||= packageJson.name || null
      mergedPackageJson.version ||= packageJson.version || null
      mergedPackageJson.scripts = {
        ...mergedPackageJson.scripts,
        ...(packageJson.scripts || {}),
      }
      Object.keys(packageJson.dependencies || {}).forEach((name) => {
        mergedPackageJson.dependencies.add(name)
      })
      Object.keys(packageJson.devDependencies || {}).forEach((name) => {
        mergedPackageJson.devDependencies.add(name)
      })
    })

    return {
      name: mergedPackageJson.name,
      version: mergedPackageJson.version,
      scripts: mergedPackageJson.scripts,
      dependencies: Array.from(mergedPackageJson.dependencies),
      devDependencies: Array.from(mergedPackageJson.devDependencies),
    }
  } catch (error) {
    console.error('package.json 분석 중 오류가 발생했습니다: ', error)
    return null
  }
}

function hasFile(files, filename) {
  return files.some((file) => file.path.split('/').pop() === filename)
}

function hasPath(files, pattern) {
  return files.some((file) => pattern.test(file.path))
}

function hasDependencyText(content, dependencyName) {
  const escapedName = dependencyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9_.-])${escapedName}([^a-z0-9_.-]|$)`, 'i').test(content)
}

function getPrimaryLanguage(repoInfo, files) {
  if (hasPath(files, /\.java$/)) return 'Java'
  if (hasPath(files, /\.tsx?$/)) return 'TypeScript'
  if (hasPath(files, /\.jsx?$/)) return 'JavaScript'
  if (hasPath(files, /\.py$/)) return 'Python'
  if (hasPath(files, /\.go$/)) return 'Go'
  if (hasPath(files, /\.rs$/)) return 'Rust'
  return repoInfo.language
}

function detectBuildTools(files) {
  const tools = []

  if (hasFile(files, 'pom.xml')) tools.push('Maven')
  if (hasFile(files, 'build.gradle') || hasFile(files, 'build.gradle.kts')) tools.push('Gradle')
  if (hasFile(files, 'package.json')) tools.push('npm')
  if (hasFile(files, 'requirements.txt') || hasFile(files, 'pyproject.toml')) tools.push('Python')
  if (hasFile(files, 'go.mod')) tools.push('Go modules')
  if (hasFile(files, 'Cargo.toml')) tools.push('Cargo')

  return tools
}

function detectTechStack(repoInfo, files, selectedFileContents, packageJson) {
  const stack = new Set()
  const allContent = selectedFileContents.map((file) => file.content).join('\n')
  const primaryLanguage = getPrimaryLanguage(repoInfo, files)
  const nodePackages = new Set([
    ...(packageJson?.dependencies || []),
    ...(packageJson?.devDependencies || []),
  ])

  if (primaryLanguage && primaryLanguage !== 'None') stack.add(primaryLanguage)
  if (hasFile(files, 'package.json')) stack.add('Node.js')
  if (hasPath(files, /\.tsx?$/) || nodePackages.has('typescript')) stack.add('TypeScript')

  if (
    /spring-boot|org\.springframework\.boot/i.test(allContent) ||
    hasDependencyText(allContent, 'spring-boot-starter') ||
    hasPath(files, /Application\.java$/)
  ) {
    stack.add('Spring Boot')
  }
  if (/jquery|\$\(/i.test(allContent)) stack.add('jQuery')
  if (/from\s+fastapi\s+import|import\s+fastapi/i.test(allContent)) stack.add('FastAPI')
  if (/thymeleaf/i.test(allContent) || hasPath(files, /src\/main\/resources\/templates\//)) {
    stack.add('Thymeleaf')
  }
  if (/h2database|com\.h2database|jdbc:h2/i.test(allContent)) stack.add('H2 Database')
  if (/mysql/i.test(allContent) || hasPath(files, /mysql/i)) stack.add('MySQL')
  if (/postgres/i.test(allContent) || hasPath(files, /postgres/i)) stack.add('PostgreSQL')
  if (hasFile(files, 'Dockerfile') || hasFile(files, 'docker-compose.yml')) stack.add('Docker')

  nodePackages.forEach((name) => {
    const stackName = NODE_TECH_STACK_PACKAGES[name]
    if (stackName) {
      stack.add(stackName)
    }
  })

  Object.entries(PYTHON_TECH_STACK_PACKAGES).forEach(([packageName, stackName]) => {
    if (hasDependencyText(allContent, packageName)) {
      stack.add(stackName)
    }
  })

  return Array.from(stack)
}

function detectProjectType(files, techStack) {
  if (techStack.includes('Spring Boot')) return 'Spring Boot web application'
  if (hasFile(files, 'package.json') && hasPath(files, /(^|\/)(pages|app|components)\//)) {
    return 'Frontend application'
  }
  if (hasFile(files, 'package.json')) return 'Node.js project'
  if (hasFile(files, 'pyproject.toml') || hasFile(files, 'requirements.txt')) return 'Python project'
  if (hasFile(files, 'go.mod')) return 'Go project'
  if (hasFile(files, 'Cargo.toml')) return 'Rust project'
  return 'Unknown'
}

function detectCommands(files, packageJson, techStack) {
  if (packageJson) {
    const scripts = packageJson.scripts || {}
    const runScript = scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : scripts.serve ? 'npm run serve' : null

    return {
      install: 'npm install',
      run: runScript,
      build: scripts.build ? 'npm run build' : null,
      test: scripts.test ? 'npm test' : null,
    }
  }

  const hasMaven = hasFile(files, 'pom.xml')
  const hasGradle = hasFile(files, 'build.gradle') || hasFile(files, 'build.gradle.kts')
  const maven = hasFile(files, 'mvnw') ? './mvnw' : 'mvn'
  const gradle = hasFile(files, 'gradlew') ? './gradlew' : 'gradle'
  const isSpringBoot = techStack.includes('Spring Boot')

  if (hasMaven) {
    return {
      install: `${maven} dependency:resolve`,
      run: isSpringBoot ? `${maven} spring-boot:run` : null,
      build: `${maven} package`,
      test: `${maven} test`,
    }
  }

  if (hasGradle) {
    return {
      install: `${gradle} dependencies`,
      run: isSpringBoot ? `${gradle} bootRun` : null,
      build: `${gradle} build`,
      test: `${gradle} test`,
    }
  }

  if (hasFile(files, 'requirements.txt')) {
    return {
      install: 'pip install -r requirements.txt',
      run: null,
      build: null,
      test: 'pytest',
    }
  }

  return {
    install: null,
    run: null,
    build: null,
    test: null,
  }
}

function detectFeatures(files, techStack) {
  const features = []

  if (techStack.includes('Spring Boot')) {
    features.push('Spring Boot 기반 웹 애플리케이션 구조')
  }
  if (hasPath(files, /\/owner\//)) features.push('Owner, Pet, Visit 도메인 관리')
  if (hasPath(files, /\/vet\//)) features.push('Veterinarian 정보 조회 및 관리')
  if (hasPath(files, /src\/main\/resources\/templates\//)) features.push('서버 사이드 HTML 템플릿 화면 제공')
  if (hasPath(files, /src\/main\/resources\/db\//)) features.push('H2, MySQL, PostgreSQL 데이터베이스 초기화 스크립트 제공')
  if (hasFile(files, 'docker-compose.yml')) features.push('Docker Compose 기반 데이터베이스 실행 지원')

  return features
}

function getStructureHighlights(files) {
  const findSegmentPath = (segment) => {
    const matchedFile = files.find((file) => file.path.split('/').includes(segment))

    if (!matchedFile) {
      return null
    }

    const pathParts = matchedFile.path.split('/')
    const segmentIndex = pathParts.indexOf(segment)
    return `${pathParts.slice(0, segmentIndex + 1).join('/')}/`
  }

  // 소규모 저장소에서 자주 쓰이는 폴더/파일 역할을 우선순위대로 탐지
  const candidates = [
    { path: 'src/main/java/', description: '애플리케이션 Java 소스 코드' },
    { path: 'src/main/resources/', description: '설정, 정적 리소스, 템플릿' },
    { path: 'src/main/resources/templates/', description: '화면 템플릿' },
    { path: 'src/main/resources/db/', description: '데이터베이스 스키마와 샘플 데이터' },
    { path: 'src/test/', description: '테스트 코드' },
    { path: 'src/main/', description: '애플리케이션 메인 소스 구조' },
    { path: 'src/', description: '애플리케이션 소스 코드' },
    { path: 'app/', description: '애플리케이션 라우팅 및 화면 구성' },
    { path: 'lib/', description: '공통 라이브러리와 유틸리티 코드' },
    { path: 'utils/', description: '유틸리티 함수' },
    { segment: 'utils', description: '유틸리티 함수' },
    { path: 'helpers/', description: '보조 함수와 헬퍼 코드' },
    { segment: 'helpers', description: '보조 함수와 헬퍼 코드' },
    { path: 'components/', description: 'UI 컴포넌트' },
    { segment: 'components', description: 'UI 컴포넌트' },
    { path: 'hooks/', description: '커스텀 훅' },
    { segment: 'hooks', description: '커스텀 훅' },
    { path: 'pages/', description: '페이지 단위 화면' },
    { segment: 'pages', description: '페이지 단위 화면' },
    { path: 'layouts/', description: '공통 레이아웃' },
    { segment: 'layouts', description: '공통 레이아웃' },
    { path: 'views/', description: '화면 뷰 템플릿' },
    { segment: 'views', description: '화면 뷰 템플릿' },
    { path: 'templates/', description: '서버 렌더링 템플릿' },
    { segment: 'templates', description: '서버 렌더링 템플릿' },
    { path: 'api/', description: 'API 연동 및 요청 처리 코드' },
    { segment: 'api', description: 'API 연동 및 요청 처리 코드' },
    { path: 'routes/', description: '라우팅 정의' },
    { segment: 'routes', description: '라우팅 정의' },
    { path: 'controllers/', description: '요청 처리 컨트롤러' },
    { segment: 'controllers', description: '요청 처리 컨트롤러' },
    { path: 'middleware/', description: '요청/응답 미들웨어' },
    { segment: 'middleware', description: '요청/응답 미들웨어' },
    { path: 'validators/', description: '입력값 검증 로직' },
    { segment: 'validators', description: '입력값 검증 로직' },
    { path: 'services/', description: '비즈니스 로직 서비스' },
    { segment: 'services', description: '비즈니스 로직 서비스' },
    { path: 'usecases/', description: '유스케이스 단위 비즈니스 로직' },
    { segment: 'usecases', description: '유스케이스 단위 비즈니스 로직' },
    { path: 'jobs/', description: '백그라운드 작업' },
    { segment: 'jobs', description: '백그라운드 작업' },
    { path: 'workers/', description: '백그라운드 워커' },
    { segment: 'workers', description: '백그라운드 워커' },
    { path: 'tasks/', description: '작업 스케줄링 및 태스크' },
    { segment: 'tasks', description: '작업 스케줄링 및 태스크' },
    { path: 'models/', description: '데이터 모델' },
    { segment: 'models', description: '데이터 모델' },
    { path: 'entities/', description: '도메인 엔티티' },
    { segment: 'entities', description: '도메인 엔티티' },
    { path: 'schemas/', description: '데이터 스키마' },
    { segment: 'schemas', description: '데이터 스키마' },
    { path: 'types/', description: '공통 타입 정의' },
    { segment: 'types', description: '공통 타입 정의' },
    { path: 'constants/', description: '상수 정의' },
    { segment: 'constants', description: '상수 정의' },
    { path: 'store/', description: '상태 관리 로직' },
    { segment: 'store', description: '상태 관리 로직' },
    { path: 'stores/', description: '상태 관리 로직' },
    { segment: 'stores', description: '상태 관리 로직' },
    { path: 'state/', description: '상태 관리 로직' },
    { segment: 'state', description: '상태 관리 로직' },
    { path: 'db/', description: '데이터베이스 관련 파일' },
    { segment: 'db', description: '데이터베이스 관련 파일' },
    { path: 'database/', description: '데이터베이스 관련 파일' },
    { segment: 'database', description: '데이터베이스 관련 파일' },
    { path: 'migrations/', description: '데이터베이스 마이그레이션' },
    { segment: 'migrations', description: '데이터베이스 마이그레이션' },
    { path: 'prisma/', description: 'Prisma 스키마와 데이터베이스 설정' },
    { segment: 'prisma', description: 'Prisma 스키마와 데이터베이스 설정' },
    { path: 'seed/', description: '초기 데이터와 시드 스크립트' },
    { segment: 'seed', description: '초기 데이터와 시드 스크립트' },
    { path: 'seeds/', description: '초기 데이터와 시드 스크립트' },
    { segment: 'seeds', description: '초기 데이터와 시드 스크립트' },
    { path: 'tests/', description: '테스트 코드' },
    { segment: 'tests', description: '테스트 코드' },
    { path: 'test/', description: '테스트 코드' },
    { segment: 'test', description: '테스트 코드' },
    { path: '__tests__/', description: '테스트 코드' },
    { segment: '__tests__', description: '테스트 코드' },
    { path: 'spec/', description: '테스트 코드' },
    { segment: 'spec', description: '테스트 코드' },
    { path: 'mocks/', description: '테스트 및 개발용 목 데이터' },
    { segment: 'mocks', description: '테스트 및 개발용 목 데이터' },
    { path: 'fixtures/', description: '테스트용 고정 데이터' },
    { segment: 'fixtures', description: '테스트용 고정 데이터' },
    { path: 'docs/', description: '프로젝트 문서' },
    { segment: 'docs', description: '프로젝트 문서' },
    { path: 'examples/', description: '예제 코드' },
    { segment: 'examples', description: '예제 코드' },
    { path: 'notebooks/', description: '실험 및 분석 노트북' },
    { segment: 'notebooks', description: '실험 및 분석 노트북' },
    { path: 'scripts/', description: '자동화 스크립트' },
    { segment: 'scripts', description: '자동화 스크립트' },
    { path: 'bin/', description: '실행 보조 스크립트' },
    { segment: 'bin', description: '실행 보조 스크립트' },
    { path: 'cli/', description: 'CLI 진입점과 명령어' },
    { segment: 'cli', description: 'CLI 진입점과 명령어' },
    { path: 'tools/', description: '개발 및 운영 보조 도구' },
    { segment: 'tools', description: '개발 및 운영 보조 도구' },
    { path: 'public/', description: '공개 정적 리소스' },
    { segment: 'public', description: '공개 정적 리소스' },
    { path: 'static/', description: '정적 리소스' },
    { segment: 'static', description: '정적 리소스' },
    { path: 'assets/', description: '이미지와 정적 에셋' },
    { segment: 'assets', description: '이미지와 정적 에셋' },
    { path: 'styles/', description: '스타일 파일' },
    { segment: 'styles', description: '스타일 파일' },
    { path: 'css/', description: 'CSS 스타일 파일' },
    { segment: 'css', description: 'CSS 스타일 파일' },
    { path: 'scss/', description: 'SCSS 스타일 파일' },
    { segment: 'scss', description: 'SCSS 스타일 파일' },
    { path: 'locales/', description: '다국어 리소스' },
    { segment: 'locales', description: '다국어 리소스' },
    { path: 'i18n/', description: '다국어 설정과 번역 리소스' },
    { segment: 'i18n', description: '다국어 설정과 번역 리소스' },
    { path: 'config/', description: '프로젝트 설정 파일' },
    { segment: 'config', description: '프로젝트 설정 파일' },
    { path: 'configs/', description: '프로젝트 설정 파일' },
    { segment: 'configs', description: '프로젝트 설정 파일' },
    { path: 'cmd/', description: '애플리케이션 실행 진입점' },
    { segment: 'cmd', description: '애플리케이션 실행 진입점' },
    { path: 'pkg/', description: '재사용 가능한 패키지 코드' },
    { segment: 'pkg', description: '재사용 가능한 패키지 코드' },
    { path: 'internal/', description: '내부 전용 패키지 코드' },
    { segment: 'internal', description: '내부 전용 패키지 코드' },
    { path: 'crates/', description: 'Rust 워크스페이스 크레이트' },
    { segment: 'crates', description: 'Rust 워크스페이스 크레이트' },
    { path: 'k8s/', description: 'Kubernetes 배포 설정' },
    { segment: 'k8s', description: 'Kubernetes 배포 설정' },
    { path: 'deploy/', description: '배포 설정과 스크립트' },
    { segment: 'deploy', description: '배포 설정과 스크립트' },
    { path: 'deployment/', description: '배포 설정과 스크립트' },
    { segment: 'deployment', description: '배포 설정과 스크립트' },
    { path: 'infra/', description: '인프라 구성 파일' },
    { segment: 'infra', description: '인프라 구성 파일' },
    { path: 'terraform/', description: 'Terraform 인프라 설정' },
    { segment: 'terraform', description: 'Terraform 인프라 설정' },
    { path: 'helm/', description: 'Helm 배포 차트' },
    { segment: 'helm', description: 'Helm 배포 차트' },
    { path: '.github/workflows/', description: 'GitHub Actions 워크플로' },
    { path: '.github/dependabot.yml', description: 'Dependabot 의존성 업데이트 설정' },
    { pattern: /(^|\/)Dockerfile$/, path: 'Dockerfile', description: 'Docker 이미지 빌드 설정' },
    { pattern: /(^|\/)docker-compose\.ya?ml$/, path: 'docker-compose.yml', description: 'Docker Compose 서비스 구성' },
    { pattern: /(^|\/)\.env\.example$/, path: '.env.example', description: '환경 변수 예시 파일' },
    { pattern: /(^|\/)Makefile$/, path: 'Makefile', description: '반복 작업 자동화 명령' },
    { pattern: /(^|\/)tsconfig\.json$/, path: 'tsconfig.json', description: 'TypeScript 컴파일 설정' },
    { pattern: /(^|\/)vite\.config\.[cm]?[jt]s$/, path: 'vite.config.*', description: 'Vite 빌드 설정' },
    { pattern: /(^|\/)next\.config\.[cm]?[jt]s$/, path: 'next.config.*', description: 'Next.js 애플리케이션 설정' },
    { pattern: /(^|\/)tailwind\.config\.[cm]?[jt]s$/, path: 'tailwind.config.*', description: 'Tailwind CSS 설정' },
    { pattern: /(^|\/)(eslint\.config\.[cm]?[jt]s|\.eslintrc(\.[cm]?[jt]s|\.json|\.ya?ml)?)$/, path: 'eslint.config.*', description: 'ESLint 코드 품질 설정' },
    { pattern: /(^|\/)(prettier\.config\.[cm]?[jt]s|\.prettierrc(\.[cm]?[jt]s|\.json|\.ya?ml)?)$/, path: 'prettier.config.*', description: 'Prettier 코드 포맷 설정' },
    { pattern: /(^|\/)(jest|vitest|playwright|cypress)\.config\.[cm]?[jt]s$/, path: 'test config', description: '테스트 도구 설정' },
    { pattern: /(^|\/)nginx\.conf$/, path: 'nginx.conf', description: 'Nginx 서버 설정' },
    { pattern: /(^|\/)package\.json$/, path: 'package.json', description: 'Node.js 의존성 및 실행 스크립트' },
    { pattern: /(^|\/)(requirements\.txt|pyproject\.toml)$/, path: 'requirements.txt / pyproject.toml', description: 'Python 의존성 및 프로젝트 설정' },
    { pattern: /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/, path: 'pom.xml / build.gradle', description: 'Java 빌드 설정' },
    { pattern: /(^|\/)go\.mod$/, path: 'go.mod', description: 'Go 모듈 설정' },
    { pattern: /(^|\/)Cargo\.toml$/, path: 'Cargo.toml', description: 'Rust 패키지 설정' },
  ]
  const seenPaths = new Set()

  return candidates
    .map((candidate) => {
      if (!candidate.segment) {
        return candidate
      }

      const segmentPath = findSegmentPath(candidate.segment)
      return segmentPath ? { ...candidate, path: segmentPath } : candidate
    })
    .filter((candidate) => {
      const matched = candidate.pattern
        ? files.some((file) => candidate.pattern.test(file.path))
        : candidate.segment
          ? Boolean(candidate.path)
        : files.some((file) => file.path.startsWith(candidate.path))

      if (!matched || seenPaths.has(candidate.path)) {
        return false
      }

      seenPaths.add(candidate.path)
      return true
    })
    .map(({ path, description }) => ({ path, description }))
    .slice(0, 12)
}

function getContentPreview(content) {
  // 긴 파일 내용을 그대로 보여주지 않고 앞부분 일부만 미리보기로
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n')
}

function buildContentMap(selectedFileContents) {
  // repository-analysis 모듈이 요구하는 { path: content } 형태로 변환
  return selectedFileContents.reduce((fileMap, file) => {
    fileMap[file.path] = file.content
    return fileMap
  }, {})
}

function buildRepositoryAnalysis(repoInfo, selectedFileContents) {
  const fileContentMap = buildContentMap(selectedFileContents)
  const selection = selectFilesForLLM(fileContentMap, {
    maxFiles: 15,
    maxTotalTokens: 24000,
  })

  return {
    modelInput: buildReadmeModelInput(
      fileContentMap,
      {
        name: repoInfo.name,
        description: repoInfo.description === 'None' ? '' : repoInfo.description,
      },
      {
        maxFiles: 15,
        maxTotalTokens: 24000,
      }
    ),
    selection: {
      profile: selection.profile,
      totalTokens: selection.totalTokens,
      monorepo: selection.monorepo,
      files: selection.files.map((file) => ({
        path: file.path,
        score: file.score,
        profile: file.profile,
      })),
    },
  }
}

export function organizeReadmeData(repoInfo, files, selectedFiles, selectedFileContents) {
  // 핵심 파일 내용에서 package.json과 기존 README 여부를 먼저 분석
  const packageJson = parsePackageJson(selectedFileContents)
  const existingReadme = selectedFileContents.find(isReadmeFile)
  const repositoryAnalysis = buildRepositoryAnalysis(repoInfo, selectedFileContents)
  const buildTools = detectBuildTools(files)
  const techStack = detectTechStack(repoInfo, files, selectedFileContents, packageJson)
  const commands = detectCommands(files, packageJson, techStack)
  const projectType = detectProjectType(files, techStack)
  const detectedFeatures = detectFeatures(files, techStack)
  const primaryLanguage = getPrimaryLanguage(repoInfo, files)

  return {
    // README 상단 정보와 링크 영역에 사용할 저장소 기본 정보
    repository: {
      name: repoInfo.name,
      fullName: repoInfo.fullName,
      description: repoInfo.description,
      language: primaryLanguage,
      url: repoInfo.url,
      license: repoInfo.license,
      defaultBranch: repoInfo.defaultBranch,
      topics: repoInfo.topics,
      homepage: repoInfo.homepage,
      openIssues: repoInfo.openIssues,
      createdAt: repoInfo.createdAt,
      updatedAt: repoInfo.updatedAt,
    },
    // 전체 파일 수와 분석 대상 파일 수를 요약해서 제공
    fileSummary: {
      totalCount: files.length,
      selectedCount: selectedFiles.length,
      contentCount: selectedFileContents.length,
      topLevelDirectories: getTopLevelDirectories(files),
      structureHighlights: getStructureHighlights(files),
    },
    // README 생성에 필요하다고 선별된 핵심 파일 목록
    importantFiles: selectedFiles.map((file) => ({
      path: file.path,
      type: file.type,
      size: file.size,
      reason: file.reason,
      priority: file.priority,
    })),
    // 실제 내용을 조회한 파일 목록과 간단한 미리보기 정보
    sourceFiles: selectedFileContents.map((file) => ({
      path: file.path,
      size: file.size,
      reason: file.reason,
      priority: file.priority,
      content: file.content,
      preview: getContentPreview(file.content),
    })),
    // README 템플릿에서 바로 참고할 수 있는 분석 결과
    analysis: {
      hasExistingReadme: Boolean(existingReadme),
      packageName: packageJson?.name || null,
      packageVersion: packageJson?.version || null,
      scripts: packageJson?.scripts || {},
      dependencies: packageJson?.dependencies || [],
      devDependencies: packageJson?.devDependencies || [],
      projectType,
      primaryLanguage,
      buildTools,
      techStack,
      commands,
      detectedFeatures,
      repositoryProfile: repositoryAnalysis.selection.profile,
      monorepo: repositoryAnalysis.selection.monorepo,
      totalTokens: repositoryAnalysis.selection.totalTokens,
      suggestedSections: [
        '프로젝트 소개',
        '주요 기능',
        '기술 스택',
        '실행 스크립트',
        '라이선스',
      ],
    },
    // C: HuggingFace README 생성 프롬프트에 바로 전달할 수 있는 모델 입력
    modelInput: repositoryAnalysis.modelInput,
    // B: repository-analysis가 최종 선별한 파일과 분석 메타데이터
    repositoryAnalysis: repositoryAnalysis.selection,
  }
}
