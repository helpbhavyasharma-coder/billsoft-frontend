import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AlertCircle, Phone, FileText, FileSpreadsheet, Download } from 'lucide-react';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

let pdfMakePromise = null;
async function getPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const pdfMakeMod = await import('pdfmake/build/pdfmake');
      const pdfFontsMod = await import('pdfmake/build/vfs_fonts');
      const pdfMake = pdfMakeMod.default || pdfMakeMod;
      const vfs = pdfFontsMod.default || pdfFontsMod;
      pdfMake.vfs = vfs.vfs || vfs;
      return pdfMake;
    })();
  }
  return pdfMakePromise;
}

export default function Outstanding() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchOutstanding(); }, []);

  const fetchOutstanding = async () => {
    try {
      const { data: res } = await api.get('/payments/outstanding');
      if (res.success) {
        setData(res.outstanding);
        setTotal(res.outstanding.reduce((sum, r) => sum + parseFloat(r.outstanding || 0), 0));
      }
    } catch { }
    finally { setLoading(false); }
  };

  const whatsappReminder = (party) => {
    const msg = `Dear ${party.party_name},\n\nThis is a gentle reminder that you have an outstanding amount of *₹${fmt(party.outstanding)}* pending.\n\nKindly clear the dues at your earliest convenience.\n\nThank you!`;
    window.open(`https://wa.me/${party.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const downloadCsv = () => {
    const header = ['#', 'Party Name', 'Mobile', 'Total Bills', 'Total Amount', 'Paid', 'Outstanding'];
    const rows = data.map((row, idx) => [
      idx + 1,
      row.party_name,
      row.mobile || '',
      row.total_invoices,
      row.total_amount,
      row.total_paid,
      row.outstanding,
    ]);
    const csv = [header, ...rows].map((cols) => cols.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const pdfMake = await getPdfMake();
    const body = [
      [
        { text: '#', bold: true },
        { text: 'Party Name', bold: true },
        { text: 'Mobile', bold: true },
        { text: 'Bills', bold: true, alignment: 'right' },
        { text: 'Total', bold: true, alignment: 'right' },
        { text: 'Paid', bold: true, alignment: 'right' },
        { text: 'Outstanding', bold: true, alignment: 'right' },
      ],
      ...data.map((row, idx) => [
        String(idx + 1),
        row.party_name || '',
        row.mobile || '-',
        { text: String(row.total_invoices || 0), alignment: 'right' },
        { text: 'Rs.' + fmt(row.total_amount), alignment: 'right' },
        { text: 'Rs.' + fmt(row.total_paid), alignment: 'right' },
        { text: 'Rs.' + fmt(row.outstanding), alignment: 'right', bold: true },
      ]),
      [
        { text: 'TOTAL', colSpan: 4, bold: true }, {}, {}, {},
        { text: 'Rs.' + fmt(data.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)), alignment: 'right', bold: true },
        { text: 'Rs.' + fmt(data.reduce((s, r) => s + parseFloat(r.total_paid || 0), 0)), alignment: 'right', bold: true },
        { text: 'Rs.' + fmt(total), alignment: 'right', bold: true, color: '#c00' },
      ],
    ];
    pdfMake.createPdf({
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [28, 32, 28, 32],
      content: [
        { text: 'Outstanding Report', style: 'title' },
        { text: `Generated: ${new Date().toLocaleDateString('en-IN')}    Total Outstanding: Rs.${fmt(total)}`, margin: [0, 2, 0, 12] },
        { table: { headerRows: 1, widths: [24, '*', 80, 45, 85, 85, 95], body }, layout: 'lightHorizontalLines' },
      ],
      styles: { title: { fontSize: 16, bold: true } },
      defaultStyle: { fontSize: 9 },
    }).download(`outstanding-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Outstanding Report</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {!loading && data.length > 0 && (
            <>
              <button onClick={downloadCsv} className="btn-secondary flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </button>
              <button onClick={downloadPdf} className="btn-primary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> PDF
              </button>
            </>
          )}
          <div className="px-4 py-2 text-sm rounded-xl"
            style={{ backgroundColor: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
            <span className="text-red-500 font-medium">Total Outstanding: </span>
            <span className="text-red-500 font-bold text-base">₹{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="print-area card p-0 overflow-hidden">
        {!loading && data.length > 0 && (
          <div className="hidden print:block p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Outstanding Report</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Total Outstanding: ₹{fmt(total)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Generated on {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium" style={{ color: 'var(--text-2)' }}>No outstanding dues!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>All invoices are paid.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header text-left">#</th>
                    <th className="table-header text-left">Party Name</th>
                    <th className="table-header text-left">Mobile</th>
                    <th className="table-header text-right">Total Bills</th>
                    <th className="table-header text-right">Total Amount</th>
                    <th className="table-header text-right">Paid</th>
                    <th className="table-header text-right">Outstanding</th>
                    <th className="table-header text-center no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={row.party_id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="table-cell" style={{ color: 'var(--text-3)' }}>{idx + 1}</td>
                      <td className="table-cell font-medium" style={{ color: 'var(--text)' }}>{row.party_name}</td>
                      <td className="table-cell" style={{ color: 'var(--text-3)' }}>{row.mobile || '-'}</td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-2)' }}>{row.total_invoices}</td>
                      <td className="table-cell text-right" style={{ color: 'var(--text-2)' }}>₹{fmt(row.total_amount)}</td>
                      <td className="table-cell text-right text-green-500 font-medium">₹{fmt(row.total_paid)}</td>
                      <td className="table-cell text-right font-bold text-red-500">₹{fmt(row.outstanding)}</td>
                      <td className="table-cell text-center no-print">
                        <div className="flex items-center justify-center gap-3">
                          <Link to={`/parties/${row.party_id}/ledger`}
                            className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Ledger
                          </Link>
                          {row.mobile && (
                            <button onClick={() => whatsappReminder(row)}
                              className="text-xs text-green-500 hover:text-green-400 font-medium flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> Remind
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', backgroundColor: 'var(--bg-muted)' }}>
                    <td colSpan={4} className="table-cell font-bold" style={{ color: 'var(--text)' }}>TOTAL</td>
                    <td className="table-cell text-right font-bold" style={{ color: 'var(--text)' }}>
                      ₹{fmt(data.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0))}
                    </td>
                    <td className="table-cell text-right font-bold text-green-500">
                      ₹{fmt(data.reduce((s, r) => s + parseFloat(r.total_paid || 0), 0))}
                    </td>
                    <td className="table-cell text-right font-bold text-red-500 text-base">
                      ₹{fmt(total)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3 space-y-2">
              {data.map((row, idx) => (
                <div key={row.party_id} className="mobile-card">
                  {/* Party name + outstanding */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-sm" style={{color:'var(--text)'}}>{row.party_name}</p>
                      {row.mobile && (
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{color:'var(--text-3)'}}>
                          <Phone className="w-3 h-3" />{row.mobile}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs" style={{color:'var(--text-3)'}}>Outstanding</p>
                      <p className="font-bold text-red-500 text-base">₹{fmt(row.outstanding)}</p>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="stat-box">
                      <p className="text-xs">Bills</p>
                      <span className="text-sm">{row.total_invoices}</span>
                    </div>
                    <div className="stat-box" style={{backgroundColor:'rgba(16,185,129,0.08)', borderColor:'rgba(16,185,129,0.2)'}}>
                      <p className="text-xs">Paid</p>
                      <span className="text-sm text-green-600">₹{fmt(row.total_paid)}</span>
                    </div>
                    <div className="stat-box" style={{backgroundColor:'rgba(220,38,38,0.08)', borderColor:'rgba(220,38,38,0.2)'}}>
                      <p className="text-xs">Total</p>
                      <span className="text-sm" style={{color:'var(--text)'}}>₹{fmt(row.total_amount)}</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Link to={`/parties/${row.party_id}/ledger`}
                      className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                      style={{backgroundColor:'rgba(59,130,246,0.1)', color:'#2563eb'}}>
                      View Ledger
                    </Link>
                    {row.mobile && (
                      <button onClick={() => whatsappReminder(row)}
                        className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg"
                        style={{backgroundColor:'rgba(34,197,94,0.1)', color:'#16a34a'}}>
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Mobile Total */}
              <div className="rounded-xl p-3 flex items-center justify-between"
                style={{backgroundColor:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.3)'}}>
                <span className="font-bold text-sm" style={{color:'var(--text)'}}>Total Outstanding</span>
                <span className="font-bold text-red-500 text-lg">₹{fmt(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
