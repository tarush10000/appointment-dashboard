"use client"

import { CalendarDays, Check, Clock, Phone, Plus, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const AppointmentDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | ''>('');
    type Appointment = {
        id: string;
        name: string;
        phone: string;
        service_type: string;
        time_slot: string;
        status: string;
        given_time?: string;
        estimated_time?: string;
        [key: string]: any;
    };

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    type SlotDetails = {
        timeSlot: TimeSlot;
        bookedSlots: number;
        availableSlots: number;
        totalSlots: number;
        appointments: Appointment[];
        valid: boolean;
        estimatedTime?: string;
        slotName: string;
        duration: string;
    } | null;

    const [slotDetails, setSlotDetails] = useState<SlotDetails>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        name: '',
        phone: '',
        service_type: 'Consultation'
    });

    const API_BASE = 'https://appointment-5tt0.onrender.com/api'; // Replace with your actual API URL

    const SLOT_CONFIG = {
        '10:30 AM - 11:30 AM': { max: 4, name: 'Morning Slot 1', duration: '1 hour' },
        '11:30 AM - 12:30 PM': { max: 4, name: 'Morning Slot 2', duration: '1 hour' },
        '12:30 PM - 1:30 PM': { max: 4, name: 'Morning Slot 3', duration: '1 hour' },
        '1:30 PM - 2:00 PM': { max: 2, name: 'Morning Slot 4', duration: '30 minutes' },
        '4:30 PM - 5:30 PM': { max: 4, name: 'Evening Slot 1', duration: '1 hour' },
        '5:30 PM - 6:00 PM': { max: 2, name: 'Evening Slot 2', duration: '30 minutes' }
    } as const;

    type TimeSlot = keyof typeof SLOT_CONFIG;

    const timeSlots: TimeSlot[] = Object.keys(SLOT_CONFIG) as TimeSlot[];
    const serviceTypes = ['Consultation', 'Follow-up', 'Checkup', 'Treatment'];

    // Fetch appointments for selected date
    const fetchAppointments = async (date: string) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/admin/appointments?date=${date}`);
            const data = await response.json();
            setAppointments(data.appointments || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };
    const fetchSlotDetails = async (date: string, timeSlot: TimeSlot) => {
        try {
            const response = await fetch(`${API_BASE}/appointments/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_date: date, time_slot: timeSlot })
            });
            const data = await response.json();

            const slotAppointments = appointments.filter(apt => apt.time_slot === timeSlot);
            const slotConfig = SLOT_CONFIG[timeSlot];
            const maxSlots = slotConfig ? slotConfig.max : 4;
            const bookedSlots = slotAppointments.length;

            setSlotDetails({
                timeSlot,
                bookedSlots,
                availableSlots: maxSlots - bookedSlots,
                totalSlots: maxSlots,
                appointments: slotAppointments,
                valid: data.valid,
                estimatedTime: data.estimated_time,
                slotName: slotConfig ? slotConfig.name : timeSlot,
                duration: slotConfig ? slotConfig.duration : '1 hour'
            });
        } catch (error) {
            console.error('Error fetching slot details:', error);
        }
    };

    // Mark patient as seen
    const markAsSeen = async (appointmentId: string) => {
        try {
            const response = await fetch(`${API_BASE}/admin/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: appointmentId, status: 'completed' })
            });

            if (response.ok) {
                fetchAppointments(selectedDate);
                if (selectedTimeSlot) {
                    fetchSlotDetails(selectedDate, selectedTimeSlot);
                }
            }
        } catch (error) {
            console.error('Error marking as seen:', error);
        }
    };

    // Add new appointment
    const addAppointment = async () => {
        if (!newAppointment.name || !newAppointment.phone || !selectedTimeSlot) {
            alert('Please fill all fields and select a time slot');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newAppointment,
                    appointment_date: selectedDate,
                    time_slot: selectedTimeSlot
                })
            });

            if (response.ok) {
                setNewAppointment({ name: '', phone: '', service_type: 'Consultation' });
                setShowAddForm(false);
                fetchAppointments(selectedDate);
                fetchSlotDetails(selectedDate, selectedTimeSlot);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to add appointment');
            }
        } catch (error) {
            console.error('Error adding appointment:', error);
            alert('Error adding appointment');
        }
    };

    // Effects
    useEffect(() => {
        fetchAppointments(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (selectedTimeSlot) {
            fetchSlotDetails(selectedDate, selectedTimeSlot);
        } else {
            setSlotDetails(null);
        }
    }, [selectedTimeSlot, appointments]);

    // Get appointments by time slot for day overview
    const getSlotSummary = (timeSlot: TimeSlot) => {
        const slotAppts = appointments.filter(apt => apt.time_slot === timeSlot);
        return {
            total: slotAppts.length,
            pending: slotAppts.filter(apt => apt.status === 'pending').length,
            completed: slotAppts.filter(apt => apt.status === 'completed').length
        };
    };

    const formatTime = (timeString: string | undefined) => {
        if (!timeString) return 'Not assigned';
        return timeString;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'confirmed': return 'status-confirmed';
            case 'completed': return 'status-completed';
            default: return 'status-default';
        }
    };

    return (
        <div className="dashboard-container">
            <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background-color: #f9fafb;
          padding: 16px;
        }
        
        .dashboard-content {
          max-width: 448px;
          margin: 0 auto;
        }
        
        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .header-title {
          font-size: 20px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .form-group {
          margin-bottom: 8px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
        }
        
        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        
        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .slot-button {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        
        .slot-button:hover {
          border-color: #d1d5db;
        }
        
        .slot-button.active {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        
        .slot-button-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .slot-title {
          font-weight: 500;
          color: #111827;
        }
        
        .slot-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin: 2px 0;
        }
        
        .slot-info {
          font-size: 14px;
          color: #6b7280;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .summary-card {
          text-align: center;
          padding: 8px;
          border-radius: 6px;
        }
        
        .summary-card.booked {
          background-color: #f9fafb;
        }
        
        .summary-card.available {
          background-color: #f0fdf4;
        }
        
        .summary-card.total {
          background-color: #eff6ff;
        }
        
        .summary-number {
          font-size: 18px;
          font-weight: bold;
          color: #111827;
        }
        
        .summary-number.green {
          color: #059669;
        }
        
        .summary-number.blue {
          color: #2563eb;
        }
        
        .summary-label {
          font-size: 12px;
          color: #6b7280;
        }
        
        .next-appointment {
          background-color: #eff6ff;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .next-appointment-label {
          font-size: 14px;
          color: #2563eb;
          font-weight: 500;
        }
        
        .next-appointment-time {
          font-size: 18px;
          font-weight: bold;
          color: #1d4ed8;
        }
        
        .section-title {
          font-weight: 500;
          color: #111827;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .appointment-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }
        
        .appointment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .appointment-info {
          flex: 1;
        }
        
        .appointment-name {
          font-weight: 500;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .appointment-phone {
          font-size: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        
        .appointment-service {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .appointment-time {
          font-size: 14px;
          font-weight: 500;
          color: #2563eb;
          margin-top: 4px;
        }
        
        .appointment-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-pending {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-confirmed {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .status-completed {
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .status-default {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #2563eb;
        }
        
        .btn-success {
          background-color: #10b981;
          color: white;
          font-size: 12px;
          padding: 4px 8px;
        }
        
        .btn-success:hover {
          background-color: #059669;
        }
        
        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #4b5563;
        }
        
        .overview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        
        .overview-info h4 {
          font-weight: 500;
          margin: 0 0 4px 0;
        }
        
        .overview-info p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
        
        .overview-stats {
          text-align: right;
        }
        
        .overview-stats .pending {
          color: #d97706;
        }
        
        .overview-stats .completed {
          color: #059669;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }
        
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 16px;
          width: 100%;
          max-width: 384px;
        }
        
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .modal-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        
        .btn-full {
          flex: 1;
        }
        
        .selected-slot-info {
          background-color: #eff6ff;
          padding: 8px;
          border-radius: 6px;
        }
        
        .selected-slot-text {
          font-size: 14px;
          color: #2563eb;
        }
        
        .empty-state {
          text-align: center;
          padding: 16px;
          color: #6b7280;
        }
        
        .loading {
          text-align: center;
          padding: 16px;
          color: #6b7280;
        }
        
        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .slot-header-info h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        
        .slot-header-info p {
          font-size: 14px;
          color: #6b7280;
          margin: 4px 0 0 0;
        }
        
        @media (max-width: 640px) {
          .dashboard-container {
            padding: 8px;
          }
          
          .card {
            padding: 12px;
          }
          
          .form-input {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `}</style>

            <div className="dashboard-content">
                {/* Header */}
                <div className="card">
                    <h1 className="header-title">
                        <CalendarDays size={20} />
                        Appointment Dashboard
                    </h1>

                    {/* Date Selector */}
                    <div className="form-group">
                        <label className="form-label">Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* Time Slot Selector */}
                <div className="card">
                    <label className="form-label">Select Time Slot</label>
                    <div>
                        {timeSlots.map((slot) => {
                            const summary = getSlotSummary(slot);
                            const slotConfig = SLOT_CONFIG[slot];
                            return (
                                <button
                                    key={slot}
                                    onClick={() => setSelectedTimeSlot(slot === selectedTimeSlot ? '' : slot)}
                                    className={`slot-button ${selectedTimeSlot === slot ? 'active' : ''}`}
                                >
                                    <div className="slot-button-content">
                                        <div>
                                            <div className="slot-title">{slot}</div>
                                            <div className="slot-subtitle">{slotConfig.name} • {slotConfig.duration}</div>
                                            <div className="slot-info">
                                                {summary.total}/{slotConfig.max} booked • {summary.pending} pending • {summary.completed} done
                                            </div>
                                        </div>
                                        <Clock size={16} color="#9ca3af" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Slot Details */}
                {slotDetails && (
                    <div className="card">
                        <div className="slot-header">
                            <div className="slot-header-info">
                                <h2>{slotDetails.timeSlot}</h2>
                                <p>{slotDetails.slotName} • {slotDetails.duration}</p>
                            </div>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="btn btn-primary"
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        </div>

                        {/* Slot Summary */}
                        <div className="summary-grid">
                            <div className="summary-card booked">
                                <div className="summary-number">{slotDetails.bookedSlots}</div>
                                <div className="summary-label">Booked</div>
                            </div>
                            <div className="summary-card available">
                                <div className="summary-number green">{slotDetails.availableSlots}</div>
                                <div className="summary-label">Available</div>
                            </div>
                            <div className="summary-card total">
                                <div className="summary-number blue">{slotDetails.totalSlots}</div>
                                <div className="summary-label">Total</div>
                            </div>
                        </div>

                        {/* Next appointment time */}
                        {slotDetails.estimatedTime && (
                            <div className="next-appointment">
                                <div className="next-appointment-label">Next appointment time:</div>
                                <div className="next-appointment-time">{slotDetails.estimatedTime}</div>
                            </div>
                        )}

                        {/* Appointments List */}
                        <div>
                            <h3 className="section-title">
                                <Users size={16} />
                                Appointments ({slotDetails.appointments.length})
                            </h3>

                            {slotDetails.appointments.map((appointment) => (
                                <div key={appointment.id} className="appointment-card">
                                    <div className="appointment-header">
                                        <div className="appointment-info">
                                            <div className="appointment-name">
                                                <User size={16} />
                                                {appointment.name}
                                            </div>
                                            <div className="appointment-phone">
                                                <Phone size={12} />
                                                {appointment.phone}
                                            </div>
                                            <div className="appointment-service">
                                                {appointment.service_type}
                                            </div>
                                            <div className="appointment-time">
                                                Time: {formatTime(appointment.given_time || appointment.estimated_time)}
                                            </div>
                                        </div>

                                        <div className="appointment-actions">
                                            <span className={`status-badge ${getStatusColor(appointment.status)}`}>
                                                {appointment.status}
                                            </span>

                                            {appointment.status === 'pending' && (
                                                <button
                                                    onClick={() => markAsSeen(appointment.id)}
                                                    className="btn btn-success"
                                                >
                                                    <Check size={12} />
                                                    Seen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {slotDetails.appointments.length === 0 && (
                                <div className="empty-state">
                                    No appointments in this slot
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Day Overview */}
                <div className="card">
                    <h2 className="section-title">Today's Overview</h2>
                    <div>
                        {timeSlots.map((slot) => {
                            const summary = getSlotSummary(slot);
                            const slotConfig = SLOT_CONFIG[slot];
                            return (
                                <div key={slot} className="overview-item">
                                    <div className="overview-info">
                                        <h4>{slot}</h4>
                                        <div className="slot-subtitle">{slotConfig.name}</div>
                                        <p>{summary.total}/{slotConfig.max} appointments</p>
                                    </div>
                                    <div className="overview-stats">
                                        <div style={{ fontSize: '14px' }}>
                                            <span className="pending">{summary.pending} pending</span>
                                            {summary.pending > 0 && summary.completed > 0 && " • "}
                                            {summary.completed > 0 && (
                                                <span className="completed">{summary.completed} done</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Add Appointment Modal */}
                {showAddForm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 className="modal-title">Add Appointment</h3>
                            <div>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        value={newAppointment.name}
                                        onChange={(e) => setNewAppointment(prev => ({ ...prev, name: e.target.value }))}
                                        className="form-input"
                                        placeholder="Patient name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        value={newAppointment.phone}
                                        onChange={(e) => setNewAppointment(prev => ({ ...prev, phone: e.target.value }))}
                                        className="form-input"
                                        placeholder="Phone number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Service</label>
                                    <select
                                        value={newAppointment.service_type}
                                        onChange={(e) => setNewAppointment(prev => ({ ...prev, service_type: e.target.value }))}
                                        className="form-input"
                                    >
                                        {serviceTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedTimeSlot && (
                                    <div className="selected-slot-info">
                                        <div className="selected-slot-text">Selected slot: {selectedTimeSlot}</div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="btn btn-secondary btn-full"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addAppointment}
                                    className="btn btn-primary btn-full"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="loading">
                        Loading...
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentDashboard;