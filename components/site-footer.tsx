import Link from "next/link"

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-blue-600 text-blue-50 py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Section 1: About & Contact */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-white text-blue-600 p-1.5 rounded-lg">
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </span>
              Pulse Specialised Hospital
            </h3>
            <p className="text-sm text-blue-200">
              Delivering compassionate, specialist-led healthcare with modern diagnostics and round-the-clock emergency support.
            </p>
            <div className="space-y-3 text-sm pt-2">
              <p className="flex items-start gap-2">
                <span className="font-bold">Address:</span> 
                661 Dhonia - Dholaipar Rd, Dhaka 1236
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold">Phone:</span> 
                <span className="flex flex-col gap-1">
                  <span>01886700789 (Mobile)</span>
                  <span>02223340088 (Telephone)</span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold">Email:</span> 
                pulsespecialisedhospital@gmail.com
              </p>
            </div>
          </div>

          {/* Section 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Specialities</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li><Link href="#" className="hover:text-white transition">Cardiology</Link></li>
              <li><Link href="#" className="hover:text-white transition">Neurology</Link></li>
              <li><Link href="#" className="hover:text-white transition">Orthopedics</Link></li>
              <li><Link href="#" className="hover:text-white transition">Gynecology</Link></li>
              <li><Link href="#" className="hover:text-white transition">Pediatrics</Link></li>
            </ul>
          </div>

          {/* Section 3: Google Map Integration */}
          <div className="space-y-4 lg:col-span-2">
            <h4 className="text-lg font-semibold text-white">Find Us</h4>
            <div className="w-full h-48 bg-blue-800 rounded-xl overflow-hidden border-2 border-blue-400">
              {/* Your Custom Google Map */}
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.9141722230147!2d90.43663262181903!3d23.702615436901755!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b908681a7f39%3A0x54ceef4812beb1ed!2sPulse%20Specialised%20Hospital%20ltd!5e0!3m2!1sen!2sbd!4v1790125167182!5m2!1sen!2sbd" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true}
                loading="lazy" 
                referrerPolicy="strict-origin-when-cross-origin"
              ></iframe>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-blue-500 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-200">
          <p>© {new Date().getFullYear()} Pulse Specialised Hospital. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="#" className="hover:text-white transition">Facebook</Link>
            <Link href="#" className="hover:text-white transition">Twitter</Link>
            <Link href="#" className="hover:text-white transition">Instagram</Link>
            <Link href="#" className="hover:text-white transition">LinkedIn</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}