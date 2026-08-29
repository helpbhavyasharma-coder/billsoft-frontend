import QRCode from 'qrcode';

/**
 * Vector invoice PDF generation (pdfmake).
 *
 * Earlier this rasterised the backend HTML with html2canvas, which produced a
 * blurry image-PDF that pixelated on zoom. We now rebuild the exact same
 * invoice layout as a real vector PDF: crisp at any zoom, selectable text,
 * small file size. Works offline (QR generated locally) so it behaves the same
 * on the website and inside the Capacitor Android app, and the resulting PDF
 * File can be shared to WhatsApp via the Web Share API.
 */

// ---- helpers -------------------------------------------------------------

const n2 = (x) => parseFloat(x || 0).toFixed(2);

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);
  let words = '';
  if (Math.floor(num / 10000000) > 0) { words += numberToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
  if (Math.floor(num / 100000) > 0) { words += numberToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
  if (Math.floor(num / 1000) > 0) { words += numberToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
  if (Math.floor(num / 100) > 0) { words += numberToWords(Math.floor(num / 100)) + ' Hundred '; num %= 100; }
  if (num > 0) {
    if (num < 20) words += ones[num];
    else words += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }
  return words.trim();
};

const amountInWords = (amount) => {
  const a = parseFloat(amount || 0);
  const rupees = Math.floor(a);
  const paise = Math.round((a - rupees) * 100);
  let result = numberToWords(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + numberToWords(paise) + ' Paise';
  return result + ' Only';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(typeof dateStr === 'string' ? dateStr.substring(0, 10) + 'T00:00:00' : dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}/${months[d.getMonth()]}/${d.getFullYear()}`;
};

/** Build the download filename: "<invoiceNo> <party> <amount>.pdf". */
export function buildInvoiceFileName(inv) {
  const cleanInvoiceNo = String(inv.invoice_no || 'invoice').replace(/\//g, ' ');
  const cleanPartyName = String(inv.party_name || '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const cleanAmount = parseFloat(inv.grand_total || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${cleanInvoiceNo} ${cleanPartyName} ${cleanAmount}.pdf`.replace(/\s+/g, ' ').trim();
}

export function triggerFileDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}

/** Fetch an image URL and return a data URL (or null on failure). */
async function imageToDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// pdfmake is heavy; load it (and its fonts) only when a PDF is actually built.
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

// ---- document definition -------------------------------------------------

const C = {
  ink: '#000',
  red: '#c00',
  grey: '#444',
  thHead: '#e8e8e8',
  totalFill: '#d0d0d0',
  grandFill: '#f0f0f0',
};

const noPad = { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 };

function headerSection(company, logoDataUrl) {
  const addressParts = [
    company.address ? company.address + ',' : '',
    company.city || '',
    company.pincode ? '- ' + company.pincode : '',
    company.state || '',
  ].filter(Boolean).join(' ');

  const logo = logoDataUrl
    ? { image: logoDataUrl, width: 48, height: 48, fit: [48, 48] }
    : { text: 'LOGO', fontSize: 6, color: '#999', alignment: 'center', margin: [0, 18, 0, 0] };

  return {
    margin: [8, 5, 8, 5],
    columns: [
      { width: 56, stack: [logo] },
      {
        width: '*',
        stack: [
          { text: company.company_name || '', fontSize: 16, bold: true, color: C.red, decoration: 'underline', alignment: 'center' },
          { text: addressParts, fontSize: 7, color: C.grey, alignment: 'center', margin: [0, 2, 0, 0] },
        ],
      },
      { width: 56, text: '' },
    ],
  };
}

function metaSection(company) {
  return {
    table: {
      widths: ['*', '*', '*'],
      body: [[
        { text: [{ text: 'GST No. : ', bold: true }, company.gst_no || 'N/A'], fontSize: 7 },
        { text: company.fssai_no ? [{ text: 'FSSAI No. : ', bold: true }, company.fssai_no] : '', fontSize: 7 },
        { text: [{ text: 'CONTACT : ', bold: true }, company.mobile || ''], fontSize: 7, alignment: 'right' },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0 : 0.5),
      vLineColor: () => C.ink,
      paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 3, paddingBottom: () => 3,
    },
  };
}

function partySection(invoice) {
  const left = (label, value) => ({
    columns: [
      { width: 48, text: label, bold: true, fontSize: 7 },
      { width: '*', text: value || '', fontSize: 7 },
    ],
    margin: [0, 0, 0, 1.5],
  });
  const right = (label, value) => ({
    columns: [
      { width: 52, text: label, bold: true, fontSize: 7 },
      { width: '*', text: value, fontSize: 7 },
    ],
    margin: [0, 0, 0, 1.5],
  });

  const rightRows = [
    right('Invoice No.', { text: invoice.invoice_no || '', bold: true }),
    right('Date', { text: formatDate(invoice.invoice_date), bold: true }),
  ];
  if (invoice.due_date) rightRows.push(right('Due Date', formatDate(invoice.due_date)));

  return {
    table: {
      widths: ['62%', '38%'],
      body: [[
        {
          stack: [
            left('Party', invoice.party_name),
            left('Address', `${invoice.party_address || ''} ${invoice.party_city || ''}`.trim()),
            left('Mobile', invoice.party_mobile),
            left('GST No.', invoice.party_gst || 'NA'),
          ],
          margin: [8, 5, 8, 5],
        },
        { stack: rightRows, margin: [8, 5, 8, 5] },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i, node) => (i === 1 ? 1 : 0),
      vLineColor: () => C.ink,
      ...noPad,
    },
  };
}

function itemsSection(invoice, items) {
  const headRow = ['Sr.', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Total Sale', 'Dis.', 'Taxable Amt', 'GST%', 'CGST', 'SGST', 'IGST']
    .map((t) => ({ text: t, bold: true, fontSize: 6, alignment: 'center', fillColor: C.thHead }));

  const dataRows = items.map((it, i) => ([
    { text: String(i + 1), alignment: 'center' },
    { text: it.description || '' },
    { text: it.hsn_code || '', alignment: 'center' },
    { text: n2(it.qty), alignment: 'center' },
    { text: it.unit || '', alignment: 'center' },
    { text: n2(it.rate), alignment: 'right' },
    { text: n2(it.total_sale), alignment: 'right' },
    { text: n2(it.discount), alignment: 'right' },
    { text: n2(it.taxable_amount), alignment: 'right' },
    { text: n2(it.gst_rate) + '%', alignment: 'center' },
    { text: n2(it.cgst), alignment: 'right' },
    { text: n2(it.sgst), alignment: 'right' },
    { text: n2(it.igst), alignment: 'right' },
  ].map((c) => ({ ...c, fontSize: 6.4 }))));

  // Pad to a minimum of 10 rows so the table keeps its shape.
  const emptyCount = Math.max(0, 10 - items.length);
  for (let e = 0; e < emptyCount; e++) {
    dataRows.push(Array(13).fill({ text: ' ', fontSize: 6.4, margin: [0, 3, 0, 3] }));
  }

  const totalRow = [
    { text: 'TOTAL', colSpan: 6, alignment: 'center', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    {}, {}, {}, {}, {},
    { text: n2(invoice.subtotal), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    { text: n2(invoice.total_discount), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    { text: n2(invoice.taxable_amount), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    { text: '', fillColor: C.totalFill },
    { text: n2(invoice.total_cgst), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    { text: n2(invoice.total_sgst), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
    { text: n2(invoice.total_igst), alignment: 'right', bold: true, fillColor: C.totalFill, fontSize: 6.75 },
  ];

  return {
    table: {
      headerRows: 1,
      widths: [19, '*', 30, 30, 22, 34, 41, 28, 46, 30, 34, 34, 34],
      body: [headRow, ...dataRows, totalRow],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#888',
      vLineColor: () => '#888',
      paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 2, paddingBottom: () => 2,
    },
  };
}

function amountWordsSection(invoice) {
  return {
    margin: [8, 3, 8, 3],
    text: [{ text: 'Amount in Words: ', bold: true }, amountInWords(invoice.grand_total)],
    fontSize: 7,
  };
}

function footerSection(company, invoice, qrDataUrl) {
  const bankStack = [{ text: 'BANK DETAILS', bold: true, decoration: 'underline', fontSize: 7, margin: [0, 0, 0, 3] }];
  if (company.bank_name) bankStack.push({ text: company.bank_name, bold: true, fontSize: 7 });
  if (company.bank_account_no) bankStack.push({ text: 'A/C NO. - ' + company.bank_account_no, fontSize: 7 });
  if (company.bank_ifsc) bankStack.push({ text: 'IFSC - ' + company.bank_ifsc, fontSize: 7 });
  if (company.bank_branch) bankStack.push({ text: 'BRANCH - ' + company.bank_branch, fontSize: 7 });

  const qrStack = [{ text: 'SCAN & PAY', bold: true, fontSize: 5.5, alignment: 'center', margin: [0, 0, 0, 3] }];
  if (qrDataUrl) qrStack.push({ image: qrDataUrl, width: 54, height: 54, alignment: 'center' });
  else if (company.upi_id) qrStack.push({ text: 'UPI:\n' + company.upi_id, fontSize: 5.5, color: '#555', alignment: 'center' });
  else qrStack.push({ text: 'No UPI', fontSize: 5.5, color: '#aaa', alignment: 'center' });
  if (company.upi_id) qrStack.push({ text: company.upi_id, fontSize: 5.5, color: '#555', alignment: 'center', margin: [0, 2, 0, 0] });

  const sumRow = (label, value, opts = {}) => ([
    { text: label, fontSize: opts.grand ? 7.9 : 7, bold: !!opts.grand, fillColor: opts.grand ? C.grandFill : undefined, border: [false, !!opts.grand, false, false] },
    { text: value, fontSize: opts.grand ? 7.9 : 7, bold: opts.bold || opts.grand, alignment: 'right', fillColor: opts.grand ? C.grandFill : undefined, border: [false, !!opts.grand, false, false] },
  ]);

  const summary = {
    table: {
      widths: ['*', 'auto'],
      body: [
        sumRow('Total Invoice Value', n2(invoice.subtotal), { bold: true }),
        sumRow('Total Discount', n2(invoice.total_discount)),
        sumRow('Taxable Value', n2(invoice.taxable_amount)),
        sumRow('Total CGST', n2(invoice.total_cgst)),
        sumRow('Total SGST', n2(invoice.total_sgst)),
        sumRow('Total IGST', n2(invoice.total_igst)),
        sumRow('Round Off', n2(invoice.round_off)),
        sumRow('GRAND TOTAL', '₹ ' + n2(invoice.grand_total), { grand: true }),
      ],
    },
    layout: {
      hLineWidth: (i, node) => (i === node.table.body.length - 1 ? 1 : 0),
      vLineWidth: () => 0,
      hLineColor: () => C.ink,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 1.5, paddingBottom: () => 1.5,
    },
  };

  return {
    table: {
      widths: ['38%', 62, '*'],
      body: [[
        { stack: bankStack, margin: [8, 5, 8, 5] },
        { stack: qrStack, margin: [4, 4, 4, 4] },
        { stack: [summary], margin: [8, 3, 8, 3] },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0 : 1),
      vLineColor: () => C.ink,
      ...noPad,
    },
  };
}

function termsSignSection(company, invoice) {
  const termsRaw = (invoice.terms || company.terms || '');
  const terms = String(termsRaw).split(/\r\n|\r|\n/).map((t) => t.trim()).filter(Boolean);
  const termsStack = [{ text: 'Terms', bold: true, decoration: 'underline', fontSize: 6.4, margin: [0, 0, 0, 3] }];
  terms.forEach((t, i) => termsStack.push({ text: `${i + 1}. ${t.replace(/^\d+\.\s*/, '')}`, fontSize: 6.4, margin: [0, 0, 0, 1] }));

  return {
    table: {
      widths: ['66%', '*'],
      body: [[
        { stack: termsStack, margin: [8, 5, 8, 5] },
        {
          stack: [
            { text: `For ${company.company_name || ''}`, bold: true, fontSize: 7, alignment: 'right' },
            { text: '\n\n\n', fontSize: 7 },
            { text: 'Authorized Signatory', fontSize: 7, alignment: 'right' },
          ],
          margin: [8, 5, 8, 5],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i) => (i === 1 ? 1 : 0),
      vLineColor: () => C.ink,
      ...noPad,
    },
  };
}

function buildDocDefinition(company, invoice, items, logoDataUrl, qrDataUrl) {
  const sections = [
    headerSection(company, logoDataUrl),
    metaSection(company),
    { text: 'GST INVOICE', bold: true, decoration: 'underline', alignment: 'center', fontSize: 9, characterSpacing: 1, margin: [0, 3, 0, 3] },
    partySection(invoice),
    itemsSection(invoice, items),
    amountWordsSection(invoice),
    footerSection(company, invoice, qrDataUrl),
    termsSignSection(company, invoice),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [28, 24, 28, 24],
    defaultStyle: { fontSize: 8, color: C.ink },
    content: [
      {
        // Outer box: 1.5pt border all around, 1pt dividers between sections.
        table: { widths: ['*'], body: sections.map((s) => [s]) },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1.5 : 1),
          vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 1.5 : 0),
          hLineColor: () => C.ink,
          vLineColor: () => C.ink,
          ...noPad,
        },
      },
    ],
  };
}

// ---- public API ----------------------------------------------------------

/** Generate the invoice PDF as a Blob from full invoice data. */
export async function generateInvoicePdfBlob({ company, invoice, items }) {
  const cmp = company || {};
  const its = items || [];

  const [logoDataUrl, qrDataUrl] = await Promise.all([
    cmp.logo_url ? imageToDataUrl(cmp.logo_url) : Promise.resolve(null),
    cmp.upi_id
      ? QRCode.toDataURL(
          `upi://pay?pa=${cmp.upi_id}&pn=${encodeURIComponent(cmp.company_name || '')}&am=${invoice.grand_total}&cu=INR`,
          { width: 160, margin: 0 }
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const pdfMake = await getPdfMake();
  const docDef = buildDocDefinition(cmp, invoice, its, logoDataUrl, qrDataUrl);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDef).getBlob((blob) => resolve(blob));
    } catch (err) {
      reject(err);
    }
  });
}

/** Generate the invoice PDF and trigger a browser download. */
export async function downloadInvoicePdf({ company, invoice, items }) {
  const blob = await generateInvoicePdfBlob({ company, invoice, items });
  triggerFileDownload(blob, buildInvoiceFileName(invoice));
}

/**
 * Share the invoice PDF via the Web Share API (WhatsApp etc.). Returns true if
 * the PDF file was shared; false when file sharing is unsupported (e.g. most
 * desktop browsers) so the caller can fall back to a text-only wa.me link.
 */
export async function shareInvoicePdf({ company, invoice, items }, message) {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) {
    return false;
  }
  const blob = await generateInvoicePdfBlob({ company, invoice, items });
  const file = new File([blob], buildInvoiceFileName(invoice), { type: 'application/pdf' });
  if (!navigator.canShare({ files: [file] })) {
    return false;
  }
  try {
    await navigator.share({
      files: [file],
      title: `Invoice ${invoice.invoice_no || ''}`.trim(),
      text: message,
    });
    return true;
  } catch (err) {
    if (err && err.name === 'AbortError') return true; // user cancelled
    return false;
  }
}
