interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  lightText?: boolean
}

export function Logo({ className = '', size = 'md', showText = true, lightText = false }: LogoProps) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 16, text: 'text-sm font-black', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', icon: 20, text: 'text-base font-black', sub: 'text-[10px]' },
    lg: { box: 'w-11 h-11', icon: 24, text: 'text-lg font-black', sub: 'text-xs' },
    xl: { box: 'w-14 h-14', icon: 30, text: 'text-2xl font-black', sub: 'text-xs' },
  }

  const current = sizeMap[size]

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Wallet + Graph Logo Badge */}
      <div
        className={`${current.box} rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 relative overflow-hidden transition-transform hover:scale-105`}
      >
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Wallet Contour */}
          <path
            d="M3.5 7.5C3.5 5.567 5.067 4 7 4H18C19.3807 4 20.5 5.11929 20.5 6.5V8.5H7C5.61929 8.5 4.5 9.61929 4.5 11V16.5C4.5 17.8807 5.61929 19 7 19H19.5C20.3284 19 21 18.3284 21 17.5V11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Growth Graph Line */}
          <path
            d="M7.5 15L11 11.5L14 14.5L18.5 9"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow Tip */}
          <path
            d="M15.5 9H18.5V12"
            stroke="#93C5FD"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sparkle Node */}
          <circle cx="18" cy="5.5" r="1.2" fill="#FDE047" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span
            className={`tracking-tight ${current.text} ${
              lightText
                ? 'text-white'
                : 'text-[#0F172A] dark:text-white'
            }`}
          >
            Expense Tracker
          </span>
          <span className={`text-[#64748B] dark:text-slate-400 font-medium tracking-normal ${current.sub} mt-0.5 whitespace-nowrap`}>
            Smart Expense Management
          </span>
        </div>
      )}
    </div>
  )
}
