import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Sparkles, Bot, Send, Check, AlertCircle, ThumbsUp, ThumbsDown,
  BookOpen, Plus, Trash2, HelpCircle, RefreshCw, X, ChevronRight,
  Package, Users, AlertTriangle, Layers, Save, CheckCircle2, Info,
  FileText, Calendar, ArrowRight, Lock, ShieldCheck, Eye, MapPin, Phone
} from 'lucide-react';
import { PageHeader, Panel, Button, Money, StatusBadge, LoadingState, EmptyState } from '../components/ui';
import { INDIAN_STATES } from '../data/states';
import { isValidGstinOrNA, normalizeGstin } from '../utils/gstin';


function normalizePackSize(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const dotM = s.match(/(?:^|\s|\b)\.(\d+)\s*(?:gm|g|grams|gram|kg)?/i);
  if (dotM) {
    const val = parseInt(dotM[1].padEnd(3, '0'), 10);
    return `${val} GM`;
  }
  const kgM = s.match(/(?:^|\s|\b)(\d+(?:\.\d+)?)\s*(?:kg|kilo|kG)\b/i);
  if (kgM) {
    const kg = parseFloat(kgM[1]);
    if (kg < 1.0) {
      return `${Math.round(kg * 1000)} GM`;
    }
    return `${kg === Math.floor(kg) ? Math.floor(kg) : kg} KG`;
  }
  const gmM = s.match(/(?:^|\s|\b)(\d+(?:\.\d+)?)\s*(?:gm|g|grams|gram)\b/i);
  if (gmM) {
    const gm = parseFloat(gmM[1]);
    if (gm >= 1000) {
      return `${Math.round(gm / 1000)} KG`;
    }
    return `${gm === Math.floor(gm) ? Math.floor(gm) : gm} GM`;
  }
  return null;
}

