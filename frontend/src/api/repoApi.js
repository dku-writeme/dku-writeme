// 백엔드에서 받아온 저장소 정보를 README markdown으로 변환하는 템플릿 모음
const DEFAULT_API_BASE_URL = 'http://localhost:3000'
const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

// README 생성 옵션의 기본값. 사용자가 일부 섹션만 넘겨도 나머지는 여기 값으로 채움
const DEFAULT_OPTIONS = {
  sections: {
    overview: true,
    features: true,
    techStack: true,
    projectStructure: true,
    // 최종 배포 기본값은 안정적인 요약 섹션 위주로 구성함
    importantFiles: false,
    scripts: false,
    license: true,
    link: true,
  },
}

// README 제목과 안내 문구를 한 곳에서 관리해 템플릿 생성 로직에서 하드코딩을 줄임
const TEXT = {
  features: '✨ 주요 기능',
  projectStructure: '📁 프로젝트 구조',
  importantFiles: '🔑 핵심 파일',
  availableScripts: '🚀 설치 및 실행 방법',
  license: '📄 라이선스',
  link: '🔗 링크',
  overview: '📌 개요',
  techStack: '🛠 기술 스택',
  none: '없음',
  noInstallCommand: '감지된 설치 명령어가 없습니다.',
  noRunCommand: '감지된 실행 명령어가 없습니다.',
  noBuildCommand: '감지된 빌드 명령어가 없습니다.',
  noTestCommand: '감지된 테스트 명령어가 없습니다.',
  noLicense: '제공된 라이선스 정보가 없습니다.',
  licenseText: (license) => `이 프로젝트는 ${license} 라이선스를 따릅니다.`,
}

// 예전 호출 방식이나 부분 옵션 객체가 들어와도 내부에서는 항상 같은 형태로 다루기 위한 정규화
const normalizeOptions = (options = {}) => {
  if (typeof options === 'string') {
    return {
      ...DEFAULT_OPTIONS,
    }
  }

  return {
    ...DEFAULT_OPTIONS,
    ...options,
    sections: {
      ...DEFAULT_OPTIONS.sections,
      ...(options.sections || {}),
    },
  }
}

const enabled = (sections, key) => sections[key] !== false

// 선택 해제된 섹션은 빈 문자열을 반환해 joinBlocks 단계에서 자연스럽게 제외되게 함
const sectionBlock = (sections, key, title, content) => {
  if (!enabled(sections, key)) {
    return ''
  }

  return `## ${title}\n\n${content}`
}

const joinBlocks = (blocks) => blocks.filter(Boolean).join('\n\n')

const BADGE_STYLE = 'flat-square'
const LANGUAGE_BADGE_COLORS = {
  JavaScript: 'f7df1e',
  TypeScript: '3178c6',
  Python: '3776ab',
  Java: '007396',
  Kotlin: '7f52ff',
  Swift: 'f05138',
  Dart: '0175c2',
  Go: '00add8',
  Rust: 'dea584',
  Ruby: 'cc342d',
  PHP: '777bb4',
}

const normalizeBadgeValue = (value) => {
  const normalizedValue = String(value || '').trim()

  return normalizedValue && normalizedValue !== 'None' ? normalizedValue : ''
}

