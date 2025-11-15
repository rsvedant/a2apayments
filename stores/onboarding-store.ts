import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  currentStep: number
  salesScriptFiles: File[]
  companyDocFiles: File[]
  hubspotConnected: boolean
  extensionConnected: boolean
  isComplete: boolean
  
  // Actions
  setCurrentStep: (step: number) => void
  setSalesScriptFiles: (files: File[]) => void
  setCompanyDocFiles: (files: File[]) => void
  setHubspotConnected: (connected: boolean) => void
  setExtensionConnected: (connected: boolean) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 1,
      salesScriptFiles: [],
      companyDocFiles: [],
      hubspotConnected: false,
      extensionConnected: false,
      isComplete: false,

      setCurrentStep: (step) => set({ currentStep: step }),
      
      setSalesScriptFiles: (files) => set({ salesScriptFiles: files }),
      
      setCompanyDocFiles: (files) => set({ companyDocFiles: files }),
      
      setHubspotConnected: (connected) => set({ hubspotConnected: connected }),
      
      setExtensionConnected: (connected) => set({ extensionConnected: connected }),
      
      completeOnboarding: () => set({ isComplete: true }),
      
      resetOnboarding: () =>
        set({
          currentStep: 1,
          salesScriptFiles: [],
          companyDocFiles: [],
          hubspotConnected: false,
          extensionConnected: false,
          isComplete: false,
        }),
    }),
    {
      name: 'onboarding-storage',
      // Don't persist File objects - they can't be serialized
      partialize: (state) => ({
        currentStep: state.currentStep,
        hubspotConnected: state.hubspotConnected,
        extensionConnected: state.extensionConnected,
        isComplete: state.isComplete,
        // Exclude salesScriptFiles and companyDocFiles
      }),
    }
  )
)
