// 백엔드에서 받아온 저장소 정보를 README markdown으로 변환하는 템플릿 모음
const DEFAULT_API_BASE_URL = 'http://localhost:3000'
const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

const DEFAULT_OPTIONS = {
  language: 'ko',
  sections: {
    overview: true,
    repositoryInfo: true,
    techStack: true,
    features: true,
    projectStructure: true,
    importantFiles: true,
    scripts: true,
    license: true,
  },
}

const TEXT = {
  en: {
    repositoryInfo: 'Repository Information',
    fullName: 'Full Name',
    description: 'Description',
    language: 'Language',
    defaultBranch: 'Default Branch',
    stars: 'Stars',
    forks: 'Forks',
    openIssues: 'Open Issues',
    topics: 'Topics',
    lastUpdated: 'Last Updated',
    createdAt: 'Created At',
    features: 'Features',
    projectStructure: 'Project Structure',
    importantFiles: 'Important Files',
    availableScripts: 'Available Scripts',
    license: 'License',
    link: 'Link',
    overview: 'Overview',
    techStack: 'Tech Stack',
    projectInfo: 'Project Info',
    repository: 'Repository',
    url: 'URL',
    primaryLanguage: 'Primary Language',
    none: 'None',
    noInstallCommand: 'No install command detected.',
    noRunCommand: 'No run command detected.',
    noBuildCommand: 'No build command detected.',
    noTestCommand: 'No test command detected.',
    noLicense: 'No license information provided.',
    licenseText: (license) => `This project is licensed under the ${license} License.`,
  },
  ko: {
    repositoryInfo: '저장소 정보',
    fullName: '전체 이름',
    description: '설명',
    language: '언어',
    defaultBranch: '기본 브랜치',
    stars: '스타',
    forks: '포크',
    openIssues: '열린 이슈',
    topics: '토픽',
    lastUpdated: '마지막 업데이트',
    createdAt: '생성일',
    features: '주요 기능',
    projectStructure: '프로젝트 구조',
    importantFiles: '핵심 파일',
    availableScripts: '실행 스크립트',
    license: '라이선스',
    link: '링크',
    overview: '개요',
    techStack: '기술 스택',
    projectInfo: '프로젝트 정보',
    repository: '저장소',
    url: 'URL',
    primaryLanguage: '주요 언어',
    none: '없음',
    noInstallCommand: '감지된 설치 명령어가 없습니다.',
    noRunCommand: '감지된 실행 명령어가 없습니다.',
    noBuildCommand: '감지된 빌드 명령어가 없습니다.',
    noTestCommand: '감지된 테스트 명령어가 없습니다.',
    noLicense: '제공된 라이선스 정보가 없습니다.',
    licenseText: (license) => `이 프로젝트는 ${license} 라이선스를 따릅니다.`,
  },
}

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

const sectionBlock = (sections, key, title, content) => {
  if (!enabled(sections, key)) {
    return ''
  }

  return `## ${title}\n\n${content}`
}

const joinBlocks = (blocks) => blocks.filter(Boolean).join('\n\n')

