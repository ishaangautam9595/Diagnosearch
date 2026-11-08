/** SYNTHETIC DEMO DATA. Every laboratory, patient and request here is fictional and flagged isDemo where applicable. */
export const CATEGORIES = [
  ["Blood Tests", "Everyday blood counts and infection markers"], ["Diabetes", "Blood sugar monitoring and screening"],
  ["Thyroid", "Thyroid function tests"], ["Liver Function", "Liver enzymes and bilirubin"], ["Kidney Function", "Kidney markers and urine tests"],
  ["Lipid Profile", "Cholesterol and related lipids"], ["Vitamin Tests", "Vitamin and mineral levels"], ["Hormones", "Reproductive and stress hormones"],
  ["Cardiac Tests", "Heart-related markers and ECG"], ["Complete Health Checkups", "Bundled screening packages"], ["Radiology", "X-ray and ultrasound imaging"],
] as const;

// [name, category, sampleType, turnaroundHours, isPackage]
export const TESTS: [string, string, string, number, boolean][] = [
  ["Complete Blood Count (CBC)", "Blood Tests", "Blood (EDTA)", 6, false], ["Erythrocyte Sedimentation Rate (ESR)", "Blood Tests", "Blood (EDTA)", 6, false],
  ["Hemoglobin", "Blood Tests", "Blood (EDTA)", 4, false], ["Blood Group & Rh Typing", "Blood Tests", "Blood (EDTA)", 6, false],
  ["Dengue NS1 Antigen", "Blood Tests", "Serum", 12, false], ["Typhoid IgM (Typhidot)", "Blood Tests", "Serum", 24, false], ["C-Reactive Protein (CRP)", "Blood Tests", "Serum", 12, false],
  ["Fasting Blood Sugar", "Diabetes", "Plasma (fluoride)", 4, false], ["Postprandial Blood Sugar", "Diabetes", "Plasma (fluoride)", 4, false],
  ["HbA1c (Glycated Hemoglobin)", "Diabetes", "Blood (EDTA)", 12, false], ["Urine Microalbumin", "Diabetes", "Urine", 24, false],
  ["TSH (Thyroid Stimulating Hormone)", "Thyroid", "Serum", 12, false], ["Free T3", "Thyroid", "Serum", 24, false], ["Free T4", "Thyroid", "Serum", 24, false],
  ["Thyroid Profile (T3, T4, TSH)", "Thyroid", "Serum", 24, true], ["Anti-TPO Antibodies", "Thyroid", "Serum", 48, false],
  ["Liver Function Test (LFT)", "Liver Function", "Serum", 12, true], ["SGPT (ALT)", "Liver Function", "Serum", 12, false], ["SGOT (AST)", "Liver Function", "Serum", 12, false],
  ["Bilirubin (Total & Direct)", "Liver Function", "Serum", 12, false], ["Kidney Function Test (KFT)", "Kidney Function", "Serum", 12, true],
  ["Serum Creatinine", "Kidney Function", "Serum", 6, false], ["Blood Urea", "Kidney Function", "Serum", 6, false], ["Uric Acid", "Kidney Function", "Serum", 6, false],
  ["Urine Routine & Microscopy", "Kidney Function", "Urine", 6, false], ["Lipid Profile", "Lipid Profile", "Serum", 12, true], ["HDL Cholesterol", "Lipid Profile", "Serum", 12, false],
  ["LDL Cholesterol (Direct)", "Lipid Profile", "Serum", 12, false], ["Vitamin D (25-OH)", "Vitamin Tests", "Serum", 24, false], ["Vitamin B12", "Vitamin Tests", "Serum", 24, false],
  ["Iron Studies", "Vitamin Tests", "Serum", 24, true], ["Serum Calcium", "Vitamin Tests", "Serum", 6, false], ["Prolactin", "Hormones", "Serum", 24, false],
  ["Testosterone (Total)", "Hormones", "Serum", 24, false], ["Troponin I", "Cardiac Tests", "Serum", 6, false], ["hs-CRP (Cardiac Risk)", "Cardiac Tests", "Serum", 24, false],
  ["Basic Health Checkup", "Complete Health Checkups", "Blood + Urine", 24, true], ["Comprehensive Full Body Checkup", "Complete Health Checkups", "Blood + Urine", 48, true],
  ["Chest X-Ray (PA View)", "Radiology", "Imaging", 4, false], ["Ultrasound Abdomen", "Radiology", "Imaging", 6, false],
];

