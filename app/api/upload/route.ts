import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomUUID();
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return file info
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      id: `${timestamp}-${randomString}`,
      url: fileUrl,
      name: file.name,
      type,
      size: file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Optional: DELETE endpoint to remove uploaded files
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'No file ID provided' },
        { status: 400 }
      );
    }

    // TODO: Implement file deletion
    // 1. Look up file path from database
    // 2. Delete file from filesystem
    // 3. Remove database entry

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

/*
 * FILE STORAGE OPTIONS:
 *
 * Current implementation uses local filesystem.
 * For production, consider cloud storage:
 *
 * 1. AWS S3 (Recommended)
 *    - Install: npm install @aws-sdk/client-s3
 *    - Highly scalable
 *    - Cost effective
 *    - CDN integration
 *
 *    import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
 *
 *    const s3Client = new S3Client({ region: process.env.AWS_REGION });
 *    await s3Client.send(new PutObjectCommand({
 *      Bucket: process.env.S3_BUCKET,
 *      Key: filename,
 *      Body: buffer,
 *      ContentType: file.type,
 *    }));
 *
 * 2. Cloudinary
 *    - Install: npm install cloudinary
 *    - Built for media
 *    - Automatic transformations
 *    - Audio/video support
 *
 *    import { v2 as cloudinary } from 'cloudinary';
 *
 *    const result = await cloudinary.uploader.upload(filepath, {
 *      resource_type: 'auto',
 *      folder: 'song-generator',
 *    });
 *
 * 3. Vercel Blob
 *    - Install: npm install @vercel/blob
 *    - Integrated with Vercel
 *    - Simple API
 *
 *    import { put } from '@vercel/blob';
 *
 *    const blob = await put(filename, buffer, {
 *      access: 'public',
 *    });
 *
 * 4. Supabase Storage
 *    - Install: npm install @supabase/supabase-js
 *    - Free tier available
 *    - Integrated with Supabase DB
 *
 *    import { createClient } from '@supabase/supabase-js';
 *
 *    const supabase = createClient(url, key);
 *    await supabase.storage
 *      .from('audio-files')
 *      .upload(filename, buffer);
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. File validation
 *    - Check file type (not just extension)
 *    - Scan for malware
 *    - Limit file size
 *
 * 2. Authentication
 *    - Require user authentication for uploads
 *    - Rate limiting
 *    - Quota management
 *
 * 3. Storage optimization
 *    - Compress audio files
 *    - Generate thumbnails
 *    - Automatic cleanup of old files
 */
