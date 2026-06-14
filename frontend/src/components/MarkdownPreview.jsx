import { useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// markdown 문자열을 실제 README 미리보기 형태로 렌더링하는 컴포넌트
function MarkdownPreview({ markdown, lineCount, onScrollElementReady }) {
  // 미리보기 스크롤 DOM을 App에 전달해 에디터와의 스크롤 동기화에 사용
  const setPreviewContentRef = useCallback(
    (element) => {
      if (element) {
        onScrollElementReady?.(element)
      }
    },
    [onScrollElementReady]
  )

  return (
    <section className="markdown-preview">
      <header className="panel-titlebar">
        <div>
          <p>README</p>
          <h2>미리보기</h2>
        </div>
        <span>{lineCount} lines</span>
      </header>
      <div className="markdown-preview-content" ref={setPreviewContentRef}>
        {markdown ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        ) : (
          <div className="preview-empty">
            <strong>아직 README가 없습니다.</strong>
            <span>Repository 분석이 끝나면 렌더링된 문서가 표시됩니다.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default MarkdownPreview
