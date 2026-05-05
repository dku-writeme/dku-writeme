function UrlInput({ url, onChange, onSubmit, loading }) {
  return (
    <form className="url-form" onSubmit={onSubmit}>
      <input
        type="text"
        value={url}
        onChange={onChange}
        placeholder="https://github.com/dku-writeme/dku-writeme"
        aria-label="GitHub repository URL"
      />
      <button type="submit" disabled={loading}>
        {loading ? '생성 중...' : 'README 생성'}
      </button>
    </form>
  )
}

export default UrlInput
