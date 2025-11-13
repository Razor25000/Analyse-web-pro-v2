# Next.js 15 File Downloads: Best Practices & Implementation Guide

## Overview

This comprehensive guide covers file download implementation patterns in Next.js 15, including server-side file generation, streaming, API route patterns, blob handling, memory management, and TypeScript patterns for robust file operations.

## 1. Server-Side File Generation Patterns

### 1.1 Route Handlers for File Downloads

Next.js 15 App Router provides Route Handlers that leverage native Web Request/Response APIs for file downloads:

```typescript
// app/api/download/file/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Fetch file data
    const fileBuffer = await getFileData(fileId)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="download-${fileId}.bin"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 1.2 Server Actions for File Downloads

Server Actions provide a streamlined approach for file downloads triggered from forms:

```typescript
// app/actions/file-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function downloadFile(formData: FormData) {
  const fileId = formData.get('fileId') as string

  if (!fileId) {
    throw new Error('File ID is required')
  }

  try {
    const fileData = await generateFile(fileId)

    // For large files, consider using streaming
    const headersList = await headers()
    const response = new Response(fileData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="file-${fileId}.zip"`,
        'Content-Length': fileData.length.toString(),
      },
    })

    return response
  } catch (error) {
    console.error('Download failed:', error)
    throw new Error('Failed to generate file')
  }
}
```

## 2. Server-Side ZIP File Generation

### 2.1 Basic ZIP Generation

```typescript
// app/api/download/zip/route.ts
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json()

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      )
    }

    const zip = new JSZip()

    // Add files to ZIP
    for (const file of files) {
      const fileBuffer = await fetchFileContent(file.url)
      zip.file(file.name, fileBuffer)
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    const filename = `archive-${Date.now()}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('ZIP generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate ZIP file' },
      { status: 500 }
    )
  }
}

async function fetchFileContent(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

### 2.2 Streaming ZIP Generation for Large Files

```typescript
// app/api/download/zip-stream/route.ts
import { NextRequest } from 'next/server'
import JSZip from 'jszip'
import { Readable } from 'stream'

export async function POST(request: NextRequest) {
  const { files } = await request.json()
  const zip = new JSZip()

  // Create readable stream
  const stream = new Readable({
    async read() {
      try {
        // Process files in chunks to manage memory
        for (const file of files) {
          const fileBuffer = await fetchFileContent(file.url)
          zip.file(file.name, fileBuffer)
        }

        // Generate ZIP in streaming mode
        const zipStream = zip.generateNodeStream({
          type: 'nodebuffer',
          streamFiles: true,
          compression: 'DEFLATE'
        })

        // Pipe to response
        for await (const chunk of zipStream) {
          this.push(chunk)
        }

        this.push(null)
      } catch (error) {
        this.destroy(error as Error)
      }
    }
  })

  return new Response(stream as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="archive-${Date.now()}.zip"`,
      'Transfer-Encoding': 'chunked',
    },
  })
}
```

## 3. MIME Types and Headers

### 3.1 Common MIME Types for Downloads

```typescript
// lib/mime-types.ts
export const MIME_TYPES = {
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',

  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',

  // Data
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',

  // Default
  binary: 'application/octet-stream',
} as const

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return MIME_TYPES[ext as keyof typeof MIME_TYPES] || MIME_TYPES.binary
}
```

### 3.2 Complete Response Headers Configuration

```typescript
// lib/file-headers.ts
import { getMimeType } from './mime-types'

export interface FileDownloadOptions {
  filename: string
  size?: number
  cacheControl?: string
  contentType?: string
}

export function createDownloadHeaders(
  buffer: Buffer | ArrayBuffer,
  options: FileDownloadOptions
): Headers {
  const headers = new Headers()

  // Content type
  headers.set(
    'Content-Type',
    options.contentType || getMimeType(options.filename)
  )

  // Content disposition for download
  headers.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(options.filename)}"`
  )

  // Content length
  headers.set('Content-Length', buffer.byteLength.toString())

  // Cache control (default to no caching for generated files)
  headers.set(
    'Cache-Control',
    options.cacheControl || 'no-cache, no-store, must-revalidate'
  )

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')

  return headers
}
```

## 4. Client-Side File Download Handling

### 4.1 Download from API Endpoint

```typescript
// hooks/use-file-download.ts
'use client'

import { useState, useCallback } from 'react'
import { upfetch } from '@/lib/up-fetch'

