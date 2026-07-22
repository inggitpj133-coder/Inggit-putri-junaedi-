import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileDown, 
  TrendingUp, 
  PlusCircle, 
  TableProperties, 
  CloudSun, 
  Sparkles,
  Award,
  Users,
  LogOut
} from 'lucide-react';
import { collection, doc, addDoc, onSnapshot, query, deleteDoc, getDocs, writeBatch, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { RespondentData, UserProfile } from './types';
import { exportToExcel, exportToPdf, generateMockRespondents, generate29UniqueRespondents } from './lib/surveyEngine';

// Subcomponents
import Dashboard from './components/Dashboard';
import DentalForm from './components/DentalForm';
import RespondentsList from './components/RespondentsList';
import SessionManager from './components/SessionManager';
import UserManagement from './components/UserManagement';
import Login from './components/Login';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input' | 'data' | 'cloud' | 'users'>('dashboard');
  
  // Session Configuration
  const [currentSessionId, setCurrentSessionId] = useState('stan-pemeriksaan-gigi-30-oktober-2025');
  const [currentSessionName, setCurrentSessionName] = useState('Stan Pemeriksaan Gigi 30 Oktober 2025');
  const [sessionPasscode, setSessionPasscode] = useState('123456');
  
  const [respondents, setRespondents] = useState<RespondentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & User State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Seeding default users if database is empty
  const seedDefaultUsers = async () => {
    try {
      const defaultUsers: Omit<UserProfile, 'id'>[] = [
        {
          displayName: 'Inggit PJ (Super Admin)',
          email: 'inggitpj133@gmail.com',
          role: 'administrator',
          createdAt: new Date().toISOString()
        },
        {
          displayName: 'Admin DentaSync',
          email: 'admin@dentasync.com',
          role: 'administrator',
          createdAt: new Date().toISOString()
        },
        {
          displayName: 'Siti Surveyor',
          email: 'surveyor@dentasync.com',
          role: 'surveyor',
          createdAt: new Date().toISOString()
        },
        {
          displayName: 'Budi Analis',
          email: 'analyst@dentasync.com',
          role: 'analis',
          createdAt: new Date().toISOString()
        }
      ];

      const batch = writeBatch(db);
      defaultUsers.forEach((u) => {
        const docRef = doc(collection(db, 'users'));
        batch.set(docRef, u);
      });
      await batch.commit();
    } catch (err) {
      console.error("Gagal melakukan seeding default users:", err);
    }
  };

  // Sync users collection
  useEffect(() => {
    const colRef = collection(db, 'users');
    const unsubscribe = onSnapshot(colRef, async (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
        } as UserProfile);
      });
      
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(list);

      if (snapshot.empty && list.length === 0) {
        await seedDefaultUsers();
      } else {
        // Double check if inggitpj133@gmail.com exists, otherwise add her as super admin
        const hasInggit = list.some(u => u.email === 'inggitpj133@gmail.com');
        if (!hasInggit) {
          try {
            const inggitRef = doc(collection(db, 'users'));
            await setDoc(inggitRef, {
              displayName: 'Inggit PJ (Super Admin)',
              email: 'inggitpj133@gmail.com',
              role: 'administrator',
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            console.error("Gagal menambahkan super admin secara dinamis:", err);
          }
        } else {
          // If inggit exists but is not an administrator, let's update her to be administrator
          const inggitUser = list.find(u => u.email === 'inggitpj133@gmail.com');
          if (inggitUser && inggitUser.role !== 'administrator') {
            try {
              const inggitRef = doc(db, 'users', inggitUser.id!);
              await updateDoc(inggitRef, { role: 'administrator' });
            } catch (err) {
              console.error("Gagal memperbarui peran super admin:", err);
            }
          }
        }
      }
    }, (error) => {
      console.error("Gagal mendengarkan data pengguna:", error);
    });

    return () => unsubscribe();
  }, []);

  // Handle active user persistence and selection
  useEffect(() => {
    if (users.length > 0 && isAuthenticated && !currentUser) {
      const savedId = localStorage.getItem('activeUserId');
      const savedUser = users.find(u => u.id === savedId);
      const inggitUser = users.find(u => u.email === 'inggitpj133@gmail.com');
      
      const defaultUser = savedUser || inggitUser || users.find(u => u.role === 'administrator') || users[0];
      setCurrentUser(defaultUser);
      localStorage.setItem('activeUserId', defaultUser.id!);
    }
  }, [users, currentUser, isAuthenticated]);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('activeUserId', user.id!);
    localStorage.setItem('isLoggedIn', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('activeUserId');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleRegisterAndLogin = async (name: string, email: string, role: 'administrator' | 'surveyor' | 'analis') => {
    try {
      const colRef = collection(db, 'users');
      const docRef = await addDoc(colRef, {
        displayName: name,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });
      const newUser: UserProfile = {
        id: docRef.id,
        displayName: name,
        email: email,
        role: role
      };
      handleLogin(newUser);
    } catch (err) {
      console.error("Gagal mendaftarkan akun dari login:", err);
      throw err;
    }
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('activeUserId', user.id!);
    
    // Auto-switch tabs if the current tab is not allowed for the new role
    if (user.role === 'surveyor') {
      if (activeTab === 'cloud' || activeTab === 'users') {
        setActiveTab('dashboard');
      }
    } else if (user.role === 'analis') {
      if (activeTab === 'input' || activeTab === 'cloud' || activeTab === 'users') {
        setActiveTab('dashboard');
      }
    }
  };

  // User Actions
  const handleAddUser = async (newUserData: Omit<UserProfile, 'id' | 'createdAt'>) => {
    try {
      const colRef = collection(db, 'users');
      await addDoc(colRef, {
        ...newUserData,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Gagal menambahkan pengguna:", err);
      throw err;
    }
  };

  const handleUpdateUser = async (id: string, updatedFields: Partial<UserProfile>) => {
    try {
      const docRef = doc(db, 'users', id);
      const { id: _, ...payload } = updatedFields;
      await updateDoc(docRef, payload);
      
      if (currentUser && currentUser.id === id) {
        setCurrentUser(prev => prev ? { ...prev, ...updatedFields } : null);
      }
    } catch (err) {
      console.error("Gagal memperbarui pengguna:", err);
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const docRef = doc(db, 'users', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Gagal menghapus pengguna:", err);
      throw err;
    }
  };

  // Sync to Cloud Firestore when Session ID changes
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
    const q = query(colRef);

    // Setup real-time listener
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list: RespondentData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
        } as RespondentData);
      });

      if (snapshot.empty) {
        // Auto-seed 29 unique respondents with diverse identities and dental cases
        try {
          const mock29 = generate29UniqueRespondents();
          const batch = writeBatch(db);
          mock29.forEach((item) => {
            const newDocRef = doc(colRef);
            const { id, ...payload } = item;
            batch.set(newDocRef, {
              ...payload,
              createdAt: new Date().toISOString(),
              createdBy: 'inggitpj133@gmail.com'
            });
          });
          await batch.commit();
        } catch (err) {
          console.error("Gagal melakukan auto-seed 29 responden:", err);
          setLoading(false);
        }
      } else {
        setRespondents(list);
        setLoading(false);
      }
    }, (error) => {
      console.error("Gagal mendengarkan data dari cloud:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentSessionId]);

  // Cloud Actions
  const handleSaveRespondent = async (data: Omit<RespondentData, 'id' | 'createdAt' | 'createdBy'>) => {
    if (currentUser?.role !== 'administrator' && currentUser?.role !== 'surveyor') {
      alert("Akses Ditolak: Peran Anda tidak memiliki hak untuk menginput pemeriksaan gigi.");
      return;
    }
    try {
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      await addDoc(colRef, {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.email || 'Anonim' // Current active user email as auditor
      });
    } catch (err) {
      console.error("Gagal menyimpan responden:", err);
      throw err;
    }
  };

  const handleDeleteRespondent = async (id: string) => {
    if (currentUser?.role !== 'administrator') {
      alert("Akses Ditolak: Hanya Administrator yang diizinkan untuk menghapus data.");
      return;
    }
    try {
      const docRef = doc(db, 'sessions', currentSessionId, 'respondents', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Gagal menghapus responden:", err);
      throw err;
    }
  };

  const handleLoadMockData = async (mockData: RespondentData[]) => {
    if (currentUser?.role !== 'administrator') {
      alert("Akses Ditolak: Hanya Administrator yang diizinkan untuk memuat data simulasi.");
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      
      mockData.forEach((item) => {
        const newDocRef = doc(colRef); // Auto-generate ID in subcollection
        // Save without ID property as it becomes the doc name
        const { id, ...payload } = item;
        batch.set(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.email || 'Admin-Mock'
        });
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Gagal mengunggah data kustom:", err);
      alert("Gagal mengunggah data ke Cloud.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSessionData = async () => {
    if (currentUser?.role !== 'administrator') {
      alert("Akses Ditolak: Hanya Administrator yang diizinkan untuk menghapus semua data.");
      return;
    }
    setLoading(true);
    try {
      const colRef = collection(db, 'sessions', currentSessionId, 'respondents');
      const qSnapshot = await getDocs(colRef);
      
      const batch = writeBatch(db);
      qSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Gagal membersihkan data:", err);
      alert("Gagal mengosongkan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (id: string, name: string, passcode: string) => {
    setCurrentSessionId(id);
    setCurrentSessionName(name);
    setSessionPasscode(passcode);
    setActiveTab('dashboard');
  };

  // Trigger Exports
  const triggerPdfExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke PDF!");
      return;
    }
    exportToPdf(respondents, currentSessionName);
  };

  const triggerExcelExport = () => {
    if (respondents.length === 0) {
      alert("Tidak ada data untuk diekspor ke Excel!");
      return;
    }
    exportToExcel(respondents, currentSessionName);
  };

  if (!isAuthenticated) {
    return (
      <Login 
        users={users} 
        onLogin={handleLogin} 
        onRegisterAndLogin={handleRegisterAndLogin} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 font-sans" id="app-root">
      
      {/* Top Banner & Title Bar */}
      <header className="glass-panel border-b border-white/30 sticky top-0 z-40 shadow-lg shadow-indigo-900/5 backdrop-blur-xl" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Brand Area */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                <FileSpreadsheet className="w-5.5 h-5.5" />
              </div>
              <div>
                <h1 className="text-md sm:text-lg font-black text-slate-900 tracking-tight leading-tight">DentaSync Pro</h1>
                <p className="text-[10px] text-red-600 font-bold tracking-wide">Aplikasi Survey Kesehatan Gigi & Mulut</p>
              </div>
            </div>

            {/* Right Export / Status Area */}
            <div className="flex items-center gap-3">
              {respondents.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerPdfExport}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/50 hover:bg-white/80 border border-white/50 backdrop-blur-md text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    title="Unduh Laporan PDF Lengkap"
                    id="btn-global-export-pdf"
                  >
                    <FileDown className="w-4 h-4 text-rose-500" />
                    <span className="hidden sm:inline">Ekspor PDF</span>
                  </button>

                  <button
                    onClick={triggerExcelExport}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/50 hover:bg-white/80 border border-white/50 backdrop-blur-md text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                    title="Unduh Data Excel Mentah"
                    id="btn-global-export-excel"
                  >
                    <FileDown className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">Ekspor Excel</span>
                  </button>
                </div>
              )}

              {/* Connected Cloud Pill */}
              <div className="hidden md:flex items-center gap-1.5 bg-red-50/50 backdrop-blur-md border border-red-100/40 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-extrabold text-red-700 uppercase tracking-widest font-mono">Cloud Synced</span>
              </div>

              {/* Active User Profile & LogOut */}
              <div className="flex items-center gap-3 border-l border-slate-200/60 pl-3 ml-1" id="active-user-profile-header">
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-black text-slate-900 truncate max-w-[140px] leading-tight">
                    {currentUser ? currentUser.displayName : 'Memuat...'}
                  </span>
                  <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-wider">
                    {currentUser ? (
                      currentUser.role === 'administrator' ? '🛡️ Admin' :
                      currentUser.role === 'surveyor' ? '📝 Surveyor' : '📊 Analis'
                    ) : ''}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition-all cursor-pointer hover:scale-[1.05]"
                  title="Keluar dari Akun"
                  id="btn-global-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs and Session Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-white/35 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm" id="navigation-bar">
          
          {/* Navigation Controls */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
              id="tab-dashboard"
            >
              <TrendingUp className="w-4 h-4" /> Analisis Real-Time
            </button>

            {(currentUser?.role === 'administrator' || currentUser?.role === 'surveyor') && (
              <button
                onClick={() => setActiveTab('input')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'input' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
                id="tab-input"
              >
                <PlusCircle className="w-4 h-4" /> Input Pemeriksaan
              </button>
            )}

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'data' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
              id="tab-data"
            >
              <TableProperties className="w-4 h-4" /> Data Responden
            </button>

            {currentUser?.role === 'administrator' && (
              <button
                onClick={() => setActiveTab('cloud')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'cloud' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
                id="tab-cloud"
              >
                <CloudSun className="w-4 h-4" /> Koneksi Cloud
              </button>
            )}

            {currentUser?.role === 'administrator' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'users' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
                id="tab-users"
              >
                <Users className="w-4 h-4" /> Manajemen Pengguna
              </button>
            )}
          </div>

          {/* Current Session Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white/45 backdrop-blur-md border border-white/50 rounded-xl shadow-xs">
            <Users className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-[200px]" title={currentSessionName}>
              Sesi: <strong className="font-bold text-red-900">{currentSessionName}</strong>
            </span>
          </div>

        </div>

        {/* Loading Overlay */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg" id="loader-view">
            <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-slate-700 text-sm mt-4 font-bold">Sinkronisasi data dengan Firestore Cloud...</p>
          </div>
        ) : (
          <div className="animate-fadeIn" id="tab-content-area">
            {/* Tab Rendering */}
            {activeTab === 'dashboard' && (
              <Dashboard respondents={respondents} />
            )}

            {activeTab === 'input' && (
              <DentalForm 
                onSaveRespondent={handleSaveRespondent} 
                nextRespondentNumber={respondents.length + 1} 
              />
            )}

            {activeTab === 'data' && (
              <RespondentsList 
                respondents={respondents} 
                onDeleteRespondent={handleDeleteRespondent} 
                currentUserRole={currentUser?.role}
              />
            )}

            {activeTab === 'cloud' && currentUser?.role === 'administrator' && (
              <SessionManager
                currentSessionId={currentSessionId}
                currentSessionName={currentSessionName}
                sessionPasscode={sessionPasscode}
                onJoinSession={handleJoinSession}
                onLoadMockData={handleLoadMockData}
                onClearSessionData={handleClearSessionData}
                respondentsCount={respondents.length}
              />
            )}

            {activeTab === 'users' && currentUser?.role === 'administrator' && (
              <UserManagement
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
              />
            )}
          </div>
        )}

      </main>

      {/* Mini App Footer */}
      <footer className="text-center py-8 text-xs text-slate-500 font-semibold" id="app-footer">
        <p>DentaSync Pro • Dilengkapi dengan Sinkronisasi Cloud Firestore & Ekspor Data Klinis</p>
      </footer>

    </div>
  );
}
