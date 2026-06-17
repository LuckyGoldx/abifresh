'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Plus, Edit2, Trash2, X, Mail, Phone, MapPin,   Eye, DollarSign, User, RefreshCw, ArrowLeft, AlertCircle, XCircle, MoreHorizontal, UserCheck
} from 'lucide-react';
import { Toast, CreditTabs } from '@/components/credits';
import { AbifreshLoading } from '@/components/AbifreshLoading';

export default function ManageCreditorsPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [creditors, setCreditors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCreditor, setEditingCreditor] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [duplicateCreditor, setDuplicateCreditor] = useState<{ full_name: string; unique_code: string; phone_number: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    address: '',
  });

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [reactivateCreditor, setReactivateCreditor] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [creditorsPage, setCreditorsPage] = useState(1);
  const perPage = 15;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    fetchCreditors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeactivated]);

  useEffect(() => {
    if (!openActionId) return;
    const close = () => setOpenActionId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openActionId]);

  const fetchCreditors = async (retryCount = 0) => {
    try {
      const res = await api.get(`/api/credits/creditors${showDeactivated ? '?active=false' : ''}`);
      setCreditors(res.data || []);
      setToast(null);
      setIsLoading(false);
    } catch (error: any) {
      if (retryCount < 2) {
        setTimeout(() => fetchCreditors(retryCount + 1), 1500);
      } else {
        setToast({ message: 'Connection interrupted. Retrying...', type: 'error' });
        setIsLoading(false);
      }
    }
  };

  const filteredCreditors = creditors.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.unique_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number?.includes(searchTerm)
  );

  const totalCreditorPages = Math.ceil(filteredCreditors.length / perPage);
  const paginatedCreditors = filteredCreditors.slice((creditorsPage - 1) * perPage, creditorsPage * perPage);

  const resetForm = () => {
    setFormData({ full_name: '', phone_number: '', email: '', address: '' });
    setEditingCreditor(null);
  };

  const handleAdd = async () => {
    if (isAdding) return;
    if (!formData.phone_number) {
      setToast({ message: 'Phone number is required', type: 'error' });
      return;
    }
    if (!formData.address) {
      setToast({ message: 'Address is required', type: 'error' });
      return;
    }

    // Check for duplicate phone number
    const existing = creditors.find(c => c.phone_number === formData.phone_number);
    if (existing) {
      setDuplicateCreditor({ full_name: existing.full_name, unique_code: existing.unique_code, phone_number: existing.phone_number });
      return;
    }

    setIsAdding(true);
    try {
      await api.post('/api/credits/creditors', formData);
      setToast({ message: 'Creditor added successfully', type: 'success' });
      setShowAddModal(false);
      resetForm();
      fetchCreditors();
    } catch (error: any) {
      const serverMsg = error.response?.data?.error;
      if (error.response?.status === 409 && serverMsg) {
        const match = serverMsg.match(/"([^"]+)" \(([^)]+)\)/);
        if (match) {
          setDuplicateCreditor({ full_name: match[1], unique_code: match[2], phone_number: formData.phone_number || '' });
        } else {
          setToast({ message: serverMsg, type: 'error' });
        }
      } else if (serverMsg) {
        setToast({ message: serverMsg, type: 'error' });
      } else {
        setToast({ message: 'Failed to add creditor', type: 'error' });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCreditor) return;
    try {
      await api.put(`/api/credits/creditors/${editingCreditor.id}`, formData);
      setToast({ message: 'Creditor updated successfully', type: 'success' });
      setShowAddModal(false);
      resetForm();
      fetchCreditors();
    } catch (error: any) {
      setToast({ message: 'Failed to update creditor', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/credits/creditors/${deleteId}`);
      setToast({ message: 'Creditor deleted successfully', type: 'success' });
      setDeleteId(null);
      setDeleteStep(0);
      fetchCreditors();
    } catch (error: any) {
      setToast({ message: 'Failed to delete creditor', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (creditor: any) => {
    setEditingCreditor(creditor);
    setFormData({
      full_name: creditor.full_name || '',
      phone_number: creditor.phone_number || '',
      email: creditor.email || '',
      address: creditor.address || '',
    });
    setShowAddModal(true);
  };

  const handleReactivate = async () => {
    if (!reactivateCreditor) return;
    setIsReactivating(true);
    try {
      await api.put(`/api/credits/creditors/${reactivateCreditor}`, { is_active: true });
      setToast({ message: 'Creditor reactivated successfully', type: 'success' });
      setReactivateCreditor(null);
      fetchCreditors();
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Failed to reactivate creditor', type: 'error' });
    } finally {
      setIsReactivating(false);
    }
  };

  if (isLoading) return <AbifreshLoading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <CreditTabs />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Creditors</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Add, edit, or remove creditors from the system</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search creditors..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCreditorsPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => { setShowDeactivated(!showDeactivated); setCreditorsPage(1); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                    showDeactivated
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {showDeactivated ? 'Show Active' : 'Show Deactivated'}
                </button>
              )}
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="bg-pink-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-pink-600 flex items-center gap-2"
              >
                <Plus size={20} /> Add Creditor
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* Desktop Table (lg+) */}
            <table className="hidden lg:table w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Code</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Credit</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Outstanding</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCreditors.map((creditor) => (
                  <tr key={creditor.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-pink-600 dark:text-pink-400">{creditor.unique_code}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{creditor.full_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{creditor.phone_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{creditor.email || '-'}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-white">₦{Number(creditor.total_credit_amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm font-bold text-green-600">₦{Number(creditor.total_paid || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm font-bold text-red-600">₦{Number(creditor.outstanding || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => { const base = pathname.split('/')[1]; router.push(`/${base}/creditor/${creditor.id}`); }} className="text-blue-600 hover:text-blue-800" title="View History"><Eye size={18} /></button>
                        {showDeactivated ? (
                          user?.role === 'superadmin' && (
                            <button onClick={() => setReactivateCreditor(creditor.id)} className="text-green-600 hover:text-green-800" title="Reactivate"><UserCheck size={18} /></button>
                          )
                        ) : (
                          <>
                            <button onClick={() => openEditModal(creditor)} className="text-yellow-600 hover:text-yellow-800" title="Edit"><Edit2 size={18} /></button>
                            {isAdmin && <button onClick={() => { setDeleteId(creditor.id); setDeleteStep(1); }} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={18} /></button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCreditors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">No creditors found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile/Tablet Cards (< lg) */}
            <div className="lg:hidden space-y-3 p-3">
              {paginatedCreditors.map((creditor) => {
                const totalCredit = Number(creditor.total_credit_amount || 0);
                const totalPaid = Number(creditor.total_paid || 0);
                const outstanding = Number(creditor.outstanding || 0);
                return (
                  <div key={creditor.id} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      {/* Top: Code + Name */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-black text-pink-600 dark:text-pink-400">{creditor.unique_code}</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">{creditor.full_name}</p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                          outstanding <= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {outstanding <= 0 ? 'PAID' : `${((totalPaid / (totalCredit || 1)) * 100).toFixed(0)}%`}
                        </span>
                      </div>

                      {/* Contact Info */}
                      {(creditor.phone_number || creditor.email) && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {creditor.phone_number && (
                            <span className="inline-flex items-center gap-1"><Phone size={11} />{creditor.phone_number}</span>
                          )}
                          {creditor.email && (
                            <span className="inline-flex items-center gap-1"><Mail size={11} />{creditor.email}</span>
                          )}
                        </div>
                      )}

                      {/* Amounts */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Credit</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">₦{totalCredit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Paid</p>
                          <p className="text-xs font-bold text-green-600">₦{totalPaid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Outstanding</p>
                          <p className="text-xs font-bold text-red-600">₦{outstanding.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { const base = pathname.split('/')[1]; router.push(`/${base}/creditor/${creditor.id}`); }}
                          className="flex-1 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition flex items-center justify-center gap-1.5"
                        >
                          <Eye size={14} /> View
                        </button>
                        {showDeactivated ? (
                          user?.role === 'superadmin' && (
                            <button
                              onClick={() => setReactivateCreditor(creditor.id)}
                              className="flex-1 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition flex items-center justify-center gap-1.5"
                            >
                              <UserCheck size={14} /> Reactivate
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(creditor)}
                              className="flex-1 px-3 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition flex items-center justify-center gap-1.5"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => { setDeleteId(creditor.id); setDeleteStep(1); }}
                                className="flex-1 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center justify-center gap-1.5"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCreditors.length === 0 && (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">No creditors found.</div>
              )}
            </div>
            {totalCreditorPages > 1 && (
              <div className="p-4 border-t dark:border-gray-700 flex justify-center gap-2">
                <button disabled={creditorsPage === 1} onClick={() => setCreditorsPage(p => p - 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Previous</button>
                <span className="px-4 py-2 text-xs font-black">Page {creditorsPage} of {totalCreditorPages}</span>
                <button disabled={creditorsPage >= totalCreditorPages} onClick={() => setCreditorsPage(p => p + 1)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border dark:border-gray-700 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingCreditor ? 'Edit Creditor' : 'Add New Creditor'}
                </h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={editingCreditor && !isAdmin}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${editingCreditor && !isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {editingCreditor && !isAdmin && (
                    <p className="text-[10px] text-orange-500 font-bold mt-1">Only admins can edit creditor names</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    rows={2}
                    required
                  />
                </div>
              </div>
              <button
                onClick={editingCreditor ? handleEdit : handleAdd}
                disabled={isAdding}
                className="w-full mt-6 bg-pink-500 text-white py-3 rounded-lg font-bold hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isAdding ? (editingCreditor ? 'Updating...' : 'Adding...') : editingCreditor ? 'Update Creditor' : 'Add Creditor'}
              </button>
            </div>
          </div>
        )}

        {/* STYLISH 3-STEP DELETE MODAL */}
        {deleteId && deleteStep > 0 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl border dark:border-gray-700 relative overflow-hidden">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700">
                <div 
                  className="h-full bg-red-600 transition-all duration-500" 
                  style={{ width: `${(deleteStep / 3) * 100}%` }}
                ></div>
              </div>

              {deleteStep === 1 && (
                <div className="animate-in fade-in zoom-in duration-300 text-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Creditor?</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    This will remove the creditor profile from the active list. Are you sure you want to begin?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setDeleteStep(2)} className="w-full bg-gray-900 dark:bg-black text-white py-4 rounded-2xl font-black hover:bg-gray-800 transition-all">
                      YES, I AM SURE
                    </button>
                    <button onClick={() => { setDeleteId(null); setDeleteStep(0); }} className="w-full text-gray-400 font-bold py-2 hover:text-gray-600">
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="animate-in slide-in-from-right duration-300 text-center">
                  <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-black text-orange-600 mb-2">Warning</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    All associated credit records for this person will be orphaned or hidden. This action is extremely difficult to reverse.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setDeleteStep(3)} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black hover:bg-orange-700 transition-all">
                      I UNDERSTAND THE RISK
                    </button>
                    <button onClick={() => setDeleteStep(1)} className="w-full text-gray-400 font-bold py-2 hover:text-gray-600">
                      GO BACK
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 3 && (
                <div className="animate-in slide-in-from-bottom duration-300 text-center">
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/40">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-red-600 mb-2 italic">FINAL WARNING</h2>
                  <p className="text-gray-900 dark:text-white font-bold mb-8">
                    Confirm complete destruction of this creditor record?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleDelete} 
                      disabled={isDeleting}
                      className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-red-700 shadow-2xl transition-all disabled:opacity-50"
                    >
                      {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
                    </button>
                    <button onClick={() => setDeleteStep(2)} className="w-full text-gray-400 font-bold py-2 hover:text-gray-600">
                      WAIT, ABORT!
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REACTIVATE CONFIRMATION MODAL */}
        {reactivateCreditor && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl border dark:border-gray-700 animate-in zoom-in duration-200 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Reactivate Creditor?</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                This will restore the creditor to the active list. They will be able to receive credit sales again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReactivate}
                  disabled={isReactivating}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {isReactivating ? 'REACTIVATING...' : 'YES, REACTIVATE'}
                </button>
                <button
                  onClick={() => setReactivateCreditor(null)}
                  className="w-full text-gray-400 font-bold py-2 hover:text-gray-600"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DUPLICATE CREDITOR MODAL */}
        {duplicateCreditor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl border dark:border-gray-700 animate-in zoom-in-95 duration-200 text-center">
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-10 h-10 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Duplicate Found!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                This phone number is already registered to another creditor.
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 border border-orange-200 dark:border-orange-900/30 mb-6 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Name</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{duplicateCreditor.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Code</span>
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{duplicateCreditor.unique_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{duplicateCreditor.phone_number}</span>
                </div>
              </div>
              <button
                onClick={() => setDuplicateCreditor(null)}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3.5 rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
