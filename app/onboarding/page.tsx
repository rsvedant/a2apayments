"use client";

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingLayout } from '@/components/onboarding-layout'
import { ProgressStepper } from '@/components/progress-stepper'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { SalesScriptUpload } from '@/components/onboarding/sales-script-upload'
import { CompanyDocsUpload } from '@/components/onboarding/company-docs-upload'
import { HubspotConnect } from '@/components/onboarding/hubspot-connect'
import { ExtensionConnect } from '@/components/onboarding/extension-connect'

const ONBOARDING_STEPS = [
  { title: 'Sales Script' },
  { title: 'Company Docs' },
  { title: 'HubSpot' },
  { title: 'Extension' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { currentStep, setCurrentStep } = useOnboardingStore()
  const [step, setStep] = useState(currentStep)

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

  const handleComplete = () => {
    // Navigate to dashboard after onboarding completion
    router.push('/dashboard')
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SalesScriptUpload onNext={handleNext} />
      case 2:
        return <CompanyDocsUpload onNext={handleNext} onBack={handleBack} />
      case 3:
        return <HubspotConnect onNext={handleNext} onBack={handleBack} autoStartExtension={true} />
      case 4:
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