export interface DemoLab { name: string; branches: { label: string; line1: string; pincode: string; lat: number; lng: number }[]; verified: boolean; home: boolean; hours: string; phone: string }
export const LABS: DemoLab[] = [
  { name: "CityCare Diagnostics", branches: [{ label: "Koramangala", line1: "12, 5th Block, 80 Feet Road", pincode: "560034", lat: 12.9345, lng: 77.6205 }, { label: "Indiranagar", line1: "45, 12th Main, HAL 2nd Stage", pincode: "560038", lat: 12.9719, lng: 77.6412 }], verified: true, home: true, hours: "Mon–Sat 6:30 AM – 8:00 PM", phone: "9845000001" },
  { name: "Aarogya Labs", branches: [{ label: "Main", line1: "100 Feet Road, Indiranagar", pincode: "560038", lat: 12.9784, lng: 77.6408 }], verified: true, home: true, hours: "Daily 6:00 AM – 9:00 PM", phone: "9845000002" },
  { name: "HealthFirst Pathology", branches: [{ label: "HSR", line1: "Sector 2, 27th Main Road", pincode: "560102", lat: 12.9121, lng: 77.6446 }], verified: true, home: true, hours: "Mon–Sat 7:00 AM – 7:00 PM", phone: "9845000003" },
  { name: "Sanjeevani Diagnostic Centre", branches: [{ label: "Jayanagar", line1: "4th Block, 11th Main", pincode: "560011", lat: 12.9299, lng: 77.5835 }], verified: true, home: false, hours: "Mon–Sat 7:00 AM – 6:30 PM", phone: "9845000004" },
  { name: "MediScan Imaging & Labs", branches: [{ label: "Whitefield", line1: "ITPL Main Road, Brookefield", pincode: "560066", lat: 12.9698, lng: 77.7499 }], verified: false, home: true, hours: "Daily 7:00 AM – 8:00 PM", phone: "9845000005" },
  { name: "Prime Path Labs", branches: [{ label: "Marathahalli", line1: "Outer Ring Road, Kundalahalli Gate", pincode: "560037", lat: 12.9568, lng: 77.7011 }], verified: false, home: true, hours: "Mon–Sat 6:30 AM – 8:30 PM", phone: "9845000006" },
  { name: "Nirmal Clinical Laboratory", branches: [{ label: "Malleshwaram", line1: "8th Cross, Sampige Road", pincode: "560003", lat: 13.0031, lng: 77.5643 }], verified: true, home: false, hours: "Mon–Sat 7:00 AM – 7:00 PM", phone: "9845000007" },
  { name: "TechCity Health Labs", branches: [{ label: "Electronic City", line1: "Phase 1, Neeladri Road", pincode: "560100", lat: 12.8458, lng: 77.6692 }], verified: false, home: true, hours: "Mon–Sat 7:00 AM – 7:00 PM", phone: "9845000008" },
  { name: "WellNest Diagnostics", branches: [{ label: "Koramangala", line1: "7th Block, Jyothi Nivas College Road", pincode: "560095", lat: 12.9347, lng: 77.6101 }], verified: true, home: true, hours: "Daily 6:00 AM – 10:00 PM", phone: "9845000009" },
  { name: "Delhi Central Labs (DEMO, far away)", branches: [{ label: "Connaught Place", line1: "Block A, Connaught Place", pincode: "110001", lat: 28.6315, lng: 77.2167 }], verified: true, home: true, hours: "Daily 7:00 AM – 9:00 PM", phone: "9845000010" },
];
