from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from huggingface_hub import InferenceClient
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = InferenceClient(
    model="Qwen/Qwen2.5-Coder-7B-Instruct",
    token=HF_TOKEN
)

# 입력 데이터 형식 정의
class AnalyzeRequest(BaseModel):
    name: str
    description: str | None = None
    selectedFileContents: list

def clean_response(text):
    # 따옴표 제거
    text = text.strip('"').strip("'")
    # 환각 키워드 감지
    hallucination_keywords = ["예측", "트렌드", "SMS", "email", "향후", "잠재적"]
    for keyword in hallucination_keywords:
        if keyword in text:
            print(f"⚠️ 환각 감지: '{keyword}' 포함")
    # 한자, 일본어, 러시아어 등 비한국어 문자 감지
    non_korean = re.findall(r'[\u4e00-\u9fff\u3040-\u30ff\u0400-\u04ff]', text)
    if non_korean:
        print(f"⚠️ 비정상 문자 감지: {non_korean}")
    return text

def call_ai(prompt):
    response = client.chat_completion(
        messages=[
            {
                "role": "system",
                "content": "당신은 코드 분석 전문가입니다. 반드시 한국어로만 작성하세요. 한자, 일본어, 중국어, 러시아어 사용 금지."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=500,
    )
    return clean_response(response.choices[0].message.content.strip())

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    context = json.dumps(req.model_dump(), indent=2, ensure_ascii=False)

    # 질문 1. 프로젝트 설명 (description 없을 때만 AI 사용)
    if not req.description or req.description in ("None", ""):
        print("💡 [INFO] description이 없거나 비어 있습니다. ➡️ AI 분석을 호출합니다.")
        prompt_desc = f"""
        다음 코드를 보고 프로젝트를 설명해주세요.
        {context}
        """
        description = call_ai(prompt_desc)
    else:
        print(f"✅ [INFO] 기존 description이 존재합니다. AI를 사용하지 않고 기존 데이터를 유지합니다.")
        print(f"   (기존 내용: {req.description[:30]}...)")
        description = req.description

    # 질문 2. 주요 기능 추출
        prompt_features = f"""
    다음 코드를 보고 주요 기능을 알려주세요.
    {context}
    """
    features = call_ai(prompt_features)
    
    print("\n" + "="*40)
    print("🚀 [AI SERVER] analyze 함수 반환 값 확인")
    print("="*40)
    print(f"📝 Description:\n{description}")
    print("-"*40)
    print(f"⚡ Features:\n{features}")
    print("="*40 + "\n")

    return {
        "description": description,
        "features": features
    }