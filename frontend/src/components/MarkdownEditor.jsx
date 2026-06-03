import CodeMirror from '@uiw/react-codemirror'
import { autocompletion, completeFromList } from '@codemirror/autocomplete'
import { markdown as markdownLanguage } from '@codemirror/lang-markdown'
import { useMemo, useRef, useState } from 'react'
import {
  BoldIcon,
  CodeIcon,
  ImageIcon,
  LinkIcon,
  ListIcon,
  QuoteIcon,
} from './Icons.jsx'

const README_SNIPPETS = [
  {
    value: 'installation',
    label: '설치 방법',
    markdown: `## 설치 방법

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
  {
    value: 'usage',
    label: '사용 예시',
    markdown: `## 사용 방법

1. 저장소를 클론합니다.
2. 의존성을 설치합니다.
3. 개발 서버를 실행합니다.
`,
  },
  {
    value: 'features',
    label: '기능 목록',
    markdown: `## 주요 기능

- 기능 1
- 기능 2
- 기능 3
`,
  },
  {
    value: 'environment',
    label: '환경 변수',
    markdown: `## 환경 변수

| 이름 | 설명 | 필수 |
| --- | --- | --- |
| \`API_KEY\` | API 인증 키 | 예 |
`,
  },
  {
    value: 'troubleshooting',
    label: '문제 해결',
    markdown: `## 문제 해결

### 자주 발생하는 문제

- 증상:
- 원인:
- 해결:
`,
  },
]

const MARKDOWN_COMPLETIONS = [
  {
    label: 'README overview',
    detail: '프로젝트 소개 섹션',
    type: 'section',
    apply: '## 프로젝트 소개\n\n이 프로젝트의 목적과 핵심 가치를 설명합니다.\n',
  },
  {
    label: 'Installation',
    detail: '설치 방법',
    type: 'section',
    apply: '## 설치 방법\n\n```bash\nnpm install\nnpm run dev\n```\n',
  },
  {
    label: 'Usage',
    detail: '사용 방법',
    type: 'section',
    apply: '## 사용 방법\n\n1. 저장소를 클론합니다.\n2. 의존성을 설치합니다.\n3. 개발 서버를 실행합니다.\n',
  },
  {
    label: 'Features',
    detail: '주요 기능',
    type: 'section',
    apply: '## 주요 기능\n\n- 기능 1\n- 기능 2\n- 기능 3\n',
  },
  {
    label: 'Tech stack',
    detail: '기술 스택 표',
    type: 'section',
    apply: '## 기술 스택\n\n| 구분 | 기술 |\n| --- | --- |\n| Frontend | React |\n| Backend | Node.js |\n',
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
function MarkdownEditor({ markdown, lineCount, onChange }) {
  const editorViewRef = useRef(null)
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false)
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

  const handleSnippetChange = (event) => {
    const selectedSnippet = README_SNIPPETS.find((snippet) => snippet.value === event.target.value)

    if (selectedSnippet) {
      insertBlock(selectedSnippet.markdown)
    }

    event.target.value = ''
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
      <div className="editor-toolbar" aria-label="Markdown formatting toolbar">
        <div className="editor-heading-menu">
          <button
            type="button"
            className="editor-heading-button"
            onClick={() => setHeadingMenuOpen((isOpen) => !isOpen)}
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
        <button
          type="button"
          onClick={() => wrapSelection('**', '**', '굵은 텍스트')}
          aria-label="굵게"
          title="굵게"
        >
          <BoldIcon />
        </button>
        <button
          type="button"
          onClick={() => prefixSelectedLines('- ', '항목')}
          aria-label="목록 추가"
          title="목록 추가"
        >
          <ListIcon />
        </button>
        <button type="button" onClick={handleCodeBlock} aria-label="코드 블록" title="코드 블록">
          <CodeIcon />
        </button>
        <button
          type="button"
          onClick={() => prefixSelectedLines('> ', '인용문')}
          aria-label="인용문"
          title="인용문"
        >
          <QuoteIcon />
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
        <label className="editor-snippet-picker">
          <span>구조 추가</span>
          <select defaultValue="" onChange={handleSnippetChange} aria-label="README 구조 추가">
            <option value="" disabled>
              구조 추가
            </option>
            {README_SNIPPETS.map((snippet) => (
              <option key={snippet.value} value={snippet.value}>
                {snippet.label}
              </option>
            ))}
          </select>
        </label>
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
        minHeight="520px"
        onChange={(value) => onChange(value)}
        onCreateEditor={(editorView) => {
          editorViewRef.current = editorView
        }}
        placeholder="생성된 README가 여기에 표시됩니다."
        aria-label="Markdown editor"
      />
    </section>
  )
}

export default MarkdownEditor
