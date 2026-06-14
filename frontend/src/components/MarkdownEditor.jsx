import CodeMirror from '@uiw/react-codemirror'
import { autocompletion, completeFromList } from '@codemirror/autocomplete'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BoldIcon,
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
} from './Icons.jsx'

const README_SNIPPET_GROUPS = [
  {
    label: '기본 README',
    snippets: [
      {
        value: 'overview',
        label: '프로젝트 소개',
        markdown: `## 📌 프로젝트 소개

이 프로젝트가 해결하는 문제와 주요 사용자를 설명합니다.
`,
      },
      {
        value: 'features',
        label: '주요 기능',
        markdown: `## ✨ 주요 기능

**기능 이름**

- 기능에 대한 설명

**기능 이름**

- 기능에 대한 설명

**기능 이름**

- 기능에 대한 설명
`,
      },
      {
        value: 'tech-stack',
        label: '기술 스택',
        markdown: `## 🛠 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend |  |
| Backend |  |
| Database |  |
| Infra |  |
`,
      },
      {
        value: 'installation',
        label: '설치 및 실행 방법',
        markdown: `## 🚀 설치 및 실행 방법

### 1. 저장소 복제

\`\`\`bash
git clone 저장소_URL
cd 저장소_이름
\`\`\`

### 2. 의존성 설치

\`\`\`bash
npm install
\`\`\`

### 3. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`
`,
      },
      {
        value: 'usage',
        label: '사용 방법',
        markdown: `## 📝 사용 방법

1. 실행 순서 또는 사용 방법을 작성합니다.
2. 주요 기능의 이용 방법을 작성합니다.
3. 필요한 경우 예시를 추가합니다.
`,
      },
      {
        value: 'environment',
        label: '환경 변수',
        markdown: `## 🔐 환경 변수

\`.env.example\` 파일을 참고하여 \`.env\` 파일을 생성합니다.

\`\`\`bash
cp .env.example .env
\`\`\`

| 변수명 | 설명 | 필수 |
| --- | --- | --- |
| \`API_KEY\` | API 인증 키 | 예 |
`,
      },
      {
        value: 'project-structure',
        label: '프로젝트 구조',
        markdown: `## 📁 프로젝트 구조

\`\`\`text
.
├── src/              # 소스 코드
├── public/           # 정적 파일
├── package.json      # 의존성 및 실행 스크립트
└── README.md
\`\`\`
`,
      },
    ],
  },
  {
    label: '확장 문서',
    snippets: [
      {
        value: 'screenshots',
        label: '실행 화면',
        markdown: `## 🖥️ 실행 화면

| 화면 | 설명 |
| --- | --- |
| ![실행 화면](이미지 경로) | 화면에 대한 설명 |
`,
      },
      {
        value: 'architecture',
        label: '아키텍처',
        markdown: `## 🏗️ 아키텍처

\`\`\`text
Client
  ↓
Frontend
  ↓
Backend
  ↓
Database 또는 External API
\`\`\`

구성 요소 간의 데이터 흐름을 설명합니다.
`,
      },
      {
        value: 'api-reference',
        label: 'API 명세',
        markdown: `## 📡 API 명세

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | \`/api/example\` | API 설명 |
| POST | \`/api/example\` | API 설명 |
`,
      },
      {
        value: 'testing',
        label: '테스트',
        markdown: `## 🧪 테스트

\`\`\`bash
npm test
\`\`\`

테스트 범위와 검증 대상을 설명합니다.
`,
      },
      {
        value: 'deployment',
        label: '배포 방법',
        markdown: `## 📦 배포 방법

\`\`\`bash
npm run build
\`\`\`

배포 환경과 배포 절차를 설명합니다.
`,
      },
    ],
  },
  {
    label: '협업 및 운영',
    snippets: [
      {
        value: 'roadmap',
        label: '로드맵',
        markdown: `## 🗺️ 로드맵

- [ ] 추가할 기능
- [ ] 개선할 기능
- [ ] 해결할 문제
`,
      },
      {
        value: 'contributing',
        label: '기여하기',
        markdown: `## 🤝 기여하기

1. 저장소를 Fork합니다.
2. 작업 브랜치를 생성합니다.
3. 변경 사항을 커밋합니다.
4. Pull Request를 생성합니다.
`,
      },
      {
        value: 'team',
        label: '팀원 소개',
        markdown: `## 👥 팀원 소개

| 이름 | 역할 | 담당 |
| --- | --- | --- |
| 이름 | 역할 | 담당 기능 |
`,
      },
      {
        value: 'changelog',
        label: '변경 내역',
        markdown: `## 📝 변경 내역

### Unreleased

- 변경 내용을 작성합니다.
`,
      },
      {
        value: 'troubleshooting',
        label: '문제 해결',
        markdown: `## 🛠️ 문제 해결

### 문제 제목

- **문제**: 발생한 문제를 설명합니다.
- **원인**: 문제의 원인을 설명합니다.
- **해결**: 해결 방법을 설명합니다.
`,
      },
      {
        value: 'license',
        label: '라이선스',
        markdown: `## 📄 라이선스

이 프로젝트는 \`라이선스 이름\` 라이선스를 따릅니다.
`,
      },
    ],
  },
]

