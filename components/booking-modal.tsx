"use client"

import { useEffect, useId, useState } from "react"
import { CheckCircle2, Loader2, X, Calendar as CalendarIcon, User, Phone, AlertCircle, Download } from "lucide-react"
import type { Doctor } from "@/lib/doctors"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

function getUpcomingDays(doctor: Doctor) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  const availableDays = doctor.schedule.flatMap((s) => s.days)
  const upcoming = []

  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    
    const dayName = daysOfWeek[d.getDay()]
    const fullDayName = fullDays[d.getDay()]
    const dateNum = d.getDate()
    const suffix = (dateNum % 10 === 1 && dateNum !== 11) ? 'st' : (dateNum % 10 === 2 && dateNum !== 12) ? 'nd' : (dateNum % 10 === 3 && dateNum !== 13) ? 'rd' : 'th'
    const year = d.getFullYear().toString().slice(2)

    upcoming.push({
      label: `${fullDayName} ${dateNum}${suffix} ${months[d.getMonth()]} ${year}`,
      dbDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      isAvailable: availableDays.includes(dayName)
    })
  }
  return upcoming
}

export function BookingModal({ doctor, open, onClose }: { doctor: Doctor | null, open: boolean, onClose: () => void }) {
  const titleId = useId()
  
  const [upcomingDays, setUpcomingDays] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [phone, setPhone] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [serialNumber, setSerialNumber] = useState<number | null>(null)

  useEffect(() => {
    if (open && doctor) {
      const days = getUpcomingDays(doctor)
      setUpcomingDays(days)
      const firstAvailable = days.find(d => d.isAvailable)
      setSelectedDate(firstAvailable ? firstAvailable.dbDate : "")
      
      setName("")
      setAge("")
      setPhone("")
      setSymptoms("")
      setSubmitted(false)
      setSubmitting(false)
      setError("")
      setSerialNumber(null)
    }
  }, [open, doctor])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open || !doctor) return null

  const isPhoneValid = phone.trim().length === 11 && /^\d+$/.test(phone.trim())
  const canSubmit = name.trim() && age.trim() && isPhoneValid && selectedDate !== "" && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setError("")
    setSubmitting(true)

    try {
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("phone", phone.trim())
        .eq("booking_date", selectedDate)
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error("You already have an appointment on this date.")
      }

      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctor?.id)
        .eq("booking_date", selectedDate)

      const nextSerial = (count ?? 0) + 1

      const { error: insertError } = await supabase.from("bookings").insert({
        patient_name: name.trim(),
        phone: phone.trim(),
        age: age.trim(),
        symptoms: symptoms.trim(),
        doctor_id: doctor?.id,
        booking_date: selectedDate,
        serial_number: nextSerial,
      })

      if (insertError) throw insertError

      const appointmentTime = doctor.schedule?.[0]?.time || 'Evening'
      try {
        await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.trim(),
            name: name.trim(),
            serial: nextSerial,
            date: selectedDate,
            time: appointmentTime,
            doctorName: doctor.name
          })
        })
      } catch (smsErr) {
        console.error("Failed to trigger SMS:", smsErr)
      }

      setSerialNumber(nextSerial)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Could not complete booking.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadSlip = () => {
    const printContent = document.getElementById('printable-slip');
    if (!printContent) return;
    
    const WindowPrt = window.open('', '', 'left=0,top=0,width=650,height=750');
    WindowPrt?.document.write(`
      <html>
        <head>
          <title>Appointment Slip - Pulse Specialised Hospital</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; }
            .slip-container { max-width: 450px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .hospital-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .hospital-name { font-size: 20px; font-weight: 800; color: #2563eb; margin: 0 0 4px 0; letter-spacing: 0.5px; }
            .hospital-sub { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin: 0; }
            .success-badge { text-align: center; margin-bottom: 15px; }
            .success-title { font-size: 18px; font-weight: 700; color: #16a34a; margin: 5px 0; }
            .serial-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed #3b82f6; padding: 12px; border-radius: 12px; text-align: center; margin-bottom: 20px; }
            .serial-label { font-size: 11px; text-transform: uppercase; color: #1e40af; font-weight: 700; display: block; }
            .serial-number { font-size: 32px; font-weight: 900; color: #1d4ed8; margin-top: 2px; }
            .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
            .label { color: #64748b; font-weight: 500; width: 40%; }
            .val { color: #0f172a; font-weight: 600; text-align: right; width: 60%; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="hospital-header">
              <h2 class="hospital-name">PULSE SPECIALISED HOSPITAL</h2>
              <p class="hospital-sub">Official Appointment Slip</p>
            </div>
            
            <div class="success-badge">
              <h3 class="success-title">✓ Booking Confirmed</h3>
            </div>

            <div class="serial-box">
              <span class="serial-label">Serial Number</span>
              <div class="serial-number">#${String(serialNumber).padStart(2, '0')}</div>
            </div>

            <table class="info-table">
              <tr>
                <td class="label">Patient Name:</td>
                <td class="val">${name} (Age: ${age})</td>
              </tr>
              <tr>
                <td class="label">Phone Number:</td>
                <td class="val">${phone}</td>
              </tr>
              <tr>
                <td class="label">Doctor Name:</td>
                <td class="val">${doctor.name}</td>
              </tr>
              <tr>
                <td class="label">Room / Chamber:</td>
                <td class="val">Room ${doctor.room || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Date & Time:</td>
                <td class="val">${selectedDate} (${doctor.schedule?.[0]?.time || 'Evening'})</td>
              </tr>
              <tr>
                <td class="label" style="border-bottom:none;">Consultation Fee:</td>
                <td class="val" style="border-bottom:none; color: #059669; font-weight: 700;">৳${doctor.fee || '800'}</td>
              </tr>
            </table>

            <div class="footer-note">
              Please report to the hospital counter 15 minutes prior to schedule.<br>Thank you for choosing Pulse Specialised Hospital.
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 400);
          </script>
        </body>
      </html>
    `);
    WindowPrt?.document.close();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6 backdrop-blur-sm pt-20">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
          
          <div className="relative bg-blue-600 px-6 py-5 text-white flex-shrink-0">
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 rounded-full p-2 bg-black/20 hover:bg-black/40 transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <h2 id={titleId} className="mt-1 text-xl font-bold pr-10">{doctor.name}</h2>
            <p className="text-sm text-blue-100">{doctor.title}</p>
            <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded-md font-semibold text-sm">
              Consultation Fee: ৳{doctor.fee || '800'}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {submitted ? (
              <div id="printable-slip" className="px-6 py-8 text-center space-y-4 bg-white">
                <CheckCircle2 className="mx-auto size-14 text-green-500 mb-2" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h3>
                  <p className="text-sm text-gray-500 mt-1">Your serial number for the selected date is:</p>
                </div>

                <div className="inline-block bg-blue-50 border border-blue-200 px-6 py-2 rounded-xl">
                  <span className="text-3xl font-black text-blue-600">#{String(serialNumber).padStart(2, '0')}</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 text-sm border border-gray-200 w-full max-w-sm mx-auto">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">Serial No:</span>
                    <span className="font-bold text-blue-600">#{String(serialNumber).padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Patient Name:</span>
                    <span className="font-medium text-gray-800">{name} (Age: {age})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-gray-800">{phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Doctor Name:</span>
                    <span className="font-medium text-gray-800">{doctor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room No:</span>
                    <span className="font-bold text-gray-800">Room {doctor.room || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date & Time:</span>
                    <span className="font-medium text-gray-800">{selectedDate} ({doctor.schedule?.[0]?.time || 'Evening'})</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span className="text-gray-500">Payable Amount:</span>
                    <span className="text-emerald-600">৳{doctor.fee || '800'}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 max-w-sm mx-auto w-full">
                  <button 
                    onClick={handleDownloadSlip} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-sm text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="size-4" /> Download
                  </button>
                  <Button className="px-6 rounded-xl h-11 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={onClose}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 text-gray-800">
                
                <div className="mb-6">
                  <label className="text-sm font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                    <CalendarIcon className="size-4" /> Select Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {upcomingDays.map((day) => {
                      const isSelected = selectedDate === day.dbDate;
                      
                      if (!day.isAvailable) {
                        return (
                          <div key={day.dbDate} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-400 cursor-not-allowed">
                            <div className="size-4 rounded-full bg-red-200 border-2 border-white shadow-sm"></div>
                            <span className="text-sm font-medium">{day.label} (Not available)</span>
                          </div>
                        )
                      }
                      
                      return (
                        <button
                          key={day.dbDate}
                          type="button"
                          onClick={() => setSelectedDate(day.dbDate)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-600 text-white shadow-md' 
                              : 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="size-5 text-white" />
                          ) : (
                            <div className="size-4 rounded-full bg-green-300 border-2 border-white shadow-sm ml-0.5"></div>
                          )}
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Patient Name <span className="text-red-500">*</span></span>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-12 w-full rounded-lg border px-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase text-gray-500">Age <span className="text-red-500">*</span></span>
                    <input required type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 34" className="h-12 rounded-lg border px-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase text-gray-500">Phone (11 Digits) <span className="text-red-500">*</span></span>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <input required type="tel" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="h-12 w-full rounded-lg border px-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </div>
                    {phone.length > 0 && phone.length < 11 && <span className="text-[10px] text-red-500">Must be exactly 11 digits</span>}
                  </label>

                  <label className="flex flex-col gap-1.5 sm:col-span-2 mt-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Describe your symptoms</span>
                    <textarea rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Fever, headache, etc." className="rounded-lg border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" />
                  </label>
                </div>

                {error && <div className="mt-4 p-3 rounded-lg bg-red-50 text-sm text-red-600 border border-red-100 flex gap-2 items-center text-left"> <AlertCircle className="size-4 shrink-0" /> {error}</div>}

                <Button type="submit" disabled={!canSubmit} className="mt-6 w-full h-12 rounded-lg text-lg font-bold bg-pink-600 hover:bg-pink-700 text-white transition-colors">
                  {submitting ? <Loader2 className="animate-spin size-5 mr-2" /> : "SUBMIT"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}