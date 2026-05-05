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
  const repoInfo = {
    name: repo,
    fullName: `${owner}/${repo}`,
    description: MOCK_REPO_DESCRIPTION,
    stars: 12345,
    forks: 678,
    language: 'JavaScript',
    url: `https://github.com/${owner}/${repo}`,
    license: 'MIT',
  }

  // const response = await fetch(
  //   `http://localhost:3000/api/readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&template=${encodeURIComponent(selectedTemplate)}`,
  // )
  // return response.json()

  return Promise.resolve({
    markdown: TEMPLATE_BUILDERS[selectedTemplate](repoInfo),
    repo: repoInfo,
  })
}
