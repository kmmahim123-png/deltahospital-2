"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'booking' | 'quick-reserve' | 'quick-reserve-list' | 'lab-reports'>('doctors')
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>(sharedDoctors)

  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDateMode, setFilterDateMode] = useState('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<any>(null)

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
  const [quickForm, setQuickForm] = useState({ name: '', age: '', contact: '' })
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
    report_summary: '',
    file_url: '',
    file_name: ''
  })

  useEffect(() => {
    const authStatus = localStorage.getItem('delta_admin_auth')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      cleanupPastBookingsAndFetch()
      fetchDatabaseDoctors()
      fetchLabReports()
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === 'delta123') {
      setIsAuthenticated(true)
      localStorage.setItem('delta_admin_auth', 'true')
    } else {
      alert('Incorrect Password!')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('delta_admin_auth')
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

  async function cleanupPastBookingsAndFetch() {
    try {
      const todayStr = getTodayBDDate()
      await supabase.from('bookings').delete().lt('booking_date', todayStr)

      const { data: allData, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true })

      if (error) throw error

      if (allData) {
        const oldIds = allData
          .filter(app => app.booking_date && app.booking_date < todayStr)
          .map(app => app.id)

        if (oldIds.length > 0) {
          await supabase.from('bookings').delete().in('id', oldIds)
        }

        const validBookings = allData.filter(app => !app.booking_date || app.booking_date >= todayStr)

        const grouped: any = {}
        validBookings.forEach(app => {
          if (app.patient_type !== 'Emergency') {
            const key = `${app.doctor_id}_${app.booking_date}`
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(app)
          }
        })

        const sortedList: any[] = []
        Object.keys(grouped).forEach(key => {
          grouped[key].forEach((item: any, index: number) => {
            sortedList.push({ ...item, computed_serial: index + 1 })
          })
        })

        validBookings.forEach(app => {
          if (app.patient_type === 'Emergency') {
            sortedList.push(app)
          }
        })

        setAppointments(sortedList)
      }
    } catch (err) {
      console.error('Error cleaning bookings:', err)
    }
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

          return {
            ...fallbackDoc,
            ...d,
            doctor_no: d.doctor_no || String(index + 1),
            days: parsedDays,
            follow_up_fee: d.follow_up_fee || d.fee || fallbackDoc?.fee || '600 BDT',
            fee: d.follow_up_fee || d.fee || fallbackDoc?.fee || '600 BDT',
            details: d.details || fallbackDoc?.details || ''
          }
        })
        setDoctors(formatted)
      } else {
        setDoctors(sharedDoctors)
      }
    } catch (err) {
      console.error('Error fetching doctors:', err)
      setDoctors(sharedDoctors)
    }
  }

  // ১ ক্লিকে ডাক্তারের Present / Absent স্ট্যাটাস পরিবর্তন করার ফাংশন
  const handleToggleDoctorStatus = async (doc: any) => {
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
      invoice_no: '', // একদম খালি রাখা হলো যাতে স্লিপ দেখে অ্যাডমিন নিজে বসাতে পারে
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
      report_summary: 'Normal / Within Reference Range',
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
      report_summary: report.report_summary || '',
      file_url: report.file_url || '',
      file_name: report.file_name || ''
    })
    setIsLabModalOpen(true)
  }

  const handleLabFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      alert('File size must be under 6 MB')
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
        report_summary: labForm.report_summary,
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
          const smsMsg = `Delta Health Care Jatrabari Ltd.\nDear ${payload.patient_name}, your lab report for '${payload.test_name}' (Bill No: ${payload.invoice_no}) is READY. You can download it from our website.\nHotline: 09666720320`
          await fetch('https://client.giosms.com/api/v1/send', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              to: `88${payload.phone}`,
              message: smsMsg,
              sender_id: '8809666720320',
              type: 'transactional'
            })
          })
        } catch (smsErr) {
          console.error('Lab SMS error:', smsErr)
        }
      }

      alert(isLabEditMode ? 'Lab Report updated successfully!' : 'Lab Report created & published to website!')
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
    if (!confirm('Are you sure you want to delete this lab report permanently?')) return
    try {
      const { error } = await supabase.from('lab_reports').delete().eq('id', id)
      if (error) throw error
      setLabReports(labReports.filter(r => r.id !== id))
    } catch (err: any) {
      alert('Delete failed: ' + err.message)
    }
  }

  const printSingleLabReport = (report: any) => {
    const printWin = window.open('', '', 'left=0,top=0,width=850,height=750')
    if (!printWin) return

    printWin.document.write(`
      <html>
        <head>
          <title>Lab Report - ${report.invoice_no}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #008080; padding-bottom: 12px; margin-bottom: 20px; }
            .title-bn { font-size: 20px; font-weight: 900; color: #008080; margin: 0; }
            .title-en { font-size: 13px; font-weight: 800; color: #e11d48; margin: 2px 0; }
            .addr { font-size: 11px; color: #475569; margin: 0; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; font-size: 12px; margin-bottom: 20px; }
            .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
            .report-title { text-align: center; background: #008080; color: #fff; font-weight: 800; padding: 8px; border-radius: 6px; font-size: 14px; letter-spacing: 1px; margin-bottom: 20px; text-transform: uppercase; }
            .result-box { min-height: 280px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; background: #fff; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #334155; padding-top: 20px; }
            .sig-line { border-top: 1px solid #334155; width: 180px; text-align: center; padding-top: 6px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title-bn">ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</h1>
              <h2 class="title-en">DELTA HEALTH CARE JATRABARI LIMITED</h2>
              <p class="addr">169/1-B, West Dholaipar, Jatrabari, Dhaka | Hotline: 09666720320</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: 900; color: #008080;">Bill / Invoice: ${report.invoice_no}</div>
              <div style="font-size: 11px; color: #64748b;">Date: ${report.test_date}</div>
              <div style="font-size: 11px; font-weight: 700; color: #059669;">Status: ${report.delivery_status}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-row"><span><b>Patient Name:</b></span> <span>${report.patient_name}</span></div>
            <div class="meta-row"><span><b>Age / Gender:</b></span> <span>${report.age || '-'} Yrs / ${report.gender || 'Male'}</span></div>
            <div class="meta-row"><span><b>Phone Number:</b></span> <span>${report.phone}</span></div>
            <div class="meta-row"><span><b>Referred By:</b></span> <span>${report.referred_by || 'Self'}</span></div>
            <div class="meta-row"><span><b>Investigation:</b></span> <span><b>${report.test_name}</b></span></div>
            <div class="meta-row"><span><b>Payment Status:</b></span> <span>${report.payment_status} (${report.amount || ''})</span></div>
          </div>

          <div class="report-title">Diagnostic Investigation Report — ${report.test_name}</div>

          <div class="result-box">${report.report_summary || 'Test completed accurately. All parameters evaluated.'}</div>

          ${report.file_url && report.file_url.startsWith('data:image') ? `
            <div style="margin-top: 15px; text-align: center;">
              <img src="${report.file_url}" style="max-width: 100%; max-height: 360px; border-radius: 8px; border: 1px solid #cbd5e1;" />
            </div>
          ` : ''}

          <div class="footer">
            <div class="sig-line">Medical Technologist (Lab)</div>
            <div class="sig-line">Pathologist / Consultant</div>
            <div class="sig-line">Authorized Signature</div>
          </div>
        </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print() }, 400)
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
    try {
      const activeDays = daysOfWeek.filter(day => docForm.schedule[day]?.active)
      const firstDay = activeDays[0]
      const sittingHours = firstDay && docForm.schedule[firstDay]
        ? `${docForm.schedule[firstDay].start} - ${docForm.schedule[firstDay].end}`
        : '04:00 PM - 08:00 PM'

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
        schedule: docForm.schedule,
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
      fetchDatabaseDoctors()
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
      schedule: defaultSchedule
    })
  }

  const handleEditClick = (doc: any) => {
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
      schedule: initialSchedule
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return
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
    if (adminBooking.phone.length !== 11) { alert('Phone number must be exactly 11 digits.'); return }
    if (isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0) { alert('Selected doctor is not available.'); return }

    try {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', selectedAdminDoctor.id.toString())
        .eq('booking_date', adminBooking.booking_date)

      const nextSerial = (count || 0) + 1
      const serialNumStr = `#${nextSerial}`

      const { error } = await supabase.from('bookings').insert({
        patient_name: adminBooking.name,
        phone: adminBooking.phone,
        doctor_id: selectedAdminDoctor.id.toString(),
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
            'Authorization': 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            to: `88${adminBooking.phone}`,
            message: `Delta Health Care Jatrabari Ltd.\nDear ${adminBooking.name}, your appointment with ${selectedAdminDoctor.name} on ${adminBooking.booking_date} (${selectedAdminDoctor.sitting_hours}) is confirmed. Serial: ${serialNumStr}. Fee: ${selectedAdminDoctor.follow_up_fee || '600 BDT'}.\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
            sender_id: '8809666720320',
            type: 'transactional'
          })
        })
      } catch (smsError) {
        console.error("SMS Error:", smsError)
      }

      setBookingSubmitted(true)
      cleanupPastBookingsAndFetch()
    } catch (err: any) {
      alert('Booking failed: ' + err.message)
    }
  }

  const handleAdminQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quickForm.contact.length !== 11) { alert('Contact number must be 11 digits.'); return }
    
    const todayDate = getTodayBDDate()
    const serialNumInt = Math.floor(100 + Math.random() * 900)

    try {
      await supabase.from('bookings').insert({
        patient_name: quickForm.name,
        phone: quickForm.contact,
        doctor_id: `Emergency-${quickReserveType}`,
        booking_date: todayDate,
        age: quickForm.age ? parseInt(quickForm.age) : null,
        patient_type: 'Emergency',
        symptoms: `Quick Reservation: ${quickReserveType}`,
        serial_number: serialNumInt,
        status: 'Confirmed'
      })

      const customSmsMessage = `Dear Patient/Attendant, your '${quickReserveType}' booking has been successfully confirmed for ${todayDate}. Thank you for choosing Delta Health Care Jatrabari Ltd.For more information Call: 09666720320\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`

      await fetch('https://client.giosms.com/api/v1/send', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: `88${quickForm.contact}`,
          message: customSmsMessage,
          sender_id: '8809666720320',
          type: 'transactional'
        })
      })

      setQuickSubmitted(true)
      cleanupPastBookingsAndFetch()
    } catch (err: any) {
      alert('Emergency request failed: ' + err.message)
    }
  }

  const downloadPDFReport = () => {
    const printWindow = window.open('', '', 'left=0,top=0,width=900,height=700')
    if (!printWindow) return

    const rowsHtml = filteredAppointments.map((a, idx) => {
      const matchedDoc = doctors.find(d => d.id?.toString() === a.doctor_id?.toString() || d.doctor_no?.toString() === a.doctor_id?.toString())
      const docName = matchedDoc ? matchedDoc.name : a.doctor_id
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><b>${a.patient_name}</b></td>
          <td>${a.phone}</td>
          <td>${a.age || '-'}</td>
          <td>${docName}</td>
          <td>${a.booking_date}</td>
          <td>#${a.computed_serial || a.serial_number}</td>
          <td>${a.patient_type === 'Admin' ? 'Admin' : a.patient_type === 'Emergency' ? 'Quick Reserve' : 'Online'}</td>
        </tr>
      `
    }).join('')

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
            <h2>ডেল্টা হেলথ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
            <p>Official Appointments List & Summary Report</p>
            <p>Generated Date: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Age</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Serial</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align:center;">No appointments found.</td></tr>'}
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
    setTimeout(() => { printWindow.print() }, 500)
  }

  const todayDateStr = getTodayBDDate()

  const filteredAppointments = appointments.filter(app => {
    if (app.booking_date && app.booking_date < todayDateStr) return false

    if (activeTab === 'quick-reserve-list') {
      return app.patient_type === 'Emergency'
    }
    if (activeTab === 'appointments') {
      if (app.patient_type === 'Emergency') return false
      const matchDoc = filterDoctor ? app.doctor_id?.toString() === filterDoctor : true
      const matchDate = filterDateMode !== 'all' ? app.booking_date === filterDateMode : true
      return matchDoc && matchDate
    }
    return true
  })

  // এই ভেরিয়েবলটি যুক্ত করা হয়েছে যাতে Lab & Reports ট্যাবে আর কোনো Runtime Error না আসে
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
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-xs font-bold text-slate-700">Enter Admin Password</label>
              <div className="relative mt-1">
                <input 
                  type={showPassword ? "text" : "password"} 
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
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
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
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs font-bold text-[#008080] hover:underline bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
            View Live Website →
          </a>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition">
            Log Out
          </button>
        </div>
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
          <button 
            onClick={() => setActiveTab('quick-reserve')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'quick-reserve' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>⚡</span> Quick Reserve Form
          </button>
          <button 
            onClick={() => setActiveTab('quick-reserve-list')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'quick-reserve-list' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>🚨</span> Quick Reserve List
          </button>
          <button 
            onClick={() => setActiveTab('lab-reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'lab-reports' ? 'bg-[#008080] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span>🧪</span> Lab & Reports ({labReports.length})
          </button>
        </aside>

        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          
          {activeTab === 'doctors' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Doctor List ({doctors.length})</h2>
                  <p className="text-xs text-slate-500">Click on Present / Absent badge to toggle doctor availability</p>
                </div>
                <button 
                  onClick={() => { resetDocForm(); setIsAddModalOpen(true) }}
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
                      <th className="p-3">Status (Click to Change)</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {doctors.map((doc, idx) => (
                      <tr key={doc.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                        <td className="p-3 flex items-center gap-3">
                          <img 
                            src={doc.image_url || "/doctors/doctor-1.png"} 
                            alt={doc.name} 
                            onError={(e: any) => { e.target.src = "/doctors/doctor-1.png" }}
                            className="w-10 h-10 rounded-full object-cover border object-top" 
                          />
                          <div>
                            <div className="font-bold text-slate-900">{doc.name}</div>
                            <div className="text-xs text-slate-500">{doc.degree}</div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{doc.specialization}</td>
                        <td className="p-3 text-xs text-slate-600">{parseDoctorDaysArray(doc.days).join(', ')}</td>
                        <td className="p-3 text-xs font-bold text-slate-800">{doc.follow_up_fee || doc.fee || '600 BDT'}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleDoctorStatus(doc)}
                            title="Click to switch between Present & Absent"
                            className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer shadow-xs ${
                              doc.status === 'Absent'
                                ? 'bg-rose-600 text-white hover:bg-rose-700'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {doc.status === 'Absent' ? '🔴 Absent' : '🟢 Present'}
                          </button>
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

          {(activeTab === 'appointments' || activeTab === 'quick-reserve-list') && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {activeTab === 'quick-reserve-list' ? 'Quick Reserve List' : 'Appointments'} ({filteredAppointments.length})
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
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter by Date (7 Days)</label>
                    <select 
                      value={filterDateMode}
                      onChange={e => setFilterDateMode(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
                    >
                      <option value="all">All Dates</option>
                      {getNext7Days().map(dateStr => (
                        <option key={dateStr} value={dateStr}>{dateStr}</option>
                      ))}
                    </select>
                  </div>

                  {(filterDoctor || filterDateMode !== 'all') && (
                    <div className="self-end">
                      <button 
                        onClick={() => { setFilterDoctor(''); setFilterDateMode('all') }}
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
                      {filteredAppointments.map(app => {
                        const matchedDoc = doctors.find(d => d.id?.toString() === app.doctor_id?.toString() || d.doctor_no?.toString() === app.doctor_id?.toString())
                        const sourceLabel = app.patient_type === 'Admin' ? 'Admin' : app.patient_type === 'Emergency' ? 'Quick Reserve' : 'Online'
                        return (
                          <tr key={app.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-[#008080]">#{app.computed_serial || app.serial_number}</td>
                            <td className="p-3 font-semibold text-slate-900">{app.patient_name}</td>
                            <td className="p-3 text-slate-600">{app.age || '-'}</td>
                            <td className="p-3 text-slate-600 font-mono text-xs">{app.phone}</td>
                            <td className="p-3 text-slate-800 font-medium">{matchedDoc ? matchedDoc.name : app.doctor_id}</td>
                            <td className="p-3 text-slate-600">{app.booking_date}</td>
                            <td className="p-3 text-slate-500 text-xs italic">{app.symptoms || 'None'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${sourceLabel === 'Admin' ? 'bg-purple-100 text-purple-700' : sourceLabel === 'Quick Reserve' ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-[#008080]'}`}>
                                {sourceLabel}
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
              <h2 className="text-xl font-black text-slate-900 mb-4">Book Appointment</h2>
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
                      <label className="text-xs font-bold text-slate-700">Specialization <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={adminBooking.specialization}
                        onChange={e => {
                          setAdminBooking({...adminBooking, specialization: e.target.value, doctor_id: '', booking_date: ''})
                          setSelectedAdminDoctor(null)
                          setAvailableDatesForAdminDoc([])
                        }}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
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
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
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
                      <p className="font-bold text-slate-900 text-sm">{selectedAdminDoctor.name}</p>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Patient Name <span className="text-rose-500">*</span></label>
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
                      <label className="text-xs font-bold text-slate-700">Phone Number <span className="text-rose-500">*</span></label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={11}
                        value={adminBooking.phone}
                        onChange={e => setAdminBooking({...adminBooking, phone: e.target.value.replace(/\D/g, '')})}
                        placeholder="11 Digit Mobile Number" 
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
                        onChange={e => setAdminBooking({...adminBooking, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
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
                  </div>

                  <button 
                    type="submit" 
                    disabled={isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-md ${isAdminDoctorAbsent || availableDatesForAdminDoc.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#008080] hover:bg-[#006666] text-white'}`}
                  >
                    Confirm Appointment
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
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-4 font-bold">✓</div>
                  <h3 className="text-xl font-bold text-slate-900">Emergency Slot Confirmed!</h3>
                  <button onClick={() => setQuickSubmitted(false)} className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-sm font-semibold">
                    Reserve Another
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {['NICU', 'PICU', 'ICU', 'General', 'OPD'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setQuickReserveType(type)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${quickReserveType === type ? 'bg-[#008080] text-white border-[#008080] shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAdminQuickSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Patient Name <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          required 
                          value={quickForm.name} 
                          onChange={e => setQuickForm({...quickForm, name: e.target.value})}
                          placeholder="Patient Full Name" 
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">Age</label>
                        <input 
                          type="number" 
                          value={quickForm.age} 
                          onChange={e => setQuickForm({...quickForm, age: e.target.value})}
                          placeholder="Age" 
                          className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
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
                        className="w-full border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md mt-2"
                    >
                      Confirm Quick Reservation
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lab-reports' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Diagnostic Lab & Reports ({filteredLabReports.length})</h2>
                  <p className="text-xs text-slate-500">Create, upload PDF/Image reports, send SMS notifications, and print official diagnostic slips</p>
                </div>
                <button 
                  onClick={() => { resetLabForm(); setIsLabModalOpen(true) }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm flex items-center gap-2"
                >
                  <span>+</span> Create / Upload Lab Report
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

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Search by Bill / Invoice No, Patient Name or Phone</label>
                  <input 
                    type="text"
                    value={labSearchQuery}
                    onChange={e => setLabSearchQuery(e.target.value)}
                    placeholder="Search by Bill No, Patient Name, or Phone..."
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="w-44">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Report Status</label>
                  <select 
                    value={labFilterStatus}
                    onChange={e => setLabFilterStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white font-semibold"
                  >
                    <option value="All">All Status</option>
                    <option value="Ready">Ready</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>

              {filteredLabReports.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-3xl mb-2">📄</div>
                  <h4 className="text-sm font-bold text-slate-800">No Lab Reports Found</h4>
                  <p className="text-xs text-slate-500 mt-1">Click "+ Create / Upload Lab Report" to add a new patient diagnostic report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-xs font-bold text-slate-600 bg-slate-50">
                        <th className="p-3">Bill / Invoice No</th>
                        <th className="p-3">Patient Info</th>
                        <th className="p-3">Test / Investigation</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Report File</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {filteredLabReports.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-black text-[#008080] text-xs">{rep.invoice_no}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{rep.patient_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{rep.phone} • {rep.age ? `${rep.age}Y` : ''} ({rep.gender})</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{rep.test_name}</div>
                            <div className="text-[11px] text-slate-500">Ref: {rep.referred_by || 'Self'}</div>
                          </td>
                          <td className="p-3 text-xs text-slate-600">{rep.test_date}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rep.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                              {rep.payment_status} ({rep.amount})
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            {rep.file_url ? (
                              <a 
                                href={rep.file_url} 
                                download={rep.file_name || `${rep.invoice_no}-report`}
                                className="text-[#008080] font-bold hover:underline flex items-center gap-1"
                              >
                                📎 Download File
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Text Report</span>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleLabStatus(rep)}
                              title="Click to toggle Ready / Processing"
                              className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition ${rep.delivery_status === 'Ready' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                            >
                              {rep.delivery_status === 'Ready' ? '✅ Ready' : '⏳ Processing'}
                            </button>
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button 
                              onClick={() => printSingleLabReport(rep)}
                              className="bg-teal-50 hover:bg-teal-100 text-[#008080] px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                              title="Print Official Lab Report"
                            >
                              🖨️ Print
                            </button>
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

      {/* Lab Report Modal (Completely Blank Bill / Invoice No Input without any example numbers) */}
      {isLabModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsLabModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            <h3 className="text-xl font-black text-slate-900 mb-1">{isLabEditMode ? 'Edit Diagnostic Lab Report' : 'Create / Upload New Lab Report'}</h3>
            <p className="text-xs text-slate-500 mb-4">Patients can immediately download Ready reports from the website using their Bill / Invoice Number or Phone Number.</p>

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

              <div>
                <label className="text-xs font-bold text-slate-700">Test Findings / Result Summary (Printed on Official Slip)</label>
                <textarea 
                  rows={4}
                  value={labForm.report_summary}
                  onChange={e => setLabForm({...labForm, report_summary: e.target.value})}
                  placeholder="Enter test values, parameters, or clinical remarks..."
                  className="w-full border rounded-xl p-3 text-xs mt-1 font-mono outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">Upload Scanned Report PDF or Image (Optional)</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={handleLabFileUpload}
                  className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#008080] file:text-white hover:file:bg-[#006666] cursor-pointer"
                />
                {labForm.file_name && (
                  <p className="text-xs text-emerald-700 font-bold mt-2">
                    📎 Attached: {labForm.file_name}
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
                {savingLab ? 'Saving Report...' : isLabEditMode ? 'Update Lab Report' : 'Publish Lab Report to Website'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            <h3 className="text-xl font-black text-slate-900 mb-1">{isEditMode ? 'Edit Doctor & Schedule' : 'Add New Doctor'}</h3>
            
            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor Name *</label>
                  <input type="text" required value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} placeholder="Dr. Name" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Doctor No (ID)</label>
                  <input type="text" value={docForm.doctor_no} onChange={e => setDocForm({...docForm, doctor_no: e.target.value})} placeholder="ID" className="w-full border rounded-xl px-3 py-2 text-sm mt-1 bg-slate-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Branch / Workplace</label>
                  <input type="text" value={docForm.branch} onChange={e => setDocForm({...docForm, branch: e.target.value})} placeholder="Delta Health Care" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Follow Up Fee</label>
                  <input type="text" value={docForm.follow_up_fee} onChange={e => setDocForm({...docForm, follow_up_fee: e.target.value})} placeholder="Fee" className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-14 h-14 rounded-full object-cover border bg-white" 
                  />
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#008080] file:text-white hover:file:bg-[#006666] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-xs font-extrabold text-slate-800 block mb-2">Available Days & Time Slots</label>
                <div className="space-y-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border">
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