const TRANSLATIONS = {
  en: {
    'Spring Boot 기반 웹 애플리케이션 구조': 'Spring Boot based web application structure',
    'Owner, Pet, Visit 도메인 관리': 'Owner, pet, and visit domain management',
    'Veterinarian 정보 조회 및 관리': 'Veterinarian information lookup and management',
    '서버 사이드 HTML 템플릿 화면 제공': 'Server-side HTML template views',
    'H2, MySQL, PostgreSQL 데이터베이스 초기화 스크립트 제공': 'Database initialization scripts for H2, MySQL, and PostgreSQL',
    'Docker Compose 기반 데이터베이스 실행 지원': 'Docker Compose support for local database services',
    '애플리케이션 Java 소스 코드': 'Application Java source code',
    '설정, 정적 리소스, 템플릿': 'Configuration, static resources, and templates',
    '화면 템플릿': 'View templates',
    '데이터베이스 스키마와 샘플 데이터': 'Database schema and sample data',
    '테스트 코드': 'Test code',
    'Kubernetes 배포 설정': 'Kubernetes deployment manifests',
    'GitHub Actions 워크플로': 'GitHub Actions workflows',
    '기존 README 파일': 'Existing README file',
    'Node.js 의존성 및 실행 스크립트 파일': 'Node.js dependency and script manifest',
    'Python 의존성 파일': 'Python dependency file',
    'Python 프로젝트 설정 및 의존성 파일': 'Python project configuration and dependency file',
    'Python 패키지 설정 파일': 'Python package configuration file',
    'Gradle 빌드 설정 파일': 'Gradle build configuration file',
    'Maven 빌드 설정 파일': 'Maven build configuration file',
    'Go 모듈 의존성 파일': 'Go module dependency file',
    'Rust 패키지 설정 파일': 'Rust package configuration file',
    '애플리케이션 진입점 파일': 'Application entry point',
    '요청 처리 흐름을 보여주는 컨트롤러/라우터 파일': 'Controller/router file that shows request handling flow',
    '비즈니스 로직을 보여주는 서비스 파일': 'Service file that shows business logic',
    '데이터 모델과 저장소 흐름을 보여주는 파일': 'File that shows data model or repository flow',
    '프로젝트 설정 흐름을 보여주는 파일': 'File that shows project configuration flow',
    'src 폴더의 주요 파일': 'Important source file under src',
  },
}

const translate = (value, lang) => {
  if (lang !== 'en') return value
  return TRANSLATIONS.en[value] || value
}

// 토픽 목록이 비어있으면 README에 None으로 표시
const formatTopics = (topics, lang = 'en') => {
  if (!topics || topics.length === 0) {
    return TEXT[lang].none
  }
  return topics.join(', ')
}

// GitHub API 날짜 문자열을 README에 보여줄 날짜 형식으로 변환
const formatDate = (date, lang = 'en') => {
  if (!date) {
    return TEXT[lang].none
  }
  return new Date(date).toLocaleDateString()
}

const findPackageJson = (selectedFileContents = []) =>
  selectedFileContents.find((file) => file.path?.split('/').pop() === 'package.json')

const extractPackageScripts = (repoInfo) => {
  const scripts = repoInfo.readmeData?.analysis?.scripts || {}

  if (Object.keys(scripts).length > 0) {
    return scripts
  }

  const packageJson = findPackageJson(repoInfo.selectedFileContents)

  if (!packageJson) {
    return null
  }

  try {
    const parsed = JSON.parse(packageJson.content)
    return parsed.scripts || {}
  } catch {
    return {}
  }
}

// selectedFileContents에서 package.json을 찾아 scripts 추출
function extractScripts(repoInfo, lang = 'en') {
  const commands = repoInfo.readmeData?.analysis?.commands

  if (commands) {
    return {
      install: commands.install || TEXT[lang].noInstallCommand,
      dev: commands.run || TEXT[lang].noRunCommand,
      build: commands.build || TEXT[lang].noBuildCommand,
      test: commands.test || TEXT[lang].noTestCommand,
    }
  }

  const scripts = extractPackageScripts(repoInfo)

  if (!scripts) {
    return {
      install: TEXT[lang].noInstallCommand,
      dev: TEXT[lang].noRunCommand,
      build: TEXT[lang].noBuildCommand,
      test: TEXT[lang].noTestCommand,
    }
  }

  // 실행 명령어 우선순위: dev > start > serve
  const devScript = scripts.dev
    ? 'npm run dev'
    : scripts.start
      ? 'npm start'
      : scripts.serve
        ? 'npm run serve'
        : TEXT[lang].noRunCommand

  return {
    install: 'npm install',
    dev: devScript,
    build: scripts.build ? 'npm run build' : TEXT[lang].noBuildCommand,
    test: scripts.test ? 'npm test' : TEXT[lang].noTestCommand,
  }
}

