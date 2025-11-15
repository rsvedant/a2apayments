import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionLoaderProps {
  messages?: string[]
  duration?: number
  onComplete?: () => void
  className?: string
}

export function ConnectionLoader({
  messages = [
    'Detecting extension...',
    'Establishing connection...',
    'Syncing data...',
    'Connection successful!',
  ],
  duration = 3000,
  onComplete,
  className,
}: ConnectionLoaderProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const messageInterval = duration / messages.length
    const timer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < messages.length - 1) {
          return prev + 1
        } else {
          clearInterval(timer)
          setIsComplete(true)
          setTimeout(() => {
            onComplete?.()
          }, 500)
          return prev
        }
      })
    }, messageInterval)

    return () => clearInterval(timer)
  }, [duration, messages.length, onComplete])

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className='relative mb-6'>
        {isComplete ? (
          <CheckCircle2 className='h-16 w-16 text-green-500 animate-in zoom-in duration-300' />
        ) : (
          <Loader2 className='h-16 w-16 text-primary animate-spin' />
        )}
      </div>

      <div className='text-center space-y-2'>
        <p
          className={cn(
            'text-lg font-medium transition-colors',
            isComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'
          )}
        >
          {messages[currentMessageIndex]}
        </p>

        <div className='flex gap-1.5 justify-center mt-4'>
          {messages.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all duration-300',
                index <= currentMessageIndex
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
