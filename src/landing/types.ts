export interface InvoiceItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  gstPercent: number;
  isInclusive: boolean;
}

export interface PartyLedgerEntry {
  id: string;
  partyName: string;
  contact: string;
  gstin?: string;
  outstandingBalance: number;
  lastBillDate: string;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  type: 'customer' | 'supplier';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stockIn: number;
  stockOut: number;
  remainingStock: number;
  minThreshold: number;
  unit: string;
  purchaseRate: number;
  saleRate: number;
  status: 'optimal' | 'low';
}

export interface BusinessReportSummary {
  todaySales: number;
  todayBills: number;
  monthlySales: number;
  pendingBakaya: number;
  cgstCollected: number;
  sgstCollected: number;
}
