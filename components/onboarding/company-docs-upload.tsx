"use client";

import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/file-upload'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { Building2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAction, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useToast } from '@/hooks/use-toast'

// Dynamic imports for browser-only libraries
let pdfjsLib: any = null
let PizZip: any = null

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
  })
  import('pizzip').then((pizzip) => {
    PizZip = pizzip.default
  })
}

interface CompanyDocsUploadProps {
  onNext: () => void
  onBack: () => void
}

export function CompanyDocsUpload({ onNext, onBack }: CompanyDocsUploadProps) {
  const { companyDocFiles, setCompanyDocFiles } = useOnboardingStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const initializeMoss = useAction(api.onboarding.initializeMossIndex)
  const user = useQuery(api.auth.getCurrentUser)
  const { toast } = useToast()

  // Clear any potentially corrupted Files from localStorage on mount
  useEffect(() => {
    // Files can't be serialized, so if there were any persisted, clear them
    const stored = localStorage.getItem('onboarding-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.state?.salesScriptFiles || parsed.state?.companyDocFiles) {
          // These shouldn't exist, clear the storage
          console.log('Clearing corrupted onboarding storage')
          localStorage.removeItem('onboarding-storage')
        }
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem('onboarding-storage')
      }
    }
  }, [])

  const handleFilesChange = (files: File[]) => {
    setCompanyDocFiles(files)
  }

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }

    return fullText
  }

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (!PizZip) {
      const pizzipModule = await import('pizzip')
      PizZip = pizzipModule.default
    }

    const zip = new PizZip(arrayBuffer)
    const xml = zip.file('word/document.xml')?.asText()

    if (!xml) {
      throw new Error('Could not find document.xml in DOCX file')
    }

    // Extract text from XML (simple approach - removes all tags)
    const text = xml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text
  }

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.toLowerCase().split('.').pop()

    if (fileExtension === 'txt') {
      return await file.text()
    } else if (fileExtension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer()
      return await extractTextFromPdf(arrayBuffer)
    } else if (fileExtension === 'docx') {
      const arrayBuffer = await file.arrayBuffer()
      return await extractTextFromDocx(arrayBuffer)
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`)
    }
  }

  const handleSkip = () => {
    toast({
      title: 'Skipped',
      description: 'You can add company docs later from settings',
    })
    onNext()
  }

  const handleContinue = async () => {
    // Always allow continuing - processing is optional
    if (companyDocFiles.length === 0) {
      onNext()
      return
    }

    // Check if user is still loading
    if (user === undefined) {
      toast({
        title: 'Loading...',
        description: 'Please wait while we verify your session',
      })
      return
    }

    if (!user?.userId) {
      toast({
        title: 'Not authenticated',
        description: 'Skipping document indexing',
      })
      onNext()
      return
    }

    setIsProcessing(true)
    
    try {
      // Step 1: Read text from files
      toast({
        title: 'Reading files...',
        description: 'Loading your documents',
      })

      const filePromises = companyDocFiles.map(async (file) => {
        try {
          const text = await extractTextFromFile(file)
          return {
            fileName: file.name,
            text: text.trim(),
            success: true,
          }
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
          return {
            fileName: file.name,
            text: '',
            success: false,
          }
        }
      })

      const docs = await Promise.all(filePromises)
      const successfulDocs = docs.filter(doc => doc.success && doc.text.length > 0)

      if (successfulDocs.length === 0) {
        toast({
          title: 'No documents processed',
          description: 'Continuing without document indexing',
        })
        onNext()
        return
      }

      // Step 2: Create Moss vector index
      toast({
        title: 'Creating search index...',
        description: 'Building semantic search for your documents (this may take a moment)',
      })

      // Remove the success field before sending to Convex
      const docsForMoss = successfulDocs.map(doc => ({
        fileName: doc.fileName,
        text: doc.text,
      }))

      console.log(`Initializing Moss index with ${docsForMoss.length} documents...`)
      const mossResult = await initializeMoss({
        companyDocs: docsForMoss,
      })
      console.log('Moss index created:', {
        indexName: mossResult.indexName,
        documentCount: mossResult.documentCount,
        sourceFiles: mossResult.sourceFiles
      })

      // Store results in localStorage for the final step
      const processedText = successfulDocs
        .map(r => `--- ${r.fileName} ---\n${r.text}`)
        .join('\n\n')

      localStorage.setItem('onboarding_companyDocs', processedText)
      localStorage.setItem('onboarding_mossIndexName', mossResult.indexName)

      toast({
        title: 'Success!',
        description: `Indexed ${successfulDocs.length} document(s) with ${mossResult.documentCount} searchable chunks`,
      })

      onNext()
    } catch (error) {
      console.error('Error processing company docs:', error)
      toast({
        title: 'Processing failed',
        description: 'Continuing without document indexing',
      })
      // Continue anyway - don't block the user
      onNext()
    } finally {
      setIsProcessing(false)
    }
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
        acceptedFileTypes={['.txt', '.pdf', '.docx']}
        maxFiles={10}
        maxSizeMB={10}
        multiple={true}
      />
      <p className='text-xs text-muted-foreground'>
        Supports .txt, .pdf, and .docx files (max 10 files, 10MB each)
      </p>

      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={onBack} disabled={isProcessing}>
          Back
        </Button>
        <div className="flex gap-2">
          {companyDocFiles.length > 0 && (
            <Button variant='ghost' onClick={handleSkip} disabled={isProcessing}>
              Skip
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processing...
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
