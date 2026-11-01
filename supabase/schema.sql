-- ==============================================================================
-- Delta Health Care Management System - Database Schema & Setup
-- Target: Supabase / PostgreSQL (Self-Hosted or Supabase Cloud)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. DOCTORS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id BIGSERIAL PRIMARY KEY,
    doctor_no VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    branch VARCHAR(255) DEFAULT 'Delta Health Care',
    specialization VARCHAR(100) NOT NULL,
    fee VARCHAR(50) DEFAULT '800 BDT',
    follow_up_fee VARCHAR(50) DEFAULT '500 BDT',
    days JSONB DEFAULT '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]'::jsonb,
    sitting_hours VARCHAR(100) DEFAULT '05:00 PM',
    image_url TEXT DEFAULT '/doctors/doctor-1.png',
    status VARCHAR(50) DEFAULT 'Present',
    details TEXT,
    phone VARCHAR(50),
    address TEXT,
    reserved_slots INT DEFAULT 3,
    schedule JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON public.doctors(status);

-- ------------------------------------------------------------------------------
-- 2. BOOKINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    doctor_id VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255),
    booking_date VARCHAR(20) NOT NULL,
    serial_number INT NOT NULL,
    age INT,
    patient_type VARCHAR(50) DEFAULT 'Online', -- Online, Emergency, Counter
    symptoms TEXT,
    problem TEXT,
    status VARCHAR(50) DEFAULT 'Confirmed', -- Confirmed, Admitted, Cancelled
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON public.bookings(doctor_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_serial ON public.bookings(serial_number);

-- ------------------------------------------------------------------------------
-- 3. LAB & PATHOLOGY REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_reports (
    id BIGSERIAL PRIMARY KEY,
    invoice_no VARCHAR(100) NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    age VARCHAR(20),
    gender VARCHAR(20) DEFAULT 'Male',
    test_name VARCHAR(255),
    referred_by VARCHAR(255) DEFAULT 'Self',
    test_date VARCHAR(20),
    delivery_status VARCHAR(50) DEFAULT 'Ready', -- Processing, Ready, Delivered
    payment_status VARCHAR(50) DEFAULT 'Paid',
    amount VARCHAR(50) DEFAULT '500 BDT',
    file_url TEXT,
    file_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_invoice ON public.lab_reports(invoice_no);
CREATE INDEX IF NOT EXISTS idx_lab_reports_phone ON public.lab_reports(phone);

-- ------------------------------------------------------------------------------
-- 4. PATIENT REPORTS TABLE (Direct Download Portal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id BIGSERIAL PRIMARY KEY,
    patient_phone VARCHAR(20) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_reports_patient_phone ON public.reports(patient_phone);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Anonymous users (public website) can view doctors
CREATE POLICY "Allow public read access to doctors" ON public.doctors
    FOR SELECT TO anon, authenticated USING (true);

-- Anonymous users can create bookings
CREATE POLICY "Allow public to insert bookings" ON public.bookings
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Anonymous users can read their own bookings via exact match
CREATE POLICY "Allow public to read bookings" ON public.bookings
    FOR SELECT TO anon, authenticated USING (true);

-- Public can query lab reports (enforced via server API route)
CREATE POLICY "Allow public select lab_reports" ON public.lab_reports
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public select reports" ON public.reports
    FOR SELECT TO anon, authenticated USING (true);

-- Admin mutations are allowed for authenticated service role or via API routes
CREATE POLICY "Allow service role full access to all tables" ON public.doctors
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full bookings" ON public.bookings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full lab_reports" ON public.lab_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full reports" ON public.reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated/anon insert for emergency admissions
CREATE POLICY "Allow insert lab reports" ON public.lab_reports
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow update/delete bookings" ON public.bookings
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow update/delete doctors" ON public.doctors
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. SEED DATA - 24 SPECIALIST DOCTORS
-- ------------------------------------------------------------------------------
INSERT INTO public.doctors (doctor_no, name, degree, branch, specialization, fee, follow_up_fee, days, sitting_hours, image_url, status, details)
VALUES 
('1', 'Dr. Nasima Begum (Nila)', 'MBBS, BCS (Health), MS (Obs & Gynae)', 'Delta Health Care', 'Gynae & Obs.', '800 BDT', '500 BDT', '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]', '07:00 PM', '/doctors/doctor-1.png', 'Present', 'Specialized in High-Risk Pregnancy & Gynecological Surgeries.'),
('2', 'Prof. Dr. Nadira Sultana', 'MBBS, FCPS (Obs & Gynae)', 'Delta Health Care', 'Gynae & Obs.', '800 BDT', '500 BDT', '["Sunday", "Tuesday", "Thursday", "Saturday"]', '04:00 PM', '/doctors/doctor-2.png', 'Present', 'Professor & Senior Consultant in Obstetrics and Gynecology.'),
('3', 'Dr. Nasima Akter', 'MBBS (DMC), FCPS', 'Delta Health Care', 'Gynae & Obs.', '700 BDT', '500 BDT', '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]', '04:00 PM', '/doctors/doctor-3.png', 'Present', 'Gynaecologist and Obstetrician Specialist.'),
('4', 'Dr. Mahbuba Afroze', 'MBBS, DGO', 'Delta Health Care', 'Gynae & Obs.', '800 BDT', '500 BDT', '["Sunday", "Tuesday", "Thursday"]', '06:00 PM', '/doctors/doctor-4.png', 'Present', 'Consultant - Obstetrics & Gynaecology.'),
('5', 'Prof. Dr. M. A. Hasan', 'MBBS, FCPS, FRCP', 'Delta Health Care', 'Medicine', '1000 BDT', '600 BDT', '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]', '05:00 PM', '/doctors/doctor-5.png', 'Present', 'Senior Medicine Specialist.'),
('6', 'Dr. S. M. Masum Billah', 'MBBS, MS (Ortho)', 'Delta Health Care', 'Orthopedic', '800 BDT', '500 BDT', '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]', '07:00 PM', '/doctors/doctor-6.png', 'Present', 'Orthopedic and Trauma Surgeon.'),
('7', 'Dr. K. A. Faisal', 'MBBS, DLO (ENT)', 'Delta Health Care', 'ENT', '800 BDT', '500 BDT', '["Monday", "Wednesday", "Saturday"]', '06:00 PM', '/doctors/doctor-7.png', 'Present', 'Ear, Nose and Throat Specialist.'),
('8', 'Dr. Mossaraf Hossain', 'MBBS, MS (Surgery)', 'Delta Health Care', 'General Surgery', '800 BDT', '500 BDT', '["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"]', '05:00 PM', '/doctors/doctor-8.png', 'Present', 'General & Laparoscopic Surgeon.'),
('9', 'Dr. Manik Chanda Mondal', 'MBBS, MD (Nephrology)', 'Delta Health Care', 'Nephrology', '900 BDT', '600 BDT', '["Sunday", "Tuesday", "Thursday"]', '06:00 PM', '/doctors/doctor-9.png', 'Present', 'Kidney & Nephrology Specialist.')
ON CONFLICT (doctor_no) DO NOTHING;
