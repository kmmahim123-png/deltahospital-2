export interface Doctor {
  id: string;
  name: string;
  nameBn?: string;
  specialization: string;
  title: string;
  qualifications: string;
  photo: string;
  fee: number;
  room: string;
  schedule: { days: string[]; time: string }[];
}

export const doctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Nadira Sultana",
    specialization: "Gynae & Obs.",
    title: "Consultant - Gynaecology & Obstetrics",
    qualifications: "MBBS, FCPS (Obs & Gynae)",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "101",
    schedule: [{ days: ["Sun", "Tue", "Wed", "Thu", "Sat"], time: "4:00 PM - 7:00 PM" }]
  },
  {
    id: "2",
    name: "Dr. Nasima Akter",
    specialization: "Gynae & Obs.",
    title: "Consultant - Gynaecology & Obstetrics",
    qualifications: "MBBS, Specialist",
    photo: "https://images.unsplash.com/photo-1594824813587-9bb3294025d2?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "102",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "4:00 PM - 7:00 PM" }]
  },
  {
    id: "3",
    name: "Dr. Sultana Akter",
    specialization: "Gynae & Obs.",
    title: "Specialist - Gynaecology",
    qualifications: "MBBS, Specialist",
    photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "103",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "6:00 PM - 9:00 PM" }]
  },
  {
    id: "4",
    name: "Dr. Nasima Begum (Neela)",
    specialization: "Gynae & Obs.",
    title: "Specialist - Gynaecology",
    qualifications: "MBBS, Specialist",
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "104",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "7:00 PM - 10:00 PM" }]
  },
  {
    id: "5",
    name: "Dr. Kazi Nazrul Islam",
    specialization: "Cardiology",
    title: "Cardiology Specialist",
    qualifications: "MBBS, Cardiology Specialist",
    photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
    fee: 900,
    room: "105",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], time: "3:00 PM - 6:00 PM" }]
  },
  {
    id: "6",
    name: "Dr. Md. Reazul Islam",
    specialization: "Medicine",
    title: "Medicine Specialist",
    qualifications: "MBBS, FCPS (Medicine)",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "106",
    schedule: [{ days: ["Mon", "Wed", "Sat"], time: "4:00 PM - 7:00 PM" }]
  },
  {
    id: "7",
    name: "Dr. Kabiruzzaman",
    specialization: "Neuro Medicine",
    title: "Neuro Medicine Specialist",
    qualifications: "MBBS, MD (Neuro-Medicine)",
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    fee: 1000,
    room: "107",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "4:00 PM - 7:00 PM" }]
  },
  {
    id: "8",
    name: "Dr. Abdullah Al Mamun",
    specialization: "Gastroenterology",
    title: "Gastroenterology Specialist",
    qualifications: "MBBS, Specialist",
    photo: "https://images.unsplash.com/photo-1594824813587-9bb3294025d2?auto=format&fit=crop&q=80&w=300",
    fee: 900,
    room: "108",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "6:00 PM - 9:00 PM" }]
  },
  {
    id: "9",
    name: "Dr. S.M Masum Billah",
    specialization: "Orthopedic",
    title: "Orthopedic Surgeon",
    qualifications: "MBBS, MS (Ortho)",
    photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "109",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "7:00 PM - 10:00 PM" }]
  },
  {
    id: "10",
    name: "Dr. K. A Faisal",
    specialization: "ENT",
    title: "ENT Specialist",
    qualifications: "MBBS, DLO (ENT)",
    photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "110",
    schedule: [{ days: ["Mon", "Wed", "Sat"], time: "6:00 PM - 9:00 PM" }]
  },
  {
    id: "11",
    name: "Dr. Mossaraf Hossain",
    specialization: "General Surgery",
    title: "General Surgeon",
    qualifications: "MBBS, MS (Surgery)",
    photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    fee: 800,
    room: "111",
    schedule: [{ days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"], time: "5:00 PM - 8:00 PM" }]
  },
  {
    id: "12",
    name: "Dr. Manik Chanda Mondal",
    specialization: "Nephrology",
    title: "Nephrology Specialist",
    qualifications: "MBBS, MD (Nephrology)",
    photo: "https://images.unsplash.com/photo-1594824813587-9bb3294025d2?auto=format&fit=crop&q=80&w=300",
    fee: 900,
    room: "112",
    schedule: [{ days: ["Sun", "Tue", "Thu"], time: "6:00 PM - 9:00 PM" }]
  }
];