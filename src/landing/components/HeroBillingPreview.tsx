import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Share2, 
  Plus, 
  Trash2, 
  Calculator, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Building2,
  Store,
  Check
} from 'lucide-react';
import { InvoiceItem } from '../types';
import { BUSINESS_PRESETS, Language } from '../lib/businessPresets';

interface HeroBillingPreviewProps {
  onOpenSampleInvoice: () => void;
  onWhatsAppSharePrompt: () => void;
  language?: Language;
  onPresetChange?: (presetId: string) => void;
}

export const HeroBillingPreview: React.FC<HeroBillingPreviewProps> = ({
  onOpenSampleInvoice,
  onWhatsAppSharePrompt,
  language = 'en',
  onPresetChange,
}) => {
  const isHi = language === 'hi';
  const [activePresetId, setActivePresetId] = useState<string>('kirana');
  const [isInclusiveGst, setIsInclusiveGst] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'paid' | 'credit'>('paid');

  const activePreset = BUSINESS_PRESETS.find(p => p.id === activePresetId) || BUSINESS_PRESETS[0];

  const [items, setItems] = useState<InvoiceItem[]>(activePreset.items);

  // When active preset changes, update items and parent
  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const target = BUSINESS_PRESETS.find(p => p.id === presetId);
    if (target) {
      setItems(target.items);
    }
    if (onPresetChange) {
      onPresetChange(presetId);
    }
  };

  // Calculate live numbers
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const lineBase = item.qty * item.rate;
      if (isInclusiveGst) {
        const taxable = lineBase / (1 + item.gstPercent / 100);
        const tax = lineBase - taxable;
        subtotal += taxable;
        totalTax += tax;
      } else {
        const tax = (lineBase * item.gstPercent) / 100;
        subtotal += lineBase;
        totalTax += tax;
      }
    });

    const rawTotal = subtotal + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      roundOff,
      total: roundedTotal
    };
  };

  const totals = calculateTotals();

  const handleUpdateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleResetSample = () => {
    setItems(activePreset.items);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col text-xs">
      {/* Business Preset Switcher Bar */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{isHi ? 'व्यवसाय अनुसार डेमो बिल:' : 'Store Demo Preset:'}</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
          {BUSINESS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1 sm:py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                activePresetId === p.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isHi ? p.nameHi : p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bill Header Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-3 py-2 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isHi ? 'काउंटर लाइव बिल' : 'Counter Preview'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              INV-2026-0842
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetSample}
            className="sm:hidden text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 cursor-pointer font-medium"
            title="Reset preset quantities"
          >
            {isHi ? 'रीसेट' : 'Reset'}
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Inclusive/Exclusive GST Dual Segmented Pill Switch */}
          <div 
            className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[10px] sm:text-[11px] font-semibold"
            role="group"
            aria-label="GST Calculation Mode"
          >
            <button
              type="button"
              id="hero-gst-exclusive-btn"
              onClick={() => setIsInclusiveGst(false)}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                !isInclusiveGst
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="GST is added extra on top of rate"
            >
              <Check className={`w-3 h-3 ${!isInclusiveGst ? 'opacity-100' : 'opacity-0'}`} />
              <span>{isHi ? 'टैक्स अलग (+GST)' : 'GST Exclusive'}</span>
            </button>

            <button
              type="button"
              id="hero-gst-inclusive-btn"
              onClick={() => setIsInclusiveGst(true)}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                isInclusiveGst
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tax is already included in item MRP"
            >
              <Check className={`w-3 h-3 ${isInclusiveGst ? 'opacity-100' : 'opacity-0'}`} />
              <span>{isHi ? 'टैक्स सहित (MRP)' : 'GST Inclusive'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetSample}
            className="hidden sm:inline-block text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1.5 py-0.5 cursor-pointer font-medium"
            title="Reset preset quantities"
          >
            {isHi ? 'रीसेट' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Party / Customer Quick Details Row */}
      <div className="p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
              <span>{activePreset.storeName}</span>
              <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 rounded">
                B2B &amp; Retail
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] mt-0.5">
              GSTIN: 07AAAPM1234F1Z8 | Delhi (07)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Date</span>
            <span className="font-mono text-xs font-medium">12-Sep-2026</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Mode</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaymentMode('paid')}
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold cursor-pointer ${
                  paymentMode === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Cash/UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('credit')}
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold cursor-pointer ${
                  paymentMode === 'credit'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Khata (Udhari)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Items Table (Mobile responsive with horizontal scroll) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2 px-3">{isHi ? 'विवरण (सामान)' : 'Item Description'}</th>
              <th className="py-2 px-2 text-center">HSN</th>
              <th className="py-2 px-2 text-center">{isHi ? 'मात्रा' : 'Qty'}</th>
              <th className="py-2 px-2 text-right">
                {isInclusiveGst 
                  ? (isHi ? 'एमआरपी (सहित) ₹' : 'MRP (Incl.) ₹') 
                  : (isHi ? 'मूल भाव ₹' : 'Rate (Excl.) ₹')
                }
              </th>
              <th className="py-2 px-2 text-center">GST</th>
              <th className="py-2 px-3 text-right">
                {isInclusiveGst 
                  ? (isHi ? 'कुल राशि (MRP) ₹' : 'Amount (MRP) ₹') 
                  : (isHi ? 'कुल (+टैक्स) ₹' : 'Amount (+GST) ₹')
                }
              </th>
              <th className="py-2 px-2 text-center w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
            {items.map((item) => {
              const lineGross = item.qty * item.rate;
              let lineTaxable = 0;
              let lineTax = 0;
              let lineFinalAmount = 0;

              if (isInclusiveGst) {
                // Rate is MRP (tax inclusive)
                lineFinalAmount = lineGross;
                lineTaxable = lineGross / (1 + item.gstPercent / 100);
                lineTax = lineGross - lineTaxable;
              } else {
                // Rate is Base Price (tax exclusive, tax added on top)
                lineTaxable = lineGross;
                lineTax = (lineGross * item.gstPercent) / 100;
                lineFinalAmount = lineGross + lineTax;
              }

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                    <div className="leading-snug">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 sm:hidden">
                      HSN: {item.hsn}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {item.hsn}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                        title="Decrease"
                      >
                        -
                      </button>
                      <span className="px-1 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                        title="Increase"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                    <div className="font-semibold">₹{item.rate.toFixed(2)}</div>
                    <span className="text-[9px] text-slate-400 block font-sans">
                      {isInclusiveGst 
                        ? (isHi ? 'टैक्स सहित' : 'Incl. Tax') 
                        : (isHi ? 'टैक्स अलग' : 'Excl. Tax')
                      }
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                      {item.gstPercent}%
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                      ₹{lineTax.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      ₹{lineFinalAmount.toFixed(2)}
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-sans">
                      {isInclusiveGst 
                        ? (isHi ? `टैक्सेबल ₹${lineTaxable.toFixed(2)}` : `Base ₹${lineTaxable.toFixed(2)}`)
                        : (isHi ? `मूल ₹${lineTaxable.toFixed(2)} + कर` : `Base ₹${lineTaxable.toFixed(2)}`)
                      }
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 cursor-pointer p-0.5"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bill Footer Calculations & Action Triggers */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Quick Highlights & Status */}
        <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Barcode &amp; Thermal 80mm ESC/POS ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Auto-generated dynamic UPI QR for instant scan &amp; pay</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isInclusiveGst ? 'GST Mode: ' : 'GST Mode: '}
            </span>
            {isInclusiveGst 
              ? (isHi ? 'एमआरपी आधारित बिलिंग (टैक्स उत्पाद मूल्य में पहले से जुड़ा हुआ है)' : 'MRP-based Billing (GST is extracted from retail MRP)')
              : (isHi ? 'एक्सक्लूसिव बिलिंग (मूल भाव पर टैक्स अलग से जोड़ा गया है)' : 'Exclusive Billing (GST is added extra on base price)')
            }
          </div>
        </div>

        {/* Totals Box */}
        <div className="flex flex-col items-end gap-1 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full md:w-auto md:min-w-[260px]">
          <div className="w-full flex items-center justify-between text-[10px] pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="font-semibold uppercase tracking-wider text-slate-400">GST Mode:</span>
            <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {isInclusiveGst 
                ? (isHi ? 'एमआरपी (टैक्स सहित)' : 'Inclusive (Inside MRP)') 
                : (isHi ? 'टैक्स अलग से (+GST)' : 'Exclusive (Tax on Base)')
              }
            </span>
          </div>

          <div className="w-full flex justify-between text-slate-600 dark:text-slate-400 text-[11px] pt-0.5">
            <span>
              {isInclusiveGst 
                ? (isHi ? 'टैक्सेबल मूल्य (एमआरपी में):' : 'Taxable Base (In MRP):') 
                : (isHi ? 'टैक्सेबल सबटोटल:' : 'Taxable Subtotal:')
              }
            </span>
            <span className="font-mono font-medium">₹{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="w-full flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span>{isInclusiveGst ? 'CGST (Included):' : 'CGST (Added):'}</span>
            <span className="font-mono font-medium">
              {isInclusiveGst ? '' : '+'}₹{totals.cgst.toFixed(2)}
            </span>
          </div>
          <div className="w-full flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span>{isInclusiveGst ? 'SGST (Included):' : 'SGST (Added):'}</span>
            <span className="font-mono font-medium">
              {isInclusiveGst ? '' : '+'}₹{totals.sgst.toFixed(2)}
            </span>
          </div>
          <div className="w-full flex justify-between text-slate-500 dark:text-slate-400 text-[10px]">
            <span>Round-off:</span>
            <span className="font-mono">{totals.roundOff >= 0 ? `+₹${totals.roundOff}` : `-₹${Math.abs(totals.roundOff)}`}</span>
          </div>
          <div className="w-full flex justify-between items-baseline pt-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
            <span className="text-xs">{isHi ? 'कुल देय बिल:' : 'Bill Total:'}</span>
            <span className="text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400">
              ₹{totals.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Button Bar: Print, View Sample & WhatsApp */}
      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 sm:py-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
          {isHi ? 'मात्रा बदलकर या ऊपर से दुकान चुनकर लाइव देखें।' : 'Try modifying quantity or changing business preset above.'}
        </span>

        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenSampleInvoice}
            className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer text-center"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Sample Invoice</span>
          </button>

          <button
            type="button"
            onClick={onWhatsAppSharePrompt}
            className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs cursor-pointer text-center"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">WhatsApp Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
