import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import path from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'

export const dynamic = 'force-dynamic'

let isBucketChecked = false

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    // Limit file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 25MB.' }, { status: 400 })
    }

    const originalName = file.name || 'document.pdf'
    const ext = path.extname(originalName).toLowerCase()
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg']

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File type ${ext} is not supported. Allowed formats: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG.` },
        { status: 400 }
      )
    }

    const cleanBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)
    const uniqueFileName = `${cleanBase || 'doc'}_${Date.now()}${ext}`

    // 1. Attempt upload to Supabase Storage bucket
    const supabase = getServiceSupabase()
    const BUCKET_NAME = 'client-documents'

    try {
      // Ensure bucket exists once across uploads
      if (!isBucketChecked) {
        const { data: bucket } = await supabase.storage.getBucket(BUCKET_NAME)
        if (!bucket) {
          await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 26214400, // 25MB
          }).catch(() => {})
        }
        isBucketChecked = true
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueFileName)
        return NextResponse.json({
          success: true,
          fileName: originalName,
          fileUrl: publicUrl,
          size: file.size
        })
      }
    } catch (storageErr) {
      console.warn('[Onboarding Upload] Supabase storage upload warning, falling back to local:', storageErr)
    }

    // 2. Fallback to local public/uploads/onboarding/
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'onboarding')
      await mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, uniqueFileName)
      await writeFile(filePath, buffer)

      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''
      const fileUrl = `${origin}/uploads/onboarding/${uniqueFileName}`

      return NextResponse.json({
        success: true,
        fileName: originalName,
        fileUrl,
        size: file.size
      })
    } catch (fsErr: any) {
      console.error('[Onboarding Upload] Local save error:', fsErr)
      return NextResponse.json({ error: 'Failed to save uploaded file.' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('[Onboarding Upload Exception]', err)
    return NextResponse.json({ error: err?.message || 'Server error during upload' }, { status: 500 })
  }
}
