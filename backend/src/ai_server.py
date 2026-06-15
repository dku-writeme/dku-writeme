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

def call_ai(prompt, max_tokens=500):
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
            max_tokens=max_tokens,
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

def extract_json_object(text):
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.IGNORECASE)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and start < end:
            return json.loads(cleaned[start:end + 1])
        raise

def normalize_features(features):
    if isinstance(features, list):
        return [
            str(feature).strip()
            for feature in features
            if str(feature).strip()
        ]

    return [
        line.strip()
        for line in str(features or "").splitlines()
        if line.strip()
    ]

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    context = json.dumps(req.model_dump(), indent=2, ensure_ascii=False)

    prompt_analysis = f"""아래는 GitHub 저장소의 파일 목록과 내용입니다.
    [데이터]
    {context}

    README 생성에 필요한 분석 결과를 JSON으로 작성하시오.

    [출력 형식 - 반드시 준수]
    {{
      "summary": "README 제목 아래 인용문에 들어갈 한 줄 요약",
      "features": [
        "- 기능명: 설명",
        "- 기능명: 설명"
      ]
    }}

    [summary 규칙]
    - 마크다운 없이 순수 텍스트 한 문장
    - 프로젝트가 제공하는 핵심 가치나 해결하는 문제 중심
    - 프로젝트명, 파일명, 함수명, 변수명 반복 금지
    - 코드에서 확인된 것만 작성하고 추측 금지

    [features 규칙]
    - 4~8가지 작성
    - 각 항목 형식: "- 기능명: 설명"
    - 기능명은 반드시 한국어 명사구로 작성
    - Weather Data, Market Data, Caching 같은 영어 코드/변수명 제목을 그대로 쓰지 말 것
    - API, 라이브러리, 서비스의 고유명사는 설명에만 필요한 만큼 원문 영어 표기 유지
    - 설명은 35~80자 정도의 자연스러운 한국어 문장으로 작성
    - 사용자 관점에서 "무엇을 할 수 있는가", "화면에 무엇을 제공하는가" 중심으로 작성
    - API 제공자나 데이터 소스별로 기능을 쪼개지 말고, 실제 사용자 기능 단위로 묶기
    - 예: 날씨 API, 대기질 API, 주가 API를 따로 쓰지 말고 "일일 브리핑 제공"처럼 묶기
    - 예: 캐싱, 목업 데이터는 별도 기능보다 "에러 처리와 재시도"처럼 사용자 경험 중심으로 묶기
    - 코드에서 확인된 기능만 작성하고 추측 금지
    - 같은 성격의 기능은 하나로 묶기
    - 기능명 또는 설명이 같은 항목은 하나만 작성
    - 개발 도구(Webpack, Babel 등)는 기능이 아니므로 제외
    - 프로젝트 전체를 다시 설명하는 항목 제외
    - 파일명, 함수명, 변수명은 언급하지 말 것
    - 좋은 예시:
      "- 일일 브리핑 제공: 실시간 날씨, 대기질, 주식 시장 정보를 요약하여 제공합니다."
      "- 실시간 데이터 업데이트: 지정된 주기로 최신 데이터를 새로고침하고 화면에 표시합니다."
      "- 에러 처리와 재시도: API 호출 실패 시 대체 데이터를 표시하거나 재시도합니다."
      "- 시장 배경 지표 분석: 환율, 금리, 유가 등의 시장 지표를 분석하고 해석합니다."

    [공통 규칙]
    - JSON 외의 설명, 마크다운 코드블록, 주석 출력 금지
    - 한국어 문장으로 작성하되 기술명, 라이브러리명, 프레임워크명은 원문 영어 표기 유지
    - React, Vite, Node.js, TypeScript 같은 기술명을 한글로 음역하지 말 것
    - 중국어, 일본어, 한자 문자는 절대 사용하지 말 것"""
    try:
        analysis_text = call_ai(prompt_analysis, max_tokens=650)
        analysis_result = extract_json_object(analysis_text)
        summary = str(analysis_result.get("summary", "")).strip()
        features = normalize_features(analysis_result.get("features"))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (json.JSONDecodeError, TypeError) as error:
        raise HTTPException(status_code=422, detail=f"AI 응답이 JSON 형식이 아닙니다: {str(error)}") from error

    # 기존 description은 신뢰 가능한 경우 유지하고, 없을 때만 AI 요약으로 보완
    if not req.description or req.description in ("None", "") or has_disallowed_language(req.description):
        print("💡 [INFO] description이 없거나 비한국어 문자가 포함되어 있습니다. ➡️ AI 요약으로 보완합니다.")
        description = summary
    else:
        print(f"✅ [INFO] 기존 description이 존재합니다. AI를 사용하지 않고 기존 데이터를 유지합니다.")
        print(f"   (기존 내용: {req.description[:30]}...)")
        description = req.description
    
    return {
        "summary": summary,
        "description": description,
        "features": features
    }
