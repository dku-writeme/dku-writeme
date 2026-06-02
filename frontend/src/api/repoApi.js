// 백엔드에서 받아온 저장소 정보를 README markdown으로 변환하는 템플릿 모음
const DEFAULT_API_BASE_URL = 'http://localhost:3000'
const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

// 토픽 목록이 비어있으면 README에 None으로 표시
const formatTopics = (topics) => {
  if (!topics || topics.length === 0) {
    return 'None'
  }
  return topics.join(', ')
}

// GitHub API 날짜 문자열을 README에 보여줄 날짜 형식으로 변환
const formatDate = (date) => {
  if (!date) {
    return 'None'
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
function extractScripts(repoInfo) {
  const scripts = extractPackageScripts(repoInfo)

  if (!scripts) {
    return {
      install: 'No install command detected.',
      dev: 'No run command detected.',
    }
  }

  // 실행 명령어 우선순위: dev > start > serve
  const devScript = scripts.dev
    ? 'npm run dev'
    : scripts.start
      ? 'npm start'
      : scripts.serve
        ? 'npm run serve'
        : 'No run command detected.'

  return {
    install: 'npm install',
    dev: devScript,
  }
}

const formatFeatures = (features) => {
  if (Array.isArray(features) && features.length > 0) {
    return features
      .map((feature) => String(feature).trim())
      .filter(Boolean)
      .map((feature) => `- ${feature.replace(/^-+\s*/, '')}`)
      .join('\n')
  }

  if (typeof features === 'string' && features.trim()) {
    return features
      .trim()
      .split(/\r?\n/)
      .map((feature) => feature.trim())
      .filter(Boolean)
      .map((feature) => (feature.startsWith('- ') ? feature : `- ${feature}`))
      .join('\n')
  }

  return '- None'
}

const formatLicense = (license) => {
  if (!license || license === 'None') {
    return 'No license information provided.'
  }

  return `This project is licensed under the ${license} License.`
}

// README 생성에 활용할 핵심 파일 목록을 markdown 리스트 형태로 변환
const formatImportantFiles = (readmeData) => {
  const files = readmeData?.importantFiles || []
  if (files.length === 0) {
    return '- None'
  }
  return files
    .slice(0, 8)
    .map((file) => `- \`${file.path}\` - ${file.reason}`)
    .join('\n')
}

// package.json에서 추출한 실행 스크립트를 markdown 리스트 형태로 변환
const formatScripts = (readmeData) => {
  const scripts = readmeData?.analysis?.scripts || {}
  const scriptEntries = Object.entries(scripts)
  if (scriptEntries.length === 0) {
    return '- None'
  }
  return scriptEntries
    .slice(0, 6)
    .map(([name, command]) => `- \`${name}\`: \`${command}\``)
    .join('\n')
}

// 전체 파일 트리에서 최상위 폴더 목록을 README 구조 섹션 형태로 변환
const formatProjectStructure = (readmeData) => {
  const directories = readmeData?.fileSummary?.topLevelDirectories || []
  if (directories.length === 0) {
    return '- None'
  }
  return directories
    .slice(0, 8)
    .map((directory) => `- \`${directory}/\``)
    .join('\n')
}

const TEMPLATE_BUILDERS = {
  // 기본 정보, 설치, 사용법, 기능, 라이선스 섹션을 포함한 기본 템플릿 구성
  basic: (repoInfo) => {
    const scripts = extractScripts(repoInfo)

    return `# ${repoInfo.name}

## Repository Information

- Full Name: ${repoInfo.fullName}
- Description: ${repoInfo.description}
- Language: ${repoInfo.language}
- Default Branch: ${repoInfo.defaultBranch}
- Stars: ${repoInfo.stars}
- Forks: ${repoInfo.forks}
- Open Issues: ${repoInfo.openIssues}
- Topics: ${formatTopics(repoInfo.topics)}
- Last Updated: ${formatDate(repoInfo.updatedAt)}

## Installation

\`\`\`bash
${scripts.install}
\`\`\`

## Usage

\`\`\`bash
${scripts.dev}
\`\`\`

## Features

${formatFeatures(repoInfo.features)}

## Project Structure

${formatProjectStructure(repoInfo.readmeData)}

## Important Files

${formatImportantFiles(repoInfo.readmeData)}

## Available Scripts

${formatScripts(repoInfo.readmeData)}

## License

${formatLicense(repoInfo.license)}
`
  },
  // 저장소 설명과 기술 스택, 링크만 간단히 보여주는 심플 템플릿 구성
  simple: (repoInfo) => `# ${repoInfo.fullName}

${repoInfo.description}

## Tech Stack

- ${repoInfo.language}

## Project Info

- Default Branch: ${repoInfo.defaultBranch}
- Topics: ${formatTopics(repoInfo.topics)}
- Last Updated: ${formatDate(repoInfo.updatedAt)}

## Important Files

${formatImportantFiles(repoInfo.readmeData)}

## Link

${repoInfo.url}
`,

  // GitHub badge를 상단에 보여주는 뱃지 강조 템플릿 구성
  badge: (repoInfo) => `# ${repoInfo.name}

![GitHub stars](https://img.shields.io/github/stars/${repoInfo.fullName})
![GitHub forks](https://img.shields.io/github/forks/${repoInfo.fullName})
![GitHub license](https://img.shields.io/github/license/${repoInfo.fullName})

## Overview

${repoInfo.description}

## Repository

- Name: ${repoInfo.fullName}
- URL: ${repoInfo.url}
- Primary Language: ${repoInfo.language}
- Default Branch: ${repoInfo.defaultBranch}
- Open Issues: ${repoInfo.openIssues}
- Created At: ${formatDate(repoInfo.createdAt)}
- Last Updated: ${formatDate(repoInfo.updatedAt)}

## Available Scripts

${formatScripts(repoInfo.readmeData)}
`,
}

// owner, repo, template 값을 기반으로 README markdown 생성 요청 처리
export async function requestReadme(owner, repo, template = 'basic') {
  const selectedTemplate = TEMPLATE_BUILDERS[template] ? template : 'basic'

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
      markdown: TEMPLATE_BUILDERS[selectedTemplate](repoInfo),
      repo: repoInfo,
    }
  } catch (error) {
    // App.jsx에서 alert로 보여줄 수 있도록 에러를 다시 던짐
    console.error('README 생성 오류: ', error)
    throw error
  }
}