interface DownloadOptions {
  url: string
  filename?: string
  onStart?: () => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export function useFileDownload() {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  const download = useCallback(async (options: DownloadOptions) => {
    const { url, filename, onStart, onComplete, onError } = options

    try {
      setDownloading(true)
      setProgress(0)
      onStart?.()

      // Create download link
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || getFilenameFromResponse(response) || 'download'
      document.body.appendChild(link)
      link.click()

      // Cleanup
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(link)

      setProgress(100)
      onComplete?.()
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setDownloading(false)
    }
  }, [])

  return { download, downloading, progress }
}

function getFilenameFromResponse(response: Response): string | null {
  const disposition = response.headers.get('Content-Disposition')
  if (!disposition) return null

  const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
  return filenameMatch ? filenameMatch[1] : null
}
```

### 4.2 Progress Tracking for Large Downloads

```typescript
// components/download-button.tsx
'use client'

import { useFileDownload } from '@/hooks/use-file-download'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface DownloadButtonProps {
  fileId: string
  filename: string
  label?: string
}

export function DownloadButton({
  fileId,
  filename,
  label = 'Download'
}: DownloadButtonProps) {
  const { download, downloading, progress } = useFileDownload()

  const handleDownload = async () => {
    await download({
      url: `/api/download/file?id=${fileId}`,
      filename,
      onStart: () => console.log('Download started'),
      onComplete: () => console.log('Download completed'),
      onError: (error) => console.error('Download failed:', error),
    })
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full"
      >
        {downloading ? 'Downloading...' : label}
      </Button>

      {downloading && (
        <Progress value={progress} className="w-full" />
      )}
    </div>
  )
}
```

## 5. Memory Management for Large File Operations

### 5.1 Streaming Implementation

```typescript
// lib/streaming-helper.ts
import { Readable } from 'stream'

export class StreamingFileProcessor {
  private chunkSize: number = 64 * 1024 // 64KB chunks

  async processLargeFile(
    fileStream: Readable,
    processor: (chunk: Buffer) => Promise<Buffer>
  ): Promise<Readable> {
    return new Readable({
      async read() {
        try {
          for await (const chunk of fileStream) {
            const processedChunk = await processor(chunk)
            this.push(processedChunk)
          }
          this.push(null)
        } catch (error) {
          this.destroy(error as Error)
        }
      }
    })
  }

  async createMemoryEfficientZip(
    files: Array<{ name: string; stream: Readable }>
  ): Promise<Readable> {
    const JSZip = await import('jszip')
    const zip = new JSZip.default()

    return new Readable({
      async read() {
        try {
          // Add files to ZIP
          for (const file of files) {
            zip.file(file.name, file.stream)
          }

          // Generate streaming ZIP
          const zipStream = zip.generateNodeStream({
            type: 'nodebuffer',
            streamFiles: true,
            compression: 'DEFLATE'
          })

          for await (const chunk of zipStream) {
            this.push(chunk)
          }

          this.push(null)
        } catch (error) {
          this.destroy(error as Error)
        }
      }
    })
  }
}
```

### 5.2 Memory Usage Monitoring

```typescript
// lib/memory-monitor.ts
interface MemoryStats {
  used: number
  total: number
  percentage: number
}

export class MemoryMonitor {
  private maxMemory: number = 512 * 1024 * 1024 // 512MB limit

  getMemoryUsage(): MemoryStats {
    const usage = process.memoryUsage()
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      percentage: (usage.heapUsed / usage.heapTotal) * 100
    }
  }

  isMemorySafe(): boolean {
    const usage = this.getMemoryUsage()
    return usage.used < this.maxMemory
  }

  async withMemoryCheck<T>(
    operation: () => Promise<T>,
    onMemoryPressure?: () => void
  ): Promise<T> {
    if (!this.isMemorySafe()) {
      onMemoryPressure?.()
      throw new Error('Insufficient memory for operation')
    }

    const result = await operation()

    // Force garbage collection if memory is high
    if (global.gc && this.getMemoryUsage().percentage > 80) {
      global.gc()
    }

    return result
  }
}
```

## 6. TypeScript Patterns for File Handling

### 6.1 Type Definitions

```typescript
// types/file.ts
export interface FileDownloadRequest {
  fileId: string
  format?: 'original' | 'zip' | 'pdf'
  quality?: 'low' | 'medium' | 'high'
}

export interface FileMetadata {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: Date
  updatedAt: Date
}

export interface ZipContents {
  files: Array<{
    name: string
    path: string
    size: number
    type: string
  }>
}

export interface DownloadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
}

export type FileProcessor<T> = (file: Buffer) => Promise<T>
```

### 6.2 Generic File Handler

```typescript
// lib/file-handler.ts
import { FileMetadata, FileProcessor } from '@/types/file'

export class FileHandler<T = Buffer> {
  constructor(
    private processor?: FileProcessor<T>
  ) {}

  async processFile(
    fileBuffer: Buffer,
    metadata: FileMetadata
  ): Promise<{
    data: T
    metadata: FileMetadata
    processedAt: Date
  }> {
    const processedData = this.processor
      ? await this.processor(fileBuffer)
      : fileBuffer as unknown as T

    return {
      data: processedData,
      metadata: {
        ...metadata,
        updatedAt: new Date()
      },
      processedAt: new Date()
    }
  }

