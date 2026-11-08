/**
 * Starter diagnostic-test vocabulary (names and categories only). It contains no prices, turnaround times or
 * preparation advice: admins add and verify those. Safe to load into any environment.
 */
export const CATEGORIES: [string, string][] = [
  ["Blood Tests", "Everyday blood counts and infection markers"], ["Diabetes", "Blood sugar monitoring and screening"],
  ["Thyroid", "Thyroid function tests"], ["Liver Function", "Liver enzymes and bilirubin"], ["Kidney Function", "Kidney markers and urine tests"],
  ["Lipid Profile", "Cholesterol and related lipids"], ["Vitamin Tests", "Vitamin and mineral levels"], ["Hormones", "Reproductive and stress hormones"],
  ["Cardiac Tests", "Heart-related markers and ECG"], ["Complete Health Checkups", "Bundled screening packages"], ["Radiology", "X-ray and ultrasound imaging"],
];

// [name, category, isPackage]
export const TESTS: [string, string, boolean][] = [
  ["Complete Blood Count (CBC)", "Blood Tests", false], ["Erythrocyte Sedimentation Rate (ESR)", "Blood Tests", false], ["Hemoglobin", "Blood Tests", false],
  ["Blood Group & Rh Typing", "Blood Tests", false], ["Dengue NS1 Antigen", "Blood Tests", false], ["Typhoid IgM (Typhidot)", "Blood Tests", false], ["C-Reactive Protein (CRP)", "Blood Tests", false],
  ["Fasting Blood Sugar", "Diabetes", false], ["Postprandial Blood Sugar", "Diabetes", false], ["HbA1c (Glycated Hemoglobin)", "Diabetes", false], ["Urine Microalbumin", "Diabetes", false],
  ["TSH (Thyroid Stimulating Hormone)", "Thyroid", false], ["Free T3", "Thyroid", false], ["Free T4", "Thyroid", false], ["Thyroid Profile (T3, T4, TSH)", "Thyroid", true], ["Anti-TPO Antibodies", "Thyroid", false],
  ["Liver Function Test (LFT)", "Liver Function", true], ["SGPT (ALT)", "Liver Function", false], ["SGOT (AST)", "Liver Function", false], ["Bilirubin (Total & Direct)", "Liver Function", false],
  ["Kidney Function Test (KFT)", "Kidney Function", true], ["Serum Creatinine", "Kidney Function", false], ["Blood Urea", "Kidney Function", false], ["Uric Acid", "Kidney Function", false], ["Urine Routine & Microscopy", "Kidney Function", false],
  ["Lipid Profile", "Lipid Profile", true], ["HDL Cholesterol", "Lipid Profile", false], ["LDL Cholesterol (Direct)", "Lipid Profile", false],
  ["Vitamin D (25-OH)", "Vitamin Tests", false], ["Vitamin B12", "Vitamin Tests", false], ["Iron Studies", "Vitamin Tests", true], ["Serum Calcium", "Vitamin Tests", false],
  ["Prolactin", "Hormones", false], ["Testosterone (Total)", "Hormones", false], ["Cortisol (Morning)", "Hormones", false],
  ["Troponin I", "Cardiac Tests", false], ["hs-CRP (Cardiac Risk)", "Cardiac Tests", false],
  ["Basic Health Checkup", "Complete Health Checkups", true], ["Comprehensive Full Body Checkup", "Complete Health Checkups", true],
  ["Chest X-Ray (PA View)", "Radiology", false], ["Ultrasound Abdomen", "Radiology", false],
];
