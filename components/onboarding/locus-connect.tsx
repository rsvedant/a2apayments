"use client";

import { useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface LocusConnectProps {
  onNext: () => void
  onBack: () => void
}

export function LocusConnect({ onNext, onBack }: LocusConnectProps) {
  const { locusApiKey, locusWalletAddress, locusEnabled, setLocusApiKey, setLocusWalletAddress, setLocusEnabled } = useOnboardingStore()
  const [apiKey, setApiKey] = useState(locusApiKey || '')
  const [walletAddress, setWalletAddress] = useState(locusWalletAddress || '')
  const [enabled, setEnabled] = useState(locusEnabled)
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  const handleSkip = () => {
    // Save disabled state
    setLocusEnabled(false)
    localStorage.setItem('onboarding_locusEnabled', 'false')
    onNext()
  }

  const handleContinue = async () => {
    // Validate API key format if provided
    if (apiKey && !apiKey.startsWith('locus_')) {
      toast({
        title: 'Invalid API Key',
        description: 'Locus API keys should start with "locus_"',
        variant: 'destructive',
      })
      return
    }

    setIsValidating(true)

    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Save to store
    setLocusApiKey(apiKey)
    setLocusWalletAddress(walletAddress)
    setLocusEnabled(enabled && apiKey.length > 0)

    // Save to localStorage
    localStorage.setItem('onboarding_locusApiKey', apiKey)
    localStorage.setItem('onboarding_locusWalletAddress', walletAddress)
    localStorage.setItem('onboarding_locusEnabled', String(enabled && apiKey.length > 0))

    setIsValidating(false)

    if (apiKey) {
      toast({
        title: 'Locus Connected',
        description: 'Your payment integration is configured',
      })
    }

    onNext()
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4'>
          <Wallet className='h-10 w-10 text-white' />
        </div>
        <h3 className='text-xl font-semibold mb-2'>Connect Locus Payments</h3>
        <p className='text-muted-foreground mb-2'>
          Enable your AI assistant to send crypto payments (USDC) autonomously
          with policy-based spending controls.
        </p>
        <p className='text-xs text-muted-foreground'>
          Create an account at{' '}
          <a
            href='https://app.paywithlocus.com'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-500 hover:underline'
          >
            app.paywithlocus.com
          </a>
          {' '}to get your API key
        </p>
      </div>

      <Card className='p-6'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='locus-api-key'>Locus API Key</Label>
            <Input
              id='locus-api-key'
              type='password'
              placeholder='locus_...'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isValidating}
            />
            <p className='text-xs text-muted-foreground'>
              Your API key for authenticating with Locus payment infrastructure
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='locus-wallet'>Wallet Address (Optional)</Label>
            <Input
              id='locus-wallet'
              type='text'
              placeholder='0x...'
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              disabled={isValidating}
            />
            <p className='text-xs text-muted-foreground'>
              Your Locus wallet address for tracking payments
            </p>
          </div>

          <div className='flex items-center justify-between py-2'>
            <div className='space-y-0.5'>
              <Label htmlFor='locus-enabled'>Enable Locus Integration</Label>
              <p className='text-xs text-muted-foreground'>
                Allow AI to send payments during calls
              </p>
            </div>
            <Switch
              id='locus-enabled'
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isValidating || !apiKey}
            />
          </div>
        </div>
      </Card>

      <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
        <h4 className='text-sm font-medium mb-1'>What is Locus?</h4>
        <p className='text-xs text-muted-foreground'>
          Locus enables AI agents to send cryptocurrency (USDC on Base blockchain)
          with configurable spending limits, approved contacts, and monthly budgets.
          Perfect for automating sales incentives and payments.
        </p>
      </div>

      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={onBack} disabled={isValidating}>
          Back
        </Button>
        <div className='space-x-2'>
          <Button variant='ghost' onClick={handleSkip} disabled={isValidating}>
            Skip for Now
          </Button>
          <Button onClick={handleContinue} disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
