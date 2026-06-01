import { SparkleIcon } from './Icons.jsx'

// GitHub 저장소 URL을 입력받고 README 생성 submit 이벤트를 발생시키는 컴포넌트
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
        {loading ? (
          <span className="button-spinner" aria-hidden="true" />
        ) : (
          <SparkleIcon />
        )}
        {loading ? '생성 중...' : 'README 생성'}
      </button>
    </form>
  )
}

export default UrlInput
