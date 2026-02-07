import { supabaseAdmin } from '../config/supabase';
import * as fs from 'fs';

export class StorageService {
  /**
   * Ensure payments bucket exists and is properly configured for public access
   */
  static async ensurePaymentsBucketExists(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabaseAdmin
        .storage
        .listBuckets();
      
      const paymentsBucketExists = buckets?.some(b => b.name === 'payments');
      
      if (!paymentsBucketExists) {
        console.log('📁 Creating payments bucket as public...');
        
        // Create bucket as public
        const { data, error } = await supabaseAdmin
          .storage
          .createBucket('payments', {
            public: true,
          });
        
        if (error) {
          console.error('❌ Error creating bucket:', error);
          throw error;
        }
        
        console.log('✅ Payments bucket created successfully');
      } else {
        console.log('✅ Payments bucket already exists');
      }
    } catch (error: any) {
      console.error('❌ Error in ensurePaymentsBucketExists:', error?.message || error);
      // Don't throw - bucket might already exist
    }
  }

  /**
   * Upload a receipt file to storage
   * @param fileDataOrPath - Either a Buffer containing file data, or a path to a temp file
   * @param fileName - The name to save the file as
   */
  static async uploadReceipt(
    fileDataOrPath: Buffer | string,
    fileName: string
  ): Promise<string | null> {
    try {
      // Ensure bucket exists first
      await this.ensurePaymentsBucketExists();

      // Sanitize filename - replace spaces with underscores
      const sanitizedFileName = fileName.replace(/\s+/g, '_');
      console.log(`📤 Uploading receipt: ${sanitizedFileName} (original: ${fileName})`);

      // Get file data - either from Buffer or read from temp file path
      let fileData: Buffer;
      if (typeof fileDataOrPath === 'string') {
        // It's a file path - read the file
        console.log(`📁 Reading from temp file: ${fileDataOrPath}`);
        fileData = fs.readFileSync(fileDataOrPath);
        console.log(`📁 Read ${fileData.length} bytes from temp file`);
      } else {
        // It's already a Buffer
        fileData = fileDataOrPath;
        console.log(`📁 Using buffer data: ${fileData.length} bytes`);
      }

      if (!fileData || fileData.length === 0) {
        console.error('❌ File data is empty!');
        return null;
      }

      // Upload the file
      const { data, error: uploadError } = await supabaseAdmin
        .storage
        .from('payments')
        .upload(sanitizedFileName, fileData, {
          upsert: true,
          contentType: 'auto', // Let Supabase detect content type
        });

      if (uploadError) {
        console.error('❌ File upload error:', uploadError);
        return null;
      }

      if (!data?.path) {
        console.error('❌ Upload succeeded but no path returned');
        return null;
      }

      // Use Supabase's getPublicUrl method for proper URL generation
      const { data: urlData } = supabaseAdmin
        .storage
        .from('payments')
        .getPublicUrl(data.path);
      
      const publicUrl = urlData.publicUrl;
      
      console.log('✅ Receipt uploaded successfully:', publicUrl);
      console.log('📁 File path in storage:', data.path);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Error uploading receipt:', error?.message || error);
      return null;
    }
  }

  /**
   * Get public URL for a receipt file using Supabase's method
   */
  static getPublicUrl(filePath: string): string {
    const { data } = supabaseAdmin
      .storage
      .from('payments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * List all files in payments bucket (for debugging)
   */
  static async listFiles(): Promise<string[]> {
    try {
      const { data, error } = await supabaseAdmin
        .storage
        .from('payments')
        .list('', { limit: 100 });

      if (error) {
        console.error('❌ Error listing files:', error);
        return [];
      }

      const files = (data || []).map(f => f.name);
      console.log('📁 Files in payments bucket:', files);
      return files;
    } catch (error: any) {
      console.error('❌ Error in listFiles:', error?.message || error);
      return [];
    }
  }

  /**
   * Delete a receipt file
   */
  static async deleteReceipt(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .storage
        .from('payments')
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting receipt:', error);
        return false;
      }

      console.log('✅ Receipt deleted:', filePath);
      return true;
    } catch (error: any) {
      console.error('❌ Error in deleteReceipt:', error?.message || error);
      return false;
    }
  }
}

export const storageService = new StorageService();
