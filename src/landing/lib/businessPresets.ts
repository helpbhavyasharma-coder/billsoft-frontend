export type Language = 'en' | 'hi';

export interface BusinessPreset {
  id: string;
  name: string;
  nameHi: string;
  storeName: string;
  category: string;
  items: Array<{
    id: string;
    name: string;
    hsn: string;
    qty: number;
    unit: string;
    rate: number;
    gstPercent: number;
    isInclusive: boolean;
  }>;
}

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: 'kirana',
    name: 'Kirana & Grocery',
    nameHi: 'किराना एवं जनरल स्टोर',
    storeName: 'MAHALAXMI TRADING CO. (KIRANA)',
    category: 'Daily Grocery & Food Grains',
    items: [
      {
        id: '1',
        name: 'Fortune Sunlite Refined Sunflower Oil (1L Pouch)',
        hsn: '1512',
        qty: 5,
        unit: 'Pkt',
        rate: 145,
        gstPercent: 5,
        isInclusive: false,
      },
      {
        id: '2',
        name: 'Daawat Rozana Super Basmati Rice (5kg Bag)',
        hsn: '1006',
        qty: 2,
        unit: 'Bag',
        rate: 390,
        gstPercent: 5,
        isInclusive: false,
      },
      {
        id: '3',
        name: 'Surf Excel Quick Wash Detergent Powder (1kg)',
        hsn: '3402',
        qty: 3,
        unit: 'Pcs',
        rate: 165,
        gstPercent: 18,
        isInclusive: false,
      }
    ]
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy & Medical',
    nameHi: 'दवा व मेडिकल स्टोर',
    storeName: 'SANJEEVANI MEDICO & PHARMA',
    category: 'Medicines & Surgical Items',
    items: [
      {
        id: '1',
        name: 'Augmentin 625 Duo Tablet (Strip of 10) [Batch: AG842]',
        hsn: '3004',
        qty: 4,
        unit: 'Strip',
        rate: 188,
        gstPercent: 12,
        isInclusive: true,
      },
      {
        id: '2',
        name: 'Dolo 650mg Paracetamol Tablets (15 Tabs) [Exp: 10/28]',
        hsn: '3004',
        qty: 10,
        unit: 'Strip',
        rate: 32,
        gstPercent: 12,
        isInclusive: true,
      },
      {
        id: '3',
        name: 'Accu-Chek Active Blood Glucose Strips (Pack of 50)',
        hsn: '9027',
        qty: 1,
        unit: 'Box',
        rate: 890,
        gstPercent: 12,
        isInclusive: false,
      }
    ]
  },
  {
    id: 'garments',
    name: 'Garments & Apparel',
    nameHi: 'कपड़े व गारमेंट्स',
    storeName: 'ROYAL FASHION & APPARELS',
    category: 'Ready-made Clothing & Textiles',
    items: [
      {
        id: '1',
        name: 'Men Slim Fit Cotton Formal Shirt (Size: 42, Sky Blue)',
        hsn: '6205',
        qty: 2,
        unit: 'Pcs',
        rate: 850,
        gstPercent: 5,
        isInclusive: false,
      },
      {
        id: '2',
        name: 'Denim Comfort Stretch Jeans (Size: 34, Dark Indigo)',
        hsn: '6203',
        qty: 1,
        unit: 'Pcs',
        rate: 1299,
        gstPercent: 12,
        isInclusive: false,
      },
      {
        id: '3',
        name: 'Pure Cotton Printed Kurti Set with Dupatta (L)',
        hsn: '6204',
        qty: 1,
        unit: 'Set',
        rate: 1450,
        gstPercent: 5,
        isInclusive: false,
      }
    ]
  },
  {
    id: 'hardware',
    name: 'Hardware & Electricals',
    nameHi: 'हार्डवेयर व इलेक्ट्रिकल',
    storeName: 'SHREE GANESH HARDWARE & ELECTRIC',
    category: 'Tools, Electricals & Building Supplies',
    items: [
      {
        id: '1',
        name: 'Havells 9W LED Bulb B22 Cool White (Pack of 4)',
        hsn: '8539',
        qty: 3,
        unit: 'Pack',
        rate: 280,
        gstPercent: 18,
        isInclusive: false,
      },
      {
        id: '2',
        name: 'Polycab 2.5 sq mm FR Copper Wire 90m (Red Coil)',
        hsn: '8544',
        qty: 1,
        unit: 'Coil',
        rate: 2150,
        gstPercent: 18,
        isInclusive: false,
      },
      {
        id: '3',
        name: 'Asian Paints Apex Exterior Emulsion Paint (4L Bucket)',
        hsn: '3209',
        qty: 1,
        unit: 'Can',
        rate: 1180,
        gstPercent: 28,
        isInclusive: false,
      }
    ]
  }
];