export default function AiTraining() {
  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'other'
  const [otherSubTab, setOtherSubTab] = useState('aliases'); // 'aliases' | 'history'
  const [rawMessage, setRawMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Reference catalog for manual corrections
  const [allParties, setAllParties] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Editable correction state
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [savePartyAlias, setSavePartyAlias] = useState(false);
  const [partyAliasText, setPartyAliasText] = useState('');
  const [editableItems, setEditableItems] = useState([]);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [saveAsTrainingExample, setSaveAsTrainingExample] = useState(true);
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Tab 2 & 3 Data
  const [aliases, setAliases] = useState({ product_aliases: [], party_aliases: [] });
  const [trainingExamples, setTrainingExamples] = useState([]);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);

  // Manual Alias Modal
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [aliasForm, setAliasForm] = useState({ type: 'product', targetId: '', alias: '', packSize: '', packMultiplier: '' });

  // Quick Create Customer Modal
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyForm, setPartyForm] = useState({
    name: '', address: '', city: '', state: '', mobile: '',
    email: '', gst_no: 'NA', party_type: 'customer', opening_balance: '',
  });
  const [savingParty, setSavingParty] = useState(false);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState(null);

  // Quick Create Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [targetProductItemIndex, setTargetProductItemIndex] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', unit: 'Pcs', default_rate: '', gst_rate: '5', hsn_code: '', category: '' });
  const [savingProduct, setSavingProduct] = useState(false);

  const navigate = useNavigate();
  const { company } = useAuth();

  // In-place Invoice Review Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    supply_type: 'intrastate',
    notes: '',
    terms: '',
    payment_mode: 'credit',
    idempotency_key: '',
  });

  useEffect(() => {
    fetchCatalog();
    fetchAliases();
    fetchExamples();
  }, []);

  // Draft persistence across session re-authentication or tab switches (Requirement 13)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('billsoft_ai_training_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.rawMessage && !rawMessage) {
          setRawMessage(draft.rawMessage);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      if (rawMessage && rawMessage.trim()) {
        sessionStorage.setItem('billsoft_ai_training_draft', JSON.stringify({
          rawMessage: rawMessage.trim(),
          updatedAt: Date.now(),
        }));
      } else {
        sessionStorage.removeItem('billsoft_ai_training_draft');
      }
    } catch (e) {}
  }, [rawMessage]);

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const [partyRes, prodRes] = await Promise.all([
        api.get('/parties'),
        api.get('/products'),
      ]);
      if (partyRes.data.success) setAllParties(partyRes.data.parties || []);
      if (prodRes.data.success) setAllProducts(prodRes.data.products || []);
    } catch (err) {
      console.error('Failed to load catalog reference data', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchAliases = async () => {
    setLoadingAliases(true);
    try {
      const { data } = await api.get('/ai/training/aliases');
      if (data.success) {
        setAliases({
          product_aliases: data.product_aliases || [],
          party_aliases: data.party_aliases || [],
        });
      }
    } catch (err) {
      console.error('Failed to load aliases', err);
    } finally {
      setLoadingAliases(false);
    }
  };

  const fetchExamples = async () => {
    setLoadingExamples(true);
    try {
      const { data } = await api.get('/ai/training/examples');
      if (data.success) setTrainingExamples(data.examples || []);
    } catch (err) {
      console.error('Failed to load examples', err);
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleAnalyze = async () => {
    if (!rawMessage.trim()) {
      toast.error('Please enter or paste an order message.');
      return;
    }
    setAnalyzing(true);
    setApiError(null);
    setExtraction(null);

    try {
      const { data } = await api.post('/ai/training/parse', { raw_message: rawMessage });
      if (data.success) {
        setExtraction(data.extraction);
        initEditableState(data.extraction);
        toast.success('Message parsed successfully!');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'AI parsing failed.';
      const errorCode = err.response?.data?.code || 'UNKNOWN_ERROR';
      setApiError({ code: errorCode, message: errorMsg, status: err.response?.status });
      toast.error(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const initEditableState = (ext) => {
    const pId = ext.party?.party_id ? String(ext.party.party_id) : '';
    setSelectedPartyId(pId);
    setPartyAliasText(ext.party?.raw_name || ext.party?.suggested_name || (ext.raw_message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)?.[1] || ''));
    // BUG 1 FIX: Never auto-enable alias learning for ambiguous/suggested matches!
    setSavePartyAlias(false);

    const packagingUnits = ['peti', 'carton', 'ctn', 'dabba', 'box', 'bag', 'katta', 'bori', 'dozen', 'darzan', 'darjan', 'darza', 'darzen', 'dz', 'doz', 'darzn', 'दर्जन', 'दर्जा', 'दर्ज़ा'];
    const items = (ext.line_items || []).map((it) => {
      const unitLower = (it.unit || '').toLowerCase();
      const rawLower = (it.raw_item || '').toLowerCase();
      const isExplicitPiece = /(?:^|\b|\s)(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces)(?:\b|\s|$|[,\.\n])/i.test(rawLower);
      const dozenMatch = rawLower.match(/(?:^|\b|\s)(\d+(?:\.\d+)?)\s*(?:darzan|darjan|darza|darzen|dozen|dz|doz|darzn|दर्जन|दर्जा|दर्ज़ा)s?(?:\b|\s|$|[,\.\n])/i);
      const isDozen = !isExplicitPiece && (
        /^(darzan|darjan|darza|darzen|dozen|dz|doz|darzn|दर्जन|दर्जा|दर्ज़ा)s?$/i.test(unitLower) ||
        dozenMatch !== null ||
        Boolean(it.is_dozen)
      );
      const isPkg = it.is_packaging_unit || packagingUnits.includes(unitLower) || isDozen;
      const isVerified = isDozen ? true : Boolean(it.packaging_verified);
      const stockPending = isDozen ? false : Boolean(it.stock_deduction_pending || (isPkg && !isVerified));
      let multVal = it.pack_multiplier !== null && it.pack_multiplier !== undefined && it.pack_multiplier !== ''
        ? it.pack_multiplier
        : (it.suggested_multiplier !== null && it.suggested_multiplier !== undefined ? it.suggested_multiplier : '');
      if (isDozen && (!multVal || multVal === '' || multVal === 1)) {
        multVal = 12;
      }

      let billingQty = it.billing_quantity !== undefined && it.billing_quantity !== null ? it.billing_quantity : it.quantity;
      if (isDozen) {
        if (dozenMatch) {
          billingQty = parseFloat(dozenMatch[1]);
        } else if (billingQty >= 12 && billingQty % 12 === 0) {
          billingQty = billingQty / 12;
        }
      }
      const billingUnit = isDozen ? 'Dozen' : (isExplicitPiece ? 'Pcs' : (it.billing_unit || it.unit || 'Pcs'));
      const isExplicitPerPiece = /(?:per\s*piece|per\s*pc|rs\s*pc|\/pc|@pc|pr\s*pc)/i.test(rawLower);
      const rateBasis = it.rate_basis || (isExplicitPerPiece ? 'per_piece' : 'per_pack');

      return {
        ...it,
        selected_product_id: it.product_id ? String(it.product_id) : '',
        description: it.description || it.product_name || it.raw_item || '',
        quantity: billingQty,
        billing_quantity: billingQty,
        unit: billingUnit,
        billing_unit: billingUnit,
        save_alias: false, // Default false to prevent unintended alias pollution
        alias_text: it.raw_item || it.product_name || '',
        is_packaging_unit: isPkg,
        is_dozen: isDozen,
        pack_multiplier: multVal,
        pieces_per_selling_unit: multVal,
        suggested_multiplier: it.suggested_multiplier !== null && it.suggested_multiplier !== undefined ? it.suggested_multiplier : (isDozen ? 12 : null),
        packaging_verified: isVerified,
        multiplier_unverified: !isVerified && isPkg,
        stock_deduction_pending: stockPending,
        rate_basis: rateBasis, // 'per_pack' | 'per_piece'
      };
    });
    setEditableItems(items);
    setCorrectionNotes('');
    setSaveAsTrainingExample(true);
  };

  const handleItemProductChange = (index, newProdId) => {
    const updated = [...editableItems];
    const item = { ...updated[index] };
    item.selected_product_id = newProdId;

    if (newProdId) {
      const prod = allProducts.find((p) => String(p.id) === String(newProdId));
      if (prod) {
        // Keep existing custom display name if operator edited it, else default to product name
        if (!item.description || item.description === 'Unknown Item') {
          item.description = prod.name;
        }
        item.unit = prod.unit || item.unit || 'Pcs';
        item.rate = item.rate || parseFloat(prod.default_rate || 0);
        item.gst_rate = prod.gst_rate !== null ? parseFloat(prod.gst_rate) : null;
        item.is_matched = true;
        item.hsn_code = prod.hsn_code || '';
        item.save_alias = true; // Suggest alias learning once manually mapped

        // Load packaging memory if configured for this product SKU
        if (prod.packaging_config) {
          const pc = prod.packaging_config;
          item.unit = pc.selling_unit || item.unit;
          item.rate_basis = pc.rate_basis || 'per_pack';
          if (pc.pieces_per_pack !== null && pc.pieces_per_pack !== undefined) {
            item.pack_multiplier = pc.pieces_per_pack;
          }
          item.packaging_verified = Boolean(pc.is_verified);
          item.multiplier_unverified = !item.packaging_verified;
          item.stock_deduction_pending = !item.packaging_verified;
          item.is_packaging_unit = true;
        }
      }
    } else {
      item.is_matched = false;
      item.gst_rate = null;
    }
    updated[index] = item;
    setEditableItems(updated);
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  const handleVerifyPackaging = async (index) => {
    const updated = [...editableItems];
    const item = { ...updated[index] };
    const mult = parseFloat(item.pack_multiplier);
    if (isNaN(mult) || mult <= 0) {
      toast.error(`Please enter valid pieces per ${item.unit || 'pack'}.`);
      return;
    }
    item.multiplier_unverified = false;
    item.packaging_verified = true;
    item.stock_deduction_pending = false;
    item.pack_multiplier = mult;
    updated[index] = item;
    setEditableItems(updated);

    if (item.selected_product_id) {
      try {
        await api.post(`/products/${item.selected_product_id}/packaging`, {
          selling_unit: item.unit || 'Bag',
          rate_basis: item.rate_basis || 'per_pack',
          pieces_per_pack: mult,
          is_verified: true,
        });
        toast.success(`Verified & remembered: 1 ${item.unit || 'Bag'} = ${mult} pieces for SKU.`);
        setAllProducts((prev) =>
          prev.map((p) =>
            String(p.id) === String(item.selected_product_id)
              ? {
                  ...p,
                  packaging_config: {
                    selling_unit: item.unit || 'Bag',
                    rate_basis: item.rate_basis || 'per_pack',
                    pieces_per_pack: mult,
                    is_verified: true,
                  },
                }
              : p
          )
        );
      } catch (err) {
        toast.error('Verified in form, but failed to save to product memory.');
      }
    } else {
      toast.success(`Verified conversion: 1 ${item.unit} = ${mult} pieces.`);
    }
  };

  const handleCreateQuickParty = async (e) => {
    e.preventDefault();
    if (!partyForm.name.trim()) {
      toast.error('Customer name is required.');
      return;
    }
    if (!isValidGstinOrNA(partyForm.gst_no)) {
      toast.error('Enter a valid GSTIN or NA.');
      return;
    }
    setSavingParty(true);
    try {
      const payload = {
        name: partyForm.name.trim(),
        address: (partyForm.address || '').trim(),
        city: (partyForm.city || '').trim(),
        state: partyForm.state || '',
        mobile: (partyForm.mobile || '').trim(),
        email: (partyForm.email || '').trim(),
        gst_no: normalizeGstin(partyForm.gst_no) || 'NA',
        party_type: partyForm.party_type || 'customer',
        opening_balance: partyForm.opening_balance ? parseFloat(partyForm.opening_balance) : '',
      };
      const res = await api.post('/parties', payload);
      if (res.data.success && res.data.party) {
        const newParty = res.data.party;
        toast.success(`Customer "${newParty.name}" created and selected!`);
        setAllParties((prev) => [...prev, newParty].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedPartyId(String(newParty.id));
        setSavePartyAlias(true);
        setPartyAliasText(extraction?.party?.raw_name || newParty.name);

        if (extraction && extraction.party) {
          setExtraction((prev) => ({
            ...prev,
            party: {
              ...prev.party,
              party_id: newParty.id,
              matched_name: newParty.name,
              is_ambiguous: false,
              requires_confirmation: false,
              match_type: 'exact_catalog',
            },
            global_warnings: (prev.global_warnings || []).filter((w) => !/party|customer/i.test(w)),
          }));
        }

        setShowPartyModal(false);
        setPartyForm({
          name: '', address: '', city: '', state: '', mobile: '',
          email: '', gst_no: 'NA', party_type: 'customer', opening_balance: '',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer.');
    } finally {
      setSavingParty(false);
    }
  };

  const handleCreateQuickProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    setSavingProduct(true);
    try {
      const rate = parseFloat(productForm.default_rate || 0);
      const gst = parseFloat(productForm.gst_rate || 5);
      const res = await api.post('/products', {
        name: productForm.name.trim(),
        unit: productForm.unit.trim() || 'Pcs',
        default_rate: isNaN(rate) ? 0 : rate,
        gst_rate: isNaN(gst) ? 5 : gst,
        hsn_code: productForm.hsn_code.trim(),
        category: productForm.category.trim(),
      });
      if (res.data.success && res.data.product) {
        const newProd = res.data.product;
        toast.success(`Product "${newProd.name}" created in catalog!`);
        setAllProducts((prev) => [...prev, newProd].sort((a, b) => a.name.localeCompare(b.name)));
        if (targetProductItemIndex !== null && editableItems[targetProductItemIndex]) {
          const updated = [...editableItems];
          const it = { ...updated[targetProductItemIndex] };
          it.selected_product_id = String(newProd.id);
          it.description = newProd.name;
          it.unit = newProd.unit || it.unit || 'Pcs';
          it.rate = it.rate || parseFloat(newProd.default_rate || 0);
          it.gst_rate = newProd.gst_rate !== null ? parseFloat(newProd.gst_rate) : null;
          it.hsn_code = newProd.hsn_code || '';
          it.is_matched = true;
          it.save_alias = true;
          updated[targetProductItemIndex] = it;
          setEditableItems(updated);
        }
        setShowProductModal(false);
        setTargetProductItemIndex(null);
        setProductForm({ name: '', unit: 'Pcs', default_rate: '', gst_rate: '5', hsn_code: '', category: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const computeTotalsPreview = () => {
    let grand = 0;
    let taxable = 0;
    let gst = 0;
    let complete = true;
    let withheldCount = 0;
    let stockPendingCount = 0;
    const blockingReasons = [];

    if (!selectedPartyId) {
      complete = false;
      const partyDisp = extraction?.party?.extracted_display || extraction?.party?.raw_name || 'Customer';
      if (extraction?.party?.is_ambiguous || extraction?.party?.match_type === 'suggestion') {
        blockingReasons.push(`Customer "${partyDisp}" is an unresolved match. Please confirm candidate or select customer above.`);
      } else {
        blockingReasons.push(`Customer "${partyDisp}" is unresolved. Select an existing customer or click '+ New Customer'.`);
      }
    }

    editableItems.forEach((it, idx) => {
      const itemName = it.description || it.raw_item || `Item #${idx + 1}`;
      if (!it.selected_product_id) {
        complete = false;
        withheldCount++;
        blockingReasons.push(`${itemName}: Product not mapped. Select an existing catalog SKU or click '+ New' to create.`);
      }

      // Check for product pack-size contradiction:
      const orderPack = normalizePackSize(it.pack_size) || normalizePackSize(it.raw_item);
      if (orderPack && it.selected_product_id) {
        const prod = allProducts.find((p) => String(p.id) === String(it.selected_product_id));
        if (prod) {
          const prodPack = normalizePackSize(prod.name);
          if (prodPack && prodPack.toLowerCase() !== orderPack.toLowerCase()) {
            complete = false;
            blockingReasons.push(
              `${itemName}: Pack-size contradiction: Order specified ${orderPack}, but selected catalog SKU '${prod.name}' is ${prodPack}. Please select matching ${orderPack} SKU.`
            );
          }
        }
      }

      const qty = parseFloat(it.quantity);
      const rate = parseFloat(it.rate);

      if (isNaN(qty) || qty <= 0) {
        complete = false;
        blockingReasons.push(`${itemName}: Missing or invalid quantity.`);
      }
      if (isNaN(rate) || rate <= 0) {
        complete = false;
        blockingReasons.push(`${itemName}: Missing or invalid rate.`);
      }

      // Check for dozen calculation contradiction:
      const rawText = it.raw_item || '';
      const combinedText = (rawText + ' ' + (rawMessage || '')).trim();
      const dozenMatch = rawText.match(/(?:^|\b|\s)(\d+(?:\.\d+)?)\s*(?:darzan|darjan|darza|darzen|dozen|dz|doz|darzn|दर्जन|दर्जा|दर्ज़ा)s?(?:\b|\s|$|[,\.\n])/i)
        || combinedText.match(/(?:^|\b|\s)(\d+(?:\.\d+)?)\s*(?:darzan|darjan|darza|darzen|dozen|dz|doz|darzn|दर्जन|दर्जा|दर्ज़ा)s?(?:\b|\s|$|[,\.\n])/i);
      const isExplicitPerPiece = /(?:per\s*piece|per\s*pc|rs\s*pc|\/pc|@pc|pr\s*pc)/i.test(combinedText);

      if (dozenMatch && !isNaN(qty) && qty > 0) {
        const expQty = parseFloat(dozenMatch[1]);
        const curUnit = (it.unit || '').trim();

        // 1. Non-canonical dozen unit check
        if (curUnit && curUnit.toLowerCase() !== 'dozen' && /^(darzan|darjan|darza|darzen|dozen|dz|doz|darzn|दर्जन|दर्जा|दर्ज़ा)s?$/i.test(curUnit)) {
          complete = false;
          blockingReasons.push(`${itemName}: Unit '${curUnit}' must be normalized to canonical 'Dozen'.`);
        }

        // 2. Billing quantity inflation check
        if (!isExplicitPerPiece && qty === expQty * 12 && qty > expQty) {
          complete = false;
          blockingReasons.push(`${itemName}: Quantity (${qty}) contradicts order text (${expQty} dozen). Billing quantity should be ${expQty} Dozen.`);
        }

        // 3. Rate basis check
        if (!isExplicitPerPiece && it.rate_basis === 'per_piece') {
          complete = false;
          blockingReasons.push(`${itemName}: Rate basis is set to per_piece, but order does not explicitly specify per-piece pricing. Change rate basis to 'per dozen' or verify.`);
        }
      }

      if (it.stock_deduction_pending || (it.is_packaging_unit && !it.packaging_verified)) {
        stockPendingCount++;
      }

      // Only per_piece rate basis with missing multiplier blocks the billing line total!
      const isPerPieceWithoutMultiplier = it.rate_basis === 'per_piece' && (!it.pack_multiplier || parseFloat(it.pack_multiplier) <= 0);

      if (isPerPieceWithoutMultiplier) {
        complete = false;
        withheldCount++;
        blockingReasons.push(`${itemName}: Rate is specified per piece, but pieces per ${it.unit || 'pack'} is unknown. Enter pieces and verify.`);
      } else if (it.selected_product_id && !isNaN(qty) && !isNaN(rate) && qty > 0 && rate > 0) {
        const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : 1;
        const lineTotal = (it.rate_basis === 'per_piece') ? (qty * mult * rate) : (qty * rate);

        if (dozenMatch && !isExplicitPerPiece && !isNaN(rate) && rate > 0) {
          const expQty = parseFloat(dozenMatch[1]);
          const expectedTotal = expQty * rate;
          const inflatedTotal = expQty * 12 * rate;
          if (Math.abs(lineTotal - inflatedTotal) < 0.05 && Math.abs(lineTotal - expectedTotal) > 0.05) {
            complete = false;
            blockingReasons.push(`${itemName}: Line total (₹${lineTotal.toFixed(2)}) contradicts per-dozen pricing. Expected ₹${expectedTotal.toFixed(2)}.`);
          }
        }

        grand += lineTotal;
        if (it.gst_rate !== null && !isNaN(it.gst_rate)) {
          const lineTaxable = lineTotal / (1 + it.gst_rate / 100);
          taxable += lineTaxable;
          gst += (lineTotal - lineTaxable);
        } else {
          complete = false;
        }
      } else {
        complete = false;
      }
    });

    const hasBlockingIssues = blockingReasons.length > 0 || !complete;

    return {
      grand: complete ? grand.toFixed(2) : null,
      verifiedSubtotal: grand.toFixed(2),
      taxable: complete ? taxable.toFixed(2) : null,
      gst: complete ? gst.toFixed(2) : null,
      complete,
      hasBlockingIssues,
      withheldCount,
      stockPendingCount,
      blockingReasons: Array.from(new Set(blockingReasons)),
    };
  };

  const handleSaveFeedback = async (type = 'accurate') => {
    if (!extraction) return;
    setSavingFeedback(true);

    try {
      const selectedParty = allParties.find((p) => String(p.id) === String(selectedPartyId));
      const correctedPayload = {
        intent: extraction.intent,
        confidence: type === 'accurate' ? extraction.confidence : 1.0,
        party: {
          party_id: selectedParty ? selectedParty.id : null,
          matched_name: selectedParty ? selectedParty.name : null,
          raw_name: partyAliasText || extraction.party?.raw_name,
        },
        line_items: editableItems.map((it) => {
          const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : null;
          const qty = it.quantity ? parseFloat(it.quantity) : null;
          const rate = it.rate ? parseFloat(it.rate) : null;
          const lineTotal = (qty && rate) ? ((it.rate_basis === 'per_piece' && mult) ? (qty * mult * rate) : (qty * rate)) : null;
          const isDozenUnit = it.is_dozen || (it.unit && it.unit.toLowerCase() === 'dozen');
          const stockQty = qty ? (isDozenUnit ? (qty * 12) : (mult ? (qty * mult) : qty)) : null;

          return {
            product_id: it.selected_product_id ? parseInt(it.selected_product_id) : null,
            matched_product_id: it.selected_product_id ? parseInt(it.selected_product_id) : null,
            description: it.description,
            quantity: qty,
            billing_quantity: qty,
            unit: it.unit,
            billing_unit: it.unit,
            pack_size: it.pack_size,
            pack_multiplier: mult,
            pieces_per_selling_unit: mult,
            stock_quantity: stockQty,
            multiplier_unverified: Boolean(it.multiplier_unverified),
            rate_basis: it.rate_basis || 'per_pack',
            rate: rate,
            line_total: lineTotal,
            total_sale: lineTotal,
            gst_rate: it.gst_rate !== null && it.gst_rate !== undefined ? parseFloat(it.gst_rate) : null,
            raw_item: it.raw_item,
          };
        }),
        notes: extraction.notes,
      };

      // Collect new product aliases to save
      const newProductAliases = [];
      editableItems.forEach((it) => {
        if (it.save_alias && it.selected_product_id && it.alias_text?.trim()) {
          const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : null;
          newProductAliases.push({
            product_id: parseInt(it.selected_product_id),
            alias: it.alias_text.trim(),
            pack_size: it.pack_size || null,
            pack_multiplier: mult,
          });
        }
      });

      // Collect new party alias to save
      let newPartyAlias = null;
      if (savePartyAlias && selectedPartyId && partyAliasText.trim()) {
        newPartyAlias = {
          party_id: parseInt(selectedPartyId),
          alias: partyAliasText.trim(),
        };
      }

      // Collect packaging configs to persist independently of aliases
      const packagingConfigs = [];
      editableItems.forEach((it) => {
        if (it.selected_product_id && (it.packaging_verified || it.pack_multiplier)) {
          packagingConfigs.push({
            product_id: parseInt(it.selected_product_id),
            selling_unit: it.unit || 'Bag',
            rate_basis: it.rate_basis || 'per_pack',
            pieces_per_pack: it.pack_multiplier ? parseFloat(it.pack_multiplier) : null,
            is_verified: Boolean(it.packaging_verified),
          });
        }
      });

      const payload = {
        feedback_type: type,
        raw_input: extraction.raw_message,
        original_extraction: extraction,
        corrected_extraction: type === 'needs_correction' ? correctedPayload : (type === 'accurate' ? correctedPayload : null),
        correction_notes: correctionNotes,
        save_example: saveAsTrainingExample,
        new_party_alias: newPartyAlias,
        new_product_aliases: newProductAliases,
        packaging_configs: packagingConfigs,
      };

      const { data } = await api.post('/ai/training/feedback', payload);
      if (data && data.success) {
        try { sessionStorage.removeItem('billsoft_ai_training_draft'); } catch (e) {}
        toast.success(type === 'accurate' ? 'Recorded as accurate! Golden dataset updated.' : 'Correction and aliases learned successfully!');
        fetchAliases();
        fetchExamples();
      } else {
        toast.error(data?.message || 'Failed to save feedback.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Session expired or failed to save feedback. Please re-authenticate.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleOpenInvoiceReview = async () => {
    const preview = computeTotalsPreview();
    if (preview.hasBlockingIssues) {
      toast.error('Please resolve all blocking issues before preparing invoice draft.');
      return;
    }
    if (!selectedPartyId) {
      toast.error('Please select a customer.');
      return;
    }
    if (editableItems.length === 0) {
      toast.error('At least one item is required.');
      return;
    }

    // Check for "Cash ka bill" / cash intent in raw message
    const isCashIntent = Boolean(rawMessage && /cash\s*ka\s*bill|cash\s*bill|nagad/i.test(rawMessage));

    // Notes: extract any weight notes or ambiguous notes
    let notesText = '';
    const vatMatch = rawMessage ? rawMessage.match(/(?:total\s*)?(?:vat|baat|wat)\s*\d+\s*(?:kg|kilo|gm)/i) : null;
    if (vatMatch) {
      notesText = `Weight note: ${vatMatch[0]}`;
    }
    if (isCashIntent) {
      notesText = notesText ? `${notesText}; Cash Sale (Counter)` : 'Cash Sale (Counter)';
    }

    // Fetch next invoice number
    let nextNo = '';
    try {
      const { data } = await api.get('/invoices/next-number');
      if (data && data.success) {
        nextNo = data.invoice_no;
      }
    } catch (e) {
      console.warn('Could not fetch next invoice number:', e);
    }

    // Generate unique idempotency key
    const idempKey = `ai_inv_${company?.id || 1}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    setInvoiceForm({
      invoice_no: nextNo,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      supply_type: 'intrastate',
      notes: notesText,
      terms: company?.terms || '',
      payment_mode: isCashIntent ? 'cash' : 'credit',
      idempotency_key: idempKey,
    });
    setShowInvoiceModal(true);
  };

  const handleCreateFinalInvoice = async (stayOnPage = false) => {
    if (creatingInvoice) return; // double-click guard
    if (!selectedPartyId) {
      toast.error('Customer is required.');
      return;
    }
    if (editableItems.length === 0) {
      toast.error('At least one item is required.');
      return;
    }

    setCreatingInvoice(true);
    const toastId = toast.loading('Creating invoice and recording stock movements...');

    try {
      const payload = {
        party_id: parseInt(selectedPartyId, 10),
        invoice_date: invoiceForm.invoice_date,
        due_date: invoiceForm.due_date || null,
        invoice_type: 'GST',
        supply_type: invoiceForm.supply_type,
        notes: invoiceForm.notes,
        terms: invoiceForm.terms || company?.terms || '',
        idempotency_key: invoiceForm.idempotency_key,
        source_type: 'ai_training',
        source_reference: (rawMessage || '').substring(0, 100),
        items: editableItems.map((item, idx) => ({
          product_id: item.selected_product_id ? parseInt(item.selected_product_id, 10) : null,
          description: item.display_name || item.description || item.product_name || item.raw_item,
          hsn_code: item.hsn_code || '',
          qty: parseFloat(item.quantity) || 1,
          unit: item.unit || 'Pcs',
          rate: parseFloat(item.rate) || 0,
          rate_basis: item.rate_basis || 'per_pack',
          pack_multiplier: item.pack_multiplier ? parseFloat(item.pack_multiplier) : null,
          stock_qty: item.stock_quantity !== null && item.stock_quantity !== undefined ? parseFloat(item.stock_quantity) : null,
          discount: 0,
          gst_rate: item.gst_rate !== null && item.gst_rate !== undefined ? parseFloat(item.gst_rate) : 5,
          sort_order: idx
        }))
      };

      const { data } = await api.post('/invoices', payload);

      if (data && data.success) {
        toast.dismiss(toastId);
        try { sessionStorage.removeItem('billsoft_ai_training_draft'); } catch (e) {}
        setShowInvoiceModal(false);

        if (stayOnPage) {
          toast.success(`Invoice ${data.invoice.invoice_no} created! Ready for next order.`, { duration: 5000 });
          setLastCreatedInvoice({ id: data.invoice.id, invoice_no: data.invoice.invoice_no });
          setRawMessage('');
          setExtraction(null);
          setSelectedPartyId('');
          setEditableItems([]);
        } else {
          toast.success(`Invoice ${data.invoice.invoice_no} created successfully!`);
          navigate(`/invoices/${data.invoice.id}`);
        }
      } else {
        toast.dismiss(toastId);
        toast.error(data?.message || 'Failed to create invoice.');
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || err.message || 'Failed to create invoice.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleCreateManualAlias = async (e) => {
    e.preventDefault();
    if (!aliasForm.alias.trim() || !aliasForm.targetId) {
      toast.error('Please fill required fields.');
      return;
    }

    try {
      const payload = {
        type: aliasForm.type,
        alias: aliasForm.alias.trim(),
        product_id: aliasForm.type === 'product' ? parseInt(aliasForm.targetId) : undefined,
        party_id: aliasForm.type === 'party' ? parseInt(aliasForm.targetId) : undefined,
        pack_size: aliasForm.packSize.trim() || null,
        pack_multiplier: aliasForm.packMultiplier ? parseFloat(aliasForm.packMultiplier) : null,
      };

      const { data } = await api.post('/ai/training/aliases', payload);
      if (data.success) {
        toast.success('Alias added successfully!');
        setShowAliasModal(false);
        setAliasForm({ type: 'product', targetId: '', alias: '', packSize: '', packMultiplier: '' });
        fetchAliases();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save alias.');
    }
  };

  const handleDeleteAlias = async (id, type) => {
    if (!confirm('Are you sure you want to remove this alias?')) return;
    try {
      const { data } = await api.delete(`/ai/training/aliases/${id}?type=${type}`);
      if (data.success) {
        toast.success('Alias removed.');
        fetchAliases();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete alias.');
    }
  };

  const totals = computeTotalsPreview();
  const selectedParty = allParties.find((p) => String(p.id) === String(selectedPartyId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header ── */}
      <PageHeader
        title="Invoice with AI"
        subtitle="Create official invoices instantly from WhatsApp or customer order messages"
        actions={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <Button
              variant={activeTab === 'order' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('order')}
              className="text-xs px-3 sm:px-4 py-1.5 flex-1 sm:flex-none justify-center whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Order Message
            </Button>
            <Button
              variant={activeTab === 'other' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('other')}
              className="text-xs px-3 sm:px-4 py-1.5 flex-1 sm:flex-none justify-center whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1" /> Other ({aliases.product_aliases.length + aliases.party_aliases.length + trainingExamples.length})
            </Button>
          </div>
        }
      />

      {/* ─────────────────────────── TAB 1: ORDER MESSAGE ─────────────────────────── */}
      {activeTab === 'order' && (
        <div className="space-y-6">
          {/* Recent Created Invoice Banner */}
          {lastCreatedInvoice && (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Invoice #{lastCreatedInvoice.invoice_no} created successfully!
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted">
                    Stock movements & ledger entries posted. You can now paste your next customer order below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/invoices/${lastCreatedInvoice.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View Invoice #{lastCreatedInvoice.invoice_no}
                </Link>
                <button
                  type="button"
                  onClick={() => setLastCreatedInvoice(null)}
                  className="p-1 rounded text-muted hover:text-foreground"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Section A: Input Box */}
          <Panel className="p-5 border" style={{ borderColor: 'var(--border)' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Paste WhatsApp / Order Message:
                </label>
                <span className="text-xs text-muted" style={{ color: 'var(--text-3)' }}>
                  {rawMessage.length} / 4000 chars
                </span>
              </div>

              <textarea
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                placeholder="Paste customer order message here e.g.: Sharma store ke liye haldi 100g 20 packet, mirchi 200g 10 packet aur garam masala 50g 5 packet ka bill bana do."
                rows={4}
                className="w-full p-3 rounded-xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRawMessage('');
                    setExtraction(null);
                    setApiError(null);
                    try { sessionStorage.removeItem('billsoft_ai_training_draft'); } catch (e) {}
                  }}
                  className="text-xs font-medium text-muted hover:text-red-500"
                  style={{ color: 'var(--text-3)' }}
                >
                  Clear
                </button>
                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={analyzing || !rawMessage.trim()}
                  className="px-6 py-2"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing with Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Analyze Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Panel>

          {/* Section B: Error Display */}
          {apiError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-800 dark:text-red-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  {apiError.code === 'API_KEY_MISSING' ? 'Gemini API Key Required' : 'AI Analysis Interrupted'}
                </p>
                <p className="text-xs leading-relaxed">{apiError.message}</p>
                {apiError.code === 'API_KEY_MISSING' && (
                  <p className="text-xs text-muted pt-1">
                    Set <code className="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in server environment or <code className="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded">php-backend/config.php</code>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section C: Parsed Preview & Corrections */}
          {extraction && (
            <div className="space-y-6">
              {/* Warnings Banner */}
              {extraction.global_warnings?.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Review Required ({extraction.global_warnings.length} Ambiguities Detected):
                  </div>
                  <ul className="text-xs list-disc list-inside space-y-1 ml-1 text-amber-800 dark:text-amber-300">
                    {extraction.global_warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extraction Header: Intent & Party */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Intent Card */}
                <Panel className="p-4 border" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs text-muted mb-1" style={{ color: 'var(--text-3)' }}>Detected Intent</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                      {extraction.intent}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                      {Math.round(extraction.confidence * 100)}% match
                    </span>
                  </div>
                  {extraction.notes && (
                    <p className="text-xs text-muted mt-2 truncate" title={extraction.notes} style={{ color: 'var(--text-3)' }}>
                      Note: {extraction.notes}
                    </p>
                  )}
                </Panel>

                {/* Party Resolution Card */}
                <Panel className="p-4 border md:col-span-2 min-w-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Party / Customer Resolution</span>
                      {(extraction.party?.extracted_display || extraction.party?.raw_name) && (
                        <span className="text-[11px] text-muted truncate max-w-[240px] sm:max-w-[340px]" title={extraction.party.extracted_display || extraction.party.raw_name}>
                          (Extracted: <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">&quot;{extraction.party.extracted_display || extraction.party.raw_name}&quot;</code>)
                        </span>
                      )}
                    </div>
                    {extraction.party?.match_type === 'exact_alias' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Learned Alias
                      </span>
                    ) : extraction.party?.match_type === 'exact_catalog' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Exact Matched
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3" /> Unresolved Party (Select Existing / New Customer)
                      </span>
                    )}
                  </div>

                  {/* Suggestion Candidates Quick Selection */}
                  {extraction.party?.candidates?.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Possible Matching Customers (Click to confirm candidate):</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {extraction.party.candidates.map((c) => {
                          const isSelected = String(selectedPartyId) === String(c.id);
                          const candidateLoc = [c.address, c.city].filter(Boolean).join(', ');
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedPartyId(String(c.id));
                                setSavePartyAlias(false); // Do not auto-save fuzzy match as alias without explicit operator opt-in
                              }}
                              className={`text-xs px-2.5 py-1.5 rounded-md border font-medium flex items-center gap-1.5 transition-all text-left ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                              }`}
                            >
                              <span className="font-semibold">{c.name}</span>
                              {candidateLoc && (
                                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-muted'}`}>
                                  ({candidateLoc})
                                </span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-white ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Clean Responsive Customer Selection & Alias Learning Layout */}
                  <div className="space-y-3 min-w-0">
                    {/* Area 1: Customer Selection in Catalog + Quick Create */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                          Select / Verify Customer in Catalog:
                        </label>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <select
                            value={selectedPartyId}
                            onChange={(e) => {
                              setSelectedPartyId(e.target.value);
                              setSavePartyAlias(false);
                            }}
                            className="w-full p-2 rounded-lg border text-xs focus:ring-1 focus:ring-blue-500 truncate font-medium"
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: !selectedPartyId ? '#f59e0b' : 'var(--border)',
                              color: 'var(--text)',
                            }}
                          >
                            <option value="">-- Select or verify customer from catalog --</option>
                            {allParties.map((p) => {
                              const loc = [p.address, p.city].filter(Boolean).join(', ');
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name}{loc ? ` — ${loc}` : ''}{p.mobile ? ` • ${p.mobile}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            setPartyForm({
                              name: extraction.party?.raw_name || partyAliasText || '',
                              address: '',
                              city: extraction.party?.raw_location || '',
                              state: company?.state || '',
                              mobile: '',
                              email: '',
                              gst_no: 'NA',
                              party_type: 'customer',
                              opening_balance: '',
                            });
                            setShowPartyModal(true);
                          }}
                          className="text-xs px-3.5 py-2 shrink-0 sm:w-auto w-full flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm hover:border-blue-400 font-semibold"
                          title="Add new customer with full address and details"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-500" />
                          <span>+ New Customer</span>
                        </Button>
                      </div>

                      {/* Selected Party Summary Bar with Address & City */}
                      {selectedParty && (
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              {selectedParty.name}
                            </span>
                            {selectedParty.address && (
                              <span className="text-[11px] text-muted flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                {selectedParty.address}{selectedParty.city ? `, ${selectedParty.city}` : ''}
                              </span>
                            )}
                            {!selectedParty.address && selectedParty.city && (
                              <span className="text-[11px] text-muted flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                {selectedParty.city}
                              </span>
                            )}
                            {selectedParty.mobile && (
                              <span className="text-[11px] text-muted flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                {selectedParty.mobile}
                              </span>
                            )}
                          </div>
                          {selectedParty.gst_no && selectedParty.gst_no !== 'NA' && (
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300 font-semibold">
                              GST: {selectedParty.gst_no}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Area 2: Dedicated Tenant-Scoped Alias Learning Card */}
                    <div className="p-3 rounded-xl border bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 space-y-2.5 min-w-0">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          id="savePartyAliasCb"
                          checked={savePartyAlias}
                          onChange={(e) => setSavePartyAlias(e.target.checked)}
                          disabled={!selectedPartyId}
                          className="mt-0.5 rounded border border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <label
                          htmlFor="savePartyAliasCb"
                          className={`text-xs select-none leading-relaxed break-words flex-1 min-w-0 ${
                            !selectedPartyId ? 'text-muted cursor-not-allowed opacity-60' : 'cursor-pointer text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <span className="font-semibold">Tenant-scoped Alias Learning: </span>
                          Learn <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">&quot;{partyAliasText || extraction.party?.raw_name || 'this query'}&quot;</span> &rarr; {selectedParty ? <strong className="text-gray-900 dark:text-gray-100 font-semibold">{selectedParty.name}</strong> : 'selected customer'}
                        </label>
                      </div>

                      {savePartyAlias && (
                        <div className="pl-6 pt-1 space-y-1.5 min-w-0 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                            <label className="text-[11px] font-medium text-muted shrink-0">
                              Alias Nickname / Shorthand:
                            </label>
                            <input
                              type="text"
                              value={partyAliasText}
                              onChange={(e) => setPartyAliasText(e.target.value)}
                              placeholder="Alias nickname (e.g. Sharma ji, Ekkam, Hari Om)"
                              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border focus:ring-1 focus:ring-blue-500"
                              style={{
                                backgroundColor: 'var(--bg-input)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)',
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-muted leading-tight">
                            Saves to tenant memory. Future orders mentioning this phrase will automatically resolve to this customer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              </div>

              {/* Line Items Table */}
              <Panel className="border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Package className="w-4 h-4 text-blue-500" />
                    Extracted Line Items ({editableItems.length})
                  </h3>
                  <span className="text-xs text-muted" style={{ color: 'var(--text-3)' }}>
                    Verify packaging multipliers, unit rates & product mappings before approval
                  </span>
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                        <th className="p-3 font-semibold">#</th>
                        <th className="p-3 font-semibold">Mention & Invoice Display Name</th>
                        <th className="p-3 font-semibold">Stock SKU / Catalog Mapping</th>
                        <th className="p-3 font-semibold">Qty</th>
                        <th className="p-3 font-semibold">Unit</th>
                        <th className="p-3 font-semibold">Rate (₹)</th>
                        <th className="p-3 font-semibold">GST %</th>
                        <th className="p-3 font-semibold text-right">Total (₹)</th>
                        <th className="p-3 font-semibold text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>Alias Learn</span>
                            <span title="Check to learn raw mention as alias for selected catalog SKU" className="cursor-help text-muted hover:text-blue-500">
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {editableItems.map((it, idx) => {
                        const hasMissingQty = it.quantity === null || it.quantity === '' || parseFloat(it.quantity) <= 0;
                        const hasMissingRate = it.rate === null || it.rate === '' || parseFloat(it.rate) <= 0;
                        const isUnmatched = !it.selected_product_id;
                        const orderPack = normalizePackSize(it.pack_size) || normalizePackSize(it.raw_item);
                        const selectedProd = it.selected_product_id ? allProducts.find((p) => String(p.id) === String(it.selected_product_id)) : null;
                        const skuPack = selectedProd ? normalizePackSize(selectedProd.name) : null;
                        const hasPackMismatch = orderPack && skuPack && orderPack.toLowerCase() !== skuPack.toLowerCase();
                        const qty = parseFloat(it.quantity || 0);
                        const rate = parseFloat(it.rate || 0);
                        const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : 1;
                        const lineTotalVal = (it.rate_basis === 'per_piece') ? (qty * mult * rate) : (qty * rate);

                        return (
                          <tr key={idx} className={hasMissingQty || hasMissingRate || isUnmatched || it.multiplier_unverified || hasPackMismatch ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                            <td className="p-3 text-muted align-top">{idx + 1}</td>
                            <td className="p-3 align-top min-w-[200px]">
                              <div className="space-y-1">
                                <span className="font-mono text-[11px] text-muted block" title="Raw mention from order text">
                                  {it.raw_item || '-'}
                                </span>
                                <input
                                  type="text"
                                  value={it.description || ''}
                                  onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                                  placeholder="Invoice Display Name"
                                  className="w-full p-1.5 rounded border text-xs font-medium"
                                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                  title="Editable Invoice Display Name (preserves underlying inventory stock SKU)"
                                />
                                {it.pack_size && (
                                  <span className="text-[10px] text-muted block">Pack size: {it.pack_size}</span>
                                )}
                                {it.variant_notes && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
                                    {it.variant_notes}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 align-top min-w-[240px]">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={it.selected_product_id}
                                    onChange={(e) => handleItemProductChange(idx, e.target.value)}
                                    className={`flex-1 p-1.5 rounded border text-xs ${isUnmatched || hasPackMismatch ? 'border-amber-400 font-semibold' : ''}`}
                                    style={{
                                      backgroundColor: 'var(--bg-input)',
                                      borderColor: isUnmatched || hasPackMismatch ? '#f59e0b' : 'var(--border)',
                                      color: 'var(--text)',
                                    }}
                                  >
                                    <option value="">-- Unmapped Product --</option>
                                    {allProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (₹{p.default_rate})
                                      </option>
                                    ))}
                                  </select>
                                  {!it.selected_product_id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductForm({
                                          name: it.description || it.raw_item || '',
                                          unit: it.unit || 'Pcs',
                                          default_rate: it.rate || '',
                                          gst_rate: '5',
                                          hsn_code: '',
                                          category: '',
                                        });
                                        setTargetProductItemIndex(idx);
                                        setShowProductModal(true);
                                      }}
                                      className="px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded text-[11px] font-semibold hover:bg-blue-100 shrink-0"
                                      title="Add new product to catalog"
                                    >
                                      <Plus className="w-3 h-3 inline mr-0.5" /> New
                                    </button>
                                  )}
                                </div>
                                {isUnmatched && (
                                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block">
                                    Product Not Found in catalog
                                  </span>
                                )}
                                {hasPackMismatch && (
                                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                    Pack contradiction: Order specified {orderPack}, but SKU is {skuPack}
                                  </span>
                                )}

                                {/* Packaging Multiplier Verification & Memory Box */}
                                {(it.is_packaging_unit || it.multiplier_unverified || it.stock_deduction_pending) && (
                                  <div className={`mt-2 p-2.5 rounded-lg border text-xs ${
                                    it.packaging_verified
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                      : 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                                  }`}>
                                    {it.packaging_verified ? (
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <span>
                                            {it.is_dozen ? (
                                              <><strong>Canonical Unit:</strong> 1 Dozen = 12 pcs ({it.rate_basis === 'per_piece' ? `₹${it.rate}/pc` : `₹${it.rate}/Dozen`})</>
                                            ) : (
                                              <><strong>Packaging Verified:</strong> 1 {it.unit || 'Bag'} = {it.pack_multiplier || 1} pcs ({it.rate_basis === 'per_piece' ? `₹${it.rate}/pc` : `₹${it.rate}/${it.unit || 'Bag'}`})</>
                                            )}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...editableItems];
                                            updated[idx] = { ...updated[idx], packaging_verified: false, multiplier_unverified: true, stock_deduction_pending: true };
                                            setEditableItems(updated);
                                          }}
                                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                        >
                                          Edit Conversion
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                          <span>
                                            Stock deduction pending: Pieces per {it.unit || 'bag'} is unverified for inventory tracking.
                                            {it.suggested_multiplier ? ` (Catalog suggested: ${it.suggested_multiplier} pcs)` : ''}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                              Pieces / {it.unit || 'bag'}:
                                            </span>
                                            <input
                                              type="number"
                                              min="1"
                                              step="1"
                                              value={it.pack_multiplier ?? ''}
                                              onChange={(e) => handleItemFieldChange(idx, 'pack_multiplier', e.target.value)}
                                              placeholder={it.suggested_multiplier ? String(it.suggested_multiplier) : 'e.g. 60'}
                                              className="w-16 p-1 text-xs rounded border text-center font-bold"
                                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                              Rate basis:
                                            </span>
                                            <select
                                              value={it.rate_basis || 'per_pack'}
                                              onChange={(e) => handleItemFieldChange(idx, 'rate_basis', e.target.value)}
                                              className="p-1 text-xs rounded border font-medium"
                                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                            >
                                              <option value="per_pack">₹{it.rate || 0} per {it.unit || 'bag'}</option>
                                              <option value="per_piece">₹{it.rate || 0} per piece</option>
                                            </select>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleVerifyPackaging(idx)}
                                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition shrink-0"
                                            title="Verify pieces per bag and remember for future orders"
                                          >
                                            <Check className="w-3.5 h-3.5" /> Confirm & Remember
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 w-20 align-top">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={it.quantity ?? ''}
                                onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value === '' ? null : e.target.value)}
                                placeholder="0"
                                className={`w-full p-1.5 rounded border text-xs font-semibold ${hasMissingQty ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40' : ''}`}
                                style={{
                                  backgroundColor: hasMissingQty ? undefined : 'var(--bg-input)',
                                  borderColor: hasMissingQty ? '#ef4444' : 'var(--border)',
                                  color: hasMissingQty ? '#b91c1c' : 'var(--text)',
                                }}
                              />
                              {hasMissingQty && <span className="text-[9px] text-red-500 block font-bold mt-0.5">REQUIRED</span>}
                              {mult > 1 && !hasMissingQty && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5" title="Physical stock count">
                                  Stock: {qty * mult} pcs
                                </span>
                              )}
                            </td>
                            <td className="p-3 w-20 align-top">
                              <input
                                type="text"
                                value={it.unit || ''}
                                onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                className="w-full p-1.5 rounded border text-xs"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              />
                            </td>
                            <td className="p-3 w-24 align-top">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={it.rate ?? ''}
                                onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                                placeholder="0.00"
                                className={`w-full p-1.5 rounded border text-xs ${hasMissingRate ? 'border-red-500' : ''}`}
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: hasMissingRate ? '#ef4444' : 'var(--border)', color: 'var(--text)' }}
                              />
                              {hasMissingRate && <span className="text-[9px] text-red-500 block font-bold mt-0.5">REQUIRED</span>}
                            </td>
                            <td className="p-3 text-center align-top">
                              {it.gst_rate !== null && it.gst_rate !== undefined ? (
                                <span className="font-semibold">{it.gst_rate}%</span>
                              ) : (
                                <span className="text-red-500 font-bold">Unset</span>
                              )}
                            </td>
                            <td className="p-3 text-right align-top font-semibold">
                              {isUnmatched ? (
                                <div className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded text-center leading-tight">
                                  <span className="text-[11px] block">Withheld</span>
                                  <span className="text-[9px] font-normal block opacity-80">Unmapped SKU</span>
                                </div>
                              ) : (hasMissingQty || hasMissingRate) ? (
                                <span className="text-muted">-</span>
                              ) : (it.rate_basis === 'per_piece' && (!it.pack_multiplier || parseFloat(it.pack_multiplier) <= 0)) ? (
                                <div className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded text-center leading-tight">
                                  <span className="text-[11px] block">Withheld</span>
                                  <span className="text-[9px] font-normal block opacity-80">Needs pcs/pack</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{lineTotalVal.toFixed(2)}</span>
                                  {it.is_dozen && (
                                    <span className="text-[10px] text-muted block font-normal">{qty} Dozen @ ₹{rate}/dz</span>
                                  )}
                                  {it.stock_deduction_pending && (
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-normal">Stock pending</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center align-top">
                              <div className="flex flex-col items-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(it.save_alias)}
                                  onChange={(e) => handleItemFieldChange(idx, 'save_alias', e.target.checked)}
                                  disabled={!it.selected_product_id}
                                  title="Check to learn raw mention as alias for this product"
                                  className="rounded border"
                                />
                                <span className="text-[9px] text-muted mt-0.5">Learn</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Extracted Items Cards */}
                <div className="lg:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                  {editableItems.map((it, idx) => {
                    const hasMissingQty = it.quantity === null || it.quantity === '' || parseFloat(it.quantity) <= 0;
                    const hasMissingRate = it.rate === null || it.rate === '' || parseFloat(it.rate) <= 0;
                    const isUnmatched = !it.selected_product_id;
                    const orderPack = normalizePackSize(it.pack_size) || normalizePackSize(it.raw_item);
                    const selectedProd = it.selected_product_id ? allProducts.find((p) => String(p.id) === String(it.selected_product_id)) : null;
                    const skuPack = selectedProd ? normalizePackSize(selectedProd.name) : null;
                    const hasPackMismatch = orderPack && skuPack && orderPack.toLowerCase() !== skuPack.toLowerCase();
                    const qty = parseFloat(it.quantity || 0);
                    const rate = parseFloat(it.rate || 0);
                    const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : 1;
                    const lineTotalVal = (it.rate_basis === 'per_piece') ? (qty * mult * rate) : (qty * rate);

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 space-y-3 ${
                          hasMissingQty || hasMissingRate || isUnmatched || it.multiplier_unverified || hasPackMismatch
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {/* Mobile Item Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-xs text-muted truncate" title={it.raw_item || '-'}>
                              {it.raw_item || '-'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            {isUnmatched ? (
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                Unmapped SKU
                              </span>
                            ) : (hasMissingQty || hasMissingRate) ? (
                              <span className="text-xs text-muted">₹-</span>
                            ) : (it.rate_basis === 'per_piece' && (!it.pack_multiplier || parseFloat(it.pack_multiplier) <= 0)) ? (
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                Needs pcs/pack
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                                ₹{lineTotalVal.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Invoice Display Name Input */}
                        <div>
                          <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-3)' }}>
                            Invoice Display Name:
                          </label>
                          <input
                            type="text"
                            value={it.description || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'description', e.target.value)}
                            placeholder="Invoice Display Name"
                            className="w-full p-2 rounded-lg border text-xs font-medium"
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                          {it.pack_size && (
                            <span className="text-[10px] text-muted block mt-0.5">Pack size: {it.pack_size}</span>
                          )}
                          {it.variant_notes && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                              {it.variant_notes}
                            </span>
                          )}
                        </div>

                        {/* Catalog Mapping Select */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
                              Catalog Product Mapping:
                            </label>
                            {!it.selected_product_id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm({
                                    name: it.description || it.raw_item || '',
                                    unit: it.unit || 'Pcs',
                                    default_rate: it.rate || '',
                                    gst_rate: '5',
                                    hsn_code: '',
                                    category: '',
                                  });
                                  setTargetProductItemIndex(idx);
                                  setShowProductModal(true);
                                }}
                                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <Plus className="w-3 h-3" /> Quick Add Product
                              </button>
                            )}
                          </div>
                          <select
                            value={it.selected_product_id}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                            className={`w-full p-2 rounded-lg border text-xs ${isUnmatched || hasPackMismatch ? 'border-amber-400 font-semibold' : ''}`}
                            style={{
                              backgroundColor: 'var(--bg-input)',
                              borderColor: isUnmatched || hasPackMismatch ? '#f59e0b' : 'var(--border)',
                              color: 'var(--text)',
                            }}
                          >
                            <option value="">-- Unmapped Product --</option>
                            {allProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{p.default_rate})
                              </option>
                            ))}
                          </select>
                          {isUnmatched && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block mt-1">
                              Product Not Found in catalog
                            </span>
                          )}
                          {hasPackMismatch && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                              Pack contradiction: Order specified {orderPack}, but SKU is {skuPack}
                            </span>
                          )}
                        </div>

                        {/* Packaging Multiplier Verification (Mobile) */}
                        {(it.is_packaging_unit || it.multiplier_unverified || it.stock_deduction_pending) && (
                          <div className={`p-2.5 rounded-lg border text-xs ${
                            it.packaging_verified
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                          }`}>
                            {it.packaging_verified ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>
                                    {it.is_dozen ? (
                                      <>1 Dozen = 12 pcs ({it.rate_basis === 'per_piece' ? `₹${it.rate}/pc` : `₹${it.rate}/Dozen`})</>
                                    ) : (
                                      <>1 {it.unit || 'Bag'} = {it.pack_multiplier || 1} pcs ({it.rate_basis === 'per_piece' ? `₹${it.rate}/pc` : `₹${it.rate}/${it.unit || 'Bag'}`})</>
                                    )}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editableItems];
                                    updated[idx] = { ...updated[idx], packaging_verified: false, multiplier_unverified: true, stock_deduction_pending: true };
                                    setEditableItems(updated);
                                  }}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold shrink-0"
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>Stock deduction pending: Verify pieces per {it.unit || 'bag'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] text-muted block mb-0.5">Pieces / {it.unit || 'bag'}:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={it.pack_multiplier ?? ''}
                                      onChange={(e) => handleItemFieldChange(idx, 'pack_multiplier', e.target.value)}
                                      placeholder={it.suggested_multiplier ? String(it.suggested_multiplier) : 'e.g. 60'}
                                      className="w-full p-1.5 text-xs rounded border text-center font-bold"
                                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted block mb-0.5">Rate basis:</span>
                                    <select
                                      value={it.rate_basis || 'per_pack'}
                                      onChange={(e) => handleItemFieldChange(idx, 'rate_basis', e.target.value)}
                                      className="w-full p-1.5 text-xs rounded border font-medium"
                                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    >
                                      <option value="per_pack">per {it.unit || 'bag'}</option>
                                      <option value="per_piece">per piece</option>
                                    </select>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyPackaging(idx)}
                                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition"
                                >
                                  <Check className="w-3.5 h-3.5" /> Confirm & Remember
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Grid for Qty, Unit, Rate, GST */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] font-medium block mb-1 text-muted">
                              Qty {hasMissingQty && <span className="text-red-500 font-bold">*</span>}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity ?? ''}
                              onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value === '' ? null : e.target.value)}
                              placeholder="0"
                              className={`w-full p-2 rounded-lg border text-xs font-semibold ${hasMissingQty ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700' : ''}`}
                              style={{
                                backgroundColor: hasMissingQty ? undefined : 'var(--bg-input)',
                                borderColor: hasMissingQty ? '#ef4444' : 'var(--border)',
                                color: hasMissingQty ? '#b91c1c' : 'var(--text)',
                              }}
                            />
                            {mult > 1 && !hasMissingQty && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5">
                                Stock: {qty * mult} pcs
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="text-[10px] font-medium block mb-1 text-muted">Unit</label>
                            <input
                              type="text"
                              value={it.unit || ''}
                              onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                              className="w-full p-2 rounded-lg border text-xs"
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-medium block mb-1 text-muted">
                              Rate (₹) {hasMissingRate && <span className="text-red-500 font-bold">*</span>}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.rate ?? ''}
                              onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                              placeholder="0.00"
                              className={`w-full p-2 rounded-lg border text-xs ${hasMissingRate ? 'border-red-500' : ''}`}
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: hasMissingRate ? '#ef4444' : 'var(--border)', color: 'var(--text)' }}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-medium block mb-1 text-muted">GST %</label>
                            <div
                              className="p-2 rounded-lg border text-xs text-center font-bold"
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            >
                              {it.gst_rate !== null && it.gst_rate !== undefined ? `${it.gst_rate}%` : 'Unset'}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Alias Learn toggle + Subtotal */}
                        <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
                          <label className="flex items-center gap-1.5 cursor-pointer text-muted text-[11px]">
                            <input
                              type="checkbox"
                              checked={Boolean(it.save_alias)}
                              onChange={(e) => handleItemFieldChange(idx, 'save_alias', e.target.checked)}
                              disabled={!it.selected_product_id}
                              className="rounded border"
                            />
                            <span>Learn alias</span>
                          </label>
                          <div className="text-right text-[11px] text-muted">
                            {it.is_dozen && <span>{qty} Dozen @ ₹{rate}/dz • </span>}
                            <span>Total: <strong className="font-mono text-xs" style={{ color: 'var(--text)' }}>₹{lineTotalVal.toFixed(2)}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals Preview Summary */}
                <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}>
                  <div className="text-xs text-muted flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Formula: Taxable = Total ÷ (1 + GST/100). Ambiguous or unverified line totals are withheld from Grand Total.</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 w-full sm:w-auto text-left sm:text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted" style={{ color: 'var(--text-3)' }}>Taxable Total</p>
                      <p className="font-semibold text-xs">{totals.taxable ? `₹${totals.taxable}` : 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted" style={{ color: 'var(--text-3)' }}>GST Total</p>
                      <p className="font-semibold text-xs">{totals.gst ? `₹${totals.gst}` : 'Pending'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted" style={{ color: 'var(--text-3)' }}>Grand Total</p>
                      {totals.hasBlockingIssues ? (
                        <div>
                          <p className="font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                            Withheld / Pending Verification
                          </p>
                          <p className="text-[10px] text-muted mt-0.5">
                            Verified subtotal: ₹{totals.verifiedSubtotal}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold text-base text-blue-600 dark:text-blue-400">₹{totals.grand}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Section D: Operator Feedback & Learn Bar */}
              <Panel className="p-5 border" style={{ borderColor: 'var(--border)' }}>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Save className="w-4 h-4 text-blue-500" />
                  Operator Training & Review Safety Gate:
                </h4>

                {/* Review Safety Gate Actionable Alert Banner (Problem 1) */}
                {totals.hasBlockingIssues ? (
                  <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Review Safety Gate: Approval Disabled ({totals.blockingReasons.length} Item{totals.blockingReasons.length > 1 ? 's' : ''} Need Review)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                        Totals Withheld
                      </span>
                    </div>

                    <p className="text-xs text-amber-800 dark:text-amber-300 mb-2 font-medium">
                      To preserve financial accuracy, unverified lines are withheld from the Grand Total. Please resolve the following to enable approval:
                    </p>

                    <ul className="space-y-1.5 ml-1 text-amber-900 dark:text-amber-200 font-medium">
                      {totals.blockingReasons.map((reason, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 pt-2.5 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                      <span>💡 <strong>Operator Instructions:</strong> For packaging units (bag, peti, carton), enter pieces per bag, confirm rate basis, and click <em>Confirm Conversion</em>. For unmapped items or parties, select catalog matches above.</span>
                      {totals.withheldCount > 0 && (
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {totals.withheldCount} line total{totals.withheldCount > 1 ? 's' : ''} withheld
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>All mappings and billing amounts verified! Order totals calculated. Ready for Golden record approval.</span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 shrink-0">
                        Grand Total: ₹{totals.grand}
                      </span>
                    </div>
                    {totals.stockPendingCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Stock deduction pending for {totals.stockPendingCount} item(s): Billing total is verified. You can approve this invoice or confirm conversion now.</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>
                      Correction Notes (Optional context for training memory):
                    </label>
                    <input
                      type="text"
                      value={correctionNotes}
                      onChange={(e) => setCorrectionNotes(e.target.value)}
                      placeholder="e.g. Hari Om Kirana maps to Hari Kirana Store; bag has 10 pieces"
                      className="w-full p-2 rounded-lg border text-xs"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="saveExampleCb"
                      checked={saveAsTrainingExample}
                      onChange={(e) => setSaveAsTrainingExample(e.target.checked)}
                      className="rounded border"
                    />
                    <label htmlFor="saveExampleCb" className="text-xs cursor-pointer" style={{ color: 'var(--text)' }}>
                      Log as verified golden example in <strong>Training History</strong> (Gated: only saves as verified when 100% resolved).
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs text-muted" style={{ color: 'var(--text-3)' }}>
                    Saving feedback updates tenant memory. Financial/stock tables remain untouched.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      onClick={() => handleSaveFeedback('needs_correction')}
                      disabled={savingFeedback}
                      className="text-xs px-3 sm:px-4 py-2.5 sm:py-2 justify-center w-full sm:w-auto order-2 sm:order-1"
                    >
                      <ThumbsDown className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                      Save Corrections & Learn
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleSaveFeedback('accurate')}
                      disabled={savingFeedback || totals.hasBlockingIssues}
                      className={`text-xs px-3 sm:px-5 py-2.5 sm:py-2 justify-center w-full sm:w-auto order-3 sm:order-2 ${
                        totals.hasBlockingIssues
                          ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                      title={totals.hasBlockingIssues ? 'Resolve blocking issues above before approving as golden record' : 'Approve and record as golden dataset example'}
                    >
                      <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                      Accurate (Record as Golden)
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleOpenInvoiceReview}
                      disabled={savingFeedback || totals.hasBlockingIssues}
                      className={`text-xs px-4 sm:px-5 py-3 sm:py-2 justify-center w-full sm:w-auto order-1 sm:order-3 font-bold ${
                        totals.hasBlockingIssues
                          ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      }`}
                      title={totals.hasBlockingIssues ? 'Resolve blocking issues above before preparing invoice' : 'Prepare and review invoice draft'}
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Prepare Invoice Draft
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────── TAB 2: OTHER (ALIASES & MEMORY) ─────────────────────────── */}
      {activeTab === 'other' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOtherSubTab('aliases')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition ${
                  otherSubTab === 'aliases'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border text-muted hover:text-foreground'
                }`}
                style={otherSubTab !== 'aliases' ? { borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' } : {}}
              >
                Learned Aliases ({aliases.product_aliases.length + aliases.party_aliases.length})
              </button>
              <button
                type="button"
                onClick={() => setOtherSubTab('history')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition ${
                  otherSubTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border text-muted hover:text-foreground'
                }`}
                style={otherSubTab !== 'history' ? { borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' } : {}}
              >
                Verified Golden Examples ({trainingExamples.length})
              </button>
            </div>
            {otherSubTab === 'aliases' && (
              <Button variant="primary" onClick={() => setShowAliasModal(true)} className="text-xs w-full sm:w-auto justify-center">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Manual Alias
              </Button>
            )}
          </div>

          {otherSubTab === 'aliases' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Learned Aliases Memory</h2>
                  <p className="text-xs text-muted" style={{ color: 'var(--text-3)' }}>
                    These aliases map WhatsApp shorthand names directly to your catalog items and customer accounts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Aliases */}
            <Panel className="border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-nav)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Package className="w-4 h-4 text-blue-500" />
                  Product Aliases ({aliases.product_aliases.length})
                </h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted" style={{ borderColor: 'var(--border)' }}>
                      <th className="p-3">Alias</th>
                      <th className="p-3">Mapped Product</th>
                      <th className="p-3">Pack Size</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {aliases.product_aliases.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted">No product aliases saved yet.</td>
                      </tr>
                    ) : (
                      aliases.product_aliases.map((a) => (
                        <tr key={a.id}>
                          <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{a.alias}</td>
                          <td className="p-3">{a.product_name}</td>
                          <td className="p-3">{a.pack_size || '-'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAlias(a.id, 'product')}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete alias"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                {aliases.product_aliases.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">No product aliases saved yet.</div>
                ) : (
                  aliases.product_aliases.map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 truncate">
                          &quot;{a.alias}&quot;
                        </div>
                        <div className="text-gray-800 dark:text-gray-200 truncate font-medium">
                          &rarr; {a.product_name}
                        </div>
                        {a.pack_size && (
                          <div className="text-[10px] text-muted">Pack size: {a.pack_size}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAlias(a.id, 'product')}
                        className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                        title="Delete alias"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            {/* Party Aliases */}
            <Panel className="border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-nav)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Users className="w-4 h-4 text-emerald-500" />
                  Party Aliases ({aliases.party_aliases.length})
                </h3>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted" style={{ borderColor: 'var(--border)' }}>
                      <th className="p-3">Alias</th>
                      <th className="p-3">Mapped Party</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {aliases.party_aliases.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted">No party aliases saved yet.</td>
                      </tr>
                    ) : (
                      aliases.party_aliases.map((a) => (
                        <tr key={a.id}>
                          <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{a.alias}</td>
                          <td className="p-3">{a.party_name}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteAlias(a.id, 'party')}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete alias"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                {aliases.party_aliases.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">No party aliases saved yet.</div>
                ) : (
                  aliases.party_aliases.map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          &quot;{a.alias}&quot;
                        </div>
                        <div className="text-gray-800 dark:text-gray-200 truncate font-medium">
                          &rarr; {a.party_name}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAlias(a.id, 'party')}
                        className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                        title="Delete alias"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Panel>
              </div>
            </div>
          )}

          {otherSubTab === 'history' && (
            <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Verified Golden Training Examples</h2>
            <p className="text-xs text-muted" style={{ color: 'var(--text-3)' }}>
              Historical operator-verified examples used to benchmark parser accuracy and few-shot prompt context.
            </p>
          </div>

          <Panel className="border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted" style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}>
                    <th className="p-3 font-semibold">#</th>
                    <th className="p-3 font-semibold">Input Message</th>
                    <th className="p-3 font-semibold">Party</th>
                    <th className="p-3 font-semibold">Items</th>
                    <th className="p-3 font-semibold">Logged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {trainingExamples.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted">
                        No training examples logged yet. Analyze an order and save feedback to add golden records.
                      </td>
                    </tr>
                  ) : (
                    trainingExamples.map((ex) => {
                      const items = ex.extracted_payload?.line_items || [];
                      return (
                        <tr key={ex.id}>
                          <td className="p-3 text-muted">{ex.id}</td>
                          <td className="p-3 max-w-xs font-mono truncate" title={ex.input_text}>
                            {ex.input_text}
                          </td>
                          <td className="p-3 font-semibold">
                            {ex.extracted_party || ex.extracted_payload?.party?.matched_name || '-'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                              {items.length} items
                            </span>
                          </td>
                          <td className="p-3 text-muted">
                            {new Date(ex.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {trainingExamples.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted">
                  No training examples logged yet. Analyze an order and save feedback to add golden records.
                </div>
              ) : (
                trainingExamples.map((ex) => {
                  const items = ex.extracted_payload?.line_items || [];
                  return (
                    <div key={ex.id} className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {ex.extracted_party || ex.extracted_payload?.party?.matched_name || 'Customer'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold shrink-0">
                          {items.length} items
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-muted line-clamp-2" title={ex.input_text}>
                        &quot;{ex.input_text}&quot;
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted">
                        <span>Record #{ex.id}</span>
                        <span>{new Date(ex.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────── MANUAL ALIAS MODAL ─────────────────────────── */}
      {showAliasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-4 sm:p-6 border shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Add New Entity Alias</h3>
              <button onClick={() => setShowAliasModal(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualAlias} className="space-y-4 text-xs">
              <div>
                <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>Alias Type:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="aliasType"
                      checked={aliasForm.type === 'product'}
                      onChange={() => setAliasForm({ ...aliasForm, type: 'product', targetId: '' })}
                    />
                    Product Alias
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="aliasType"
                      checked={aliasForm.type === 'party'}
                      onChange={() => setAliasForm({ ...aliasForm, type: 'party', targetId: '' })}
                    />
                    Party Alias
                  </label>
                </div>
              </div>

              <div>
                <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Alias / Nickname string:
                </label>
                <input
                  type="text"
                  required
                  value={aliasForm.alias}
                  onChange={(e) => setAliasForm({ ...aliasForm, alias: e.target.value })}
                  placeholder={aliasForm.type === 'product' ? 'e.g. GM 100g, mirchi pkt' : 'e.g. Sharma ji, Gupta store'}
                  className="w-full p-2 rounded-lg border"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Target Catalog {aliasForm.type === 'product' ? 'Product' : 'Party'}:
                </label>
                <select
                  required
                  value={aliasForm.targetId}
                  onChange={(e) => setAliasForm({ ...aliasForm, targetId: e.target.value })}
                  className="w-full p-2 rounded-lg border"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">-- Choose {aliasForm.type === 'product' ? 'Product' : 'Party'} --</option>
                  {aliasForm.type === 'product'
                    ? allProducts.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.default_rate})</option>)
                    : allParties.map((p) => <option key={p.id} value={p.id}>{p.name} {p.city ? `(${p.city})` : ''}</option>)}
                </select>
              </div>

              {aliasForm.type === 'product' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>Pack Size (Optional):</label>
                    <input
                      type="text"
                      value={aliasForm.packSize}
                      onChange={(e) => setAliasForm({ ...aliasForm, packSize: e.target.value })}
                      placeholder="100g, 500g"
                      className="w-full p-2 rounded-lg border"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>Multiplier (Optional):</label>
                    <input
                      type="number"
                      step="any"
                      value={aliasForm.packMultiplier}
                      onChange={(e) => setAliasForm({ ...aliasForm, packMultiplier: e.target.value })}
                      placeholder="e.g. 20 for peti"
                      className="w-full p-2 rounded-lg border"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <Button variant="secondary" type="button" onClick={() => setShowAliasModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Alias
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────── FULL CREATE CUSTOMER MODAL (SAME AS PARTIES TAB) ─────────────────────────── */}
      {showPartyModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between p-5 sm:p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Users className="w-5 h-5 text-emerald-500" />
                Add New Customer / Party
              </h2>
              <button onClick={() => setShowPartyModal(false)} style={{ color: 'var(--text-3)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickParty} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="label">Customer / Party Name *</label>
                <input
                  className="input-field"
                  value={partyForm.name}
                  onChange={(e) => setPartyForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Pareek Kirana Store"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Mobile</label>
                  <input
                    className="input-field"
                    value={partyForm.mobile}
                    onChange={(e) => setPartyForm((p) => ({ ...p, mobile: e.target.value }))}
                    placeholder="9610623427"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={partyForm.email}
                    onChange={(e) => setPartyForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="party@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="label">Address (गली / मोहल्ला / दुकान नं.)</label>
                <input
                  className="input-field"
                  value={partyForm.address}
                  onChange={(e) => setPartyForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. Main Bazaar, Near Old Bus Stand"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">City / Station</label>
                  <input
                    className="input-field"
                    value={partyForm.city}
                    onChange={(e) => setPartyForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Sri Vijaynagar"
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <select
                    className="input-field"
                    value={partyForm.state}
                    onChange={(e) => setPartyForm((p) => ({ ...p, state: e.target.value }))}
                  >
                    <option value="">-- Select State --</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">GST Number</label>
                  <input
                    className="input-field uppercase"
                    value={partyForm.gst_no}
                    onChange={(e) => setPartyForm((p) => ({ ...p, gst_no: e.target.value.toUpperCase() }))}
                    placeholder="NA"
                  />
                </div>
                <div>
                  <label className="label">Party Type</label>
                  <select
                    className="input-field"
                    value={partyForm.party_type}
                    onChange={(e) => setPartyForm((p) => ({ ...p, party_type: e.target.value }))}
                  >
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              {/* Opening Balance */}
              <div
                className="rounded-xl p-3.5 space-y-2 border"
                style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    Opening Balance (पिछला बकाया)
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Purana bacha hua balance add karein. Yeh party ledger aur outstanding me automatic dikhega.
                </p>
                <div className="relative">
                  <span className="input-prefix absolute left-3 top-1/2 -translate-y-1/2 font-medium text-xs text-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    className="input-field input-with-currency font-semibold"
                    value={partyForm.opening_balance}
                    onChange={(e) => setPartyForm((p) => ({ ...p, opening_balance: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  disabled={savingParty}
                  className="btn-secondary flex-1 text-xs sm:text-sm py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingParty}
                  className="btn-primary flex-1 text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2"
                >
                  {savingParty ? 'Saving...' : 'Add & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────── QUICK CREATE PRODUCT MODAL ─────────────────────────── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-4 sm:p-6 border shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Package className="w-4 h-4 text-blue-500" />
                Add New Product to Catalog
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Product Name: *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Por Washing Powder 1kg"
                  className="w-full p-2 rounded-lg border font-medium"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>Unit:</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full p-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Bag">Bag</option>
                    <option value="Kg">Kg</option>
                    <option value="Peti">Peti</option>
                    <option value="Box">Box</option>
                    <option value="Ctn">Ctn</option>
                    <option value="Gms">Gms</option>
                    <option value="Ltr">Ltr</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>Default Rate (₹):</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={productForm.default_rate}
                    onChange={(e) => setProductForm({ ...productForm, default_rate: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>GST Rate (%):</label>
                  <select
                    value={productForm.gst_rate}
                    onChange={(e) => setProductForm({ ...productForm, gst_rate: e.target.value })}
                    className="w-full p-2 rounded-lg border font-semibold"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium mb-1 block" style={{ color: 'var(--text-3)' }}>HSN Code:</label>
                  <input
                    type="text"
                    value={productForm.hsn_code}
                    onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                    placeholder="e.g. 0910"
                    className="w-full p-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <Button variant="secondary" type="button" onClick={() => setShowProductModal(false)} disabled={savingProduct}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={savingProduct}>
                  {savingProduct ? 'Creating...' : 'Create & Map Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────── IN-PLACE INVOICE REVIEW & CONFIRMATION MODAL ─────────────────────────── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Modal Header */}
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                    AI Invoice Draft Review & Confirmation
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Verify physical stock conversions and accounting parameters before final creation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                disabled={creatingInvoice}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Customer and Invoice Parameters Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Info Card */}
                <div
                  className="p-3 rounded-lg border space-y-1"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">
                      Billed Customer
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                      Verified Catalog Party
                    </span>
                  </div>
                  {(() => {
                    const party = allParties.find((p) => String(p.id) === String(selectedPartyId));
                    return (
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                          {party?.name || 'Unknown Party'}
                        </div>
                        <div className="text-muted" style={{ color: 'var(--text-3)' }}>
                          {party?.city ? `${party.city}` : ''} {party?.mobile ? `• ${party.mobile}` : ''}
                        </div>
                        <div className="text-muted text-[11px]" style={{ color: 'var(--text-3)' }}>
                          GSTIN: {party?.gst_no && party.gst_no !== 'NA' ? party.gst_no : 'Unregistered / Consumer'}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Invoice Parameters Card */}
                <div
                  className="p-3 rounded-lg border grid grid-cols-1 sm:grid-cols-2 gap-2"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                >
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      Invoice Number:
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.invoice_no}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_no: e.target.value })}
                      placeholder="Auto-generated (e.g. INV/26-27/005)"
                      className="w-full p-1.5 rounded border text-xs font-mono font-bold"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      Invoice Date:
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.invoice_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                      className="w-full p-1.5 rounded border text-xs font-semibold"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      Due Date:
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                      className="w-full p-1.5 rounded border text-xs"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                      Supply Type:
                    </label>
                    <select
                      value={invoiceForm.supply_type}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, supply_type: e.target.value })}
                      className="w-full p-1.5 rounded border text-xs font-semibold"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="intrastate">Intrastate (CGST + SGST)</option>
                      <option value="interstate">Interstate (IGST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div
                  className="px-3 py-2 border-b font-bold text-xs flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <span>Line Items & Physical Stock Movements</span>
                  <span className="text-[11px] font-normal text-muted" style={{ color: 'var(--text-3)' }}>
                    {editableItems.length} item(s) to be created
                  </span>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted bg-gray-50/50 dark:bg-gray-800/50" style={{ borderColor: 'var(--border)' }}>
                        <th className="p-2 w-8">#</th>
                        <th className="p-2">Customer Invoice Display</th>
                        <th className="p-2">Underlying Catalog SKU</th>
                        <th className="p-2">Billed Qty</th>
                        <th className="p-2">Rate & Basis</th>
                        <th className="p-2">Physical Stock Deduction</th>
                        <th className="p-2 text-right">Taxable</th>
                        <th className="p-2 text-right">GST</th>
                        <th className="p-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {editableItems.map((it, idx) => {
                        const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : null;
                        const qty = parseFloat(it.quantity) || 0;
                        const rate = parseFloat(it.rate) || 0;
                        const lineTotal = (it.rate_basis === 'per_piece' && mult) ? (qty * mult * rate) : (qty * rate);
                        const gstRate = parseFloat(it.gst_rate) || 5;
                        const taxable = lineTotal / (1 + gstRate / 100);
                        const gst = lineTotal - taxable;
                        const isDozen = it.is_dozen || (it.unit && it.unit.toLowerCase() === 'dozen');
                        const stockDeduct = it.stock_quantity !== null && it.stock_quantity !== undefined ? it.stock_quantity : (isDozen ? qty * 12 : (mult ? qty * mult : qty));

                        const prod = allProducts.find((p) => String(p.id) === String(it.selected_product_id));

                        return (
                          <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20">
                            <td className="p-2 text-muted font-mono">{idx + 1}</td>
                            <td className="p-2 font-medium" style={{ color: 'var(--text)' }}>
                              <div>{it.display_name || it.description || it.product_name}</div>
                              {it.pack_size && (
                                <span className="inline-block px-1 py-0.2 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-muted">
                                  Pack: {it.pack_size}
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              {prod ? (
                                <div>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {prod.name}
                                  </span>
                                  <span className="text-[10px] text-muted block">
                                    ID #{prod.id} • Unit: {prod.unit || 'Pcs'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-500">Unlinked item</span>
                              )}
                            </td>
                            <td className="p-2 font-bold" style={{ color: 'var(--text)' }}>
                              {qty} {it.unit || 'Pcs'}
                            </td>
                            <td className="p-2">
                              <div>₹{rate.toFixed(2)}</div>
                              <span className="text-[10px] text-muted block">
                                {it.rate_basis === 'per_piece' ? 'per piece' : `per ${it.unit || 'pack'}`}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {stockDeduct} Pcs
                              </span>
                              {isDozen && (
                                <span className="text-[10px] text-muted block">12 pcs/dozen</span>
                              )}
                              {mult && !isDozen && (
                                <span className="text-[10px] text-muted block">{mult} pcs/{it.unit || 'pack'}</span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono">
                              ₹{taxable.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-mono">
                              <div>₹{gst.toFixed(2)}</div>
                              <span className="text-[10px] text-muted">({gstRate}%)</span>
                            </td>
                            <td className="p-2 text-right font-mono font-bold" style={{ color: 'var(--text)' }}>
                              ₹{lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Line Items in Modal */}
                <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
                  {editableItems.map((it, idx) => {
                    const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : null;
                    const qty = parseFloat(it.quantity) || 0;
                    const rate = parseFloat(it.rate) || 0;
                    const lineTotal = (it.rate_basis === 'per_piece' && mult) ? (qty * mult * rate) : (qty * rate);
                    const gstRate = parseFloat(it.gst_rate) || 5;
                    const taxable = lineTotal / (1 + gstRate / 100);
                    const gst = lineTotal - taxable;
                    const isDozen = it.is_dozen || (it.unit && it.unit.toLowerCase() === 'dozen');
                    const stockDeduct = it.stock_quantity !== null && it.stock_quantity !== undefined ? it.stock_quantity : (isDozen ? qty * 12 : (mult ? qty * mult : qty));
                    const prod = allProducts.find((p) => String(p.id) === String(it.selected_product_id));

                    return (
                      <div key={idx} className="p-3 space-y-1.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                            <span className="text-muted font-mono mr-1.5">{idx + 1}.</span>
                            {it.display_name || it.description || it.product_name}
                          </div>
                          <div className="font-bold font-mono text-sm" style={{ color: 'var(--text)' }}>
                            ₹{lineTotal.toFixed(2)}
                          </div>
                        </div>
                        {prod && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400">
                            Catalog: {prod.name}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-muted text-[11px]">
                          <span>
                            {qty} {it.unit || 'Pcs'} @ ₹{rate.toFixed(2)} ({it.rate_basis === 'per_piece' ? 'pc' : it.unit || 'pack'})
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Deducts: {stockDeduct} Pcs
                          </span>
                        </div>
                        <div className="text-right text-[10px] text-muted">
                          Taxable: ₹{taxable.toFixed(2)} • GST ({gstRate}%): ₹{gst.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informational Callouts */}
              {invoiceForm.payment_mode === 'cash' && (
                <div
                  className="p-3 rounded-lg border flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-emerald-800 dark:text-emerald-200 text-xs">
                    <strong>Cash Sale:</strong> Order mentioned &quot;Cash ka bill&quot;. In accordance with business rules, this is treated as a counter Cash Sale and marked Paid automatically into Cash Ledger.
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="font-semibold block mb-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                  Invoice Notes (Included on Invoice & PDF):
                </label>
                <input
                  type="text"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="e.g. Weight note: Total vat 10kg; Scheme free items"
                  className="w-full p-2 rounded border text-xs"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Totals Summary Card */}
              {(() => {
                let subtotal = 0;
                let taxableTotal = 0;
                let taxTotal = 0;
                editableItems.forEach((it) => {
                  const mult = (it.pack_multiplier && parseFloat(it.pack_multiplier) > 0) ? parseFloat(it.pack_multiplier) : null;
                  const qty = parseFloat(it.quantity) || 0;
                  const rate = parseFloat(it.rate) || 0;
                  const lineTotal = (it.rate_basis === 'per_piece' && mult) ? (qty * mult * rate) : (qty * rate);
                  const gstRate = parseFloat(it.gst_rate) || 5;
                  const taxable = lineTotal / (1 + gstRate / 100);
                  const gst = lineTotal - taxable;
                  subtotal += lineTotal;
                  taxableTotal += taxable;
                  taxTotal += gst;
                });
                const grandRaw = taxableTotal + taxTotal;
                const grandTotal = Math.round(grandRaw);
                const roundOff = grandTotal - grandRaw;
                const isInterstate = invoiceForm.supply_type === 'interstate';

                return (
                  <div
                    className="p-3 sm:p-4 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-left sm:text-right"
                    style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}
                  >
                    <div>
                      <div className="text-[11px] text-muted">Subtotal</div>
                      <div className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>
                        ₹{subtotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">Taxable Amount</div>
                      <div className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>
                        ₹{taxableTotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">
                        {isInterstate ? 'IGST Total' : 'CGST + SGST'}
                      </div>
                      <div className="text-sm font-semibold font-mono text-blue-600 dark:text-blue-400">
                        ₹{taxTotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">Grand Total</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{grandTotal.toFixed(2)}
                      </div>
                      {Math.abs(roundOff) > 0.001 && (
                        <div className="text-[10px] text-muted">
                          Round: {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 text-[11px] text-muted pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>Idempotency Protected:</strong> Invoices and stock movements cannot be duplicated.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="p-3 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3"
              style={{ backgroundColor: 'var(--bg-nav)', borderColor: 'var(--border)' }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                disabled={creatingInvoice}
                className="text-xs justify-center w-full sm:w-auto"
              >
                Cancel / Edit Order
              </Button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => handleCreateFinalInvoice(false)}
                  disabled={creatingInvoice}
                  className="text-xs px-3.5 py-2.5 sm:py-2 justify-center w-full sm:w-auto font-medium"
                >
                  Create & View Invoice
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => handleCreateFinalInvoice(true)}
                  disabled={creatingInvoice}
                  className="text-xs px-5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto"
                >
                  {creatingInvoice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Posting & Deducting Stock...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create & Next Order (Stay Here)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
