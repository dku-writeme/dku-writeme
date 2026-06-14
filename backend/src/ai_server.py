from fastapi import FastAPI, HTTPException
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

DISALLOWED_LANGUAGE_PATTERN = re.compile(r'[\u4e00-\u9fff\u3040-\u30ff\u0400-\u04ff]')
MAX_AI_RETRIES = 2
TECH_TERM_REPLACEMENTS = [
    (re.compile(r'리액트'), 'React'),
    (re.compile(r'비타'), 'Vite'),
    (re.compile(r'노드\.?js', re.IGNORECASE), 'Node.js'),
    (re.compile(r'자바스크립트'), 'JavaScript'),
    (re.compile(r'타입스크립트'), 'TypeScript'),
    (re.compile(r'패스트API', re.IGNORECASE), 'FastAPI'),
]

# 입력 데이터 형식 정의
class AnalyzeRequest(BaseModel):
    name: str
    description: str | None = None
    selectedFileContents: list

def clean_response(text):
    # 따옴표 제거
    text = text.strip('"').strip("'")
    # 기술명은 README에서 통용되는 원문 표기를 유지
    for pattern, replacement in TECH_TERM_REPLACEMENTS:
        text = pattern.sub(replacement, text)
    # 환각 키워드 감지
    hallucination_keywords = ["예측", "트렌드", "SMS", "email", "향후", "잠재적"]
    for keyword in hallucination_keywords:
        if keyword in text:
            print(f"⚠️ 환각 감지: '{keyword}' 포함")
    # 한자, 일본어, 러시아어 등 비한국어 문자 감지
    non_korean = DISALLOWED_LANGUAGE_PATTERN.findall(text)
    if non_korean:
        print(f"⚠️ 비정상 문자 감지: {non_korean}")
    return text

def has_disallowed_language(text):
    return bool(DISALLOWED_LANGUAGE_PATTERN.search(text or ""))

