import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Building2, Upload, X } from 'lucide-react';
import { INDIAN_STATES } from '../data/states';
import { BUSINESS_TYPES } from '../data/businessTypes';
import { isValidGstinOrNA, normalizeGstin } from '../utils/gstin';

export default function CompanySetup() {
  const { refreshCompany, company } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [form, setForm] = useState({
    company_name: '', address: '', city: '', state: '', pincode: '',
    gst_no: '', fssai_no: '', pan_no: '', mobile: '', email: '', website: '',
    bank_name: '', bank_account_no: '', bank_ifsc: '', bank_branch: '', upi_id: '',
    invoice_prefix: 'INV', financial_year: '26-27',
    business_type: 'general',
    terms: '1. Goods once sold will not be taken back\n2. Payment terms will be last for 7 days',
  });

  useEffect(() => {
    if (company) {
      setForm(prev => ({ ...prev, ...company }));
      if (company.logo_url) setLogoPreview(company.logo_url);
    }
  }, [company]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    if (!isValidGstinOrNA(form.gst_no)) { toast.error('Enter a valid GSTIN or leave it blank.'); return; }
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries({ ...form, gst_no: normalizeGstin(form.gst_no) }).forEach(([k, v]) => { if (v !== null && v !== undefined) formData.append(k, v); });
      if (logoFile) formData.append('logo', logoFile);

      const { data } = await api.post('/company', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        toast.success('Company profile saved!');
        await refreshCompany();
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{color:"var(--text)"}}>
            {company ? 'Update Company Profile' : 'Set Up Your Company'}
          </h1>
          <p className="text-sm mt-1" style={{color:"var(--text-3)"}}>This information will appear on all your invoices</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Type - FIRST */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Business Type *</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
              Select your business type to get a customized experience
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, business_type: bt.id }))}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center"
                  style={{
                    borderColor: form.business_type === bt.id ? '#2563eb' : 'var(--border)',
                    backgroundColor: form.business_type === bt.id ? 'rgba(37,99,235,0.08)' : 'var(--bg-muted)',
                  }}
                >
                  <span className="text-2xl">{bt.icon}</span>
                  <span className="text-xs font-medium leading-tight" style={{
                    color: form.business_type === bt.id ? '#2563eb' : 'var(--text-2)'
                  }}>
                    {bt.name}
                  </span>
                </button>
              ))}
            </div>
            {form.business_type && (
              <div className="mt-3 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <span className="font-medium text-blue-600">
                  {BUSINESS_TYPES.find(b => b.id === form.business_type)?.icon}{' '}
                  {BUSINESS_TYPES.find(b => b.id === form.business_type)?.name}
                </span>
                <span className="ml-2" style={{ color: 'var(--text-3)' }}>
                  - {BUSINESS_TYPES.find(b => b.id === form.business_type)?.description}
                </span>
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{color:"var(--text)"}}>Company Logo</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-muted)' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current.click()}
                  className="btn-secondary text-sm">
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </button>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null); }}
                    className="ml-2 text-sm text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
                <p className="text-xs mt-1" style={{color:"var(--text-3)"}}>PNG, JPG up to 2MB</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{color:"var(--text)"}}>Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Company Name *</label>
                <input name="company_name" value={form.company_name} onChange={handleChange}
                  className="input-field" placeholder="e.g. ABC Traders Pvt. Ltd." required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input name="address" value={form.address} onChange={handleChange}
                  className="input-field" placeholder="Street address" />
              </div>
              <div>
                <label className="label">City</label>
                <input name="city" value={form.city} onChange={handleChange}
                  className="input-field" placeholder="City" />
              </div>
              <div>
                <label className="label">State</label>
                <select name="state" value={form.state} onChange={handleChange} className="input-field">
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Pincode</label>
                <input name="pincode" value={form.pincode} onChange={handleChange}
                  className="input-field" placeholder="110001" />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input name="mobile" value={form.mobile} onChange={handleChange}
                  className="input-field" placeholder="98765 43210" />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  className="input-field" placeholder="company@email.com" />
              </div>
              <div>
                <label className="label">Website</label>
                <input name="website" value={form.website} onChange={handleChange}
                  className="input-field" placeholder="www.example.com" />
              </div>
            </div>
          </div>

          {/* Tax Info */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{color:"var(--text)"}}>Tax & Registration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">GST Number</label>
                <input name="gst_no" value={form.gst_no} onChange={handleChange}
                  className="input-field" placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
              <div>
                <label className="label">FSSAI Number</label>
                <input name="fssai_no" value={form.fssai_no} onChange={handleChange}
                  className="input-field" placeholder="e.g. 12345678901234" />
              </div>
              <div>
                <label className="label">PAN Number</label>
                <input name="pan_no" value={form.pan_no} onChange={handleChange}
                  className="input-field" placeholder="e.g. ABCDE1234F" />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{color:"var(--text)"}}>Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Bank Name</label>
                <input name="bank_name" value={form.bank_name} onChange={handleChange}
                  className="input-field" placeholder="e.g. State Bank of India" />
              </div>
              <div>
                <label className="label">Account Number</label>
                <input name="bank_account_no" value={form.bank_account_no} onChange={handleChange}
                  className="input-field" placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label className="label">IFSC Code</label>
                <input name="bank_ifsc" value={form.bank_ifsc} onChange={handleChange}
                  className="input-field" placeholder="e.g. SBIN0001234" />
              </div>
              <div>
                <label className="label">Branch</label>
                <input name="bank_branch" value={form.bank_branch} onChange={handleChange}
                  className="input-field" placeholder="e.g. Main Branch" />
              </div>
              <div>
                <label className="label">UPI ID</label>
                <input name="upi_id" value={form.upi_id} onChange={handleChange}
                  className="input-field" placeholder="company@upi" />
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{color:"var(--text)"}}>Invoice Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Invoice Prefix</label>
                <input name="invoice_prefix" value={form.invoice_prefix} onChange={handleChange}
                  className="input-field" placeholder="BY" />
                <p className="text-xs mt-1" style={{color:"var(--text-3)"}}>Invoice will be: BY/26-27/001</p>
              </div>
              <div>
                <label className="label">Financial Year</label>
                <input name="financial_year" value={form.financial_year} onChange={handleChange}
                  className="input-field" placeholder="26-27" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Invoice Terms</label>
                <textarea name="terms" value={form.terms} onChange={handleChange}
                  className="input-field" rows={3}
                  placeholder="1. Goods once sold will not be taken back&#10;2. Payment terms will be last for 7 days" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Saving...' : company ? 'Update Company' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}


