import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, Search, RefreshCw, Table, Eye, X, AlertCircle, CheckCircle, Calendar, Clock, Users, UserCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ApprovalRequests from './ApprovalRequests';


interface TableInfo {
  name: string;
  rowCount: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: any;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface Bus {
  id: string;
  name: string;
  plate_number: string;
  from_city: string;
  to_city: string;
}

interface WeeklyTimetable {
  id: string;
  bus_id: string;
  driver_id: string | null;
  day_of_week: number;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  is_active: boolean;
}

interface UserWithDetails {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  created_at: string;
  driver?: any;
  owner?: any;
  bookings_count?: number;
}

const AdminDashboard: React.FC = () => {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'timetable' | 'users'>('database');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [timetables, setTimetables] = useState<WeeklyTimetable[]>([]);
  const [editingTimetable, setEditingTimetable] = useState<WeeklyTimetable | null>(null);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);

  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'driver' | 'owner' | 'admin'>('all');
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    loadTables();
    loadBuses();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableColumns();
      loadTableData();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedBus) {
      loadTimetables();
    }
  }, [selectedBus]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // DATABASE FUNCTIONS
  const loadTables = async () => {
    try {
      const predefinedTables = [
        'users', 'buses', 'trips', 'bookings', 'drivers', 'owners',
        'bus_stops', 'weekly_timetables', 'tickets', 'payments',
        'locations', 'notifications', 'gps_logs', 'route_stops',
        'ticket_verifications', 'trip_updates'
      ];

      const tablesWithCounts = await Promise.all(
        predefinedTables.map(async (tableName) => {
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          return { name: tableName, rowCount: count || 0 };
        })
      );

      setTables(tablesWithCounts);
      if (tablesWithCounts.length > 0) {
        setSelectedTable(tablesWithCounts[0].name);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      showNotification('error', 'Failed to load tables');
    }
  };

  const loadTableColumns = async () => {
    try {
      const { data: sampleData } = await supabase
        .from(selectedTable)
        .select('*')
        .limit(1)
        .single();

      if (sampleData) {
        const columns: ColumnInfo[] = Object.keys(sampleData).map(key => ({
          name: key,
          type: typeof sampleData[key],
          nullable: true,
          defaultValue: null,
          isPrimaryKey: key === 'id',
          isForeignKey: key.endsWith('_id')
        }));
        setTableColumns(columns);
      }
    } catch (error) {
      console.error('Error loading columns:', error);
    }
  };

  const loadTableData = async () => {
    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setData(tableData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showNotification('error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: any) => {
    setEditingRow({ ...row });
    setIsModalOpen(true);
  };

  const handleView = (row: any) => {
    setSelectedRow(row);
  };

  const handleAdd = () => {
    const newRow: any = {};
    tableColumns.forEach(col => {
      if (!col.isPrimaryKey && !col.defaultValue) {
        if (col.type.includes('bool')) newRow[col.name] = false;
        else if (col.type.includes('int') || col.type.includes('numeric')) newRow[col.name] = 0;
        else if (col.type.includes('json')) newRow[col.name] = {};
        else newRow[col.name] = '';
      }
    });
    setEditingRow(newRow);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingRow) return;

    try {
      const dataToSave = { ...editingRow };
      tableColumns.forEach(col => {
        if (col.isPrimaryKey || col.defaultValue?.includes('now()') || col.name === 'created_at' || col.name === 'updated_at') {
          delete dataToSave[col.name];
        }
      });

      if (editingRow.id) {
        const { error } = await supabase
          .from(selectedTable)
          .update(dataToSave)
          .eq('id', editingRow.id);

        if (error) throw error;
        showNotification('success', 'Record updated successfully');
      } else {
        const { error } = await supabase
          .from(selectedTable)
          .insert([dataToSave]);

        if (error) throw error;
        showNotification('success', 'Record created successfully');
      }

      setIsModalOpen(false);
      setEditingRow(null);
      loadTableData();
      loadTables();
    } catch (error: any) {
      console.error('Error saving data:', error);
      showNotification('error', `Failed to save: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('success', 'Record deleted successfully');
      loadTableData();
      loadTables();
    } catch (error: any) {
      console.error('Error deleting data:', error);
      showNotification('error', `Failed to delete: ${error.message}`);
    }
  };

  // TIMETABLE FUNCTIONS
  const loadBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, name, plate_number, from_city, to_city')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setBuses(data || []);
      if (data && data.length > 0) {
        setSelectedBus(data[0].id);
      }
    } catch (error) {
      console.error('Error loading buses:', error);
    }
  };

  const loadTimetables = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_timetables')
        .select('*')
        .eq('bus_id', selectedBus)
        .order('day_of_week')
        .order('departure_time');

      if (error) throw error;
      setTimetables(data || []);
    } catch (error) {
      console.error('Error loading timetables:', error);
      showNotification('error', 'Failed to load timetables');
    }
  };

  const handleAddTimetable = () => {
    setEditingTimetable({
      id: '',
      bus_id: selectedBus,
      driver_id: null,
      day_of_week: 1,
      departure_time: '08:00',
      arrival_time: '12:00',
      price_per_seat: 0,
      is_active: true
    });
    setIsTimetableModalOpen(true);
  };

  const handleEditTimetable = (timetable: WeeklyTimetable) => {
    setEditingTimetable(timetable);
    setIsTimetableModalOpen(true);
  };

  const handleSaveTimetable = async () => {
    if (!editingTimetable) return;

    try {
      if (editingTimetable.id) {
        const { error } = await supabase
          .from('weekly_timetables')
          .update({
            day_of_week: editingTimetable.day_of_week,
            departure_time: editingTimetable.departure_time,
            arrival_time: editingTimetable.arrival_time,
            price_per_seat: editingTimetable.price_per_seat,
            is_active: editingTimetable.is_active
          })
          .eq('id', editingTimetable.id);

        if (error) throw error;
        showNotification('success', 'Timetable updated successfully');
      } else {
        const { error } = await supabase
          .from('weekly_timetables')
          .insert([{
            bus_id: editingTimetable.bus_id,
            driver_id: editingTimetable.driver_id,
            day_of_week: editingTimetable.day_of_week,
            departure_time: editingTimetable.departure_time,
            arrival_time: editingTimetable.arrival_time,
            price_per_seat: editingTimetable.price_per_seat,
            is_active: editingTimetable.is_active
          }]);

        if (error) throw error;
        showNotification('success', 'Timetable created successfully');
      }

      setIsTimetableModalOpen(false);
      setEditingTimetable(null);
      loadTimetables();
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      showNotification('error', `Failed to save: ${error.message}`);
    }
  };

  const handleDeleteTimetable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;

    try {
      const { error } = await supabase
        .from('weekly_timetables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showNotification('success', 'Timetable deleted successfully');
      loadTimetables();
    } catch (error: any) {
      console.error('Error deleting timetable:', error);
      showNotification('error', `Failed to delete: ${error.message}`);
    }
  };

  // USER MANAGEMENT FUNCTIONS
  const loadUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDetails = await Promise.all(
        (usersData || []).map(async (user) => {
          let additionalData: any = { bookings_count: 0 };

          if (user.role === 'driver') {
            const { data: driverData } = await supabase
              .from('drivers')
              .select('*')
              .eq('user_id', user.id)
              .single();
            additionalData.driver = driverData;
          }

          if (user.role === 'owner') {
            const { data: ownerData } = await supabase
              .from('owners')
              .select('*')
              .eq('user_id', user.id)
              .single();
            additionalData.owner = ownerData;
          }

          if (user.role === 'user') {
            const { count } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            additionalData.bookings_count = count || 0;
          }

          return { ...user, ...additionalData };
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', 'Failed to load users');
    }
  };

  const handleEditUser = (user: UserWithDetails) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editingUser.name,
          phone: editingUser.phone,
          role: editingUser.role,
          status: editingUser.status
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      showNotification('success', 'User updated successfully');
      setIsUserModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      showNotification('error', `Failed to save: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all related data.')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      showNotification('success', 'User deleted successfully');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showNotification('error', `Failed to delete: ${error.message}`);
    }
  };

  // UTILITY FUNCTIONS
  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) return <span className="text-gray-400">NULL</span>;
    if (typeof value === 'boolean') return value ? <span className="text-green-600">✓ Yes</span> : <span className="text-red-600">✗ No</span>;
    if (columnName.includes('_at') || columnName.includes('date')) {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'object') {
      return <span className="text-xs bg-gray-100 px-2 py-1 rounded">JSON</span>;
    }
    const str = String(value);
    return str.length > 50 ? str.substring(0, 50) + '...' : str;
  };

  const renderInput = (col: ColumnInfo, value: any, onChange: (value: any) => void) => {
    if (col.type.includes('bool')) {
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      );
    }

    if (col.type.includes('json')) {
      return (
        <textarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={4}
        />
      );
    }

    if (col.type.includes('int') || col.type.includes('numeric')) {
      return (
        <input
          type="number"
          step="any"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    if (col.type.includes('date') && !col.type.includes('timestamp')) {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    if (col.type.includes('time') && !col.type.includes('timestamp')) {
      return (
        <input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    if (col.type.includes('text') && (col.name.includes('description') || col.name.includes('address') || col.name.includes('message'))) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    );
  };

  const getUserRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'owner':
        return <UserCircle className="h-5 w-5 text-purple-600" />;
      case 'driver':
        return <Users className="h-5 w-5 text-blue-600" />;
      default:
        return <Users className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'driver':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredData = data.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(row).some(value =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch =
      user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(userSearchTerm));
    return matchesRole && matchesSearch;
  });

  const visibleColumns = viewMode === 'compact' ? tableColumns.slice(0, 6) : tableColumns;
  const selectedBusInfo = buses.find(b => b.id === selectedBus);
  const roleStats = {
    all: users.length,
    user: users.filter(u => u.role === 'user').length,
    driver: users.filter(u => u.role === 'driver').length,
    owner: users.filter(u => u.role === 'owner').length,
    admin: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
            {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Administration</h1>
              <p className="text-gray-600 mt-2">Complete database management, timetable scheduling & user management</p>
            </div>
            <button
              onClick={() => setShowApprovalModal(true)}
              className="flex items-center px-6 py-3 space-x-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-semibold shadow-lg"
            >
              <UserCircle className="h-5 w-5" />
              <span>Approval Requests</span>
            </button>

          </div>
        </div>


        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('database')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'database'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Database className="inline h-5 w-5 mr-2" />
              Database Management
            </button>
            <button
              onClick={() => setActiveTab('timetable')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'timetable'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Calendar className="inline h-5 w-5 mr-2" />
              Bus Timetable Manager
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Users className="inline h-5 w-5 mr-2" />
              User Management
            </button>
          </nav>
        </div>

        {/* DATABASE TAB */}
        {activeTab === 'database' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Tables</h2>
                </div>
                <button
                  onClick={loadTables}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Refresh tables"
                >
                  <RefreshCw className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <nav className="space-y-1">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between ${selectedTable === table.name
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className="flex items-center space-x-2">
                      <Table className="h-4 w-4" />
                      <span>{table.name}</span>
                    </span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                      {table.rowCount}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="col-span-9 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">
                      {selectedTable.replace(/_/g, ' ')}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {tableColumns.length} columns • {filteredData.length} records
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{viewMode === 'compact' ? 'Show All' : 'Compact'}</span>
                    </button>
                    <button
                      onClick={loadTableData}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={handleAdd}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search all fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No records found</p>
                    <button
                      onClick={handleAdd}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add First Record
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {visibleColumns.map(col => (
                          <th
                            key={col.name}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            <div className="flex items-center space-x-1">
                              <span>{col.name.replace(/_/g, ' ')}</span>
                              {col.isPrimaryKey && <span className="text-blue-500">🔑</span>}
                              {col.isForeignKey && <span className="text-purple-500">🔗</span>}
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredData.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50">
                          {visibleColumns.map(col => (
                            <td key={col.name} className="px-6 py-4 text-sm text-gray-900">
                              {formatValue(row[col.name], col.name)}
                            </td>
                          ))}
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(row)}
                                className="text-gray-600 hover:text-gray-700"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(row)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Bus</h2>
              <div className="space-y-2">
                {buses.map(bus => (
                  <button
                    key={bus.id}
                    onClick={() => setSelectedBus(bus.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${selectedBus === bus.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                  >
                    <div className="font-semibold text-gray-900">{bus.name}</div>
                    <div className="text-sm text-gray-500">{bus.plate_number}</div>
                    <div className="text-xs text-gray-400 mt-1">{bus.from_city} → {bus.to_city}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-8 bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Weekly Timetable</h2>
                    {selectedBusInfo && (
                      <p className="text-gray-600 mt-1">
                        {selectedBusInfo.name} • {selectedBusInfo.from_city} → {selectedBusInfo.to_city}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleAddTimetable}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Schedule</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {timetables.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No timetable entries</p>
                    <button
                      onClick={handleAddTimetable}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Create First Schedule
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {daysOfWeek.map((day, dayIndex) => {
                      const dayTimetables = timetables.filter(t => t.day_of_week === dayIndex + 1);

                      return (
                        <div key={day} className="border border-gray-200 rounded-lg">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h3 className="font-bold text-gray-900">{day}</h3>
                          </div>
                          {dayTimetables.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No schedules for this day
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {dayTimetables.map(timetable => (
                                <div key={timetable.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                  <div className="flex-1 grid grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-xs text-gray-500">Departure</p>
                                      <p className="font-semibold text-gray-900">{formatTime(timetable.departure_time)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Arrival</p>
                                      <p className="font-semibold text-gray-900">{formatTime(timetable.arrival_time)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Price per Seat</p>
                                      <p className="font-semibold text-gray-900">LKR {timetable.price_per_seat.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Status</p>
                                      <p className={`font-semibold ${timetable.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                        {timetable.is_active ? 'Active' : 'Inactive'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2 ml-4">
                                    <button
                                      onClick={() => handleEditTimetable(timetable)}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTimetable(timetable.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {(['all', 'user', 'driver', 'owner', 'admin'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-xl border-2 transition ${selectedRole === role
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 capitalize">{role}s</span>
                    {role !== 'all' && getUserRoleIcon(role)}
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{roleStats[role]}</p>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedRole === 'all' ? 'All Users' : `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}s`}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{filteredUsers.length} users</p>
                  </div>
                  <button
                    onClick={loadUsers}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No users found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border inline-flex items-center space-x-1 ${getRoleColor(user.role)}`}>
                              {getUserRoleIcon(user.role)}
                              <span className="capitalize">{user.role}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(user.status)}`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.role === 'driver' && user.driver && (
                              <div>
                                <div>License: {user.driver.license_number}</div>
                                <div className="text-xs text-gray-500">{user.driver.experience_years} years exp</div>
                              </div>
                            )}
                            {user.role === 'owner' && user.owner && (
                              <div>
                                <div>{user.owner.company_name}</div>
                                <div className="text-xs text-gray-500">GST: {user.owner.gst_number}</div>
                              </div>
                            )}
                            {user.role === 'user' && (
                              <div>
                                <div>{user.bookings_count} bookings</div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Edit user"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Edit Modal */}
      {isModalOpen && editingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingRow.id ? 'Edit Record' : 'Add New Record'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRow(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              {tableColumns
                .filter(col => !col.isPrimaryKey && !col.defaultValue?.includes('now()'))
                .map(col => (
                  <div key={col.name} className={col.type.includes('text') && (col.name.includes('description') || col.name.includes('address')) ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {col.name.replace(/_/g, ' ').toUpperCase()}
                      {!col.nullable && <span className="text-red-500 ml-1">*</span>}
                      {col.isForeignKey && <span className="text-purple-500 ml-1">(FK)</span>}
                    </label>
                    {renderInput(col, editingRow[col.name], (value) =>
                      setEditingRow({ ...editingRow, [col.name]: value })
                    )}
                    <p className="text-xs text-gray-500 mt-1">Type: {col.type}</p>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRow(null);
                }}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {editingRow.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
              <h3 className="text-2xl font-bold text-white">Record Details</h3>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {tableColumns.map(col => (
                <div key={col.name} className="border-b border-gray-200 pb-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {col.name.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  <p className="text-gray-900">
                    {selectedRow[col.name] === null || selectedRow[col.name] === undefined
                      ? <span className="text-gray-400 italic">NULL</span>
                      : typeof selectedRow[col.name] === 'object'
                        ? <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">{JSON.stringify(selectedRow[col.name], null, 2)}</pre>
                        : String(selectedRow[col.name])}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedRow(null)}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Modal */}
      {isTimetableModalOpen && editingTimetable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingTimetable.id ? 'Edit Schedule' : 'Add New Schedule'}
              </h3>
              <button
                onClick={() => {
                  setIsTimetableModalOpen(false);
                  setEditingTimetable(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingTimetable.day_of_week}
                  onChange={(e) => setEditingTimetable({ ...editingTimetable, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={day} value={index + 1}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingTimetable.departure_time}
                    onChange={(e) => setEditingTimetable({ ...editingTimetable, departure_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrival Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={editingTimetable.arrival_time}
                    onChange={(e) => setEditingTimetable({ ...editingTimetable, arrival_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Seat (LKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editingTimetable.price_per_seat}
                  onChange={(e) => setEditingTimetable({ ...editingTimetable, price_per_seat: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingTimetable.is_active}
                  onChange={(e) => setEditingTimetable({ ...editingTimetable, is_active: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (visible to customers)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsTimetableModalOpen(false);
                  setEditingTimetable(null);
                }}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTimetable}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {editingTimetable.id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Read-only)
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="driver">Driver</option>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changing the role or status may affect user access and related data.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  setEditingUser(null);
                }}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showApprovalModal && (
        <ApprovalRequests onClose={() => setShowApprovalModal(false)} />
      )}

    </div>
  );
};

export default AdminDashboard;
