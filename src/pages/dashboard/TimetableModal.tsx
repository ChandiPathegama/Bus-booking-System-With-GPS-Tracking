import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Clock, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BusInterface {
  id: string;
  name: string;
  plate_number: string;
  from_city: string;
  to_city: string;
}

interface TimetableModalProps {
  bus: BusInterface;
  onClose: () => void;
}

interface WeeklyTimetable {
  id?: string;
  bus_id: string;
  driver_id?: string | null;
  day_of_week: number;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  is_active: boolean;
}

const TimetableModal: React.FC<TimetableModalProps> = ({ bus, onClose }) => {
  const [timetables, setTimetables] = useState<WeeklyTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<WeeklyTimetable | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  const [formData, setFormData] = useState<WeeklyTimetable>({
    bus_id: bus.id,
    day_of_week: 1,
    departure_time: '08:00',
    arrival_time: '12:00',
    price_per_seat: 0,
    is_active: true
  });

  useEffect(() => {
    fetchTimetables();
  }, [bus.id]);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weekly_timetables')
        .select('*')
        .eq('bus_id', bus.id)
        .order('day_of_week')
        .order('departure_time');

      if (error) throw error;
      setTimetables(data || []);
    } catch (error) {
      console.error('Error fetching timetables:', error);
      alert('Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      bus_id: bus.id,
      day_of_week: 1,
      departure_time: '08:00',
      arrival_time: '12:00',
      price_per_seat: 0,
      is_active: true
    });
    setEditingSchedule(null);
    setShowScheduleForm(true);
  };

  const handleEdit = (schedule: WeeklyTimetable) => {
    setFormData(schedule);
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (editingSchedule?.id) {
        // Update existing schedule
        const { error } = await supabase
          .from('weekly_timetables')
          .update({
            day_of_week: formData.day_of_week,
            departure_time: formData.departure_time,
            arrival_time: formData.arrival_time,
            price_per_seat: formData.price_per_seat,
            is_active: formData.is_active
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;
        alert('Schedule updated successfully!');
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('weekly_timetables')
          .insert([{
            bus_id: bus.id,
            day_of_week: formData.day_of_week,
            departure_time: formData.departure_time,
            arrival_time: formData.arrival_time,
            price_per_seat: formData.price_per_seat,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        alert('Schedule created successfully!');
      }

      setShowScheduleForm(false);
      setEditingSchedule(null);
      fetchTimetables();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      alert(`Failed to save schedule: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('weekly_timetables')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      alert('Schedule deleted successfully!');
      fetchTimetables();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      alert(`Failed to delete schedule: ${error.message}`);
    }
  };

  const toggleActive = async (schedule: WeeklyTimetable) => {
    try {
      const { error } = await supabase
        .from('weekly_timetables')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;
      fetchTimetables();
    } catch (error: any) {
      console.error('Error toggling schedule:', error);
      alert(`Failed to update schedule: ${error.message}`);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDayLabel = (dayNum: number) => {
    return daysOfWeek.find(d => d.value === dayNum)?.label || '';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Weekly Timetable</h3>
              <p className="text-sm text-gray-600 mt-1">
                {bus.name} ({bus.plate_number}) • {bus.from_city} → {bus.to_city}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Schedule Form */}
          {showScheduleForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week *
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Seat (LKR) *
                  </label>
                  <input
                    type="number"
                    value={formData.price_per_seat}
                    onChange={(e) => setFormData({ ...formData, price_per_seat: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Time *
                  </label>
                  <input
                    type="time"
                    value={formData.departure_time}
                    onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrival Time *
                  </label>
                  <input
                    type="time"
                    value={formData.arrival_time}
                    onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowScheduleForm(false);
                    setEditingSchedule(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </div>
          )}

          {/* Schedules List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading schedules...</p>
              </div>
            ) : timetables.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules configured</h3>
                <p className="text-gray-600 mb-4">Create your first weekly schedule to get started.</p>
                <button
                  onClick={handleAddNew}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Schedule
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {daysOfWeek.map(day => {
                  const daySchedules = timetables.filter(t => t.day_of_week === day.value);
                  
                  if (daySchedules.length === 0) return null;

                  return (
                    <div key={day.value} className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">{day.label}</h4>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {daySchedules.map(schedule => (
                          <div key={schedule.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex-1 grid grid-cols-4 gap-4">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                <div>
                                  <p className="text-xs text-gray-500">Departure</p>
                                  <p className="font-semibold text-gray-900">{formatTime(schedule.departure_time)}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                <div>
                                  <p className="text-xs text-gray-500">Arrival</p>
                                  <p className="font-semibold text-gray-900">{formatTime(schedule.arrival_time)}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                                <div>
                                  <p className="text-xs text-gray-500">Price</p>
                                  <p className="font-semibold text-gray-900">LKR {schedule.price_per_seat.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button
                                  onClick={() => toggleActive(schedule)}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                    schedule.is_active
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {schedule.is_active ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    'Inactive'
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleEdit(schedule)}
                                className="p-2 text-blue-600 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id!)}
                                className="p-2 text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {timetables.length} schedule{timetables.length !== 1 ? 's' : ''} configured
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
