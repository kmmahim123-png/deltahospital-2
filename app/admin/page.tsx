"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'
import { sendClientSms } from '@/lib/client-sms'

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'superadmin' | 'admin'>('admin')
  const [loginRoleSelect, setLoginRoleSelect] = useState<'superadmin' | 'admin'>('superadmin')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'edit-serial' | 'booking' | 'quick-reserve' | 'quick-reserve-list' | 'lab-reports'>('appointments')
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>(sharedDoctors)

  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDateMode, setFilterDateMode] = useState('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<any>(null)
  const [savingSerialDocId, setSavingSerialDocId] = useState<any>(null)
  const [admittingId, setAdmittingId] = useState<any>(null)
  const [cancellingId, setCancellingId] = useState<any>(null)
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false)

  const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const [docForm, setDocForm] = useState({
    doctor_no: '',
    name: '',
    degree: '',
    details: '',
    branch: '',
    follow_up_fee: '',
    specialization: '',
    phone: '',
    address: '',
    image_url: '',
    status: 'Present',
    reserved_slots: 3,
    schedule: daysOfWeek.reduce((acc: any, day) => {
      acc[day] = { active: false, start: '04:00 PM', end: '08:00 PM' }
      return acc
    }, {})
  })

  const [deleteModalDoc, setDeleteModalDoc] = useState<any>(null)
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
  const [selectedAdminDoctor, setSelectedAdminDoctor] = useState<any>(null)
  const [availableDatesForAdminDoc, setAvailableDatesForAdminDoc] = useState<any[]>([])
  const [isAdminDoctorAbsent, setIsAdminDoctorAbsent] = useState(false)
  const [bookingSubmitted, setBookingSubmitted] = useState(false)

  const [quickReserveType, setQuickReserveType] = useState('ICU')
  const [quickForm, setQuickForm] = useState({
    name: '',
    age: '',
    contact: '',
    note: '',
    is_referred: false,
    ref_name: '',
    ref_phone: ''
  })
  const [quickSubmitted, setQuickSubmitted] = useState(false)

  const [labReports, setLabReports] = useState<any[]>([])
  const [labSearchQuery, setLabSearchQuery] = useState('')
  const [labFilterStatus, setLabFilterStatus] = useState('All')
  const [isLabModalOpen, setIsLabModalOpen] = useState(false)
  const [isLabEditMode, setIsLabEditMode] = useState(false)
  const [currentLabId, setCurrentLabId] = useState<any>(null)
  const [sendSmsOnLabSave, setSendSmsOnLabSave] = useState(true)
  const [savingLab, setSavingLab] = useState(false)

  const commonLabTests = [
    'CBC with ESR', 'Random Blood Sugar (RBS)', 'Fasting Blood Sugar (FBS)', 'HbA1c',
    'Lipid Profile', 'Liver Function Test (LFT / SGPT)', 'Serum Creatinine', 'Urine R/M/E',
    'Thyroid Profile (TSH, FT3, FT4)', 'ECG 12 Channel', 'Digital Chest X-Ray P/A View',
    'USG of Whole Abdomen', 'USG of Pregnancy Profile', 'Dengue NS1 / IgG / IgM'
  ]

  const getTodayBDDate = () => {
    const now = new Date()
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
    const year = bdTime.getFullYear()
    const month = String(bdTime.getMonth() + 1).padStart(2, '0')
    const day = String(bdTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const get7DaysAgoBDDate = () => {
    const now = new Date()
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
    bdTime.setDate(bdTime.getDate() - 7)
    const year = bdTime.getFullYear()
    const month = String(bdTime.getMonth() + 1).padStart(2, '0')
    const day = String(bdTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getCurrentBDDateTimeStr = () => {
    const now = new Date()
    return now.toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const toUnicodeBold = (text: string) => {
    return text.split('').map(char => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65))
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97))
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48))
      return char
    }).join('')
  }

  const getDoctorReservedSlots = (doc: any): number => {
    if (!doc) return 3
    if (typeof doc.reserved_slots === 'number') return doc.reserved_slots
    let sched = doc.schedule
    if (typeof sched === 'string') {
      try { sched = JSON.parse(sched) } catch { sched = null }
    }
    if (sched && typeof sched._reserved_slots === 'number') {
      return sched._reserved_slots
    }
    return 3
  }

  const isEmergencyBooking = (app: any) => {
    return (
      app?.doctor_id?.toString().startsWith('Emergency-') ||
      app?.patient_type === 'Emergency' ||
      app?.patient_type === 'Emergency-Online' ||
      app?.patient_type === 'Emergency-Admin'
    )
  }

  const getBookingSourceLabel = (app: any) => {
    let rawSymptoms = app?.symptoms || ''
    if (
      app?.patient_type === 'Admin' ||
      app?.patient_type === 'Emergency-Admin' ||
      rawSymptoms.includes('[SRC:Admin]')
    ) {
      return 'Admin Panel'
    }
    return 'Online'
  }

  const parseAppointmentDetails = (app: any) => {
    const rawPhone = app.phone || ''
    const mainPhone = rawPhone.split('|')[0]?.trim() || ''

    let rawSymptoms = app.symptoms || ''
    let refName = ''
    let refPhone = ''
    let bookedAt = ''

    const refMatch = rawSymptoms.match(/\[REF:(.*?)\|(.*?)\]/)
    if (refMatch) {
      refName = refMatch[1]?.trim() || ''
      refPhone = refMatch[2]?.trim() || ''
      rawSymptoms = rawSymptoms.replace(refMatch[0], '').trim()
    }

    const timeMatch = rawSymptoms.match(/\[TIME:(.*?)\]/)
    if (timeMatch) {
      bookedAt = timeMatch[1]?.trim() || ''
      rawSymptoms = rawSymptoms.replace(timeMatch[0], '').trim()
    } else if (app.created_at) {
      try {
        bookedAt = new Date(app.created_at).toLocaleString('en-US', {
          timeZone: 'Asia/Dhaka',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      } catch {
        bookedAt = app.booking_date || '-'
      }
    } else {
      bookedAt = app.booking_date || '-'
    }

    rawSymptoms = rawSymptoms.replace(/\[SRC:.*?\]/g, '').trim()
    rawSymptoms = rawSymptoms.replace(/^Quick Reservation:\s*(NICU|PICU|ICU|General|OPD)\s*/i, '').trim()

    return {
      mainPhone,
      cleanNote: rawSymptoms,
      refName,
      refPhone,
      bookedAt
    }
  }

  const [labForm, setLabForm] = useState({
    invoice_no: '',
    patient_name: '',
    phone: '',
    age: '',
    gender: 'Male',
    test_name: '',
    referred_by: 'Self',
    test_date: '',
    delivery_status: 'Ready',
    payment_status: 'Paid',
    amount: '500 BDT',
    file_url: '',
    file_name: ''
  })

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data.authenticated && data.role) {
          setIsAuthenticated(true)
          setUserRole(data.role)
          setActiveTab(data.role === 'superadmin' ? 'doctors' : 'appointments')
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setIsAuthenticated(false)
      setUserRole('admin')
      setPasswordInput('')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData()
    }
  }, [isAuthenticated])

  async function loadAdminData() {
    const loadedDocs = await fetchDatabaseDoctors()
    await cleanupPastBookingsAndFetch(loadedDocs)
    await fetchLabReports()
  }

  // Admin and Super Admin Login System (Server-Verified)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: loginRoleSelect, password: passwordInput })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Authentication failed: Invalid credentials.')
        return
      }
      setIsAuthenticated(true)
      setUserRole(data.role)
      setActiveTab(data.role === 'superadmin' ? 'doctors' : 'appointments')
      setPasswordInput('')
    } catch {
      alert('Connection error during authentication.')
    }
  }

  const parseDoctorDaysArray = (rawDays: any, fallbackDays?: string[]): string[] => {
    let result: string[] = []
    if (Array.isArray(rawDays)) {
      result = rawDays.flatMap(item => typeof item === 'string' ? item.split(',') : [])
    } else if (typeof rawDays === 'string') {
      const cleaned = rawDays.replace(/[\[\]{}"']/g, '')
      result = cleaned.split(',')
    }
    result = result.map(s => s.trim()).filter(Boolean)
    if (result.length === 0 && fallbackDays) {
      return fallbackDays
    }
    return result
  }

  async function fetchDatabaseDoctors() {
    try {
      const { data } = await supabase.from('doctors').select('*').order('id', { ascending: true })
      if (data && data.length > 0) {
        const formatted = data.map((d: any, index: number) => {
          const fallbackDoc = sharedDoctors.find(
            s => s.doctor_no?.toString() === d.doctor_no?.toString() || s.name?.toLowerCase().trim() === d.name?.toLowerCase().trim()
          )
          const parsedDays = parseDoctorDaysArray(d.days, fallbackDoc?.days || ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'])
          const reserved = getDoctorReservedSlots(d)

          return {
            ...fallbackDoc,
            ...d,
            doctor_no: d.doctor_no || String(index + 1),
            days: parsedDays,
            follow_up_fee: d.follow_up_fee || d.fee || fallbackDoc?.fee || '600 BDT',
            fee: d.follow_up_fee || d.fee || fallbackDoc?.fee || '600 BDT',
            details: d.details || fallbackDoc?.details || '',
            reserved_slots: reserved
          }
        })
        setDoctors(formatted)
        return formatted
      } else {
        const fallbackFormatted = sharedDoctors.map(d => ({ ...d, reserved_slots: 3 }))
        setDoctors(fallbackFormatted)
        return fallbackFormatted
      }
    } catch (err) {
      console.error('Error fetching doctors:', err)
      setDoctors(sharedDoctors)
      return sharedDoctors
    }
  }

  async function cleanupPastBookingsAndFetch(currentDoctorsList?: any[]) {
    try {
      const activeDocs = currentDoctorsList || doctors
      const cutoffDateStr = get7DaysAgoBDDate()
      await supabase.from('bookings').delete().lt('booking_date', cutoffDateStr)

      const { data: allData, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true })
        .order('id', { ascending: true })

      if (error) throw error

      if (allData) {
        const oldIds = allData
          .filter(app => app.booking_date && app.booking_date < cutoffDateStr)
          .map(app => app.id)

        if (oldIds.length > 0) {
          await supabase.from('bookings').delete().in('id', oldIds)
        }

        const validBookings = allData.filter(app => !app.booking_date || app.booking_date >= cutoffDateStr)

        const grouped: any = {}
        const emergencyGroupedByDate: any = {}

        validBookings.forEach(app => {
          if (!isEmergencyBooking(app)) {
            const key = `${app.doctor_id}_${app.booking_date}`
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(app)
          } else {
            const eKey = app.booking_date || getTodayBDDate()
            if (!emergencyGroupedByDate[eKey]) emergencyGroupedByDate[eKey] = []
            emergencyGroupedByDate[eKey].push(app)
          }
        })

        const sortedList: any[] = []
        Object.keys(grouped).forEach(key => {
          const [docId] = key.split('_')
          const matchedDoc = activeDocs.find(
            (d: any) => d.id?.toString() === docId?.toString() || d.doctor_no?.toString() === docId?.toString()
          )
          const reservedBlankCount = getDoctorReservedSlots(matchedDoc)

          grouped[key].forEach((item: any, index: number) => {
            const strictSerial = reservedBlankCount + 1 + index
            sortedList.push({ ...item, computed_serial: strictSerial })
          })
        })

        Object.keys(emergencyGroupedByDate).forEach(eKey => {
          emergencyGroupedByDate[eKey].forEach((item: any, index: number) => {
            const strictEmergencySerial = index + 1
            sortedList.push({ ...item, computed_emergency_serial: strictEmergencySerial })
          })
        })

        setAppointments(sortedList)
      }
    } catch (err) {
      console.error('Error cleaning bookings:', err)
    }
  }

  const handleUpdateDoctorReservedSlots = async (doc: any, newReservedCount: number) => {
    if (userRole !== 'superadmin') return
    setSavingSerialDocId(doc.id)
    try {
      let currentSchedule: any = doc.schedule
      if (typeof currentSchedule === 'string') {
        try { currentSchedule = JSON.parse(currentSchedule) } catch { currentSchedule = {} }
      }
      if (!currentSchedule || typeof currentSchedule !== 'object') {
        currentSchedule = {}
      }

      const updatedSchedule = {
        ...currentSchedule,
        _reserved_slots: Number(newReservedCount)
      }

      const { error } = await supabase
        .from('doctors')
        .update({ schedule: updatedSchedule })
        .eq('id', doc.id)

      if (error) throw error

      const updatedDoctors = doctors.map(d =>
        d.id === doc.id ? { ...d, reserved_slots: Number(newReservedCount), schedule: updatedSchedule } : d
      )
      setDoctors(updatedDoctors)
      await cleanupPastBookingsAndFetch(updatedDoctors)
    } catch (err: any) {
      alert('Failed to update reserved serials: ' + err.message)
    } finally {
      setSavingSerialDocId(null)
    }
  }

  const handleToggleDoctorStatus = async (doc: any) => {
    if (userRole !== 'superadmin') return
    const nextStatus = doc.status === 'Absent' ? 'Present' : 'Absent'
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ status: nextStatus, status_updated_at: new Date().toISOString() })
        .eq('id', doc.id)

      if (error) throw error

      setDoctors(prev =>
        prev.map(item => (item.id === doc.id ? { ...item, status: nextStatus } : item))
      )
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleMarkAsAdmitted = async (app: any, displayEqSerial: string) => {
    if (app.status === 'Admitted' || admittingId !== null) return
    setAdmittingId(app.id)

    try {
      const { data: currentRecord } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', app.id)
        .single()

      if (currentRecord?.status === 'Admitted') {
        setAppointments(prev =>
          prev.map(item => (item.id === app.id ? { ...item, status: 'Admitted' } : item))
        )
        return
      }

      const { mainPhone, refPhone } = parseAppointmentDetails(app)
      const slotCategory = (app.doctor_id || '').replace('Emergency-', '') || 'Emergency'
      const boldPatientName = toUnicodeBold((app.patient_name || 'Patient').trim().toUpperCase())

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Admitted' })
        .eq('id', app.id)

      if (error) throw error

      setAppointments(prev =>
        prev.map(item => (item.id === app.id ? { ...item, status: 'Admitted' } : item))
      )

      if (mainPhone && mainPhone.length === 11) {
        const patientSms = `Dear ${app.patient_name}, your admission to Delta Health Care Jatrabari Ltd. (${slotCategory}, Serial: ${displayEqSerial}) has been confirmed. Wishing you a speedy recovery.`
        try {
          await sendClientSms(mainPhone, patientSms)
        } catch (e) {
          console.error('Patient admission SMS error:', e)
        }
      }

      if (refPhone && refPhone.length === 11) {
        const referrerSms = `Dear Sir, the patient ${boldPatientName} you referred has been admitted to Delta Health Care Jatrabari Ltd. Thank you for your valuable referral and support.`
        try {
          await sendClientSms(refPhone, referrerSms)
        } catch (e) {
          console.error('Referrer admission SMS error:', e)
        }
      }

      alert(`Patient "${app.patient_name}" marked as Admitted & SMS notification sent!`)
    } catch (err: any) {
      alert('Failed to mark as Admitted: ' + err.message)
    } finally {
      setAdmittingId(null)
    }
  }

  async function fetchLabReports() {
    try {
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('id', { ascending: false })
      if (!error && data) {
        setLabReports(data)
      }
    } catch (err) {
      console.error('Error fetching lab reports:', err)
    }
  }

  const resetLabForm = () => {
    setIsLabEditMode(false)
    setCurrentLabId(null)
    setLabForm({
      invoice_no: '',
      patient_name: '',
      phone: '',
      age: '',
      gender: 'Male',
      test_name: '',
      referred_by: 'Self',
      test_date: getTodayBDDate(),
      delivery_status: 'Ready',
      payment_status: 'Paid',
      amount: '500 BDT',
      file_url: '',
      file_name: ''
    })
  }

  const handleEditLabReport = (report: any) => {
    setIsLabEditMode(true)
    setCurrentLabId(report.id)
    setLabForm({
      invoice_no: report.invoice_no || '',
      patient_name: report.patient_name || '',
      phone: report.phone || '',
      age: report.age || '',
      gender: report.gender || 'Male',
      test_name: report.test_name || '',
      referred_by: report.referred_by || 'Self',
      test_date: report.test_date || getTodayBDDate(),
      delivery_status: report.delivery_status || 'Ready',
      payment_status: report.payment_status || 'Paid',
      amount: report.amount || '500 BDT',
      file_url: report.file_url || '',
      file_name: report.file_name || ''
    })
    setIsLabModalOpen(true)
  }

  const handleLabFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      alert('File size must be under 8 MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setLabForm(prev => ({
        ...prev,
        file_url: reader.result as string,
        file_name: file.name
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveLabReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!labForm.invoice_no.trim()) {
      alert('Please enter the Bill / Invoice Number.')
      return
    }
    if (labForm.phone.length !== 11) {
      alert('Patient phone number must be exactly 11 digits.')
      return
    }
    if (!labForm.file_url) {
      alert('Please upload the report PDF or Image file.')
      return
    }
    setSavingLab(true)
    try {
      const payload = {
        invoice_no: labForm.invoice_no.trim(),
        patient_name: labForm.patient_name.trim(),
        phone: labForm.phone.trim(),
        age: labForm.age,
        gender: labForm.gender,
        test_name: labForm.test_name,
        referred_by: labForm.referred_by,
        test_date: labForm.test_date || getTodayBDDate(),
        delivery_status: labForm.delivery_status,
        payment_status: labForm.payment_status,
        amount: labForm.amount,
        report_summary: '',
        file_url: labForm.file_url,
        file_name: labForm.file_name
      }

      if (isLabEditMode && currentLabId) {
        const { error } = await supabase.from('lab_reports').update(payload).eq('id', currentLabId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('lab_reports').insert([payload])
        if (error) throw error
      }

      if (sendSmsOnLabSave && payload.delivery_status === 'Ready') {
        try {
          const smsMsg = `Dear ${payload.patient_name}, your lab report (Bill No: ${payload.invoice_no}) is READY. You can download it from our website. Thank you for choosing Delta Health Care Jatrabari Ltd.`
          await sendClientSms(payload.phone, smsMsg)
        } catch (smsErr) {
          console.error('Lab SMS error:', smsErr)
        }
      }

      alert(isLabEditMode ? 'Lab Report updated successfully!' : 'Lab Report uploaded & published to website!')
      setIsLabModalOpen(false)
      fetchLabReports()
    } catch (err: any) {
      alert('Failed to save Lab Report: ' + err.message)
    } finally {
      setSavingLab(false)
    }
  }

  const handleToggleLabStatus = async (report: any) => {
    const nextStatus = report.delivery_status === 'Ready' ? 'Processing' : 'Ready'
    try {
      const { error } = await supabase
        .from('lab_reports')
        .update({ delivery_status: nextStatus })
        .eq('id', report.id)
      if (error) throw error
      fetchLabReports()
    } catch (err: any) {
      alert('Status update failed: ' + err.message)
    }
  }

  const handleDeleteLabReport = async (id: any) => {
    if (userRole !== 'superadmin') {
      alert('Only Super Admin can delete lab reports.')
      return
    }
    if (!confirm('Are you sure you want to delete this lab report permanently?')) return
    try {
      const { error } = await supabase.from('lab_reports').delete().eq('id', id)
      if (error) throw error
      setLabReports(labReports.filter(r => r.id !== id))
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const getFilterDateOptions = () => {
    const list = []
    const now = new Date()
    const bdToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
    for (let i = -7; i <= 7; i++) {
      const d = new Date(bdToday)
      d.setDate(bdToday.getDate() + i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      let label = dateStr
      if (i === 0) label = `${dateStr} (Today)`
      else if (i === -1) label = `${dateStr} (Yesterday)`
      else if (i === 1) label = `${dateStr} (Tomorrow)`
      else if (i < 0) label = `${dateStr} (${Math.abs(i)} days ago)`
      list.push({ value: dateStr, label })
    }
    return list
  }

  const getTop3AvailableDates = (doctorDays: any) => {
    const list = []
    const today = new Date()
    const cleanDays = parseDoctorDaysArray(doctorDays).map(d => d.toLowerCase())
    for (let i = 0; i < 60; i++) {
      if (list.length >= 3) break
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
      if (cleanDays.some(cd => cd.includes(weekday.toLowerCase()) || weekday.toLowerCase().includes(cd))) {
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
    const doc = doctors.find(d => d.id?.toString() === docId || d.doctor_no?.toString() === docId)
    if (doc) {
      setSelectedAdminDoctor(doc)
      const validDates = getTop3AvailableDates(doc.days)
      setAvailableDatesForAdminDoc(validDates)
      if (validDates.length > 0 && doc.status !== 'Absent') {
        setAdminBooking(prev => ({ ...prev, booking_date: validDates[0].dateStr }))
        setIsAdminDoctorAbsent(false)
      } else {
        setIsAdminDoctorAbsent(true)
      }
    } else {
      setSelectedAdminDoctor(null)
      setAvailableDatesForAdminDoc([])
      setIsAdminDoctorAbsent(false)
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setDocForm(prev => ({ ...prev, image_url: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleScheduleToggle = (day: string) => {
    setDocForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], active: !prev.schedule[day]?.active }
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
    if (userRole !== 'superadmin') return
    try {
      const activeDays = daysOfWeek.filter(day => docForm.schedule[day]?.active)
      const firstDay = activeDays[0]
      const sittingHours = firstDay && docForm.schedule[firstDay]
        ? `${docForm.schedule[firstDay].start} - ${docForm.schedule[firstDay].end}`
        : '04:00 PM - 08:00 PM'

      const scheduleWithReserved = {
        ...docForm.schedule,
        _reserved_slots: Number(docForm.reserved_slots ?? 3)
      }

      const payload: any = {
        doctor_no: docForm.doctor_no || String(doctors.length + 1),
        name: docForm.name,
        degree: docForm.degree,
        details: docForm.details,
        branch: docForm.branch || 'Delta Health Care',
        follow_up_fee: docForm.follow_up_fee || '600 BDT',
        specialization: docForm.specialization,
        phone: docForm.phone,
        address: docForm.address,
        image_url: docForm.image_url || '/doctors/doctor-1.png',
        status: docForm.status,
        days: activeDays,
        sitting_hours: sittingHours,
        schedule: scheduleWithReserved,
        status_updated_at: new Date().toISOString()
      }

      if (isEditMode && currentDocId) {
        const { error } = await supabase.from('doctors').update(payload).eq('id', currentDocId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('doctors').insert([payload])
        if (error) throw error
      }

      alert('Doctor updated successfully!')
      setIsAddModalOpen(false)
      const updatedDocs = await fetchDatabaseDoctors()
      await cleanupPastBookingsAndFetch(updatedDocs)
    } catch (err: any) {
      alert('Failed to save doctor: ' + err.message)
    }
  }

  const resetDocForm = () => {
    setIsEditMode(false)
    setCurrentDocId(null)
    const defaultSchedule = daysOfWeek.reduce((acc: any, day) => {
      acc[day] = { active: day !== 'Friday', start: '04:00 PM', end: '08:00 PM' }
      return acc
    }, {})

    setDocForm({
      doctor_no: String(doctors.length + 1),
      name: '',
      degree: '',
      details: '',
      branch: 'Delta Health Care',
      follow_up_fee: '600 BDT',
      specialization: '',
      phone: '',
      address: '',
      image_url: '/doctors/doctor-1.png',
      status: 'Present',
      reserved_slots: 3,
      schedule: defaultSchedule
    })
  }

  const handleEditClick = (doc: any) => {
    if (userRole !== 'superadmin') return
    setIsEditMode(true)
    setCurrentDocId(doc.id)

    const fallback = sharedDoctors.find(
      s => s.doctor_no?.toString() === doc.doctor_no?.toString() || s.name?.toLowerCase().trim() === doc.name?.toLowerCase().trim()
    )

    const docDays = parseDoctorDaysArray(doc.days, fallback?.days || [])
    const normalizedDocDays = docDays.map((d: string) => d.trim().toLowerCase())

    let parsedSchedule: any = doc.schedule
    if (typeof parsedSchedule === 'string') {
      try { parsedSchedule = JSON.parse(parsedSchedule) } catch { parsedSchedule = null }
    }

    const initialSchedule = daysOfWeek.reduce((acc: any, day) => {
      const dayLower = day.toLowerCase()
      const dayItem = parsedSchedule?.[day]
      const isInDays = normalizedDocDays.some(d => d === dayLower || d.includes(dayLower) || dayLower.includes(d))
      const isActive = isInDays || Boolean(dayItem?.active)

      acc[day] = {
        active: isActive,
        start: dayItem?.start || doc.sitting_hours?.split('-')[0]?.trim() || '04:00 PM',
        end: dayItem?.end || doc.sitting_hours?.split('-')[1]?.trim() || '08:00 PM'
      }
      return acc
    }, {})

    setDocForm({
      doctor_no: doc.doctor_no || String(doc.id || ''),
      name: doc.name || '',
      degree: doc.degree || '',
      details: doc.details || fallback?.details || '',
      branch: doc.branch || 'Delta Health Care',
      follow_up_fee: doc.follow_up_fee || doc.fee || '600 BDT',
      specialization: doc.specialization || '',
      phone: doc.phone || '',
      address: doc.address || '',
      image_url: doc.image_url || '/doctors/doctor-1.png',
      status: doc.status || 'Present',
      reserved_slots: getDoctorReservedSlots(doc),
      schedule: initialSchedule
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole !== 'superadmin') return
    if (deleteNameInput !== deleteModalDoc.name || deleteConfirmWord !== 'delete') {
      alert('Please type the exact doctor name and the word "delete" to confirm.')
      return
    }
    try {
      await supabase.from('doctors').delete().eq('id', deleteModalDoc.id)
      setDeleteModalDoc(null)
      setDeleteNameInput('')
      setDeleteConfirmWord('')
      fetchDatabaseDoctors()
      alert('Doctor deleted successfully.')
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  // শুধুমাত্র Super Admin ডিলিট/ক্যান্সেল করতে পারবে এবং ডক্টর অ্যাপয়েন্টমেন্ট ক্যান্সেল করলে রোগীর নাম্বারে ক্যান্সেল SMS যাবে
  const handleDeleteAppointment = async (app: any) => {
    if (userRole !== 'superadmin') {
      alert('Only Super Admin is allowed to cancel or delete bookings.')
      return
    }
    const isEmergency = isEmergencyBooking(app)
    const confirmText = isEmergency
      ? `Are you sure you want to delete this Quick Reservation for "${app.patient_name}"?`
      : `Are you sure you want to cancel & delete "${app.patient_name}"'s doctor appointment? A cancellation SMS will be sent to the patient.`

    if (!confirm(confirmText)) return

    setCancellingId(app.id)
    try {
      const matchedDoc = doctors.find(
        d => d.id?.toString() === app.doctor_id?.toString() || d.doctor_no?.toString() === app.doctor_id?.toString()
      )
      const rawDocName = matchedDoc ? matchedDoc.name : (app.doctor_id || 'Doctor')
      const formattedDocName = /^dr\.?\s/i.test(rawDocName.trim()) || /^prof\.?\s/i.test(rawDocName.trim())
        ? rawDocName.trim()
        : `Dr. ${rawDocName.trim()}`

      const { mainPhone } = parseAppointmentDetails(app)

      const { error } = await supabase.from('bookings').delete().eq('id', app.id)
      if (error) throw error

      // ডক্টর অ্যাপয়েন্টমেন্ট ক্যান্সেল করা হলে রোগীর নাম্বারে আপনার দেওয়া মেসেজ পাঠানো হচ্ছে
      if (!isEmergency && mainPhone && mainPhone.length === 11) {
        const cancelSms = `Dear ${app.patient_name}, your appointment with ${formattedDocName} on ${app.booking_date} has been cancelled. Sorry for the inconvenience. Delta Health Care Jatrabari Ltd. For query please call: 09666720320`
        try {
          await sendClientSms(mainPhone, cancelSms)
        } catch (smsErr) {
          console.error('Cancel SMS error:', smsErr)
        }
      }

      await cleanupPastBookingsAndFetch()
      if (!isEmergency) {
        alert(`Appointment for "${app.patient_name}" cancelled & SMS sent to ${mainPhone}.`)
      }
    } catch (err: any) {
      alert('Cancel/Delete failed: ' + err.message)
    } finally {
      setCancellingId(null)
    }
  }

  const handleAdminBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingBooking) return
    if (adminBooking.phone.length !== 11) { alert('Phone number must be exactly 11 digits.'); return }
    if (isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0) { alert('Selected doctor is not available.'); return }

    setIsSubmittingBooking(true)
    try {
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('doctor_id', selectedAdminDoctor.id.toString())
        .eq('booking_date', adminBooking.booking_date)

      const activeListCount = existingBookings ? existingBookings.length : 0
      const reservedBlankCount = getDoctorReservedSlots(selectedAdminDoctor)
      const nextSerial = reservedBlankCount + 1 + activeListCount
      const serialNumStr = `#${nextSerial}`
      const docFee = selectedAdminDoctor.follow_up_fee || selectedAdminDoctor.fee || '600 BDT'
      const bookedAtStr = getCurrentBDDateTimeStr()
      const finalSymptoms = `[TIME:${bookedAtStr}] ${adminBooking.note || ''}`.trim()

      const { error } = await supabase.from('bookings').insert({
        patient_name: adminBooking.name,
        phone: adminBooking.phone,
        doctor_id: selectedAdminDoctor.id.toString(),
        booking_date: adminBooking.booking_date,
        age: adminBooking.age ? parseInt(adminBooking.age) : null,
        patient_type: 'Admin',
        symptoms: finalSymptoms,
        serial_number: nextSerial,
        status: 'Confirmed'
      })

      if (error) throw error

      const appointmentSms = `Dear ${adminBooking.name}, your appointment with ${selectedAdminDoctor.name} on ${adminBooking.booking_date} (${selectedAdminDoctor.sitting_hours}) is confirmed. Serial: ${serialNumStr}. Fee: ${docFee}.\nThank you for choosing Delta Health Care Jatrabari Ltd.`

      try {
        await sendClientSms(adminBooking.phone, appointmentSms)
      } catch (smsError) {
        console.error("SMS Error:", smsError)
      }

      setBookingSubmitted(true)
      await cleanupPastBookingsAndFetch()
    } catch (err: any) {
      alert('Booking failed: ' + err.message)
    } finally {
      setIsSubmittingBooking(false)
    }
  }

  const handleAdminQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingQuick) return
    if (quickForm.contact.length !== 11) { alert('Contact number must be 11 digits.'); return }
    if (quickForm.is_referred && quickForm.ref_phone && quickForm.ref_phone.length !== 11) {
      alert('Referrer phone number must be 11 digits.');
      return;
    }

    setIsSubmittingQuick(true)
    const todayDate = getTodayBDDate()

    try {
      const { data: existingEmergencies } = await supabase
        .from('bookings')
        .select('id, doctor_id, patient_type')
        .eq('booking_date', todayDate)

      const emergencyCount = (existingEmergencies || []).filter((b: any) => isEmergencyBooking(b)).length
      const nextEqSerial = emergencyCount + 1
      const bookedAtStr = getCurrentBDDateTimeStr()

      const metaParts: string[] = ['[SRC:Admin]', `[TIME:${bookedAtStr}]`]
      if (quickForm.note.trim()) {
        metaParts.push(quickForm.note.trim())
      }
      if (quickForm.is_referred && (quickForm.ref_name.trim() || quickForm.ref_phone.trim())) {
        metaParts.push(`[REF:${quickForm.ref_name.trim() || 'Referrer'}|${quickForm.ref_phone.trim()}]`)
      }
      const finalSymptoms = metaParts.join(' ')

      const { error } = await supabase.from('bookings').insert({
        patient_name: quickForm.name,
        phone: quickForm.contact,
        doctor_id: `Emergency-${quickReserveType}`,
        booking_date: todayDate,
        age: quickForm.age ? parseInt(quickForm.age) : null,
        patient_type: 'Emergency',
        symptoms: finalSymptoms,
        serial_number: nextEqSerial,
        status: 'Confirmed'
      })

      if (error) throw error

      const patientSmsMessage = `Dear ${quickForm.name}, your emergency slot (${quickReserveType}) is confirmed. Serial: EQ#${nextEqSerial}. Thank you for choosing Delta Health Care Jatrabari Ltd.`

      try {
        await sendClientSms(quickForm.contact, patientSmsMessage)
      } catch (smsErr) {
        console.error('Patient SMS error:', smsErr)
      }

      setQuickSubmitted(true)
      await cleanupPastBookingsAndFetch()
    } catch (err: any) {
      alert('Emergency request failed: ' + err.message)
    } finally {
      setIsSubmittingQuick(false)
    }
  }

  const cutoff7DaysStr = get7DaysAgoBDDate()

  const filteredAppointments = appointments.filter(app => {
    if (app.booking_date && app.booking_date < cutoff7DaysStr) return false

    if (activeTab === 'quick-reserve-list') {
      if (!isEmergencyBooking(app)) return false
      const matchDate = filterDateMode !== 'all' ? app.booking_date === filterDateMode : true
      return matchDate
    }
    if (activeTab === 'appointments') {
      if (isEmergencyBooking(app)) return false
      const matchDoc = filterDoctor ? app.doctor_id?.toString() === filterDoctor : true
      const matchDate = filterDateMode !== 'all' ? app.booking_date === filterDateMode : true
      return matchDoc && matchDate
    }
    return true
  })

  const selectedFilterDocObj = filterDoctor
    ? doctors.find(d => d.id?.toString() === filterDoctor.toString() || d.doctor_no?.toString() === filterDoctor.toString())
    : null
  const activeReservedCountForSelectedDoc = selectedFilterDocObj ? getDoctorReservedSlots(selectedFilterDocObj) : 0

  const downloadPDFReport = () => {
    const printWindow = window.open('', '', 'left=0,top=0,width=980,height=720')
    if (!printWindow) return

    const blankRowsHtml = (activeTab === 'appointments' && filterDoctor && activeReservedCountForSelectedDoc > 0)
      ? Array.from({ length: activeReservedCountForSelectedDoc }, (_, i) => i + 1).map(num => `
          <tr style="height: 28px;">
            <td>${num}</td>
            <td></td>
            <td></td>
            <td></td>
            <td>${selectedFilterDocObj?.name || ''}</td>
            <td>${filterDateMode !== 'all' ? filterDateMode : ''}</td>
            <td></td>
            <td><b>#${num}</b></td>
            <td></td>
            <td></td>
          </tr>
        `).join('')
      : ''

    const rowsHtml = filteredAppointments.map((a, idx) => {
      const matchedDoc = doctors.find(d => d.id?.toString() === a.doctor_id?.toString() || d.doctor_no?.toString() === a.doctor_id?.toString())
      const docName = matchedDoc ? matchedDoc.name : a.doctor_id
      const displaySL = (activeTab === 'appointments' && filterDoctor)
        ? activeReservedCountForSelectedDoc + idx + 1
        : idx + 1
      const displaySerial = activeTab === 'appointments'
        ? `#${a.computed_serial || a.serial_number}`
        : `EQ#${a.computed_emergency_serial || idx + 1}`

      const { mainPhone, cleanNote, refName, refPhone, bookedAt } = parseAppointmentDetails(a)
      const sourceText = getBookingSourceLabel(a)
      const phoneHtml = `
        <div><b>${mainPhone}</b></div>
        ${(refName || refPhone) ? `<div style="font-size:10px;color:#000000;">Ref: ${refName} (${refPhone})</div>` : ''}
      `

      return `
        <tr>
          <td>${displaySL}</td>
          <td><b>${a.patient_name}</b></td>
          <td>${phoneHtml}</td>
          <td>${a.age || '-'}</td>
          <td>${docName}</td>
          <td>${a.booking_date}</td>
          <td style="font-size:10px;">${bookedAt || '-'}</td>
          <td><b>${displaySerial}</b></td>
          <td>${cleanNote || '-'}</td>
          <td>${sourceText}${a.status === 'Admitted' ? ' (Admitted)' : ''}</td>
        </tr>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment Report - Delta Health Care</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000000; background: #ffffff; }
            .header { text-align: center; border-bottom: 2.5px solid #000000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { color: #000000; margin: 0; font-size: 24px; font-weight: 900; }
            .header p { font-size: 12px; color: #000000; margin: 4px 0; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11.5px; color: #000000; }
            th, td { border: 1.5px solid #000000; padding: 7px 8px; text-align: left; color: #000000; }
            th { background: #f1f5f9; color: #000000; font-weight: 900; }
            .footer { margin-top: 35px; text-align: right; font-size: 12px; color: #000000; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
            <p>Official ${activeTab === 'quick-reserve-list' ? 'Quick Reserve' : 'Appointments'} List & Summary Report</p>
            <p>Printed On: ${getCurrentBDDateTimeStr()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Patient Name</th>
                <th>Phone & Referral</th>
                <th>Age</th>
                <th>Doctor / Category</th>
                <th>Appt. Date</th>
                <th>Booked At (Date & Time)</th>
                <th>Serial</th>
                <th>Note</th>
                <th>Status / Source</th>
              </tr>
            </thead>
            <tbody>
              ${blankRowsHtml}
              ${rowsHtml || '<tr><td colspan="10" style="text-align:center;">No records found.</td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <p>Authorized Signature ___________________</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }

  const filteredLabReports = labReports.filter(rep => {
    const matchesStatus = labFilterStatus === 'All' ? true : rep.delivery_status === labFilterStatus
    const q = labSearchQuery.trim().toLowerCase()
    const matchesQuery = !q
      || rep.invoice_no?.toLowerCase().includes(q)
      || rep.patient_name?.toLowerCase().includes(q)
      || rep.phone?.toLowerCase().includes(q)
      || rep.test_name?.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-teal-50 rounded-xl p-1 flex items-center justify-center border">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#008080]">ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
              <h1 className="text-sm font-black text-slate-900">Portal Authentication</h1>
            </div>
          </div>

          {/* Super Admin vs Admin সিলেকশন ট্যাব */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200">
            <button
              type="button"
              onClick={() => setLoginRoleSelect('superadmin')}
              className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                loginRoleSelect === 'superadmin'
                  ? 'bg-[#008080] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginRoleSelect('admin')}
              className={`py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                loginRoleSelect === 'admin'
                  ? 'bg-[#008080] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛡️ Admin (Staff)
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-xs font-bold text-slate-700">
                Enter {loginRoleSelect === 'superadmin' ? 'Super Admin' : 'Admin'} Password
              </label>
              <div className="relative mt-1">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={passwordInput}
                  autoComplete="off"
                  name="random_pwd_field_delta"
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder={loginRoleSelect === 'superadmin' ? 'Enter Super Admin password' : 'Enter Admin password'}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#008080] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800 text-sm font-bold focus:outline-none"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2.5 rounded-xl font-bold text-sm transition shadow-md">
              Login as {loginRoleSelect === 'superadmin' ? 'Super Admin' : 'Admin'}
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 w-full overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-3 sm:px-10 flex flex-wrap justify-between items-center gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl p-1 border flex-shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-[11px] sm:text-xs font-bold text-[#008080] leading-tight">ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xs sm:text-sm text-slate-900 leading-tight">JATRABARI LTD.</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                userRole === 'superadmin'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-teal-50 text-[#008080] border border-teal-200'
              }`}>
                {userRole === 'superadmin' ? '👑 Super Admin' : '🛡️ Admin'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-[11px] sm:text-xs font-bold text-[#008080] hover:underline bg-teal-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-teal-200 whitespace-nowrap">
            Live Website →
          </a>
          <button onClick={handleLogout} className="text-[11px] sm:text-xs font-bold text-rose-600 bg-rose-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition whitespace-nowrap">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 gap-4 sm:gap-6">
        <aside className="w-full lg:w-64 bg-white border border-slate-200 rounded-2xl p-2 sm:p-4 h-fit shadow-xs flex lg:flex-col gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
          {/* শুধুমাত্র Super Admin ডাক্তার লিস্ট দেখতে পারবে */}
          {userRole === 'superadmin' && (
            <button 
              onClick={() => setActiveTab('doctors')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'doctors' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
            >
              <span>👨‍⚕️</span> Doctor List ({doctors.length})
            </button>
          )}

          {/* ১. Appointments (Super Admin & Admin উভয়ের জন্য) */}
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'appointments' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
          >
            <span>📋</span> Appointments
          </button>

          {/* শুধুমাত্র Super Admin সিরিয়াল গ্যাপ এডিট করতে পারবে */}
          {userRole === 'superadmin' && (
            <button 
              onClick={() => setActiveTab('edit-serial')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'edit-serial' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
            >
              <span>⚙️</span> Edit Appointment Serial
            </button>
          )}

          {/* ২. Booking Appointment (Super Admin & Admin উভয়ের জন্য) */}
          <button 
            onClick={() => setActiveTab('booking')}
            className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'booking' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
          >
            <span>➕</span> Booking Appointment
          </button>

          {/* ৩. Quick Reserve Form (Super Admin & Admin উভয়ের জন্য) */}
          <button 
            onClick={() => {
              setQuickSubmitted(false);
              setQuickForm({ name: '', age: '', contact: '', note: '', is_referred: false, ref_name: '', ref_phone: '' });
              setActiveTab('quick-reserve');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'quick-reserve' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
          >
            <span>⚡</span> Quick Reserve Form
          </button>

          {/* ৪. Quick Reserve List (Super Admin & Admin উভয়ের জন্য) */}
          <button 
            onClick={() => setActiveTab('quick-reserve-list')}
            className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'quick-reserve-list' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
          >
            <span>🚨</span> Quick Reserve List
          </button>

          {/* শুধুমাত্র Super Admin Lab & Reports দেখতে পারবে */}
          {userRole === 'superadmin' && (
            <button 
              onClick={() => setActiveTab('lab-reports')}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${activeTab === 'lab-reports' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 bg-slate-50/60 lg:bg-transparent'}`}
            >
              <span>🧪</span> Lab & Reports ({labReports.length})
            </button>
          )}
        </aside>

        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-xs w-full overflow-hidden">
          
          {activeTab === 'doctors' && userRole === 'superadmin' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">Doctor List ({doctors.length})</h2>
                  <p className="text-xs text-slate-500">Tap on Present / Absent badge to toggle doctor availability</p>
                </div>
                <button 
                  onClick={() => { resetDocForm(); setIsAddModalOpen(true) }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  <span>+</span> Add Doctor
                </button>
              </div>

              <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                      <th className="p-2.5 sm:p-3">NO</th>
                      <th className="p-2.5 sm:p-3">Doctor Name & Picture</th>
                      <th className="p-2.5 sm:p-3">Specialization</th>
                      <th className="p-2.5 sm:p-3">Reserved Blank</th>
                      <th className="p-2.5 sm:p-3">Fee</th>
                      <th className="p-2.5 sm:p-3">Status</th>
                      <th className="p-2.5 sm:p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs sm:text-sm">
                    {doctors.map((doc, idx) => {
                      const reservedCount = getDoctorReservedSlots(doc)
                      return (
                        <tr key={doc.id || idx} className="hover:bg-slate-50">
                          <td className="p-2.5 sm:p-3 font-bold text-slate-700">{idx + 1}</td>
                          <td className="p-2.5 sm:p-3 flex items-center gap-2.5">
                            <img 
                              src={doc.image_url || "/doctors/doctor-1.png"} 
                              alt={doc.name} 
                              onError={(e: any) => { e.target.src = "/doctors/doctor-1.png" }}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border object-top flex-shrink-0" 
                            />
                            <div>
                              <div className="font-bold text-slate-900">{doc.name}</div>
                              <div className="text-[11px] text-slate-500 line-clamp-1">{doc.degree}</div>
                            </div>
                          </td>
                          <td className="p-2.5 sm:p-3 text-slate-600 font-semibold">{doc.specialization}</td>
                          <td className="p-2.5 sm:p-3">
                            <span className="bg-teal-50 text-[#008080] border border-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap">
                              First {reservedCount} Blank (Starts #{reservedCount + 1})
                            </span>
                          </td>
                          <td className="p-2.5 sm:p-3 text-xs font-bold text-slate-800 whitespace-nowrap">{doc.follow_up_fee || doc.fee || '600 BDT'}</td>
                          <td className="p-2.5 sm:p-3">
                            <button
                              type="button"
                              onClick={() => handleToggleDoctorStatus(doc)}
                              title="Click to switch between Present & Absent"
                              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer shadow-xs whitespace-nowrap ${
                                doc.status === 'Absent'
                                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              {doc.status === 'Absent' ? '🔴 Absent' : '🟢 Present'}
                            </button>
                          </td>
                          <td className="p-2.5 sm:p-3 text-right space-x-1.5 whitespace-nowrap">
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'edit-serial' && userRole === 'superadmin' && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">Edit Appointment Serial (Doctor-wise)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select how many initial serials to keep blank/reserved for each doctor (e.g., if set to 3, patient serials start from #4; if set to 2, serials start from #3).
                </p>
              </div>

              <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                      <th className="p-3">NO</th>
                      <th className="p-3">Doctor Name</th>
                      <th className="p-3">Specialization</th>
                      <th className="p-3">Reserved Blank Serials</th>
                      <th className="p-3">Patient Booking Starts From</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs sm:text-sm">
                    {doctors.map((doc, idx) => {
                      const reservedCount = getDoctorReservedSlots(doc)
                      return (
                        <tr key={doc.id || idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{doc.name}</td>
                          <td className="p-3 text-slate-600 font-semibold">{doc.specialization}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={reservedCount}
                                disabled={savingSerialDocId === doc.id}
                                onChange={(e) => handleUpdateDoctorReservedSlots(doc, Number(e.target.value))}
                                className="border border-teal-300 rounded-xl px-3 py-1.5 text-xs font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#008080] cursor-pointer"
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                  <option key={num} value={num}>
                                    First {num} Serial{num !== 1 ? 's' : ''} Blank {num > 0 ? `(1 to ${num})` : '(None)'}
                                  </option>
                                ))}
                              </select>
                              {savingSerialDocId === doc.id && (
                                <span className="text-[11px] font-bold text-[#008080] animate-pulse">Saving...</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-mono font-black text-xs">
                              Starts from #{reservedCount + 1}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'appointments' || activeTab === 'quick-reserve-list') && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {activeTab === 'quick-reserve-list' ? 'Quick Reserve List' : 'Appointments'} ({filteredAppointments.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeTab === 'appointments'
                      ? (filterDoctor
                          ? `${selectedFilterDocObj?.name}: First ${activeReservedCountForSelectedDoc} serial(s) reserved blank; patient bookings start from #${activeReservedCountForSelectedDoc + 1}`
                          : 'Showing all doctors with their actual patient serial numbers (Auto-deletes after 7 days)')
                      : 'Review emergency quick reservations (Auto-deletes after 7 days)'}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {activeTab === 'appointments' && userRole === 'superadmin' && (
                    <button
                      onClick={() => setActiveTab('edit-serial')}
                      className="bg-teal-50 hover:bg-teal-100 text-[#008080] border border-teal-200 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
                    >
                      <span>⚙️</span> Edit Serial Gap
                    </button>
                  )}
                  <button 
                    onClick={downloadPDFReport}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center gap-2 flex-1 sm:flex-initial justify-center"
                  >
                    <span>📥</span> Download PDF
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {activeTab === 'appointments' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Doctor</label>
                    <select 
                      value={filterDoctor}
                      onChange={e => setFilterDoctor(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-xs bg-white font-medium"
                    >
                      <option value="">All Doctors (Show Main Serials Only)</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Starts #{getDoctorReservedSlots(d) + 1})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Date (Past 7 Days & Next 7 Days)</label>
                  <select 
                    value={filterDateMode}
                    onChange={e => setFilterDateMode(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-white font-medium"
                  >
                    <option value="all">All Dates (Last 7 Days to Next 7 Days)</option>
                    {getFilterDateOptions().map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {(filterDoctor || filterDateMode !== 'all') && (
                  <div>
                    <button 
                      onClick={() => { setFilterDoctor(''); setFilterDateMode('all') }}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                      <th className="p-2.5 sm:p-3">Serial</th>
                      <th className="p-2.5 sm:p-3">Patient Name</th>
                      <th className="p-2.5 sm:p-3">Age</th>
                      <th className="p-2.5 sm:p-3">Phone & Referral</th>
                      <th className="p-2.5 sm:p-3">Doctor / Category</th>
                      <th className="p-2.5 sm:p-3">Appt. Date</th>
                      <th className="p-2.5 sm:p-3">Booked At (Date & Time)</th>
                      <th className="p-2.5 sm:p-3">Note</th>
                      <th className="p-2.5 sm:p-3">Status / Source</th>
                      <th className="p-2.5 sm:p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs sm:text-sm">
                    {activeTab === 'appointments' && filterDoctor && activeReservedCountForSelectedDoc > 0 && Array.from({ length: activeReservedCountForSelectedDoc }, (_, i) => i + 1).map(blankSerial => (
                      <tr key={`blank-row-${blankSerial}`} className="bg-slate-50/40 text-slate-400">
                        <td className="p-2.5 sm:p-3 font-mono font-bold text-slate-400">#{blankSerial}</td>
                        <td className="p-2.5 sm:p-3 italic text-xs text-slate-300">— Reserved Blank —</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3 text-xs text-slate-400">{selectedFilterDocObj?.name || '-'}</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3">-</td>
                        <td className="p-2.5 sm:p-3 text-right">-</td>
                      </tr>
                    ))}

                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-sm text-slate-500 text-center py-6">
                          No patient bookings found.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app, idx) => {
                        const matchedDoc = doctors.find(d => d.id?.toString() === app.doctor_id?.toString() || d.doctor_no?.toString() === app.doctor_id?.toString())
                        const sourceLabel = getBookingSourceLabel(app)
                        const displaySerial = activeTab === 'appointments'
                          ? `#${app.computed_serial || app.serial_number}`
                          : `EQ#${app.computed_emergency_serial || idx + 1}`

                        const { mainPhone, cleanNote, refName, refPhone, bookedAt } = parseAppointmentDetails(app)
                        const isAdmitted = app.status === 'Admitted'

                        return (
                          <tr key={app.id} className="hover:bg-slate-50">
                            <td className="p-2.5 sm:p-3 font-mono font-bold text-[#008080]">{displaySerial}</td>
                            <td className="p-2.5 sm:p-3 font-semibold text-slate-900">{app.patient_name}</td>
                            <td className="p-2.5 sm:p-3 text-slate-600">{app.age || '-'}</td>
                            <td className="p-2.5 sm:p-3">
                              <div className="font-mono font-bold text-slate-900 text-xs">{mainPhone}</div>
                              {(refName || refPhone) && (
                                <div className="mt-1 bg-teal-50 border border-teal-200 rounded px-2 py-0.5 text-[10px] text-[#008080] font-bold">
                                  Ref: {refName || 'Yes'} {refPhone ? `(${refPhone})` : ''}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 sm:p-3 text-slate-800 font-medium">{matchedDoc ? matchedDoc.name : app.doctor_id}</td>
                            <td className="p-2.5 sm:p-3 text-slate-600 whitespace-nowrap">{app.booking_date}</td>
                            <td className="p-2.5 sm:p-3 text-slate-600 text-[11px] font-mono whitespace-nowrap">
                              {bookedAt}
                            </td>
                            <td className="p-2.5 sm:p-3 text-slate-600 text-xs italic max-w-[160px]">
                              {cleanNote || 'None'}
                            </td>
                            <td className="p-2.5 sm:p-3">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                  sourceLabel === 'Admin Panel'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-teal-50 text-[#008080] border border-teal-200'
                                }`}>
                                  {sourceLabel}
                                </span>
                                {isAdmitted && (
                                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap">
                                    ✅ Admitted
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {activeTab === 'quick-reserve-list' && (
                                  <button
                                    type="button"
                                    disabled={isAdmitted || admittingId === app.id}
                                    onClick={() => handleMarkAsAdmitted(app, displaySerial)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                                      isAdmitted
                                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                        : 'bg-[#008080] hover:bg-[#006666] text-white cursor-pointer'
                                    }`}
                                  >
                                    {admittingId === app.id
                                      ? 'Sending SMS...'
                                      : isAdmitted
                                      ? '✅ Admitted'
                                      : '🏥 Mark as Admitted'}
                                  </button>
                                )}

                                {/* শুধুমাত্র Super Admin অ্যাপয়েন্টমেন্ট বা কুইক রিজার্ভ ডিলিট/ক্যান্সেল করতে পারবে, সাধারণ Admin পারবে না */}
                                {userRole === 'superadmin' ? (
                                  <button 
                                    disabled={cancellingId === app.id}
                                    onClick={() => handleDeleteAppointment(app)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                                  >
                                    {cancellingId === app.id
                                      ? 'Cancelling...'
                                      : activeTab === 'appointments'
                                      ? 'Cancel & SMS 🗑️'
                                      : 'Delete 🗑️'}
                                  </button>
                                ) : (
                                  activeTab === 'appointments' && (
                                    <span className="text-[10px] text-slate-400 font-semibold italic">View Only</span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="max-w-xl mx-auto">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4">Book Appointment</h2>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Specialization <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={adminBooking.specialization}
                        onChange={e => {
                          setAdminBooking({...adminBooking, specialization: e.target.value, doctor_id: '', booking_date: ''})
                          setSelectedAdminDoctor(null)
                          setAvailableDatesForAdminDoc([])
                        }}
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Specialization</option>
                        {Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).map((spec: any, idx) => (
                          <option key={idx} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Select Doctor <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={adminBooking.doctor_id}
                        onChange={e => handleAdminDoctorChange(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Doctor</option>
                        {doctors.filter(d => !adminBooking.specialization || d.specialization === adminBooking.specialization).map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedAdminDoctor && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-slate-800 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-900 text-sm">{selectedAdminDoctor.name}</p>
                        <span className="bg-white text-[#008080] border border-teal-200 px-2 py-0.5 rounded font-bold text-[11px]">
                          Starts from Serial #{getDoctorReservedSlots(selectedAdminDoctor) + 1}
                        </span>
                      </div>
                      <p className="text-slate-700 font-semibold">{selectedAdminDoctor.degree}</p>
                      <div className="text-[11px] font-bold text-[#008080]">
                        <span>Days: {selectedAdminDoctor.days?.join(', ')}</span><br/>
                        <span>Sitting Hours: {selectedAdminDoctor.sitting_hours}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Select Date (Next 3 Available Days) <span className="text-rose-500">*</span></label>
                    {availableDatesForAdminDoc.length === 0 ? (
                      <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        {selectedAdminDoctor ? "⚠️ No available dates found for this doctor." : "Please select a doctor first."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableDatesForAdminDoc.map((item, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setAdminBooking({...adminBooking, booking_date: item.dateStr})}
                            className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${adminBooking.booking_date === item.dateStr ? 'bg-[#008080] text-white border-[#008080] shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                          >
                            {item.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Patient Name <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={adminBooking.name}
                        onChange={e => setAdminBooking({...adminBooking, name: e.target.value})}
                        placeholder="Full Name" 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Phone Number <span className="text-rose-500">*</span></label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={11}
                        value={adminBooking.phone}
                        onChange={e => setAdminBooking({...adminBooking, phone: e.target.value.replace(/\D/g, '')})}
                        placeholder="11 Digit Mobile Number" 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1 font-mono" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input 
                        type="number" 
                        value={adminBooking.age}
                        onChange={e => setAdminBooking({...adminBooking, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Note</label>
                      <input 
                        type="text" 
                        value={adminBooking.note}
                        onChange={e => setAdminBooking({...adminBooking, note: e.target.value})}
                        placeholder="Add a note..." 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingBooking || isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-md ${isSubmittingBooking || isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#008080] hover:bg-[#006666] text-white'}`}
                  >
                    {isSubmittingBooking ? 'Submitting...' : 'Confirm Appointment'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'quick-reserve' && (
            <div className="max-w-xl mx-auto">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-4">Quick Reserve (Emergency Slots)</h3>
              {quickSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 font-bold">✓</div>
                  <h3 className="text-xl font-bold text-slate-900">Emergency Slot Confirmed!</h3>
                  <button
                    onClick={() => {
                      setQuickSubmitted(false);
                      setQuickForm({ name: '', age: '', contact: '', note: '', is_referred: false, ref_name: '', ref_phone: '' });
                    }}
                    className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-sm font-semibold"
                  >
                    Reserve Another
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
                    {['NICU', 'PICU', 'ICU', 'General', 'OPD'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setQuickReserveType(type)}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition ${quickReserveType === type ? 'bg-[#008080] text-white border-[#008080] shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAdminQuickSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Patient Name <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required 
                          value={quickForm.name} 
                          onChange={e => setQuickForm({...quickForm, name: e.target.value})}
                          placeholder="Patient Full Name" 
                          className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Age</label>
                        <input 
                          type="number" 
                          value={quickForm.age} 
                          onChange={e => setQuickForm({...quickForm, age: e.target.value})}
                          placeholder="Age" 
                          className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Contact Number <span className="text-rose-500">*</span></label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={11}
                        value={quickForm.contact} 
                        onChange={e => setQuickForm({...quickForm, contact: e.target.value.replace(/\D/g, '')})}
                        placeholder="11 Digit Mobile Number" 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">Note (Optional)</label>
                      <input 
                        type="text" 
                        value={quickForm.note} 
                        onChange={e => setQuickForm({...quickForm, note: e.target.value})}
                        placeholder="Add patient condition or note..." 
                        className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>

                    <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
                      <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#008080] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quickForm.is_referred}
                          onChange={e => setQuickForm({ ...quickForm, is_referred: e.target.checked })}
                          className="w-4 h-4 accent-[#008080] rounded cursor-pointer"
                        />
                        <span>Referred by Doctor / Representative (Tick if Referred)</span>
                      </label>

                      {quickForm.is_referred && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-teal-200/80">
                          <div>
                            <label className="text-xs font-bold text-slate-700">Referred By (Name)</label>
                            <input
                              type="text"
                              value={quickForm.ref_name}
                              onChange={e => setQuickForm({ ...quickForm, ref_name: e.target.value })}
                              placeholder="Referrer Name"
                              className="w-full border bg-white rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700">Referred Phone Number *</label>
                            <input
                              type="tel"
                              required={quickForm.is_referred}
                              maxLength={11}
                              value={quickForm.ref_phone}
                              onChange={e => setQuickForm({ ...quickForm, ref_phone: e.target.value.replace(/\D/g, '') })}
                              placeholder="11 Digit Referrer Phone"
                              className="w-full border bg-white rounded-xl px-3 py-2 text-xs sm:text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingQuick}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-md mt-2 ${
                        isSubmittingQuick
                          ? 'bg-slate-400 text-white cursor-not-allowed'
                          : 'bg-[#008080] hover:bg-[#006666] text-white cursor-pointer'
                      }`}
                    >
                      {isSubmittingQuick ? 'Submitting Quick Reservation...' : 'Confirm Quick Reservation'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lab-reports' && userRole === 'superadmin' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">Diagnostic Lab & Reports ({filteredLabReports.length})</h2>
                  <p className="text-xs text-slate-500">Upload PDF/Image reports for direct download from the website</p>
                </div>
                <button 
                  onClick={() => { resetLabForm(); setIsLabModalOpen(true) }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <span>+</span> Upload Lab Report
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold text-teal-700 uppercase">Total Reports</p>
                    <p className="text-2xl font-black text-slate-900">{labReports.length}</p>
                  </div>
                  <span className="text-2xl">🧪</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase">Ready for Download</p>
                    <p className="text-2xl font-black text-emerald-800">{labReports.filter(r => r.delivery_status === 'Ready').length}</p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold text-amber-700 uppercase">Processing / Pending</p>
                    <p className="text-2xl font-black text-amber-800">{labReports.filter(r => r.delivery_status !== 'Ready').length}</p>
                  </div>
                  <span className="text-2xl">⏳</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Search by Bill / Invoice No, Patient Name or Phone</label>
                  <input 
                    type="text"
                    value={labSearchQuery}
                    onChange={e => setLabSearchQuery(e.target.value)}
                    placeholder="Search by Bill No, Patient Name, or Phone..."
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Report Status</label>
                  <select 
                    value={labFilterStatus}
                    onChange={e => setLabFilterStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                  >
                    <option value="All">All Status</option>
                    <option value="Ready">Ready</option>
                    <option value="Processing">Processing</option>
                  </select>
                </div>
              </div>

              {filteredLabReports.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-3xl mb-2">📄</div>
                  <h4 className="text-sm font-bold text-slate-800">No Lab Reports Found</h4>
                  <p className="text-xs text-slate-500 mt-1">Click "+ Upload Lab Report" to add a new patient diagnostic report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                        <th className="p-2.5 sm:p-3">Bill / Invoice No</th>
                        <th className="p-2.5 sm:p-3">Patient Info</th>
                        <th className="p-2.5 sm:p-3">Test / Investigation</th>
                        <th className="p-2.5 sm:p-3">Date</th>
                        <th className="p-2.5 sm:p-3">Payment</th>
                        <th className="p-2.5 sm:p-3">Report File</th>
                        <th className="p-2.5 sm:p-3">Status</th>
                        <th className="p-2.5 sm:p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs sm:text-sm">
                      {filteredLabReports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50">
                          <td className="p-2.5 sm:p-3 font-mono font-black text-[#008080] text-xs">{rep.invoice_no}</td>
                          <td className="p-2.5 sm:p-3">
                            <div className="font-bold text-slate-900">{rep.patient_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{rep.phone} • {rep.age ? `${rep.age}Y` : ''} ({rep.gender})</div>
                          </td>
                          <td className="p-2.5 sm:p-3">
                            <div className="font-semibold text-slate-800">{rep.test_name}</div>
                            <div className="text-[11px] text-slate-500">Ref: {rep.referred_by || 'Self'}</div>
                          </td>
                          <td className="p-2.5 sm:p-3 text-xs text-slate-600 whitespace-nowrap">{rep.test_date}</td>
                          <td className="p-2.5 sm:p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${rep.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                              {rep.payment_status} ({rep.amount})
                            </span>
                          </td>
                          <td className="p-2.5 sm:p-3 text-xs">
                            {rep.file_url ? (
                              <a 
                                href={rep.file_url} 
                                download={rep.file_name || `${rep.invoice_no}-report`}
                                className="text-[#008080] font-bold hover:underline flex items-center gap-1 whitespace-nowrap"
                              >
                                📥 Download Report
                              </a>
                            ) : (
                              <span className="text-rose-500 text-[11px] font-semibold">No File Attached</span>
                            )}
                          </td>
                          <td className="p-2.5 sm:p-3">
                            <button
                              onClick={() => handleToggleLabStatus(rep)}
                              title="Click to toggle Ready / Processing"
                              className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition whitespace-nowrap ${rep.delivery_status === 'Ready' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                            >
                              {rep.delivery_status === 'Ready' ? '✅ Ready' : '⏳ Processing'}
                            </button>
                          </td>
                          <td className="p-2.5 sm:p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button 
                              onClick={() => handleEditLabReport(rep)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                              title="Edit Report"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteLabReport(rep.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                              title="Delete Report"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Lab Report Upload Modal (Test Findings / Result Summary Box Removed) */}
      {isLabModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsLabModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">{isLabEditMode ? 'Edit Diagnostic Lab Report' : 'Upload New Lab Report'}</h3>
            <p className="text-xs text-slate-500 mb-4">Patients can directly download the uploaded report file from the website using their Bill / Invoice Number or Phone Number.</p>

            <form onSubmit={handleSaveLabReport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Bill / Invoice Number *</label>
                  <input 
                    type="text" 
                    required 
                    value={labForm.invoice_no} 
                    onChange={e => setLabForm({...labForm, invoice_no: e.target.value})}
                    placeholder="Enter Bill / Invoice No" 
                    className="w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#008080] bg-white mt-1 outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Patient Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={labForm.patient_name} 
                    onChange={e => setLabForm({...labForm, patient_name: e.target.value})}
                    placeholder="Patient Name" 
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Phone Number (11 Digits) *</label>
                  <input 
                    type="tel" 
                    required 
                    maxLength={11}
                    value={labForm.phone} 
                    onChange={e => setLabForm({...labForm, phone: e.target.value.replace(/\D/g, '')})}
                    placeholder="Mobile Number" 
                    className="w-full border rounded-xl px-3 py-2 text-sm font-mono mt-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Age</label>
                  <input 
                    type="number" 
                    value={labForm.age} 
                    onChange={e => setLabForm({...labForm, age: e.target.value})}
                    placeholder="Age" 
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Gender</label>
                  <select 
                    value={labForm.gender} 
                    onChange={e => setLabForm({...labForm, gender: e.target.value})}
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Test Date</label>
                  <input 
                    type="date" 
                    value={labForm.test_date} 
                    onChange={e => setLabForm({...labForm, test_date: e.target.value})}
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Referred By Doctor</label>
                  <select 
                    value={labForm.referred_by} 
                    onChange={e => setLabForm({...labForm, referred_by: e.target.value})}
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white"
                  >
                    <option value="Self">Self / Walk-in</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Test / Investigation Name *</label>
                  <input 
                    type="text" 
                    required 
                    list="common-lab-tests"
                    value={labForm.test_name} 
                    onChange={e => setLabForm({...labForm, test_name: e.target.value})}
                    placeholder="Type or select test" 
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1" 
                  />
                  <datalist id="common-lab-tests">
                    {commonLabTests.map((t, i) => <option key={i} value={t} />)}
                  </datalist>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Bill Amount</label>
                    <input 
                      type="text" 
                      value={labForm.amount} 
                      onChange={e => setLabForm({...labForm, amount: e.target.value})}
                      placeholder="Amount" 
                      className="w-full border rounded-xl px-2.5 py-2 text-xs mt-1" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Payment</label>
                    <select 
                      value={labForm.payment_status} 
                      onChange={e => setLabForm({...labForm, payment_status: e.target.value})}
                      className="w-full border rounded-xl px-2 py-2 text-xs mt-1 bg-white font-bold"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Report Status</label>
                    <select 
                      value={labForm.delivery_status} 
                      onChange={e => setLabForm({...labForm, delivery_status: e.target.value})}
                      className="w-full border rounded-xl px-2 py-2 text-xs mt-1 bg-white font-bold text-[#008080]"
                    >
                      <option value="Ready">✅ Ready</option>
                      <option value="Processing">⏳ Processing</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1.5">Upload Report PDF or Image File *</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={handleLabFileUpload}
                  className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#008080] file:text-white hover:file:bg-[#006666] cursor-pointer w-full"
                />
                {labForm.file_name && (
                  <p className="text-xs text-emerald-700 font-bold mt-2">
                    📎 Attached File: {labForm.file_name}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sendSmsOnLabSave}
                    onChange={e => setSendSmsOnLabSave(e.target.checked)}
                    className="w-4 h-4 accent-[#008080]"
                  />
                  Send SMS Notification to Patient if Report is Ready
                </label>
              </div>

              <button 
                type="submit" 
                disabled={savingLab}
                className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md"
              >
                {savingLab ? 'Uploading Report...' : isLabEditMode ? 'Update Lab Report' : 'Publish Lab Report to Website'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && userRole === 'superadmin' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">{isEditMode ? 'Edit Doctor & Schedule' : 'Add New Doctor'}</h3>
            
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor Name *</label>
                  <input type="text" required value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} placeholder="Dr. Name" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor No (ID)</label>
                  <input type="text" value={docForm.doctor_no} onChange={e => setDocForm({...docForm, doctor_no: e.target.value})} placeholder="ID" className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Degree</label>
                  <input type="text" value={docForm.degree} onChange={e => setDocForm({...docForm, degree: e.target.value})} placeholder="MBBS, FCPS" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input type="text" value={docForm.phone} onChange={e => setDocForm({...docForm, phone: e.target.value})} placeholder="Mobile Number" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Doctor Specialized Details / Sub-Specialty</label>
                <input type="text" value={docForm.details} onChange={e => setDocForm({...docForm, details: e.target.value})} placeholder="Specialized in..." className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch / Workplace</label>
                  <input type="text" value={docForm.branch} onChange={e => setDocForm({...docForm, branch: e.target.value})} placeholder="Delta Health Care" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Follow Up Fee</label>
                  <input type="text" value={docForm.follow_up_fee} onChange={e => setDocForm({...docForm, follow_up_fee: e.target.value})} placeholder="Fee" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Reserved Blank Serials</label>
                  <select
                    value={docForm.reserved_slots}
                    onChange={e => setDocForm({...docForm, reserved_slots: Number(e.target.value)})}
                    className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white font-bold text-[#008080]"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>First {n} Blank (Starts #{n + 1})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Specialization *</label>
                  <input type="text" required value={docForm.specialization} onChange={e => setDocForm({...docForm, specialization: e.target.value})} placeholder="Gynae & Obs." className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select value={docForm.status} onChange={e => setDocForm({...docForm, status: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-white font-semibold">
                    <option value="Present">Present (🟢 Active in Website)</option>
                    <option value="Absent">Absent (🔴 Hidden/Off)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-2">Doctor Picture</label>
                <div className="flex items-center gap-4">
                  <img 
                    src={docForm.image_url || "/doctors/doctor-1.png"} 
                    alt="Preview" 
                    onError={(e: any) => { e.target.src = "/doctors/doctor-1.png" }}
                    className="w-14 h-14 rounded-full object-cover border bg-white flex-shrink-0" 
                  />
                  <div className="flex-1 overflow-hidden">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#008080] file:text-white hover:file:bg-[#006666] cursor-pointer w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-extrabold text-slate-800 block mb-2">Available Days & Time Slots</label>
                <div className="space-y-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="flex flex-wrap items-center justify-between bg-slate-50 p-2.5 rounded-xl border gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input 
                          type="checkbox" 
                          checked={Boolean(docForm.schedule[day]?.active)}
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
                            placeholder="Start"
                            className="border rounded-lg px-2 py-1 text-xs w-20 bg-white"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input 
                            type="text" 
                            value={docForm.schedule[day].end}
                            onChange={e => handleTimeChange(day, 'end', e.target.value)}
                            placeholder="End"
                            className="border rounded-lg px-2 py-1 text-xs w-20 bg-white"
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

      {deleteModalDoc && userRole === 'superadmin' && (
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