import ReactMarkdown from 'react-markdown'

// markdown 문자열을 실제 README 미리보기 형태로 렌더링하는 컴포넌트
function MarkdownPreview({ markdown }) {
  return (
    <section className="markdown-preview">
      <h2>Preview</h2>
      <div className="markdown-preview-content">
        {/* markdown이 없을 때는 빈 화면 대신 안내 문구를 표시 */}
        {markdown ? (
          <ReactMarkdown>{markdown}</ReactMarkdown>
        ) : (
          <p className="preview-empty">README 미리보기가 여기에 표시됩니다.</p>
        )}
      </div>
    </section>
  )
}

export default MarkdownPreview
