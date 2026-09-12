import React, { useState } from 'react';
import { UserAuthProfile } from '../types';
import { 
  registerUser, 
  loginUser
} from '../utils/supabaseClient';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface UserAuthModalProps {
  isOpen: boolean;
  required?: boolean;
  onClose: () => void;
  currentUser?: UserAuthProfile | null;
  onUserChange?: (user: UserAuthProfile | null) => void;
  onAuthSuccess?: (user: UserAuthProfile) => void;
}

export function UserAuthModal({ isOpen, required = false, onClose, currentUser = null, onUserChange, onAuthSuccess }: UserAuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loginRole, setLoginRole] = useState<'user' | 'admin'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!mobileNumber.trim()) {
          setErrorMessage('Mobile number is required for emergency dispatch contact.');
          setIsLoading(false);
          return;
        }

        const res = await registerUser({
          email,
          password,
          mobileNumber,
          name: fullName,
          role,
        });

        if (res.success && res.user) {
          if (onUserChange) onUserChange(res.user);
          if (onAuthSuccess) onAuthSuccess(res.user);
          setSuccessMessage(`Welcome, ${res.user.name || res.user.email}! Account registered.`);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setErrorMessage(res.error || 'Failed to register account.');
        }
      } else {
        // Sign In
        const res = await loginUser({
          email,
          password,
          mobileNumber: mobileNumber.trim() || undefined,
          expectedRole: loginRole,
        });

        if (res.success && res.user) {
          if (onUserChange) onUserChange(res.user);
          if (onAuthSuccess) onAuthSuccess(res.user);
          setSuccessMessage(`Logged in successfully as ${res.user.email}`);
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setErrorMessage(res.error || 'Invalid credentials or login failed.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCommuter = () => {
    setIsSignUp(true);
    setEmail('traveller.garwal@gmail.com');
    setPassword('SecurePass2026!');
    setMobileNumber('+91 98765 43210');
    setFullName('Rajesh Rawat');
    setRole('user');
  };

  const fillDemoAdmin = () => {
    setIsSignUp(false);
    setEmail('sdrf.admin@uttarakhand.gov.in');
    setPassword('EmergencyCommand#1');
    setMobileNumber('+91 94120 99881');
    setFullName('Commander V. K. Joshi (SDRF)');
    setRole('user');
    setLoginRole('admin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 shadow-[0_16px_48px_rgba(0,0,0,0.6)] p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {currentUser ? 'User Profile & Auth' : isSignUp ? 'Supabase Registration' : 'Supabase User Login'}
              </h2>
              <p className="text-xs text-slate-400">
                Secure account access
              </p>
            </div>
          </div>

          {!required && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* If already logged in, show current profile */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Account Status</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Active {currentUser.role}
                </span>
              </div>
              <div className="text-sm font-semibold text-white">{currentUser.name || 'Highway Commuter'}</div>
              <div className="text-xs text-cyan-300 font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
              </div>
              <div className="text-xs text-emerald-300 font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentUser.mobileNumber}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUserChange(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Sign Out / Switch Account
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Quick Demo Pre-fill helper buttons */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/60 border border-white/5 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick Fill:
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={fillDemoCommuter}
                  className="px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition-colors text-[10px] font-medium"
                >
                  Commuter
                </button>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="px-2 py-0.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/30 text-amber-300 transition-colors text-[10px] font-medium"
                >
                  SDRF Admin
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Singh"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            {!isSignUp && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/70 border border-white/10">
                <button
                  type="button"
                  onClick={() => setLoginRole('user')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors ${loginRole === 'user' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  User Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole('admin')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors ${loginRole === 'admin' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Admin Login
                </button>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Mobile Number field (REQUIRED by user specification) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Mobile Number <span className="text-red-400 font-bold">* Required for SOS Dispatch</span>
                </label>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-emerald-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Rescue teams & emergency command center will contact this number upon SOS transmission.
              </p>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password <span className="text-cyan-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Role selector (if signing up) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                      role === 'user'
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🚗 Highway Commuter
                  </button>
                  <span className="py-1.5 px-3 rounded-xl text-xs font-medium border border-white/10 bg-slate-800/40 text-slate-500 text-center">
                    Admin accounts are provisioned by command staff
                  </span>
                </div>
              </div>
            )}

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Toggle sign in / sign up */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in here'
                  : "Don't have an account? Register with Mobile Number"}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
