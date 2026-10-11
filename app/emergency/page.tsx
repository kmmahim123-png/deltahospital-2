"use client"

import { useState } from 'react'

export default function CriticalCarePage() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    reason: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.phone.length !== 11) {
      alert('Please enter a valid 11-digit phone number.')
      return
    }
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-[#008080] text-white py-3 px-6 sm:px-12 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl p-1 shadow">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-[10px] font-bold text-white">ডেল্টা হেলথ কেয়ার যাত্রাবাড়ী লিমিটেড</h2>
              <h1 className="font-extrabold text-sm text-white">Delta Health Care Jatrabari LTD.</h1>
            </div>
          </div>
          <a href="/" className="bg-white text-[#008080] px-4 py-1.5 rounded-lg font-bold text-xs shadow transition hover:bg-slate-100">
            ← Back to Home
          </a>
        </header>

        {/* Main Form Section */}
        <div className="max-w-xl mx-auto p-6 sm:py-12">
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100">
            
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-[#008080]">Critical Care & Emergency Support</h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">Instant Admission Request Form</p>
            </div>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                <h3 className="text-lg font-bold text-emerald-900">Request Submitted Successfully!</h3>
                <p className="text-xs text-emerald-700">Our emergency medical response team has received your details and will contact you immediately via phone.</p>
                <button 
                  onClick={() => { setSubmitted(false); setFormData({ name: '', phone: '', age: '', reason: '' }); }}
                  className="mt-4 bg-[#008080] text-white px-6 py-2 rounded-xl text-xs font-bold"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-xs text-[#008080] font-semibold text-center mb-4">
                  🚨 Emergency Support Hotline: <a href="tel:09666720320" className="font-bold underline">০৯৬৬৬৭২০৩২০</a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Patient Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Full Name" 
                      className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#008080]" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Contact Number <span className="text-rose-500">*</span></label>
                    <input 
                      type="tel" 
                      required 
                      maxLength={11}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                      placeholder="017XXXXXXXX" 
                      className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#008080] font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Patient Age <span className="text-rose-500">*</span></label>
                  <input 
                    type="number" 
                    required 
                    value={formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                    placeholder="Age" 
                    className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#008080]" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Reason / Medical Condition <span className="text-rose-500">*</span></label>
                  <textarea 
                    required 
                    rows={3}
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                    placeholder="Describe patient condition or emergency requirement..." 
                    className="w-full border rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:ring-2 focus:ring-[#008080]"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-xl font-bold text-sm transition shadow-lg"
                >
                  Submit Emergency Request
                </button>
              </form>
            )}

          </div>
        </div>
      </div>

      <footer className="bg-[#008080] text-white py-6 text-center text-xs font-semibold">
        Copyright © 2026 Delta Health Care Jatrabari Ltd. Hotline: 09666720320
      </footer>
    </div>
  )
}