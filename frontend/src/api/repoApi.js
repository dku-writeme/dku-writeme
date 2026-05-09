const MOCK_REPO_DESCRIPTION =
  'A sample GitHub repository used for README generation.'

const TEMPLATE_BUILDERS = {
  basic: (repoInfo) => `# ${repoInfo.name}

## Repository Information

- Full Name: ${repoInfo.fullName}
- Description: ${repoInfo.description}
- Language: ${repoInfo.language}
- Stars: ${repoInfo.stars}
- Forks: ${repoInfo.forks}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm run dev
\`\`\`

## Features

- GitHub repository summary
- README template generation
- Mock API response for frontend development

## License

This project is licensed under the ${repoInfo.license} License.
`,
  simple: (repoInfo) => `# ${repoInfo.fullName}

${repoInfo.description}

## Tech Stack

- ${repoInfo.language}

## Link

${repoInfo.url}
`,
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
`,
}

export async function requestReadme(owner, repo, template = 'basic') {
  const selectedTemplate = TEMPLATE_BUILDERS[template] ? template : 'basic'
  try {
    // POST방식으로 백엔드에게 요청 보내기
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({owner,repo})
    });
   
    if (!response.ok) throw new Error("서버 응답 에러");

    // JSON으로 변경
    const repoInfo = await response.json()
    // TEMPLATE_BUILDERS의 템플릿대로 markdown생성
    return {
      markdown: TEMPLATE_BUILDERS[selectedTemplate](repoInfo),
      repo: repoInfo
    };
  } catch(error) {
    console.error("README 생성 오류: ", error);
    throw error;
  }
}
