import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  currentStep: number
  salesScriptFiles: File[]
  companyDocFiles: File[]
  hubspotConnected: boolean
  extensionConnected: boolean
  locusApiKey: string
  locusWalletAddress: string
  locusEnabled: boolean
  isComplete: boolean

  // Actions
  setCurrentStep: (step: number) => void
  setSalesScriptFiles: (files: File[]) => void
  setCompanyDocFiles: (files: File[]) => void
  setHubspotConnected: (connected: boolean) => void
  setExtensionConnected: (connected: boolean) => void
  setLocusApiKey: (key: string) => void
  setLocusWalletAddress: (address: string) => void
  setLocusEnabled: (enabled: boolean) => void
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
      locusApiKey: '',
      locusWalletAddress: '',
      locusEnabled: false,
      isComplete: false,

      setCurrentStep: (step) => set({ currentStep: step }),

      setSalesScriptFiles: (files) => set({ salesScriptFiles: files }),

      setCompanyDocFiles: (files) => set({ companyDocFiles: files }),

      setHubspotConnected: (connected) => set({ hubspotConnected: connected }),

      setExtensionConnected: (connected) => set({ extensionConnected: connected }),

      setLocusApiKey: (key) => set({ locusApiKey: key }),

      setLocusWalletAddress: (address) => set({ locusWalletAddress: address }),

      setLocusEnabled: (enabled) => set({ locusEnabled: enabled }),

      completeOnboarding: () => set({ isComplete: true }),

      resetOnboarding: () =>
        set({
          currentStep: 1,
          salesScriptFiles: [],
          companyDocFiles: [],
          hubspotConnected: false,
          extensionConnected: false,
          locusApiKey: '',
          locusWalletAddress: '',
          locusEnabled: false,
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
        locusApiKey: state.locusApiKey,
        locusWalletAddress: state.locusWalletAddress,
        locusEnabled: state.locusEnabled,
        isComplete: state.isComplete,
        // Exclude salesScriptFiles and companyDocFiles
      }),
    }
  )
)
