export interface DoctorScheduleSlot {
  days: string[]
  time: string
}

export interface Doctor {
  id: string
  doctor_no?: string
  name: string
  nameBn?: string
  title?: string
  degree?: string
  branch?: string
  specialization: string
  qualifications?: string
  fee?: string | number
  follow_up_fee?: string | number
  days?: string[]
  sitting_hours?: string
  photo?: string
  image_url?: string
  room?: string
  status?: string
  details?: string
  phone?: string
  address?: string
  reserved_slots?: number
  experience?: string
  schedule?: any
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
export type Day = typeof DAYS[number]

export const SPECIALIZATIONS = [
  "Gynae & Obs.",
  "Medicine",
  "Cardiology",
  "Pediatric",
  "Orthopedic",
  "ENT",
  "General Surgery",
  "Nephrology",
  "Urology",
  "Dermatology",
  "Neurology",
  "Dental",
  "Oncology"
] as const
export type Specialization = typeof SPECIALIZATIONS[number]

export const sharedDoctors: Doctor[] = [
  {
    id: "1",
    doctor_no: "1",
    name: "Dr. Nasima Begum (Nila)",
    degree: "MBBS, BCS (Health), MS (Obs & Gynae)",
    branch: "Delta Health Care",
    specialization: "Gynae & Obs.",
    fee: "800 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "07:00 PM",
    image_url: "/doctors/doctor-1.png",
    status: "Present",
    details: "Specialized in High-Risk Pregnancy & Gynecological Surgeries."
  },
  {
    id: "2",
    doctor_no: "2",
    name: "Prof. Dr. Nadira Sultana",
    degree: "MBBS, FCPS (Obs & Gynae)",
    branch: "Delta Health Care",
    specialization: "Gynae & Obs.",
    fee: "800 BDT",
    days: ["Sunday", "Tuesday", "Thursday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-2.png",
    status: "Present",
    details: "Professor & Senior Consultant in Obstetrics and Gynecology."
  },
  {
    id: "3",
    doctor_no: "3",
    name: "Dr. Nasima Akter",
    degree: "MBBS (DMC), FCPS",
    branch: "Delta Health Care",
    specialization: "Gynae & Obs.",
    fee: "700 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-3.png",
    status: "Present",
    details: "Gynaecologist and Obstetrician Specialist."
  },
  {
    id: "4",
    doctor_no: "4",
    name: "Dr. Mahbuba Afroze",
    degree: "MBBS, DGO",
    branch: "Delta Health Care",
    specialization: "Gynae & Obs.",
    fee: "600 BDT",
    days: ["Wednesday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-4.png",
    status: "Present",
    details: "Specialist in Women Health and Infertility."
  },
  {
    id: "5",
    doctor_no: "5",
    name: "Dr. Sultana Akter",
    degree: "MBBS, FCPS",
    branch: "Delta Health Care",
    specialization: "Gynae & Obs.",
    fee: "700 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "06:00 PM",
    image_url: "/doctors/doctor-5.png",
    status: "Present",
    details: "Consultant - Gynaecology & Obstetrics."
  },
  {
    id: "6",
    doctor_no: "6",
    name: "Professor Dr. Kazi Nazrul Islam",
    degree: "MBBS, FCPS (Cardiology)",
    branch: "Delta Health Care",
    specialization: "Cardiology",
    fee: "1000 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "03:00 PM",
    image_url: "/doctors/doctor-6.png",
    status: "Present",
    details: "Senior Consultant Interventional Cardiologist."
  },
  {
    id: "7",
    doctor_no: "7",
    name: "Dr. Mujibur Rahman Mujib",
    degree: "MBBS, FCPS",
    branch: "Delta Health Care",
    specialization: "Neonatal",
    fee: "700 BDT",
    days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    sitting_hours: "10:00 AM - 01:00 PM",
    image_url: "/doctors/doctor-7.png",
    status: "Present",
    details: "Paediatric & Neonatal Specialist."
  },
  {
    id: "8",
    doctor_no: "8",
    name: "Dr. Yeamin Shahriar Chowdhury",
    degree: "MBBS, MD (Pediatrics)",
    branch: "Delta Health Care",
    specialization: "Neonatal",
    fee: "900 BDT",
    days: ["Monday", "Wednesday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-8.png",
    status: "Present",
    details: "Child & Newborn Specialist."
  },
  {
    id: "9",
    doctor_no: "9",
    name: "Dr. Md. Reazul Islam",
    degree: "MBBS, FCPS (Medicine)",
    branch: "Delta Health Care",
    specialization: "Medicine",
    fee: "700 BDT",
    days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    sitting_hours: "10:00 AM - 01:00 PM",
    image_url: "/doctors/doctor-9.png",
    status: "Present",
    details: "Internal Medicine & General Health Specialist."
  },
  {
    id: "10",
    doctor_no: "10",
    name: "Dr. Juyel Chowdhury",
    degree: "MBBS, MRCP (UK)",
    branch: "Delta Health Care",
    specialization: "Medicine",
    fee: "800 BDT",
    days: ["Tuesday"],
    sitting_hours: "06:00 PM",
    image_url: "/doctors/doctor-10.png",
    status: "Present",
    details: "Medicine Specialist & Consultant."
  },
  {
    id: "11",
    doctor_no: "11",
    name: "Dr. K. A. Faisal",
    degree: "MBBS, DLO",
    branch: "Delta Health Care",
    specialization: "ENT",
    fee: "600 BDT",
    days: ["Monday", "Wednesday", "Saturday"],
    sitting_hours: "06:00 PM",
    image_url: "/doctors/doctor-11.png",
    status: "Present",
    details: "Ear, Nose & Throat (ENT) Specialist."
  },
  {
    id: "12",
    doctor_no: "12",
    name: "Dr. Kabiruzzaman",
    degree: "MBBS, MD (Neurology)",
    branch: "Delta Health Care",
    specialization: "Neuro Medicine",
    fee: "900 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-12.png",
    status: "Present",
    details: "Brain, Nerve, Stroke & Headache Specialist."
  },
  {
    id: "13",
    doctor_no: "13",
    name: "Dr. Abdullah Al Mamun",
    degree: "MBBS, FCPS (Gastroenterology)",
    branch: "Delta Health Care",
    specialization: "Gastroenterology",
    fee: "800 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "06:00 PM",
    image_url: "/doctors/doctor-13.png",
    status: "Present",
    details: "Liver, Stomach & Pancreas Specialist."
  },
  {
    id: "14",
    doctor_no: "14",
    name: "Dr. S. M. Masum Billah",
    degree: "MBBS, MS (Ortho)",
    branch: "Delta Health Care",
    specialization: "Orthopedic",
    fee: "800 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "07:00 PM",
    image_url: "/doctors/doctor-14.png",
    status: "Present",
    details: "Bone, Joint, Fracture & Trauma Surgeon."
  },
  {
    id: "15",
    doctor_no: "15",
    name: "Dr. Al Faysal",
    degree: "MBBS, MS",
    branch: "Delta Health Care",
    specialization: "Orthopedic",
    fee: "700 BDT",
    days: ["Wednesday"],
    sitting_hours: "On Call",
    image_url: "/doctors/doctor-15.png",
    status: "Present",
    details: "Orthopedic & Trauma Specialist."
  },
  {
    id: "16",
    doctor_no: "16",
    name: "Dr. Mossaraf Hossain",
    degree: "MBBS, MS (Surgery)",
    branch: "Delta Health Care",
    specialization: "General Surgery",
    fee: "700 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "05:00 PM",
    image_url: "/doctors/doctor-16.png",
    status: "Present",
    details: "General, Laparoscopic & Tumor Surgeon."
  },
  {
    id: "17",
    doctor_no: "17",
    name: "Dr. Manik Chandra Mondal",
    degree: "MBBS, MD (Nephrology)",
    branch: "Delta Health Care",
    specialization: "Nephrology",
    fee: "800 BDT",
    days: ["Sunday", "Thursday"],
    sitting_hours: "06:00 PM",
    image_url: "/doctors/doctor-17.png",
    status: "Present",
    details: "Kidney & Hypertension Specialist."
  },
  {
    id: "18",
    doctor_no: "18",
    name: "Dr. Mohammad Wasim",
    degree: "MBBS, MD (Hematology)",
    branch: "Delta Health Care",
    specialization: "Hematology",
    fee: "800 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "07:00 PM",
    image_url: "/doctors/doctor-18.png",
    status: "Present",
    details: "Blood Diseases, Thalassemia & Leukemia Specialist."
  },
  {
    id: "19",
    doctor_no: "19",
    name: "Dr. Abdus Sadir",
    degree: "MBBS, DDV",
    branch: "Delta Health Care",
    specialization: "Dermatology",
    fee: "700 BDT",
    days: ["Monday", "Wednesday", "Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-19.png",
    status: "Present",
    details: "Skin, Allergy, Hair & Venereal Disease Specialist."
  },
  {
    id: "20",
    doctor_no: "20",
    name: "Dr. Neamot Elahi",
    degree: "MBBS, DDVL",
    branch: "Delta Health Care",
    specialization: "Dermatology",
    fee: "700 BDT",
    days: ["Saturday"],
    sitting_hours: "04:00 PM",
    image_url: "/doctors/doctor-20.png",
    status: "Present",
    details: "Dermatologist & Cosmetologist."
  },
  {
    id: "21",
    doctor_no: "21",
    name: "Dr. Md. Tofayel Hosain",
    degree: "BPT, PGT",
    branch: "Delta Health Care",
    specialization: "Physiotherapy",
    fee: "500 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Saturday"],
    sitting_hours: "10:00 AM - 04:00 PM",
    image_url: "/doctors/doctor-21.png",
    status: "Present",
    details: "Physical Therapy & Rehabilitation Specialist."
  },
  {
    id: "22",
    doctor_no: "22",
    name: "Dr. Wahida Parveen",
    degree: "BDS (DU)",
    branch: "Delta Health Care",
    specialization: "Dental / Oral Implantology",
    fee: "500 BDT",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Saturday"],
    sitting_hours: "07:00 PM",
    image_url: "/doctors/doctor-22.png",
    status: "Present",
    details: "Dental Surgeon & Oral Implantologist."
  },
  {
    id: "23",
    doctor_no: "23",
    name: "Dr. G. Kabir",
    degree: "MBBS, FCPS (Urology)",
    branch: "Delta Health Care",
    specialization: "Urology",
    fee: "900 BDT",
    days: ["Wednesday"],
    sitting_hours: "On Call",
    image_url: "/doctors/doctor-23.png",
    status: "Present",
    details: "Kidney, Urology & Andrology Surgeon."
  },
  {
    id: "24",
    doctor_no: "24",
    name: "Dr. Jilhas Uddin",
    degree: "MBBS, MS (Vascular)",
    branch: "Delta Health Care",
    specialization: "Vascular Surgery",
    fee: "900 BDT",
    days: ["Wednesday"],
    sitting_hours: "On Call",
    image_url: "/doctors/doctor-24.png",
    status: "Present",
    details: "Vascular & Endovascular Surgeon."
  }
];

export const doctors = sharedDoctors;