def call_ai(prompt):
    messages = [
        {
            "role": "system",
            "content": (
                "당신은 코드 분석 전문가입니다. 모든 답변은 반드시 자연스러운 한국어 문장으로 작성하세요. "
                "프레임워크, 라이브러리, 런타임, 언어, API, 패키지 이름은 입력에 나온 원문 영어 표기를 유지하세요. "
                "예: React, Vite, Node.js, TypeScript, FastAPI를 리액트, 비타, 노드, 타입스크립트처럼 한글로 바꾸지 마세요. "
                "중국어, 일본어, 러시아어, 한자 문자는 절대 사용하지 마세요. "
                "금지 문자 예시: 的, 是, 了, 项, 目, 功, 能, 系, 统, 語, 中."
            )
        },
        {
            "role": "user",
            "content": prompt
        }
    ]

    last_text = ""
    for attempt in range(MAX_AI_RETRIES + 1):
        response = client.chat_completion(
            messages=messages,
            max_tokens=500,
            temperature=0.2,
        )
        last_text = clean_response(response.choices[0].message.content.strip())

        if not has_disallowed_language(last_text):
            return last_text

        if attempt < MAX_AI_RETRIES:
            print(f"⚠️ 비한국어 응답으로 재시도합니다. ({attempt + 1}/{MAX_AI_RETRIES})")
            messages.append({
                "role": "assistant",
                "content": last_text
            })
            messages.append({
                "role": "user",
                "content": (
                    "방금 답변에 중국어/일본어/한자 문자가 포함되었습니다. "
                    "해당 문자를 모두 제거하고, 같은 내용을 한국어 문장으로 다시 작성하세요. "
                    "단, 기술명과 라이브러리명은 원문 영어 표기를 유지하세요."
                )
            })

    raise ValueError(f"AI 응답에 금지된 문자가 포함되었습니다: {last_text[:80]}")

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    context = json.dumps(req.model_dump(), indent=2, ensure_ascii=False)

    # 질문 1. README 상단 인용문용 한 줄 요약 생성
    prompt_summary = f"""아래는 GitHub 저장소의 파일 목록과 내용입니다.
    [데이터]
    {context}
    README 제목 아래 인용문에 들어갈 한 줄 요약을 작성하시오.
    [출력 규칙 - 반드시 준수]
    - 마크다운 없이 순수 텍스트 한 문장으로만 출력
    - 프로젝트가 제공하는 핵심 가치나 해결하는 문제 중심으로 작성
    - 프로젝트명, 파일명, 함수명, 변수명 반복 금지
    - 코드에서 확인된 것만 작성하고 추측 금지
    - 입력 데이터에 중국어/일본어/한자가 있어도 출력에는 절대 포함하지 말 것
    - 한국어 문장으로 작성하되 기술명, 라이브러리명, 프레임워크명은 원문 영어 표기 유지
    - React, Vite, Node.js, TypeScript 같은 기술명을 한글로 음역하지 말 것"""
    try:
        summary = call_ai(prompt_summary)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    # 기존 description은 신뢰 가능한 경우 유지하고, 없을 때만 AI 요약으로 보완
    if not req.description or req.description in ("None", "") or has_disallowed_language(req.description):
        print("💡 [INFO] description이 없거나 비한국어 문자가 포함되어 있습니다. ➡️ AI 요약으로 보완합니다.")
        description = summary
    else:
        print(f"✅ [INFO] 기존 description이 존재합니다. AI를 사용하지 않고 기존 데이터를 유지합니다.")
        print(f"   (기존 내용: {req.description[:30]}...)")
        description = req.description

    # 질문 2. 주요 기능 추출
    prompt_features = f"""아래는 GitHub 저장소의 파일 목록과 내용입니다.
    [데이터]
    {context}
    이 프로그램의 주요 기능을 2~6가지로 작성하시오.
    [출력 규칙 - 반드시 준수]
    - 형식: "- 기능명: 설명" 한 줄로만
    - 설명은 20자 이내로 간결하게
    - 파일명, 함수명, 변수명 언급 금지
    - 사용자 관점에서 "무엇을 하는가"만 작성
    - 한국어 문장으로 작성하되 기술명, 라이브러리명, 프레임워크명은 원문 영어 표기 유지
    - React, Vite, Node.js, TypeScript 같은 기술명을 한글로 음역하지 말 것
    - 코드에서 확인된 것만, 추측 금지
    - 코드에 없는 기능은 절대 작성하지 말 것
    - 확인되지 않은 기능은 목록에서 제외할 것
    - 사용자가 이 프로젝트로 "무엇을 할 수 있는지" 관점으로 작성
    - 같은 성격의 기능은 하나로 묶되, 구체적인 예시를 괄호로 추가할 것
    - 기능명 또는 설명이 같은 항목은 하나만 작성
    - 같은 기능을 모델명, 서비스명, 라이브러리명, 구현명으로 다시 작성하지 말 것
    - 개발 도구(Webpack, Babel 등)는 기능이 아니므로 제외
    - 프로젝트 전체를 다시 설명하는 항목 제외
    [좋은 예시]
    - 주식 가격 수집: 지정한 종목의 실시간 주가를 가져옵니다.
    - 조건 알림: 목표가 초과 시 자동으로 알림을 발송합니다.
    - 미니게임 플레이: 구구단, 끝말잇기, 숫자야구 등 다양한 게임을 즐길 수 있습니다.
    - 게임 소스코드 학습: 각 게임의 React 구현 코드를 직접 확인할 수 있습니다.
    [나쁜 예시 - 이렇게 하지 말 것]
    - collector.py의 fetch_data 함수가 yfinance를 사용해서 주가 데이터를...
    - 리액트 웹 게임 개발: 여러 리액트를 기반으로 한 웹 게임을 개발합니다. (너무 포괄적)
    - 구구단 게임: 구구단을 맞추는 게임입니다. (개별 나열)
    - 특정 모델 챗봇: 다양한 질문에 답변합니다. (모델명/구현명 중심)
    - Webpack 환경 구축: Babel과 Webpack을 사용합니다. (개발 도구 언급)
    """
    try:
        features = call_ai(prompt_features)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    
    return {
        "summary": summary,
        "description": description,
        "features": features
    }