const formatFeatures = (repoInfo, lang = 'en') => {
  const features = repoInfo.features || repoInfo.readmeData?.analysis?.detectedFeatures
  const normalizeFeatureItems = (featureItems) =>
    featureItems
      .flatMap((feature) =>
        String(feature || '')
          .split(/\r?\n/)
          .map((line) => line.replace(/^-+\s*/, '').trim())
      )
      .filter(Boolean)

  if (Array.isArray(features) && features.length > 0) {
    return normalizeFeatureItems(features)
      .map((feature) => `- ${translate(feature.replace(/^-+\s*/, ''), lang)}`)
      .join('\n')
  }

  if (typeof features === 'string' && features.trim()) {
    return features
      .trim()
      .split(/\r?\n/)
      .map((feature) => feature.trim())
      .filter(Boolean)
      .map((feature) => {
        const normalizedFeature = feature.replace(/^-+\s*/, '')
        return `- ${translate(normalizedFeature, lang)}`
      })
      .join('\n')
  }

  return `- ${TEXT[lang].none}`
}

const formatTechStack = (repoInfo, lang = 'en') => {
  const techStack = Array.from(new Set(repoInfo.readmeData?.analysis?.techStack || []))

  if (techStack.length > 0) {
    return techStack.map((item) => `- ${item}`).join('\n')
  }

  return `- ${repoInfo.language || TEXT[lang].none}`
}

const formatLicense = (license, lang = 'en') => {
  if (!license || license === 'None') {
    return TEXT[lang].noLicense
  }

  return TEXT[lang].licenseText(license)
}

const isMissingCommand = (command, lang = 'en') => {
  if (!command) return true

  return [
    TEXT.en.noInstallCommand,
    TEXT.en.noRunCommand,
    TEXT.en.noBuildCommand,
    TEXT.en.noTestCommand,
    TEXT.ko.noInstallCommand,
    TEXT.ko.noRunCommand,
    TEXT.ko.noBuildCommand,
    TEXT.ko.noTestCommand,
    TEXT[lang].none,
  ].some((missingText) => command === missingText)
}

// README 생성에 활용할 핵심 파일 목록을 markdown 리스트 형태로 변환
const formatImportantFiles = (readmeData, lang = 'en') => {
  // 백엔드에서 정리한 핵심 파일 목록이 없으면 None으로 표시
  const files = readmeData?.importantFiles || []
  if (files.length === 0) {
    return `- ${TEXT[lang].none}`
  }
  return files
    .slice(0, 8)
    .map((file) => `- \`${file.path}\` - ${translate(file.reason, lang)}`)
    .join('\n')
}

// package.json에서 추출한 실행 스크립트를 markdown 리스트 형태로 변환
const formatScripts = (readmeData, lang = 'en') => {
  const commands = readmeData?.analysis?.commands

  if (commands) {
    const commandEntries = [
      ['install', commands.install],
      ['run', commands.run],
      ['build', commands.build],
      ['test', commands.test],
    ].filter(([, command]) => !isMissingCommand(command, lang))

    if (commandEntries.length > 0) {
      return commandEntries
        .map(([name, command]) => `- \`${name}\`: \`${command}\``)
        .join('\n')
    }
  }

  // 분석된 scripts 정보가 없으면 None으로 표시
  const scripts = readmeData?.analysis?.scripts || {}
  const scriptEntries = Object.entries(scripts)
  if (scriptEntries.length === 0) {
    return `- ${TEXT[lang].none}`
  }
  return scriptEntries
    .slice(0, 6)
    .map(([name, command]) => `- \`${name}\`: \`${command}\``)
    .join('\n')
}

// 전체 파일 트리에서 최상위 폴더 목록을 README 구조 섹션 형태로 변환
const formatProjectStructure = (readmeData, lang = 'en') => {
  const highlights = readmeData?.fileSummary?.structureHighlights || []

  if (highlights.length > 0) {
    return highlights
      .slice(0, 8)
      .map((item) => `- \`${item.path}\` - ${translate(item.description, lang)}`)
      .join('\n')
  }

  // 백엔드에서 정리한 최상위 폴더 목록이 없으면 None으로 표시
  const directories = readmeData?.fileSummary?.topLevelDirectories || []
  if (directories.length === 0) {
    return `- ${TEXT[lang].none}`
  }
  return directories
    .slice(0, 8)
    .map((directory) => `- \`${directory}/\``)
    .join('\n')
}

