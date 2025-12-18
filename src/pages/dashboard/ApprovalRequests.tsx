import React, { useState, useEffect } from 'react';
import { UserCircle, Building2, X, CheckCircle, XCircle, Clock, Award, Phone, Mail, MapPin, Calendar, Shield, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PendingDriver {
  id: string;
  license_number: string;
  experience_years: number;
  availability_status: string;
  created_at: string;
  users: {
    id: string;
    email: string;
    name: string;
    phone: string;
    created_at: string;
  };
}

interface PendingOwner {
  id: string;
  company_name: string;
  license_number: string;
  address: string;
  city: string;
  state: string;
  created_at: string;
  users: {
    id: string;
    email: string;
    name: string;
    phone: string;
    created_at: string;
  };
}

interface ApprovalRequestsProps {
  onClose: () => void;
}

const ApprovalRequests: React.FC<ApprovalRequestsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'owners'>('drivers');
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [pendingOwners, setPendingOwners] = useState<PendingOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      // Load pending drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select(`
          id,
          license_number,
          experience_years,
          availability_status,
          created_at,
          users!inner(
            id,
            email,
            name,
            phone,
            created_at
          )
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (driversError) throw driversError;

      // Load pending owners
      const { data: ownersData, error: ownersError } = await supabase
        .from('owners')
        .select(`
          id,
          company_name,
          license_number,
          address,
          city,
          state,
          created_at,
          users!inner(
            id,
            email,
            name,
            phone,
            created_at
          )
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (ownersError) throw ownersError;

      setPendingDrivers(driversData || []);
      setPendingOwners(ownersData || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverApproval = async (driverId: string, status: 'verified' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status === 'verified' ? 'approve' : 'reject'} this driver?`)) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          verification_status: status,
          verified_at: status === 'verified' ? new Date().toISOString() : null
        })
        .eq('id', driverId);

      if (error) throw error;
      
      alert(`Driver ${status === 'verified' ? 'approved' : 'rejected'} successfully!`);
      loadPendingRequests();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error updating driver:', error);
      alert(`Failed to ${status === 'verified' ? 'approve' : 'reject'} driver`);
    }
  };

  const handleOwnerApproval = async (ownerId: string, status: 'verified' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status === 'verified' ? 'approve' : 'reject'} this owner?`)) return;

    try {
      const { error } = await supabase
        .from('owners')
        .update({ 
          verification_status: status,
          verified_at: status === 'verified' ? new Date().toISOString() : null
        })
        .eq('id', ownerId);

      if (error) throw error;
      
      alert(`Owner ${status === 'verified' ? 'approved' : 'rejected'} successfully!`);
      loadPendingRequests();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error updating owner:', error);
      alert(`Failed to ${status === 'verified' ? 'approve' : 'reject'} owner`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPending = pendingDrivers.length + pendingOwners.length;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-xl bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approval Requests</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalPending} pending approval{totalPending !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'drivers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCircle className="inline h-5 w-5 mr-2" />
            Drivers
            {pendingDrivers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingDrivers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'owners'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="inline h-5 w-5 mr-2" />
            Owners
            {pendingOwners.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingOwners.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : (
            <>
              {/* Drivers Tab */}
              {activeTab === 'drivers' && (
                <div>
                  {pendingDrivers.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No pending driver approvals</p>
                      <p className="text-sm text-gray-400 mt-2">All driver requests have been processed</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingDrivers.map(driver => (
                        <div
                          key={driver.id}
                          className="border-2 border-yellow-200 rounded-xl p-5 bg-yellow-50 hover:shadow-md transition cursor-pointer"
                          onClick={() => {
                            setSelectedItem({ ...driver, type: 'driver' });
                            setShowDetailModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 rounded-full bg-yellow-200 flex items-center justify-center">
                                <UserCircle className="h-7 w-7 text-yellow-700" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{driver.users.name}</h3>
                                <p className="text-sm text-gray-600">{driver.users.email}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full">
                              PENDING
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-700">
                              <Award className="h-4 w-4 mr-2 text-gray-500" />
                              License: {driver.license_number}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Clock className="h-4 w-4 mr-2 text-gray-500" />
                              {driver.experience_years} years experience
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                              Applied: {formatDate(driver.created_at)}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-yellow-200 flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDriverApproval(driver.id, 'verified');
                              }}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDriverApproval(driver.id, 'rejected');
                              }}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Owners Tab */}
              {activeTab === 'owners' && (
                <div>
                  {pendingOwners.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No pending owner approvals</p>
                      <p className="text-sm text-gray-400 mt-2">All owner requests have been processed</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingOwners.map(owner => (
                        <div
                          key={owner.id}
                          className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50 hover:shadow-md transition cursor-pointer"
                          onClick={() => {
                            setSelectedItem({ ...owner, type: 'owner' });
                            setShowDetailModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                                <Building2 className="h-7 w-7 text-blue-700" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{owner.company_name}</h3>
                                <p className="text-sm text-gray-600">{owner.users.name}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                              PENDING
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-700">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              {owner.users.email}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              {owner.users.phone}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Shield className="h-4 w-4 mr-2 text-gray-500" />
                              License: {owner.license_number}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                              Applied: {formatDate(owner.created_at)}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-blue-200 flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOwnerApproval(owner.id, 'verified');
                              }}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOwnerApproval(owner.id, 'rejected');
                              }}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {selectedItem.type === 'driver' ? 'Driver' : 'Owner'} Details
                </h3>
                <button onClick={() => setShowDetailModal(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedItem.type === 'driver' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium">{selectedItem.users.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedItem.users.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedItem.users.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">License Number</p>
                        <p className="font-medium">{selectedItem.license_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Experience</p>
                        <p className="font-medium">{selectedItem.experience_years} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Availability</p>
                        <p className="font-medium capitalize">{selectedItem.availability_status}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Company Name</p>
                        <p className="font-medium">{selectedItem.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Owner Name</p>
                        <p className="font-medium">{selectedItem.users.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedItem.users.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{selectedItem.users.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">License Number</p>
                        <p className="font-medium">{selectedItem.license_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">City</p>
                        <p className="font-medium">{selectedItem.city || 'N/A'}</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t flex space-x-3">
                  <button
                    onClick={() => {
                      if (selectedItem.type === 'driver') {
                        handleDriverApproval(selectedItem.id, 'verified');
                      } else {
                        handleOwnerApproval(selectedItem.id, 'verified');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItem.type === 'driver') {
                        handleDriverApproval(selectedItem.id, 'rejected');
                      } else {
                        handleOwnerApproval(selectedItem.id, 'rejected');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalRequests;
