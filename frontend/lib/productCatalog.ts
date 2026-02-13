/**
 * ABIFRESH Product Catalog - Cascading Dropdown Data
 * Brand (Level 1) → Package Type (Level 2) → Specific Product Name (Level 3)
 * 
 * All names are EXACT as they appear in the ABIFRESH PRODUCTS PDF.
 * DO NOT alter, change, or "fix" any name — they must match the PDF exactly.
 */

export interface ProductVariant {
  name: string;
  priceJalingo: number;
  priceOutside: number;
}

export interface PackageType {
  name: string;
  variants: ProductVariant[];
}

export interface Brand {
  name: string;
  category: string;
  packages: PackageType[];
}

export const PRODUCT_CATALOG: Brand[] = [
  {
    name: 'LEBRACE BABY DIAPERS',
    category: 'Baby Diapers',
    packages: [
      {
        name: 'LEBRACE SACHET ROLL',
        variants: [
          { name: 'LEB SACHET S1', priceJalingo: 13680, priceOutside: 0 },
          { name: 'LEB SACHET S2', priceJalingo: 13680, priceOutside: 0 },
          { name: 'LEB SACHET S3', priceJalingo: 13680, priceOutside: 0 },
          { name: 'LEB SACHET S4', priceJalingo: 13680, priceOutside: 0 },
          { name: 'LEB SACHET S5', priceJalingo: 13680, priceOutside: 0 },
        ],
      },
      {
        name: 'LEBRACE CARRY PACK',
        variants: [
          { name: 'LEB CARRY PACK S1', priceJalingo: 8700, priceOutside: 8900 },
          { name: 'LEB CARRY PACK S2', priceJalingo: 8700, priceOutside: 8900 },
          { name: 'LEB CARRY PACK S3', priceJalingo: 8700, priceOutside: 8900 },
          { name: 'LEB CARRY PACK S4', priceJalingo: 8700, priceOutside: 8900 },
          { name: 'LEB CARRY PACK S5', priceJalingo: 8700, priceOutside: 8900 },
        ],
      },
      {
        name: 'LEBRACE ECO PACK',
        variants: [
          { name: 'LEB ECO PACK S1', priceJalingo: 19100, priceOutside: 19400 },
          { name: 'LEB ECO PACK S2', priceJalingo: 19100, priceOutside: 19400 },
          { name: 'LEB ECO PACK S3', priceJalingo: 19100, priceOutside: 19400 },
          { name: 'LEB ECO PACK S4', priceJalingo: 19100, priceOutside: 19400 },
          { name: 'LEB ECO PACK S5', priceJalingo: 19100, priceOutside: 19400 },
        ],
      },
      {
        name: 'LEBRACE JUMBO PACK',
        variants: [
          { name: 'LEB JUMBO PACK SI', priceJalingo: 26700, priceOutside: 27000 },
          { name: 'LEB JUMBO PACK S2', priceJalingo: 26700, priceOutside: 27000 },
          { name: 'LEB JUMBO PACK S3', priceJalingo: 26700, priceOutside: 27000 },
          { name: 'LEB JUMBO PACK S4', priceJalingo: 26700, priceOutside: 27000 },
          { name: 'LEB JUMBO PACK S5', priceJalingo: 26700, priceOutside: 27000 },
        ],
      },
    ],
  },
  {
    name: 'BESENSE PREMIUM BABY DIAPERS',
    category: 'Baby Diapers',
    packages: [
      {
        name: 'BESENSE CARRY PACK',
        variants: [
          { name: 'BESENCE CP S1', priceJalingo: 10300, priceOutside: 10300 },
          { name: 'BESENCE CP S2', priceJalingo: 10300, priceOutside: 10300 },
          { name: 'BESENCE CP S3', priceJalingo: 10300, priceOutside: 10300 },
          { name: 'BESENCE CP S4', priceJalingo: 10300, priceOutside: 10300 },
          { name: 'BESENCE CP S5', priceJalingo: 10300, priceOutside: 10300 },
        ],
      },
      {
        name: 'BESENSE ECO PACK',
        variants: [
          { name: 'BESENCE ECO S1', priceJalingo: 22600, priceOutside: 22600 },
          { name: 'BESENCE ECO S2', priceJalingo: 22600, priceOutside: 22600 },
          { name: 'BESENCE ECO S3', priceJalingo: 22600, priceOutside: 22600 },
          { name: 'BESENCE ECO S4', priceJalingo: 22600, priceOutside: 22600 },
          { name: 'BESENCE ECO S5', priceJalingo: 22600, priceOutside: 22600 },
        ],
      },
      {
        name: 'BESENSE JUMBO PACK',
        variants: [
          { name: 'BESENSE JUMBO S1', priceJalingo: 31700, priceOutside: 31700 },
          { name: 'BESENSE JUMBO S2', priceJalingo: 31700, priceOutside: 31700 },
          { name: 'BESENSE JUMBO S3', priceJalingo: 31700, priceOutside: 31700 },
          { name: 'BESENSE JUMBO S4', priceJalingo: 31700, priceOutside: 31700 },
          { name: 'BESENSE JUMBO S5', priceJalingo: 31700, priceOutside: 31700 },
        ],
      },
    ],
  },
  {
    name: 'JUSTFIT BABY DIAPERS',
    category: 'Baby Diapers',
    packages: [
      {
        name: 'JUSTFIT SACHET ROLL',
        variants: [
          { name: 'JUSTFIT SACHET S1', priceJalingo: 14200, priceOutside: 14400 },
          { name: 'JUSTFIT SACHET S2', priceJalingo: 14200, priceOutside: 14400 },
          { name: 'JUSTFIT SACHET S3', priceJalingo: 14200, priceOutside: 14400 },
          { name: 'JUSTFIT SACHET S4', priceJalingo: 14200, priceOutside: 14400 },
          { name: 'JUSTFIT SACHET S5', priceJalingo: 14200, priceOutside: 14400 },
        ],
      },
      {
        name: 'JUSTFIT CARRY PACK',
        variants: [
          { name: 'JUSTFIT CARRY PACK S1', priceJalingo: 8100, priceOutside: 8300 },
          { name: 'JUSTFIT CARRY PACK S2', priceJalingo: 8100, priceOutside: 8300 },
          { name: 'JUSTFIT CARRY PACK S3', priceJalingo: 8100, priceOutside: 8300 },
          { name: 'JUSTFIT CARRY PACK S4', priceJalingo: 8100, priceOutside: 8300 },
          { name: 'JUSTFIT CARRY PACK S5', priceJalingo: 8100, priceOutside: 8300 },
        ],
      },
      {
        name: 'JUSTFIT ECO PACK',
        variants: [
          { name: 'JUSTFIT ECO PACK S1', priceJalingo: 17300, priceOutside: 17600 },
          { name: 'JUSTFIT ECO PACK S2', priceJalingo: 17300, priceOutside: 17600 },
          { name: 'JUSTFIT ECO PACK S3', priceJalingo: 17300, priceOutside: 17600 },
          { name: 'JUSTFIT ECO PACK S4', priceJalingo: 17300, priceOutside: 17600 },
          { name: 'JUSTFIT ECO PACK S5', priceJalingo: 17300, priceOutside: 17600 },
        ],
      },
      {
        name: 'JUSTFIT JUMBO PACK',
        variants: [
          { name: 'JUSTFIT JUMBO PACK SI', priceJalingo: 24600, priceOutside: 24900 },
          { name: 'JUSTFIT JUMBO PACK S2', priceJalingo: 24600, priceOutside: 24900 },
          { name: 'JUSTFIT JUMBO PACK S3', priceJalingo: 24600, priceOutside: 24900 },
          { name: 'JUSTFIT JUMBO PACK S4', priceJalingo: 24600, priceOutside: 24900 },
          { name: 'JUSTFIT JUMBO PACK S5', priceJalingo: 24600, priceOutside: 24900 },
        ],
      },
    ],
  },
  {
    name: 'BESENSE SANITARY PADS',
    category: 'Sanitary Pads',
    packages: [
      {
        name: 'BLUE MEGA MIX 18+7+5',
        variants: [
          { name: 'BESENSE BLUE MEGA MIX 30 PCS ZIP PAD', priceJalingo: 39900, priceOutside: 41100 },
        ],
      },
      {
        name: 'PINK MEGA MIX 19+7+5',
        variants: [
          { name: 'BESENSE PINK MEGA MIX 30 PC ZIP PAD', priceJalingo: 39900, priceOutside: 41100 },
        ],
      },
      {
        name: 'BLUE MEGA MIX 18+7+5 PLUS HANDLE',
        variants: [
          { name: 'BESENSE MEGA MIX 30 PCS WITH HANDLE', priceJalingo: 39900, priceOutside: 41100 },
        ],
      },
      {
        name: 'PINK MEGA MIX 19+7+5 WITH HANDLE',
        variants: [
          { name: 'BESENSE PINK MEGA MIX 30 PC ZIP PAD-HANDLE', priceJalingo: 39900, priceOutside: 41100 },
        ],
      },
      {
        name: 'ECO MIX 6+^+2',
        variants: [
          { name: 'BESENSE ECO MIX BY 14PCS', priceJalingo: 15000, priceOutside: 15700 },
        ],
      },
      {
        name: 'KNIGHT USE HEAVY FLOW N10',
        variants: [
          { name: 'DESENSE N10', priceJalingo: 11900, priceOutside: 12100 },
        ],
      },
      {
        name: 'DAY USE NORMAL FLOW D8',
        variants: [
          { name: 'BESENSE D8', priceJalingo: 9000, priceOutside: 9200 },
        ],
      },
      {
        name: 'BOX PACK AFRICAN TRADITIONAL 8+2 AT10',
        variants: [
          { name: 'AFRICAN TRADITIONAL BY 8+2LINER', priceJalingo: 11500, priceOutside: 11700 },
        ],
      },
      {
        name: 'NIHGT USE HEAVY FLOW N10 AF',
        variants: [
          { name: 'NIHGT USE HEAVY FLOW N10 AF (YELLOW AND GREEN)', priceJalingo: 11900, priceOutside: 12100 },
        ],
      },
      {
        name: 'DAY USE NORMAL FLOW D8 AF',
        variants: [
          { name: 'BESENSE D8 (YELLOW AND PINK)', priceJalingo: 9000, priceOutside: 9200 },
        ],
      },
      {
        name: 'BOX PACK AFRICAN TRADITIONAL 18+7+5 ATZIP',
        variants: [
          { name: 'ZIP PACK AFRICAN TRADITIONAL BY 30 PC', priceJalingo: 39900, priceOutside: 39900 },
        ],
      },
      {
        name: 'POCKET SACHET PACK P2',
        variants: [
          { name: 'BESENSE POCKET PACK 2', priceJalingo: 3700, priceOutside: 3900 },
        ],
      },
      {
        name: 'POCKET SACHET PACK P3',
        variants: [
          { name: 'BESENSE POCKET PACK 3', priceJalingo: 7900, priceOutside: 8100 },
        ],
      },
      {
        name: 'POCKET SACHET PACK AT3',
        variants: [
          { name: 'BESENSE POCKET PACK AT3 (P2+ 1LINER)', priceJalingo: 4800, priceOutside: 5000 },
        ],
      },
    ],
  },
  {
    name: 'JUSTFIT SANITARY PADS',
    category: 'Sanitary Pads',
    packages: [
      {
        name: 'JUSTFIT ZIP PACK 19+7+5',
        variants: [
          { name: 'JUSTFIT ZIP PAD BY 30PCS', priceJalingo: 37000, priceOutside: 37200 },
        ],
      },
      {
        name: 'BESENSE PANTY LINER',
        variants: [
          { name: 'PANTY LINERS BY 30PCS', priceJalingo: 30000, priceOutside: 30200 },
        ],
      },
      {
        name: 'JUSTFIT NIGHT USE HEAVY FLOW N10',
        variants: [
          { name: 'JUSTFIT N10 (GREEN)', priceJalingo: 8900, priceOutside: 9100 },
        ],
      },
      {
        name: 'JUSTFIT DAY USE NORMAL FLOW D8',
        variants: [
          { name: 'JUSTFIT D8 (GREEN)', priceJalingo: 7740, priceOutside: 7940 },
        ],
      },
    ],
  },
  {
    name: 'BESENSE WIPES',
    category: 'Wipes',
    packages: [
      {
        name: 'BESENSE WIPES BY 10PCS',
        variants: [
          { name: 'BESENSE WIPES BY 10PCS', priceJalingo: 17000, priceOutside: 17000 },
        ],
      },
      {
        name: 'BESENSE WIPES BY 40PCS',
        variants: [
          { name: 'BESENSE WIPES BY 40PCS', priceJalingo: 7500, priceOutside: 7500 },
        ],
      },
      {
        name: 'BESENSE WIPES BY 60PCS',
        variants: [
          { name: 'BESENSE WIPES BY 60PCS', priceJalingo: 14900, priceOutside: 14900 },
        ],
      },
      {
        name: 'BESENSE WIPES BY 80PCS',
        variants: [
          { name: 'BESENSE WIPES BY 80PCS', priceJalingo: 11300, priceOutside: 11300 },
        ],
      },
      {
        name: 'BESENSE WIPES BY 100PCS',
        variants: [
          { name: 'BESENSE WIPES BY 100PCS', priceJalingo: 13400, priceOutside: 13400 },
        ],
      },
      {
        name: 'BESENSE WIPES BY 128PCS',
        variants: [
          { name: 'BESENSE WIPES BY 128PCS', priceJalingo: 14800, priceOutside: 14800 },
        ],
      },
    ],
  },
  {
    name: 'ANGEL SANITARY PADS',
    category: 'Sanitary Pads',
    packages: [
      {
        name: 'ANGEL YELLOW BY 10',
        variants: [
          { name: 'ANGEL BY 10PCS', priceJalingo: 5600, priceOutside: 0 },
        ],
      },
      {
        name: 'ANGEL GREEN BY 7 AND 8',
        variants: [
          { name: 'ANGEL BY 7&8PCS', priceJalingo: 5500, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'DR BROWN BABY DIAPERS',
    category: 'Baby Diapers',
    packages: [
      {
        name: 'DR BROWN SACHET ROLL',
        variants: [
          { name: 'DR BROWN SACHET S1', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN SACHET S2', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN SACHET S3', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN SACHET S4', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN SACHET S5', priceJalingo: 0, priceOutside: 0 },
        ],
      },
      {
        name: 'DR BROWN CARRY PACK',
        variants: [
          { name: 'DR BROWN CARRY PACK S1', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN CARRY PACK S2', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN CARRY PACK S3', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN CARRY PACK S4', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN CARRY PACK S5', priceJalingo: 0, priceOutside: 0 },
        ],
      },
      {
        name: 'DR BROWN ECO PACK',
        variants: [
          { name: 'DR BROWN ECO PACK S1', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN ECO PACK S2', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN ECO PACK S3', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN ECO PACK S4', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN ECO PACK S5', priceJalingo: 0, priceOutside: 0 },
        ],
      },
      {
        name: 'LEBRACE JUMBO PACK',
        variants: [
          { name: 'DR BROWN JUMBO PACK SI', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN JUMBO PACK S2', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN JUMBO PACK S3', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN JUMBO PACK S4', priceJalingo: 0, priceOutside: 0 },
          { name: 'DR BROWN JUMBO PACK S5', priceJalingo: 0, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'ADULT DIAPER',
    category: 'Adult Diapers',
    packages: [
      {
        name: 'ADULT MEDIUM/LARGE/XTRA LARGE',
        variants: [
          { name: 'ADULT M/L/XL', priceJalingo: 72000, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'DR BROWN BABY WIPES',
    category: 'Wipes',
    packages: [
      {
        name: 'DR BROWN WIPES BY 50',
        variants: [
          { name: 'WIPES BY 50PCS', priceJalingo: 10500, priceOutside: 0 },
        ],
      },
      {
        name: 'DR BROWN WIPES BY 120',
        variants: [
          { name: 'WIPES BY 120PCS', priceJalingo: 22000, priceOutside: 0 },
        ],
      },
      {
        name: 'HAND SANITIZING WIPES',
        variants: [
          { name: 'HAND SANITIZING WIPES', priceJalingo: 11000, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'NET PADS',
    category: 'Sanitary Pads',
    packages: [
      {
        name: 'DR BROWN SANITARY PADS',
        variants: [
          { name: 'SEPT PAD', priceJalingo: 24000, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'BLUE PADS',
    category: 'Sanitary Pads',
    packages: [
      {
        name: 'DR BROWN BLUE PAD',
        variants: [
          { name: 'DR BROWN BLUE PAD', priceJalingo: 16430, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'UNDERPAD',
    category: 'Underpads',
    packages: [
      {
        name: 'DR BROWN NIGHTINGALE',
        variants: [
          { name: 'UNDERLAY/UNDERPAD/NIGHTINGALE', priceJalingo: 26000, priceOutside: 0 },
        ],
      },
    ],
  },
  {
    name: 'OTHERS',
    category: '',
    packages: [],
  },
];

/**
 * Get all brand names for Level 1 dropdown
 */
export function getBrandNames(): string[] {
  return PRODUCT_CATALOG.map((b) => b.name);
}

/**
 * Get package types for a selected brand (Level 2)
 */
export function getPackageTypes(brandName: string): string[] {
  const brand = PRODUCT_CATALOG.find((b) => b.name === brandName);
  if (!brand) return [];
  return brand.packages.map((p) => p.name);
}

/**
 * Get product variants for a selected brand + package (Level 3)
 */
export function getProductVariants(brandName: string, packageName: string): ProductVariant[] {
  const brand = PRODUCT_CATALOG.find((b) => b.name === brandName);
  if (!brand) return [];
  const pkg = brand.packages.find((p) => p.name === packageName);
  if (!pkg) return [];
  return pkg.variants;
}

/**
 * Get category for a brand
 */
export function getBrandCategory(brandName: string): string {
  const brand = PRODUCT_CATALOG.find((b) => b.name === brandName);
  return brand?.category || '';
}

/**
 * Check if brand is "OTHERS" (needs free-text input)
 */
export function isOthersBrand(brandName: string): boolean {
  return brandName === 'OTHERS';
}
