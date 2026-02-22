import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { inventoryService } from '../services/inventory.service';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * Get all items (accessible by all authenticated users)
 */
router.get('/items', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('📥 GET /items - Fetching all items');
    const items = await inventoryService.getAllItems();
    console.log('📦 Found', items.length, 'items');
    
    if (items.length > 0) {
      console.log('🔍 First item being sent to frontend:', {
        name: items[0].name,
        main_store_quantity: items[0].main_store_quantity,
        active_store_quantity: items[0].active_store_quantity,
        keys: Object.keys(items[0])
      });
    }
    
    res.json(items);
  } catch (error: any) {
    console.error('❌ Error fetching items:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get single item by ID
 */
router.get('/items/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await inventoryService.getItemById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add new item (admin only)
 */
router.post('/items', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, unit_price, sku, quantity, commission, brand, package_type, price_jalingo, price_outside, image_url } = req.body;
    
    console.log('📝 POST /items - Adding new item:', { name, sku, quantity, commission, brand, package_type });

    if (!name || !category || unit_price === undefined || !sku) {
      return res.status(400).json({ error: 'Missing required fields: name, category, unit_price, sku' });
    }

    const item = await inventoryService.addItem(
      name,
      category,
      unit_price,
      sku,
      quantity || 0,
      commission || 0,
      { brand, package_type, price_jalingo, price_outside, image_url }
    );

    console.log('✅ Item added successfully:', item.id);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('❌ Error adding item:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Edit item (admin only)
 */
router.put('/items/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, unit_price, sku, main_store_quantity, commission } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (unit_price !== undefined) updates.unit_price = unit_price;
    if (sku !== undefined) updates.sku = sku;
    if (commission !== undefined) updates.commission = commission;
    if (main_store_quantity !== undefined) updates.main_store_quantity = main_store_quantity;
    if (req.body.brand !== undefined) updates.brand = req.body.brand;
    if (req.body.package_type !== undefined) updates.package_type = req.body.package_type;
    if (req.body.price_jalingo !== undefined) updates.price_jalingo = req.body.price_jalingo;
    if (req.body.price_outside !== undefined) updates.price_outside = req.body.price_outside;
    if (req.body.image_url !== undefined) updates.image_url = req.body.image_url;

    const item = await inventoryService.editItem(id, updates);
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete item
 */
router.delete('/items/:id', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await inventoryService.deleteItem(id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Transfer from main store to active store (admin only)
 */
router.post('/transfer/main-to-active', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: item_id, quantity' });
    }

    await inventoryService.transferFromMainToActive(item_id, quantity);
    res.json({ message: 'Transfer successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Transfer from active store to main store (admin only)
 */
router.post('/transfer/active-to-main', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: item_id, quantity' });
    }

    await inventoryService.transferFromActiveToMain(item_id, quantity);
    res.json({ message: 'Transfer successful' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get inventory summary (statistics) with optional view filter
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const view = req.query.view as string || 'all';
    let summary;
    
    if (view === 'main') {
      summary = await inventoryService.getMainStoreStats();
    } else if (view === 'active') {
      summary = await inventoryService.getActiveStoreStats();
    } else if (view === 'unavailable') {
      summary = await inventoryService.getUnavailableStats();
    } else {
      summary = await inventoryService.getInventorySummary();
    }
    
    console.log(`📊 Summary for view: ${view}`, summary);
    res.json(summary);
  } catch (error: any) {
    console.error('❌ Error getting summary:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get main store items only
 */
router.get('/main-store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getMainStoreItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get active store items only
 */
router.get('/active-store', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getActiveStoreItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get unavailable items (not in active store)
 */
router.get('/unavailable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const items = await inventoryService.getUnavailableItems();
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Upload product image to Supabase Storage
 */
router.post('/upload-image', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // express-fileupload stores files in req.files
    if (!req.files || !req.files.image) {
      console.warn('⚠️  No image file provided in upload request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const file = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
    
    console.log(`📸 Image upload started: ${file.name} (${file.size} bytes)`);

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
    }

    // Validate file size (5MB = 5242880 bytes)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Upload to Supabase Storage
    console.log(`📤 Uploading to Supabase Storage: ${filePath}`);
    console.log(`  File size: ${file.size} bytes`);
    console.log(`  File type: ${file.mimetype}`);
    console.log(`  File data available: ${!!file.data}`);
    
    // Ensure we're uploading the Buffer correctly
    const uploadData = file.data instanceof Buffer ? file.data : Buffer.from(file.data);
    
    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, uploadData, {
        contentType: file.mimetype,
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      console.error('❌ Storage upload failed:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error,
        filePath: filePath,
      });
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log('✅ Upload result:', {
      success: !!data,
      path: data?.path,
      fullPath: data?.fullPath,
    });

    // Verify file exists
    const { data: listData, error: listError } = await supabaseAdmin.storage
      .from('product-images')
      .list('products');

    if (!listError) {
      const uploadedFile = listData?.find((f) => f.name === fileName);
      console.log(`🔍 File verification:`, {
        exists: !!uploadedFile,
        fileName: fileName,
        filesList: listData?.map((f) => f.name).slice(0, 3),
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    // Return the actual Supabase public URL so it is stored in the database
    // (not a localhost proxy URL, which breaks backups and external access)
    console.log('✅ Image uploaded successfully');
    console.log(`  Supabase URL: ${urlData.publicUrl}`);
    res.json({ url: urlData.publicUrl, path: filePath, supabaseUrl: urlData.publicUrl });
  } catch (error: any) {
    console.error('❌ Image upload error:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    res.status(400).json({ error: error.message || 'Image upload failed' });
  }
});

/**
 * Proxy endpoint to serve product images from Supabase Storage
 * Fetch the public URL and serve it to the client
 */
router.get('/images/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = `products/${filename}`;
    
    console.log(`🖼️ Image proxy request: ${filePath}`);

    // Get the public URL for the file
    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.error('❌ Could not generate public URL for image');
      return res.status(404).json({ error: 'Could not generate image URL' });
    }

    console.log(`ℹ️  Image public URL: ${urlData.publicUrl}`);

    // Fetch the image from the Supabase public URL
    const response = await fetch(urlData.publicUrl);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch image: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const bufferSize = buffer.byteLength;

    console.log(`✅ Image proxy serving: ${filePath}, size: ${bufferSize} bytes, contentType: ${contentType}`);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', bufferSize.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(Buffer.from(buffer));
  } catch (error: any) {
    console.error('❌ Image proxy error:', error.message);
    res.status(500).json({ error: 'Failed to load image: ' + error.message });
  }
});

/**
 * Debug endpoint: List all files in the products folder
 */
router.get('/debug/list-images', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .list('products', { limit: 50 });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const fileList = data?.map((f) => ({
      name: f.name,
      size: f.metadata?.size || 0,
      created: f.created_at,
      updated: f.updated_at,
    })) || [];

    res.json({
      totalFiles: fileList.length,
      files: fileList,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
