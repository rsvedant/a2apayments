"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingLayout } from '@/components/onboarding-layout'
import { ProgressStepper } from '@/components/progress-stepper'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { SalesScriptUpload } from '@/components/onboarding/sales-script-upload'
import { CompanyDocsUpload } from '@/components/onboarding/company-docs-upload'
import { HubspotConnect } from '@/components/onboarding/hubspot-connect'
import { LocusConnect } from '@/components/onboarding/locus-connect'
import { ExtensionConnect } from '@/components/onboarding/extension-connect'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const ONBOARDING_STEPS = [
  { title: 'Sales Script' },
  { title: 'Company Docs' },
  { title: 'HubSpot' },
  { title: 'Locus' },
  { title: 'Extension' },
]

export default function OnboardingPage() {
  return (
    <>
      <AuthLoading>
        <LoadingLayout title="Loading..." description="Checking your account..." />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>
        <OnboardingContent />
      </Authenticated>
    </>
  )
}

function LoadingLayout({ title, description }: { title: string; description: string }) {
  return (
    <OnboardingLayout title={title} description={description}>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </OnboardingLayout>
  )
}

function RedirectToSignIn() {
  const router = useRouter()

  useEffect(() => {
    router.push('/auth/sign-in')
  }, [router])

  return (
    <LoadingLayout title="Redirecting..." description="Taking you to sign in..." />
  )
}

function OnboardingContent() {
  const router = useRouter()
  const { currentStep, setCurrentStep, completeOnboarding: completeOnboardingStore } = useOnboardingStore()
  const [step, setStep] = useState(currentStep)
  const [isSaving, setIsSaving] = useState(false)
  const completeOnboardingMutation = useMutation(api.onboarding.completeOnboarding)
  const { toast } = useToast()
  const userSettings = useQuery(api.userSettings.get)

  useEffect(() => {
    if (userSettings !== undefined && userSettings !== null) {
      console.log('User has existing settings, allowing re-onboarding')
    }
  }, [userSettings])

  const handleNext = () => {
    const nextStep = step + 1
    setStep(nextStep)
    setCurrentStep(nextStep)
  }

  const handleBack = () => {
    const prevStep = step - 1
    setStep(prevStep)
    setCurrentStep(prevStep)
  }

  const handleComplete = async () => {
    setIsSaving(true)

    try {
      const salesScript = localStorage.getItem('onboarding_salesScript') || undefined
      const companyDocs = localStorage.getItem('onboarding_companyDocs') || undefined
      const mossIndexName = localStorage.getItem('onboarding_mossIndexName') || undefined
      const hubspotApiKey = localStorage.getItem('onboarding_hubspotApiKey') || undefined
      const hubspotEnabled = localStorage.getItem('onboarding_hubspotEnabled') === 'true'
      const locusApiKey = localStorage.getItem('onboarding_locusApiKey') || undefined
      const locusWalletAddress = localStorage.getItem('onboarding_locusWalletAddress') || undefined
      const locusEnabled = localStorage.getItem('onboarding_locusEnabled') === 'true'

      await completeOnboardingMutation({
        salesScript,
        companyDocs,
        mossIndexName,
        hubspotApiKey,
        hubspotEnabled,
        locusApiKey,
        locusWalletAddress,
        locusEnabled,
      })

      completeOnboardingStore()

      localStorage.removeItem('onboarding_salesScript')
      localStorage.removeItem('onboarding_companyDocs')
      localStorage.removeItem('onboarding_mossIndexName')
      localStorage.removeItem('onboarding_hubspotApiKey')
      localStorage.removeItem('onboarding_hubspotEnabled')
      localStorage.removeItem('onboarding_locusApiKey')
      localStorage.removeItem('onboarding_locusWalletAddress')
      localStorage.removeItem('onboarding_locusEnabled')

      toast({
        title: 'Onboarding complete!',
        description: 'Your settings have been saved successfully',
      })
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: 'Onboarding complete!',
        description: 'Redirecting to dashboard...',
      })
    } finally {
      setIsSaving(false)
      router.push('/dashboard')
    }
  }

  if (isSaving) {
    return (
      <OnboardingLayout title="Saving..." description="Finalizing your setup...">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Please wait while we save your settings...</p>
        </div>
      </OnboardingLayout>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SalesScriptUpload onNext={handleNext} />
      case 2:
        return <CompanyDocsUpload onNext={handleNext} onBack={handleBack} />
      case 3:
        return <HubspotConnect onNext={handleNext} onBack={handleBack} />
      case 4:
        return <LocusConnect onNext={handleNext} onBack={handleBack} />
      case 5:
        return (
          <ExtensionConnect onComplete={handleComplete} onBack={handleBack} />
        )
      default:
        return <SalesScriptUpload onNext={handleNext} />
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Upload Sales Script'
      case 2:
        return 'Upload Company Documentation'
      case 3:
        return 'Connect to HubSpot'
      case 4:
        return 'Connect Locus Payments'
      case 5:
        return 'Connect Chrome Extension'
      default:
        return 'Getting Started'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Let's start by uploading your existing sales materials"
      case 2:
        return 'Help us understand your products and services'
      case 3:
        return 'Sync your CRM data for better insights'
      case 4:
        return 'Enable AI-powered payment capabilities'
      case 5:
        return 'Final step to enable real-time assistance'
      default:
        return ''
    }
  }

  return (
    <OnboardingLayout title={getStepTitle()} description={getStepDescription()}>
      <div className='space-y-8'>
        <ProgressStepper steps={ONBOARDING_STEPS} currentStep={step} />
        <div className='min-h-[400px]'>{renderStep()}</div>
      </div>
    </OnboardingLayout>
  )
}