const MARKDOWN_COMPLETIONS = [
  {
    label: 'README overview',
    detail: '개요 섹션',
    type: 'section',
    apply: '## 📌 개요\n\n이 프로젝트의 목적과 핵심 가치를 설명합니다.\n',
  },
  {
    label: 'Features',
    detail: '주요 기능',
    type: 'section',
    apply: '## ✨ 주요 기능\n\n**기능 1**\n\n- 기능 설명\n\n**기능 2**\n\n- 기능 설명\n',
  },
  {
    label: 'Tech stack',
    detail: '기술 스택 표',
    type: 'section',
    apply: '## 🛠 기술 스택\n\n| 구분 | 기술 |\n| --- | --- |\n| Frontend | React |\n| Backend | Node.js |\n',
  },
  {
    label: 'Code block',
    detail: 'bash 코드 블록',
    type: 'snippet',
    apply: '```bash\nnpm run dev\n```\n',
  },
  {
    label: 'Task list',
    detail: '체크박스 목록',
    type: 'snippet',
    apply: '- [ ] 할 일\n- [x] 완료한 일\n',
  },
  {
    label: 'Link',
    detail: '마크다운 링크',
    type: 'snippet',
    apply: '[링크 텍스트](https://example.com)',
  },
  {
    label: 'Image',
    detail: '마크다운 이미지',
    type: 'snippet',
    apply: '![이미지 설명](./path/to/image.png)',
  },
]

