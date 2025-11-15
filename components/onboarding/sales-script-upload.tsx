"use client";

import { FileUpload } from '@/components/file-upload'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface SalesScriptUploadProps {
  onNext: () => void
}

export function SalesScriptUpload({ onNext }: SalesScriptUploadProps) {
  const { salesScriptFiles, setSalesScriptFiles } = useOnboardingStore()

  const handleFilesChange = (files: File[]) => {
    setSalesScriptFiles(files)
  }

  const handleSkip = () => {
    setSalesScriptFiles([])
    onNext()
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start gap-4'>
        <div className='p-3 bg-primary/10 rounded-lg'>
          <FileText className='h-6 w-6 text-primary' />
        </div>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold mb-2'>
            Upload Your Sales Script (Optional)
          </h3>
          <p className='text-muted-foreground text-sm'>
            If you have an existing sales script or call flow document, upload it here. 
            This will help us provide more personalized suggestions during your calls.
          </p>
        </div>
      </div>

      <FileUpload
        onFilesChange={handleFilesChange}
        acceptedFileTypes={['.pdf', '.docx', '.txt', '.doc']}
        maxFiles={3}
        maxSizeMB={10}
        multiple={true}
      />

      <div className='flex justify-between pt-4'>
        <Button variant='ghost' onClick={handleSkip}>
          Skip this step
        </Button>
        <Button onClick={onNext} disabled={salesScriptFiles.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
