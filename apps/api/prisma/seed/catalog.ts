/**
 * Static, realistic demo data: a pharmaceutical catalog, dealers, people, and
 * the pharmacy tenants (with varied status + subscription scenarios). No DB
 * access here — pure data consumed by the seed engine.
 */

export interface MedicineDef {
  name: string;
  generic: string;
  category: string;
  form: string;
  unit: string;
  strengths: string[];
  /** Per-unit MRP band in ₹. Cost price is derived as a fraction of MRP. */
  mrp: [number, number];
}

/** ~70 common medicines spanning every analytics category. */
export const MEDICINE_CATALOG: MedicineDef[] = [
  { name: 'Paracetamol', generic: 'Acetaminophen', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['500mg', '650mg'], mrp: [1, 3] },
  { name: 'Ibuprofen', generic: 'Ibuprofen', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['200mg', '400mg'], mrp: [1.5, 4] },
  { name: 'Aspirin', generic: 'Acetylsalicylic acid', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['75mg', '150mg'], mrp: [0.8, 2.5] },
  { name: 'Diclofenac', generic: 'Diclofenac sodium', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['50mg'], mrp: [1.5, 4] },
  { name: 'Aceclofenac', generic: 'Aceclofenac', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['100mg'], mrp: [3, 7] },
  { name: 'Naproxen', generic: 'Naproxen', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['250mg', '500mg'], mrp: [4, 9] },
  { name: 'Tramadol', generic: 'Tramadol HCl', category: 'Analgesic', form: 'Capsule', unit: 'capsule', strengths: ['50mg'], mrp: [3, 8] },
  { name: 'Nimesulide', generic: 'Nimesulide', category: 'Analgesic', form: 'Tablet', unit: 'tablet', strengths: ['100mg'], mrp: [2, 5] },

  { name: 'Amoxicillin', generic: 'Amoxicillin', category: 'Antibiotic', form: 'Capsule', unit: 'capsule', strengths: ['250mg', '500mg'], mrp: [3, 8] },
  { name: 'Azithromycin', generic: 'Azithromycin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['250mg', '500mg'], mrp: [8, 22] },
  { name: 'Ciprofloxacin', generic: 'Ciprofloxacin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['250mg', '500mg'], mrp: [4, 11] },
  { name: 'Cefixime', generic: 'Cefixime', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['100mg', '200mg'], mrp: [9, 24] },
  { name: 'Doxycycline', generic: 'Doxycycline', category: 'Antibiotic', form: 'Capsule', unit: 'capsule', strengths: ['100mg'], mrp: [2, 6] },
  { name: 'Levofloxacin', generic: 'Levofloxacin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['500mg'], mrp: [9, 20] },
  { name: 'Metronidazole', generic: 'Metronidazole', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['400mg'], mrp: [1.5, 4] },
  { name: 'Erythromycin', generic: 'Erythromycin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['250mg', '500mg'], mrp: [3, 8] },
  { name: 'Ofloxacin', generic: 'Ofloxacin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['200mg'], mrp: [4, 10] },
  { name: 'Clarithromycin', generic: 'Clarithromycin', category: 'Antibiotic', form: 'Tablet', unit: 'tablet', strengths: ['250mg', '500mg'], mrp: [12, 30] },

  { name: 'Cetirizine', generic: 'Cetirizine', category: 'Antihistamine', form: 'Tablet', unit: 'tablet', strengths: ['10mg'], mrp: [0.8, 3] },
  { name: 'Levocetirizine', generic: 'Levocetirizine', category: 'Antihistamine', form: 'Tablet', unit: 'tablet', strengths: ['5mg'], mrp: [1.5, 5] },
  { name: 'Loratadine', generic: 'Loratadine', category: 'Antihistamine', form: 'Tablet', unit: 'tablet', strengths: ['10mg'], mrp: [2, 6] },
  { name: 'Fexofenadine', generic: 'Fexofenadine', category: 'Antihistamine', form: 'Tablet', unit: 'tablet', strengths: ['120mg', '180mg'], mrp: [5, 14] },
  { name: 'Chlorpheniramine', generic: 'Chlorpheniramine maleate', category: 'Antihistamine', form: 'Tablet', unit: 'tablet', strengths: ['4mg'], mrp: [0.5, 2] },
  { name: 'Montelukast', generic: 'Montelukast', category: 'Respiratory', form: 'Tablet', unit: 'tablet', strengths: ['10mg'], mrp: [6, 16] },

  { name: 'Metformin', generic: 'Metformin HCl', category: 'Antidiabetic', form: 'Tablet', unit: 'tablet', strengths: ['500mg', '850mg', '1000mg'], mrp: [1.5, 5] },
  { name: 'Glimepiride', generic: 'Glimepiride', category: 'Antidiabetic', form: 'Tablet', unit: 'tablet', strengths: ['1mg', '2mg'], mrp: [2, 6] },
  { name: 'Gliclazide', generic: 'Gliclazide', category: 'Antidiabetic', form: 'Tablet', unit: 'tablet', strengths: ['40mg', '80mg'], mrp: [3, 8] },
  { name: 'Sitagliptin', generic: 'Sitagliptin', category: 'Antidiabetic', form: 'Tablet', unit: 'tablet', strengths: ['50mg', '100mg'], mrp: [14, 32] },
  { name: 'Vildagliptin', generic: 'Vildagliptin', category: 'Antidiabetic', form: 'Tablet', unit: 'tablet', strengths: ['50mg'], mrp: [12, 28] },
  { name: 'Human Insulin', generic: 'Insulin (Regular)', category: 'Antidiabetic', form: 'Injection', unit: 'vial', strengths: ['40IU/ml'], mrp: [120, 320] },

  { name: 'Amlodipine', generic: 'Amlodipine', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['2.5mg', '5mg', '10mg'], mrp: [1.5, 5] },
  { name: 'Atorvastatin', generic: 'Atorvastatin', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['10mg', '20mg', '40mg'], mrp: [3, 10] },
  { name: 'Rosuvastatin', generic: 'Rosuvastatin', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['5mg', '10mg', '20mg'], mrp: [5, 16] },
  { name: 'Losartan', generic: 'Losartan potassium', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['25mg', '50mg'], mrp: [2, 7] },
  { name: 'Telmisartan', generic: 'Telmisartan', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['20mg', '40mg', '80mg'], mrp: [3, 11] },
  { name: 'Metoprolol', generic: 'Metoprolol', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['25mg', '50mg'], mrp: [2, 6] },
  { name: 'Ramipril', generic: 'Ramipril', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['2.5mg', '5mg'], mrp: [3, 9] },
  { name: 'Clopidogrel', generic: 'Clopidogrel', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['75mg'], mrp: [4, 12] },
  { name: 'Furosemide', generic: 'Furosemide', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['40mg'], mrp: [1, 3] },
  { name: 'Hydrochlorothiazide', generic: 'Hydrochlorothiazide', category: 'Cardiovascular', form: 'Tablet', unit: 'tablet', strengths: ['12.5mg', '25mg'], mrp: [1, 4] },

  { name: 'Omeprazole', generic: 'Omeprazole', category: 'Gastro / PPI', form: 'Capsule', unit: 'capsule', strengths: ['20mg'], mrp: [1.5, 5] },
  { name: 'Pantoprazole', generic: 'Pantoprazole', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['40mg'], mrp: [3, 9] },
  { name: 'Rabeprazole', generic: 'Rabeprazole', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['20mg'], mrp: [4, 11] },
  { name: 'Esomeprazole', generic: 'Esomeprazole', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['40mg'], mrp: [5, 13] },
  { name: 'Ranitidine', generic: 'Ranitidine', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['150mg'], mrp: [1, 3] },
  { name: 'Domperidone', generic: 'Domperidone', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['10mg'], mrp: [1.5, 4] },
  { name: 'Ondansetron', generic: 'Ondansetron', category: 'Gastro / PPI', form: 'Tablet', unit: 'tablet', strengths: ['4mg'], mrp: [2, 6] },
  { name: 'Drotaverine', generic: 'Drotaverine', category: 'Antispasmodic', form: 'Tablet', unit: 'tablet', strengths: ['40mg', '80mg'], mrp: [2, 6] },
  { name: 'Dicyclomine', generic: 'Dicyclomine', category: 'Antispasmodic', form: 'Tablet', unit: 'tablet', strengths: ['10mg', '20mg'], mrp: [1.5, 4] },

  { name: 'Salbutamol', generic: 'Salbutamol', category: 'Respiratory', form: 'Inhaler', unit: 'unit', strengths: ['100mcg'], mrp: [120, 280] },
  { name: 'Levothyroxine', generic: 'Levothyroxine sodium', category: 'Hormonal', form: 'Tablet', unit: 'tablet', strengths: ['25mcg', '50mcg', '100mcg'], mrp: [1.5, 5] },
  { name: 'Prednisolone', generic: 'Prednisolone', category: 'Steroid', form: 'Tablet', unit: 'tablet', strengths: ['5mg', '10mg'], mrp: [1.5, 5] },
  { name: 'Dexamethasone', generic: 'Dexamethasone', category: 'Steroid', form: 'Tablet', unit: 'tablet', strengths: ['0.5mg'], mrp: [1, 3] },

  { name: 'Fluconazole', generic: 'Fluconazole', category: 'Antifungal', form: 'Tablet', unit: 'tablet', strengths: ['150mg'], mrp: [8, 20] },
  { name: 'Clotrimazole', generic: 'Clotrimazole', category: 'Antifungal', form: 'Cream', unit: 'tube', strengths: ['1%'], mrp: [40, 95] },
  { name: 'Itraconazole', generic: 'Itraconazole', category: 'Antifungal', form: 'Capsule', unit: 'capsule', strengths: ['100mg'], mrp: [14, 30] },
  { name: 'Acyclovir', generic: 'Acyclovir', category: 'Antiviral', form: 'Tablet', unit: 'tablet', strengths: ['400mg'], mrp: [6, 16] },
  { name: 'Albendazole', generic: 'Albendazole', category: 'Anthelmintic', form: 'Tablet', unit: 'tablet', strengths: ['400mg'], mrp: [6, 18] },

  { name: 'Cough Syrup', generic: 'Dextromethorphan + CPM', category: 'Respiratory', form: 'Syrup', unit: 'bottle', strengths: ['100ml'], mrp: [55, 140] },
  { name: 'Paracetamol Syrup', generic: 'Acetaminophen', category: 'Analgesic', form: 'Syrup', unit: 'bottle', strengths: ['60ml'], mrp: [35, 85] },
  { name: 'Amoxicillin Suspension', generic: 'Amoxicillin', category: 'Antibiotic', form: 'Suspension', unit: 'bottle', strengths: ['30ml'], mrp: [45, 110] },
  { name: 'ORS Sachet', generic: 'Oral Rehydration Salts', category: 'Supplement', form: 'Sachet', unit: 'sachet', strengths: ['21.8g'], mrp: [10, 25] },

  { name: 'Vitamin D3', generic: 'Cholecalciferol', category: 'Supplement', form: 'Tablet', unit: 'tablet', strengths: ['60000IU'], mrp: [10, 28] },
  { name: 'Vitamin B12', generic: 'Methylcobalamin', category: 'Supplement', form: 'Tablet', unit: 'tablet', strengths: ['500mcg', '1500mcg'], mrp: [3, 10] },
  { name: 'Multivitamin', generic: 'Multivitamin + Minerals', category: 'Supplement', form: 'Capsule', unit: 'capsule', strengths: ['Daily'], mrp: [4, 12] },
  { name: 'Ferrous Sulfate', generic: 'Ferrous Sulfate + Folic Acid', category: 'Supplement', form: 'Tablet', unit: 'tablet', strengths: ['100mg'], mrp: [1.5, 5] },
  { name: 'Calcium Carbonate', generic: 'Calcium + Vitamin D3', category: 'Supplement', form: 'Tablet', unit: 'tablet', strengths: ['500mg'], mrp: [3, 9] },
  { name: 'Folic Acid', generic: 'Folic Acid', category: 'Supplement', form: 'Tablet', unit: 'tablet', strengths: ['5mg'], mrp: [0.8, 3] },

  { name: 'Diclofenac Gel', generic: 'Diclofenac diethylamine', category: 'Topical', form: 'Gel', unit: 'tube', strengths: ['1%'], mrp: [60, 150] },
  { name: 'Mupirocin Ointment', generic: 'Mupirocin', category: 'Topical', form: 'Ointment', unit: 'tube', strengths: ['2%'], mrp: [70, 160] },
  { name: 'Povidone Iodine', generic: 'Povidone Iodine', category: 'Topical', form: 'Ointment', unit: 'tube', strengths: ['5%'], mrp: [45, 120] },
  { name: 'Hydrocortisone Cream', generic: 'Hydrocortisone', category: 'Topical', form: 'Cream', unit: 'tube', strengths: ['1%'], mrp: [50, 130] },
];

export const MANUFACTURERS = [
  'Cipla', 'Sun Pharma', "Dr. Reddy's", 'Lupin', 'Mankind Pharma', 'Zydus', 'Torrent',
  'Alkem Labs', 'Glenmark', 'Abbott', 'GSK', 'Pfizer', 'Intas', 'Aurobindo', 'Macleods',
];

export const DEALER_NAMES = [
  'MediSupply Distributors', 'HealthLine Wholesale', 'PharmaCorp India', 'Apex Drug House',
  'Unimed Distributors', 'Crescent Pharma', 'Nationwide Medico', 'Galaxy Drug Agency',
  'Sunrise Pharma Traders', 'BlueCross Distributors', 'Reliance Medico', 'Vital Care Supplies',
  'Omega Pharmaceuticals', 'Trinity Drug Mart', 'Zenith Medico', 'Prime Health Distributors',
  'Sai Krishna Agencies', 'Metro Pharma Hub', 'Lifeline Wholesale', 'Care & Cure Distributors',
  'Indus Medico', 'Sterling Drug House', 'Royal Pharma Traders', 'Everest Medico',
  'Wellness Wholesale', 'Guardian Pharma', 'NovaMed Distributors', 'Pinnacle Drug Agency',
  'Aastha Medico', 'Sankalp Pharma',
];

export const CONTACT_PERSONS = [
  'Rajesh Kumar', 'Anita Sharma', 'Vikram Patel', 'Priya Nair', 'Suresh Reddy', 'Meera Iyer',
  'Arjun Mehta', 'Fatima Khan', 'Deepak Verma', 'Sunita Rao', 'Imran Sheikh', 'Kavita Joshi',
];

export const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Riya', 'Myra', 'Sara',
  'Karan', 'Nikhil', 'Rahul', 'Sneha', 'Pooja', 'Neha', 'Amit', 'Sanjay', 'Divya', 'Manish',
];

export const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Mehta', 'Khan', 'Singh', 'Gupta',
  'Rao', 'Joshi', 'Desai', 'Kapoor', 'Menon', 'Bose', 'Chowdhury', 'Pillai', 'Malhotra', 'Shetty',
];

export const CITIES = [
  { city: 'Bengaluru', state: 'KA' },
  { city: 'Mumbai', state: 'MH' },
  { city: 'Delhi', state: 'DL' },
  { city: 'Hyderabad', state: 'TG' },
  { city: 'Chennai', state: 'TN' },
  { city: 'Pune', state: 'MH' },
  { city: 'Kolkata', state: 'WB' },
  { city: 'Ahmedabad', state: 'GJ' },
];

export type ShopStatusKey = 'approved' | 'pending' | 'rejected';
export type SubscriptionKey = 'active' | 'trialing' | 'trialing_expired' | 'past_due' | 'canceled';

export interface PharmacyDef {
  key: string;
  name: string;
  ownerName: string;
  status: ShopStatusKey;
  subscription: SubscriptionKey;
  plan: 'Basic' | 'Pro' | null;
  staffCount: number;
  medicineCount: number;
  dealerCount: number;
  billCount: number;
  rejectionReason?: string;
}

/**
 * 8 tenants spanning every required scenario: approved + (active / active-trial /
 * expired-trial / past-due / canceled), a pending pharmacy awaiting approval, and
 * a rejected one. Non-approved shops carry inventory but no sales (selling is
 * blocked until approval — matching the backend's requireApprovedShop gate).
 */
export const PHARMACIES: PharmacyDef[] = [
  { key: 'medplus', name: 'MedPlus Central', ownerName: 'Rajesh Khanna', status: 'approved', subscription: 'active', plan: 'Pro', staffCount: 2, medicineCount: 55, dealerCount: 5, billCount: 220 },
  { key: 'apollo', name: 'Apollo Care Pharmacy', ownerName: 'Sunita Reddy', status: 'approved', subscription: 'active', plan: 'Basic', staffCount: 2, medicineCount: 48, dealerCount: 4, billCount: 185 },
  { key: 'wellness', name: 'Wellness Forever', ownerName: 'Vikram Desai', status: 'approved', subscription: 'trialing', plan: null, staffCount: 1, medicineCount: 45, dealerCount: 4, billCount: 140 },
  { key: 'healthfirst', name: 'HealthFirst Chemists', ownerName: 'Priya Nair', status: 'approved', subscription: 'trialing_expired', plan: null, staffCount: 1, medicineCount: 42, dealerCount: 3, billCount: 120 },
  { key: 'citymeds', name: 'CityMeds Pharmacy', ownerName: 'Arjun Mehta', status: 'approved', subscription: 'past_due', plan: 'Basic', staffCount: 2, medicineCount: 50, dealerCount: 4, billCount: 160 },
  { key: 'greenleaf', name: 'GreenLeaf Pharmacy', ownerName: 'Meera Iyer', status: 'approved', subscription: 'canceled', plan: 'Pro', staffCount: 1, medicineCount: 40, dealerCount: 3, billCount: 105 },
  { key: 'sunrise', name: 'Sunrise Medical Store', ownerName: 'Deepak Verma', status: 'pending', subscription: 'trialing', plan: null, staffCount: 1, medicineCount: 18, dealerCount: 2, billCount: 0 },
  { key: 'janata', name: 'Janata Medicals', ownerName: 'Imran Sheikh', status: 'rejected', subscription: 'trialing', plan: null, staffCount: 0, medicineCount: 6, dealerCount: 1, billCount: 0, rejectionReason: 'License number could not be verified against the state pharmacy council registry.' },
];

export const CUSTOMER_NAMES = [
  'Walk-in Customer', 'Ramesh Babu', 'Lakshmi Devi', 'Mohan Das', 'Geeta Kumari', 'Suresh Menon',
  'Anjali Rao', 'Prakash Jha', 'Sushma Pillai', 'Vinod Kumar', 'Rekha Singh', 'Naveen Chandra',
];
