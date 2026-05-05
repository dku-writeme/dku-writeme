function ActionButtons({ markdown }) {
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

    URL.revokeObjectURL(url)
  }

  return (
    <div className="action-buttons">
      <button type="button" onClick={handleCopy}>
        복사
      </button>
      <button type="button" onClick={handleDownload}>
        다운로드
      </button>
    </div>
  )
}

export default ActionButtons
