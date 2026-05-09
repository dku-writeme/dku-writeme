// 너(FrontEnd)와 나((BackEnd)의 연결통로
import { deliverInfo } from '../../../lib/deliverInfo.js';

export async function POST(request) {
    try {
        // 1. 본문 읽기 (Front에서 JSON형태의 데이터 가져오기)
        const read = await request.json();
        const {owner, repo} = read;
        // 예외처리
        if (!owner || !repo) {
            const response = new Response(JSON.stringify({error : 'owner와 repo정보가 필요합니다!'}, {
                status: 400,
                headers: { 'Content-Type': 'application/json'}
            }));
            return response;
        }

        // 2. deliverInfo함수로 정보(JSON) 가져오기
        const result = await deliverInfo(owner, repo);

        // 3. 너(FrontEnd)에게 보낼 응답객체 만들기
        const response = new Response(JSON.stringify(result), {
            status: 200,
            headers: {'Content-Type':'application/json'}
        });
        return response;
    } catch (error) {
        const response = new Response(JSON.stringify({ error: '데이터 처리 중 에러 발생' }), { status: 500 });
        return response;
    }
}