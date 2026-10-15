"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickReserveOpen, setIsQuickReserveOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false)
  
  const [quickReserveType, setQuickReserveType] = useState('NICU')
  const [quickForm, setQuickForm] = useState({ name: '', age: '', contact: '' })
  const [quickSubmitted, setQuickSubmitted] = useState(false)

  const [reportInvoice, setReportInvoice] = useState('')
  const [reportResult, setReportResult] = useState<any>(null)
  const [labReportList, setLabReportList] = useState<any[]>([])
  const [searchingReport, setSearchingReport] = useState(false)
  const [reportSearched, setReportSearched] = useState(false)

  const [submitted, setSubmitted] = useState(false)
  const [bookedData, setBookedData] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedDept, setSelectedDept] = useState("All")

  const [doctors, setDoctors] = useState<any[]>(sharedDoctors)

  const handleSecretAdminAccess = () => {
    router.push('/admin')
  }

  const getTodayBDDate = () => {
    const now = new Date()
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }))
    const year = bdTime.getFullYear()
    const month = String(bdTime.getMonth() + 1).padStart(2, '0')
    const day = String(bdTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

  const syncLiveDoctorsWithDatabase = useCallback(async () => {
    try {
      const todayStr = getTodayBDDate()
      await supabase.from('bookings').delete().lt('booking_date', todayStr)

      const { data: dbData } = await supabase.from('doctors').select('*').order('id', { ascending: true })
      const dbList = dbData || []

      if (dbList.length > 0) {
        const syncedList = dbList.map((dbDoc: any, index: number) => {
          const fallbackDoc = sharedDoctors.find(
            (s: any) => s.doctor_no?.toString() === dbDoc.doctor_no?.toString() || s.name?.toLowerCase().trim() === dbDoc.name?.toLowerCase().trim()
          )
          const parsedDays = parseDoctorDaysArray(dbDoc.days, fallbackDoc?.days || ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'])

          return {
            ...fallbackDoc,
            ...dbDoc,
            id: dbDoc.id || fallbackDoc?.id || String(index + 1),
            doctor_no: dbDoc.doctor_no || fallbackDoc?.doctor_no || String(index + 1),
            name: dbDoc.name || fallbackDoc?.name,
            degree: dbDoc.degree || fallbackDoc?.degree || '',
            details: dbDoc.details || fallbackDoc?.details || 'Specialist Consultant',
            branch: dbDoc.branch || fallbackDoc?.branch || 'Delta Health Care',
            specialization: dbDoc.specialization || fallbackDoc?.specialization || 'Medicine',
            fee: dbDoc.follow_up_fee || dbDoc.fee || fallbackDoc?.fee || '600 BDT',
            follow_up_fee: dbDoc.follow_up_fee || dbDoc.fee || fallbackDoc?.fee || '600 BDT',
            days: parsedDays,
            sitting_hours: dbDoc.sitting_hours || fallbackDoc?.sitting_hours || '04:00 PM - 08:00 PM',
            image_url: dbDoc.image_url || fallbackDoc?.image_url || '/doctors/doctor-1.png',
            status: dbDoc.status || fallbackDoc?.status || 'Present'
          }
        })
        setDoctors(syncedList)
      } else {
        setDoctors(sharedDoctors)
      }
    } catch (err) {
      console.error('Doctor sync error:', err)
      setDoctors(sharedDoctors)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    syncLiveDoctorsWithDatabase()

    const channel = supabase
      .channel('realtime_doctors_listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
        syncLiveDoctorsWithDatabase()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [syncLiveDoctorsWithDatabase])

  const getDeptEmoji = (dept: string) => {
    switch (dept) {
      case "Gynae & Obs.": return "🤰";
      case "Medicine": return "💊";
      case "Cardiology": return "❤️";
      case "ENT": return "👂";
      case "Orthopedic": return "🦴";
      case "Neonatal": case "Neonatal / Pediatric Neurology": return "👶";
      case "General Surgery": return "🔪";
      case "Dental / Oral Implantology": return "🦷";
      case "Dermatology": return "✨";
      case "Urology": return "💧";
      case "Nephrology": return "🫘";
      case "Physiotherapy": return "💪";
      case "Neuro Medicine": return "🧠";
      case "Gastroenterology": return "🧬";
      case "Vascular Surgery": return "❤️‍🩹";
      case "Hematology": return "🩸";
      default: return "🩺";
    }
  }

  const getSpecializationWithIconText = (spec: string) => {
    return `${getDeptEmoji(spec)} ${spec}`;
  }

  const getDoctorBadge = (days: any, status: string) => {
    if (status === 'Absent') {
      return <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow z-10">Absent</span>
    }

    const cleanDays = parseDoctorDaysArray(days).map(d => d.toLowerCase())
    const todayObj = new Date()
    const tomorrowObj = new Date()
    tomorrowObj.setDate(todayObj.getDate() + 1)
    const todayName = todayObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const tomorrowName = tomorrowObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    if (cleanDays.some(d => d.includes(todayName) || todayName.includes(d))) {
      return <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow z-10">Today</span>
    } else if (cleanDays.some(d => d.includes(tomorrowName) || tomorrowName.includes(d))) {
      return <span className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow z-10">Tomorrow</span>
    }
    return null
  }

  const baseDepartments = [
    "All", "Gynae & Obs.", "Cardiology", "Neonatal", "Medicine", "Neuro Medicine", 
    "Gastroenterology", "Orthopedic", "ENT", "General Surgery", "Nephrology", 
    "Hematology", "Dermatology", "Physiotherapy", "Dental / Oral Implantology", "Urology", "Vascular Surgery"
  ]
  const dynamicSpecs = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))
  const departments = Array.from(new Set([...baseDepartments, ...dynamicSpecs]))

  const filteredDoctorsByDept = selectedDept === "All" 
    ? doctors 
    : doctors.filter(d => (d.specialization || '').trim().toLowerCase() === selectedDept.trim().toLowerCase())

  const [currentSlide, setCurrentSlide] = useState(0)
  const heroSlides = [
    { title: "Book Doctor Appointments Hassle-Free", desc: "Find the right doctor and schedule appointments in just a few clicks with expert specialists.", image: "/doctors/doctor-1.png", bgGradient: "from-[#e6f4f4] to-[#f0f9f9]", border: "border-teal-100" },
    { title: "Book Doctor Appointments Hassle-Free", desc: "Find the right doctor and schedule appointments in just a few clicks with expert specialists.", image: "/doctors/doctor-2.png", bgGradient: "from-[#e6f4f4] to-[#f0f9f9]", border: "border-teal-100" },
    { title: "Book Doctor Appointments Hassle-Free", desc: "Find the right doctor and schedule appointments in just a few clicks with expert specialists.", image: "/doctors/doctor-5.png", bgGradient: "from-[#e6f4f4] to-[#f0f9f9]", border: "border-teal-100" },
    { title: "Book Doctor Appointments Hassle-Free", desc: "Find the right doctor and schedule appointments in just a few clicks with expert specialists.", image: "/doctors/doctor-6.png", bgGradient: "from-[#e6f4f4] to-[#f0f9f9]", border: "border-teal-100" }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollLeft = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: -280, behavior: 'smooth' }) }
  const scrollRight = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: 280, behavior: 'smooth' }) }

  const getTop3AvailableDates = (doctorDays: any) => {
    const list = []
    const today = new Date()
    const cleanDays = parseDoctorDaysArray(doctorDays).map(d => d.toLowerCase())
    for (let i = 0; i < 60; i++) {
      if (list.length >= 3) break;
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

  const [formData, setFormData] = useState({
    name: '', phone: '', specialization: '', doctor_id: '', booking_date: '', age: '', patient_type: 'New', note: ''
  })

  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [isDoctorAbsent, setIsDoctorAbsent] = useState(false)
  const [availableDatesForDoc, setAvailableDatesForDoc] = useState<any[]>([])

  const specializations = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))
  const filteredDoctors = formData.specialization ? doctors.filter(d => d.specialization === formData.specialization) : doctors

  const handleDoctorChange = (docId: string) => {
    setFormData(prev => ({ ...prev, doctor_id: docId }))
    const doc = doctors.find(d => d.id?.toString() === docId || d.doctor_no?.toString() === docId)
    if (doc) {
      setSelectedDoctor(doc)
      const validDates = getTop3AvailableDates(doc.days)
      setAvailableDatesForDoc(validDates)
      const absentStatus = doc.status === 'Absent' || validDates.length === 0
      setIsDoctorAbsent(absentStatus)
      if (validDates.length > 0 && doc.status !== 'Absent') {
        setFormData(prev => ({ ...prev, booking_date: validDates[0].dateStr }))
      } else {
        setFormData(prev => ({ ...prev, booking_date: '' }))
      }
    } else {
      setSelectedDoctor(null)
      setAvailableDatesForDoc([])
      setIsDoctorAbsent(false)
    }
  }

  const handleCardClick = (doc: any) => {
    const validDates = getTop3AvailableDates(doc.days)
    setAvailableDatesForDoc(validDates)
    const absentStatus = doc.status === 'Absent' || validDates.length === 0
    setIsDoctorAbsent(absentStatus)
    setFormData({
      name: '', 
      phone: '', 
      specialization: doc.specialization || '', 
      doctor_id: doc.id?.toString(), 
      booking_date: (!absentStatus && validDates.length > 0) ? validDates[0].dateStr : '', 
      age: '', 
      patient_type: 'New', 
      note: ''
    })
    setSelectedDoctor(doc)
    setSubmitted(false)
    setBookedData(null)
    setIsModalOpen(true)
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.phone.length !== 11) { alert('Phone number must be exactly 11 digits.'); return; }
    if (isDoctorAbsent || selectedDoctor?.status === 'Absent' || availableDatesForDoc.length === 0) { 
      alert('Selected doctor is currently Absent or unavailable for appointment.'); 
      return; 
    }

    try {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', selectedDoctor.id.toString())
        .eq('booking_date', formData.booking_date)

      const nextSerial = (count || 0) + 1
      const serialNumStr = `#${nextSerial}`

      const { error } = await supabase.from('bookings').insert({
        patient_name: formData.name,
        phone: formData.phone,
        doctor_id: selectedDoctor.id.toString(),
        booking_date: formData.booking_date,
        age: formData.age ? parseInt(formData.age) : null,
        patient_type: 'Online',
        symptoms: formData.note || '',
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
            to: `88${formData.phone}`,
            message: `Delta Health Care Jatrabari Ltd.\nDear ${formData.name}, your appointment with ${selectedDoctor.name} on ${formData.booking_date} (${selectedDoctor.sitting_hours}) is confirmed. Serial: ${serialNumStr}. Fee: ${selectedDoctor.fee || selectedDoctor.follow_up_fee || '500 BDT'}.\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
            sender_id: '8809666720320',
            type: 'transactional'
          })
        });
      } catch (smsError) {
        console.error("SMS Error:", smsError);
      }

      const newBooking = {
        ...formData,
        doctorName: selectedDoctor.name,
        doctorDegree: selectedDoctor.degree,
        fee: selectedDoctor.fee || selectedDoctor.follow_up_fee || "500 BDT",
        serialNo: serialNumStr,
        bookingTime: new Date().toLocaleString()
      }
      setBookedData(newBooking)
      setSubmitted(true)
    } catch (err: any) {
      alert('Booking save failed: ' + err.message)
    }
  }

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (quickForm.contact.length !== 11) { alert('Contact number must be 11 digits.'); return; }
    
    const serialNumInt = Math.floor(100 + Math.random() * 900)
    const todayStr = getTodayBDDate()

    try {
      await supabase.from('bookings').insert({
        patient_name: quickForm.name,
        phone: quickForm.contact,
        doctor_id: `Emergency-${quickReserveType}`,
        booking_date: todayStr,
        age: quickForm.age ? parseInt(quickForm.age) : null,
        patient_type: 'Emergency',
        symptoms: `Quick Reservation: ${quickReserveType}`,
        serial_number: serialNumInt,
        status: 'Confirmed'
      })

      const customSmsMessage = `Dear Patient/Attendant, your '${quickReserveType}' booking has been successfully confirmed for ${todayStr}. Thank you for choosing Delta Health Care Jatrabari Ltd.For more information Call: 09666720320\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`

      try {
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
        });
      } catch (smsError) {
        console.error("SMS Error:", smsError);
      }

      setQuickSubmitted(true)
    } catch (err: any) {
      alert('Emergency request failed: ' + err.message)
    }
  }

  const handleSearchReports = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = reportInvoice.trim()
    if (!query) {
      alert('Please enter your Invoice Number (e.g. INV-1001), Serial Number, or Phone Number')
      return
    }
    setSearchingReport(true)
    setReportSearched(true)
    setLabReportList([])
    setReportResult(null)

    try {
      const { data: labData } = await supabase
        .from('lab_reports')
        .select('*')
        .or(`invoice_no.ilike.%${query}%,phone.eq.${query}`)
        .order('id', { ascending: false })

      if (labData && labData.length > 0) {
        setLabReportList(labData)
        setReportResult(labData[0])
        return
      }

      const cleanInv = query.replace('#', '').replace('EQ', '')
      const numericSerial = parseInt(cleanInv)
      let bookingQuery = supabase.from('bookings').select('*')

      if (!isNaN(numericSerial) && query.length < 10) {
        bookingQuery = bookingQuery.or(`serial_number.eq.${numericSerial},phone.eq.${query}`)
      } else {
        bookingQuery = bookingQuery.eq('phone', query)
      }

      const { data: bookingData } = await bookingQuery.order('id', { ascending: false }).limit(1)

      if (bookingData && bookingData.length > 0) {
        setReportResult({ ...bookingData[0], is_booking_slip: true })
      } else {
        setReportResult(null)
      }
    } catch (err: any) {
      console.error('Error fetching report:', err)
      setReportResult(null)
    } finally {
      setSearchingReport(false)
    }
  }

  const handlePrintLabReportFromHome = (report: any) => {
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
              <div style="font-size: 16px; font-weight: 900; color: #008080;">${report.invoice_no}</div>
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

  const handlePrintSlip = () => {
    const printContent = document.getElementById("printable-slip");
    if (!printContent) return;
    const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=600');
    WindowPrt?.document.write(`
      <html>
        <head>
          <title>Appointment Slip - Delta Health Care</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; color: #1e293b; background: #fff; }
            .slip-box { max-width: 420px; margin: auto; border: 1.5px solid #008080; border-radius: 12px; padding: 20px; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #008080; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { color: #008080; margin: 0; font-size: 18px; font-weight: 800; }
            .header p { font-size: 11px; color: #64748b; margin: 3px 0 0 0; }
            .serial-box { text-align: center; background: #f0fdf4; border: 1px dashed #10b981; padding: 8px; border-radius: 8px; margin-bottom: 15px; }
            .serial-box span { font-size: 18px; font-weight: 900; color: #047857; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            .label { font-weight: 600; color: #475569; }
            .value { font-weight: 700; color: #0f172a; text-align: right; }
            .footer-note { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="slip-box">
            <div class="header">
              <h2>ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
              <p>Official Appointment Confirmation Slip</p>
            </div>
            <div class="serial-box">
              <span style="font-size: 12px; display: block; color: #065f46;">ASSIGNED SERIAL NUMBER</span>
              <span>${printContent.getAttribute("data-serial")}</span>
            </div>
            ${printContent.innerHTML}
            <div class="footer-note">
              Please bring this slip during your visit. Hotline: 09666720320
            </div>
          </div>
        </body>
      </html>
    `);
    WindowPrt?.document.close();
    WindowPrt?.focus();
    setTimeout(() => {
      WindowPrt?.print();
      WindowPrt?.close();
    }, 400);
  };

  if (!isMounted) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <style jsx>{`
          @keyframes spin3d {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
          }
          .animate-3d-spin {
            animation: spin3d 4s linear infinite;
            transform-style: preserve-3d;
          }
        `}</style>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 flex items-center justify-center p-2 shadow-xl rounded-2xl border border-teal-100 bg-white mb-4">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
          </div>
          <h2 className="text-xs font-extrabold text-[#008080] tracking-wide mt-2 text-center px-4">
            ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-100 flex flex-col justify-between w-full overflow-x-hidden">
      <style jsx>{`
        @keyframes spin3d {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .animate-3d-spin {
          animation: spin3d 6s linear infinite;
          transform-style: preserve-3d;
        }
      `}</style>
      
      <div className="w-full">
        {/* Top Header - Mobile Optimized */}
        <header className="bg-white text-slate-800 py-3 px-3 sm:px-12 flex flex-row justify-between items-center gap-2 border-b border-slate-200 shadow-xs w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-50 rounded-xl p-1 shadow-xs border border-teal-100 flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
            </div>
            
            <div className="flex flex-col justify-center">
              <h2 className="text-[11px] sm:text-sm font-black text-[#007b7b] leading-tight tracking-normal whitespace-nowrap">
                ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড
              </h2>
              <div className="w-full border-b-[1.5px] border-[#007b7b] my-0.5"></div>
              <h1 className="text-[9px] sm:text-xs font-bold text-rose-600 tracking-wider leading-tight whitespace-nowrap">
                DELTA HEALTH CARE JATRABARI LIMITED
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-shrink-0">
            <a href="tel:09666720320" className="flex items-center bg-white border border-[#008080] rounded-full shadow-sm overflow-hidden hover:opacity-95 transition cursor-pointer py-0.5 px-1 sm:px-2">
              <div className="bg-[#008080] text-white w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-xs sm:text-sm flex-shrink-0">
                📞
              </div>
              <div className="px-2 text-left hidden xs:block">
                <span className="text-[9px] text-[#008080] font-black block leading-none">HOTLINE</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 font-mono tracking-tight block">09666720320</span>
              </div>
            </a>
          </div>
        </header>

        {/* Sticky Action Buttons Bar */}
        <div className="sticky top-0 z-40 bg-slate-50/95 border-b border-slate-200 py-2 px-3 sm:px-12 flex items-center justify-between shadow-xs backdrop-blur-md w-full">
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-bold w-full overflow-x-auto scrollbar-hide py-1">
            <a href="#home-service" className="border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition uppercase flex items-center gap-1 shadow-xs cursor-pointer bg-rose-50/50 whitespace-nowrap flex-shrink-0">
              Home Service
            </a>
            
            <button 
              onClick={() => { setQuickSubmitted(false); setQuickForm({ name: '', age: '', contact: '' }); setIsQuickReserveOpen(true); }}
              className="border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition uppercase flex items-center gap-1 shadow-xs cursor-pointer bg-rose-50/50 whitespace-nowrap flex-shrink-0"
            >
              <span>⚡</span> Quick Reserve
            </button>

            <button 
              onClick={() => { setIsReportModalOpen(true); setReportSearched(false); setReportResult(null); setLabReportList([]); setReportInvoice(''); }}
              className="border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition uppercase flex items-center gap-1 shadow-xs cursor-pointer bg-rose-50/50 whitespace-nowrap flex-shrink-0"
            >
              <span>📄</span> Download Report
            </button>

            <button 
              onClick={() => setIsPackageModalOpen(true)}
              className="border border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition uppercase flex items-center gap-1 shadow-xs cursor-pointer bg-rose-50/50 whitespace-nowrap flex-shrink-0"
            >
              <span>📦</span> Package
            </button>
          </div>
        </div>

        {/* Hero Banner Section */}
        <section className="w-full px-3 sm:px-12 py-3 sm:py-6">
          <div className={`w-full bg-gradient-to-r ${heroSlides[currentSlide].bgGradient} rounded-3xl p-4 sm:p-10 flex flex-col md:flex-row items-center justify-between shadow-xs border ${heroSlides[currentSlide].border} relative overflow-hidden transition-all duration-500`}>
            <div className="max-w-xl mb-4 md:mb-0 z-10 text-center md:text-left w-full">
              <h1 className="text-lg sm:text-3xl md:text-5xl font-black text-slate-900 leading-snug">
                Book Doctor Appointments <span className="text-[#008080]">Hassle-Free</span>
              </h1>
              <p className="text-slate-700 mt-2 text-xs sm:text-sm font-medium leading-relaxed">
                {heroSlides[currentSlide].desc}
              </p>
              
              <div className="flex justify-center md:justify-start gap-4 mt-4">
                <button 
                  onClick={() => { 
                    setAvailableDatesForDoc([]);
                    setFormData({ name: '', phone: '', specialization: '', doctor_id: '', booking_date: '', age: '', patient_type: 'New', note: '' });
                    setSelectedDoctor(null);
                    setSubmitted(false); 
                    setBookedData(null);
                    setIsModalOpen(true); 
                  }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-base transition shadow-md active:scale-95 w-full sm:w-auto"
                >
                  Book Appointment Now
                </button>
              </div>
            </div>

            <div className="w-full md:w-auto flex justify-center z-10 mt-3 md:mt-0">
              <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-100 w-[180px] sm:w-[260px] h-[130px] sm:h-[200px] flex items-center justify-center overflow-hidden">
                <img 
                  src={heroSlides[currentSlide].image} 
                  alt="Hospital Banner" 
                  onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                  className="w-full h-full object-cover object-top rounded-xl"
                />
              </div>
            </div>

            <div className="absolute bottom-2 right-4 flex gap-1.5 z-20">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-[#008080] w-4' : 'bg-slate-300 w-1.5'}`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Departments Filter Bar */}
        <section className="w-full px-3 sm:px-12 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5 w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {departments.map((dept, idx) => (
              <button
                key={`dept-${idx}`}
                onClick={() => setSelectedDept(dept)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs flex-shrink-0 ${selectedDept === dept ? 'bg-[#008080] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <span>{getDeptEmoji(dept)}</span>
                <span>{dept}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Doctors List Grid Section - Fully Mobile Optimized */}
        <section id="doctors" className="w-full px-3 sm:px-12 py-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-base sm:text-2xl font-black text-slate-900">
                Our Doctors ({filteredDoctorsByDept.length})
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500">Qualified specialists ready to assist you</p>
            </div>
            <div className="flex gap-1">
              <button onClick={scrollLeft} className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-xs">
                ‹
              </button>
              <button onClick={scrollRight} className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-xs">
                ›
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredDoctorsByDept.map((doc, idx) => (
              <div 
                key={`home-doc-card-${doc.id || doc.doctor_no || idx}-${idx}`} 
                onClick={() => handleCardClick(doc)}
                className="w-[210px] sm:w-[260px] bg-white border border-slate-200 rounded-2xl p-2.5 text-center shadow-xs hover:shadow-md transition snap-start flex-shrink-0 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {getDoctorBadge(doc.days, doc.status)}

                <div className="w-full h-36 sm:h-48 mx-auto rounded-xl bg-slate-50 mb-2.5 overflow-hidden border border-slate-100 flex items-center justify-center relative">
                  <img 
                    src={doc.image_url || `/doctors/doctor-${doc.doctor_no || 1}.png`} 
                    alt={doc.name} 
                    onError={(e: any) => { e.target.src = '/doctors/doctor-1.png'; }}
                    className={`w-full h-full object-cover object-top group-hover:scale-105 transition duration-300 ${doc.status === 'Absent' ? 'grayscale opacity-75' : ''}`}
                  />
                  {doc.status === 'Absent' && (
                    <div className="absolute inset-0 bg-rose-900/30 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-lg">Absent Today</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#e6f4f4]/60 border border-[#008080]/20 rounded-xl p-2 text-left">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{doc.name}</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-semibold line-clamp-1">{doc.degree}</p>
                  
                  <p className="text-[9px] text-slate-500 line-clamp-1 italic mt-0.5">
                    {doc.details || 'Specialist Consultant'}
                  </p>

                  <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-[#008080]/15">
                    <p className="text-[10px] text-[#008080] font-extrabold line-clamp-1">
                      {getSpecializationWithIconText(doc.specialization)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-teal-200">
                      {doc.fee || doc.follow_up_fee || '500 BDT'}
                    </span>
                  </div>

                  <button className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold transition shadow-xs ${doc.status === 'Absent' ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-[#008080] hover:bg-[#006666] text-white'}`}>
                    {doc.status === 'Absent' ? 'Doctor Absent' : 'Make Appointment'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Section - Mobile Optimized */}
      <footer className="bg-[#008080] text-white py-8 px-4 sm:px-12 mt-8 border-t border-teal-700 w-full">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2">
              <div 
                onClick={handleSecretAdminAccess} 
                className="w-9 h-9 flex items-center justify-center bg-white rounded-xl p-1 shadow-xs cursor-pointer" 
                title="Staff Portal Access"
              >
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-white">ডেলটা হেলথ্ কেয়ার যাত্রাবাড়ী লিমিটেড</span>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed font-medium">
              We’re always by your side on your healthcare journey providing trusted services to help you stay healthy.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-bold text-xs sm:text-sm mb-2 text-white">Contact Us</h3>
            <div className="space-y-1.5 text-xs text-teal-100 font-medium">
              <p className="flex items-start justify-center md:justify-start gap-1.5">
                <span>📍</span> <span>169/1-B, West Dholaipar (Opp. Geet Sangeet Cinema Hall)</span>
              </p>
              <p className="flex items-center justify-center md:justify-start gap-1.5">
                <span>📞</span> <a href="tel:09666720320" className="font-mono font-bold text-white hover:underline">09666720320</a>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-bold text-xs sm:text-sm mb-2 text-white">Quick Links</h3>
            <div className="flex gap-2 justify-center md:justify-start">
              <a href="https://www.facebook.com/deltahealthcarejatrabarilimited/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-xs hover:bg-slate-100 transition text-xs">f</a>
              <a href="#" className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-xs hover:bg-slate-100 transition text-xs">t</a>
              <a href="#" className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-xs hover:bg-slate-100 transition text-xs">w</a>
              <a href="#" className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-xs hover:bg-slate-100 transition text-xs">in</a>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-teal-700/80 mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-teal-100 font-medium text-center">
          <p>© 2026 Delta Health Care Jatrabari Limited. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 bg-white/10 px-3 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-white mr-1">Pay with:</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[9px]">bKash</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[9px]">Nagad</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[9px]">SSLCOMMERZ</span>
          </div>
        </div>
      </footer>

      {/* Lab Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button 
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-teal-50 text-[#008080] rounded-full flex items-center justify-center mx-auto text-base mb-1.5 border border-teal-100">📄</div>
              <h3 className="text-base font-black text-slate-900">Download Diagnostic Lab Report</h3>
              <p className="text-[11px] text-slate-500">Enter Invoice ID (INV-1001) or Phone Number</p>
            </div>

            <form onSubmit={handleSearchReports} className="space-y-3 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Invoice ID / Phone Number *</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="text"
                    required
                    value={reportInvoice}
                    onChange={e => setReportInvoice(e.target.value)}
                    placeholder="INV-1001 or 017XXXXXXXX"
                    className="flex-1 border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button 
                    type="submit"
                    disabled={searchingReport}
                    className="bg-[#008080] hover:bg-[#006666] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:bg-slate-300"
                  >
                    {searchingReport ? 'Searching...' : 'Find'}
                  </button>
                </div>
              </div>
            </form>

            {reportSearched && (
              <div className="border-t pt-3">
                {labReportList.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {labReportList.map((rep) => (
                      <div key={rep.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center border-b pb-1.5">
                          <span className="font-mono font-black text-xs text-[#008080]">{rep.invoice_no}</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[9px] ${rep.delivery_status === 'Ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {rep.delivery_status === 'Ready' ? '✅ Ready' : '⏳ Processing'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-slate-500">Patient:</span>
                          <span className="font-bold text-slate-900">{rep.patient_name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-slate-500">Test:</span>
                          <span className="font-bold text-[#008080]">{rep.test_name}</span>
                        </div>
                        {rep.delivery_status === 'Ready' ? (
                          <div className="pt-1.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintLabReportFromHome(rep)}
                              className="flex-1 bg-[#008080] hover:bg-[#006666] text-white py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-center shadow-xs"
                            >
                              🖨️ Print / PDF
                            </button>
                            {rep.file_url && (
                              <a
                                href={rep.file_url}
                                download={rep.file_name || `${rep.invoice_no}-report`}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2 rounded-lg font-bold text-[11px] transition text-center shadow-xs"
                              >
                                📥 File
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded text-[10px] font-semibold text-center mt-1">
                            ⏳ Report is processing in lab.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : reportResult && reportResult.is_booking_slip ? (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Patient Name:</span>
                      <span className="font-bold text-slate-900">{reportResult.patient_name}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Serial:</span>
                      <span className="font-mono font-bold text-[#008080]">#{reportResult.serial_number}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-bold text-slate-900">{reportResult.booking_date}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-semibold">No lab report found with this ID or phone.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsPackageModalOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-base bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center">✕</button>
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-base mb-1.5 border border-rose-100">📦</div>
              <h3 className="text-base font-black text-slate-900">Health Checkup Packages</h3>
              <p className="text-[11px] text-slate-500">Special discounted screening packages</p>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-xs">General Health Package</p>
                  <p className="text-slate-500 text-[10px]">CBC, RBS, SGPT, Creatinine</p>
                </div>
                <span className="font-extrabold text-[#008080] bg-teal-50 px-2 py-1 rounded text-[11px] border border-teal-200">1,200 BDT</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-xs">Cardiac Wellness Package</p>
                  <p className="text-slate-500 text-[10px]">ECG, Lipid Profile, RBS, X-Ray</p>
                </div>
                <span className="font-extrabold text-[#008080] bg-teal-50 px-2 py-1 rounded text-[11px] border border-teal-200">2,500 BDT</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-xs">Diabetes Comprehensive Package</p>
                  <p className="text-slate-500 text-[10px]">HbA1c, FBS, Urine R/E, Lipid</p>
                </div>
                <span className="font-extrabold text-[#008080] bg-teal-50 px-2 py-1 rounded text-[11px] border border-teal-200">1,800 BDT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reserve Modal */}
      {isQuickReserveOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsQuickReserveOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-base bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center">✕</button>

            {quickSubmitted ? (
              <div className="text-center py-5">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-2.5 font-bold">✓</div>
                <h3 className="text-base font-bold text-slate-900">Emergency Reservation Confirmed!</h3>
                <p className="text-xs text-slate-600 mt-1">Confirmation SMS has been sent to your phone.</p>
                <button onClick={() => setIsQuickReserveOpen(false)} className="mt-4 bg-[#008080] text-white px-5 py-2 rounded-xl text-xs font-bold transition">
                  Back to Home
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-4">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-base mb-1.5 border border-rose-100">🏥</div>
                  <h3 className="text-base font-black text-slate-900">Book Emergency Slot</h3>
                  <p className="text-[11px] text-slate-500">Select service category and provide contact</p>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {['NICU', 'PICU', 'ICU', 'General', 'OPD'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuickReserveType(type)}
                      className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition ${quickReserveType === type ? 'bg-[#008080] text-white border-[#008080]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleQuickSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Patient Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={quickForm.name} 
                        onChange={e => setQuickForm({...quickForm, name: e.target.value})}
                        placeholder="Full Name" 
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input 
                        type="number" 
                        value={quickForm.age} 
                        onChange={e => setQuickForm({...quickForm, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Contact Number *</label>
                    <input 
                      type="tel" 
                      required 
                      maxLength={11}
                      value={quickForm.contact} 
                      onChange={e => setQuickForm({...quickForm, contact: e.target.value.replace(/\D/g, '')})}
                      placeholder="017XXXXXXXX" 
                      className="w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-md mt-1"
                  >
                    Confirm Quick Reservation
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctor Booking Modal - Mobile Optimized */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer z-10 bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            {submitted && bookedData ? (
              <div className="text-center py-3">
                <div className="inline-block bg-[#008080] text-white font-black text-xs px-4 py-1 rounded-full shadow-xs mb-2.5 tracking-wide">
                  Serial: {bookedData.serialNo}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Appointment Request Submitted!</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">Your appointment has been registered successfully.</p>
                
                <div 
                  id="printable-slip" 
                  data-serial={bookedData.serialNo}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 text-left text-xs space-y-2"
                >
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="font-semibold text-slate-600">Patient:</span>
                    <span className="font-bold text-slate-900">{bookedData.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="font-semibold text-slate-600">Phone:</span>
                    <span className="font-mono font-bold text-slate-900">{bookedData.phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="font-semibold text-slate-600">Doctor:</span>
                    <span className="font-bold text-[#008080]">{bookedData.doctorName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="font-semibold text-slate-600">Date:</span>
                    <span className="font-bold text-slate-900">{bookedData.booking_date}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="font-semibold text-slate-600">Serial:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{bookedData.serialNo}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Fee:</span>
                    <span className="font-bold text-slate-900">{bookedData.fee}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={handlePrintSlip}
                    className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>📥</span> Download Printable Slip
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Booking Appointment</h3>
                <form onSubmit={handleBookingSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Specialization *</label>
                      <select 
                        required
                        value={formData.specialization}
                        onChange={e => {
                          setFormData({...formData, specialization: e.target.value, doctor_id: '', booking_date: ''});
                          setSelectedDoctor(null);
                          setAvailableDatesForDoc([]);
                          setIsDoctorAbsent(false);
                        }}
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Specialization</option>
                        {specializations.map((spec: any, idx) => (
                          <option key={idx} value={spec}>{getSpecializationWithIconText(spec)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Select Doctor *</label>
                      <select 
                        required
                        value={formData.doctor_id}
                        onChange={e => handleDoctorChange(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Doctor</option>
                        {filteredDoctors.map((doc, idx) => (
                          <option key={`doc-option-${doc.id || idx}`} value={doc.id}>
                            {doc.name} {doc.status === 'Absent' ? '(🔴 Absent)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedDoctor && (
                    <div className={`border rounded-xl p-2.5 text-xs flex flex-col gap-1 transition ${selectedDoctor.status === 'Absent' ? 'bg-rose-50 border-rose-200' : 'bg-teal-50 border-teal-200 text-slate-800'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 border border-teal-200 relative">
                          <img 
                            src={selectedDoctor.image_url || `/doctors/doctor-${selectedDoctor.doctor_no || 1}.png`} 
                            alt={selectedDoctor.name} 
                            onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-900 text-xs">{selectedDoctor.name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${selectedDoctor.status === 'Absent' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                              {selectedDoctor.status || 'Present'}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] font-semibold">{selectedDoctor.degree}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-slate-200 text-[10px] font-bold text-[#008080]">
                        <span>Days: {parseDoctorDaysArray(selectedDoctor.days).join(', ') || 'Scheduled'}</span>
                        <span>Sitting Hours: {selectedDoctor.sitting_hours}</span>
                        <span className="text-slate-800">Fee: {selectedDoctor.fee || selectedDoctor.follow_up_fee || '500 BDT'}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Select Date (Next 3 Available Days) *</label>
                    {selectedDoctor?.status === 'Absent' ? (
                      <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                        ⚠️ Doctor is ABSENT today.
                      </p>
                    ) : availableDatesForDoc.length === 0 ? (
                      <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                        {selectedDoctor ? "⚠️ No available dates found." : "Select a doctor first."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {availableDatesForDoc.map((item, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setFormData({...formData, booking_date: item.dateStr})}
                            className={`p-2 rounded-xl text-[11px] font-semibold border transition text-center ${formData.booking_date === item.dateStr ? 'bg-[#008080] text-white border-[#008080]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                          >
                            {item.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Your Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Full Name" 
                        className="w-full border rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Your Number *</label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={11}
                        minLength={11}
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                        placeholder="017XXXXXXXX" 
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 mt-1 font-mono" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input 
                        type="number" 
                        value={formData.age} 
                        onChange={e => setFormData({...formData, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Note</label>
                      <input 
                        type="text" 
                        value={formData.note} 
                        onChange={e => setFormData({...formData, note: e.target.value})}
                        placeholder="Add a note..." 
                        className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isDoctorAbsent || selectedDoctor?.status === 'Absent' || availableDatesForDoc.length === 0}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition mt-1 ${isDoctorAbsent || selectedDoctor?.status === 'Absent' || availableDatesForDoc.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#008080] hover:bg-[#006666] text-white'}`}
                  >
                    {selectedDoctor?.status === 'Absent' ? 'Appointment Closed (Absent)' : 'Submit Appointment'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}