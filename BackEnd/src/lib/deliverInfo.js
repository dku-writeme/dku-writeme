// src/lib/deliverInfo

export async function deliverInfo(owner, repo) {
    // 1. Api주소 생성
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`
    
    try {
        // 2. 데이터 요청
        const response = await fetch(apiUrl)
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
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`

    try {
        // 2. GitHub API로 파일/폴더 목록 요청
        const response = await fetch(apiUrl)
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