const getRepositoryFullName = (repoInfo) => {
  const fullName = normalizeBadgeValue(
    repoInfo.fullName || repoInfo.readmeData?.repository?.fullName
  )

  if (fullName) {
    return fullName
  }

  const matchedUrl = normalizeBadgeValue(repoInfo.url).match(/github\.com\/([^/]+\/[^/#?]+)/i)

  return matchedUrl?.[1] || ''
}

const encodeBadgePath = (value) =>
  value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const escapeStaticBadgeSegment = (value) =>
  encodeURIComponent(String(value).replace(/-/g, '--').replace(/_/g, '__').replace(/\s+/g, '_'))

const createStaticBadge = (label, message, color = 'blue') =>
  `![${label}](https://img.shields.io/badge/${escapeStaticBadgeSegment(label)}-${escapeStaticBadgeSegment(message)}-${color}?style=${BADGE_STYLE})`

const formatReadmeBadges = (repoInfo) => {
  const repository = repoInfo.readmeData?.repository || {}
  const fullName = getRepositoryFullName(repoInfo)
  const encodedRepositoryPath = fullName ? encodeBadgePath(fullName) : ''
  const language = normalizeBadgeValue(
    repoInfo.language || repository.language || repoInfo.readmeData?.analysis?.primaryLanguage
  )
  const license = normalizeBadgeValue(repoInfo.license || repository.license)

  if (encodedRepositoryPath) {
    return [
      language ? `![GitHub top language](https://img.shields.io/github/languages/top/${encodedRepositoryPath}?style=${BADGE_STYLE})` : '',
      license ? `![GitHub License](https://img.shields.io/github/license/${encodedRepositoryPath}?style=${BADGE_STYLE})` : '',
      `![GitHub stars](https://img.shields.io/github/stars/${encodedRepositoryPath}?style=${BADGE_STYLE})`,
      `![GitHub forks](https://img.shields.io/github/forks/${encodedRepositoryPath}?style=${BADGE_STYLE})`,
    ].filter(Boolean).join(' ')
  }

  return [
    language ? createStaticBadge('language', language, LANGUAGE_BADGE_COLORS[language] || 'blue') : '',
    license ? createStaticBadge('license', license, 'blue') : '',
  ].filter(Boolean).join(' ')
}

const FEATURE_TITLE_TRANSLATIONS = new Map([
  ['weather data', '날씨 정보 조회'],
  ['weather information', '날씨 정보 조회'],
  ['air quality index', '대기질 조회'],
  ['air quality data', '대기질 조회'],
  ['market data', '시장 데이터 조회'],
  ['stock market data', '주식 시장 데이터 조회'],
  ['fear and greed index', '투자 심리 지수 조회'],
  ['fear & greed index', '투자 심리 지수 조회'],
  ['caching', '응답 캐싱'],
  ['cache', '응답 캐싱'],
  ['mock data', '목업 데이터 제공'],
  ['fallback data', '대체 데이터 제공'],
  ['repository analysis', '저장소 분석'],
  ['readme generation', 'README 생성'],
  ['markdown editing', 'Markdown 편집'],
  ['markdown preview', 'Markdown 미리보기'],
  ['file download', '파일 다운로드'],
  ['copy to clipboard', '클립보드 복사'],
])

const localizeFeatureTitle = (title) => {
  const normalizedTitle = String(title || '')
    .replace(/\s+/g, ' ')
    .trim()
  const translatedTitle = FEATURE_TITLE_TRANSLATIONS.get(normalizedTitle.toLowerCase())

  return translatedTitle || normalizedTitle
}

const formatStructuredTechStack = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return ''
  }

  const tableHeaders = ['분류', '기술']
  const blocks = sections
    .map((section) => {
      const rows = (section.rows || [])
        .map((row) => [
          row.category,
          row.technology || row.name,
        ])
        .filter(([category, technology]) => category && technology)

      if (rows.length === 0) {
        return ''
      }

      return `### ${section.label || section.id}\n\n${formatMarkdownTable(tableHeaders, rows)}`
    })
    .filter(Boolean)

  return blocks.join('\n\n')
}

const formatFeatures = (repoInfo) => {
  const features = repoInfo.features || repoInfo.readmeData?.analysis?.detectedFeatures
  const fallbackDescription = '저장소 구조와 핵심 파일 분석을 통해 확인된 기능입니다.'

  // AI 응답은 문자열/배열/여러 줄 bullet 등 형태가 흔들릴 수 있어 한 번 평탄화
  const normalizeFeatureItems = (featureItems) =>
    featureItems
      .flatMap((feature) =>
        String(feature || '')
          .split(/\r?\n/)
          .map((line) => line.replace(/^-+\s*/, '').trim())
      )
      .filter(Boolean)

  const parseFeatureItem = (feature) => {
    const normalizedFeature = feature.replace(/^-+\s*/, '')
      .replace(/^\*\*(.+?)\*\*/, '$1')
      .trim()
    const separatorIndex = normalizedFeature.search(/[:：]/)

    if (separatorIndex === -1) {
      return {
        description: fallbackDescription,
        title: localizeFeatureTitle(normalizedFeature),
      }
    }

    return {
      title: localizeFeatureTitle(normalizedFeature.slice(0, separatorIndex).trim()),
      description: normalizedFeature.slice(separatorIndex + 1).trim() || fallbackDescription,
    }
  }

  const formatFeatureItems = (featureItems) =>
    featureItems
      .map(parseFeatureItem)
      .filter((feature) => feature.title)
      .map((feature) => `**${feature.title}**\n\n- ${feature.description}`)
      .join('\n\n') || `- ${TEXT.none}`

  if (Array.isArray(features) && features.length > 0) {
    return formatFeatureItems(normalizeFeatureItems(features))
  }

  if (typeof features === 'string' && features.trim()) {
    return formatFeatureItems(normalizeFeatureItems([features]))
  }

  return `- ${TEXT.none}`
}

const formatTechStack = (repoInfo) => {
  const analysis = repoInfo.readmeData?.analysis || {}
  const structuredTechStack = formatStructuredTechStack(analysis.techStackSections)

  if (structuredTechStack) {
    return structuredTechStack
  }

  if (Array.isArray(analysis.techStackSections)) {
    const fallbackLanguage = analysis.primaryLanguage || repoInfo.language

    return fallbackLanguage
      ? formatMarkdownTable(['분류', '기술'], [['언어', fallbackLanguage]])
      : `- ${TEXT.none}`
  }

  const structurePaths = repoInfo.readmeData?.fileSummary?.structurePaths || []
  // dependency만으로 잡히지 않는 외부 API, CLI/ML 프레임워크 단서 보조 탐색
  const sourceText = (repoInfo.readmeData?.sourceFiles || [])
    .map((file) => `${file.path}\n${file.content || ''}`)
    .join('\n')
  const techStack = new Set(analysis.techStack || [])
  const tableHeaders = ['분류', '기술']
  const categoryLabels = {
    'Build Tool': '빌드 도구',
    'CI/CD': 'CI/CD',
    Container: '컨테이너',
    'Container Orchestration': '컨테이너 오케스트레이션',
    Database: '데이터베이스',
    Entrypoint: '진입점',
    'External API': '외부 API',
    Framework: '프레임워크',
    'IaC': 'IaC',
    Language: '언어',
    Library: '라이브러리',
    'ML Library': 'ML 라이브러리',
    'Module System': '모듈 시스템',
    Module: '모듈',
    Notebook: '노트북',
    'Orchestration': '오케스트레이션',
    'Package Manager': '패키지 매니저',
    Runtime: '런타임',
    Server: '서버',
    Styling: '스타일링',
    Testing: '테스트',
    'Type Definition': '타입 정의',
    Visualization: '시각화',
  }
  const sectionLabels = {
    application: 'Application',
    backend: 'Backend',
    cli: 'CLI',
    data: 'Data / ML',
    frontend: 'Frontend',
    infrastructure: 'Infrastructure',
    library: 'Library',
  }
  const localizeRows = (rows) =>
    rows.map(([category, value]) => [categoryLabels[category] || category, value])
  const dependencies = new Set([...(analysis.dependencies || []), ...(analysis.devDependencies || [])])
  const dependencyVersions = analysis.dependencyVersions || {}
  const hasDependency = (name) => dependencies.has(name)
  const hasPath = (pattern) => structurePaths.some((file) => pattern.test(file.path))
  const hasSource = (pattern) => pattern.test(sourceText)
  const cleanVersion = (version) =>
    String(version || '')
      .replace(/^[~^><=\s]+/, '')
      .split(/[.\s-]/)[0]

  // README 기술 스택 표가 과하게 길어지지 않도록 패키지 버전은 major 버전만 표시
  const withVersion = (name, packageName = name.toLowerCase()) => {
    const version = cleanVersion(dependencyVersions[packageName])
    return version ? `${name} ${version}` : name
  }
  const nodeVersion = cleanVersion(analysis.engines?.node)
  const externalApiPatterns = [
    [/^https?:\/\/api\.github\.com\//i, 'GitHub API'],
    [/^https?:\/\/api\.openai\.com\//i, 'OpenAI API'],
    [/^https?:\/\/api\.anthropic\.com\//i, 'Anthropic API'],
    [/^https?:\/\/generativelanguage\.googleapis\.com\//i, 'Google Gemini API'],
    [/^https?:\/\/api-inference\.huggingface\.co\//i, 'Hugging Face Inference API'],
    [/^https?:\/\/api\.stripe\.com\//i, 'Stripe API'],
    [/^https?:\/\/api(-m)?\.paypal\.com\//i, 'PayPal API'],
    [/^https?:\/\/api\.twilio\.com\//i, 'Twilio API'],
    [/^https?:\/\/api\.sendgrid\.com\//i, 'SendGrid API'],
    [/^https?:\/\/slack\.com\/api\//i, 'Slack API'],
    [/^https?:\/\/(discord|discordapp)\.com\/api\//i, 'Discord API'],
    [/^https?:\/\/api\.notion\.com\//i, 'Notion API'],
    [/^https?:\/\/[A-Za-z0-9-]+\.supabase\.co\/(rest|auth|storage|functions)\//i, 'Supabase API'],
    [/^https?:\/\/maps\.googleapis\.com\/maps\/api\//i, 'Google Maps API'],
    [/^https?:\/\/(www\.)?googleapis\.com\/youtube\//i, 'YouTube Data API'],
    [/^https?:\/\/youtube\.googleapis\.com\/youtube\//i, 'YouTube Data API'],
    [/^https?:\/\/oauth2\.googleapis\.com\//i, 'Google OAuth API'],
    [/^https?:\/\/www\.googleapis\.com\/calendar\//i, 'Google Calendar API'],
    [/^https?:\/\/graph\.facebook\.com\//i, 'Meta Graph API'],
    [/^https?:\/\/api\.x\.com\//i, 'X API'],
    [/^https?:\/\/api\.twitter\.com\//i, 'X API'],
    [/^https?:\/\/dapi\.kakao\.com\//i, 'Kakao API'],
    [/^https?:\/\/kapi\.kakao\.com\//i, 'Kakao API'],
    [/^https?:\/\/openapi\.naver\.com\//i, 'Naver Open API'],
    [/^https?:\/\/api\.openweathermap\.org\//i, 'OpenWeather API'],
    [/^https?:\/\/api\.airkorea\.or\.kr\//i, 'AirKorea API'],
    [/^https?:\/\/apis\.data\.go\.kr\/B552584\b/i, 'AirKorea API'],
    [/^https?:\/\/query[12]\.finance\.yahoo\.com\//i, 'Yahoo Finance API'],
    [/^https?:\/\/production\.dataviz\.cnn\.io\//i, 'CNN Fear & Greed API'],
    [/^https?:\/\/apis\.data\.go\.kr\//i, '공공데이터포털 API'],
    [/^https?:\/\/api\.odcloud\.kr\//i, '공공데이터포털 API'],
  ]
  const externalApis = Array.from(sourceText.matchAll(/https?:\/\/[^\s"'`)<]+/g))
    .map((match) => match[0].replace(/[),.;]+$/g, ''))
    .filter((url) => !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url))
    .map((url) => {
      const matchedPattern = externalApiPatterns.find(([pattern]) => pattern.test(url))

      return matchedPattern?.[1] || null
    })
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index)

  if (
    /huggingface-hub|from\s+huggingface_hub\s+import\s+InferenceClient|InferenceClient\s*\(/.test(sourceText) &&
    !externalApis.includes('Hugging Face Inference API')
  ) {
    externalApis.push('Hugging Face Inference API')
  }

  const frontendRows = []
  const backendRows = []
  const libraryRows = []
  const cliRows = []
  const dataRows = []
  const infrastructureRows = []
  const applicationRows = []
  const addRow = (rows, category, value) => {
    if (!value || rows.some((row) => row[0] === category && row[1] === value)) {
      return
    }

    rows.push([category, value])
  }

  // 저장소 성격별 기술 스택 표 분리 기준
  const usesFrontend =
    hasDependency('react') ||
    hasDependency('vue') ||
    hasDependency('@angular/core') ||
    hasDependency('svelte') ||
    hasPath(/\.(jsx|tsx|css|scss)$/)
  const usesBackend =
    techStack.has('Spring Boot') ||
    techStack.has('FastAPI') ||
    techStack.has('Django') ||
    techStack.has('Flask') ||
    techStack.has('Ruby on Rails') ||
    techStack.has('Laravel') ||
    techStack.has('ASP.NET Core') ||
    hasDependency('express') ||
    hasDependency('fastify') ||
    hasDependency('@nestjs/core') ||
    hasPath(/(^|\/)(server|controllers|routes)\//) ||
    hasPath(/(^|\/)(server|app|index)\.(js|ts)$/) ||
    hasSource(/createServer|express|fastify|nestjs|springframework|fastapi/i)
  const usesCli =
    Boolean(analysis.packageEntrypoints?.bin) ||
    hasDependency('commander') ||
    hasDependency('yargs')
  const hasDataScienceLibrary =
    techStack.has('NumPy') ||
    techStack.has('Pandas') ||
    techStack.has('scikit-learn') ||
    techStack.has('TensorFlow') ||
    techStack.has('PyTorch') ||
    techStack.has('Matplotlib')
  const hasNotebook = hasDataScienceLibrary && hasPath(/(^|\/)notebooks?\/.*\.ipynb$/)
  const hasDataScienceDirectory = hasPath(/(^|\/)(data|datasets?|models?)\//)
  // 일반 백엔드 models 폴더가 Data / ML로 오탐되지 않도록 Python 근거와 함께 판정
  const isPythonDataProject = (
    analysis.primaryLanguage === 'Python' ||
    repoInfo.language === 'Python' ||
    techStack.has('Python')
  ) && hasDataScienceDirectory
  const usesData = hasDataScienceLibrary || hasNotebook || isPythonDataProject
  const usesInfrastructure =
    techStack.has('Docker') ||
    hasPath(/(^|\/)Dockerfile$/) ||
    hasPath(/docker-compose\.ya?ml$/) ||
    hasPath(/(^|\/)\.github\/workflows\//) ||
    hasPath(/\.(tf|tfvars)$/) ||
    hasPath(/(^|\/)(k8s|kubernetes|helm|charts)\//)
  const usesLibrary =
    !usesFrontend &&
    !usesBackend &&
    !usesCli &&
    !usesData &&
    (
      Boolean(analysis.packageEntrypoints?.main || analysis.packageEntrypoints?.module || analysis.packageEntrypoints?.types) ||
      hasPath(/(^|\/)src\/lib\.(js|ts|rs)$/) ||
      hasPath(/(^|\/)lib\//) ||
      hasPath(/(^|\/)(setup\.py|pyproject\.toml|Cargo\.toml|composer\.json|Package\.swift)$/)
    )

  // 감지 근거가 있는 섹션만 행 추가, 빈 표 생성 방지
  if (usesFrontend) {
    addRow(
      frontendRows,
      'Language',
      techStack.has('TypeScript') ? 'TypeScript' : repoInfo.language || analysis.primaryLanguage || 'JavaScript'
    )

    if (hasDependency('react')) addRow(frontendRows, 'Framework', withVersion('React', 'react'))
    if (hasDependency('vue')) addRow(frontendRows, 'Framework', withVersion('Vue', 'vue'))
    if (hasDependency('@angular/core')) addRow(frontendRows, 'Framework', withVersion('Angular', '@angular/core'))
    if (hasDependency('svelte')) addRow(frontendRows, 'Framework', withVersion('Svelte', 'svelte'))
    if (hasDependency('vite')) addRow(frontendRows, 'Build Tool', withVersion('Vite', 'vite'))
    if (hasDependency('webpack')) addRow(frontendRows, 'Build Tool', withVersion('Webpack', 'webpack'))
    if (hasDependency('tailwindcss')) addRow(frontendRows, 'Styling', withVersion('Tailwind CSS', 'tailwindcss'))
    else if (hasDependency('sass')) addRow(frontendRows, 'Styling', withVersion('Sass', 'sass'))
    else if (hasDependency('styled-components')) {
      addRow(frontendRows, 'Styling', withVersion('styled-components', 'styled-components'))
    } else if (hasPath(/\.(css|scss)$/)) {
      addRow(frontendRows, 'Styling', hasPath(/\.scss$/) ? 'SCSS' : 'CSS')
    }
  }

  if (usesBackend) {
    if (!techStack.has('Node.js') && (analysis.primaryLanguage || repoInfo.language)) {
      addRow(backendRows, 'Language', analysis.primaryLanguage || repoInfo.language)
    }
    if (techStack.has('Node.js')) addRow(backendRows, 'Runtime', nodeVersion ? `Node.js ${nodeVersion}+` : 'Node.js')
    if (analysis.packageType === 'module') addRow(backendRows, 'Module System', 'ES Modules')
    if (techStack.has('Spring Boot')) addRow(backendRows, 'Framework', 'Spring Boot')
    if (techStack.has('FastAPI')) addRow(backendRows, 'Framework', 'FastAPI')
    if (techStack.has('Django')) addRow(backendRows, 'Framework', 'Django')
    if (techStack.has('Flask')) addRow(backendRows, 'Framework', 'Flask')
    if (techStack.has('Ruby on Rails')) addRow(backendRows, 'Framework', 'Ruby on Rails')
    if (techStack.has('Laravel')) addRow(backendRows, 'Framework', 'Laravel')
    if (techStack.has('ASP.NET Core')) addRow(backendRows, 'Framework', 'ASP.NET Core')
    if (hasDependency('express')) addRow(backendRows, 'Server', withVersion('Express', 'express'))
    else if (hasDependency('fastify')) addRow(backendRows, 'Server', withVersion('Fastify', 'fastify'))
    else if (hasDependency('@nestjs/core')) addRow(backendRows, 'Server', withVersion('NestJS', '@nestjs/core'))
    else if (techStack.has('Node.js')) addRow(backendRows, 'Server', 'Node.js HTTP Server')
    if (techStack.has('H2 Database')) addRow(backendRows, 'Database', 'H2 Database')
    if (techStack.has('MySQL')) addRow(backendRows, 'Database', 'MySQL')
    if (techStack.has('PostgreSQL')) addRow(backendRows, 'Database', 'PostgreSQL')
    if (externalApis.length > 0) addRow(backendRows, 'External API', externalApis.join(', '))
  }

  if (usesLibrary) {
    if (analysis.primaryLanguage || repoInfo.language) {
      addRow(libraryRows, 'Language', analysis.primaryLanguage || repoInfo.language)
    }
    if (analysis.packageEntrypoints?.types) addRow(libraryRows, 'Type Definition', analysis.packageEntrypoints.types)
    if (analysis.packageEntrypoints?.main) addRow(libraryRows, 'Entrypoint', analysis.packageEntrypoints.main)
    if (analysis.packageEntrypoints?.module) addRow(libraryRows, 'Module', analysis.packageEntrypoints.module)
    if (techStack.has('Cargo')) addRow(libraryRows, 'Package Manager', 'Cargo')
    if (techStack.has('Swift Package Manager')) addRow(libraryRows, 'Package Manager', 'Swift Package Manager')
  }

  if (usesCli) {
    if (analysis.primaryLanguage || repoInfo.language) {
      addRow(cliRows, 'Language', analysis.primaryLanguage || repoInfo.language)
    }
    if (hasDependency('commander')) addRow(cliRows, 'Framework', withVersion('Commander', 'commander'))
    if (hasDependency('yargs')) addRow(cliRows, 'Framework', withVersion('Yargs', 'yargs'))
    if (analysis.packageEntrypoints?.bin) addRow(cliRows, 'Entrypoint', 'package.json bin')
  }

  if (usesData) {
    if (analysis.primaryLanguage || repoInfo.language) {
      addRow(dataRows, 'Language', analysis.primaryLanguage || repoInfo.language)
    }
    if (techStack.has('NumPy')) addRow(dataRows, 'Library', 'NumPy')
    if (techStack.has('Pandas')) addRow(dataRows, 'Library', 'Pandas')
    if (techStack.has('scikit-learn')) addRow(dataRows, 'ML Library', 'scikit-learn')
    if (techStack.has('TensorFlow')) addRow(dataRows, 'ML Library', 'TensorFlow')
    if (techStack.has('PyTorch')) addRow(dataRows, 'ML Library', 'PyTorch')
    if (techStack.has('Matplotlib')) addRow(dataRows, 'Visualization', 'Matplotlib')
    if (hasPath(/\.ipynb$/)) addRow(dataRows, 'Notebook', 'Jupyter Notebook')
  }

  if (usesInfrastructure) {
    if (techStack.has('Docker')) addRow(infrastructureRows, 'Container', 'Docker')
    if (hasPath(/docker-compose\.ya?ml$/)) addRow(infrastructureRows, 'Container Orchestration', 'Docker Compose')
    if (hasPath(/(^|\/)\.github\/workflows\//)) addRow(infrastructureRows, 'CI/CD', 'GitHub Actions')
    if (hasPath(/\.(tf|tfvars)$/)) addRow(infrastructureRows, 'IaC', 'Terraform')
    if (hasPath(/(^|\/)(k8s|kubernetes|helm|charts)\//)) {
      addRow(infrastructureRows, 'Orchestration', 'Kubernetes / Helm')
    }
  }

  // 다른 성격으로 분류되지 않은 언어 중심 프로젝트만 Application 섹션으로 표시
  const usesStandaloneApplication =
    !usesFrontend && !usesBackend && !usesLibrary && !usesCli && !usesData

  if (usesStandaloneApplication) {
    if (techStack.has('Flutter') || techStack.has('Dart')) {
      addRow(applicationRows, 'Language', 'Dart')
      if (techStack.has('Flutter')) addRow(applicationRows, 'Framework', 'Flutter')
    }
    if (techStack.has('Swift')) addRow(applicationRows, 'Language', 'Swift')
    if (techStack.has('Swift Package Manager')) {
      addRow(applicationRows, 'Build Tool', 'Swift Package Manager')
    }
    if (techStack.has('Kotlin')) addRow(applicationRows, 'Language', 'Kotlin')
    if (techStack.has('C/C++')) addRow(applicationRows, 'Language', 'C/C++')
    if (techStack.has('CMake')) addRow(applicationRows, 'Build Tool', 'CMake')
    if (techStack.has('Go')) addRow(applicationRows, 'Language', 'Go')
    if (techStack.has('Rust')) addRow(applicationRows, 'Language', 'Rust')
    if (techStack.has('Scala')) addRow(applicationRows, 'Language', 'Scala')
    if (techStack.has('sbt')) addRow(applicationRows, 'Build Tool', 'sbt')
  }

  if (frontendRows.length === 0 && backendRows.length === 0) {
    const fallbackLanguage = analysis.primaryLanguage || repoInfo.language || TEXT.none
    const hasSpecializedRows = [
      libraryRows,
      cliRows,
      dataRows,
      infrastructureRows,
      applicationRows,
    ].some((rows) => rows.length > 0)

    if (!hasSpecializedRows) {
      return formatMarkdownTable(tableHeaders, localizeRows([['Language', fallbackLanguage]]))
    }
  }

  const sectionRows = [
    ['frontend', frontendRows],
    ['backend', backendRows],
    ['library', libraryRows],
    ['cli', cliRows],
    ['data', dataRows],
    ['infrastructure', infrastructureRows],
    ['application', applicationRows],
  ]

  return sectionRows
    .filter(([, rows]) => rows.length > 0)
    .map(([section, rows]) =>
      `### ${sectionLabels[section]}\n\n${formatMarkdownTable(tableHeaders, localizeRows(rows))}`
    )
    .join('\n\n')
}

const formatLicense = (license) => {
  if (!license || license === 'None') {
    return TEXT.noLicense
  }

  return TEXT.licenseText(license)
}

const isMissingCommand = (command) => {
  if (Array.isArray(command)) {
    return command.length === 0 || command.every(isMissingCommand)
  }

  if (!command) return true

  // 실제 명령어와 "감지된 명령어 없음" 안내 문구를 구분해 빈 코드 블록 생성을 피함
  return [
    TEXT.noInstallCommand,
    TEXT.noRunCommand,
    TEXT.noBuildCommand,
    TEXT.noTestCommand,
    TEXT.none,
  ].some((missingText) => command === missingText)
}

const escapeMarkdownTableCell = (value) =>
  String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br />')
    .trim()

const formatMarkdownTable = (headers, rows) => {
  if (rows.length === 0) {
    return ''
  }

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownTableCell).join(' | ')} |`),
  ].join('\n')
}

const pathCell = (path) => `\`${path}\``

const isReadmePath = (path) => {
  const filename = path.split('/').pop()?.toLowerCase() || ''
  return filename === 'readme' || filename.startsWith('readme.')
}

const toReadableSubject = (value) =>
  value
    .replace(/\.(js|jsx|ts|tsx|py|java|kt|go|rb|php|cs|rs|swift|dart)$/i, '')
    .replace(/(service|controller|router|route|handler|config|configuration|component|hook|model|entity|schema|middleware|validator|client|provider|adapter|repository|factory|mapper|parser|serializer|policy|guard|resolver|loader|plugin)$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()

const IMPORTANT_FILE_DOMAINS = [
  [/auth|login|oauth|jwt|session/i, '인증과 세션 관리'],
  [/permission|role|policy|guard|acl|security/i, '권한과 보안 정책'],
  [/user|account|profile/i, '사용자 계정과 프로필 관리'],
  [/payment|billing|checkout|order/i, '결제와 주문 처리'],
  [/cart|product|catalog|inventory/i, '상품과 재고 관리'],
  [/upload|download|file|storage/i, '파일 업로드와 저장소 연동'],
  [/mail|email|notification|push|message/i, '메시지와 알림 발송'],
  [/search|filter|query/i, '검색과 필터링'],
  [/i18n|locale|translation|language/i, '다국어와 지역화 처리'],
  [/theme|style|design|layout/i, '화면 테마와 레이아웃 구성'],
  [/socket|websocket|realtime|stream/i, '실시간 통신과 스트리밍'],
  [/cache|redis/i, '캐시 데이터 처리'],
  [/queue|worker|job|scheduler|cron/i, '비동기 작업과 스케줄링'],
  [/analytics|metric|event|tracking/i, '이벤트 수집과 분석'],
  [/report|export|import|csv|excel|pdf/i, '데이터 가져오기와 내보내기'],
  [/log|logger|audit/i, '로그 기록과 감사 추적'],
  [/admin|dashboard/i, '관리자 화면과 운영'],
]

const getDomainDescription = (path) => {
  // 파일 경로에 포함된 도메인 단서를 README 설명 문구의 주어로 변환
  const matchedDomain = IMPORTANT_FILE_DOMAINS.find(([pattern]) => pattern.test(path))
  return matchedDomain?.[1] || ''
}

const normalizeImportantFileDescription = (description) => {
  const normalizedDescription = String(description || '').trim()

  if (!normalizedDescription) {
    return '프로젝트 동작 이해에 필요한 핵심 역할을 담당합니다.'
  }

  if (/입니다\.?$/.test(normalizedDescription)) {
    return normalizedDescription.replace(/입니다\.?$/, ' 역할을 담당합니다.')
  }

  if (/[.!?。]$/.test(normalizedDescription)) {
    return normalizedDescription
  }

  return `${normalizedDescription} 역할을 담당합니다.`
}

const describeImportantFile = (file) => {
  // 파일 위치와 이름 규칙을 조합한 핵심 파일 설명 생성
  const path = file.path
  const filename = path.split('/').pop() || ''
  const normalizedPath = path.toLowerCase()
  const subject = toReadableSubject(filename)
  const subjectPrefix = subject ? `${subject} ` : ''
  const domainDescription = getDomainDescription(path)

  if (/\/middlewares?\//.test(normalizedPath) || /middleware\.(js|ts|py|go|rb|php|java|kt|cs)$/i.test(filename)) {
    return domainDescription
      ? `${domainDescription}에 필요한 요청 전처리와 공통 검증을 담당합니다.`
      : '요청 전처리, 인증, 로깅 같은 공통 미들웨어 처리를 담당합니다.'
  }

  if (/\/validators?\//.test(normalizedPath) || /validator\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return domainDescription
      ? `${domainDescription}에 필요한 입력값 검증 규칙을 정의합니다.`
      : '입력값 검증 규칙과 요청 데이터 유효성 검사를 담당합니다.'
  }

  if (/\/dto\//.test(normalizedPath) || /\/dtos\//.test(normalizedPath) || /dto\.(js|ts|py|java|kt|cs)$/i.test(filename)) {
    return '계층 간 데이터 전달 형식과 요청/응답 구조를 정의합니다.'
  }

  if (/\/clients?\//.test(normalizedPath) || /client\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return domainDescription
      ? `${domainDescription}에 필요한 외부 API 클라이언트 연동을 담당합니다.`
      : '외부 API 클라이언트와 원격 서비스 호출을 담당합니다.'
  }

  if (/\/providers?\//.test(normalizedPath) || /provider\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '외부 의존성 주입과 서비스 제공자 구성을 담당합니다.'
  }

  if (/\/adapters?\//.test(normalizedPath) || /adapter\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '외부 시스템과 내부 도메인 로직 사이의 변환 계층을 담당합니다.'
  }

  if (/\/guards?\//.test(normalizedPath) || /guard\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return domainDescription
      ? `${domainDescription}에 필요한 접근 제어 규칙을 담당합니다.`
      : '라우트와 기능 접근을 제어하는 보호 규칙을 담당합니다.'
  }

  if (/\/policies?\//.test(normalizedPath) || /policy\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return domainDescription
      ? `${domainDescription}에 필요한 정책과 권한 판단 기준을 정의합니다.`
      : '비즈니스 정책과 권한 판단 기준을 정의합니다.'
  }

  if (/\/resolvers?\//.test(normalizedPath) || /resolver\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return `${subjectPrefix}데이터 조회와 GraphQL/라우팅 해석을 담당합니다.`
  }

  if (/\/factories?\//.test(normalizedPath) || /factory\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return `${subjectPrefix}객체 생성과 테스트 데이터 구성을 담당합니다.`
  }

  if (/\/mappers?\//.test(normalizedPath) || /mapper\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return `${subjectPrefix}데이터 형식 변환과 계층 간 매핑을 담당합니다.`
  }

  if (/\/parsers?\//.test(normalizedPath) || /parser\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return `${subjectPrefix}입력 데이터 파싱과 형식 해석을 담당합니다.`
  }

  if (/\/serializers?\//.test(normalizedPath) || /serializer\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return `${subjectPrefix}응답 데이터 직렬화와 출력 형식 변환을 담당합니다.`
  }

  if (/(^|\/)(server|main|index|app|program)\.(js|ts|py|go|rb|php|java|kt|cs|rs|swift|dart)$/i.test(path)) {
    return '애플리케이션 실행을 시작하는 진입점 역할을 담당합니다.'
  }

  if (/(^|\/)(config|configuration|settings)\.(js|ts|py|java|kt|rb|php|cs)$/i.test(path)) {
    return '환경 변수와 애플리케이션 설정을 관리합니다.'
  }

  if (/(^|\/)(env|environment)\.(js|ts|py|java|kt|rb|php|cs)$/i.test(path)) {
    return '실행 환경별 설정값과 환경 변수 구성을 관리합니다.'
  }

  if (/\/services?\//.test(normalizedPath) || /service\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    if (domainDescription) {
      return `${domainDescription}을 처리하는 서비스 로직을 담당합니다.`
    }

    return `${subjectPrefix}비즈니스 로직과 데이터 처리를 담당합니다.`
  }

  if (/\/controllers?\//.test(normalizedPath) || /controller\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    if (domainDescription) {
      return `${domainDescription}에 대한 요청과 응답 처리를 담당합니다.`
    }

    return `${subjectPrefix}요청 처리와 응답 생성을 담당합니다.`
  }

  if (/\/routes?\//.test(normalizedPath) || /router?\.(js|ts|py|go|rb|php)$/i.test(filename)) {
    return 'API 엔드포인트와 라우팅 규칙을 정의합니다.'
  }

  if (/\/api\//.test(normalizedPath)) {
    return 'API 요청 처리와 외부 서비스 연동을 담당합니다.'
  }

  if (/\/graphql\//.test(normalizedPath) || /graphql\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return 'GraphQL 스키마, 리졸버, 데이터 조회 처리를 담당합니다.'
  }

  if (/\/components?\//.test(normalizedPath) || /component\.(jsx|tsx|js|ts)$/i.test(filename)) {
    return `${subjectPrefix}화면을 구성하는 UI 컴포넌트 역할을 담당합니다.`
  }

  if (/\/pages?\//.test(normalizedPath) || /\/views?\//.test(normalizedPath)) {
    return `${subjectPrefix}페이지 화면과 사용자 인터페이스 구성을 담당합니다.`
  }

  if (/\/hooks?\//.test(normalizedPath)) {
    return `${subjectPrefix}화면 상태와 재사용 가능한 클라이언트 로직을 관리합니다.`
  }

  if (/\/stores?\//.test(normalizedPath) || /\/state\//.test(normalizedPath)) {
    return '애플리케이션 상태 관리 로직을 담당합니다.'
  }

  if (/\/contexts?\//.test(normalizedPath) || /context\.(jsx|tsx|js|ts)$/i.test(filename)) {
    return '전역 상태와 컴포넌트 간 공유 컨텍스트를 관리합니다.'
  }

  if (/\/reducers?\//.test(normalizedPath) || /reducer\.(js|ts|jsx|tsx)$/i.test(filename)) {
    return '상태 변경 규칙과 액션 처리 방식을 정의합니다.'
  }

  if (/\/models?\//.test(normalizedPath) || /\/entities?\//.test(normalizedPath) || /\/schemas?\//.test(normalizedPath)) {
    if (domainDescription) {
      return `${domainDescription}에 필요한 데이터 구조와 도메인 모델을 정의합니다.`
    }

    return `${subjectPrefix}데이터 구조와 도메인 모델을 정의합니다.`
  }

  if (/\/repositories?\//.test(normalizedPath) || /repository\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    if (domainDescription) {
      return `${domainDescription}에 필요한 데이터 저장소 접근을 담당합니다.`
    }

    return `${subjectPrefix}데이터 저장소 접근과 조회 처리를 담당합니다.`
  }

  if (/\/migrations?\//.test(normalizedPath) || /\/seeds?\//.test(normalizedPath)) {
    return '데이터베이스 스키마 변경과 초기 데이터 구성을 담당합니다.'
  }

  if (/\/fixtures?\//.test(normalizedPath) || /\/mocks?\//.test(normalizedPath)) {
    return '테스트와 개발 환경에서 사용하는 예제 데이터를 제공합니다.'
  }

  if (/\/jobs?\//.test(normalizedPath) || /\/workers?\//.test(normalizedPath) || /\/schedulers?\//.test(normalizedPath)) {
    return domainDescription
      ? `${domainDescription}과 관련된 백그라운드 작업을 처리합니다.`
      : '백그라운드 작업, 큐 처리, 주기적 실행을 담당합니다.'
  }

  if (/\/constants?\//.test(normalizedPath) || /constant\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '애플리케이션 전역에서 사용하는 상수 값을 정의합니다.'
  }

  if (/\/enums?\//.test(normalizedPath) || /enum\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '도메인 상태와 고정 선택값을 enum 형태로 정의합니다.'
  }

  if (/\/types?\//.test(normalizedPath) || /types?\.(ts|tsx)$/i.test(filename)) {
    return '공통 타입과 인터페이스 정의를 관리합니다.'
  }

  if (/\/plugins?\//.test(normalizedPath) || /plugin\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '애플리케이션 확장 기능과 플러그인 초기화를 담당합니다.'
  }

  if (/\/loaders?\//.test(normalizedPath) || /loader\.(js|ts|py|java|kt|go|rb|php|cs)$/i.test(filename)) {
    return '초기 데이터 로딩과 리소스 준비를 담당합니다.'
  }

  if (/\/utils?\//.test(normalizedPath) || /\/helpers?\//.test(normalizedPath)) {
    return `${subjectPrefix}공통 처리에 사용하는 유틸리티 로직을 제공합니다.`
  }

  if (/\/cli\//.test(normalizedPath) || /\/commands?\//.test(normalizedPath) || /\/bin\//.test(normalizedPath)) {
    return 'CLI 명령과 실행 보조 로직을 담당합니다.'
  }

  if (/\/tests?\//.test(normalizedPath) || /\.(test|spec)\./i.test(filename)) {
    return '주요 기능의 동작을 검증하는 테스트 코드를 담당합니다.'
  }

  return normalizeImportantFileDescription(file.reason)
}

// README 생성에 활용할 핵심 파일 목록을 markdown 표 형태로 변환
const formatImportantFiles = (readmeData) => {
  // 백엔드에서 정리한 핵심 파일 목록이 없으면 None으로 표시
  const files = (readmeData?.importantFiles || []).filter((file) => !isReadmePath(file.path))
  if (files.length === 0) {
    return TEXT.none
  }

  const headers = ['경로', '설명']
  const rows = files
    .slice(0, 10)
    .map((file) => [
      pathCell(file.path),
      normalizeImportantFileDescription(describeImportantFile(file)),
    ])

  return formatMarkdownTable(headers, rows)
}

const formatBashBlock = (commands) => {
  const commandLines = commands.filter(Boolean)

  if (commandLines.length === 0) {
    return ''
  }

  return `\`\`\`bash\n${commandLines.join('\n')}\n\`\`\``
}

const normalizeCommandList = (commands) => {
  if (Array.isArray(commands)) {
    return commands.filter((command) => !isMissingCommand(command))
  }

  return isMissingCommand(commands) ? [] : [commands]
}

const normalizeCommandGroup = (group) => {
  const context = {
    ...group,
    dir: group.dir || '.',
  }

  return {
    ...context,
    label: context.label || getContextLabel(context),
    install: normalizeCommandList(context.install),
    run: normalizeCommandList(context.run),
    build: normalizeCommandList(context.build),
    test: normalizeCommandList(context.test),
  }
}

const getReadmePaths = (readmeData) => {
  const pathItems = [
    ...(readmeData?.sourceFiles || []),
    ...(readmeData?.importantFiles || []),
    ...(readmeData?.fileSummary?.structurePaths || []),
    ...(readmeData?.fileSummary?.structureHighlights || []),
  ]

  return pathItems.map((item) => item.path).filter(Boolean)
}

const getPackageDirectory = (path = '') => {
  const segments = path.split('/').filter(Boolean)

  if (segments.length <= 1) {
    return '.'
  }

  return segments.slice(0, -1).join('/')
}

const parsePackageContexts = (readmeData) =>
  (readmeData?.sourceFiles || [])
    .filter((file) => file.path?.split('/').pop() === 'package.json')
    .map((file) => {
      try {
        const packageJson = JSON.parse(file.content)
        return {
          dir: getPackageDirectory(file.path),
          name: packageJson.name || null,
          scripts: packageJson.scripts || {},
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)

const getContextLabel = (context) => {
  const topLevelDir = context.dir.split('/')[0]

  if (context.dir === '.') {
    return '루트'
  }

  if (topLevelDir === 'frontend') {
    return 'Frontend'
  }

  if (topLevelDir === 'backend') {
    return 'Backend'
  }

  return context.name || context.dir
}

const hasTopLevelPath = (paths, dirname) =>
  paths.some((path) => path === dirname || path.startsWith(`${dirname}/`))

const isSplitFrontendBackend = (readmeData, packageContexts) => {
  const paths = getReadmePaths(readmeData)
  const hasFrontend = hasTopLevelPath(paths, 'frontend')
  const hasBackend = hasTopLevelPath(paths, 'backend')

  return hasFrontend && hasBackend && packageContexts.some((context) =>
    ['frontend', 'backend'].includes(context.dir.split('/')[0])
  )
}

const getInstallContexts = (readmeData) => {
  const commandGroups = readmeData?.analysis?.commandGroups || []

  if (commandGroups.length > 0) {
    return commandGroups.map(normalizeCommandGroup)
  }

  const packageContexts = parsePackageContexts(readmeData)

  if (packageContexts.length === 0) {
    const command = readmeData?.analysis?.commands?.install
    return isMissingCommand(command)
      ? []
      : [{ dir: '.', label: '루트', install: command, scripts: {} }]
  }

  const splitProject = isSplitFrontendBackend(readmeData, packageContexts)
  const contexts = splitProject
    ? packageContexts.filter((context) =>
      ['frontend', 'backend'].includes(context.dir.split('/')[0])
    )
    : [packageContexts.find((context) => context.dir === '.') || packageContexts[0]]

  return contexts.map((context) => ({
    ...context,
    label: getContextLabel(context),
    install: ['npm install'],
  }))
}

const getRunCommand = (context) => {
  if (context.run) {
    return context.run
  }

  if (context.scripts?.dev) {
    return 'npm run dev'
  }

  if (context.scripts?.start) {
    return 'npm start'
  }

  if (context.scripts?.serve) {
    return 'npm run serve'
  }

  return null
}

const getBuildCommand = (context) => {
  if (context.build) {
    return context.build
  }

  return context.scripts?.build ? 'npm run build' : null
}

const formatContextCommand = (context, command) => {
  const commands = normalizeCommandList(command)

  return context.dir === '.' ? commands : [`cd ${context.dir}`, ...commands]
}

const formatContextCommandStep = (contexts, commandGetter, emptyMessage) => {
  const commandBlocks = contexts
    .map((context) => {
      const command = commandGetter(context)

      if (isMissingCommand(command)) {
        return ''
      }

      return `#### ${context.label}\n\n${formatBashBlock(formatContextCommand(context, command))}`
    })
    .filter(Boolean)

  return commandBlocks.length > 0 ? commandBlocks.join('\n\n') : `- ${emptyMessage}`
}

const getEnvExamplePaths = (readmeData) =>
  readmeData?.fileSummary?.envExamplePaths?.length > 0
    ? readmeData.fileSummary.envExamplePaths
    : getReadmePaths(readmeData).filter((path) =>
      /(^|\/)\.env(\.[\w-]+)?\.(example|sample|template)$/.test(path)
    )

const getEnvTargetPath = (path) =>
  path
    .replace(/\.example$/, '')
    .replace(/\.sample$/, '')
    .replace(/\.template$/, '')

const getEnvSourceFile = (readmeData, path) =>
  (readmeData?.sourceFiles || []).find((file) => file.path === path)

const formatEnvExampleBlock = (sourceFile) => {
  const content = String(sourceFile?.content || '').trim()

  if (!content) {
    return '- `.env.example` 파일을 참고해 필요한 값을 채워주세요.'
  }

  return `\`\`\`env\n${content}\n\`\`\``
}

const formatEnvSetupStep = (readmeData) => {
  const envExamplePaths = getEnvExamplePaths(readmeData)

  if (envExamplePaths.length === 0) {
    return ''
  }

  // 환경 변수는 자동 표보다 저장소가 제공한 예시 파일을 신뢰 가능한 안내로 사용함
  const envSections = envExamplePaths.map((path) => {
    const envPath = getEnvTargetPath(path)
    const sourceFile = getEnvSourceFile(readmeData, path)
    const heading = envExamplePaths.length > 1 ? `#### ${path}\n\n` : ''

    return `${heading}${formatBashBlock([`cp ${path} ${envPath}`])}\n\n${formatEnvExampleBlock(sourceFile)}`
  })

  return envSections.join('\n\n')
}

const formatDockerCommands = (readmeData) => {
  const paths = getReadmePaths(readmeData)
  const dockerComposeFiles = readmeData?.fileSummary?.dockerComposeFiles || []
  const dockerFiles = readmeData?.fileSummary?.dockerFiles || []
  const hasDockerCompose =
    dockerComposeFiles.length > 0 ||
    paths.some((path) => /(^|\/)docker-compose\.ya?ml$/.test(path))
  const hasDockerfile =
    dockerFiles.length > 0 ||
    paths.some((path) => /(^|\/)Dockerfile$/.test(path))
  const imageName = readmeData?.repository?.name || 'app'

  if (hasDockerCompose) {
    return `#### Docker Compose\n\n${formatBashBlock(['docker compose up -d'])}`
  }

  if (hasDockerfile) {
    return `#### Docker\n\n${formatBashBlock([
      `docker build -t ${imageName} .`,
      `docker run --rm -p 3000:3000 ${imageName}`,
    ])}`
  }

  return ''
}

const formatCloneStep = (readmeData) => {
  const repository = readmeData?.repository || {}
  const repoUrl = repository.url || 'https://github.com/owner/repository.git'
  const repoName = repository.name || 'repository'

  return formatBashBlock([
    `git clone ${repoUrl}`,
    `cd ${repoName}`,
  ])
}

// 설치 및 실행 방법을 README의 표준 단계 구조로 변환
const formatScripts = (readmeData) => {
  const contexts = getInstallContexts(readmeData)

  if (contexts.length === 0) {
    return `- ${TEXT.none}`
  }

  const commands = readmeData?.analysis?.commands || {}

  if (contexts.length === 1 && contexts[0].dir === '.') {
    contexts[0] = {
      ...contexts[0],
      run: commands.run,
      build: commands.build,
      test: commands.test,
    }
  }

  const dockerStep = formatDockerCommands(readmeData)
  const devServerContent = [
    formatContextCommandStep(contexts, getRunCommand, TEXT.noRunCommand),
    dockerStep,
  ].filter(Boolean).join('\n\n')

  const steps = [
    { title: '저장소 복제', content: formatCloneStep(readmeData) },
    {
      title: '의존성 설치',
      content: formatContextCommandStep(
        contexts,
        (context) => context.install,
        TEXT.noInstallCommand
      ),
    },
    { title: '환경 변수 설정', content: formatEnvSetupStep(readmeData) },
    { title: '개발 서버 실행', content: devServerContent || `- ${TEXT.noRunCommand}` },
    { title: '빌드', content: formatContextCommandStep(contexts, getBuildCommand, TEXT.noBuildCommand) },
  ].filter((step) => step.content)

  return steps
    .map((step, index) => `### ${index + 1}. ${step.title}\n\n${step.content}`)
    .join('\n\n')
}

const createTreeNode = (name = '', type = 'tree') => ({
  children: new Map(),
  name,
  type,
})

const buildStructureTree = (paths) => {
  const root = createTreeNode()

  // a/b/c 형태 경로의 root -> a -> b -> c 노드 누적
  paths.forEach((item) => {
    const parts = item.path.split('/').filter(Boolean)
    let current = root

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1
      const type = isLast ? item.type : 'tree'

      if (!current.children.has(part)) {
        current.children.set(part, createTreeNode(part, type))
      }

      current = current.children.get(part)

      if (isLast) {
        current.type = type
      }
    })
  })

  return root
}

const compareTreeNodes = ([nameA, nodeA], [nameB, nodeB]) => {
  if (nodeA.type !== nodeB.type) {
    return nodeA.type === 'tree' ? -1 : 1
  }

  return nameA.localeCompare(nameB)
}

const renderStructureTree = (node, options = {}) => {
  const {
    depth = 0,
    maxChildren = 8,
    maxDepth = 3,
    prefix = '',
    pathPrefix = '',
  } = options

  if (depth >= maxDepth) {
    return []
  }

  // README 길이 제어를 위한 폴더 노드 전위 순회 렌더링
  const children = Array.from(node.children.entries())
    .filter(([, child]) => child.type === 'tree')
    .sort(compareTreeNodes)
  const visibleChildren = children.slice(0, maxChildren)
  const hasHiddenChildren = children.length > visibleChildren.length
  const rows = []

  visibleChildren.forEach(([name, child], index) => {
    const isLast = index === visibleChildren.length - 1 && !hasHiddenChildren
    const branch = isLast ? '└── ' : '├── '
    const childPath = pathPrefix ? `${pathPrefix}/${name}` : name
    const displayName = child.type === 'tree' ? `${name}/` : name

    rows.push(`${prefix}${branch}${displayName}`)

    const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`
    rows.push(
      ...renderStructureTree(child, {
        depth: depth + 1,
        maxChildren,
        maxDepth,
        pathPrefix: childPath,
        prefix: childPrefix,
      })
    )
  })

  if (hasHiddenChildren) {
    rows.push(`${prefix}└── ...`)
  }

  return rows
}

// 전체 파일 트리에서 주요 폴더와 파일을 README 구조 섹션 형태로 변환
const formatProjectStructure = (readmeData) => {
  const structurePaths = readmeData?.fileSummary?.structurePaths || []

  if (structurePaths.length === 0) {
    return TEXT.none
  }

  const tree = buildStructureTree(structurePaths)
  const lines = renderStructureTree(tree)

  if (lines.length === 0) {
    return TEXT.none
  }

  return `\`\`\`text\n.\n${lines.join('\n')}\n\`\`\``
}

const normalizeTextValue = (value) => {
  const normalizedValue = String(value || '').trim()

  return normalizedValue && normalizedValue !== 'None' ? normalizedValue : ''
}

const PROJECT_TYPE_LABELS = {
  '.NET project': '.NET 프로젝트',
  'ASP.NET Core web application': 'ASP.NET Core 웹 애플리케이션',
  'C/C++ project': 'C/C++ 프로젝트',
  'Dart project': 'Dart 프로젝트',
  'Flutter application': 'Flutter 애플리케이션',
  'Frontend application': '프론트엔드 애플리케이션',
  'Go project': 'Go 프로젝트',
  'Node.js project': 'Node.js 프로젝트',
  'PHP project': 'PHP 프로젝트',
  'Python project': 'Python 프로젝트',
  'Ruby on Rails web application': 'Ruby on Rails 웹 애플리케이션',
  'Ruby project': 'Ruby 프로젝트',
  'Rust project': 'Rust 프로젝트',
  'Scala project': 'Scala 프로젝트',
  'Spring Boot web application': 'Spring Boot 웹 애플리케이션',
  'Swift project': 'Swift 프로젝트',
}

const OVERVIEW_TECH_ALLOWLIST = new Set([
  'Angular',
  'Anthropic API',
  'Django',
  'Express',
  'FastAPI',
  'Flask',
  'GitHub API',
  'Google Gemini API',
  'Hugging Face Inference API',
  'Laravel',
  'Next.js',
  'Node.js',
  'OpenAI API',
  'React',
  'Ruby on Rails',
  'Spring Boot',
  'Svelte',
  'Vue',
  'Vite',
])

const normalizeOverviewTechName = (technology = '') =>
  String(technology)
    .replace(/\s+\d+(\.\d+)?\+?$/u, '')
    .trim()

const getOverviewTechStack = (analysis) => {
  const structuredTech = (analysis.techStackSections || [])
    .flatMap((section) => section.rows || [])
    .map((row) => normalizeOverviewTechName(row.technology || row.name))
    .filter((technology) => OVERVIEW_TECH_ALLOWLIST.has(technology))

  const fallbackTech = (analysis.techStack || [])
    .map(normalizeOverviewTechName)
    .filter((technology) => OVERVIEW_TECH_ALLOWLIST.has(technology))

  return [...structuredTech, ...fallbackTech]
    .filter((technology, index, technologies) => technologies.indexOf(technology) === index)
    .slice(0, 6)
}

const formatRuleBasedOverview = (repoInfo) => {
  const readmeData = repoInfo.readmeData || {}
  const analysis = readmeData.analysis || {}
  const repository = readmeData.repository || {}
  const projectType = PROJECT_TYPE_LABELS[analysis.projectType] || ''
  const primaryLanguage = normalizeTextValue(
    analysis.primaryLanguage || repository.language || repoInfo.language
  )
  const techStack = getOverviewTechStack(analysis)

  // GitHub description이 없을 때만 분석된 언어/프로젝트 유형으로 개요를 보완
  const lines = []
  const subject = projectType || (primaryLanguage ? `${primaryLanguage} 프로젝트` : '소프트웨어 프로젝트')

  if (primaryLanguage && projectType) {
    lines.push(`이 프로젝트는 ${primaryLanguage} 기반의 ${projectType}입니다.`)
  } else {
    lines.push(`이 프로젝트는 ${subject}입니다.`)
  }

  if (techStack.length > 0) {
    lines.push(`주요 기술로는 ${techStack.join(', ')} 등을 사용합니다.`)
  }

  return lines.join('\n\n')
}

const formatOverview = (repoInfo) => {
  // 개요는 AI 요약을 재사용하지 않고 원본 설명 또는 rule-based 분석 문장으로 구성
  const description = normalizeTextValue(repoInfo.description)
  const summary = normalizeTextValue(repoInfo.summary)

  if (description && description !== summary) {
    return description
  }

  return formatRuleBasedOverview(repoInfo)
}

const getReadmeSummary = (repoInfo) => {
  // AI 한 줄 요약을 README 인용문에 우선 사용하고, 없으면 저장소 설명으로 대체
  const summary =
    repoInfo.summary ||
    repoInfo.readmeData?.repository?.summary ||
    repoInfo.readmeData?.analysis?.summary

  const normalizedSummary = normalizeTextValue(summary)

  if (normalizedSummary) {
    return normalizedSummary
  }

  return normalizeTextValue(repoInfo.description)
}

const buildStandardSections = (repoInfo, sections) => {
  const readmeSummary = getReadmeSummary(repoInfo)

  // 각 formatter가 섹션 본문만 만들고, 여기서 최종 README 섹션 순서를 결정
  return [
    `# ${repoInfo.name}`,
    formatReadmeBadges(repoInfo),
    readmeSummary ? `> ${readmeSummary}` : '',
    sectionBlock(sections, 'overview', TEXT.overview, formatOverview(repoInfo)),
    sectionBlock(sections, 'features', TEXT.features, formatFeatures(repoInfo)),
    sectionBlock(sections, 'techStack', TEXT.techStack, formatTechStack(repoInfo)),
    sectionBlock(
      sections,
      'projectStructure',
      TEXT.projectStructure,
      formatProjectStructure(repoInfo.readmeData)
    ),
    sectionBlock(
      sections,
      'importantFiles',
      TEXT.importantFiles,
      formatImportantFiles(repoInfo.readmeData)
    ),
    sectionBlock(
      sections,
      'scripts',
      TEXT.availableScripts,
      formatScripts(repoInfo.readmeData)
    ),
    sectionBlock(sections, 'license', TEXT.license, formatLicense(repoInfo.license)),
    sectionBlock(sections, 'link', TEXT.link, `[GitHub Repository](${repoInfo.url})`),
  ]
}

const buildMarkdown = (repoInfo, options) => {
  // 최종 markdown은 선택된 표준 섹션을 요청한 순서대로 합쳐 하나의 문서로 반환
  return `${joinBlocks(buildStandardSections(repoInfo, options.sections))}\n`
}

const parseStreamBuffer = (buffer, onEvent) => {
  const lines = buffer.split('\n')
  // NDJSON chunk는 줄 중간에서 끊길 수 있으므로 마지막 조각은 다음 chunk와 합침
  const remainingBuffer = lines.pop() || ''

  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      let event

      // JSON 파싱 실패와 서버가 보낸 error 이벤트를 구분해 실제 원인을 보존
      try {
        event = JSON.parse(line)
      } catch (error) {
        throw new Error(`스트리밍 응답을 해석하지 못했습니다: ${error.message}`, {
          cause: error,
        })
      }

      onEvent(event)
    })

  return remainingBuffer
}

// owner, repo, options 값을 기반으로 README markdown 생성 요청 처리
export async function requestReadme(owner, repo, options = DEFAULT_OPTIONS) {
  const readmeOptions = normalizeOptions(options)

  try {
    // 백엔드 API에 owner, repo 정보를 POST 방식으로 전달
    const response = await fetch(buildApiUrl('/api/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo }),
    })

    const repoInfo = await response.json()

    if (!response.ok) {
      // 백엔드에서 전달한 에러 메시지가 있으면 해당 메시지로 에러 처리
      throw new Error(repoInfo.message || '서버 응답 에러')
    }

    return {
      markdown: buildMarkdown(repoInfo, readmeOptions),
      repo: repoInfo,
    }
  } catch (error) {
    // App.jsx에서 alert로 보여줄 수 있도록 에러를 다시 던짐
    console.error('README 생성 오류: ', error)
    throw error
  }
}

// README 생성 진행 상태를 스트리밍으로 읽고, 완료 시 markdown과 repo 데이터를 반환
export async function requestReadmeStream(
  owner,
  repo,
  options = DEFAULT_OPTIONS,
  handlers = {},
  signal
) {
  const readmeOptions = normalizeOptions(options)
  let buffer = ''
  let completedResult = null

  try {
    const response = await fetch(buildApiUrl('/api/generate/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo }),
      signal,
    })

    if (!response.ok) {
      const errorInfo = await response.json().catch(() => ({}))
      throw new Error(errorInfo.message || '서버 응답 에러')
    }

    if (!response.body) {
      throw new Error('브라우저가 스트리밍 응답을 지원하지 않습니다.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // progress 이벤트는 UI 핸들러로 전달하고, complete 이벤트만 최종 markdown 생성에 사용
    const handleEvent = (event) => {
      handlers.onEvent?.(event)

      if (event.type === 'error') {
        throw new Error(event.message || 'README 생성 중 오류가 발생했습니다.')
      }

      if (event.type === 'complete') {
        completedResult = {
          markdown: buildMarkdown(event.repo, readmeOptions),
          repo: event.repo,
        }
      }
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // stream 옵션을 켜서 멀티바이트 한글 문자가 chunk 경계에서 깨지지 않게 디코딩
      buffer = parseStreamBuffer(buffer + decoder.decode(value, { stream: true }), handleEvent)
    }

    // 스트림 종료 후 decoder에 남아 있는 텍스트와 미완성 라인을 마지막으로 처리
    const trailingText = buffer + decoder.decode()
    if (trailingText.trim()) {
      parseStreamBuffer(`${trailingText}\n`, handleEvent)
    }

    if (!completedResult) {
      throw new Error('README 생성 완료 이벤트를 받지 못했습니다.')
    }

    return completedResult
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('README 스트리밍 생성 오류: ', error)
    }
    throw error
  }
}
