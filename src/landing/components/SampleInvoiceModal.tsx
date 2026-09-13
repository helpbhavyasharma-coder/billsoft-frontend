import React, { useState } from 'react';
import { X, Printer, QrCode, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import { Language, BusinessPreset, BUSINESS_PRESETS } from '../lib/businessPresets';

interface SampleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  selectedPresetId?: string;
}

export const SampleInvoiceModal: React.FC<SampleInvoiceModalProps> = ({ 
  isOpen, 
  onClose,
  language = 'en',
  selectedPresetId = 'kirana'
}) => {
  const [invoiceFormat, setInvoiceFormat] = useState<'a4' | 'thermal'>('a4');
  const [activePresetId, setActivePresetId] = useState<string>(selectedPresetId);

  if (!isOpen) return null;

  const isHi = language === 'hi';
  const activePreset = BUSINESS_PRESETS.find(p => p.id === activePresetId) || BUSINESS_PRESETS[0];

  // Calculate items totals
  const subtotal = activePreset.items.reduce((acc, it) => acc + (it.qty * it.rate), 0);
  const totalTax = activePreset.items.reduce((acc, it) => acc + (it.qty * it.rate * (it.gstPercent / 100)), 0);
  const grandTotal = Math.round(subtotal + totalTax);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-invoice-title"
      >
        {/* Top Control Bar: Format Switcher & Actions */}
        <div className="bg-slate-100 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Format Toggle (A4 vs Thermal POS Slip) */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <div className="bg-slate-200/90 p-0.5 rounded-lg grid grid-cols-2 sm:flex items-center text-xs font-semibold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setInvoiceFormat('a4')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer text-center ${
                  invoiceFormat === 'a4'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="sm:hidden">A4 Invoice</span>
                <span className="hidden sm:inline">Full A4 Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFormat('thermal')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer text-center ${
                  invoiceFormat === 'thermal'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="sm:hidden">Thermal POS</span>
                <span className="hidden sm:inline">3-inch Thermal POS</span>
              </button>
            </div>

            <div className="sm:hidden flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close invoice preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons for Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close invoice preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Business Preset Switcher for Invoice */}
        <div className="px-3 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            {isHi ? 'व्यापार अनुसार डेमो बिल चुनें:' : 'Sample Store Preset:'}
          </span>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
            {BUSINESS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActivePresetId(preset.id)}
                className={`px-2.5 py-1 sm:py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  activePresetId === preset.id
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isHi ? preset.nameHi : preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* INVOICE CONTENT AREA */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-slate-100/50 flex justify-center">
          {invoiceFormat === 'a4' ? (
            /* =================== A4 TAX INVOICE =================== */
            <div className="w-full bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs text-slate-700 font-sans">
              {/* Header Store & Invoice Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-300 pb-3 gap-3">
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activePreset.storeName}
                  </div>
                  <p className="text-slate-600 mt-0.5 text-xs">
                    Shop No. 14, Main Market, Sadar Bazar, Delhi - 110006
                  </p>
                  <p className="font-mono text-[10px] font-semibold text-slate-800 mt-0.5">
                    GSTIN: 07AAAPM1234F1Z8 | State: Delhi (Code: 07)
                  </p>
                  <p className="text-slate-500 text-[10px]">Phone: +91 98765 00000 | FSSAI/Lic: 1002001100045</p>
                </div>

                <div className="sm:text-right bg-slate-50 p-2.5 rounded-lg border border-slate-200 min-w-[160px]">
                  <div className="text-xs font-bold text-slate-900 uppercase">TAX INVOICE</div>
                  <div className="font-mono text-xs text-emerald-700 font-bold mt-0.5">
                    INV-2026-0842
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Date: 12-Sep-2026</div>
                  <div className="text-[10px] text-slate-500">Place of Supply: Delhi (07)</div>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
                  Billed To (Buyer Details)
                </div>
                <div className="font-bold text-slate-900 text-xs">
                  Shree Balaji Traders &amp; Retail Counter
                </div>
                <div className="text-slate-600 text-[11px]">
                  Plot 82, Grain Market, Najafgarh, New Delhi - 110043
                </div>
                <div className="font-mono text-[10px] font-medium text-slate-800 mt-0.5">
                  GSTIN: 07AAAAA0000A1Z5 | State: Delhi (07) | Phone: +91 99999 11111
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs min-w-[520px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-1.5 border-r border-slate-200 text-center w-8">#</th>
                      <th className="p-1.5 border-r border-slate-200">Item Description</th>
                      <th className="p-1.5 border-r border-slate-200 text-center">HSN</th>
                      <th className="p-1.5 border-r border-slate-200 text-center">Qty</th>
                      <th className="p-1.5 border-r border-slate-200 text-right">Rate (₹)</th>
                      <th className="p-1.5 border-r border-slate-200 text-center">GST %</th>
                      <th className="p-1.5 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {activePreset.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                        <td className="p-1.5 border-r border-slate-200 font-medium text-slate-900">{item.name}</td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono">{item.hsn}</td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono">{item.qty} {item.unit}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono">{item.gstPercent}%</td>
                        <td className="p-1.5 text-right font-mono font-medium">₹{(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 uppercase text-[10px]">Terms &amp; Conditions:</div>
                  <p>1. Goods once sold will not be returned without original cash receipt.</p>
                  <p>2. Subject to Delhi jurisdiction only.</p>
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-300">
                    <span className="font-semibold text-slate-700">Payment Mode:</span>{' '}
                    <span className="font-mono text-emerald-700 font-bold">PAID via Store UPI (Ref #98234)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span>₹{(totalTax / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span>₹{(totalTax / 2).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-slate-900 text-xs sm:text-sm">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signature Line */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>Thank you for doing business with us!</div>
                <div className="text-right">
                  <div className="font-semibold text-slate-800">For {activePreset.storeName}</div>
                  <div className="mt-5 text-[9px] text-slate-400">Authorized Signatory</div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== 3-INCH THERMAL POS SLIP (80mm) =================== */
            <div className="w-full max-w-[320px] mx-auto bg-white p-4 rounded-lg border border-dashed border-slate-400 shadow-md font-mono text-[11px] text-slate-900 leading-tight">
              {/* Store Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                <div className="font-bold text-xs tracking-wider uppercase">{activePreset.storeName}</div>
                <div className="text-[10px] text-slate-600">Main Market, Delhi-06</div>
                <div className="text-[10px] text-slate-600">GSTIN: 07AAAPM1234F1Z8</div>
                <div className="text-[10px] text-slate-600">Ph: 9876500000</div>
              </div>

              {/* Bill Details */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>BILL NO: #INV-0842</span>
                  <span>POS-01</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE: 12/09/2026</span>
                  <span>TIME: 14:28</span>
                </div>
                <div>CUSTOMER: Counter Cash / Walk-in</div>
              </div>

              {/* Items Line Header */}
              <div className="py-1.5 border-b border-slate-900 flex justify-between font-bold text-[10px]">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/4 text-center">QTY</span>
                <span className="w-1/4 text-right">AMT</span>
              </div>

              {/* Item Rows */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5 text-[10px]">
                {activePreset.items.map((it) => (
                  <div key={it.id}>
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="flex justify-between text-slate-600 text-[9px]">
                      <span>HSN:{it.hsn} @{it.gstPercent}%</span>
                      <span>{it.qty} {it.unit} x ₹{it.rate}</span>
                      <span className="font-bold text-slate-900 font-mono">₹{(it.qty * it.rate).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[9px]">
                  <span>CGST TAX:</span>
                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[9px]">
                  <span>SGST TAX:</span>
                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-800">
                  <span>TOTAL PAID:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>MODE:</span>
                  <span className="font-bold text-emerald-700">UPI / QR SCAN</span>
                </div>
              </div>

              {/* Thermal Barcode & QR Stamp */}
              <div className="pt-3 text-center space-y-1.5">
                <div className="inline-block p-1 border border-slate-300 rounded bg-slate-50">
                  <QrCode className="w-14 h-14 mx-auto text-slate-800" />
                  <span className="text-[8px] text-slate-500 block mt-0.5">Scan to Verify Invoice</span>
                </div>

                {/* Simulated Barcode */}
                <div className="font-mono text-[9px] tracking-widest text-slate-400 pt-1">
                  ||||| | |||| |||||| || |||||
                </div>
                <div className="text-[9px] text-slate-600">
                  *** Thank You! Visit Again ***
                </div>
                <div className="text-[8px] text-slate-400">
                  Powered by BillSoft
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-slate-100 px-4 sm:px-5 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-[11px] text-center sm:text-left">
            Ready for all 58mm/80mm ESC-POS printers &amp; standard laser/inkjet printers.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer text-center"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
