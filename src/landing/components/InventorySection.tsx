import React, { useState } from 'react';
import { 
  Boxes, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  AlertTriangle, 
  CheckCircle, 
  ShoppingCart, 
  Plus, 
  Search,
  Filter,
  Layers
} from 'lucide-react';
import { InventoryItem } from '../types';

export const InventorySection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  const stockData: InventoryItem[] = [
    {
      id: 'SKU-101',
      name: 'Aashirvaad Shudh Chakki Atta (10kg)',
      category: 'Flour & Grains',
      stockIn: 120,
      stockOut: 98,
      remainingStock: 22,
      minThreshold: 25,
      unit: 'Bags',
      purchaseRate: 410,
      saleRate: 460,
      status: 'low',
    },
    {
      id: 'SKU-102',
      name: 'Tata Tea Premium Desh Ki Chai (500g)',
      category: 'Beverages',
      stockIn: 80,
      stockOut: 45,
      remainingStock: 35,
      minThreshold: 15,
      unit: 'Pcs',
      purchaseRate: 215,
      saleRate: 260,
      status: 'optimal',
    },
    {
      id: 'SKU-103',
      name: 'Dettol Original Liquid Handwash (750ml Refill)',
      category: 'Personal Care',
      stockIn: 50,
      stockOut: 44,
      remainingStock: 6,
      minThreshold: 10,
      unit: 'Pcs',
      purchaseRate: 110,
      saleRate: 135,
      status: 'low',
    },
    {
      id: 'SKU-104',
      name: 'Tata Salt Vaccum Evaporated Iodized (1kg)',
      category: 'Spices & Essentials',
      stockIn: 300,
      stockOut: 180,
      remainingStock: 120,
      minThreshold: 40,
      unit: 'Pkt',
      purchaseRate: 22,
      saleRate: 28,
      status: 'optimal',
    }
  ];

  const filteredItems = filter === 'low' 
    ? stockData.filter(item => item.status === 'low')
    : stockData;

  return (
    <section id="inventory" className="py-8 sm:py-10 md:py-12 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Inventory &amp; Purchases
            </span>

            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Know Exact Stock In, Stock Out &amp; When to Reorder
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Never let popular items run dry or capital stay tied in dead stock. BillSoft automatically deducts stock upon every sales invoice and increments upon logging supplier purchase bills.
            </p>

            {/* Benefit Checkpoints */}
            <div className="space-y-2 pt-1 text-xs text-slate-700 dark:text-slate-200">
              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    Low Stock Alerts:
                  </strong>{' '}
                  Color-coded indicators highlight items nearing reorder limits before sales are lost.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    Supplier Bills &amp; ITC:
                  </strong>{' '}
                  Log supplier invoices with purchase prices and GST rates for clean ITC records.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 mt-0.5 shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    Multi-Unit Support:
                  </strong>{' '}
                  Maintain stock in Bags, Boxes, Kgs, Litres, Bundles, or Pieces seamlessly.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Stock Preview Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden text-xs">
              {/* Header Bar */}
              <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Live Stock Register
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-mono">
                    4 Items
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      filter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('low')}
                    className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      filter === 'low'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Low Stock Only</span>
                  </button>
                </div>
              </div>

              {/* Stock Summary Mini KPIs */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-center py-1.5 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase">Stock In</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">550 Units</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase">Sold (Out)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">367 Units</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase">Reorder Needed</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-[11px]">2 Products</span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                {filteredItems.map((item) => (
                  <div key={item.id} className="p-2.5 sm:p-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                          {item.name}
                        </span>
                        {item.status === 'low' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                            In Stock
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-[10px]">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span className="font-mono">Buy: ₹{item.purchaseRate}</span>
                        <span>•</span>
                        <span className="font-mono">Sell: ₹{item.saleRate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] text-slate-400 uppercase block">Remaining</span>
                        <span className={`text-xs font-bold font-mono ${
                          item.status === 'low' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.remainingStock} {item.unit}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[9px] text-slate-400 uppercase block">Min Alert</span>
                        <span className="text-[11px] font-medium font-mono text-slate-600 dark:text-slate-400">
                          {item.minThreshold} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Purchase Bill Notification */}
              <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  Supplier Purchase Bills sync automatically with Available Stock
                </span>
                <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline-block">
                  Live Stock Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
