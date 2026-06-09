import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/store';
import { auth as authApi } from '../api/client';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setAuth, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    setAuth(data.user, data.token);
    toast.success(`Welcome, ${data.user.name}!`);
    return data;
  }, [setAuth]);

  const register = useCallback(async (userData) => {
    const { data } = await authApi.register(userData);
    setAuth(data.user, data.token);
    toast.success('Account created successfully!');
    return data;
  }, [setAuth]);

  const logout = useCallback(() => {
    storeLogout();
    navigate('/login');
    toast.success('Logged out');
  }, [storeLogout, navigate]);

  const getDashboardRoute = useCallback(() => {
    if (!user) return '/login';
    switch (user.role) {
      case 'contractor': return '/contractor/dashboard';
      case 'supervisor': return '/supervisor/attendance';
      case 'compliance_officer': return '/compliance/report';
      default: return '/login';
    }
  }, [user]);

  return { login, register, logout, user, isAuthenticated, getDashboardRoute };
};
