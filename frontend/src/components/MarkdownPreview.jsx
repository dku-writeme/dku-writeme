import ReactMarkdown from 'react-markdown'

function MarkdownPreview({ markdown }) {
  return (
    <section className="markdown-preview">
      <h2>Preview</h2>
      <div className="markdown-preview-content">
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
