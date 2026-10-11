"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function ReportSection() {
  // Report Download States
  const [reportPhone, setReportPhone] = useState('')
  const [reports, setReports] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Sample Collection States
  const [sampleName, setSampleName] = useState('')
  const [samplePhone, setSamplePhone] = useState('')
  const [sampleAddress, setSampleAddress] = useState('')
  const [sampleTests, setSampleTests] = useState('')
  const [sampleDate, setSampleDate] = useState('') // নতুন স্টেট: Collection Date
  const [sampleLoading, setSampleLoading] = useState(false)
  const [sampleSuccess, setSampleSuccess] = useState(false)

  // Report Search Function
  async function handleSearchReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportPhone.trim()) return
    setReportLoading(true)
    setSearched(true)
    const { data } = await supabase.from('reports').select('*').eq('patient_phone', reportPhone).order('created_at', { ascending: false })
    if (data) setReports(data)
    setReportLoading(false)
  }

  // Sample Request Submit Function
  async function handleSampleRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!sampleName || !samplePhone || !sampleAddress || !sampleTests || !sampleDate) return
    setSampleLoading(true)
    
    // ডাটাবেসে collection_date সহ সেভ করা
    const { error } = await supabase.from('sample_requests').insert({
      patient_name: sampleName, 
      phone: samplePhone, 
      address: sampleAddress, 
      tests: sampleTests,
      collection_date: sampleDate 
    })
    
    if (!error) {
      setSampleSuccess(true)
      setSampleName('')
      setSamplePhone('')
      setSampleAddress('')
      setSampleTests('')
      setSampleDate('')
      setTimeout(() => setSampleSuccess(false), 5000)
    } else {
      alert("Error submitting request. Please try again.")
    }
    setSampleLoading(false)
  }

  // আজকের তারিখ বের করা (past date ব্লক করার জন্য)
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <section id="report" className="py-16 bg-gray-50 dark:bg-zinc-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Home Sample Collection Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-full text-blue-600 dark:text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Home Sample Collection</h2>
                <p className="text-sm text-muted-foreground">Book a convenient visit</p>
              </div>
            </div>

            {sampleSuccess ? (
              <div className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 p-6 rounded-lg text-center font-medium border border-green-200 dark:border-green-800">
                Request submitted successfully! Our team will contact you shortly.
              </div>
            ) : (
              <form onSubmit={handleSampleRequest} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Patient Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={sampleName} onChange={(e) => setSampleName(e.target.value)} placeholder="Full name" className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Phone (11 Digits) <span className="text-red-500">*</span></label>
                  <input type="tel" required maxLength={11} value={samplePhone} onChange={(e) => setSamplePhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
                  {samplePhone.length > 0 && samplePhone.length < 11 && <span className="text-[10px] text-red-500">Must be exactly 11 digits</span>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Address <span className="text-red-500">*</span></label>
                  <input type="text" required value={sampleAddress} onChange={(e) => setSampleAddress(e.target.value)} placeholder="House, road, area, city" className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
                </div>
                
                {/* Collection Date ফিল্ড */}
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Collection Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    required 
                    min={todayStr} 
                    value={sampleDate} 
                    onChange={(e) => setSampleDate(e.target.value)} 
                    className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" 
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Tests Required <span className="text-red-500">*</span></label>
                  <input type="text" required value={sampleTests} onChange={(e) => setSampleTests(e.target.value)} placeholder="e.g. CBC, Fasting Blood Sugar" className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
                </div>
                <button type="submit" disabled={sampleLoading || samplePhone.length !== 11} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:bg-blue-400 mt-2">
                  {sampleLoading ? 'Submitting...' : 'Request Visit'}
                </button>
              </form>
            )}
          </div>

          {/* Right: Download Report Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-full text-blue-600 dark:text-blue-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Download Report</h2>
                <p className="text-sm text-muted-foreground">Access results with your phone number</p>
              </div>
            </div>

            <ul className="text-sm text-muted-foreground space-y-2 mb-8">
              <li className="flex gap-2">✓ Pathological reports only — other report types are not available here.</li>
              <li className="flex gap-2">✓ Payment must be completed before a report can be downloaded.</li>
            </ul>

            <form onSubmit={handleSearchReport} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                <input type="tel" required maxLength={11} value={reportPhone} onChange={(e) => setReportPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full border border-input bg-background text-foreground dark:text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
              </div>
              <button type="submit" disabled={reportLoading || reportPhone.length !== 11} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:bg-blue-400 mt-2">
                {reportLoading ? 'Searching...' : 'Search Report'}
              </button>
            </form>

            {searched && (
              <div className="mt-6 pt-6 border-t border-border">
                {reports.length === 0 ? (
                  <p className="text-center text-sm text-red-500 bg-red-50 dark:bg-red-950/40 py-3 rounded-lg">No reports found for this number.</p>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report, i) => (
                      <div key={report.id} className="flex justify-between items-center bg-blue-50 dark:bg-zinc-800 p-4 rounded-lg border border-blue-100 dark:border-zinc-700">
                        <div>
                          {/* রিপোর্ট নাম দেখানোর ব্যবস্থা */}
                          <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                            {report.report_name ? report.report_name : `Report #${reports.length - i}`}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{new Date(report.created_at).toLocaleDateString('en-GB')}</p>
                        </div>
                        <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md font-medium shadow-sm transition">
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}