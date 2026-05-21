// 백엔드에서 받아온 저장소 정보를 README markdown으로 변환하는 템플릿 모음
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

// selectedFileContents에서 package.json을 찾아 scripts 추출
function extractScripts(selectedFileContents) {
  if (!selectedFileContents || selectedFileContents.length === 0) {
    return { install: 'npm install', dev: 'npm run dev' }
  }

  const packageJson = selectedFileContents.find(
    (f) => f.path === 'package.json'
  )

  if (!packageJson) {
    return { install: 'npm install', dev: 'npm run dev' }
  }

  try {
    const parsed = JSON.parse(packageJson.content)
    const scripts = parsed.scripts || {}

    // 실행 명령어 우선순위: dev > start > serve
    const devScript = scripts.dev
      ? `npm run dev`
      : scripts.start
      ? `npm start`
      : scripts.serve
      ? `npm run serve`
      : 'npm run dev'

    return {
      install: 'npm install',
      dev: devScript
    }
  } catch {
    return { install: 'npm install', dev: 'npm run dev' }
  }
// README 생성에 활용할 핵심 파일 목록을 markdown 리스트 형태로 변환
const formatImportantFiles = (readmeData) => {
  // 백엔드에서 정리한 핵심 파일 목록이 없으면 None으로 표시
  const files = readmeData?.importantFiles || []

  if (files.length === 0) {
    return '- None'
  }

  // README가 너무 길어지지 않도록 상위 핵심 파일만 보여줌
  return files
    .slice(0, 8)
    .map((file) => `- \`${file.path}\` - ${file.reason}`)
    .join('\n')
}

// package.json에서 추출한 실행 스크립트를 markdown 리스트 형태로 변환
const formatScripts = (readmeData) => {
  // 분석된 scripts 정보가 없으면 None으로 표시
  const scripts = readmeData?.analysis?.scripts || {}
  const scriptEntries = Object.entries(scripts)

  if (scriptEntries.length === 0) {
    return '- None'
  }

  // README에 보여줄 주요 실행 스크립트만 정리
  return scriptEntries
    .slice(0, 6)
    .map(([name, command]) => `- \`${name}\`: \`${command}\``)
    .join('\n')
}

// 전체 파일 트리에서 최상위 폴더 목록을 README 구조 섹션 형태로 변환
const formatProjectStructure = (readmeData) => {
  // 백엔드에서 정리한 최상위 폴더 목록이 없으면 None으로 표시
  const directories = readmeData?.fileSummary?.topLevelDirectories || []

  if (directories.length === 0) {
    return '- None'
  }

  // 프로젝트 구조를 간단히 보여주기 위해 상위 폴더만 표시
  return directories
    .slice(0, 8)
    .map((directory) => `- \`${directory}/\``)
    .join('\n')
}

const TEMPLATE_BUILDERS = {
  // 기본 정보, 설치, 사용법, 기능, 라이선스 섹션을 포함한 기본 템플릿 구성
  basic: (repoInfo) => {
  const scripts = extractScripts(repoInfo.selectedFileContents)

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

${repoInfo.features || '- 기능 정보를 불러오는 중 오류가 발생했습니다.'}
- GitHub repository summary
- README template generation
- GitHub file analysis for README generation

## Project Structure

${formatProjectStructure(repoInfo.readmeData)}

## Important Files

${formatImportantFiles(repoInfo.readmeData)}

## Available Scripts

${formatScripts(repoInfo.readmeData)}

## License

This project is licensed under the ${repoInfo.license} License.
`,
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
  // 존재하지 않는 템플릿 값이 들어오면 basic 템플릿으로 대체
  const selectedTemplate = TEMPLATE_BUILDERS[template] ? template : 'basic'

  try {
    // 백엔드 API에 owner, repo 정보를 POST 방식으로 전달
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({owner,repo})
    });

    // 백엔드 응답 body를 JSON 객체로 변환
    const repoInfo = await response.json()

    if (!response.ok) {
      // 백엔드에서 전달한 에러 메시지가 있으면 해당 메시지로 에러 처리
      throw new Error(repoInfo.message || "서버 응답 에러");
    }

    // 선택된 템플릿으로 README markdown을 생성해 repo 원본 정보와 함께 반환
    return {
      markdown: TEMPLATE_BUILDERS[selectedTemplate](repoInfo),
      repo: repoInfo
    };
  } catch(error) {
    // App.jsx에서 alert로 보여줄 수 있도록 에러를 다시 던짐
    console.error("README 생성 오류: ", error);
    throw error;
  }
}