const formatOverview = (repoInfo, lang = 'en') => {
  const analysis = repoInfo.readmeData?.analysis || {}
  const text = TEXT[lang]
  const lines = [
    repoInfo.description && repoInfo.description !== 'None'
      ? repoInfo.description
      : null,
    analysis.projectType
      ? `${text.projectInfo}: ${analysis.projectType}`
      : null,
  ].filter(Boolean)

  if (lines.length === 0) {
    return text.none
  }

  return lines.join('\n\n')
}

const buildRepositoryInfo = (repoInfo, lang) => {
  const text = TEXT[lang]
  const repository = repoInfo.readmeData?.repository || {}

  return [
    `- ${text.fullName}: ${repoInfo.fullName}`,
    `- ${text.description}: ${repoInfo.description}`,
    `- ${text.language}: ${repository.language || repoInfo.language}`,
    `- ${text.defaultBranch}: ${repoInfo.defaultBranch}`,
    `- ${text.stars}: ${repoInfo.stars}`,
    `- ${text.forks}: ${repoInfo.forks}`,
    `- ${text.openIssues}: ${repoInfo.openIssues}`,
    `- ${text.topics}: ${formatTopics(repoInfo.topics, lang)}`,
    `- ${text.lastUpdated}: ${formatDate(repoInfo.updatedAt, lang)}`,
  ].join('\n')
}

const buildProjectCommandBlock = (scripts) =>
  [
    ['install', scripts.install],
    ['run', scripts.dev],
    ['build', scripts.build],
    ['test', scripts.test],
  ]
    .filter(([, command]) => !isMissingCommand(command))
    .map(([name, command]) => `# ${name}\n${command}`)
    .join('\n\n')

const buildBadgeHeader = (repoInfo) => `![GitHub stars](https://img.shields.io/github/stars/${repoInfo.fullName})
![GitHub forks](https://img.shields.io/github/forks/${repoInfo.fullName})
![GitHub license](https://img.shields.io/github/license/${repoInfo.fullName})
![GitHub last commit](https://img.shields.io/github/last-commit/${repoInfo.fullName})
![GitHub issues](https://img.shields.io/github/issues/${repoInfo.fullName})
![GitHub top language](https://img.shields.io/github/languages/top/${repoInfo.fullName})`

const buildStandardSections = (repoInfo, lang, sections) => {
  const text = TEXT[lang]
  const scripts = extractScripts(repoInfo, lang)

  return [
    `# ${repoInfo.name}`,
    buildBadgeHeader(repoInfo),
    repoInfo.description && repoInfo.description !== 'None' ? `> ${repoInfo.description}` : '',
    sectionBlock(sections, 'overview', text.overview, formatOverview(repoInfo, lang)),
    sectionBlock(sections, 'repositoryInfo', text.repositoryInfo, buildRepositoryInfo(repoInfo, lang)),
    sectionBlock(sections, 'techStack', text.techStack, formatTechStack(repoInfo, lang)),
    sectionBlock(sections, 'features', text.features, formatFeatures(repoInfo, lang)),
    sectionBlock(
      sections,
      'projectStructure',
      text.projectStructure,
      formatProjectStructure(repoInfo.readmeData, lang)
    ),
    sectionBlock(
      sections,
      'importantFiles',
      text.importantFiles,
      formatImportantFiles(repoInfo.readmeData, lang)
    ),
    sectionBlock(
      sections,
      'scripts',
      text.availableScripts,
      formatScripts(repoInfo.readmeData, lang) || `\`\`\`bash\n${buildProjectCommandBlock(scripts)}\n\`\`\``
    ),
    sectionBlock(sections, 'license', text.license, formatLicense(repoInfo.license, lang)),
  ]
}

const buildMarkdown = (repoInfo, options) => {
  const language = options.language === 'en' ? 'en' : 'ko'
  return joinBlocks([
    ...buildStandardSections(repoInfo, language, options.sections),
    `## ${TEXT[language].link}\n\n${repoInfo.url}`,
  ]) + '\n'
}

const parseStreamBuffer = (buffer, onEvent) => {
  const lines = buffer.split('\n')
  const remainingBuffer = lines.pop() || ''

  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      onEvent(JSON.parse(line))
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

      buffer = parseStreamBuffer(buffer + decoder.decode(value, { stream: true }), handleEvent)
    }

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
