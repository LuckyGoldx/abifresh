'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Users, Plus, Edit, UserCheck, UserX, Users2, ShoppingCart, CreditCard, User, Eye, EyeOff, Trash2, Shield, Lock, RefreshCw } from 'lucide-react';
import type { Staff, StaffStats } from '@/types';

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!&';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const displayRoleName = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    'superadmin': 'Superadmin',
    'admin': 'Admin',
    'sales': 'Sales',
    'sales_staff': 'Sales Staff',
    'staff_commission': 'Commission',
    'commission_staff': 'Commission',
    'staff_non_commission': 'Non-commission',
    'non_commission_staff': 'Non-commission',
  };
  return roleMap[role] || role;
};

const formatRegistrationDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isToday) return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    if (isYesterday) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return dateString;
  }
};

const getRoleBadgeClass = (role: string): string => {
  switch (role) {
    case 'superadmin': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    case 'admin': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'sales_staff':
    case 'sales': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'commission_staff':
    case 'staff_commission': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    default: return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
  }
};

export default function SuperAdminStaffPage() {
  const { addToast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Staff> & { password?: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('registered');
  const [selectedRole, setSelectedRole] = useState('');
  const [staffStats, setStaffStats] = useState<StaffStats>({
    total: 0, superadmin: 0, admin: 0, sales_staff: 0, commission_staff: 0, non_commission_staff: 0,
  });
  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', username: '', phone_number: '', role: 'sales_staff', store_location: 'Jalingo',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    stage: 'first' | 'second' | null; staffId: string | null; staffName: string | null;
  }>({ stage: null, staffId: null, staffName: null });

  const generateUsernameFromEmail = (email: string) =>
    email.split('@')[0].replace(/\./g, '_').replace(/\s/g, '').toLowerCase();

  const handleEmailChange = (email: string) =>
    setFormData({ ...formData, email, username: generateUsernameFromEmail(email) });

  const handleUsernameChange = (username: string) =>
    setFormData({ ...formData, username: username.replace(/\s/g, '').toLowerCase() });

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      // Superadmin-specific endpoint — returns ALL users including superadmins
      const response = await api.get('/api/superadmin/staff');
      const allStaff: Staff[] = response.data || [];
      setStaff(allStaff);
      setStaffStats({
        total: allStaff.length,
        superadmin: allStaff.filter(s => s.role === 'superadmin').length,
        admin: allStaff.filter(s => s.role === 'admin').length,
        sales_staff: allStaff.filter(s => s.role === 'sales_staff' || s.role === 'sales').length,
        commission_staff: allStaff.filter(s => s.role === 'commission_staff' || s.role === 'staff_commission').length,
        non_commission_staff: allStaff.filter(s => s.role === 'non_commission_staff' || s.role === 'staff_non_commission').length,
      });
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password || formData.password.trim() === '') {
      addToast('Password is required', 'error');
      return;
    }
    try {
      await api.post('/api/admin/staff/create', formData);
      setShowAddForm(false);
      setFormData({ email: '', password: '', full_name: '', username: '', phone_number: '', role: 'sales_staff', store_location: 'Jalingo' });
      setShowPassword(false);
      fetchStaff();
      addToast('Staff created successfully', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to add staff', 'error');
    }
  };

  const handleEditClick = (member: Staff) => {
    setEditingMemberId(member.id);
    setShowEditPassword(false);
    setEditFormData({ full_name: member.full_name, username: member.username, email: member.email, phone_number: member.phone_number || '', role: member.role, store_location: member.store_location, password: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingMemberId) return;
    try {
      await api.put(`/api/admin/staff/${editingMemberId}`, editFormData);
      setEditingMemberId(null);
      setEditFormData({});
      setShowEditPassword(false);
      fetchStaff();
      addToast('Staff updated successfully', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to update staff', 'error');
    }
  };

  const handleCancelEdit = () => { setEditingMemberId(null); setEditFormData({}); setShowEditPassword(false); };

  const handleToggleStatus = async (memberId: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return;
    try {
      await api.put(`/api/admin/staff/${memberId}/${action}`, {});
      fetchStaff();
      addToast(`Staff member ${action}d successfully`, 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || `Failed to ${action} staff`, 'error');
    }
  };

  const handleDeleteClick = (memberId: string, memberName: string) =>
    setDeleteConfirmation({ stage: 'first', staffId: memberId, staffName: memberName });

  const handleDeleteConfirmFirst = () =>
    setDeleteConfirmation(prev => ({ ...prev, stage: 'second' }));

  const handleDeleteCancel = () =>
    setDeleteConfirmation({ stage: null, staffId: null, staffName: null });

  const handleDeleteConfirmSecond = async () => {
    if (!deleteConfirmation.staffId) return;
    try {
      await api.delete(`/api/admin/staff/${deleteConfirmation.staffId}`);
      setDeleteConfirmation({ stage: null, staffId: null, staffName: null });
      fetchStaff();
      addToast('Staff member deleted successfully', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to delete staff', 'error');
    }
  };

  const getFilteredAndSortedStaff = () => {
    let result = staff;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.username.toLowerCase().includes(q) || m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) || (m.phone_number && m.phone_number.toLowerCase().includes(q))
      );
    }
    if (selectedRole) result = result.filter(m => m.role === selectedRole);
    if (sortBy === 'registered') {
      result = [...result].sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    } else if (sortBy === 'role') {
      const roleOrder: { [key: string]: number } = { superadmin: 0, admin: 1, commission_staff: 2, staff_commission: 2, sales_staff: 3, sales: 3, non_commission_staff: 4, staff_non_commission: 4 };
      result = [...result].sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));
    }
    return result;
  };

  const filteredStaff = getFilteredAndSortedStaff();

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <img src="/favicon.svg" alt="" className="w-20 h-20" />
        </div>
        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
          <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold">Abifreshing...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-blue-600 dark:text-blue-300">Total</p><p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{staffStats.total}</p></div>
            <Users className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-purple-600 dark:text-purple-300">Superadmin</p><p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{staffStats.superadmin}</p></div>
            <Shield className="w-12 h-12 text-purple-400 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-red-600 dark:text-red-300">Admin</p><p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">{staffStats.admin}</p></div>
            <Users2 className="w-12 h-12 text-red-400 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-green-600 dark:text-green-300">Sales</p><p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{staffStats.sales_staff}</p></div>
            <ShoppingCart className="w-12 h-12 text-green-400 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Commission</p><p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100 mt-2">{staffStats.commission_staff}</p></div>
            <CreditCard className="w-12 h-12 text-indigo-400 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-yellow-600 dark:text-yellow-300">Non-Commission</p><p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">{staffStats.non_commission_staff}</p></div>
            <User className="w-12 h-12 text-yellow-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-pink-500" />
          Staff Management
        </h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Staff
        </button>
      </div>

      {showAddForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input" placeholder="e.g., John Sales" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => handleEmailChange(e.target.value)} className="input" required />
              <p className="text-xs text-gray-500 mt-1">💡 Username will be auto-generated from email</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" value={formData.username} onChange={(e) => handleUsernameChange(e.target.value)} className="input" placeholder="auto-generated from email" />
              <p className="text-xs text-gray-500 mt-1">💡 Will auto-generate from email. Edit to customize. No spaces allowed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="input" placeholder="+234 8000000000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input pr-10" placeholder="Enter a secure password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input">
                <option value="sales_staff">Sales Staff</option>
                <option value="commission_staff">Commission Staff</option>
                <option value="non_commission_staff">Non-commission Staff</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Store Location</label>
              <input type="text" value={formData.store_location} onChange={(e) => setFormData({ ...formData, store_location: e.target.value })} className="input" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create Staff</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="mb-6 space-y-4">
          <div>
            <input type="text" placeholder="🔍 Search by username, full name, email, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Found {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Role</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white">
                <option value="">All Roles</option>
                <option value="superadmin">Superadmin</option>
                <option value="admin">Admin</option>
                <option value="sales_staff">Sales Staff</option>
                <option value="commission_staff">Commission Staff</option>
                <option value="non_commission_staff">Non-commission Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white">
                <option value="registered">Date Registered (Newest First)</option>
                <option value="role">Role</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">Full Name</th>
                <th className="text-left py-3 px-4">Username</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Location</th>
                <th className="text-left py-3 px-4">Registered</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input type="text" value={editFormData.full_name} onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })} className="input text-sm" />
                    ) : (
                      <span className="flex items-center gap-1">
                        {member.role === 'superadmin' && <Shield className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                        {member.full_name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input type="text" value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} className="input text-sm" placeholder="username (no spaces)" />
                    ) : (
                      <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm">{member.username}</code>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="input text-sm" />
                    ) : member.email}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input type="tel" value={editFormData.phone_number} onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })} className="input text-sm" placeholder="+234" />
                    ) : <span>{member.phone_number || '-'}</span>}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} className="input text-sm">
                        <option value="sales_staff">Sales Staff</option>
                        <option value="commission_staff">Commission Staff</option>
                        <option value="non_commission_staff">Non-commission Staff</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                        {displayRoleName(member.role)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input type="text" value={editFormData.store_location} onChange={(e) => setEditFormData({ ...editFormData, store_location: e.target.value })} className="input text-sm" />
                    ) : member.store_location}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formatRegistrationDate(member.created_at!)}</span>
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <div className="space-y-2 min-w-[220px]">
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded px-2 py-1">
                          <Lock className="w-3 h-3 flex-shrink-0" />
                          <span>Passwords are hashed — cannot be read back</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium">Set New Password</label>
                          <button
                            type="button"
                            onClick={() => {
                              const pwd = generateRandomPassword();
                              setEditFormData({ ...editFormData, password: pwd });
                              setShowEditPassword(true);
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Generate random password"
                          >
                            <RefreshCw className="w-3 h-3" /> Generate
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            value={editFormData.password || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                            className="input text-sm pr-10"
                            placeholder="Leave blank to keep current"
                          />
                          <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                            {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={member.is_active ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 font-medium">Save</button>
                        <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditClick(member)} className="text-blue-600 hover:text-blue-800" title="Edit staff"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleStatus(member.id, member.is_active!)} className={member.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} title={member.is_active ? 'Deactivate' : 'Activate'}>
                          {member.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteClick(member.id, member.full_name)} className="text-red-600 hover:text-red-800" title="Delete staff"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmation.stage === 'first' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Staff Member?</h3>
            <p className="text-gray-600 dark:text-gray-300">Are you sure you want to delete <strong>{deleteConfirmation.staffName}</strong>?</p>
            <p className="text-sm text-red-600 dark:text-red-400">⚠️ This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleDeleteCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 transition">Cancel</button>
              <button onClick={handleDeleteConfirmFirst} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation.stage === 'second' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">⚠️ FINAL CONFIRMATION</h3>
            <p className="text-gray-600 dark:text-gray-300">This is your final chance to cancel. Deleting <strong>{deleteConfirmation.staffName}</strong> is permanent and irreversible.</p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Click "Permanently Delete" only if you are absolutely certain.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleDeleteCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 transition">Cancel & Go Back</button>
              <button onClick={handleDeleteConfirmSecond} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-bold">Permanently Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