// 생성된 README markdown을 전문 에디터에서 직접 수정하는 컴포넌트
function MarkdownEditor({ markdown, lineCount, onChange, onScrollElementReady }) {
  // toolbar 버튼에서 현재 커서/선택 영역을 조작하기 위해 CodeMirror view를 보관
  const editorViewRef = useRef(null)
  // 열린 툴바 팝업의 바깥 클릭 여부를 판단하기 위한 toolbar 루트 참조
  const toolbarRef = useRef(null)
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false)
  const [formatMenuOpen, setFormatMenuOpen] = useState(false)
  const [snippetMenuOpen, setSnippetMenuOpen] = useState(false)
  // CodeMirror 확장은 렌더마다 새로 만들지 않도록 memoized 상태로 유지
  const editorExtensions = useMemo(
    () => [
      markdownLanguage(),
      autocompletion({
        activateOnTyping: true,
        override: [completeFromList(MARKDOWN_COMPLETIONS)],
      }),
    ],
    []
  )
  const closeToolbarMenus = () => {
    setHeadingMenuOpen(false)
    setFormatMenuOpen(false)
    setSnippetMenuOpen(false)
  }

  // 제목/서식/구조 추가 팝업을 바깥 클릭과 Escape 입력으로 닫기 위한 이벤트 연결
  useEffect(() => {
    if (!headingMenuOpen && !formatMenuOpen && !snippetMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!toolbarRef.current?.contains(event.target)) {
        closeToolbarMenus()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeToolbarMenus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [formatMenuOpen, headingMenuOpen, snippetMenuOpen])

  // 선택 영역을 새 문자열로 바꾸고, 삽입 후 다시 선택될 범위를 지정
  const replaceSelection = (replacement, selectStartOffset = 0, selectEndOffset = replacement.length) => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from, to } = editorView.state.selection.main

    editorView.dispatch({
      changes: { from, to, insert: replacement },
      selection: {
        anchor: from + selectStartOffset,
        head: from + selectEndOffset,
      },
      scrollIntoView: true,
    })
    editorView.focus()
  }

  // 굵게/링크처럼 선택 텍스트 양쪽에 markdown 문법을 감싸는 공통 처리
  const wrapSelection = (prefix, suffix, fallback) => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from, to } = editorView.state.selection.main
    const selectedText = editorView.state.doc.sliceString(from, to) || fallback
    const replacement = `${prefix}${selectedText}${suffix}`

    replaceSelection(replacement, prefix.length, prefix.length + selectedText.length)
  }

  // 목록/인용문처럼 선택된 여러 줄 앞에 같은 prefix를 붙이는 공통 처리
  const prefixSelectedLines = (prefix, fallback, normalizeLine = (line) => line) => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from, to } = editorView.state.selection.main
    const selectedText = editorView.state.doc.sliceString(from, to)
    const sourceText = selectedText || fallback
    const replacement = sourceText
      .split('\n')
      .map((line) => (line.trim() ? `${prefix}${normalizeLine(line)}` : line))
      .join('\n')

    replaceSelection(replacement, replacement.length, replacement.length)
  }

  // 섹션 snippet은 현재 커서 앞뒤 줄바꿈을 보정해서 기존 문서와 자연스럽게 이어 붙임
  const insertBlock = (block) => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from } = editorView.state.selection.main
    const currentMarkdown = editorView.state.doc.toString()
    const previousCharacter = from > 0 ? editorView.state.doc.sliceString(from - 1, from) : ''
    const nextCharacter =
      from < editorView.state.doc.length ? editorView.state.doc.sliceString(from, from + 1) : ''
    const prefix = !currentMarkdown || previousCharacter === '\n' ? '' : '\n\n'
    const suffix = !nextCharacter || nextCharacter === '\n' ? '' : '\n\n'
    const replacement = `${prefix}${block.trim()}\n${suffix}`

    replaceSelection(replacement, replacement.length, replacement.length)
  }

  // 선택된 텍스트가 이미 heading이면 기존 # prefix를 제거하고 새 level로 다시 적용
  const insertHeading = (level) => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from, to } = editorView.state.selection.main
    const selectedText = editorView.state.doc
      .sliceString(from, to)
      .replace(/^#{1,6}\s+/, '')
      .trim()
    const headingText = selectedText || `제목 ${level}`
    const prefix = `${'#'.repeat(level)} `
    const replacement = `${prefix}${headingText}`

    replaceSelection(replacement, prefix.length, prefix.length + headingText.length)
    setHeadingMenuOpen(false)
  }

  // 코드 블록은 선택 영역을 fenced block으로 감싸고 내용 부분을 다시 선택
  const handleCodeBlock = () => {
    const editorView = editorViewRef.current

    if (!editorView) {
      return
    }

    const { from, to } = editorView.state.selection.main
    const selectedText = editorView.state.doc.sliceString(from, to) || '코드를 입력하세요'
    const replacement = `\`\`\`bash\n${selectedText}\n\`\`\``

    replaceSelection(replacement, 8, 8 + selectedText.length)
  }

  const applyFormatAction = (action) => {
    action()
    setFormatMenuOpen(false)
  }

  // 구조 snippet 삽입 후 메뉴를 닫아 다음 편집 흐름으로 바로 복귀
  const handleSnippetSelect = (snippet) => {
    insertBlock(snippet.markdown)
    setSnippetMenuOpen(false)
  }

  return (
    <section className="markdown-editor">
      <header className="panel-titlebar">
        <div>
          <p>Markdown</p>
          <h2>편집</h2>
        </div>
        <span>{lineCount} lines</span>
      </header>
      <div ref={toolbarRef} className="editor-toolbar" aria-label="Markdown formatting toolbar">
        <div className="editor-heading-menu">
          <button
            type="button"
            className="editor-heading-button"
            onClick={() => {
              setHeadingMenuOpen((isOpen) => !isOpen)
              setFormatMenuOpen(false)
              setSnippetMenuOpen(false)
            }}
            aria-label="제목 메뉴"
            aria-expanded={headingMenuOpen}
            title="제목"
          >
            H
          </button>
          {headingMenuOpen && (
            <div className="editor-heading-options" role="menu" aria-label="제목 레벨 선택">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => insertHeading(level)}
                  role="menuitem"
                  aria-label={`제목 ${level} 추가`}
                >
                  H{level}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="editor-format-menu">
          <button
            type="button"
            className="editor-format-button"
            onClick={() => {
              setFormatMenuOpen((isOpen) => !isOpen)
              setHeadingMenuOpen(false)
              setSnippetMenuOpen(false)
            }}
            aria-label="서식 메뉴"
            aria-expanded={formatMenuOpen}
            title="서식"
          >
            <BoldIcon />
            <span>서식</span>
          </button>
          {formatMenuOpen && (
            <div className="editor-format-options" role="menu" aria-label="서식 선택">
              <button
                type="button"
                onClick={() => applyFormatAction(() => wrapSelection('**', '**', '굵은 텍스트'))}
                role="menuitem"
              >
                <BoldIcon />
                <span>굵게</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatAction(() => wrapSelection('*', '*', '기울임 텍스트'))}
                role="menuitem"
              >
                <span className="format-glyph format-glyph-italic">I</span>
                <span>기울임꼴</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatAction(() => wrapSelection('<u>', '</u>', '밑줄 텍스트'))}
                role="menuitem"
              >
                <span className="format-glyph format-glyph-underline">U</span>
                <span>밑줄</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatAction(() => wrapSelection('~~', '~~', '취소선 텍스트'))}
                role="menuitem"
              >
                <span className="format-glyph format-glyph-strike">S</span>
                <span>취소선</span>
              </button>
              <button type="button" onClick={() => applyFormatAction(handleCodeBlock)} role="menuitem">
                <CodeIcon />
                <span>코드</span>
              </button>
              <button
                type="button"
                onClick={() => applyFormatAction(() => prefixSelectedLines('> ', '인용문'))}
                role="menuitem"
              >
                <QuoteIcon />
                <span>인용문</span>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => prefixSelectedLines('- ', '항목')}
          aria-label="목록 추가"
          title="목록 추가"
        >
          <ListIcon />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('[', '](https://example.com)', '링크 텍스트')}
          aria-label="링크 추가"
          title="링크 추가"
        >
          <LinkIcon />
        </button>
        <button
          type="button"
          onClick={() => replaceSelection('![이미지 설명](./path/to/image.png)', 2, 8)}
          aria-label="이미지 추가"
          title="이미지 추가"
        >
          <ImageIcon />
        </button>
        <div className="editor-snippet-menu">
          <button
            type="button"
            className="editor-snippet-button"
            onClick={() => {
              setSnippetMenuOpen((isOpen) => !isOpen)
              setHeadingMenuOpen(false)
              setFormatMenuOpen(false)
            }}
            aria-label="README 구조 추가"
            aria-expanded={snippetMenuOpen}
            title="구조 추가"
          >
            구조 추가
          </button>
          {snippetMenuOpen && (
            <div className="editor-snippet-options" role="menu" aria-label="README 구조 선택">
              {README_SNIPPET_GROUPS.map((group) => (
                <div key={group.label} className="editor-snippet-group">
                  <p>{group.label}</p>
                  {group.snippets.map((snippet) => (
                    <button
                      key={snippet.value}
                      type="button"
                      onClick={() => handleSnippetSelect(snippet)}
                      role="menuitem"
                    >
                      <span>{snippet.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <CodeMirror
        className="markdown-code-editor"
        value={markdown}
        basicSetup={{
          autocompletion: false,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          lineNumbers: true,
        }}
        extensions={editorExtensions}
        height="100%"
        minHeight="0"
        onChange={(value) => onChange(value)}
        onCreateEditor={(editorView) => {
          editorViewRef.current = editorView
          onScrollElementReady?.(editorView.scrollDOM)
        }}
        placeholder="생성된 README가 여기에 표시됩니다."
        aria-label="Markdown editor"
      />
    </section>
  )
}

export default MarkdownEditor
