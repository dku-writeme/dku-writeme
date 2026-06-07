// 여러 아이콘이 같은 stroke/style 규칙을 공유하도록 공통 SVG 래퍼를 사용
function IconBase({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16z" />
      <path d="M18 2l.7 1.8L21 4.5l-2.3.7L18 7l-.7-1.8L15 4.5l2.3-.7L18 2z" />
    </IconBase>
  )
}

export function CopyIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </IconBase>
  )
}

export function DownloadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </IconBase>
  )
}

export function CheckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 6L9 17l-5-5" />
    </IconBase>
  )
}

export function HeadingIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 5v14" />
      <path d="M19 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  )
}

export function BoldIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 5v14" />
    </IconBase>
  )
}

export function ListIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </IconBase>
  )
}

export function CodeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 18l-6-6 6-6" />
      <path d="M15 6l6 6-6 6" />
    </IconBase>
  )
}

export function QuoteIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 8H5.5A2.5 2.5 0 0 0 3 10.5V17h5V8z" />
      <path d="M21 8h-2.5a2.5 2.5 0 0 0-2.5 2.5V17h5V8z" />
    </IconBase>
  )
}

export function LinkIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </IconBase>
  )
}

export function ImageIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 10h.01" />
      <path d="M21 15l-5-5L5 19" />
    </IconBase>
  )
}
