"use client";

import { FileUpload } from '@/components/file-upload'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CompanyDocsUploadProps {
  onNext: () => void
  onBack: () => void
}

export function CompanyDocsUpload({ onNext, onBack }: CompanyDocsUploadProps) {
  const { companyDocFiles, setCompanyDocFiles } = useOnboardingStore()

  const handleFilesChange = (files: File[]) => {
    setCompanyDocFiles(files)
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start gap-4'>
        <div className='p-3 bg-primary/10 rounded-lg'>
          <Building2 className='h-6 w-6 text-primary' />
        </div>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold mb-2'>
            Upload Company Documentation
          </h3>
          <p className='text-muted-foreground text-sm mb-3'>
            Upload your company's documentation to help our AI understand your products, 
            services, and value propositions. This enables more accurate and relevant 
            suggestions during sales calls.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='secondary'>Product Specs</Badge>
            <Badge variant='secondary'>Sales Materials</Badge>
            <Badge variant='secondary'>Technical Docs</Badge>
            <Badge variant='secondary'>Case Studies</Badge>
            <Badge variant='secondary'>Pricing Sheets</Badge>
          </div>
        </div>
      </div>

      <FileUpload
        onFilesChange={handleFilesChange}
        acceptedFileTypes={['.pdf', '.docx', '.txt', '.doc', '.pptx']}
        maxFiles={10}
        maxSizeMB={25}
        multiple={true}
      />

      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={companyDocFiles.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
