interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  lightText?: boolean
}

export function Logo({ className = '', size = 'md', showText = true, lightText = false }: LogoProps) {
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-sm font-bold', sub: 'text-[11px]' },
    md: { box: 'w-9 h-9', text: 'text-base font-bold', sub: 'text-[12px]' },
    lg: { box: 'w-11 h-11', text: 'text-lg font-bold', sub: 'text-[13px]' },
    xl: { box: 'w-16 h-16', text: 'text-2xl font-bold', sub: 'text-sm' },
  }

  const current = sizeMap[size]

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Expense Tracker Emblem Logo */}
      <div
        className={`${current.box} rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-[#334155] p-0.5 flex items-center justify-center shadow-xs shrink-0 relative overflow-hidden transition-transform hover:scale-105`}
      >
        <img
          src="/expense-tracker-logo.png"
          alt="Expense Tracker Logo"
          className="w-full h-full object-contain rounded-lg"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span
            className={`${current.text} ${
              lightText
                ? 'text-white'
                : 'text-[#1E293B] dark:text-[#F8FAFC]'
            }`}
          >
            Expense Tracker
          </span>
          <span className={`text-[#64748B] dark:text-[#94A3B8] font-normal ${current.sub} mt-0.5 whitespace-nowrap`}>
            Smart Expense Management
          </span>
        </div>
      )}
    </div>
  )
}

