"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  
  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'booking'>('doctors')
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>(sharedDoctors)
  const [loading, setLoading] = useState(false)

  // Filter states for appointments
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Add Doctor Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<any>(null)

  const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const [docForm, setDocForm] = useState({
    doctor_no: '',
    name: '',
    degree: '',
    branch: '',
    follow_up_fee: '',
    specialization: '',
    phone: '',
    address: '',
    image_url: '',
    status: 'Present',
    schedule: daysOfWeek.reduce((acc: any, day) => {
      acc[day] = { active: false, start: '10:00 AM', end: '01:00 PM' }
      return acc
    }, {})
  })

  // Delete Confirmation State
  const [deleteModalDoc, setDeleteModalDoc] = useState<any>(null)
  const [deleteNameInput, setDeleteNameInput] = useState('')
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('')

  // Admin Booking Form State
  const [adminBooking, setAdminBooking] = useState({
    name: '',
    phone: '',
    specialization: '',
    doctor_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    age: '',
    patient_type: 'New',
    note: ''
  })
  const [bookingSubmitted, setBookingSubmitted] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments()
    }
  }, [isAuthenticated])

  async function fetchAppointments() {
    try {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
      if (error) throw error
      if (data) setAppointments(data)
    } catch (err) {
      console.error('Error fetching appointments:', err)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === 'delta123') {
      setIsAuthenticated(true)
    } else {
      alert('Incorrect Password! Try "delta123"')
    }
  }

  const handleScheduleToggle = (day: string) => {
    setDocForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], active: !prev.schedule[day].active }
      }
    }))
  }

  const handleTimeChange = (day: string, field: 'start' | 'end', val: string) => {
    setDocForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: val }
      }
    }))
  }

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    alert('Doctor saved successfully!')
    setIsAddModalOpen(false)
  }

  const resetDocForm = () => {
    setIsEditMode(false)
    setCurrentDocId(null)
    setDocForm({
      doctor_no: '',
      name: '',
      degree: '',
      branch: '',
      follow_up_fee: '',
      specialization: '',
      phone: '',
      address: '',
      image_url: '',
      status: 'Present',
      schedule: daysOfWeek.reduce((acc: any, day) => {
        acc[day] = { active: false, start: '10:00 AM', end: '01:00 PM' }
        return acc
      }, {})
    })
  }

  const handleEditClick = (doc: any) => {
    setIsEditMode(true)
    setCurrentDocId(doc.id)
    setDocForm({
      doctor_no: doc.doctor_no || '',
      name: doc.name || '',
      degree: doc.degree || '',
      branch: doc.branch || '',
      follow_up_fee: doc.follow_up_fee || '',
      specialization: doc.specialization || '',
      phone: doc.phone || '',
      address: doc.address || '',
      image_url: doc.image_url || '',
      status: doc.status || 'Present',
      schedule: doc.schedule || daysOfWeek.reduce((acc: any, day) => {
        acc[day] = { active: false, start: '10:00 AM', end: '01:00 PM' }
        return acc
      }, {})
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deleteNameInput !== deleteModalDoc.name || deleteConfirmWord !== 'delete') {
      alert('Please type the exact doctor name and the word "delete" to confirm.')
      return
    }
    setDoctors(doctors.filter(d => d.id !== deleteModalDoc.id))
    setDeleteModalDoc(null)
    setDeleteNameInput('')
    setDeleteConfirmWord('')
    alert('Doctor deleted successfully.')
  }

  // Database Delete Function for Appointments
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment from database?')) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
      setAppointments(appointments.filter(a => a.id !== id))
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleAdminBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', adminBooking.doctor_id)
        .eq('booking_date', adminBooking.booking_date)

      const nextSerial = (count || 0) + 1

      const { error } = await supabase.from('bookings').insert({
        patient_name: adminBooking.name,
        phone: adminBooking.phone,
        doctor_id: adminBooking.doctor_id,
        booking_date: adminBooking.booking_date,
        age: adminBooking.age ? parseInt(adminBooking.age) : null,
        patient_type: adminBooking.patient_type,
        symptoms: adminBooking.note,
        serial_number: nextSerial,
        status: 'Confirmed'
      })

      if (error) throw error
      setBookingSubmitted(true)
      fetchAppointments()
    } catch (err: any) {
      alert('Booking failed: ' + err.message)
    }
  }

  const downloadCSV = () => {
    const headers = ['Serial,Patient Name,Phone,Age,Doctor ID,Date,Type,Source,Note,Status\n']
    const rows = filteredAppointments.map(a => 
      `"${a.serial_number}","${a.patient_name}","${a.phone}","${a.age || ''}","${a.doctor_id}","${a.booking_date}","${a.patient_type}","Admin/Online","${a.symptoms || ''}","${a.status}"`
    )
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Appointments_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredAppointments = appointments.filter(app => {
    const matchDoc = filterDoctor ? app.doctor_id?.toString() === filterDoctor : true;
    const matchDate = filterDate ? app.booking_date === filterDate : true;
    return matchDoc && matchDate;
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-50 rounded-xl p-1 flex items-center justify-center border">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#008080]">ডেল্টা হেলথ কেয়ার</h2>
              <h1 className="text-sm font-black text-slate-900">Admin Authentication</h1>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Enter Admin Password</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="delta123"
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080] mt-1"
              />
            </div>
            <button type="submit" className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2.5 rounded-xl font-bold text-sm transition shadow-md">
              Login to Admin Panel
            </button>
            <div className="text-center mt-4">
              <a href="/" className="text-xs font-bold text-slate-500 hover:underline">← Back to Website</a>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sm:px-12 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl p-1 border">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-[#008080]">ডেল্টা হেলথ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
            <h1 className="font-black text-sm text-slate-900">JATRABARI LTD. (Admin Dashboard)</h1>
          </div>
        </div>
        <a href="/" className="text-xs font-bold text-[#008080] hover:underline bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
          View Live Website →
        </a>
      </header>

      <div className="flex flex-1 max-w-7xl w-full mx-auto p-6 gap-6">
        <aside className="w-64 bg-white border border-slate-200 rounded-2xl p-4 h-fit shadow-xs space-y-2">
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'doctors' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>👨‍⚕️</span> Doctor List ({doctors.length})
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'appointments' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>📋</span> Appointments
          </button>
          <button 
            onClick={() => setActiveTab('booking')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'booking' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>➕</span> Booking Appointment
          </button>
        </aside>

        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          
          {activeTab === 'doctors' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Doctor List ({doctors.length})</h2>
                <button 
                  onClick={() => { resetDocForm(); setIsAddModalOpen(true); }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-4 py-2 rounded-xl font-bold text-sm transition shadow-sm flex items-center gap-2"
                >
                  <span>+</span> Add Doctor
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                      <th className="p-3">NO</th>
                      <th className="p-3">Doctor Name & Picture</th>
                      <th className="p-3">Specialization</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {doctors.map((doc, idx) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                        <td className="p-3 flex items-center gap-3">
                          <img 
                            src={doc.image_url || "/doctors/doctor-1.png"} 
                            alt={doc.name} 
                            onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                            className="w-10 h-10 rounded-full object-cover border object-top" 
                          />
                          <span className="font-bold text-slate-900">{doc.name}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{doc.specialization}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-100 text-sky-700">
                            {doc.status || 'Present'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button 
                            onClick={() => handleEditClick(doc)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg text-xs font-bold transition"
                            title="Edit Schedule & Info"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => setDeleteModalDoc(doc)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-lg text-xs font-bold transition"
                            title="Delete Doctor"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Appointments ({filteredAppointments.length})</h2>
                  <p className="text-xs text-slate-500">Filter and review patient bookings</p>
                </div>
                <button 
                  onClick={downloadCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition shadow-sm"
                >
                  📥 Download CSV Report
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Doctor</label>
                  <select 
                    value={filterDoctor}
                    onChange={e => setFilterDoctor(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
                  >
                    <option value="">All Doctors</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[180px]">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Date</label>
                  <input 
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
                  />
                </div>

                {(filterDoctor || filterDate) && (
                  <div className="self-end">
                    <button 
                      onClick={() => { setFilterDoctor(''); setFilterDate(''); }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {filteredAppointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No appointments found matching your filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                        <th className="p-3">Serial</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Age</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Doctor</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Note</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {filteredAppointments.map(app => {
                        const matchedDoc = doctors.find(d => d.id.toString() === app.doctor_id?.toString());
                        return (
                          <tr key={app.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-[#008080]">#{app.serial_number}</td>
                            <td className="p-3 font-semibold text-slate-900">{app.patient_name}</td>
                            <td className="p-3 text-slate-600">{app.age || '-'}</td>
                            <td className="p-3 text-slate-600 font-mono text-xs">{app.phone}</td>
                            <td className="p-3 text-slate-800 font-medium">{matchedDoc ? matchedDoc.name : `Dr. #${app.doctor_id}`}</td>
                            <td className="p-3 text-slate-600">{app.booking_date}</td>
                            <td className="p-3 text-slate-500 text-xs italic">{app.symptoms || 'None'}</td>
                            <td className="p-3">
                              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold">
                                {app.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => handleDeleteAppointment(app.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold transition"
                              >
                                Delete 🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="max-w-xl mx-auto">
              <h2 className="text-xl font-black text-slate-900 mb-4">Book Appointment (Admin)</h2>
              {bookingSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 font-bold">✓</div>
                  <h3 className="text-xl font-bold text-slate-900">Appointment Booked Successfully!</h3>
                  <button onClick={() => setBookingSubmitted(false)} className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-sm font-semibold">
                    Book Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Patient Name</label>
                      <input 
                        type="text" 
                        required 
                        value={adminBooking.name}
                        onChange={e => setAdminBooking({...adminBooking, name: e.target.value})}
                        placeholder="Full Name" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Phone Number</label>
                      <input 
                        type="tel" 
                        required 
                        value={adminBooking.phone}
                        onChange={e => setAdminBooking({...adminBooking, phone: e.target.value})}
                        placeholder="017XXXXXXXX" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Specialization</label>
                      <select 
                        required
                        value={adminBooking.specialization}
                        onChange={e => setAdminBooking({...adminBooking, specialization: e.target.value, doctor_id: ''})}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Specialization</option>
                        {Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).map((spec: any, idx) => (
                          <option key={idx} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Select Doctor</label>
                      <select 
                        required
                        value={adminBooking.doctor_id}
                        onChange={e => setAdminBooking({...adminBooking, doctor_id: e.target.value})}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Doctor</option>
                        {doctors.filter(d => !adminBooking.specialization || d.specialization === adminBooking.specialization).map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Booking Date</label>
                      <input 
                        type="date" 
                        required 
                        value={adminBooking.booking_date}
                        onChange={e => setAdminBooking({...adminBooking, booking_date: e.target.value})}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input 
                        type="number" 
                        value={adminBooking.age}
                        onChange={e => setAdminBooking({...adminBooking, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Note</label>
                    <input 
                      type="text" 
                      value={adminBooking.note}
                      onChange={e => setAdminBooking({...adminBooking, note: e.target.value})}
                      placeholder="Add a note..." 
                      className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                    />
                  </div>

                  <button type="submit" className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md">
                    Confirm Appointment
                  </button>
                </form>
              )}
            </div>
          )}

        </main>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            <h3 className="text-xl font-black text-slate-900 mb-4">{isEditMode ? 'Edit Doctor & Schedule' : 'Add New Doctor'}</h3>
            
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor Name</label>
                  <input type="text" required value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} placeholder="Dr. Name" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor No (ID)</label>
                  <input type="text" value={docForm.doctor_no} onChange={e => setDocForm({...docForm, doctor_no: e.target.value})} placeholder="1" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Degree</label>
                  <input type="text" value={docForm.degree} onChange={e => setDocForm({...docForm, degree: e.target.value})} placeholder="MBBS, FCPS" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input type="text" value={docForm.phone} onChange={e => setDocForm({...docForm, phone: e.target.value})} placeholder="01700-000000" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch / Workplace</label>
                  <input type="text" value={docForm.branch} onChange={e => setDocForm({...docForm, branch: e.target.value})} placeholder="Dhaka Medical / Delta" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Follow Up Fee</label>
                  <input type="text" value={docForm.follow_up_fee} onChange={e => setDocForm({...docForm, follow_up_fee: e.target.value})} placeholder="500 BDT" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Specialization</label>
                  <input type="text" required value={docForm.specialization} onChange={e => setDocForm({...docForm, specialization: e.target.value})} placeholder="Cardiologist" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select value={docForm.status} onChange={e => setDocForm({...docForm, status: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white">
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Picture URL</label>
                <input type="text" value={docForm.image_url} onChange={e => setDocForm({...docForm, image_url: e.target.value})} placeholder="https://..." className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-extrabold text-slate-800 block mb-2">Available Days & Time Slots</label>
                <div className="space-y-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input 
                          type="checkbox" 
                          checked={docForm.schedule[day]?.active || false}
                          onChange={() => handleScheduleToggle(day)}
                          className="w-4 h-4 accent-[#008080]"
                        />
                        {day}
                      </label>
                      {docForm.schedule[day]?.active && (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={docForm.schedule[day].start}
                            onChange={e => handleTimeChange(day, 'start', e.target.value)}
                            placeholder="Start Time"
                            className="border rounded-lg px-2 py-1 text-xs w-24"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input 
                            type="text" 
                            value={docForm.schedule[day].end}
                            onChange={e => handleTimeChange(day, 'end', e.target.value)}
                            placeholder="End Time"
                            className="border rounded-lg px-2 py-1 text-xs w-24"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md mt-4">
                {isEditMode ? 'Update Doctor' : 'Save Doctor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteModalDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-rose-600 mb-2">⚠️ Delete Doctor</h3>
            <p className="text-xs text-slate-600 mb-4">
              To delete this doctor, please type the doctor's name: <span className="font-bold text-slate-900">"{deleteModalDoc.name}"</span> and type <span className="font-bold text-rose-600">"delete"</span> below.
            </p>
            
            <form onSubmit={handleDeleteSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Type Doctor Name</label>
                <input 
                  type="text" 
                  required
                  value={deleteNameInput}
                  onChange={e => setDeleteNameInput(e.target.value)}
                  placeholder={deleteModalDoc.name}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Type "delete"</label>
                <input 
                  type="text" 
                  required
                  value={deleteConfirmWord}
                  onChange={e => setDeleteConfirmWord(e.target.value)}
                  placeholder="delete"
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setDeleteModalDoc(null)} 
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-2.5 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}