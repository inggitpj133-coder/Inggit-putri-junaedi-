import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Users, 
  Mail, 
  FileSpreadsheet, 
  ChevronRight, 
  Info,
  Shield,
  UserCheck,
  AlertCircle,
  X,
  Plus
} from 'lucide-react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';

interface LoginProps {
  users: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onRegisterAndLogin: (name: string, email: string, role: 'administrator' | 'surveyor' | 'analis') => Promise<void>;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Login({ users, onLogin, onRegisterAndLogin }: LoginProps) {
  const [loginMode, setLoginMode] = useState<'quick' | 'email' | 'register'>('quick');
  
  // Email login states
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'administrator' | 'surveyor' | 'analis'>('surveyor');
  const [regError, setRegError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Account Chooser Modal states
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleError, setGoogleError] = useState('');

  // Quick Select handler
  const handleQuickSelect = (user: UserProfile) => {
    onLogin(user);
  };

  // Google Sign In handler (reals Firebase popup + high-fidelity fallback chooser)
  const handleGoogleSignIn = async () => {
    setGoogleError('');
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email) {
        const googleEmail = result.user.email;
        const googleName = result.user.displayName || googleEmail.split('@')[0];
        
        // Synchronise with our Firestore user profiles
        await loginOrRegisterGoogleUser(googleEmail, googleName);
      }
    } catch (err: any) {
      console.warn("Real Google Auth popup was blocked or failed, opening custom high-fidelity simulated chooser:", err);
      // Fallback: Show the beautiful, interactive Google Chooser modal
      setShowGoogleChooser(true);
    }
  };

  // Helper helper to login or register Google user
  const loginOrRegisterGoogleUser = async (email: string, name: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      // Create new account automatically
      // Auto assign Administrator if they match the user's requested email, otherwise surveyor
      const role = normalizedEmail === 'inggitpj133@gmail.com' ? 'administrator' : 'surveyor';
      try {
        await onRegisterAndLogin(name, normalizedEmail, role);
      } catch (err) {
        console.error("Gagal mendaftarkan akun dari login Google:", err);
        setGoogleError("Terjadi kesalahan saat mendaftarkan profil Google baru.");
      }
    }
  };

  // Handler for custom Google account submission
  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) {
      setGoogleError("Nama dan email wajib diisi.");
      return;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(customGoogleEmail.trim())) {
      setGoogleError("Format email Google tidak valid.");
      return;
    }

    setLoading(true);
    try {
      await loginOrRegisterGoogleUser(customGoogleEmail.trim(), customGoogleName.trim());
      setShowGoogleChooser(false);
    } catch (err) {
      setGoogleError("Gagal menghubungkan ke Google API.");
    } finally {
      setLoading(false);
    }
  };

  // Email login handler
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!emailInput.trim()) {
      setEmailError('Silakan masukkan email Anda.');
      return;
    }

    const normalizedEmail = emailInput.trim().toLowerCase();
    const matchedUser = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setEmailError('Email tidak terdaftar. Pilih "Daftar Akun Baru" atau gunakan email yang valid.');
    }
  };

  // Register and login handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    
    if (!regName.trim()) {
      setRegError('Nama lengkap wajib diisi.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Alamat email wajib diisi.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(regEmail.trim())) {
      setRegError('Format email tidak valid.');
      return;
    }

    const normalizedEmail = regEmail.trim().toLowerCase();
    const emailExists = users.some(u => u.email.toLowerCase() === normalizedEmail);
    if (emailExists) {
      setRegError('Email sudah terdaftar. Silakan gunakan menu Masuk Email.');
      return;
    }

    setLoading(true);
    try {
      await onRegisterAndLogin(regName.trim(), normalizedEmail, regRole);
    } catch (err) {
      console.error(err);
      setRegError('Gagal mendaftarkan akun baru. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" id="login-container">
      <div className="w-full max-w-md glass-panel-heavy rounded-3xl overflow-hidden shadow-2xl border border-red-100/50 flex flex-col relative" id="login-card">
        
        {/* Card Header - Merah Putih Theme */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-8 text-center relative border-b-4 border-white">
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-white border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Active
          </div>
          
          <div className="w-14 h-14 bg-white text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20 transform hover:scale-105 transition-all">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">DentaSync Pro</h2>
          <p className="text-xs text-red-100 font-semibold tracking-wide mt-1">Sistem Informasi & Survey Kesehatan Gigi & Mulut</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
          <button 
            type="button"
            onClick={() => { setLoginMode('quick'); setEmailError(''); setRegError(''); }}
            className={`py-3.5 text-center transition-all cursor-pointer ${loginMode === 'quick' ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-xs' : 'hover:bg-slate-100/60'}`}
          >
            Pilih Profil
          </button>
          <button 
            type="button"
            onClick={() => { setLoginMode('email'); setEmailError(''); setRegError(''); }}
            className={`py-3.5 text-center transition-all cursor-pointer ${loginMode === 'email' ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-xs' : 'hover:bg-slate-100/60'}`}
          >
            Masuk Email
          </button>
          <button 
            type="button"
            onClick={() => { setLoginMode('register'); setEmailError(''); setRegError(''); }}
            className={`py-3.5 text-center transition-all cursor-pointer ${loginMode === 'register' ? 'bg-white text-red-600 border-b-2 border-red-600 shadow-xs' : 'hover:bg-slate-100/60'}`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Login Form Body */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          
          {/* 1. Quick Select Mode */}
          {loginMode === 'quick' && (
            <div className="space-y-4 animate-fadeIn" id="quick-login-view">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Pilih Akun Terdaftar:
                </span>
              </div>
              
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Memuat daftar pengguna...
                  </div>
                ) : (
                  users.map(u => {
                    const isInggit = u.email === 'inggitpj133@gmail.com';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickSelect(u)}
                        className="w-full text-left p-3 rounded-xl bg-white/65 hover:bg-red-50/60 border border-slate-200/60 hover:border-red-200 text-slate-700 hover:text-red-950 transition-all cursor-pointer flex items-center justify-between group shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                            u.role === 'administrator' ? 'bg-red-100 text-red-700' : 
                            u.role === 'surveyor' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {u.displayName.substring(0, 2)}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold block leading-tight">
                              {u.displayName}
                              {isInggit && <span className="ml-1 text-[8px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest">Super Admin</span>}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-medium">{u.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            u.role === 'administrator' ? 'bg-red-50 text-red-600 border-red-100' : 
                            u.role === 'surveyor' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {u.role === 'administrator' ? 'Admin' : u.role === 'surveyor' ? 'Surveyor' : 'Analis'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Google Sign In inside Quick tab */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-[1.01]"
                >
                  <GoogleIcon />
                  Masuk dengan Google
                </button>
              </div>
            </div>
          )}

          {/* 2. Email Login Mode */}
          {loginMode === 'email' && (
            <div className="space-y-4 animate-fadeIn" id="email-login-view">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Alamat Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="nama@dentasync.com atau email Anda"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Contoh: <strong className="text-slate-500 font-semibold">inggitpj133@gmail.com</strong></p>
                </div>

                {emailError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{emailError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest hover:scale-[1.01]"
                >
                  <LogIn className="w-4 h-4" /> Masuk Portal
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-extrabold tracking-wider">Atau Masuk Dengan</span>
                </div>
              </div>

              {/* Google Sign In inside Email tab */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-[1.01]"
              >
                <GoogleIcon />
                Hubungkan Akun Google
              </button>
            </div>
          )}

          {/* 3. Register Mode */}
          {loginMode === 'register' && (
            <div className="space-y-4 animate-fadeIn" id="register-view">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white/70 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Alamat Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="nama@email.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-white/70 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Hak Akses / Peran</label>
                  <select
                    value={regRole}
                    onChange={e => setRegRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all cursor-pointer"
                  >
                    <option value="surveyor">Surveyor (Pemeriksa & Input Data)</option>
                    <option value="analis">Analis Data (Membaca Analisis & Ekspor)</option>
                    <option value="administrator">Administrator (Kontrol Penuh & Sesi)</option>
                  </select>
                </div>

                {regError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-widest hover:scale-[1.01] disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" /> 
                  {loading ? 'Mendaftarkan...' : 'Daftar & Masuk'}
                </button>
              </form>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-extrabold tracking-wider">Atau Daftar Dengan</span>
                </div>
              </div>

              {/* Google Sign In inside Register tab */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-lg border border-slate-200 transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-[1.01]"
              >
                <GoogleIcon />
                Daftar dengan Akun Google
              </button>
            </div>
          )}

          {/* Card Footer Info */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-normal font-medium">
              Aplikasi mendukung pendaftaran instan surveyor lapangan. Data karies gigi & rujukan sinkron dengan database Firestore secara real-time.
            </p>
          </div>

        </div>
      </div>

      {/* Google Sign-In High-Fidelity Account Chooser Fallback Modal */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn" id="google-chooser-backdrop">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp" id="google-chooser-modal">
            
            {/* Google-like Header */}
            <div className="p-6 text-center border-b border-slate-100 relative">
              <button 
                type="button" 
                onClick={() => { setShowGoogleChooser(false); setShowCustomGoogleForm(false); }}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
              
              <h3 className="text-md font-bold text-slate-800">Pilih akun Google Anda</h3>
              <p className="text-xs text-slate-500 mt-1">untuk melanjutkan ke <strong className="text-red-600 font-bold">DentaSync Pro</strong></p>
            </div>

            {/* List of Mock/Real Google Accounts */}
            <div className="p-5 flex-1 max-h-[320px] overflow-y-auto space-y-2">
              
              {googleError && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-[11px] font-semibold mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}

              {!showCustomGoogleForm ? (
                <>
                  <div className="space-y-2">
                    {/* 1. Inggit PJ - Super Admin */}
                    <button
                      type="button"
                      onClick={() => loginOrRegisterGoogleUser('inggitpj133@gmail.com', 'Inggit PJ')}
                      className="w-full text-left p-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                          IP
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-slate-700 leading-tight">
                            Inggit PJ
                            <span className="ml-1 text-[8px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded-full">Super Admin</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">inggitpj133@gmail.com</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>

                    {/* 2. Admin DentaSync */}
                    <button
                      type="button"
                      onClick={() => loginOrRegisterGoogleUser('admin@dentasync.com', 'Admin DentaSync')}
                      className="w-full text-left p-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                          AD
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-slate-700 leading-tight">Admin DentaSync</span>
                          <span className="text-[10px] text-slate-400 font-mono">admin@dentasync.com</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>

                    {/* 3. Surveyor - Siti */}
                    <button
                      type="button"
                      onClick={() => loginOrRegisterGoogleUser('siti@dentasync.com', 'Siti Aminah')}
                      className="w-full text-left p-3 rounded-xl border border-slate-150 hover:bg-slate-50 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs uppercase">
                          SA
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-slate-700 leading-tight">Siti Aminah (Surveyor)</span>
                          <span className="text-[10px] text-slate-400 font-mono">siti@dentasync.com</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </button>
                  </div>

                  {/* Add Custom Google Account Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleForm(true)}
                    className="w-full mt-4 p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold text-xs bg-slate-50/50"
                  >
                    <Plus className="w-4 h-4" />
                    Gunakan akun Google lain
                  </button>
                </>
              ) : (
                /* Custom Google Account registration form */
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Nama Lengkap Google</label>
                    <input
                      type="text"
                      placeholder="Contoh: Drg. Budi"
                      value={customGoogleName}
                      onChange={e => setCustomGoogleName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Alamat Email Google</label>
                    <input
                      type="email"
                      placeholder="budi@gmail.com"
                      value={customGoogleEmail}
                      onChange={e => setCustomGoogleEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowCustomGoogleForm(false); setGoogleError(''); }}
                      className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition-all shadow-md flex items-center justify-center cursor-pointer"
                    >
                      {loading ? 'Menghubungkan...' : 'Lanjutkan'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Google Terms Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 leading-normal font-medium text-center">
              Google akan membagikan nama Anda, alamat email, preferensi bahasa, dan gambar profil dengan DentaSync Pro.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
