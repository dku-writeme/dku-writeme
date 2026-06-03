import { CopyIcon, DownloadIcon } from './Icons.jsx'

// 완성된 README markdown을 복사하거나 README.md 파일로 다운로드하는 컴포넌트
function ActionButtons({ markdown, disabled = false }) {
  // Clipboard API를 사용해 현재 markdown 내용을 클립보드에 저장
  const handleCopy = async () => {
    if (!markdown) {
      alert('복사할 README 내용이 없습니다.')
      return
    }

    try {
      await navigator.clipboard.writeText(markdown)
      alert('README가 클립보드에 복사되었습니다.')
    } catch {
      alert('README 복사에 실패했습니다.')
    }
  }

  // Blob URL을 임시로 만들어 브라우저 다운로드를 실행
  const handleDownload = () => {
    if (!markdown) {
      alert('다운로드할 README 내용이 없습니다.')
      return
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'README.md'
    link.click()

    // 다운로드 트리거 후에는 임시 URL을 해제
    URL.revokeObjectURL(url)
  }

  return (
    <div className="action-buttons">
      <button type="button" onClick={handleCopy} disabled={disabled}>
        <CopyIcon />
        복사
      </button>
      <button type="button" onClick={handleDownload} disabled={disabled}>
        <DownloadIcon />
        다운로드
      </button>
    </div>
  )
}

export default ActionButtons
