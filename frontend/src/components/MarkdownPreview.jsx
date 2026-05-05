import ReactMarkdown from 'react-markdown'

function MarkdownPreview({ markdown }) {
  return (
    <section className="markdown-preview">
      {markdown ? (
        <ReactMarkdown>{markdown}</ReactMarkdown>
      ) : (
        <p className="preview-empty">README 미리보기가 여기에 표시됩니다.</p>
      )}
    </section>
  )
}

export default MarkdownPreview
