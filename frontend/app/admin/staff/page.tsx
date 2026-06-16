'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Users, Plus, Edit, UserCheck, UserX, Users2, ShoppingCart, CreditCard, User, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Staff, StaffStats } from '@/types';
import { AbifreshLoading } from '@/components/AbifreshLoading';
import { useAlert } from '@/context/AlertContext';

// Helper function to display role names nicely
const displayRoleName = (role: string): string => {
  const roleMap: { [key: string]: string } = {
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

// Helper function to format date
const formatRegistrationDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + 
             ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch {
    return dateString;
  }
};

export default function StaffManagementPage() {
  const { addToast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Staff> & { password?: string }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('registered'); // 'registered' or role
  const [selectedRole, setSelectedRole] = useState<string>(''); // empty = all roles
  const [staffStats, setStaffStats] = useState<StaffStats>({
    total: 0,
    sales_staff: 0,
    commission_staff: 0,
    non_commission_staff: 0,
    admin: 0,
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    username: '',
    phone_number: '',
    role: 'sales_staff',
    store_location: 'Jalingo',
  });
  const [showPassword, setShowPassword] = useState(false); // Password visibility toggle
  const [showEditPassword, setShowEditPassword] = useState(false); // Edit password visibility toggle
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ stage: 'first' | 'second' | null; staffId: string | null; staffName: string | null }>({
    stage: null,
    staffId: null,
    staffName: null,
  });
  const { alert: showAlert, confirm: showConfirm } = useAlert();

  // Function to generate username from email
  const generateUsernameFromEmail = (email: string): string => {
    if (!email) return '';
    // Extract part before @ and convert to lowercase, replace dots with underscores, remove spaces
    return email.split('@')[0].replace(/\./g, '_').replace(/\s/g, '').toLowerCase();
  };

  // Handle email change and auto-generate username
  const handleEmailChange = (email: string) => {
    const generatedUsername = generateUsernameFromEmail(email);
    setFormData({ ...formData, email, username: generatedUsername });
  };

  // Handle username change with space validation
  const handleUsernameChange = (username: string) => {
    // Remove spaces from username and convert to lowercase
    const cleanUsername = username.replace(/\s/g, '').toLowerCase();
    setFormData({ ...formData, username: cleanUsername });
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/admin/staff');
      // Exclude superadmin users and internal demo/system accounts from admin staff view
      const HIDDEN_EMAILS = ['staff@abifresh.com', 'commission@abifresh.com', 'sales.@abifresh.com'];
      const nonSuperadminStaff = response.data.filter(
        (s: Staff) => s.role !== 'superadmin' && !HIDDEN_EMAILS.includes(s.email.toLowerCase())
      );
      setStaff(nonSuperadminStaff);
      
      // Calculate stats (excluding superadmin)
      const stats: StaffStats = {
        total: nonSuperadminStaff.length,
        sales_staff: nonSuperadminStaff.filter((s: Staff) => s.role === 'sales_staff').length,
        commission_staff: nonSuperadminStaff.filter((s: Staff) => s.role === 'commission_staff').length,
        non_commission_staff: nonSuperadminStaff.filter((s: Staff) => s.role === 'non_commission_staff').length,
        admin: nonSuperadminStaff.filter((s: Staff) => s.role === 'admin').length,
      };
      setStaffStats(stats);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation for password
    if (!formData.password || formData.password.trim() === '') {
      addToast('Password is required and cannot be empty', 'error');
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
    setEditFormData({
      full_name: member.full_name,
      username: member.username,
      email: member.email,
      phone_number: member.phone_number || '',
      role: member.role,
      store_location: member.store_location,
      password: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMemberId) return;

    try {
      console.log(`Saving staff ${editingMemberId}:`, editFormData);
      await api.put(`/api/admin/staff/${editingMemberId}`, editFormData);
      setEditingMemberId(null);
      setEditFormData({});
      setShowEditPassword(false);
      fetchStaff();
      addToast('Staff updated successfully', 'success');
    } catch (error: any) {
      console.error('Save edit error:', error);
      addToast(error.response?.data?.error || 'Failed to update staff', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditFormData({});
    setShowEditPassword(false);
  };

  const handleToggleStatus = async (memberId: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (!(await showConfirm(`Are you sure you want to ${action} this staff member?`))) return;

    try {
      console.log(`${action} staff ${memberId}`);
      if (isActive) {
        await api.put(`/api/admin/staff/${memberId}/deactivate`, {});
      } else {
        await api.put(`/api/admin/staff/${memberId}/activate`, {});
      }
      fetchStaff();
      addToast(`Staff member ${action}d successfully`, 'success');
    } catch (error: any) {
      console.error(`${action} error:`, error);
      addToast(error.response?.data?.error || `Failed to ${action} staff`, 'error');
    }
  };

  const handleDeleteClick = (memberId: string, memberName: string) => {
    setDeleteConfirmation({ stage: 'first', staffId: memberId, staffName: memberName });
  };

  const handleDeleteConfirmFirst = () => {
    setDeleteConfirmation(prev => ({ ...prev, stage: 'second' }));
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ stage: null, staffId: null, staffName: null });
  };

  const handleDeleteConfirmSecond = async () => {
    if (!deleteConfirmation.staffId) return;

    try {
      await api.delete(`/api/admin/staff/${deleteConfirmation.staffId}`);
      setDeleteConfirmation({ stage: null, staffId: null, staffName: null });
      fetchStaff();
      addToast('Staff member deleted successfully', 'success');
    } catch (error: any) {
      console.error('Delete error:', error);
      addToast(error.response?.data?.error || 'Failed to delete staff', 'error');
    }
  };

  // Filter staff based on search query and role
  const getFilteredAndSortedStaff = () => {
    let result = staff;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(member =>
        member.username.toLowerCase().includes(query) ||
        member.full_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        (member.phone_number && member.phone_number.toLowerCase().includes(query))
      );
    }

    // Filter by role
    if (selectedRole) {
      result = result.filter(member => member.role === selectedRole);
    }

    // Sort
    if (sortBy === 'registered') {
      result.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    } else if (sortBy === 'role') {
      const roleOrder: { [key: string]: number } = {
        'admin': 0,
        'commission_staff': 1,
        'sales_staff': 2,
        'non_commission_staff': 3,
      };
      result.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));
    }

    return result;
  };

  const filteredStaff = getFilteredAndSortedStaff();

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      {/* Staff Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Staff Card */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Total Staff</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{staffStats.total}</p>
            </div>
            <Users className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </div>

        {/* Sales Staff Card */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-300">Sales Staff</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{staffStats.sales_staff}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-green-400 opacity-50" />
          </div>
        </div>

        {/* Commission Staff Card */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Commission Staff</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{staffStats.commission_staff}</p>
            </div>
            <CreditCard className="w-12 h-12 text-purple-400 opacity-50" />
          </div>
        </div>

        {/* Non-Commission Staff Card */}
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-300">Non-Commission</p>
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">{staffStats.non_commission_staff}</p>
            </div>
            <User className="w-12 h-12 text-yellow-400 opacity-50" />
          </div>
        </div>

        {/* Admin Card */}
        <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-300">Admin</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">{staffStats.admin}</p>
            </div>
            <Users2 className="w-12 h-12 text-red-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-pink-500" />
          Staff Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input"
                placeholder="e.g., John Sales"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">💡 Username will be auto-generated from email</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="input"
                placeholder="auto-generated from email"
              />
              <p className="text-xs text-gray-500 mt-1">💡 Will auto-generate from email. Edit to customize. No spaces allowed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="input"
                placeholder="+234 8000000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="Enter a secure password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input"
              >
                <option value="sales_staff">Sales Staff</option>
                <option value="commission_staff">Commission Staff</option>
                <option value="non_commission_staff">Non-commission Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Store Location</label>
              <input
                type="text"
                value={formData.store_location}
                onChange={(e) => setFormData({ ...formData, store_location: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create Staff</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search by username, full name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Found {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
              </p>
            )}
            {filteredStaff.length === 0 && searchQuery && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">No staff members found</p>
            )}
          </div>

          {/* Filters and Sorting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="sales_staff">Sales Staff</option>
                <option value="commission_staff">Commission Staff</option>
                <option value="non_commission_staff">Non-commission Staff</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
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
                      <input
                        type="text"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        className="input text-sm"
                      />
                    ) : (
                      member.full_name
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input
                        type="text"
                        value={editFormData.username}
                        onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                        className="input text-sm"
                        placeholder="username (no spaces)"
                      />
                    ) : (
                      <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm">{member.username}</code>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="input text-sm"
                      />
                    ) : (
                      member.email
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input
                        type="tel"
                        value={editFormData.phone_number}
                        onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                        className="input text-sm"
                        placeholder="+234"
                      />
                    ) : (
                      <span>{member.phone_number || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="input text-sm"
                      >
                        <option value="sales_staff">Sales Staff</option>
                        <option value="commission_staff">Commission Staff</option>
                        <option value="non_commission_staff">Non-commission Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded text-xs">
                        {displayRoleName(member.role)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <input
                        type="text"
                        value={editFormData.store_location}
                        onChange={(e) => setEditFormData({ ...editFormData, store_location: e.target.value })}
                        className="input text-sm"
                      />
                    ) : (
                      member.store_location
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatRegistrationDate(member.created_at!)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {editingMemberId === member.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">New Password (optional)</label>
                          <div className="relative">
                            <input
                              type={showEditPassword ? 'text' : 'password'}
                              value={editFormData.password || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                              className="input text-sm pr-10"
                              placeholder="Leave blank to keep current"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                              title={showEditPassword ? 'Hide password' : 'Show password'}
                            >
                              {showEditPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
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
                        <button 
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800 font-medium"
                          title="Save changes"
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                          title="Cancel edit"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(member.id, member.is_active!)}
                          className={member.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                          title={member.is_active ? 'Deactivate staff' : 'Activate staff'}
                        >
                          {member.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(member.id, member.full_name)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* First Delete Confirmation Modal */}
      {deleteConfirmation.stage === 'first' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Staff Member?</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong>{deleteConfirmation.staffName}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              ⚠️ This action cannot be undone. All staff data will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmFirst}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Delete Confirmation Modal (Final Confirmation) */}
      {deleteConfirmation.stage === 'second' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">⚠️ FINAL CONFIRMATION</h3>
            <p className="text-gray-600 dark:text-gray-300">
              This is your final chance to cancel. Deleting <strong>{deleteConfirmation.staffName}</strong> is permanent and irreversible.
            </p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Click "Permanently Delete" below only if you are absolutely certain.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
              >
                Cancel & Go Back
              </button>
              <button
                onClick={handleDeleteConfirmSecond}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-bold"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
