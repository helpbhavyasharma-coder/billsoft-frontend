import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/apiError';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(email, password);
      if (data.success) {
        toast.success('Account created! Set up your company now.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Create GST invoices instantly',
    'Manage customers & products',
    'Download PDF invoices',
    'Track payments & outstanding',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundColor:'var(--bg)'}}>
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left - Features */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{color:'var(--text)'}}>BillSoft</span>
          </div>
          <h2 className="text-3xl font-bold mb-4" style={{color:'var(--text)'}}>
            Professional GST Billing for your business
          </h2>
          <p className="mb-8" style={{color:'var(--text-3)'}}>
            Create beautiful GST invoices, manage your customers and products, and grow your business.
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3" style={{color:'var(--text-2)'}}>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Right - Form */}
        <div className="card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6 lg:hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{color:'var(--text)'}}>BillSoft</h1>
          </div>

          <h2 className="text-xl font-semibold mb-6" style={{color:'var(--text)'}}>Create your free account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{color:'var(--text-3)'}}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{color:'var(--text-3)'}}>
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
