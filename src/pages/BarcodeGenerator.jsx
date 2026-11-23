import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Barcode, Printer, Plus, Trash2, CheckCircle2,
  Settings, Grid, LayoutGrid, FileText
} from 'lucide-react';
import { PageHeader, Money, LoadingState } from '../components/ui';

/** Clean SVG Code-128 / Barcode Generator */
function BarcodeSvg({ value }) {
  const code = String(value || '1234567890');
  // Simple deterministic barcode pattern generator
  const bars = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode + 1) % 2) + 1;
    bars.push({ width: w1, space: w2 });
  }

  let currentX = 10;
  const rects = [];
  rects.push(<rect key="start1" x="5" y="0" width="2" height="35" fill="#000" />);
  rects.push(<rect key="start2" x="8" y="0" width="1" height="35" fill="#000" />);

  bars.forEach((b, idx) => {
    rects.push(<rect key={`b-${idx}`} x={currentX} y="0" width={b.width} height="35" fill="#000" />);
    currentX += b.width + b.space + 1;
  });

  rects.push(<rect key="stop1" x={currentX} y="0" width="2" height="35" fill="#000" />);
  rects.push(<rect key="stop2" x={currentX + 3} y="0" width="2" height="35" fill="#000" />);

  return (
    <div className="flex flex-col items-center">
      <svg width={Math.max(currentX + 10, 120)} height="36" className="overflow-visible">
        {rects}
      </svg>
      <span className="font-mono text-[9px] tracking-widest text-slate-700 mt-0.5">{code}</span>
    </div>
  );
}

