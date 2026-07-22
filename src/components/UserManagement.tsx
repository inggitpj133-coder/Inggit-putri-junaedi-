import React, { useState } from 'react';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  User, 
  Mail, 
  Check, 
  X, 
  AlertCircle, 
  UserCheck 
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserManagementProps {
  users: UserProfile[];
  onAddUser: (user: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  currentUser: UserProfile | null;
}

export default function UserManagement({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser
}: UserManagementProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'administrator' | 'surveyor' | 'analis'>('surveyor');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'surveyor' | 'analis'>('surveyor');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Create User
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nama dan email wajib diisi!');
      return;
    }

    // Simple email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Format email tidak valid!');
      return;
    }

    setLoading(true);
    try {
      await onAddUser({
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        role
      });
      setName('');
      setEmail('');
      setRole('surveyor');
      setSuccessMsg('Pengguna baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal menambahkan pengguna. Pastikan koneksi Firestore stabil.');
    } finally {
      setLoading(false);
    }
  };

  // Start Editing
  const startEdit = (user: UserProfile) => {
    setEditingId(user.id!);
    setEditName(user.displayName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Cancel Editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  // Handle Save Edit
  const handleSaveEdit = async (id: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!editName.trim() || !editEmail.trim()) {
      setErrorMsg('Nama dan email tidak boleh kosong saat diedit!');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(editEmail)) {
      setErrorMsg('Format email edit tidak valid!');
      return;
    }

    setLoading(true);
    try {
      await onUpdateUser(id, {
        displayName: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole
      });
      setEditingId(null);
      setSuccessMsg('Data pengguna berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal memperbarui data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete User
  const handleDelete = async (id: string, userName: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (currentUser && currentUser.id === id) {
      setErrorMsg('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"?`)) {
      setLoading(true);
      try {
        await onDeleteUser(id);
        setSuccessMsg(`Pengguna "${userName}" berhasil dihapus.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Gagal menghapus pengguna.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper to render role badge
  const renderRoleBadge = (userRole: 'administrator' | 'surveyor' | 'analis') => {
    let style = '';
    let label = '';
    if (userRole === 'administrator') {
      style = 'bg-rose-600 text-white border-rose-700';
      label = 'Administrator';
    } else if (userRole === 'surveyor') {
      style = 'bg-red-50 text-red-800 border-red-200';
      label = 'Surveyor (Pemeriksa)';
    } else {
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      label = 'Analis Data';
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        <Shield className="w-3 h-3" />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="user-management-root">
      {/* Alert Messaging */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold shadow-xs animate-fadeIn flex items-center gap-2" id="user-success-alert">
          <Check className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/25 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold shadow-xs animate-fadeIn flex items-center gap-2" id="user-error-alert">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel: Add / Register User */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-white/40 lg:col-span-1" id="register-user-panel">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-white/50 text-red-600 rounded-2xl border border-white/60 shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-red-950 tracking-tight">Tambah Pengguna Baru</h3>
              <p className="text-xs text-slate-500 font-medium">Registrasi hak akses & peran personil</p>
            </div>
          </div>

          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Contoh: drg. Ahmad Faisal"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Email (Identitas Login)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="Contoh: ahmad.faisal@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-slate-800 text-sm focus:outline-none transition-all placeholder-slate-400 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Peran Pengguna (Hak Akses)</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-800 text-sm font-bold focus:outline-none transition-all cursor-pointer"
              >
                <option value="administrator">Administrator (Akses Penuh)</option>
                <option value="surveyor">Surveyor (Input & Odontogram)</option>
                <option value="analis">Analis Data (Analisis & Ekspor)</option>
              </select>
              <div className="text-[10px] text-slate-500 mt-2 font-medium bg-white/20 p-2.5 rounded-xl border border-white/30 space-y-1">
                {role === 'administrator' && (
                  <p>👑 <strong>Administrator:</strong> Berwenang penuh mengelola pengguna, menghapus data, mengonfigurasi sesi, menginput pemeriksaan, dan menganalisis laporan.</p>
                )}
                {role === 'surveyor' && (
                  <p>📝 <strong>Surveyor:</strong> Berwenang menginput data pemeriksaan gigi responden, melihat daftar responden, dan menggunakan asisten suara asepsis.</p>
                )}
                {role === 'analis' && (
                  <p>📊 <strong>Analis Data:</strong> Berwenang mengakses dashboard visualisasi real-time, mengamati tabel epidemiologis, dan mengekspor laporan PDF/Excel.</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2 mt-4 cursor-pointer uppercase tracking-widest disabled:opacity-50"
              id="btn-add-user-submit"
            >
              <UserPlus className="w-4 h-4" /> 
              {loading ? 'Menyimpan...' : 'Daftarkan Pengguna'}
            </button>
          </form>
        </div>

        {/* Right List Panel: Users Table */}
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-white/40 lg:col-span-2" id="users-list-panel">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/50 text-red-600 rounded-2xl border border-white/60 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-950 tracking-tight">Daftar Pengguna Aktif</h3>
                <p className="text-xs text-slate-500 font-medium">Personil terdaftar dengan hak akses cloud</p>
              </div>
            </div>
            <span className="text-[10px] bg-red-100 text-red-700 border border-red-200/20 font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold shadow-2xs">
              {users.length} Personil
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/30 shadow-xs" id="users-table-wrapper">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/30 text-slate-600 border-b border-white/30 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 text-[10px]">Nama Pengguna</th>
                  <th className="py-3 px-4 text-[10px]">Email</th>
                  <th className="py-3 px-4 text-[10px]">Peran</th>
                  <th className="py-3 px-4 text-[10px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 text-slate-700 bg-white/10">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-bold">
                      Belum ada pengguna terdaftar. Sesi akan diisi default.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isEditing = editingId === user.id;
                    const isActive = currentUser && currentUser.id === user.id;

                    return (
                      <tr key={user.id} className={`hover:bg-white/20 transition-colors ${isActive ? 'bg-red-50/20' : ''}`}>
                        {/* Name Field */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <span>{user.displayName}</span>
                              {isActive && (
                                <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Aktif
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Email Field */}
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          ) : (
                            user.email
                          )}
                        </td>

                        {/* Role Field */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as any)}
                              className="px-2 py-1.5 bg-white border border-red-200 rounded-lg text-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                              <option value="administrator">Administrator</option>
                              <option value="surveyor">Surveyor</option>
                              <option value="analis">Analis</option>
                            </select>
                          ) : (
                            renderRoleBadge(user.role)
                          )}
                        </td>

                        {/* Actions Field */}
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(user.id!)}
                                disabled={loading}
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                                title="Simpan Perubahan"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => startEdit(user)}
                                className="p-1.5 bg-white/50 hover:bg-red-600 text-red-600 hover:text-white border border-white/50 rounded-lg transition-all cursor-pointer hover:scale-105 shadow-2xs"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(user.id!, user.displayName)}
                                disabled={isActive}
                                className={`p-1.5 border rounded-lg transition-all shadow-2xs ${
                                  isActive 
                                    ? 'opacity-30 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-white/50 hover:bg-rose-600 text-rose-600 hover:text-white border-white/50 cursor-pointer hover:scale-105'
                                }`}
                                title={isActive ? 'Tidak dapat menghapus diri sendiri' : 'Hapus Pengguna'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
