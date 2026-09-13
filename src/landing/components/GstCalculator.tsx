import React, { useState } from 'react';
import { 
  Calculator, 
  Search, 
  Percent, 
  ArrowRightLeft, 
  Check, 
  Copy, 
  HelpCircle,
  Tag,
  Coins
} from 'lucide-react';
import { COMMON_HSN_CODES, Language } from '../lib/businessPresets';

interface GstCalculatorProps {
  language: Language;
}

export const GstCalculator: React.FC<GstCalculatorProps> = ({ language }) => {
  const isHi = language === 'hi';

  // Calculator State
  const [amount, setAmount] = useState<number>(1000);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [isInclusive, setIsInclusive] = useState<boolean>(false);
  const [taxType, setTaxType] = useState<'intra' | 'inter'>('intra'); // intra = CGST+SGST, inter = IGST
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // HSN Search State
  const [hsnSearch, setHsnSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // GST Calculation Logic
  let netAmount = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  const validAmount = isNaN(amount) || amount < 0 ? 0 : amount;

  if (isInclusive) {
    // Amount already has tax included: Base = Total / (1 + r/100)
    netAmount = validAmount / (1 + taxRate / 100);
    taxAmount = validAmount - netAmount;
    totalAmount = validAmount;
  } else {
    // Tax added on top of base amount: Total = Base + (Base * r/100)
    netAmount = validAmount;
    taxAmount = (validAmount * taxRate) / 100;
    totalAmount = netAmount + taxAmount;
  }

  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;
  const igstAmount = taxAmount;

  // Filter HSN list
  const filteredHsn = COMMON_HSN_CODES.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = hsnSearch.toLowerCase().trim();
    if (!query) return matchesCategory;
    const matchesQuery = 
      item.code.includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.descHi.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const gstSlabs = [0, 5, 12, 18, 28];

  return (
    <section id="gst-calculator" className="py-8 sm:py-10 md:py-12 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {isHi ? 'मुफ्त व्यापार टूल' : 'Free Vyapari Tax Tool'}
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isHi ? 'लाइव जीएसटी कैलकुलेटर एवं एचएसएन (HSN) खोजक' : 'Live GST Calculator & HSN Code Finder'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isHi 
              ? 'काउंटर पर ग्राहक को बिल देने से पहले तुरंत टैक्स (CGST, SGST या IGST) निकालें और किसी भी सामान का सरकारी HSN कोड चेक करें।' 
              : 'Calculate exact Taxable Amount, CGST, SGST or IGST in real-time and quickly lookup officially accepted HSN codes for your billing items.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: Live GST Calculator Card (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {isHi ? 'जीएसटी राशि कैलकुलेटर' : 'GST Amount Calculator'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHi ? 'सटीक 2 दशमलव तक गणना' : 'Accurate to 2 decimal places'}
                  </span>
                </div>
              </div>

              {/* Inclusive / Exclusive Toggle */}
              <div className="grid grid-cols-2 sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] sm:text-[11px] font-semibold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsInclusive(false)}
                  className={`px-2.5 py-1.5 sm:py-1 rounded-md transition-colors cursor-pointer text-center ${
                    !isInclusive
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isHi ? 'टैक्स अलग से (+GST)' : 'Exclusive (+GST)'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsInclusive(true)}
                  className={`px-2.5 py-1.5 sm:py-1 rounded-md transition-colors cursor-pointer text-center ${
                    isInclusive
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isHi ? 'टैक्स सहित (MRP)' : 'Inclusive (MRP)'}
                </button>
              </div>
            </div>

            {/* Input Row: Amount & Supply Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isInclusive 
                    ? (isHi ? 'कुल एमआरपी / विक्रय मूल्य (₹)' : 'Total MRP / Final Price (₹)')
                    : (isHi ? 'मूल कीमत / टैक्सेबल राशि (₹)' : 'Base Taxable Value (₹)')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="1000"
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isHi ? 'सप्लाई का प्रकार (राज्य)' : 'Supply Type'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaxType('intra')}
                    className={`py-2 px-2 text-[11px] font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                      taxType === 'intra'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isHi ? 'राज्य के अंदर (CGST+SGST)' : 'Within State (CGST+SGST)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('inter')}
                    className={`py-2 px-2 text-[11px] font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                      taxType === 'inter'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isHi ? 'अंतर्राज्यीय (IGST)' : 'Inter-State (IGST)'}
                  </button>
                </div>
              </div>
            </div>

            {/* GST Slab Chips */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isHi ? 'जीएसटी स्लैब चुनें:' : 'Select GST Slab Rate:'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {gstSlabs.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTaxRate(rate)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      taxRate === rate
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{rate}%</span>
                    {taxRate === rate && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Breakdown Results Panel */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {isHi ? 'टैक्सेबल मूल्य (मूल राशि):' : 'Taxable Amount (Base Value):'}
                </span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                  <span>₹{netAmount.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(netAmount.toFixed(2), 'net')}
                    title="Copy amount"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {copiedField === 'net' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* CGST / SGST or IGST Breakdown */}
              {taxType === 'intra' ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      CGST ({taxRate / 2}%):
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      + ₹{cgstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">
                      SGST ({taxRate / 2}%):
                    </span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      + ₹{sgstAmount.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    IGST ({taxRate}%):
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    + ₹{igstAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">
                  {isHi ? 'कुल जीएसटी टैक्स:' : 'Total GST Tax:'}
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{taxAmount.toFixed(2)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold">
                <span className="text-slate-900 dark:text-white">
                  {isHi ? 'अंतिम देय राशि (Grand Total):' : 'Final Payable Bill Total:'}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                  <span>₹{totalAmount.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(totalAmount.toFixed(2), 'total')}
                    title="Copy total"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {copiedField === 'total' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: HSN Code Finder & Lookup (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {isHi ? 'एचएसएन (HSN) कोड फाइंडर' : 'Common HSN Code Finder'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isHi ? 'सरकारी मान्य टैक्स दरें' : 'Standard GST Rates for Retail'}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={hsnSearch}
                onChange={(e) => setHsnSearch(e.target.value)}
                placeholder={isHi ? 'सामान या HSN कोड खोजें (उदा. 1006, चावल, तेल)' : 'Search item or HSN (e.g. rice, oil, 3004)...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Category Chips */}
            <div className="flex flex-wrap items-center gap-1 mb-2.5 text-[10px]">
              {['all', 'Kirana', 'Pharmacy', 'Garments', 'Hardware'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? (isHi ? 'सभी' : 'All') : cat}
                </button>
              ))}
            </div>

            {/* HSN Results List with scroll */}
            <div className="flex-1 max-h-[260px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredHsn.length > 0 ? (
                filteredHsn.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="pt-1.5 first:pt-0 flex items-center justify-between text-xs group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-md transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                          {item.code}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium truncate mt-0.5" title={item.desc}>
                        {isHi ? item.descHi : item.desc}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                        {item.gstRate}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTaxRate(item.gstRate);
                          handleCopy(item.code, `hsn-${item.code}`);
                        }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-0.5 justify-end"
                        title="Apply rate to calculator"
                      >
                        {copiedField === `hsn-${item.code}` ? (
                          <span className="text-emerald-500 flex items-center gap-0.5">Copied <Check className="w-2.5 h-2.5" /></span>
                        ) : (
                          <span>Apply Rate</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                  {isHi ? 'कोई मेल खाता HSN कोड नहीं मिला।' : 'No matching HSN codes found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
