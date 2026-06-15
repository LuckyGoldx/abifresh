'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/auth';
import { Users, UserPlus, UserCheck, UserX, Edit, Trash2, Search, MoreVertical, Shield, ShieldOff, Key, X } from 'lucide-react';
import { AbifreshLoading } from '@/components/AbifreshLoading';

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  username: string;
  phone_number?: string;
  role: string;
  is_active: boolean;
  store_location: string;
  created_at: string;
  updated_at: string;
}

export default function SuperAdminUsersPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchUsers();
  }, [token]);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus ? `/api/admin/staff/${userId}/deactivate` : `/api/admin/staff/${userId}/activate`;
      await api.put(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.is_active) || 
      (statusFilter === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleColors: { [key: string]: string } = {
    admin: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    superadmin: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    sales: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    sales_staff: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    commission_staff: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    staff_commission: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    non_commission_staff: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    staff_non_commission: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  };

  const uniqueRoles = [...new Set(users.map(u => u.role))];

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-purple-200 text-sm">View, manage, and control all user accounts</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center overflow-hidden">
          <Users className="w-8 h-8 text-violet-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{users.length}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>
        <div className="card text-center overflow-hidden">
          <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{users.filter(u => u.is_active).length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>
        <div className="card text-center overflow-hidden">
          <UserX className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{users.filter(u => !u.is_active).length}</p>
          <p className="text-sm text-gray-500">Inactive</p>
        </div>
        <div className="card text-center overflow-hidden">
          <Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-800 dark:text-white break-words">{uniqueRoles.length}</p>
          <p className="text-sm text-gray-500">Roles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="Search by name, username, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
            <option value="">All Roles</option>
            {uniqueRoles.map(role => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-white">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Username</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Location</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Joined</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{user.full_name?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">@{user.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${roleColors[user.role] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                      {user.role?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.store_location}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedUser(user); setShowUserDetail(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition" title="View details">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`p-2 rounded-lg transition ${user.is_active ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900'}`}
                        title={user.is_active ? 'Deactivate' : 'Activate'}>
                        {user.is_active ? <ShieldOff size={16} /> : <Shield size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">No users match your filters</div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-white">User Details</h2>
              <button onClick={() => setShowUserDetail(false)} className="text-white hover:text-purple-200 transition"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{selectedUser.full_name?.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.full_name}</h3>
                  <p className="text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              {[
                { label: 'Email', value: selectedUser.email },
                { label: 'Phone', value: selectedUser.phone_number || 'N/A' },
                { label: 'Role', value: selectedUser.role?.replace(/_/g, ' ') },
                { label: 'Status', value: selectedUser.is_active ? 'Active' : 'Inactive' },
                { label: 'Location', value: selectedUser.store_location },
                { label: 'Joined', value: new Date(selectedUser.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'Last Updated', value: new Date(selectedUser.updated_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{item.value}</span>
                </div>
              ))}
              <button onClick={() => setShowUserDetail(false)} className="w-full mt-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
