"use client";

import { useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { ConnectionLoader } from '@/components/connection-loader'
import { Chrome, CheckCircle2 } from 'lucide-react'

interface ExtensionConnectProps {
  onComplete: () => void
  onBack: () => void
}

export function ExtensionConnect({ onComplete, onBack }: ExtensionConnectProps) {
  const { extensionConnected, setExtensionConnected } = useOnboardingStore()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = () => {
    setIsConnecting(true)
  }

  const handleConnectionComplete = () => {
    setExtensionConnected(true)
    setIsConnecting(false)
  }

  if (isConnecting) {
    return (
      <div className='py-12'>
        <ConnectionLoader
          messages={[
            'Detecting Chrome extension...',
            'Establishing connection...',
            'Syncing settings...',
            'Connection successful!',
          ]}
          duration={3000}
          onComplete={handleConnectionComplete}
        />
      </div>
    )
  }

  if (extensionConnected) {
    return (
      <div className='space-y-6'>
        <div className='text-center py-8'>
          <CheckCircle2 className='h-16 w-16 text-green-500 mx-auto mb-4' />
          <h3 className='text-xl font-semibold mb-2'>
            Extension Connected Successfully!
          </h3>
          <p className='text-muted-foreground'>
            Your Chrome extension is now active and ready to provide real-time 
            AI assistance during your sales calls.
          </p>
        </div>

        <div className='flex justify-between pt-4'>
          <Button variant='outline' onClick={onBack}>
            Back
          </Button>
          <Button onClick={onComplete}>
            Complete Setup
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='mx-auto w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-4'>
          <Chrome className='h-10 w-10 text-white' />
        </div>
        <h3 className='text-xl font-semibold mb-2'>Connect Chrome Extension</h3>
        <p className='text-muted-foreground mb-6'>
          Install and connect our Chrome extension to enable real-time AI suggestions 
          during your sales calls.
        </p>
      </div>

      <div className='bg-muted/50 rounded-lg p-6 space-y-4'>
        <h4 className='font-semibold'>What you'll get:</h4>
        <ul className='space-y-2 text-sm text-muted-foreground'>
          <li className='flex items-start gap-2'>
            <CheckCircle2 className='h-5 w-5 text-primary flex-shrink-0 mt-0.5' />
            <span>Real-time AI suggestions during calls</span>
          </li>
          <li className='flex items-start gap-2'>
            <CheckCircle2 className='h-5 w-5 text-primary flex-shrink-0 mt-0.5' />
            <span>Automatic call transcription and analysis</span>
          </li>
          <li className='flex items-start gap-2'>
            <CheckCircle2 className='h-5 w-5 text-primary flex-shrink-0 mt-0.5' />
            <span>Contextual information from your CRM</span>
          </li>
          <li className='flex items-start gap-2'>
            <CheckCircle2 className='h-5 w-5 text-primary flex-shrink-0 mt-0.5' />
            <span>Post-call summaries and action items</span>
          </li>
        </ul>
      </div>

      <div className='space-y-4'>
        <Button
          onClick={handleConnect}
          className='w-full'
          size='lg'
        >
          Connect Extension
        </Button>
        <p className='text-xs text-center text-muted-foreground'>
          This is a demo. The connection will be simulated.
        </p>
      </div>

      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
