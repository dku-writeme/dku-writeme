import { deliverInfo, deliverFileTree, deliverFileContents } from '../../../lib/deliverInfo.js';
import { selectImportantFiles } from '../../../lib/selectImportantFiles.js';

export async function POST(request) {
    try {
        // 1. 프론트에서 데이터 받기
        const read = await request.json();
        const { owner, repo } = read;

        if (!owner || !repo) {
            return new Response(
                JSON.stringify({ error: 'owner와 repo정보가 필요합니다!' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 2. GitHub API로 저장소 기본 정보 수집
        const repoInfo = await deliverInfo(owner, repo);
        if (!repoInfo) {
            return new Response(
                JSON.stringify({ error: 'GitHub 저장소 정보를 가져올 수 없습니다.' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. 파일 트리 수집
        const fileTree = await deliverFileTree(owner, repo, repoInfo.defaultBranch);

        // 4. 파일 선별 로직 적용
        const selectedFiles = selectImportantFiles(fileTree);

        // 5. 선별된 파일 내용 수집
        const selectedFileContents = await deliverFileContents(owner, repo, repoInfo.defaultBranch, selectedFiles);

        // 6. Python AI 서버에 분석 요청
        const aiResponse = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: repoInfo.name,
                description: repoInfo.description,
                selectedFileContents: selectedFileContents.map(f => ({
                    path: f.path,
                    content: f.content
                }))
            })
        });

        if (!aiResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const aiResult = await aiResponse.json();

        // 7. 프론트로 최종 응답 반환
        return new Response(
            JSON.stringify({
                ...repoInfo,
                description: aiResult.description,
                features: aiResult.features,
                selectedFileContents
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: '데이터 처리 중 에러 발생' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}