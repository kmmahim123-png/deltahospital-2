"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { sharedDoctors } from '@/lib/doctors'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQuickReserveOpen, setIsQuickReserveOpen] = useState(false)
  const [quickReserveType, setQuickReserveType] = useState('NICU')
  const [quickForm, setQuickForm] = useState({ name: '', age: '', contact: '' })
  const [quickSubmitted, setQuickSubmitted] = useState(false)

  const [submitted, setSubmitted] = useState(false)
  const [bookedData, setBookedData] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedDept, setSelectedDept] = useState("All")

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  const doctors = sharedDoctors

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

  const getDoctorBadge = (days: string[]) => {
    const todayObj = new Date()
    const tomorrowObj = new Date()
    tomorrowObj.setDate(todayObj.getDate() + 1)
    const todayName = todayObj.toLocaleDateString('en-US', { weekday: 'long' })
    const tomorrowName = tomorrowObj.toLocaleDateString('en-US', { weekday: 'long' })

    if (days.includes(todayName)) {
      return <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow">Today</span>
    } else if (days.includes(tomorrowName)) {
      return <span className="absolute top-3 left-3 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow">Tomorrow</span>
    }
    return null
  }

  const departments = [
    "All", "Gynae & Obs.", "Cardiology", "Neonatal", "Medicine", "Neuro Medicine", 
    "Gastroenterology", "Orthopedic", "ENT", "General Surgery", "Nephrology", 
    "Hematology", "Dermatology", "Physiotherapy", "Dental / Oral Implantology", "Urology", "Vascular Surgery"
  ]

  const filteredDoctorsByDept = selectedDept === "All" 
    ? doctors 
    : doctors.filter(d => d.specialization.trim().toLowerCase() === selectedDept.trim().toLowerCase())

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
  const scrollLeft = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' }) }
  const scrollRight = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' }) }

  const getTop3AvailableDates = (doctorDays: string[]) => {
    const list = []
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      if (list.length >= 3) break;
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
      if (doctorDays.includes(weekday)) {
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
    const doc = doctors.find(d => d.id.toString() === docId)
    if (doc) {
      setSelectedDoctor(doc)
      const validDates = getTop3AvailableDates(doc.days)
      setAvailableDatesForDoc(validDates)
      if (validDates.length > 0) {
        setFormData(prev => ({ ...prev, booking_date: validDates[0].dateStr }))
        setIsDoctorAbsent(false)
      } else {
        setIsDoctorAbsent(true)
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
    setFormData({
      name: '', phone: '', specialization: doc.specialization || '', doctor_id: doc.id.toString(), booking_date: validDates[0]?.dateStr || '', age: '', patient_type: 'New', note: ''
    })
    setSelectedDoctor(doc)
    setIsDoctorAbsent(validDates.length === 0)
    setSubmitted(false)
    setBookedData(null)
    setIsModalOpen(true)
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.phone.length !== 11) { alert('Phone number must be exactly 11 digits.'); return; }
    if (isDoctorAbsent || availableDatesForDoc.length === 0) { alert('Selected doctor is not available.'); return; }

    const serialNumStr = "#" + String(Math.floor(10 + Math.random() * 90))
    const serialNumInt = parseInt(serialNumStr.replace('#', ''))

    try {
      const { error } = await supabase.from('bookings').insert({
        patient_name: formData.name,
        phone: formData.phone,
        doctor_id: selectedDoctor.id.toString(),
        booking_date: formData.booking_date,
        age: formData.age ? parseInt(formData.age) : null,
        patient_type: formData.patient_type || 'New',
        symptoms: formData.note || '',
        serial_number: serialNumInt,
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
            message: `Delta Health Care Jatrabari Ltd.\nDear ${formData.name}, your appointment with ${selectedDoctor.name} on ${formData.booking_date} (${selectedDoctor.sitting_hours}) is confirmed. Serial: ${serialNumStr}. Fee: 500 Tk.\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
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
        fee: selectedDoctor.fee || "500 Tk",
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
    
    const serialNumStr = "EQ#" + String(Math.floor(100 + Math.random() * 900))
    const serialNumInt = Math.floor(100 + Math.random() * 900)

    try {
      await supabase.from('bookings').insert({
        patient_name: quickForm.name,
        phone: quickForm.contact,
        doctor_id: `Emergency-${quickReserveType}`,
        booking_date: new Date().toISOString().split('T')[0],
        age: quickForm.age ? parseInt(quickForm.age) : null,
        patient_type: 'Emergency',
        symptoms: `Quick Reservation: ${quickReserveType}`,
        serial_number: serialNumInt,
        status: 'Confirmed'
      })

      await fetch('https://client.giosms.com/api/v1/send', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 9|4KjApQNKFOrzY5teFNuZbfOzCKP9Dn4re5aPJfKW219943ad',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: `88${quickForm.contact}`,
          message: `Delta Health Care Jatrabari Ltd.\nDear ${quickForm.name}, your emergency slot (${quickReserveType}) is confirmed. Serial: ${serialNumStr}.\nLocation Map: https://share.google/Gr8O0DTGxw96MwyZp`,
          sender_id: '8809666720320',
          type: 'transactional'
        })
      });

      setQuickSubmitted(true)
    } catch (err: any) {
      alert('Emergency request failed: ' + err.message)
    }
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
              <h2>Delta Health Care Jatrabari Ltd.</h2>
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
          @keyframes slideRightOnly {
            0% { transform: translateX(0); }
            50% { transform: translateX(45px); }
            100% { transform: translateX(0); }
          }
          .animate-slide-right {
            animation: slideRightOnly 3s ease-in-out infinite;
          }
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
          <div className="w-32 h-32 flex items-center justify-center p-2 shadow-xl rounded-2xl border border-teal-100 bg-white animate-slide-right mb-4">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
          </div>
          <h2 className="text-base font-extrabold text-[#008080] tracking-wide mt-2">
            Delta Health Care Jatrabari Ltd.
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-100 flex flex-col justify-between">
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
      <div>
        {/* Normal Header 1st line */}
        <header className="bg-[#008080] text-white py-3.5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl p-1 shadow-md">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
            </div>
            <div>
              <h2 className="text-[11px] font-bold tracking-wide text-white">ডেল্টা হেলথ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
              <h1 className="font-extrabold text-sm sm:text-base text-white">Delta Health Care Jatrabari LTD.</h1>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-xs text-white font-semibold">Emergency Hotline & Doctor Serial</span>
            <a href="tel:09666720320" className="flex items-center gap-2 text-lg sm:text-xl font-black tracking-wider text-white mt-0.5 hover:underline font-mono">
              <span>📞</span> <span>09666720320</span>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a href="/admin" className="bg-white hover:bg-slate-100 text-[#008080] px-6 py-2 rounded-lg font-bold text-sm transition shadow-md">
              Log In
            </a>
          </div>
        </header>

        {/* Sticky 2nd Line (Home Service & Quick Reserve) */}
        <div className="sticky top-0 z-50 bg-slate-100 border-b border-slate-200 py-2.5 px-6 sm:px-12 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
            <a href="#home-service" className="hover:text-[#008080] transition whitespace-nowrap text-xs font-bold bg-transparent border-2 border-slate-400 text-slate-700 hover:border-[#008080] px-5 py-1 rounded-full uppercase tracking-wide">Home Service</a>
            <button 
              onClick={() => { setQuickSubmitted(false); setQuickForm({ name: '', age: '', contact: '' }); setIsQuickReserveOpen(true); }}
              className="bg-transparent border-2 border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white px-5 py-1 rounded-full text-xs font-black shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer uppercase tracking-wide"
            >
              <span>⚡</span> Quick Reserve
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Right side clean */}
          </div>
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className={`bg-gradient-to-r ${heroSlides[currentSlide].bgGradient} rounded-3xl p-8 sm:p-14 flex flex-col md:flex-row items-center justify-between shadow-md border ${heroSlides[currentSlide].border} relative overflow-hidden min-h-[420px] transition-all duration-500`}>
            <div className="max-w-2xl mb-8 md:mb-0 z-10">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                Book Doctor Appointments <span className="text-[#008080]">Hassle-Free</span>
              </h1>
              <p className="text-slate-700 mt-4 text-base sm:text-lg font-medium leading-relaxed">
                {heroSlides[currentSlide].desc}
              </p>
              
              <div className="flex flex-wrap gap-4 mt-8">
                <button 
                  onClick={() => { 
                    setAvailableDatesForDoc([]);
                    setFormData({ name: '', phone: '', specialization: '', doctor_id: '', booking_date: '', age: '', patient_type: 'New', note: '' });
                    setSelectedDoctor(null);
                    setSubmitted(false); 
                    setBookedData(null);
                    setIsModalOpen(true); 
                  }}
                  className="bg-[#008080] hover:bg-[#006666] text-white px-8 py-3.5 rounded-xl font-bold text-base transition shadow-lg active:scale-95"
                >
                  Booking Appointment
                </button>
              </div>
            </div>

            <div className="w-full md:w-auto flex justify-center z-10">
              <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 w-[280px] h-[220px] flex items-center justify-center overflow-hidden">
                <img 
                  src={heroSlides[currentSlide].image} 
                  alt="Hospital Banner" 
                  onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                  className="w-full h-full object-cover object-top rounded-xl transition-all duration-700 transform hover:scale-105"
                />
              </div>
            </div>

            <div className="absolute bottom-5 right-10 flex gap-2 z-20">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-3 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-[#008080] w-8' : 'bg-slate-400 w-3'}`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Department Filter Chips Bar */}
        <section className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {departments.map((dept, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDept(dept)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${selectedDept === dept ? 'bg-[#008080] text-white shadow-md ring-2 ring-[#008080]/30' : 'bg-[#008080]/10 text-[#008080] hover:bg-[#008080]/20'}`}
              >
                <span>{getDeptEmoji(dept)}</span>
                <span>{dept}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Our Doctors Horizontal Scroll Section */}
        <section id="doctors" className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Our Doctors ({filteredDoctorsByDept.length})</h2>
            <div className="flex gap-2">
              <button onClick={scrollLeft} className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-900 font-bold transition text-lg shadow-xs">
                ‹
              </button>
              <button onClick={scrollRight} className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-900 font-bold transition text-lg shadow-xs">
                ›
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredDoctorsByDept.map((doc) => (
              <div 
                key={doc.id} 
                onClick={() => handleCardClick(doc)}
                className="min-w-[260px] sm:min-w-[280px] bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:shadow-lg transition snap-start flex-shrink-0 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {getDoctorBadge(doc.days)}

                <div className="w-full h-56 mx-auto rounded-xl bg-slate-50 mb-3 overflow-hidden border border-slate-100 flex items-center justify-center">
                  <img 
                    src={doc.image_url} 
                    alt={doc.name} 
                    onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-300"
                  />
                </div>

                <div className="bg-[#e6f4f4] border border-[#008080]/30 rounded-xl p-3 text-left">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{doc.name}</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-semibold line-clamp-1">{doc.degree}</p>
                  <p className="text-xs text-[#008080] font-extrabold mt-1">
                    {getSpecializationWithIconText(doc.specialization)}
                  </p>
                  <button className="w-full mt-3 bg-[#008080] hover:bg-[#006666] text-white py-1.5 rounded-lg text-xs font-bold transition">
                    Make Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#008080] text-white py-12 px-6 sm:px-12 mt-16 border-t border-teal-700">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl p-1 shadow-md">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain animate-3d-spin" />
              </div>
              <span className="font-bold text-base text-white">Delta Health Care Jatrabari Ltd.</span>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed font-medium">
              We’re always by your side on your healthcare journey providing trusted services to help you stay healthy.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-base mb-3 text-white">Contact Us</h3>
            <div className="space-y-2 text-xs sm:text-sm text-teal-100 font-medium">
              <p className="flex items-start gap-2">
                <span>📍</span> <span>169/1-B, West Dholaipar (Opposite to Geet Sangeet Cinema Hall)</span>
              </p>
              <p className="flex items-center gap-2">
                <span>📞</span> <a href="tel:09666720320" className="font-mono font-bold text-white hover:underline">09666720320</a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-base mb-3 text-white">Quick Link</h3>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/deltahealthcarejatrabarilimited/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-sm hover:bg-slate-100 transition">f</a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-sm hover:bg-slate-100 transition">t</a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-sm hover:bg-slate-100 transition">w</a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#008080] font-bold shadow-sm hover:bg-slate-100 transition">in</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-teal-700 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-teal-100 font-semibold">
          <p>Copyright © 2026 Delta Health Care Jatrabari Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-xs">
            <span className="text-[11px] font-bold text-white mr-1">Pay with:</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[10px]">SSLCOMMERZ</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[10px]">bKash</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[10px]">Nagad</span>
            <span className="bg-white text-slate-900 px-2 py-0.5 rounded font-bold text-[10px]">Visa / MasterCard</span>
          </div>
          <p className="text-[11px]">Version: BETA 1.0</p>
        </div>
      </footer>

      {/* Quick Reserve Modal */}
      {isQuickReserveOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsQuickReserveOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg z-10 cursor-pointer"
            >
              ✕
            </button>

            {quickSubmitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-3 font-bold">✓</div>
                <h3 className="text-xl font-bold text-slate-900">Emergency Slot Request Received!</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Our customer care team will contact you shortly to confirm your booking. Please be prepared to come to the hospital as soon as possible to secure your reserved seat.
                </p>
                <button onClick={() => setIsQuickReserveOpen(false)} className="mt-6 bg-[#008080] hover:bg-[#006666] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition">
                  Go Home
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-teal-50 text-[#008080] rounded-full flex items-center justify-center mx-auto text-2xl mb-2 border border-teal-200">🏥</div>
                  <h3 className="text-lg font-black text-slate-900">Book an Emergency Slot!</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select service category and provide contact details for priority support.</p>
                </div>

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

                <form onSubmit={handleQuickSubmit} className="space-y-3">
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
                    <label className="text-xs font-bold text-slate-700">Contact where we can reach an attendant <span className="text-rose-500">*</span></label>
                    <input 
                      type="tel" 
                      required 
                      maxLength={11}
                      value={quickForm.contact} 
                      onChange={e => setQuickForm({...quickForm, contact: e.target.value.replace(/\D/g, '')})}
                      placeholder="017XXXXXXXX (11 digits)" 
                      className="w-full border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-md mt-2"
                  >
                    Submit Request
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg z-10 cursor-pointer"
            >
              ✕
            </button>

            {submitted && bookedData ? (
              <div className="text-center py-4">
                <div className="inline-block bg-[#008080] text-white font-black text-sm px-5 py-1.5 rounded-full shadow mb-3 tracking-wide">
                  Serial: {bookedData.serialNo}
                </div>
                <h3 className="text-xl font-bold text-slate-900">Appointment Request Submitted Successfully!</h3>
                <p className="text-xs text-slate-600 mt-1">Your appointment has been registered successfully.</p>
                
                <div 
                  id="printable-slip" 
                  data-serial={bookedData.serialNo}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 text-left text-xs space-y-2.5"
                >
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-slate-600">Patient Name:</span>
                    <span className="font-bold text-slate-900">{bookedData.name} {bookedData.age ? `(Age: ${bookedData.age})` : ''}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-slate-600">Phone:</span>
                    <span className="font-mono font-bold text-slate-900">{bookedData.phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-slate-600">Doctor Name:</span>
                    <span className="font-bold text-[#008080]">{bookedData.doctorName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-slate-600">Appointment Date:</span>
                    <span className="font-bold text-slate-900">{bookedData.booking_date}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-slate-600">Serial No:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{bookedData.serialNo}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Consultation Fee:</span>
                    <span className="font-bold text-slate-900">{bookedData.fee}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={handlePrintSlip}
                    className="w-full bg-[#008080] hover:bg-[#006666] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>📥</span> Download
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Booking Appointment</h3>
                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Specialization <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={formData.specialization}
                        onChange={e => {
                          setFormData({...formData, specialization: e.target.value, doctor_id: '', booking_date: ''});
                          setSelectedDoctor(null);
                          setAvailableDatesForDoc([]);
                        }}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Specialization</option>
                        {specializations.map((spec: any, idx) => (
                          <option key={idx} value={spec}>{getSpecializationWithIconText(spec)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Select Doctor <span className="text-rose-500">*</span></label>
                      <select 
                        required
                        value={formData.doctor_id}
                        onChange={e => handleDoctorChange(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white mt-1"
                      >
                        <option value="">Select Doctor</option>
                        {filteredDoctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} ({doc.specialization})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedDoctor && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-slate-800 flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 border border-teal-200">
                          <img 
                            src={selectedDoctor.image_url} 
                            alt={selectedDoctor.name} 
                            onError={(e: any) => { e.target.src = "/doctors/doctor-1.png"; }}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{selectedDoctor.name}</p>
                          <p className="text-slate-700 font-semibold">{selectedDoctor.degree}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5">{selectedDoctor.details}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1 pt-2 border-t border-teal-200 text-[11px] font-bold text-[#008080]">
                        <span>Days: {selectedDoctor.days.join(', ')}</span>
                        <span>Sitting Hours: {selectedDoctor.sitting_hours}</span>
                      </div>
                      <div className="text-right">
                        <span className="bg-[#008080] text-white px-2 py-0.5 rounded text-[10px] font-extrabold">Fee: {selectedDoctor.fee}</span>
                      </div>
                      {isDoctorAbsent && (
                        <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          ⚠️ No dates found
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Select Date (Next 3 Available Days) <span className="text-rose-500">*</span></label>
                    {availableDatesForDoc.length === 0 ? (
                      <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        {selectedDoctor ? "⚠️ No available dates found for this doctor." : "Please select a doctor first to view available dates."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableDatesForDoc.map((item, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setFormData({...formData, booking_date: item.dateStr})}
                            className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${formData.booking_date === item.dateStr ? 'bg-[#008080] text-white border-[#008080] shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                          >
                            {item.display}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Your Name <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Full Name" 
                        className="w-full border rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Your Number <span className="text-rose-500">*</span></label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={11}
                        minLength={11}
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                        placeholder="017XXXXXXXX (11 digits)" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1 font-mono" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input 
                        type="number" 
                        value={formData.age}
                        onChange={e => setFormData({...formData, age: e.target.value})}
                        placeholder="Age" 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Note</label>
                      <input 
                        type="text" 
                        value={formData.note}
                        onChange={e => setFormData({...formData, note: e.target.value})}
                        placeholder="Add a note..." 
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 mt-1" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isDoctorAbsent || availableDatesForDoc.length === 0}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition mt-2 ${isDoctorAbsent || availableDatesForDoc.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#008080] hover:bg-[#006666] text-white'}`}
                  >
                    {isDoctorAbsent || availableDatesForDoc.length === 0 ? 'Doctor Unavailable' : 'Submit Appointment'}
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