export interface HsnItem {
  code: string;
  desc: string;
  descHi: string;
  category: string;
  gstRate: number;
}

export const COMMON_HSN_CODES: HsnItem[] = [
  { code: '1006', desc: 'Rice & Food Grains (Paddy/Basmati)', descHi: 'चावल एवं अनाज (बासमती)', category: 'Kirana', gstRate: 5 },
  { code: '1512', desc: 'Refined Edible Cooking Oils (Sunflower/Soybean)', descHi: 'रिफाइंड खाद्य तेल', category: 'Kirana', gstRate: 5 },
  { code: '0402', desc: 'Milk Powder, Condensed Milk, Butter', descHi: 'दूध पाउडर, मक्खन व डेयरी', category: 'Kirana', gstRate: 5 },
  { code: '3401', desc: 'Bath Soaps & Washing Bars', descHi: 'नहाने का साबुन व टिकिया', category: 'Kirana', gstRate: 18 },
  { code: '3402', desc: 'Detergent Powders & Cleaning Liquids', descHi: 'सर्फ व डिटर्जेंट पाउडर', category: 'Kirana', gstRate: 18 },
  { code: '3004', desc: 'Medicaments & Generic Pharma Formulations', descHi: 'दवाइयां एवं फार्मा उत्पाद', category: 'Pharmacy', gstRate: 12 },
  { code: '9027', desc: 'Medical Diagnostic Devices & Blood Glucose Strips', descHi: 'मेडिकल जांच उपकरण व स्ट्रिप्स', category: 'Pharmacy', gstRate: 12 },
  { code: '6203', desc: 'Men Trousers, Jeans & Suits (<₹1000: 5%, >₹1000: 12%)', descHi: 'पुरुषों की पैंट व जीन्स', category: 'Garments', gstRate: 12 },
  { code: '6205', desc: 'Men Cotton & Silk Shirts', descHi: 'पुरुषों की कॉटन शर्ट', category: 'Garments', gstRate: 5 },
  { code: '6204', desc: 'Women Kurti, Suits, Skirts & Dresses', descHi: 'महिलाओं के कुर्ते व सूट', category: 'Garments', gstRate: 5 },
  { code: '8539', desc: 'LED Bulbs, Tubes & Lighting Accessories', descHi: 'एलईडी बल्ब व ट्यूबलाइट्स', category: 'Hardware', gstRate: 18 },
  { code: '8544', desc: 'Insulated Copper Wires & Electrical Cables', descHi: 'इंसुलेटेड कॉपर वायर व केबल', category: 'Hardware', gstRate: 18 },
  { code: '3209', desc: 'Synthetic Paints, Varnishes & Primers', descHi: 'पेंट्स, डिस्टेंपर व प्राइमर', category: 'Hardware', gstRate: 28 },
  { code: '7318', desc: 'Screws, Bolts, Nuts, Rivets & Washers', descHi: 'नट, बोल्ट, पेंच व वाशर', category: 'Hardware', gstRate: 18 },
  { code: '8471', desc: 'Computers, POS Thermal Printers & Barcode Scanners', descHi: 'कंप्यूटर, बिलिंग प्रिंटर व स्कैनर', category: 'Hardware', gstRate: 18 },
];