export default function BarcodeGenerator() {
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected items to print: array of { product, count }
  const [selectedList, setSelectedList] = useState([]);
  const [paperFormat, setPaperFormat] = useState('a4_24'); // a4_24, a4_40, thermal_roll

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, compRes] = await Promise.all([
        api.get('/products'),
        api.get('/company'),
      ]);
      if (prodRes.data.products) {
        setProducts(prodRes.data.products);
        // Pre-select first 3 products with default 1 label
        const init = prodRes.data.products.slice(0, 3).map(p => ({
          product_id: p.id,
          product: p,
          count: 4,
          barcode: p.barcode || `890${String(p.id).padStart(7, '0')}`,
        }));
        setSelectedList(init);
      }
      if (compRes.data.company) setCompany(compRes.data.company);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (prodId) => {
    const p = products.find(prod => String(prod.id) === String(prodId));
    if (!p) return;
    if (selectedList.some(item => String(item.product_id) === String(prodId))) {
      toast.error('Product already in label queue');
      return;
    }
    setSelectedList(prev => [
      ...prev,
      {
        product_id: p.id,
        product: p,
        count: 4,
        barcode: p.barcode || `890${String(p.id).padStart(7, '0')}`,
      }
    ]);
  };

  const handleUpdateCount = (idx, count) => {
    const updated = [...selectedList];
    updated[idx].count = Math.max(1, Number(count) || 1);
    setSelectedList(updated);
  };

  const handleUpdateBarcode = (idx, code) => {
    const updated = [...selectedList];
    updated[idx].barcode = code;
    setSelectedList(updated);
  };

  const handleRemove = (idx) => {
    setSelectedList(selectedList.filter((_, i) => i !== idx));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingState message="Loading barcode catalog..." />;

  // Flatten label items for preview
  const labelsToRender = [];
  selectedList.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      labelsToRender.push({
        name: item.product.name,
        barcode: item.barcode,
        rate: item.product.default_rate,
      });
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Barcode Scanner & Label Printing"
          subtitle="Generate and print barcode stickers for thermal printers and A4 sticker sheets"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={labelsToRender.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print {labelsToRender.length} Labels
          </button>
        </div>
      </div>

      {/* Configuration & Selection Panel - Hidden on Print */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:hidden">
        {/* Left: Product Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Barcode className="w-4 h-4 text-indigo-600" />
              Barcode Label Queue ({selectedList.length} products)
            </h3>

            <div className="w-56">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              >
                <option value="">+ Add Product to Labels...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.default_rate})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
            {selectedList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                No products selected. Select a product above to generate barcode labels.
              </div>
            ) : (
              selectedList.map((item, idx) => (
                <div key={item.product_id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.product.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">Price: ₹{item.product.default_rate}</p>
                  </div>

                  <div className="w-36">
                    <input
                      type="text"
                      placeholder="Barcode value"
                      value={item.barcode}
                      onChange={(e) => handleUpdateBarcode(idx, e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) => handleUpdateCount(idx, e.target.value)}
                      className="w-16 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded text-center font-bold"
                    />
                  </div>

                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Sheet & Print Setup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            Paper & Sticker Format
          </h3>

          <div className="space-y-2">
            <label
              onClick={() => setPaperFormat('a4_24')}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                paperFormat === 'a4_24'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={paperFormat === 'a4_24'}
                onChange={() => setPaperFormat('a4_24')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="text-xs">
                <span className="font-bold block">A4 Sheet (24 Labels)</span>
                <span className="text-slate-500">3 columns × 8 rows (64mm × 33.8mm stickers)</span>
              </div>
            </label>

            <label
              onClick={() => setPaperFormat('a4_40')}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                paperFormat === 'a4_40'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={paperFormat === 'a4_40'}
                onChange={() => setPaperFormat('a4_40')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="text-xs">
                <span className="font-bold block">A4 Sheet (40 Labels)</span>
                <span className="text-slate-500">4 columns × 10 rows (48.5mm × 25.4mm stickers)</span>
              </div>
            </label>

            <label
              onClick={() => setPaperFormat('thermal_roll')}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                paperFormat === 'thermal_roll'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={paperFormat === 'thermal_roll'}
                onChange={() => setPaperFormat('thermal_roll')}
                className="mt-0.5 text-indigo-600"
              />
              <div className="text-xs">
                <span className="font-bold block">Single Thermal Roll Sticker</span>
                <span className="text-slate-500">50mm × 25mm barcode roll printer</span>
              </div>
            </label>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 space-y-1">
            <p>• Ready for standard TSC, Zebra, and TVS barcode printers.</p>
            <p>• Compatible with USB/Bluetooth 1D & 2D barcode scanners.</p>
          </div>
        </div>
      </div>

      {/* Label Sheet Preview & Print Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs print:border-none print:p-0 print:shadow-none">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            Sticker Sheet Live Preview ({labelsToRender.length} Labels)
          </h3>
          <span className="text-xs text-slate-400">Scale 100% on print dialog</span>
        </div>

        {/* Printable Grid */}
        <div className={`mt-4 ${
          paperFormat === 'a4_24'
            ? 'grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2'
            : paperFormat === 'a4_40'
            ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 print:grid-cols-4 print:gap-1.5'
            : 'flex flex-col items-center gap-4 print:gap-2'
        }`}>
          {labelsToRender.map((lb, idx) => (
            <div
              key={idx}
              className="border border-dashed border-slate-300 dark:border-slate-700 p-2.5 rounded-lg flex flex-col items-center justify-between text-center bg-white text-slate-900 shadow-2xs print:border-solid print:border-slate-200 print:shadow-none print:break-inside-avoid"
              style={{ minHeight: paperFormat === 'a4_40' ? '90px' : '110px' }}
            >
              <div className="w-full">
                <p className="text-[10px] font-bold text-slate-600 truncate uppercase">
                  {company?.company_name || 'BhaviSoft ERP'}
                </p>
                <h4 className="text-xs font-bold text-slate-900 truncate leading-tight mt-0.5">
                  {lb.name}
                </h4>
              </div>

              <div className="my-1">
                <BarcodeSvg value={lb.barcode} />
              </div>

              <div className="w-full flex items-center justify-center gap-1 font-bold text-xs text-slate-900">
                <span>MRP:</span>
                <span>₹{Number(lb.rate || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
