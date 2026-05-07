import { deliverInfo } from './lib/deliverInfo.js';

async function runTest() {
    console.log("🚀 GitHub API 데이터 파싱 테스트 시작...");
    
    // 테스트하고 싶은 저장소를 입력해보세요 (예: facebook/react 또는 octocat/Hello-World)
    const owner = 'dku-writeme';
    const repo = 'dku-writeme';

    const result = await deliverInfo(owner, repo);

    if (result) {
        console.log("\n✅ [파싱 성공! 결과 데이터]");
        console.table(result); // 데이터를 표 형태로 예쁘게 출력
        
        console.log("\n상세 확인:");
        console.log(`- 저장소 이름: ${result.name}`);
        console.log(`- 스타 개수: ${result.stars}개`);
        console.log(`- 라이선스: ${result.license}`);
    } else {
        console.log("\n❌ 데이터를 가져오는 데 실패했습니다.");
    }
}

runTest();