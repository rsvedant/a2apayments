import { useState, useCallback } from 'react'
import { Upload, X, FileText, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFilesChange: (files: File[]) => void
  acceptedFileTypes?: string[]
  maxFiles?: number
  maxSizeMB?: number
  multiple?: boolean
  className?: string
}

export function FileUpload({
  onFilesChange,
  acceptedFileTypes = ['.pdf', '.docx', '.txt', '.doc'],
  maxFiles = 5,
  maxSizeMB = 10,
  multiple = true,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>('')

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return `File ${file.name} exceeds ${maxSizeMB}MB limit`
    }

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(fileExt)) {
      return `File type ${fileExt} is not supported`
    }

    return null
  }

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return

      setError('')
      const fileArray = Array.from(newFiles)

      // Validate each file
      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          return
        }
      }

      // Check max files limit
      const totalFiles = multiple ? files.length + fileArray.length : fileArray.length
      if (totalFiles > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const updatedFiles = multiple ? [...files, ...fileArray] : fileArray
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)
    },
    [files, maxFiles, multiple, onFilesChange]
  )

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
    setError('')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className='h-5 w-5 text-red-500' />
    if (ext === 'docx' || ext === 'doc') return <FileText className='h-5 w-5 text-blue-500' />
    return <File className='h-5 w-5 text-gray-500' />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input
          type='file'
          id='file-upload'
          className='hidden'
          onChange={handleFileInput}
          accept={acceptedFileTypes.join(',')}
          multiple={multiple}
        />
        <label htmlFor='file-upload' className='cursor-pointer'>
          <Upload className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
          <p className='text-sm font-medium mb-1'>
            Drop files here or click to browse
          </p>
          <p className='text-xs text-muted-foreground'>
            Supported formats: {acceptedFileTypes.join(', ')} (Max {maxSizeMB}MB each)
          </p>
        </label>
      </div>

      {error && (
        <div className='mt-2 text-sm text-destructive'>
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className='mt-4 space-y-2'>
          {files.map((file, index) => (
            <div
              key={index}
              className='flex items-center justify-between p-3 bg-muted rounded-lg'
            >
              <div className='flex items-center gap-3 flex-1 min-w-0'>
                {getFileIcon(file.name)}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>{file.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => removeFile(index)}
                className='h-8 w-8 flex-shrink-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
