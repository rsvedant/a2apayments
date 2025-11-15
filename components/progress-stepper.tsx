import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  title: string
  description?: string
}

interface ProgressStepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
  className?: string
}

export function ProgressStepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: ProgressStepperProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className='flex items-start justify-between'>
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isClickable = onStepClick && (isCompleted || isCurrent)

          return (
            <div key={index} className='flex items-center flex-1'>
              <div className='flex flex-col items-center w-full'>
                <div className='flex items-center justify-center w-full'>
                  <div className='flex-1 flex items-center justify-end'>
                    {index > 0 && (
                      <div
                        className={cn(
                          'h-0.5 w-full transition-colors',
                          index <= currentStep
                            ? 'bg-primary'
                            : 'bg-muted-foreground/30'
                        )}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => isClickable && onStepClick(stepNumber)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 mx-2',
                      isCompleted &&
                        'bg-primary border-primary text-primary-foreground',
                      isCurrent &&
                        'border-primary text-primary bg-primary/10',
                      !isCompleted &&
                        !isCurrent &&
                        'border-muted-foreground/30 text-muted-foreground',
                      isClickable && 'cursor-pointer hover:scale-105'
                    )}
                  >
                    {isCompleted ? (
                      <Check className='h-4 w-4' />
                    ) : (
                      <span className='text-xs font-semibold'>{stepNumber}</span>
                    )}
                  </button>
                  <div className='flex-1 flex items-center justify-start'>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 w-full transition-colors',
                          stepNumber < currentStep
                            ? 'bg-primary'
                            : 'bg-muted-foreground/30'
                        )}
                      />
                    )}
                  </div>
                </div>
                <div className='mt-2 text-center w-full px-1'>
                  <p
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      isCurrent && 'text-primary',
                      !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
