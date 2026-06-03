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

function parsePackageJson(fileContents) {
  // package.json 파일이 있으면 README에 사용할 실행 스크립트와 의존성을 추출
  const packageFile = findFileByName(fileContents, 'package.json')

  if (!packageFile) {
    return null
  }

  try {
    // package.json 문자열을 객체로 변환해 필요한 항목만 정리
    const packageJson = JSON.parse(packageFile.content)
    return {
      name: packageJson.name || null,
      version: packageJson.version || null,
      scripts: packageJson.scripts || {},
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
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

function getPrimaryLanguage(repoInfo, files) {
  if (hasPath(files, /\.java$/)) return 'Java'
  if (hasPath(files, /\.tsx?$/) || hasPath(files, /\.jsx?$/)) return 'JavaScript'
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

  if (primaryLanguage && primaryLanguage !== 'None') stack.add(primaryLanguage)

  if (/spring-boot/i.test(allContent) || hasPath(files, /Application\.java$/)) {
    stack.add('Spring Boot')
  }
  if (/thymeleaf/i.test(allContent) || hasPath(files, /src\/main\/resources\/templates\//)) {
    stack.add('Thymeleaf')
  }
  if (/h2database|com\.h2database|jdbc:h2/i.test(allContent)) stack.add('H2 Database')
  if (/mysql/i.test(allContent) || hasPath(files, /mysql/i)) stack.add('MySQL')
  if (/postgres/i.test(allContent) || hasPath(files, /postgres/i)) stack.add('PostgreSQL')
  if (hasFile(files, 'Dockerfile') || hasFile(files, 'docker-compose.yml')) stack.add('Docker')

  ;(packageJson?.dependencies || [])
    .filter((name) => ['react', 'vue', 'next', 'express', 'vite'].includes(name))
    .forEach((name) => stack.add(name))

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
  const candidates = [
    ['src/main/java/', '애플리케이션 Java 소스 코드'],
    ['src/main/resources/', '설정, 정적 리소스, 템플릿'],
    ['src/main/resources/templates/', '화면 템플릿'],
    ['src/main/resources/db/', '데이터베이스 스키마와 샘플 데이터'],
    ['src/test/', '테스트 코드'],
    ['k8s/', 'Kubernetes 배포 설정'],
    ['.github/workflows/', 'GitHub Actions 워크플로'],
  ]

  return candidates
    .filter(([path]) => files.some((file) => file.path.startsWith(path)))
    .map(([path, description]) => ({ path, description }))
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
        '설치 및 실행 방법',
        '라이선스',
      ],
    },
    // C: HuggingFace README 생성 프롬프트에 바로 전달할 수 있는 모델 입력
    modelInput: repositoryAnalysis.modelInput,
    // B: repository-analysis가 최종 선별한 파일과 분석 메타데이터
    repositoryAnalysis: repositoryAnalysis.selection,
  }
}
