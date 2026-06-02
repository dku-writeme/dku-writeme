import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// markdown 문자열을 실제 README 미리보기 형태로 렌더링하는 컴포넌트
function MarkdownPreview({ markdown, lineCount }) {
  return (
    <section className="markdown-preview">
      <header className="panel-titlebar">
        <div>
          <p>README</p>
          <h2>미리보기</h2>
        </div>
        <span>{lineCount} lines</span>
      </header>
      <div className="markdown-preview-content">
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
