import React, { useState } from 'react';
import { 
  BookOpen, 
  Share2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users,
  Search,
  MessageSquare
} from 'lucide-react';
import { PartyLedgerEntry } from '../types';

interface LedgerSectionProps {
  onWhatsAppReminderClick: (partyName: string, amount: number) => void;
}

export const LedgerSection: React.FC<LedgerSectionProps> = ({ onWhatsAppReminderClick }) => {
  const [selectedParty, setSelectedParty] = useState<string>('P1');

  const parties: PartyLedgerEntry[] = [
    {
      id: 'P1',
      partyName: 'Gupta General Store & Provision',
      contact: '+91 98765 43210',
      gstin: '07AAACG1234F1Z8',
      outstandingBalance: 12450,
      lastBillDate: '3 days ago',
      paymentStatus: 'unpaid',
      type: 'customer'
    },
    {
      id: 'P2',
      partyName: 'Jai Kishan Kirana Merchant',
      contact: '+91 98111 22334',
      gstin: '07BBBPK9876C1Z2',
      outstandingBalance: 5200,
      lastBillDate: 'Yesterday',
      paymentStatus: 'partial',
      type: 'customer'
    },
    {
      id: 'P3',
      partyName: 'National FMCG Distributors',
      contact: '+91 99887 76655',
      gstin: '07AABCN5544K1ZR',
      outstandingBalance: 0,
      lastBillDate: 'Today',
      paymentStatus: 'paid',
      type: 'supplier'
    },
    {
      id: 'P4',
      partyName: 'Rameshwar Lal & Sons (Wholesale)',
      contact: '+91 97654 32109',
      gstin: '07AABFR1122D1ZP',
      outstandingBalance: 18900,
      lastBillDate: '8 days ago',
      paymentStatus: 'unpaid',
      type: 'customer'
    }
  ];

  // Sample ledger entries for the active party
  const sampleTransactions = [
    { date: '08 Sep 2026', desc: 'Tax Invoice #INV-0792', type: 'debit', amount: 8450, balance: 8450 },
    { date: '10 Sep 2026', desc: 'Payment received via UPI (GPay)', type: 'credit', amount: 4000, balance: 4450 },
    { date: '12 Sep 2026', desc: 'Tax Invoice #INV-0831', type: 'debit', amount: 8000, balance: 12450 },
  ];

  const currentParty = parties.find(p => p.id === selectedParty) || parties[0];

  return (
    <section id="ledger" className="py-8 sm:py-10 md:py-12 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Digital Khata &amp; Cashflow
          </span>
          <h2 className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Stop Losing Money to Forgotten Bakaya &amp; Udhaar
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Replace clumsy paper diaries with an automated party ledger. Every credit sale updates customer balance instantly, with one-tap WhatsApp payment reminders.
          </p>
        </div>

        {/* Ledger Showcase Split Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-xs">
          {/* Left Column: Party List */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Party Accounts
                </span>
              </div>
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 font-mono">
                Total: ₹36,550
              </span>
            </div>

            <div className="space-y-1.5 mt-1 flex-1">
              {parties.map((party) => (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => setSelectedParty(party.id)}
                  className={`w-full text-left p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selectedParty === party.id
                      ? 'bg-emerald-50/80 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white leading-tight">
                        {party.partyName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {party.contact}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-bold font-mono text-xs ${
                        party.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {party.outstandingBalance > 0 ? `₹${party.outstandingBalance.toLocaleString('en-IN')}` : '₹0'}
                      </div>
                      <span className={`inline-block text-[9px] uppercase font-semibold px-1 py-0.2 rounded mt-0.5 ${
                        party.paymentStatus === 'unpaid' 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                          : party.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {party.paymentStatus}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Customer &amp; Supplier</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">GSTIN Verified</span>
            </div>
          </div>

          {/* Right Column: Selected Party Detailed Ledger Statement */}
          <div className="lg:col-span-7 p-3 sm:p-4 flex flex-col justify-between bg-white dark:bg-slate-900">
            <div>
              {/* Selected Party Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                    {currentParty.partyName}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    GSTIN: {currentParty.gstin || 'Unregistered Consumer'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {currentParty.outstandingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => onWhatsAppReminderClick(currentParty.partyName, currentParty.outstandingBalance)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Reminder</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Running Balance Banner */}
              <div className="my-2.5 p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase">
                    Outstanding Bakaya
                  </span>
                  <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                    ₹{currentParty.outstandingBalance.toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase">
                    Last Activity
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                    {currentParty.lastBillDate}
                  </span>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[360px]">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-semibold border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-1.5 px-2">Date &amp; Description</th>
                      <th className="py-1.5 px-2 text-right">Debit (Sale)</th>
                      <th className="py-1.5 px-2 text-right">Credit (Recd)</th>
                      <th className="py-1.5 px-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {sampleTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-2">
                          <div className="font-medium text-slate-900 dark:text-white text-xs">
                            {tx.desc}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            {tx.date}
                          </div>
                        </td>

                        <td className="py-2 px-2 text-right font-mono font-medium text-rose-600 dark:text-rose-400 text-xs">
                          {tx.type === 'debit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                        </td>

                        <td className="py-2 px-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                          {tx.type === 'credit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                        </td>

                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          ₹{tx.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Ledger reconciles with daily cash register
              </span>
              <span className="font-mono">PDF Statement</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
