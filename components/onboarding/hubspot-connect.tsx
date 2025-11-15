"use client";

import { useState, useEffect } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface HubspotConnectProps {
  onNext: () => void
  onBack: () => void
  autoStartExtension?: boolean
}

export function HubspotConnect({ onNext, onBack, autoStartExtension = false }: HubspotConnectProps) {
  const { hubspotConnected, setHubspotConnected } = useOnboardingStore()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [credentials, setCredentials] = useState({ email: '', password: '' })

  const handleConnect = () => {
    setShowLoginForm(true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)

    // Simulate HubSpot OAuth/login
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setHubspotConnected(true)
    setIsConnecting(false)
  }

  const handleContinue = () => {
    onNext()
  }

  // Auto-advance to extension step when HubSpot is connected and autoStartExtension is true
  useEffect(() => {
    if (hubspotConnected && autoStartExtension) {
      const timer = setTimeout(() => {
        onNext()
      }, 1500) // Wait 1.5 seconds to show success message
      return () => clearTimeout(timer)
    }
  }, [hubspotConnected, autoStartExtension, onNext])

  if (hubspotConnected) {
    return (
      <div className='space-y-6'>
        <div className='text-center py-8'>
          <CheckCircle2 className='h-16 w-16 text-green-500 mx-auto mb-4' />
          <h3 className='text-xl font-semibold mb-2'>
            Successfully Connected to HubSpot!
          </h3>
          <p className='text-muted-foreground'>
            Your HubSpot account is now linked. We'll sync your contacts and deals 
            to provide contextual insights during calls.
          </p>
        </div>

        <div className='flex justify-between pt-4'>
          <Button variant='outline' onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='mx-auto w-16 h-16 bg-[#ff7a59] rounded-lg flex items-center justify-center mb-4'>
          <svg
            viewBox='0 0 512 512'
            className='h-10 w-10 text-white'
            fill='currentColor'
          >
            <circle cx='96' cy='96' r='48' />
            <circle cx='347' cy='96' r='48' />
            <circle cx='203' cy='443' r='48' />
            <path d='M256,91c-27.4,0-52.9,6.7-75.4,18.6L98.4,27.4C91.1,20.1,80.6,17.8,71.1,21.6c-9.5,3.8-15.8,13-15.8,23.3v102.3 c0,10.3,6.3,19.5,15.8,23.3c3.2,1.3,6.5,1.9,9.7,1.9c6.6,0,13-2.6,17.7-7.4l82.2-82.2C199.4,76.1,227.1,71,256,71 c102.6,0,186,83.4,186,186c0,40.8-13.2,78.5-35.6,109.2l-79.9-79.9c-7.8-7.8-20.5-7.8-28.3,0c-7.8,7.8-7.8,20.5,0,28.3l102.3,102.3 c3.9,3.9,9,5.9,14.1,5.9s10.2-2,14.1-5.9c3.8-3.8,5.9-9,5.9-14.1v-102.3c0-10.3-6.3-19.5-15.8-23.3c-9.5-3.8-20-1.5-27.3,5.8 l-27.4,27.4C389.3,276.9,402,243.8,402,208C402,127.7,337.3,63,257,63c-0.3,0-0.7,0-1,0V91z' />
            <path d='M256,208c-13.3,0-24,10.7-24,24v102.3c0,10.3,6.3,19.5,15.8,23.3c3.2,1.3,6.5,1.9,9.7,1.9c6.6,0,13-2.6,17.7-7.4l82.2-82.2 c7.8-7.8,7.8-20.5,0-28.3c-7.8-7.8-20.5-7.8-28.3,0L280,290.7V232C280,218.7,269.3,208,256,208z' />
          </svg>
        </div>
        <h3 className='text-xl font-semibold mb-2'>Connect to HubSpot</h3>
        <p className='text-muted-foreground mb-6'>
          Link your HubSpot account to sync contacts, deals, and get real-time 
          insights during your sales calls.
        </p>
      </div>

      {!showLoginForm ? (
        <div className='space-y-4'>
          <Button
            onClick={handleConnect}
            className='w-full bg-[#ff7a59] hover:bg-[#ff6a49] text-white'
            size='lg'
          >
            Connect with HubSpot
          </Button>
          <p className='text-xs text-center text-muted-foreground'>
            This is a demo environment. Any credentials will work for testing.
          </p>
        </div>
      ) : (
        <Card className='p-6'>
          <form onSubmit={handleLogin} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='hubspot-email'>HubSpot Email</Label>
              <Input
                id='hubspot-email'
                type='email'
                placeholder='your@email.com'
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                disabled={isConnecting}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='hubspot-password'>Password</Label>
              <Input
                id='hubspot-password'
                type='password'
                placeholder='Enter password'
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                disabled={isConnecting}
                required
              />
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Connecting...
                </>
              ) : (
                'Sign In to HubSpot'
              )}
            </Button>
          </form>
        </Card>
      )}

      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
