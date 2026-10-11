"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PatientReports() {
  const [phone, setPhone] = useState('')
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function searchReports(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    setSearched(true)
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('patient_phone', phone)
      .order('created_at', { ascending: false })

    if (data) {
      setReports(data)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Download Your Report</h1>
          <p className="text-gray-500">Enter your registered phone number to access your pathology reports.</p>
        </div>

        <form onSubmit={searchReports} className="flex gap-3 mb-8">
          <input
            type="tel"
            required
            placeholder="Enter Phone Number (e.g. 017XXXXXXX)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 h-12 rounded-xl border border-gray-300 px-4 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
          <button 
            type="submit" disabled={loading}
            className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold transition disabled:bg-blue-400 shadow-md"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searched && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Search Results:</h3>
            
            {reports.length === 0 ? (
              <p className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg">No reports found for this number.</p>
            ) : (
              reports.map((report, index) => (
                <div key={report.id} className="flex justify-between items-center p-4 bg-blue-50/50 border border-blue-100 rounded-xl hover:bg-blue-50 transition">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">Pathology Report #{reports.length - index}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      Uploaded: {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <a 
                    href={report.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition shadow-sm"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}