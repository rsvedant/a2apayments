"use client";

import { useState } from 'react'
import { FileUpload } from '@/components/file-upload'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
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

interface SalesScriptUploadProps {
  onNext: () => void
}

export function SalesScriptUpload({ onNext }: SalesScriptUploadProps) {
  const { salesScriptFiles, setSalesScriptFiles } = useOnboardingStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleFilesChange = (files: File[]) => {
    setSalesScriptFiles(files)
  }

  const handleSkip = () => {
    setSalesScriptFiles([])
    onNext()
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

  const handleContinue = async () => {
    if (salesScriptFiles.length === 0) {
      onNext()
      return
    }

    setIsProcessing(true)

    try {
      // Read text from files (supports .txt, .pdf, .docx)
      const filePromises = salesScriptFiles.map(async (file) => {
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
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })

      const results = await Promise.all(filePromises)

      // Check for failures
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        toast({
          title: 'Some files failed to process',
          description: `Failed to process: ${failures.map(f => f.fileName).join(', ')}`,
          variant: 'destructive',
        })
      }

      // Combine all successful text
      const successfulResults = results.filter(r => r.success && r.text)
      if (successfulResults.length === 0) {
        toast({
          title: 'No files processed',
          description: 'Could not extract text from any of the uploaded files',
          variant: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      const processedText = successfulResults
        .map(r => `--- ${r.fileName} ---\n${r.text}`)
        .join('\n\n')

      // Save to localStorage
      localStorage.setItem('onboarding_salesScript', processedText)

      toast({
        title: 'Sales scripts uploaded',
        description: `Successfully uploaded ${successfulResults.length} file(s)`,
      })

      onNext()
    } catch (error) {
      console.error('Error processing sales scripts:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to read files',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
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
        acceptedFileTypes={['.txt', '.pdf', '.docx']}
        maxFiles={3}
        maxSizeMB={5}
        multiple={true}
      />
      <p className='text-xs text-muted-foreground'>
        Supports .txt, .pdf, and .docx files (max 3 files, 5MB each)
      </p>

      <div className='flex justify-between pt-4'>
        <Button variant='ghost' onClick={handleSkip} disabled={isProcessing}>
          Skip this step
        </Button>
        <Button onClick={handleContinue} disabled={isProcessing}>
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
  )
}
