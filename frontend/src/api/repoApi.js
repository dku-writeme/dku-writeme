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

## License

This project is licensed under the ${repoInfo.license} License.
`
},
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
