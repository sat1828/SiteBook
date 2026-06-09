import { Link } from 'react-router-dom';
import { ShieldAlert, HardHat } from 'lucide-react';
import { GlassCard } from '../components/UI/GlassCard';
import { Button } from '../components/UI/Button';

export const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
    <GlassCard className="max-w-md w-full text-center">
      <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-text-muted text-sm mb-6">
        You do not have permission to access this area. Please contact your contractor to adjust your role permissions.
      </p>
      <Link to="/login">
        <Button>Return to Login</Button>
      </Link>
    </GlassCard>
  </div>
);
