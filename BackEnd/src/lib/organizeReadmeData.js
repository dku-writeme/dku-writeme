// README 생성에 바로 사용할 수 있도록 저장소/파일/분석 정보를 한 구조로 정리함

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

function getContentPreview(content) {
  // 긴 파일 내용을 그대로 보여주지 않고 앞부분 일부만 미리보기로
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n')
}

export function organizeReadmeData(repoInfo, files, selectedFiles, selectedFileContents) {
  // 핵심 파일 내용에서 package.json과 기존 README 여부를 먼저 분석
  const packageJson = parsePackageJson(selectedFileContents)
  const existingReadme = findFileByName(selectedFileContents, 'readme.md')

  return {
    // README 상단 정보와 링크 영역에 사용할 저장소 기본 정보
    repository: {
      name: repoInfo.name,
      fullName: repoInfo.fullName,
      description: repoInfo.description,
      language: repoInfo.language,
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
      suggestedSections: [
        '프로젝트 소개',
        '주요 기능',
        '기술 스택',
        '설치 및 실행 방법',
        '라이선스',
      ],
    },
  }
}
