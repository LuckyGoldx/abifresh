import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Compress product image to WebP format with optimized quality
 * Keeps GIFs uncompressed (animated). Returns compressed buffer and new filename with extension.
 */
async function compressProductImage(file: File): Promise<{ buffer: Buffer; fileName: string; type: string }> {
  const isGIF = file.type === 'image/gif';
  
  // Keep GIFs as-is (preserve animation)
  if (isGIF) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return { buffer, fileName: file.name, type: file.type };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Compress to WebP with 85 quality (higher quality for product images)
    // Product images need better quality than receipts since customers see them
    const compressed = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer();

    // Use compressed only if it's smaller (usually by 50-75%)
    const finalBuffer = compressed.length < buffer.length ? compressed : buffer;
    
    // Generate filename with .webp extension
    const newFileName = file.name.replace(/\.[^.]+$/, '.webp');
    
    return { buffer: finalBuffer, fileName: newFileName, type: 'image/webp' };
  } catch (error) {
    // Fallback: return original if compression fails
    const buffer = Buffer.from(await file.arrayBuffer());
    return { buffer, fileName: file.name, type: file.type };
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }

    if (imageFile.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    try {
      // Compress product image before uploading
      const { buffer: fileData, fileName: compressedName, type: compressedType } = await compressProductImage(imageFile);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${compressedName}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(filePath, fileData, { contentType: compressedType, upsert: true });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const { data: urlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return NextResponse.json({
        url: urlData.publicUrl,
        path: filePath,
        supabaseUrl: urlData.publicUrl,
      });
    } catch (uploadErr) {
      console.error('Product image upload failed:', uploadErr);
      throw uploadErr;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Image upload failed' }, { status: 400 });
  }
}
