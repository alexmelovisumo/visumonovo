import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const icons = {
  info:    <Info size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertCircle size={16} />,
  error:   <XCircle size={16} />,
}

const styles = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error:   'bg-red-50 border-red-200 text-red-800',
}

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: keyof typeof icons
  title?: string
}

export function Alert({ type = 'info', title, children, className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-sm',
        styles[type],
        className
      )}
      {...props}
    >
      <span className="mt-0.5 shrink-0">{icons[type]}</span>
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
