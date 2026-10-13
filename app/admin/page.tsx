"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'

interface ScheduleSlot {
  active: boolean
  start: string
  end: string
}

interface Doctor {
  id: string | number
  doctor_no: string
  name: string
  degree?: string
  branch?: string
  follow_up_fee?: string
  specialization: string
  phone?: string
  address?: string
  image_url?: string
  details?: string
  status: 'Present' | 'Absent'
  status_updated_at?: string
  days: string[]
  sitting_hours?: string
  schedule: Record<string, ScheduleSlot>
  created_at?: string
}

interface Appointment {
  id: string
  patient_name: string
  phone: string
  doctor_id: string
  booking_date: string
  age?: number | null
  patient_type: string
  symptoms?: string
  serial_number?: number
  computed_serial?: number
  status?: string
  created_at?: string
}

const DAYS_OF_WEEK = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
]

const DEFAULT_SCHEDULE: Record<string, ScheduleSlot> = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = { active: false, start: '10:00 AM', end: '01:00 PM' }
  return acc
}, {} as Record<string, ScheduleSlot>)

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')

  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'booking' | 'quick-reserve' | 'quick-reserve-list' | 'lab-reports'>('doctors')

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Lab & Reports State (Pulse Style)
  const [reportPatientPhone, setReportPatientPhone] = useState('')
  const [reportNameInput, setReportNameInput] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadedReportsList, setUploadedReportsList] = useState<any[]>([])
  const [sampleRequests, setSampleRequests] = useState<any[]>([
    { id: 1, date: '13/10/2026', patient: 'km', phone: '01700000000', address: 'West Dholaipar', tests: 'CBC, Lipid Profile', status: 'Pending' }
  ])

  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDateMode, setFilterDateMode] = useState('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<string | number | null>(null)
  const [doctorImageFile, setDoctorImageFile] = useState<File | null>(null)
  const [doctorImagePreview, setDoctorImagePreview] = useState<string>('')

  const [docForm, setDocForm] = useState<{
    doctor_no: string
    name: string
    degree: string
    branch: string
    details: string
    follow_up_fee: string
    specialization: string
    phone: string
    address: string
    image_url: string
    status: 'Present' | 'Absent'
    schedule: Record<string, ScheduleSlot>
  }>({
    doctor_no: '',
    name: '',
    degree: '',
    branch: '',
    details: '',
    follow_up_fee: '500 BDT',
    specialization: '',
    phone: '',
    address: '',
    image_url: '/doctors/doctor-1.png',
    status: 'Present',
    schedule: { ...DEFAULT_SCHEDULE }
  })

  const [deleteModalDoc, setDeleteModalDoc] = useState<Doctor | null>(null)
  const [deleteNameInput, setDeleteNameInput] = useState('')
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('')

  const [adminBooking, setAdminBooking] = useState({
    name: '',
    phone: '',
    specialization: '',
    doctor_id: '',
    booking_date: '',
    age: '',
    patient_type: 'Admin',
    note: ''
  })
  const [selectedAdminDoctor, setSelectedAdminDoctor] = useState<Doctor | null>(null)
  const [availableDatesForAdminDoc, setAvailableDatesForAdminDoc] = useState<any[]>([])
  const [isAdminDoctorAbsent, setIsAdminDoctorAbsent] = useState(false)
  const [bookingSubmitted, setBookingSubmitted] = useState(false)

  const [quickReserveType, setQuickReserveType] = useState('NICU')
  const [quickForm, setQuickForm] = useState({ name: '', age: '', contact: '' })
  const [quickSubmitted, setQuickSubmitted] = useState(false)

  const shouldResetAbsentStatus = (updatedAtStr?: string) => {
    if (!updatedAtStr) return false
    const updatedDate = new Date(updatedAtStr)
    const now = new Date()

    const bdNow = new Date(now.getTime() + (6 * 60 + now.getTimezoneOffset()) * 60000)
    const bdUpdated = new Date(updatedDate.getTime() + (6 * 60 + updatedDate.getTimezoneOffset()) * 60000)

    const bdCutoff = new Date(bdNow)
    bdCutoff.setHours(2, 0, 0, 0)

    if (bdNow >= bdCutoff && bdUpdated < bdCutoff) return true
    if (bdNow.getTime() - bdUpdated.getTime() > 24 * 60 * 60 * 1000) return true
    return false
  }

  // Doctor Fetch & Merge Logic (strictly prevents duplicate doctor rows)
  const fetchDoctors = useCallback(async () => {
    try {
      const { data: dbData } = await supabase.from('doctors').select('*').order('id', { ascending: true })
      const dbList = dbData || []
      const resetIds: any[] = []

      const formattedDb = dbList.map((doc: any) => {
        let currentStatus: 'Present' | 'Absent' = doc.status || 'Present'
        if (currentStatus === 'Absent' && shouldResetAbsentStatus(doc.status_updated_at)) {
          currentStatus = 'Present'
          resetIds.push(doc.id)
        }

        let sch = doc.schedule
        if (typeof sch === 'string') {
          try { sch = JSON.parse(sch) } catch (e) { sch = { ...DEFAULT_SCHEDULE } }
        }

        return {
          ...doc,
          status: currentStatus,
          details: doc.details || '',
          schedule: sch || { ...DEFAULT_SCHEDULE },
          days: Array.isArray(doc.days) ? doc.days : []
        }
      })

      // Use sharedDoctors as standard template, replace with DB rows matching doctor_no
      const mergedMap = new Map<string, any>()

      // First populate standard 24 doctors from file
      sharedDoctors.forEach((sDoc: any, idx: number) => {
        const docNo = (sDoc.doctor_no || String(idx + 1)).trim()
        mergedMap.set(docNo, {
          ...sDoc,
          doctor_no: docNo,
          id: `doc-${docNo}`,
          follow_up_fee: sDoc.fee || sDoc.follow_up_fee || '500 BDT',
          status: sDoc.status || 'Present',
          details: sDoc.details || 'Specialized in Clinical & Patient Healthcare.'
        })
      })

      // Overwrite or append with live Supabase database rows
      formattedDb.forEach((dDoc: any, idx: number) => {
        const docNo = (dDoc.doctor_no || String(idx + 1)).trim()
        const existing = mergedMap.get(docNo)
        mergedMap.set(docNo, {
          ...(existing || {}),
          ...dDoc,
          doctor_no: docNo,
          id: dDoc.id || `doc-${docNo}`,
          follow_up_fee: dDoc.follow_up_fee || existing?.follow_up_fee || '500 BDT',
          status: dDoc.status || 'Present',
          image_url: dDoc.image_url || existing?.image_url || `/doctors/doctor-${docNo}.png`,
          details: dDoc.details || existing?.details || 'Specialist Consultant'
        })
      })

      const finalDoctors = Array.from(mergedMap.values())
      setDoctors(finalDoctors)

      if (resetIds.length > 0) {
        await supabase
          .from('doctors')
          .update({ status: 'Present', status_updated_at: new Date().toISOString() })
          .in('id', resetIds)
      }
    } catch (err) {
      console.error('fetchDoctors error:', err)
      setDoctors(sharedDoctors as any)
    }
  }, [])

  const fetchAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        const { data: fallbackData } = await supabase
          .from('bookings')
          .select('*')
          .order('booking_date', { ascending: true })
        setAppointments(fallbackData || [])
        return
      }

      setAppointments(data || [])
    } catch (err) {
      console.error('fetchAppointments error:', err)
    }
  }, [])

  const fetchUploadedReports = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('patient_reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setUploadedReportsList(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors()
      fetchAppointments()
      fetchUploadedReports()
    }
  }, [isAuthenticated, fetchDoctors, fetchAppointments, fetchUploadedReports])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    if (passwordInput === 'delta123') {
      setIsAuthenticated(true)
    } else {
      setAuthError('Authentication failed: Invalid credentials. Access denied.')
    }
  }

  const getNext7Days = () => {
    const list = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      list.push(d.toISOString().split('T')[0])
    }
    return list
  }

  const getTop3AvailableDates = (doctorDays: string[]) => {
    const list = []
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      if (list.length >= 3) break
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
      if (doctorDays && doctorDays.includes(weekday)) {
        list.push({
          dateStr: d.toISOString().split('T')[0],
          display: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' }),
          weekday: weekday
        })
      }
    }
    return list
  }

  const handleAdminDoctorChange = (docId: string) => {
    setAdminBooking(prev => ({ ...prev, doctor_id: docId }))
    const doc = doctors.find(d => d.id.toString() === docId || d.doctor_no === docId)
    if (doc) {
      setSelectedAdminDoctor(doc)
      const validDates = getTop3AvailableDates(doc.days)
      setAvailableDatesForAdminDoc(validDates)
      if (validDates.length > 0 && doc.status === 'Present') {
        setAdminBooking(prev => ({ ...prev, booking_date: validDates[0].dateStr }))
        setIsAdminDoctorAbsent(false)
      } else {
        setIsAdminDoctorAbsent(doc.status === 'Absent' || validDates.length === 0)
      }
    } else {
      setSelectedAdminDoctor(null)
      setAvailableDatesForAdminDoc([])
      setIsAdminDoctorAbsent(false)
    }
  }

  const resetDocForm = () => {
    setIsEditMode(false)
    setCurrentDocId(null)
    setDoctorImageFile(null)
    setDoctorImagePreview('')
    const nextNo = String(doctors.length + 1)
    setDocForm({
      doctor_no: nextNo,
      name: '',
      degree: '',
      branch: '',
      details: '',
      follow_up_fee: '500 BDT',
      specialization: '',
      phone: '',
      address: '',
      image_url: `/doctors/doctor-${nextNo}.png`,
      status: 'Present',
      schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
    })
  }

  const handleEditClick = (doc: Doctor) => {
    setIsEditMode(true)
    setCurrentDocId(doc.id)
    setDoctorImageFile(null)
    setDoctorImagePreview(doc.image_url || '')

    const initialSchedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
    if (doc.schedule && typeof doc.schedule === 'object') {
      Object.keys(doc.schedule).forEach(day => {
        if (initialSchedule[day]) {
          initialSchedule[day] = { ...doc.schedule[day] }
        }
      })
    } else if (Array.isArray(doc.days)) {
      doc.days.forEach(day => {
        if (initialSchedule[day]) initialSchedule[day].active = true
      })
    }

    setDocForm({
      doctor_no: doc.doctor_no || String(doc.id).replace('doc-', ''),
      name: doc.name || '',
      degree: doc.degree || '',
      branch: doc.branch || '',
      details: doc.details || 'Specialized in High-Risk Pregnancy & Gynecological Surgeries.',
      follow_up_fee: doc.follow_up_fee || '500 BDT',
      specialization: doc.specialization || '',
      phone: doc.phone || '',
      address: doc.address || '',
      image_url: doc.image_url || `/doctors/doctor-${doc.doctor_no || 1}.png`,
      status: doc.status || 'Present',
      schedule: initialSchedule
    })
    setIsAddModalOpen(true)
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null
    if (file) {
      setDoctorImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setDoctorImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Doctor Save with Locked ID and Direct Database Upsert
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const activeDays = Object.keys(docForm.schedule).filter(d => docForm.schedule[d].active)
      const firstActiveDay = activeDays[0]
      const sittingHours = firstActiveDay
        ? `${docForm.schedule[firstActiveDay].start} - ${docForm.schedule[firstActiveDay].end}`
        : '10:00 AM - 01:00 PM'

      let finalImageUrl = docForm.image_url

      // Handle picture upload or preview fallback
      if (doctorImageFile) {
        const fileExt = doctorImageFile.name.split('.').pop()
        const fileName = `doc-${docForm.doctor_no}-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('doctor-photos')
          .upload(fileName, doctorImageFile, { upsert: true })

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('doctor-photos')
            .getPublicUrl(fileName)
          finalImageUrl = publicUrlData.publicUrl
        } else if (doctorImagePreview) {
          finalImageUrl = doctorImagePreview
        }
      }

      const doctorPayload: any = {
        doctor_no: docForm.doctor_no,
        name: docForm.name,
        degree: docForm.degree,
        branch: docForm.branch,
        details: docForm.details,
        follow_up_fee: docForm.follow_up_fee,
        specialization: docForm.specialization,
        phone: docForm.phone,
        address: docForm.address,
        image_url: finalImageUrl,
        status: docForm.status,
        status_updated_at: new Date().toISOString(),
        days: activeDays,
        sitting_hours: sittingHours,
        schedule: docForm.schedule
      }

      // Check existing row by doctor_no or name
      const { data: existingRows } = await supabase
        .from('doctors')
        .select('id, name, doctor_no')
        .or(`doctor_no.eq."${docForm.doctor_no}",name.eq."${docForm.name}"`)

      let saveError = null

      if (existingRows && existingRows.length > 0) {
        const targetId = existingRows[0].id
        const { error } = await supabase
          .from('doctors')
          .update(doctorPayload)
          .eq('id', targetId)
        saveError = error
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([doctorPayload])
        saveError = error
      }

      // Safe schema fallback if details column is missing
      if (saveError && saveError.message?.includes("'details'")) {
        delete doctorPayload.details
        if (existingRows && existingRows.length > 0) {
          await supabase.from('doctors').update(doctorPayload).eq('id', existingRows[0].id)
        } else {
          await supabase.from('doctors').insert([doctorPayload])
        }
      } else if (saveError) {
        throw saveError
      }

      alert('Doctor updated & synchronized successfully!')
      setIsAddModalOpen(false)
      fetchDoctors()
    } catch (err: any) {
      alert('Save failed: ' + (err.message || 'Error occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  // Upload Lab Report (Pulse Hospital Module)
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportPatientPhone || reportPatientPhone.length !== 11) {
      alert('Please provide valid 11-digit patient phone number')
      return
    }
    if (!reportFile || !reportNameInput) {
      alert('Please provide a report title and select a file')
      return
    }

    setUploadingReport(true)
    try {
      const fileExt = reportFile.name.split('.').pop()
      const fileName = `${reportPatientPhone}-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('patient-reports')
        .upload(fileName, reportFile, { upsert: true })

      let fileUrl = '#'
      if (!uploadErr && uploadData) {
        const { data: pUrl } = supabase.storage.from('patient-reports').getPublicUrl(fileName)
        fileUrl = pUrl.publicUrl
      }

      const { error: insertErr } = await supabase.from('patient_reports').insert({
        patient_phone: reportPatientPhone,
        report_name: reportNameInput,
        file_url: fileUrl,
        created_at: new Date().toISOString()
      })

      if (insertErr) throw insertErr

      alert(`Report "${reportNameInput}" uploaded successfully for ${reportPatientPhone}!`)
      setReportNameInput('')
      setReportFile(null)
      fetchUploadedReports()
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Ensure patient_reports table exists'))
    } finally {
      setUploadingReport(false)
    }
  }

  const markSampleCollected = (id: number) => {
    setSampleRequests(prev => prev.map(s => s.id === id ? { ...s, status: 'Collected' } : s))
  }

  const handleInlineStatusToggle = async (doc: Doctor) => {
    const newStatus: 'Present' | 'Absent' = doc.status === 'Present' ? 'Absent' : 'Present'
    try {
      const { data: existingRows } = await supabase
        .from('doctors')
        .select('id')
        .eq('doctor_no', doc.doctor_no)

      if (existingRows && existingRows.length > 0) {
        await supabase
          .from('doctors')
          .update({
            status: newStatus,
            status_updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id)
      } else {
        await supabase.from('doctors').insert([
          {
            doctor_no: doc.doctor_no,
            name: doc.name,
            specialization: doc.specialization,
            follow_up_fee: doc.follow_up_fee || '500 BDT',
            days: doc.days || [],
            image_url: doc.image_url,
            status: newStatus,
            status_updated_at: new Date().toISOString()
          }
        ])
      }

      setDoctors(prev =>
        prev.map(d => (d.doctor_no === doc.doctor_no ? { ...d, status: newStatus } : d))
      )
    } catch (err: any) {
      alert('Status change failed: ' + err.message)
    }
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteModalDoc) return

    if (deleteNameInput.trim() !== deleteModalDoc.name.trim() || deleteConfirmWord !== 'delete') {
      alert('Please type the exact doctor name and the word "delete" to confirm.')
      return
    }

    try {
      await supabase.from('doctors').delete().eq('doctor_no', deleteModalDoc.doctor_no)
      setDoctors(prev => prev.filter(d => d.doctor_no !== deleteModalDoc.doctor_no))
      setDeleteModalDoc(null)
      setDeleteNameInput('')
      setDeleteConfirmWord('')
      alert('Doctor deleted successfully.')
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error
      setAppointments(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleAdminBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (adminBooking.phone.length !== 11) {
      alert('Phone number must be exactly 11 digits.')
      return
    }
    if (isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0) {
      alert('Selected doctor is absent or has no available schedule.')
      return
    }

    try {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', selectedAdminDoctor!.id.toString())
        .eq('booking_date', adminBooking.booking_date)

      const nextSerial = (count || 0) + 1
      const serialNumStr = `#${nextSerial}`

      const { error } = await supabase.from('bookings').insert({
        patient_name: adminBooking.name,
        phone: adminBooking.phone,
        doctor_id: selectedAdminDoctor!.id.toString(),
        booking_date: adminBooking.booking_date,
        age: adminBooking.age ? parseInt(adminBooking.age) : null,
        patient_type: 'Admin',
        symptoms: adminBooking.note || '',
        serial_number: nextSerial,
        status: 'Confirmed'
      })

      if (error) throw error

      try {
        await fetch('https://client.giosms.com/api/v1/send', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            to: `88${adminBooking.phone}`,
            message: `Delta Health Care Jatrabari Ltd.\nDear ${adminBooking.name}, your appointment with ${selectedAdminDoctor!.name} on ${adminBooking.booking_date} (${selectedAdminDoctor!.sitting_hours}) is confirmed. Serial: ${serialNumStr}. Fee: ${selectedAdminDoctor!.follow_up_fee || '500 Tk'}.\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
            sender_id: '8809666720320',
            type: 'transactional'
          })
        })
      } catch (smsError) {
        console.error('SMS Error:', smsError)
      }

      setBookingSubmitted(true)
      fetchAppointments()
    } catch (err: any) {
      alert('Booking failed: ' + err.message)
    }
  }

  const handleAdminQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quickForm.contact.length !== 11) {
      alert('Contact number must be 11 digits.')
      return
    }

    const todayStr = new Date().toISOString().split('T')[0]

    try {
      const { error } = await supabase.from('bookings').insert({
        patient_name: quickForm.name,
        phone: quickForm.contact,
        doctor_id: `Emergency-${quickReserveType}`,
        booking_date: todayStr,
        age: quickForm.age ? parseInt(quickForm.age) : null,
        patient_type: 'Admin',
        symptoms: `Quick Reservation: ${quickReserveType}`,
        status: 'Confirmed'
      })

      if (error) throw error

      try {
        await fetch('https://client.giosms.com/api/v1/send', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            to: `88${quickForm.contact}`,
            message: `Delta Health Care Jatrabari Ltd.\nDear Patient/Attendant, your ${quickReserveType} booking has been successfully confirmed for ${todayStr}. Thank you for choosing Delta Health Care Jatrabari Ltd. For more information Call: 09666720320\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
            sender_id: '8809666720320',
            type: 'transactional'
          })
        })
      } catch (smsError) {
        console.error('SMS Error:', smsError)
      }

      setQuickSubmitted(true)
      fetchAppointments()
    } catch (err: any) {
      alert('Quick Reservation failed: ' + err.message)
    }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const isQuickReserve =
        app.doctor_id?.toString().startsWith('Emergency-') ||
        app.symptoms?.includes('Quick Reservation')

      if (activeTab === 'quick-reserve-list') return isQuickReserve
      if (activeTab === 'appointments') {
        if (isQuickReserve) return false
        const matchDoc = filterDoctor ? app.doctor_id?.toString() === filterDoctor : true
        const matchDate = filterDateMode !== 'all' ? app.booking_date === filterDateMode : true
        return matchDoc && matchDate
      }
      return true
    })
  }, [appointments, activeTab, filterDoctor, filterDateMode])

  const downloadPDFReport = () => {
    const printWindow = window.open('', '', 'left=0,top=0,width=900,height=700')
    if (!printWindow) return

    const rowsHtml = filteredAppointments
      .map((a, idx) => {
        const matchedDoc = doctors.find(d => d.id.toString() === a.doctor_id?.toString())
        const docName = matchedDoc ? matchedDoc.name : a.doctor_id
        const sourceLabel = a.patient_type === 'Admin' ? 'Admin' : 'Online'
        return `
        <tr>
          <td>#${idx + 1}</td>
          <td><b>${a.patient_name}</b></td>
          <td>${a.phone}</td>
          <td>${a.age || '-'}</td>
          <td>${docName}</td>
          <td>${a.booking_date}</td>
          <td>${sourceLabel}</td>
        </tr>
      `
      })
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment Report - Delta Health Care</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #008080; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { color: #008080; margin: 0; font-size: 22px; }
            .header p { font-size: 12px; color: #555; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #008080; color: #fff; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 30px; text-align: right; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Delta Health Care Jatrabari Ltd.</h2>
            <p>Official Appointments List & Summary Report</p>
            <p>Generated Date: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Age</th>
                <th>Doctor / Category</th>
                <th>Date</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">No records found.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <p>Authorized Admin Signature ___________________</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-50 rounded-xl p-1 flex items-center justify-center border">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#008080]">ডেল্টা হেল্থ কেয়ার</h2>
              <h1 className="text-sm font-black text-slate-900">Admin Authentication</h1>
            </div>
          </div>
          
          {authError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-xs font-bold text-slate-700">Enter Admin Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  autoComplete="off"
                  name="random_pwd_field_delta"
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 text-sm font-bold focus:outline-none"
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2.5 rounded-xl font-bold text-sm transition shadow-md"
            >
              Login to Admin Panel
            </button>
            <div className="text-center mt-4">
              <a href="/" className="text-xs font-bold text-slate-500 hover:underline">
                ← Back to Website
              </a>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sm:px-12 flex justify-between items-center shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl p-1 border">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-[10px] font-bold text-[#008080]">ডেল্টা হেল্থ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
            <h1 className="font-black text-sm text-slate-900">JATRABARI LTD. (Admin Dashboard)</h1>
          </div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-[#008080] hover:underline bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200"
        >
          View Live Website →
        </a>
      </header>

      <div className="flex flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-white border border-slate-200 rounded-2xl p-4 h-fit shadow-xs space-y-2">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'doctors' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>👨‍⚕️</span> Doctor List ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'appointments' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📋</span> Appointments
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'booking' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>➕</span> Booking Appointment
          </button>
          <button
            onClick={() => setActiveTab('quick-reserve')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'quick-reserve' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>⚡</span> Quick Reserve Form
          </button>
          <button
            onClick={() => setActiveTab('quick-reserve-list')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'quick-reserve-list' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🚨</span> Quick Reserve List
          </button>
          <button
            onClick={() => setActiveTab('lab-reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
              activeTab === 'lab-reports' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🧪</span> Lab & Reports
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          {activeTab === 'doctors' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Doctor List ({doctors.length})</h2>
                  <p className="text-xs text-slate-500">Live database synchronized doctor directory</p>
                </div>
                <button
                  onClick={() => {
                    resetDocForm()
                    setIsAddModalOpen(true)
                  }}
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
                      <th className="p-3">Schedule Days</th>
                      <th className="p-3">Fee</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {doctors.map((doc, idx) => (
                      <tr 
                        key={`admin-doc-entry-${doc.doctor_no || 'no'}-${idx}`} 
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={doc.image_url || `/doctors/doctor-${doc.doctor_no || 1}.png`}
                            alt={doc.name}
                            onError={(e: any) => {
                              e.target.src = '/doctors/doctor-1.png'
                            }}
                            className="w-10 h-10 rounded-full object-cover border object-top shadow-xs"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{doc.name}</span>
                            <span className="text-[11px] text-slate-500">{doc.degree || 'Specialist'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{doc.specialization}</td>
                        <td className="p-3 text-xs text-slate-600">
                          {doc.days && doc.days.length > 0 ? doc.days.join(', ') : 'Daily'}
                        </td>
                        <td className="p-3 font-semibold text-xs text-slate-700">
                          {doc.follow_up_fee || '500 BDT'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleInlineStatusToggle(doc)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                              doc.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            }`}
                            title="Click to toggle status"
                          >
                            {doc.status}
                          </button>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditClick(doc)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg text-xs font-bold transition"
                            title="Edit Doctor & Schedule"
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

          {/* Pulse Hospital Lab & Reports Module */}
          {activeTab === 'lab-reports' && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-base font-black text-slate-900 mb-1">Report Upload</h3>
                <p className="text-xs text-slate-500 mb-4">Upload patient diagnostic reports by mobile number</p>

                <form onSubmit={handleUploadReport} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Patient Phone</label>
                    <input 
                      type="tel"
                      required
                      maxLength={11}
                      value={reportPatientPhone}
                      onChange={e => setReportPatientPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="017XXXXXXXX"
                      className="w-full sm:w-80 border rounded-xl px-3 py-2 text-sm mt-1 bg-white font-mono outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Report Name</label>
                      <input 
                        type="text"
                        required
                        value={reportNameInput}
                        onChange={e => setReportNameInput(e.target.value)}
                        placeholder="e.g. CBC / X-Ray / USG"
                        className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Select Document File</label>
                      <input 
                        type="file"
                        required
                        onChange={e => setReportFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full border rounded-xl px-3 py-1.5 text-xs mt-1 bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingReport}
                    className="bg-[#008080] hover:bg-[#006666] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md disabled:bg-slate-400"
                  >
                    {uploadingReport ? 'Uploading Report...' : 'Upload All Reports'}
                  </button>
                </form>
              </div>

              {/* Home Sample Collection Requests */}
              <div>
                <h3 className="text-base font-black text-slate-900 mb-3">Home Sample Collection Requests</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[11px]">
                        <th className="p-3">Collection Date</th>
                        <th className="p-3">Patient Info</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Tests Required</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {sampleRequests.map(item => (
                        <tr key={`sample-${item.id}`} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-teal-700">{item.date}</td>
                          <td className="p-3">
                            <span className="font-bold block">{item.patient}</span>
                            <span className="font-mono text-slate-400 text-[10px]">{item.phone}</span>
                          </td>
                          <td className="p-3">{item.address}</td>
                          <td className="p-3 font-semibold text-slate-800">{item.tests}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Collected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {item.status !== 'Collected' && (
                              <button 
                                onClick={() => markSampleCollected(item.id)}
                                className="bg-[#008080] text-white px-2.5 py-1 rounded-md text-[10px] font-bold hover:bg-teal-700 transition"
                              >
                                Mark Collected
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Uploaded Reports Database List */}
              {uploadedReportsList.length > 0 && (
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-3">Recent Reports Database ({uploadedReportsList.length})</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[11px]">
                          <th className="p-3">Patient Phone</th>
                          <th className="p-3">Report Name</th>
                          <th className="p-3">Upload Date</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700">
                        {uploadedReportsList.map((rep, rIdx) => (
                          <tr key={`rep-${rep.id || rIdx}`} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold">{rep.patient_phone}</td>
                            <td className="p-3 font-semibold text-slate-800">{rep.report_name}</td>
                            <td className="p-3 text-slate-500">{new Date(rep.created_at).toLocaleDateString()}</td>
                            <td className="p-3 text-right">
                              <a href={rep.file_url} target="_blank" rel="noreferrer" className="text-teal-700 font-bold hover:underline">
                                View File ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'appointments' || activeTab === 'quick-reserve-list') && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {activeTab === 'quick-reserve-list' ? 'Quick Reserve List' : 'Appointments'} (
                    {filteredAppointments.length})
                  </h2>
                  <p className="text-xs text-slate-500">Review patient bookings</p>
                </div>
                <button
                  onClick={downloadPDFReport}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition shadow-sm flex items-center gap-2"
                >
                  <span>📥</span> Download PDF
                </button>
              </div>

              {activeTab === 'appointments' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Doctor</label>
                    <select
                      value={filterDoctor}
                      onChange={e => setFilterDoctor(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
                    >
                      <option value="">All Doctors</option>
                      {doctors.map((d, dIdx) => (
                        <option key={`filter-doc-key-${d.id || dIdx}`} value={d.id}>
                          {d.name} ({d.specialization})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Filter by Date (7 Days)
                    </label>
                    <select
                      value={filterDateMode}
                      onChange={e => setFilterDateMode(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
                    >
                      <option value="all">All Dates (Aksathe)</option>
                      {getNext7Days().map(dateStr => (
                        <option key={dateStr} value={dateStr}>
                          {dateStr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(filterDoctor || filterDateMode !== 'all') && (
                    <div className="self-end">
                      <button
                        onClick={() => {
                          setFilterDoctor('')
                          setFilterDateMode('all')
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {filteredAppointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                        <th className="p-3">Serial</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Age</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Doctor / Category</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Note</th>
                        <th className="p-3">Source</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {filteredAppointments.map((app, idx) => {
                        const matchedDoc = doctors.find(d => d.id.toString() === app.doctor_id?.toString() || d.doctor_no === app.doctor_id?.toString())
                        const isFromAdmin = app.patient_type === 'Admin'

                        return (
                          <tr key={`app-row-entry-${app.id || idx}`} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-mono font-bold text-[#008080]">#{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-900">{app.patient_name}</td>
                            <td className="p-3 text-slate-600">{app.age || '-'}</td>
                            <td className="p-3 text-slate-600 font-mono text-xs">{app.phone}</td>
                            <td className="p-3 text-slate-800 font-medium">
                              {matchedDoc ? matchedDoc.name : app.doctor_id}
                            </td>
                            <td className="p-3 text-slate-600">{app.booking_date}</td>
                            <td className="p-3 text-slate-500 text-xs italic">{app.symptoms || 'None'}</td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                                  isFromAdmin
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {isFromAdmin ? 'Admin' : 'Online'}
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="max-w-xl mx-auto">
              <h2 className="text-xl font-black text-slate-900 mb-4">Book Appointment (Admin Counter)</h2>
              {bookingSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 font-bold">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Appointment Booked Successfully!</h3>
                  <button
                    onClick={() => setBookingSubmitted(false)}
                    className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-sm font-semibold"
                  >
                    Book Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Specialization <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={adminBooking.specialization}
                        onChange={e => {
                          setAdminBooking({
                            ...adminBooking,
                            specialization: e.target.value,
                            doctor_id: '',
                            booking_date: ''
                          })
                          setSelectedAdminDoctor(null)
                          setAvailableDatesForAdminDoc([])
                        }}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Specialization</option>
                        {Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).map(
                          (spec: any, idx) => (
                            <option key={`spec-admin-${idx}`} value={spec}>
                              {spec}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Select Doctor <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={adminBooking.doctor_id}
                        onChange={e => handleAdminDoctorChange(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Doctor</option>
                        {doctors
                          .filter(
                            d => !adminBooking.specialization || d.specialization === adminBooking.specialization
                          )
                          .map((doc, docIdx) => (
                            <option key={`booking-doc-${doc.id || docIdx}`} value={doc.id}>
                              {doc.name} ({doc.status === 'Absent' ? '🔴 Absent' : '🟢 Present'})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {selectedAdminDoctor && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-slate-800 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-900 text-sm">{selectedAdminDoctor.name}</p>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedAdminDoctor.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {selectedAdminDoctor.status}
                        </span>
                      </div>
                      <p className="text-slate-700 font-semibold">{selectedAdminDoctor.degree}</p>
                      <div className="text-[11px] font-bold text-[#008080]">
                        <span>Days: {selectedAdminDoctor.days?.join(', ') || 'Everyday'}</span>
                        <br />
                        <span>Sitting Hours: {selectedAdminDoctor.sitting_hours}</span>
                        <br />
                        <span>Fee: {selectedAdminDoctor.follow_up_fee || '500 BDT'}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Select Date (Next 3 Available Days) <span className="text-rose-500">*</span>
                    </label>
                    {isAdminDoctorAbsent ? (
                      <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        ⚠️ This doctor is currently marked as ABSENT. No bookings can be scheduled right now.
                      </p>
                    ) : availableDatesForAdminDoc.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border">
                        {selectedAdminDoctor ? 'No available schedule days found.' : 'Please select a doctor first.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableDatesForAdminDoc.map((item, idx) => (
                          <button
                            type="button"
                            key={`admin-book-date-${idx}`}
                            onClick={() => setAdminBooking({ ...adminBooking, booking_date: item.dateStr })}
                            className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                              adminBooking.booking_date === item.dateStr
                                ? 'bg-[#008080] text-white border-[#008080] shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Patient Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={adminBooking.name}
                        onChange={e => setAdminBooking({ ...adminBooking, name: e.target.value })}
                        placeholder="Full Name"
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        value={adminBooking.phone}
                        onChange={e =>
                          setAdminBooking({ ...adminBooking, phone: e.target.value.replace(/\D/g, '') })
                        }
                        placeholder="017XXXXXXXX"
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input
                        type="number"
                        value={adminBooking.age}
                        onChange={e => setAdminBooking({ ...adminBooking, age: e.target.value })}
                        placeholder="Age"
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Note</label>
                      <input
                        type="text"
                        value={adminBooking.note}
                        onChange={e => setAdminBooking({ ...adminBooking, note: e.target.value })}
                        placeholder="Add a note..."
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-md ${
                      isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#008080] hover:bg-[#006666] text-white'
                    }`}
                  >
                    Confirm Appointment (Counter Entry)
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'quick-reserve' && (
            <div className="max-w-xl mx-auto">
              <h3 className="text-xl font-black text-slate-900 mb-4">Quick Reserve (Emergency Slots)</h3>
              {quickSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 font-bold">
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Emergency Slot Confirmed!</h3>
                  <button
                    onClick={() => setQuickSubmitted(false)}
                    className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-sm font-semibold"
                  >
                    Reserve Another
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {['NICU', 'PICU', 'ICU', 'General', 'OPD'].map(type => (
                      <button
                        key={`quick-admin-type-${type}`}
                        type="button"
                        onClick={() => setQuickReserveType(type)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                          quickReserveType === type
                            ? 'bg-[#008080] text-white border-[#008080] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAdminQuickSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">
                          Patient Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={quickForm.name}
                          onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                          placeholder="Patient Full Name"
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Age</label>
                        <input
                          type="number"
                          value={quickForm.age}
                          onChange={e => setQuickForm({ ...quickForm, age: e.target.value })}
                          placeholder="Age"
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Contact Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        value={quickForm.contact}
                        onChange={e =>
                          setQuickForm({ ...quickForm, contact: e.target.value.replace(/\D/g, '') })
                        }
                        placeholder="017XXXXXXXX"
                        className="w-full border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md mt-2"
                    >
                      Confirm Quick Reservation (Admin)
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Doctor Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg"
            >
              ✕
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              {isEditMode ? 'Edit Doctor & Schedule' : 'Add New Doctor'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All details directly update and lock accurately in database.
            </p>

            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={docForm.name}
                    onChange={e => setDocForm({ ...docForm, name: e.target.value })}
                    placeholder="Dr. Name"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor No (ID) [🔒 Locked]</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={docForm.doctor_no}
                    className="w-full border border-slate-200 bg-slate-100 cursor-not-allowed rounded-xl px-3 py-2 text-sm mt-1 text-slate-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Degree</label>
                  <input
                    type="text"
                    value={docForm.degree}
                    onChange={e => setDocForm({ ...docForm, degree: e.target.value })}
                    placeholder="MBBS, FCPS"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={docForm.phone}
                    onChange={e => setDocForm({ ...docForm, phone: e.target.value })}
                    placeholder="01700-000000"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Doctor Specialized Details / Sub-Specialty</label>
                <input
                  type="text"
                  value={docForm.details}
                  onChange={e => setDocForm({ ...docForm, details: e.target.value })}
                  placeholder="Specialized in High-Risk Pregnancy & Gynecological Surgeries."
                  className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">This text is displayed below the degree on the main website doctor card.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch / Workplace</label>
                  <input
                    type="text"
                    value={docForm.branch}
                    onChange={e => setDocForm({ ...docForm, branch: e.target.value })}
                    placeholder="Dhaka Medical / Delta"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Follow Up Fee</label>
                  <input
                    type="text"
                    value={docForm.follow_up_fee}
                    onChange={e => setDocForm({ ...docForm, follow_up_fee: e.target.value })}
                    placeholder="800 BDT"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Specialization *</label>
                  <input
                    type="text"
                    required
                    value={docForm.specialization}
                    onChange={e => setDocForm({ ...docForm, specialization: e.target.value })}
                    placeholder="Cardiologist"
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={docForm.status}
                    onChange={e => setDocForm({ ...docForm, status: e.target.value as any })}
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  >
                    <option value="Present">Present (🟢 Active in Website)</option>
                    <option value="Absent">Absent (🔴 Auto reset after 2:00 AM)</option>
                  </select>
                </div>
              </div>

              {/* Image Picker */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Doctor Picture (Upload from PC or Mobile)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border border-slate-300 overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                    <img 
                      src={doctorImagePreview || docForm.image_url || '/doctors/doctor-1.png'} 
                      alt="Doctor Preview" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#008080] file:text-white hover:file:bg-teal-700 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {doctorImageFile ? `Selected: ${doctorImageFile.name}` : `Current Path: ${docForm.image_url}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-extrabold text-slate-800 block mb-2">
                  Available Days & Time Slots (ডাক্তার কোন কোন বার বসেন টিক দিন)
                </label>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div
                      key={`schedule-day-admin-${day}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        docForm.schedule[day]?.active ? 'bg-teal-50/60 border-teal-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold select-none">
                        <input
                          type="checkbox"
                          checked={docForm.schedule[day]?.active || false}
                          onChange={() => handleScheduleToggle(day)}
                          className="w-4 h-4 accent-[#008080] rounded"
                        />
                        <span className={docForm.schedule[day]?.active ? 'text-teal-900 font-bold' : 'text-slate-600'}>
                          {day}
                        </span>
                      </label>

                      {docForm.schedule[day]?.active && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={docForm.schedule[day].start}
                            onChange={e => handleTimeChange(day, 'start', e.target.value)}
                            placeholder="10:00 AM"
                            className="border rounded-lg px-2 py-1 text-xs w-24 bg-white outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input
                            type="text"
                            value={docForm.schedule[day].end}
                            onChange={e => handleTimeChange(day, 'end', e.target.value)}
                            placeholder="01:00 PM"
                            className="border rounded-lg px-2 py-1 text-xs w-24 bg-white outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md mt-4 disabled:bg-slate-400"
              >
                {isLoading ? 'Saving Doctor...' : isEditMode ? 'Update Doctor in Database' : 'Save New Doctor'}
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
              To delete this doctor, type the name:{' '}
              <span className="font-bold text-slate-900">"{deleteModalDoc.name}"</span> and type{' '}
              <span className="font-bold text-rose-600">"delete"</span> below.
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