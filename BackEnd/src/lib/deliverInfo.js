// src/lib/deliverInfo
function getGithubHeaders() {
    const token = process.env.GITHUB_TOKEN
    return {
        'Accept': 'application/vnd.github+json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    }
}

export async function deliverInfo(owner, repo) {
    // 1. Api주소 생성
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`
    
    try {
        // 2. 데이터 요청
        const response = await fetch(apiUrl, { headers: getGithubHeaders() })
        if (!response.ok) {     // 응답코드 (200번대 이외=오류)일 경우, 에러발생
            throw new Error(`에러! status: ${response.status}`);
        }   

        // 3. 글자덩어리 -> json데이터로 변환 (frontend/src/api/repoApi.js/requestReadme함수와 형식 동일하게)
        const data = await response.json();
        return {
            name: data.name,
            fullName: data.full_name,
            description: data.description || 'None',
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language || 'None',
            url: data.html_url,
            license: data.license ? data.license.spdx_id : 'None',
            // README에 추가로 활용할 수 있는 저장소 메타데이터 반환
            defaultBranch: data.default_branch || 'None',
            topics: data.topics || [],
            homepage: data.homepage || 'None',
            openIssues: data.open_issues_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    } catch (error) {
        // 에러가 나는 경우, 에러코드와 함께 반환
        console.error("데이터를 가져오는 중 오류가 발생했습니다: ", error);
        return null;
    }
}

export async function deliverFileTree(owner, repo, branch) {
    // 1. 기본 브랜치를 기준으로 레포지토리 전체 파일 트리 API 주소 생성
    const encodedBranch = encodeURIComponent(branch)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodedBranch}?recursive=1`

    try {
        // 2. GitHub API로 파일/폴더 목록 요청
        const response = await fetch(apiUrl, { headers: getGithubHeaders() })
        if (!response.ok) {     // 응답코드 (200번대 이외=오류)일 경우, 에러발생
            throw new Error(`에러! status: ${response.status}`);
        }

        // 3. 파일 트리에서 README 분석에 활용할 path, type, size 정보만 정리해서 반환
        const data = await response.json();
        return data.tree.map((file) => ({
            path: file.path,
            type: file.type,
            size: file.size || 0
        }));
    } catch (error) {
        // 파일 트리 조회 실패 시 기본 정보 조회는 유지할 수 있도록 빈 배열 반환
        console.error("파일 트리를 가져오는 중 오류가 발생했습니다: ", error);
        return [];
    }
}

const DEFAULT_MAX_CONTENT_FILES = 30
const DEFAULT_MAX_CONTENT_SIZE = 100000

function encodeFilePath(path) {
    // GitHub API 주소에서 사용할 수 있도록 파일 경로를 인코딩함
    return path.split('/').map(encodeURIComponent).join('/')
}

function decodeBase64Content(content) {
    // GitHub API가 Base64로 전달한 파일 내용을 문자열로 변환함
    return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8')
}

async function deliverSingleFileContent(owner, repo, branch, file) {
    // 선별된 파일 경로를 기준으로 실제 파일 내용 API 주소 생성
    const encodedPath = encodeFilePath(file.path)
    const encodedBranch = encodeURIComponent(branch)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodedBranch}`

    try {
        // GitHub API로 단일 파일 내용을 요청함
        const response = await fetch(apiUrl, { headers: getGithubHeaders() })
        if (!response.ok) {     // 응답코드 (200번대 이외=오류)일 경우, 에러발생
            throw new Error(`에러! status: ${response.status}`);
        }

        // 파일 내용 조회 결과를 README 분석에 필요한 형태로 정리해서 반환
        const data = await response.json();
        return {
            path: file.path,
            type: file.type,
            size: file.size,
            reason: file.reason,
            priority: file.priority,
            content: decodeBase64Content(data.content || ''),
        };
    } catch (error) {
        // 일부 파일 조회 실패가 전체 응답 실패로 이어지지 않도록 null 반환
        console.error(`${file.path} 파일 내용을 가져오는 중 오류가 발생했습니다: `, error);
        return null;
    }
}

export async function deliverFileContents(owner, repo, branch, selectedFiles = [], options = {}) {
    const {
        maxFiles = DEFAULT_MAX_CONTENT_FILES,
        maxContentSize = DEFAULT_MAX_CONTENT_SIZE,
    } = options

    // 선별된 파일 중 크기가 작은 상위 파일만 실제 내용 조회 대상으로 사용함
    const targetFiles = selectedFiles
        .filter((file) => file.size <= maxContentSize)
        .slice(0, maxFiles)

    const fileContents = await Promise.all(
        targetFiles.map((file) => deliverSingleFileContent(owner, repo, branch, file))
    )

    // 조회에 성공한 파일 내용만 반환함
    return fileContents.filter(Boolean)
}
