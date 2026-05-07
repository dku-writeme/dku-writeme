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
            license: data.license ? data.license.spdx_id : 'None'
        };
    } catch (error) {
        // 에러가 나는 경우, 에러코드와 함께 반환
        console.error("데이터를 가져오는 중 오류가 발생했습니다: ", error);
        return null;
    }
}