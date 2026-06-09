import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { HardHat, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, getDashboardRoute } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'contractor' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={getDashboardRoute()} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate(getDashboardRoute(), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-accent-500/10" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="glass rounded-3xl p-8 w-full max-w-md relative z-10 animate-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-text-muted text-sm mt-1">Join SiteBook</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Your name" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="you@example.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+919876543210" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Role</label>
            <select name="role" value={form.role} onChange={handleChange} className="select-field">
              <option value="contractor">Contractor</option>
              <option value="supervisor">Site Supervisor</option>
              <option value="compliance_officer">Compliance Officer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} className="input-field pr-10" placeholder="Min 8 characters" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Creating...</> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
};
