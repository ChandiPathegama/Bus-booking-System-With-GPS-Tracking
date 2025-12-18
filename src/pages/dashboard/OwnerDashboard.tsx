import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import TimetableModal from './TimetableModal';
import { 
  Bus, 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  Clock,
  MapPin,
  User,
  Phone,
  Award,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface Owner {
  id: string;
  company_name: string;
  license_number: string;
  verification_status: string;
}

interface BusInterface {
  id: string;
  name: string;
  plate_number: string;
  bus_type: string;
  total_seats: number;
  from_city: string;
  to_city: string;
  status: string;
  color?: string;
  image_url?: string;
  amenities?: any;
  gps_tracker?: string;
  assigned_driver?: {
    id: string;
    name: string;
    license_number: string;
    experience_years: number;
    phone: string;
  };
}

interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  experience_years: number;
  availability_status: string;
  users: {
    name: string;
    phone: string;
  };
}

interface WeeklyTimetable {
  id: string;
  day_of_week: number;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  is_active: boolean;
}

interface Location {
  id: string;
  name: string;
  district: string;
  province: string;
}

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [buses, setBuses] = useState<BusInterface[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timetables, setTimetables] = useState<{ [busId: string]: WeeklyTimetable[] }>({});
  const [loading, setLoading] = useState(true);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBus, setEditingBus] = useState<BusInterface | null>(null);
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [addingBus, setAddingBus] = useState(false);
  const [addBusError, setAddBusError] = useState('');
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [selectedBusForTimetable, setSelectedBusForTimetable] = useState<BusInterface | null>(null);

  // GPS Tracker states
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [selectedBusForGPS, setSelectedBusForGPS] = useState<string>('');
  const [gpsTrackerId, setGpsTrackerId] = useState('');
  const [assigningGPS, setAssigningGPS] = useState(false);

  // Image upload states
  const [addBusImage, setAddBusImage] = useState<File | null>(null);
  const [addBusImagePreview, setAddBusImagePreview] = useState<string | null>(null);
  const [editBusImage, setEditBusImage] = useState<File | null>(null);
  const [editBusImagePreview, setEditBusImagePreview] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: '',
    plate_number: '',
    bus_type: 'ac',
    total_seats: 40,
    from_city: '',
    to_city: '',
    color: '',
    amenities: [] as string[]
  });

  const [addBusFormData, setAddBusFormData] = useState({
    name: '',
    plate_number: '',
    bus_type: 'ac',
    total_seats: 40,
    from_city: '',
    to_city: '',
    route_description: '',
    status: 'active',
    color: '',
    amenities: [] as string[]
  });

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const amenitiesOptions = [
    'WiFi',
    'USB Charging',
    'Blanket',
    'Pillow',
    'Water Bottle',
    'Entertainment System',
    'Reclining Seats',
    'Air Conditioning'
  ];

  const vehicleColors = [
    'White', 'Black', 'Silver', 'Gray', 'Red', 
    'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Other'
  ];

  useEffect(() => {
    if (user) {
      fetchOwnerData();
      fetchLocations();
    }
  }, [user]);

  const uploadVehicleImage = async (file: File, busId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${busId}-${Date.now()}.${fileExt}`;
      const filePath = `bus-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicles')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading vehicle image:', error);
      return null;
    }
  };

  const handleAddBusImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        setAddBusError('Vehicle image must be less than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setAddBusError('Please upload an image file');
        return;
      }

      setAddBusImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAddBusImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      setAddBusError('');
    }
  };

  const handleEditBusImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Vehicle image must be less than 2MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      setEditBusImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setEditBusImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchOwnerData = async () => {
    try {
      setLoading(true);
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1);

      if (ownerError) throw ownerError;

      if (ownerData && ownerData.length > 0) {
        setOwner(ownerData[0]);
        await fetchBuses(ownerData[0].id);
      }
      await fetchDrivers();
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, district, province')
        .eq('status', 'active')
        .order('name');

      if (locationsError) throw locationsError;
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchBuses = async (ownerId: string) => {
    try {
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('owner_id', ownerId);

      if (busError) throw busError;

      const busesWithDrivers = await Promise.all(
        (busData || []).map(async (bus) => {
          const { data: timetableData } = await supabase
            .from('weekly_timetables')
            .select(`
              driver_id,
              drivers!inner(
                id,
                license_number,
                experience_years,
                users!inner(name, phone)
              )
            `)
            .eq('bus_id', bus.id)
            .not('driver_id', 'is', null)
            .limit(1);

          let assignedDriver = null;
          if (timetableData && timetableData.length > 0) {
            const driverInfo = timetableData[0].drivers;
            assignedDriver = {
              id: driverInfo.id,
              name: driverInfo.users.name,
              license_number: driverInfo.license_number,
              experience_years: driverInfo.experience_years,
              phone: driverInfo.users.phone
            };
          }

          return {
            ...bus,
            assigned_driver: assignedDriver
          };
        })
      );

      setBuses(busesWithDrivers);

      for (const bus of busData || []) {
        await fetchTimetables(bus.id);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select(`
          id,
          user_id,
          license_number,
          experience_years,
          availability_status,
          verification_status,
          users!inner(name, phone)
        `)
        .eq('verification_status', 'verified')
        .eq('availability_status', 'available');

      if (driverError) throw driverError;
      setDrivers(driverData || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchTimetables = async (busId: string) => {
    try {
      const { data: timetableData, error: timetableError } = await supabase
        .from('weekly_timetables')
        .select('*')
        .eq('bus_id', busId)
        .order('day_of_week')
        .order('departure_time');

      if (timetableError) throw timetableError;

      setTimetables(prev => ({
        ...prev,
        [busId]: timetableData || []
      }));
    } catch (error) {
      console.error('Error fetching timetables:', error);
    }
  };

  const handleAssignGPS = async () => {
    if (!selectedBusForGPS || !gpsTrackerId.trim()) {
      alert('Please enter a tracker ID');
      return;
    }

    try {
      setAssigningGPS(true);
      const { error } = await supabase
        .from('buses')
        .update({ gps_tracker: gpsTrackerId.trim() })
        .eq('id', selectedBusForGPS);

      if (error) throw error;
      alert('GPS Tracker assigned successfully!');
      await fetchOwnerData();
      setShowGPSModal(false);
      setSelectedBusForGPS('');
      setGpsTrackerId('');
    } catch (error) {
      console.error('Error assigning GPS tracker:', error);
      alert('Failed to assign GPS tracker. Please try again.');
    } finally {
      setAssigningGPS(false);
    }
  };

  const handleRemoveGPS = async (busId: string) => {
    if (!confirm('Are you sure you want to remove the GPS tracker from this bus?')) return;

    try {
      const { error } = await supabase
        .from('buses')
        .update({ gps_tracker: null })
        .eq('id', busId);

      if (error) throw error;
      alert('GPS Tracker removed successfully!');
      await fetchOwnerData();
    } catch (error) {
      console.error('Error removing GPS tracker:', error);
      alert('Failed to remove GPS tracker. Please try again.');
    }
  };

  const openGPSModal = (busId: string, currentTracker?: string) => {
    setSelectedBusForGPS(busId);
    setGpsTrackerId(currentTracker || '');
    setShowGPSModal(true);
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!selectedBusId) return;

    try {
      setAssigningDriver(true);
      const { error: updateError } = await supabase
        .from('weekly_timetables')
        .update({ driver_id: driverId })
        .eq('bus_id', selectedBusId);

      if (updateError) throw updateError;

      const { error: driverError } = await supabase
        .from('drivers')
        .update({ availability_status: 'assigned' })
        .eq('id', driverId);

      if (driverError) throw driverError;

      await fetchOwnerData();
      setShowDriverModal(false);
      setSelectedBusId('');
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver. Please try again.');
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleUnassignDriver = async (busId: string, driverId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('weekly_timetables')
        .update({ driver_id: null })
        .eq('bus_id', busId);

      if (updateError) throw updateError;

      const { error: driverError } = await supabase
        .from('drivers')
        .update({ availability_status: 'available' })
        .eq('id', driverId);

      if (driverError) throw driverError;
      await fetchOwnerData();
    } catch (error) {
      console.error('Error unassigning driver:', error);
      alert('Failed to unassign driver. Please try again.');
    }
  };

  const handleEditBus = (bus: BusInterface) => {
    setEditingBus(bus);
    setEditFormData({
      name: bus.name,
      plate_number: bus.plate_number,
      bus_type: bus.bus_type,
      total_seats: bus.total_seats,
      from_city: bus.from_city,
      to_city: bus.to_city,
      color: bus.color || '',
      amenities: Array.isArray(bus.amenities) ? bus.amenities : []
    });
    setEditBusImagePreview(bus.image_url || null);
    setEditBusImage(null);
    setShowEditModal(true);
  };

  const handleUpdateBus = async () => {
    if (!editingBus) return;

    try {
      let imageUrl = editingBus.image_url;

      // Upload new image if selected
      if (editBusImage) {
        const uploadedUrl = await uploadVehicleImage(editBusImage, editingBus.id);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('buses')
        .update({
          name: editFormData.name,
          plate_number: editFormData.plate_number,
          bus_type: editFormData.bus_type,
          total_seats: editFormData.total_seats,
          from_city: editFormData.from_city,
          to_city: editFormData.to_city,
          color: editFormData.color,
          image_url: imageUrl,
          amenities: editFormData.amenities
        })
        .eq('id', editingBus.id);

      if (error) throw error;
      await fetchOwnerData();
      setShowEditModal(false);
      setEditingBus(null);
      setEditBusImage(null);
      setEditBusImagePreview(null);
    } catch (error) {
      console.error('Error updating bus:', error);
      alert('Failed to update bus. Please try again.');
    }
  };

  const handleDeleteBus = async (busId: string, busName: string) => {
    if (!confirm(`Are you sure you want to delete "${busName}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;
      await fetchOwnerData();
      alert('Bus deleted successfully.');
    } catch (error) {
      console.error('Error deleting bus:', error);
      alert('Failed to delete bus. Please try again.');
    }
  };

  const handleAddBusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddBusFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddBusAmenitiesToggle = (amenity: string) => {
    setAddBusFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleAddBusSubmit = async () => {
    setAddBusError('');

    if (!addBusFormData.name.trim()) {
      setAddBusError('Bus name is required');
      return;
    }

    if (!addBusFormData.plate_number.trim()) {
      setAddBusError('Plate number is required');
      return;
    }

    if (!addBusFormData.from_city) {
      setAddBusError('From city is required');
      return;
    }

    if (!addBusFormData.to_city) {
      setAddBusError('To city is required');
      return;
    }

    if (addBusFormData.from_city === addBusFormData.to_city) {
      setAddBusError('From city and To city cannot be the same');
      return;
    }

    if (addBusFormData.total_seats < 10 || addBusFormData.total_seats > 60) {
      setAddBusError('Total seats must be between 10 and 60');
      return;
    }

    if (!addBusFormData.color) {
      setAddBusError('Vehicle color is required');
      return;
    }

    if (!addBusImage) {
      setAddBusError('Vehicle image is required');
      return;
    }

    if (!owner) {
      setAddBusError('Owner information not found');
      return;
    }

    try {
      setAddingBus(true);

      const { data: newBus, error: busError } = await supabase
        .from('buses')
        .insert({
          owner_id: owner.id,
          name: addBusFormData.name,
          plate_number: addBusFormData.plate_number,
          bus_type: addBusFormData.bus_type,
          total_seats: parseInt(addBusFormData.total_seats.toString()),
          from_city: addBusFormData.from_city,
          to_city: addBusFormData.to_city,
          color: addBusFormData.color,
          route_description: addBusFormData.route_description || null,
          status: addBusFormData.status,
          amenities: addBusFormData.amenities.length > 0 ? addBusFormData.amenities : null
        })
        .select()
        .single();

      if (busError) {
        console.error('Error adding bus:', busError);
        if (busError.code === '23505') {
          setAddBusError('This plate number is already registered. Please use a different plate number.');
        } else {
          setAddBusError(busError.message || 'Failed to add bus. Please try again.');
        }
        return;
      }

      // Upload image
      if (addBusImage && newBus) {
        const imageUrl = await uploadVehicleImage(addBusImage, newBus.id);
        if (imageUrl) {
          await supabase
            .from('buses')
            .update({ image_url: imageUrl })
            .eq('id', newBus.id);
        }
      }

      alert('Bus added successfully!');
      
      setAddBusFormData({
        name: '',
        plate_number: '',
        bus_type: 'ac',
        total_seats: 40,
        from_city: '',
        to_city: '',
        route_description: '',
        status: 'active',
        color: '',
        amenities: []
      });
      setAddBusImage(null);
      setAddBusImagePreview(null);
      setShowAddBusModal(false);
      
      if (owner) {
        await fetchBuses(owner.id);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setAddBusError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setAddingBus(false);
    }
  };

  const openDriverModal = (busId: string) => {
    setSelectedBusId(busId);
    setShowDriverModal(true);
  };

  const openTimetableModal = (bus: BusInterface) => {
    setSelectedBusForTimetable(bus);
    setShowTimetableModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Owner Profile Not Found</h2>
          <p className="text-gray-600">Please complete your owner registration first.</p>
        </div>
      </div>
    );
  }

  const totalBuses = buses.length;
  const activeBuses = buses.filter(bus => bus.status === 'active').length;
  const assignedDrivers = buses.filter(bus => bus.assigned_driver).length;
  const totalSchedules = Object.values(timetables).reduce((sum, schedules) => sum + schedules.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {owner.company_name || 'Vehicle Owner'}</p>
        </div>

        <div className="mb-4">
  <a
  href={`https://mail.google.com/mail/?view=cm&to=admin@omniport.com&su=${encodeURIComponent('Request to update Driver Details')}&body=${encodeURIComponent('Please update my driver details as follows:\n\nFull Name:\nLicense Number:\nPhone:\nRequested Change:\n')}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
>
  Request Change of Driver Details
</a>

</div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Buses</p>
                <p className="text-2xl font-bold text-gray-900">{totalBuses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Buses</p>
                <p className="text-2xl font-bold text-gray-900">{activeBuses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{assignedDrivers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Schedules</p>
                <p className="text-2xl font-bold text-gray-900">{totalSchedules}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">My Buses</h2>
              <button 
                onClick={() => setShowAddBusModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bus
              </button>
            </div>
          </div>

          <div className="p-6">
            {buses.length === 0 ? (
              <div className="text-center py-12">
                <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No buses registered</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first bus to the fleet.</p>
                <button 
                  onClick={() => setShowAddBusModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Bus
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {buses.map((bus) => (
                  <div key={bus.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    {/* Bus Image */}
                    {bus.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={bus.image_url} 
                          alt={bus.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{bus.name}</h3>
                          <p className="text-sm text-gray-600">{bus.plate_number}</p>
                          {bus.color && (
                            <p className="text-sm text-gray-500">Color: {bus.color}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Edit Bus"
                            onClick={() => handleEditBus(bus)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete Bus"
                            onClick={() => handleDeleteBus(bus.id, bus.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {bus.from_city} → {bus.to_city}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2" />
                          {bus.total_seats} seats • {bus.bus_type}
                        </div>
                        <div className="flex items-center text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            bus.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {bus.status}
                          </span>
                        </div>
                      </div>

                      {/* Driver Assignment */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">Driver:</span>
                          </div>
                          {bus.assigned_driver ? (
                            <div className="flex items-center space-x-2">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {bus.assigned_driver.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {bus.assigned_driver.experience_years} years exp.
                                </p>
                              </div>
                              <button
                                onClick={() => handleUnassignDriver(bus.id, bus.assigned_driver!.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Unassign
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openDriverModal(bus.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assign Driver
                            </button>
                          )}
                        </div>
                      </div>

                      {/* GPS Tracker Assignment */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">GPS Tracker:</span>
                          </div>
                          {bus.gps_tracker ? (
                            <div className="flex items-center space-x-2">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 font-mono">
                                  {bus.gps_tracker}
                                </p>
                                <p className="text-xs text-gray-600">Active</p>
                              </div>
                              <button
                                onClick={() => openGPSModal(bus.id, bus.gps_tracker)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                                title="Edit GPS Tracker"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveGPS(bus.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openGPSModal(bus.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Assign GPS
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Weekly Schedule Summary */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-700">Weekly Schedule</span>
                          </div>
                          <button
                            onClick={() => openTimetableModal(bus)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Manage →
                          </button>
                        </div>
                        {timetables[bus.id] && timetables[bus.id].length > 0 ? (
                          <div className="space-y-1">
                            {timetables[bus.id].slice(0, 3).map((schedule) => (
                              <div key={schedule.id} className="flex justify-between text-xs text-gray-600">
                                <span>{dayNames[schedule.day_of_week]}</span>
                                <span>{schedule.departure_time} - {schedule.arrival_time}</span>
                              </div>
                            ))}
                            {timetables[bus.id].length > 3 && (
                              <p className="text-xs text-gray-500">
                                +{timetables[bus.id].length - 3} more schedules
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No schedules configured</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GPS Modal */}
        {showGPSModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Assign GPS Tracker</h3>
                  <button
                    onClick={() => {
                      setShowGPSModal(false);
                      setSelectedBusForGPS('');
                      setGpsTrackerId('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the GPS tracker ID for this bus. This will be used for live tracking.
                  </p>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GPS Tracker ID *
                  </label>
                  <input
                    type="text"
                    value={gpsTrackerId}
                    onChange={(e) => setGpsTrackerId(e.target.value)}
                    placeholder="e.g., catsat-x001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: catsat-x001, gps-tracker-123, etc.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex">
                    <MapPin className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Tracking URL:</p>
                      <p className="text-xs break-all">
                        https://bus.ideago.dev/map.php/?sn={gpsTrackerId || 'tracker-id'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowGPSModal(false);
                      setSelectedBusForGPS('');
                      setGpsTrackerId('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    disabled={assigningGPS}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignGPS}
                    disabled={assigningGPS || !gpsTrackerId.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigningGPS ? 'Assigning...' : gpsTrackerId && selectedBusForGPS ? 'Update Tracker' : 'Assign Tracker'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Driver Assignment Modal */}
        {showDriverModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Assign Driver</h3>
                  <button
                    onClick={() => setShowDriverModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {drivers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No available drivers found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 cursor-pointer transition"
                        onClick={() => handleAssignDriver(driver.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary-600" />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{driver.users.name}</h4>
                              <div className="flex items-center space-x-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <Award className="h-3 w-3 mr-1" />
                                  {driver.license_number}
                                </span>
                                <span>{driver.experience_years} years exp.</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {driver.users.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Bus Modal with Color and Image Upload */}
        {showEditModal && editingBus && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Bus</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bus Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plate Number *</label>
                    <input
                      type="text"
                      value={editFormData.plate_number}
                      onChange={(e) => setEditFormData({...editFormData, plate_number: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bus Type *</label>
                      <select
                        value={editFormData.bus_type}
                        onChange={(e) => setEditFormData({...editFormData, bus_type: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="ac">AC</option>
                        <option value="non_ac">Non-AC</option>
                        <option value="sleeper">Sleeper</option>
                        <option value="semi_sleeper">Semi-Sleeper</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Seats *</label>
                      <input
                        type="number"
                        value={editFormData.total_seats}
                        onChange={(e) => setEditFormData({...editFormData, total_seats: parseInt(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">From City *</label>
                      <select
                        value={editFormData.from_city}
                        onChange={(e) => setEditFormData({...editFormData, from_city: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select City</option>
                        {locations.map(location => (
                          <option key={location.id} value={location.name}>{location.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">To City *</label>
                      <select
                        value={editFormData.to_city}
                        onChange={(e) => setEditFormData({...editFormData, to_city: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select City</option>
                        {locations.map(location => (
                          <option key={location.id} value={location.name}>{location.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Color *</label>
                    <select
                      value={editFormData.color}
                      onChange={(e) => setEditFormData({...editFormData, color: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Color</option>
                      {vehicleColors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Update Vehicle Image (Max 2MB)</label>
                    {editBusImagePreview ? (
                      <div className="relative">
                        <img 
                          src={editBusImagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditBusImage(null);
                            setEditBusImagePreview(editingBus.image_url || null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> new vehicle image
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG or WEBP (MAX 2MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditBusImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateBus}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Bus Modal with Color and Image Upload */}
        {showAddBusModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white my-10">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Bus</h3>
                  <button
                    onClick={() => {
                      setShowAddBusModal(false);
                      setAddBusError('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {addBusError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {addBusError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bus Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={addBusFormData.name}
                      onChange={handleAddBusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Express Luxury Coach"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plate Number *</label>
                    <input
                      type="text"
                      name="plate_number"
                      value={addBusFormData.plate_number}
                      onChange={handleAddBusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., ABC-1234"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bus Type *</label>
                      <select
                        name="bus_type"
                        value={addBusFormData.bus_type}
                        onChange={handleAddBusChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="ac">AC</option>
                        <option value="non_ac">Non-AC</option>
                        <option value="sleeper">Sleeper</option>
                        <option value="semi_sleeper">Semi-Sleeper</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Seats *</label>
                      <input
                        type="number"
                        name="total_seats"
                        value={addBusFormData.total_seats}
                        onChange={handleAddBusChange}
                        min="10"
                        max="60"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">From City *</label>
                      <select
                        name="from_city"
                        value={addBusFormData.from_city}
                        onChange={handleAddBusChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select City</option>
                        {locations.map(location => (
                          <option key={location.id} value={location.name}>{location.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">To City *</label>
                      <select
                        name="to_city"
                        value={addBusFormData.to_city}
                        onChange={handleAddBusChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select City</option>
                        {locations.map(location => (
                          <option key={location.id} value={location.name}>{location.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Color *</label>
                    <select
                      name="color"
                      value={addBusFormData.color}
                      onChange={handleAddBusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Color</option>
                      {vehicleColors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Image (Max 2MB) *</label>
                    {addBusImagePreview ? (
                      <div className="relative">
                        <img 
                          src={addBusImagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg border-2 border-yellow-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAddBusImage(null);
                            setAddBusImagePreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> vehicle image
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG or WEBP (MAX 2MB)</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddBusImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Route Description (Optional)</label>
                    <textarea
                      name="route_description"
                      value={addBusFormData.route_description}
                      onChange={handleAddBusChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe the route..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                    <div className="grid grid-cols-2 gap-2">
                      {amenitiesOptions.map(amenity => (
                        <label key={amenity} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={addBusFormData.amenities.includes(amenity)}
                            onChange={() => handleAddBusAmenitiesToggle(amenity)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddBusModal(false);
                      setAddBusError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={addingBus}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBusSubmit}
                    disabled={addingBus}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {addingBus ? 'Adding...' : 'Add Bus'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timetable Modal */}
        {showTimetableModal && selectedBusForTimetable && (
          <TimetableModal
            bus={selectedBusForTimetable}
            onClose={() => {
              setShowTimetableModal(false);
              setSelectedBusForTimetable(null);
              fetchOwnerData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