  async processBatch(
    files: Array<{ buffer: Buffer; metadata: FileMetadata }>
  ): Promise<Array<{ data: T; metadata: FileMetadata; processedAt: Date }>> {
    return Promise.all(
      files.map(file => this.processFile(file.buffer, file.metadata))
    )
  }
}
```

## 7. Error Handling Patterns

### 7.1 Comprehensive Error Handling

```typescript
// lib/file-error-handler.ts
export class FileDownloadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'FileDownloadError'
  }
}

export const FileErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  GENERATION_FAILED: 'GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_FORMAT: 'INVALID_FORMAT'
} as const

export function handleFileError(error: unknown): FileDownloadError {
  if (error instanceof FileDownloadError) {
    return error
  }

  if (error instanceof Error) {
    // Map common errors to file-specific errors
    if (error.message.includes('ENOENT')) {
      return new FileDownloadError(
        'File not found',
        FileErrorCodes.FILE_NOT_FOUND,
        404
      )
    }

    if (error.message.includes('EACCES')) {
      return new FileDownloadError(
        'Access denied',
        FileErrorCodes.ACCESS_DENIED,
        403
      )
    }

    if (error.message.includes('EMFILE')) {
      return new FileDownloadError(
        'System file limit exceeded',
        FileErrorCodes.FILE_TOO_LARGE,
        507
      )
    }
  }

  return new FileDownloadError(
    'Unknown file error',
    FileErrorCodes.GENERATION_FAILED,
    500
  )
}
```

### 7.2 API Route with Error Handling

```typescript
// app/api/download/robust/route.ts
import { NextRequest } from 'next/server'
import { handleFileError, FileErrorCodes } from '@/lib/file-error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'File ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate file exists and user has access
    const fileData = await validateAndFetchFile(fileId)

    return new Response(fileData.buffer, {
      headers: {
        'Content-Type': fileData.mimeType,
        'Content-Disposition': `attachment; filename="${fileData.name}"`,
        'Content-Length': fileData.size.toString(),
      },
    })
  } catch (error) {
    const fileError = handleFileError(error)

    return new Response(
      JSON.stringify({
        error: fileError.message,
        code: fileError.code
      }),
      {
        status: fileError.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function validateAndFetchFile(fileId: string) {
  // Implementation would validate permissions and fetch file
  throw new Error('Not implemented')
}
```

## 8. Testing Strategies

### 8.1 Unit Tests for File Operations

```typescript
// __tests__/lib/file-handler.test.ts
import { FileHandler } from '@/lib/file-handler'
import { FileMetadata } from '@/types/file'

describe('FileHandler', () => {
  let fileHandler: FileHandler<string>

  beforeEach(() => {
    fileHandler = new FileHandler(async (buffer: Buffer) => {
      return buffer.toString('base64')
    })
  })

  it('should process file correctly', async () => {
    const buffer = Buffer.from('test content')
    const metadata: FileMetadata = {
      id: 'test-1',
      name: 'test.txt',
      size: buffer.length,
      mimeType: 'text/plain',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await fileHandler.processFile(buffer, metadata)

    expect(result.data).toBe(buffer.toString('base64'))
    expect(result.metadata.name).toBe('test.txt')
    expect(result.processedAt).toBeInstanceOf(Date)
  })

  it('should handle batch processing', async () => {
    const files = [
      { buffer: Buffer.from('content1'), metadata: mockFileMetadata('file1') },
      { buffer: Buffer.from('content2'), metadata: mockFileMetadata('file2') }
    ]

    const results = await fileHandler.processBatch(files)

    expect(results).toHaveLength(2)
    expect(results[0].metadata.name).toBe('file1')
    expect(results[1].metadata.name).toBe('file2')
  })
})

function mockFileMetadata(name: string): FileMetadata {
  return {
    id: `test-${name}`,
    name,
    size: 100,
    mimeType: 'text/plain',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
```

### 8.2 E2E Tests for Download Flow

```typescript
// e2e/file-downloads.spec.ts
import { test, expect } from '@playwright/test'

test.describe('File Downloads', () => {
  test('should download single file', async ({ page }) => {
    await page.goto('/dashboard')

    // Click download button
    await page.click('[data-testid="download-file-1"]')

    // Wait for download to start
    const download = await page.waitForEvent('download')

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.(pdf|zip|txt)$/)

    // Get download path and verify content
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('should handle download errors gracefully', async ({ page }) => {
    await page.goto('/dashboard')

    // Try to download non-existent file
    await page.click('[data-testid="download-invalid-file"]')

    // Check for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'File not found'
    )
  })

  test('should support bulk download with ZIP', async ({ page }) => {
    await page.goto('/dashboard')

    // Select multiple files
    await page.check('[data-testid="select-file-1"]')
    await page.check('[data-testid="select-file-2"]')

    // Click bulk download
    await page.click('[data-testid="bulk-download"]')

    // Wait for ZIP download
    const download = await page.waitForEvent('download')
    expect(download.suggestedFilename()).toMatch(/\.zip$/)
  })
})
```

## 9. Security Considerations

### 9.1 File Access Control

```typescript
// lib/file-access.ts
import { getUser, getRequiredUser } from '@/lib/auth'
import { FileDownloadError, FileErrorCodes } from './file-error-handler'

export async function validateFileAccess(
  fileId: string,
  userId?: string
): Promise<boolean> {
  const user = userId ? await getUser() : await getRequiredUser()

  if (!user) {
    throw new FileDownloadError(
      'Authentication required',
      FileErrorCodes.ACCESS_DENIED,
      401
    )
  }

  // Check file permissions
  const filePermissions = await getFilePermissions(fileId, user.id)

  if (!filePermissions.canRead) {
    throw new FileDownloadError(
      'Access denied',
      FileErrorCodes.ACCESS_DENIED,
      403
    )
  }

  return true
}

async function getFilePermissions(fileId: string, userId: string) {
  // Implementation would check database permissions
  return { canRead: true, canWrite: false }
}
```

### 9.2 File Size and Rate Limiting

```typescript
// lib/file-limits.ts
export const FILE_LIMITS = {
  MAX_SINGLE_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_ZIP_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_FILES_PER_ZIP: 1000,
  DOWNLOAD_RATE_LIMIT: 10, // requests per minute
} as const

export function validateFileSize(size: number): void {
  if (size > FILE_LIMITS.MAX_SINGLE_FILE_SIZE) {
    throw new FileDownloadError(
      'File too large',
      FileErrorCodes.FILE_TOO_LARGE,
      413
    )
  }
}

export function validateZipSize(size: number): void {
  if (size > FILE_LIMITS.MAX_ZIP_SIZE) {
    throw new FileDownloadError(
      'ZIP file too large',
      FileErrorCodes.FILE_TOO_LARGE,
      413
    )
  }
}
```

## 10. Performance Optimization

### 10.1 Caching Strategy

```typescript
// lib/file-cache.ts
import { unstable_cache } from 'next/cache'

export const cacheFileMetadata = unstable_cache(
  async (fileId: string) => {
    return fetchFileMetadata(fileId)
  },
  ['file-metadata'],
  {
    revalidate: 3600, // 1 hour
    tags: ['file-metadata']
  }
)

export const cacheFileContent = unstable_cache(
  async (fileId: string) => {
    return fetchFileContent(fileId)
  },
  ['file-content'],
  {
    revalidate: 1800, // 30 minutes
    tags: ['file-content']
  }
)
```

### 10.2 Compression and Optimization

```typescript
// lib/file-optimizer.ts
import sharp from 'sharp'
import { FileMetadata } from '@/types/file'

export class FileOptimizer {
  async optimizeImage(
    buffer: Buffer,
    options: {
      quality?: number
      format?: 'jpeg' | 'png' | 'webp'
      width?: number
      height?: number
    } = {}
  ): Promise<Buffer> {
    const {
      quality = 80,
      format = 'jpeg',
      width,
      height
    } = options

    let transformer = sharp(buffer)

    if (width || height) {
      transformer = transformer.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    switch (format) {
      case 'jpeg':
        return transformer.jpeg({ quality }).toBuffer()
      case 'png':
        return transformer.png({ quality }).toBuffer()
      case 'webp':
        return transformer.webp({ quality }).toBuffer()
      default:
        return transformer.toBuffer()
    }
  }

  async shouldOptimize(metadata: FileMetadata): Promise<boolean> {
    const imageFormats = ['image/jpeg', 'image/png', 'image/webp']
    return (
      imageFormats.includes(metadata.mimeType) &&
      metadata.size > 1024 * 1024 // Only optimize files > 1MB
    )
  }
}
```

## References and Documentation

- [Next.js 15 Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js 15 Server Actions](https://nextjs.org/docs/app/api-reference/functions/server-actions)
- [Web Response API](https://developer.mozilla.org/en-US/docs/Web/API/Response)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Node.js Stream API](https://nodejs.org/api/stream.html)

## Version Compatibility

This guide is specifically written for:
- **Next.js**: v15.1.8+
- **React**: v18.x / v19.x
- **Node.js**: v18.x+ (for streaming APIs)
- **TypeScript**: v5.x+

---

**Note**: Always test file operations thoroughly in your specific environment, as memory usage, performance, and error handling can vary based on file sizes, server resources, and network conditions.