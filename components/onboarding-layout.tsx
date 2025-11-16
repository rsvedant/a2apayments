import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface OnboardingLayoutProps {
  children: ReactNode
  title: string
  description?: string
  className?: string
}

export function OnboardingLayout({
  children,
  title,
  description,
  className,
}: OnboardingLayoutProps) {
  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto px-4 py-8'>
        {/* Logo/Brand */}
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-primary'>SalesPay</h1>
          <p className='text-sm text-muted-foreground'>
            AI-powered sales assistance
          </p>
        </div>

        {/* Main Content */}
        <div className={cn('max-w-3xl mx-auto', className)}>
          <div className='mb-8'>
            <h2 className='text-3xl font-bold tracking-tight mb-2'>{title}</h2>
            {description && (
              <p className='text-muted-foreground text-lg'>{description}</p>
            )}
          </div>

          <div className='bg-card border rounded-lg shadow-sm p-8'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
