// Exam → subject structure (NurseHub-style: pick an exam, then a subject area).
export const EXAMS = {
  "NCLEX-RN": {
    blurb: "Licensure exam for registered nurses, organized by Client Needs.",
    subjects: [
      "Management of Care", "Safety & Infection Control", "Health Promotion & Maintenance",
      "Psychosocial Integrity", "Basic Care & Comfort", "Pharmacological & Parenteral Therapies",
      "Reduction of Risk Potential", "Physiological Adaptation",
    ],
  },
  "NCLEX-PN": {
    blurb: "Licensure exam for practical/vocational nurses, organized by Client Needs.",
    subjects: [
      "Coordinated Care", "Safety & Infection Control", "Health Promotion & Maintenance",
      "Psychosocial Integrity", "Basic Care & Comfort", "Pharmacological Therapies",
      "Reduction of Risk Potential", "Physiological Adaptation",
    ],
  },
  "TEAS 7": {
    blurb: "Nursing school entrance exam: reading, math, science, and English.",
    subjects: ["Reading", "Math", "Science", "English & Language Usage"],
  },
  "HESI A2": {
    blurb: "Nursing school entrance exam with academic and science sections.",
    subjects: ["Math", "Reading Comprehension", "Vocabulary", "Grammar", "Biology", "Chemistry", "Anatomy & Physiology", "Physics"],
  },
};
export const EXAM_NAMES = Object.keys(EXAMS);

// The PN outline uses slightly different names for two categories; share the RN bank for those.
const ALIAS = { "Coordinated Care": "Management of Care", "Pharmacological Therapies": "Pharmacological & Parenteral Therapies" };

const q = (exam, subject, stem, options, answers, rationale, type) => ({
  exam, subject, stem, options, answers: Array.isArray(answers) ? answers : [answers], rationale,
  type: type || (Array.isArray(answers) && answers.length > 1 ? "sata" : "single"),
});
const RN = "NCLEX-RN";

// Starter bank — works with no AI and no sign-in. AI fills in the rest.
export const BANK = [
  // ---- NCLEX ----
  q(RN, "Management of Care", "A nurse receives report on four clients. Which client should the nurse assess first?",
    ["A client with COPD whose SpO2 is 90% on 2 L nasal cannula", "A client 6 hours after thyroidectomy who has new noisy, high-pitched breathing", "A client with type 2 diabetes whose pre-lunch glucose is 182 mg/dL", "A client 2 hours after hip surgery rating pain 6 of 10"],
    1, "New stridor after thyroidectomy signals airway obstruction from edema, hematoma, or laryngeal nerve injury — an airway emergency. SpO2 of 88–92% is often an expected target in COPD, a glucose of 182 needs follow-up but isn't immediately life-threatening, and post-op pain of 6/10 is expected and can be addressed after the airway threat."),
  q(RN, "Management of Care", "Which task can the RN delegate to an unlicensed assistive person (UAP)?",
    ["Admission assessment of a new client", "Teaching a client to use an incentive spirometer", "Measuring vital signs on a stable post-op client", "Evaluating a client's response to IV pain medication"],
    2, "UAPs can collect routine data like vital signs on stable clients. Assessment, teaching, and evaluation stay with the RN because they require nursing judgment."),
  q(RN, "Safety & Infection Control", "When leaving the room of a client with Clostridioides difficile, which hand hygiene is most appropriate?",
    ["Alcohol-based hand rub", "Soap and water", "Removing gloves is enough", "Antiseptic wipe"],
    1, "C. diff forms spores that alcohol doesn't reliably kill. Washing with soap and water physically removes the spores. The client also needs contact precautions."),
  q(RN, "Health Promotion & Maintenance", "Which vaccine is contraindicated during pregnancy?",
    ["Tdap", "Inactivated influenza", "Measles, mumps, rubella (MMR)", "Hepatitis B"],
    2, "MMR is a live attenuated vaccine and is avoided during pregnancy; it's given before conception or postpartum. Tdap and inactivated influenza are recommended in pregnancy, and hepatitis B vaccine can be given when indicated."),
  q(RN, "Psychosocial Integrity", "A client recovering from a stroke says, \"I don't think I'll ever get better.\" Which response by the nurse is most therapeutic?",
    ["\"Don't worry, you're doing great.\"", "\"You sound discouraged about your recovery.\"", "\"Why do you feel that way?\"", "\"Let's talk about something more positive.\""],
    1, "Reflecting the client's feeling invites them to keep talking. False reassurance dismisses the concern, \"why\" questions can feel accusatory, and changing the subject blocks communication."),
  q(RN, "Basic Care & Comfort", "Which action best helps prevent pressure injuries in a client on bed rest?",
    ["Massage reddened areas over bony prominences", "Keep the head of the bed at 60 degrees", "Reposition the client at least every 2 hours", "Reposition the client every 4 hours"],
    2, "Turning at least every 2 hours relieves pressure. Massaging reddened areas can damage tissue, and raising the head of the bed above 30 degrees increases shear on the sacrum."),
  q(RN, "Pharmacological & Parenteral Therapies", "Before giving digoxin to an adult, the nurse counts an apical pulse of 54 beats/min. What should the nurse do?",
    ["Give the dose and recheck the pulse in an hour", "Hold the dose and notify the provider", "Give half the dose", "Have the client walk, then recount"],
    1, "Digoxin slows the heart rate. In adults, the dose is typically held for an apical pulse below 60 and the provider is notified. The nurse never adjusts the dose independently."),
  q(RN, "Pharmacological & Parenteral Therapies", "The order is amoxicillin 500 mg PO. The suspension on hand is 250 mg/5 mL. How many mL should the nurse give?",
    ["2.5 mL", "5 mL", "10 mL", "20 mL"],
    2, "Desired ÷ have × quantity: 500 mg ÷ 250 mg × 5 mL = 10 mL. Sense check: the dose is twice the strength per 5 mL, so the volume doubles."),
  q(RN, "Pharmacological & Parenteral Therapies", "A client taking warfarin has an INR of 6.2 and bleeding gums. Which medication should the nurse anticipate?",
    ["Protamine sulfate", "Vitamin K (phytonadione)", "Naloxone", "Flumazenil"],
    1, "Vitamin K reverses warfarin. Protamine reverses heparin, naloxone reverses opioids, and flumazenil reverses benzodiazepines."),
  q(RN, "Pharmacological & Parenteral Therapies", "Which insulin can be given intravenously?",
    ["Glargine", "NPH", "Regular", "Detemir"],
    2, "Regular (short-acting) insulin is the type given IV, such as in an insulin infusion for DKA. Glargine and detemir are long-acting and NPH is intermediate-acting — none are given IV."),
  q(RN, "Reduction of Risk Potential", "A client is scheduled for a CT scan with IV contrast. Which lab result should the nurse report before the scan?",
    ["Hemoglobin 14 g/dL", "Serum sodium 140 mEq/L", "Serum creatinine 2.4 mg/dL", "Fasting glucose 98 mg/dL"],
    2, "IV contrast can worsen kidney function, and a creatinine of 2.4 mg/dL is well above normal (about 0.6–1.2), so the provider needs to know before contrast is given. The other values are within normal limits."),
  q(RN, "Physiological Adaptation", "A client's serum potassium is 6.8 mEq/L. Which action should the nurse take first?",
    ["Encourage potassium-rich foods such as bananas", "Place the client on continuous cardiac monitoring", "Recheck the potassium level in 24 hours", "Administer the scheduled oral potassium supplement"],
    1, "Severe hyperkalemia can cause dysrhythmias and cardiac arrest, so continuous monitoring comes first while the provider is notified. Potassium foods or supplements would worsen it, and waiting delays urgent care."),
  q(RN, "Physiological Adaptation", "A client who is alert and able to swallow is shaky and sweaty. Their glucose is 58 mg/dL. What is the best first action?",
    ["Give 15 g of fast-acting carbohydrate, such as 4 oz of juice", "Give a meal with complex carbohydrates and protein", "Give IV dextrose 50%", "Give the scheduled insulin with lunch"],
    0, "For a conscious client who can swallow, follow the rule of 15: 15 g of fast-acting carbohydrate, then recheck in 15 minutes. IV dextrose or glucagon is for clients who can't safely swallow."),
  q(RN, "Physiological Adaptation", "Which findings are expected in a client with hypokalemia? Select all that apply.",
    ["Muscle weakness", "Tall, peaked T waves", "U waves on the ECG", "Hypoactive bowel sounds", "Hyperreflexia"],
    [0, 2, 3], "Low potassium weakens muscle contraction, slows the gut (hypoactive bowel sounds, constipation), and causes flattened T waves with U waves. Peaked T waves point to hyperkalemia, and hypokalemia causes decreased — not increased — reflexes.", "sata"),

  // ---- TEAS 7 ----
  q("TEAS 7", "Math", "What is 3/4 + 2/3?", ["5/7", "1 5/12", "6/12", "1 1/12"], 1,
    "Use a common denominator of 12: 9/12 + 8/12 = 17/12, which is 1 5/12."),
  q("TEAS 7", "Math", "A patient weighs 2.5 kg. Using 1 kg = 2.2 lb, what is the weight in pounds?", ["1.1 lb", "4.7 lb", "5.5 lb", "6.0 lb"], 2,
    "Multiply kilograms by 2.2: 2.5 × 2.2 = 5.5 lb."),
  q("TEAS 7", "Math", "What is 15% of 80?", ["8", "12", "15", "20"], 1, "0.15 × 80 = 12. Or find 10% (8) plus 5% (4) = 12."),
  q("TEAS 7", "Math", "Solve for x: 3x − 7 = 11", ["x = 4/3", "x = 6", "x = 18", "x = 3"], 1, "Add 7 to both sides (3x = 18), then divide by 3: x = 6."),
  q("TEAS 7", "Science", "Which organelle produces most of the cell's ATP?", ["Ribosome", "Golgi apparatus", "Mitochondrion", "Lysosome"], 2,
    "Mitochondria carry out aerobic respiration, producing most ATP. Ribosomes make proteins, the Golgi packages them, and lysosomes break down waste."),
  q("TEAS 7", "Science", "Blood leaving the right ventricle travels next to the:", ["Aorta", "Pulmonary artery", "Left atrium", "Superior vena cava"], 1,
    "The right ventricle pumps deoxygenated blood into the pulmonary artery toward the lungs. The aorta leaves the left ventricle."),
  q("TEAS 7", "Science", "A solution with a pH of 3 has how much greater hydrogen ion concentration than a solution with a pH of 5?", ["2 times", "10 times", "100 times", "1,000 times"], 2,
    "The pH scale is logarithmic: each whole number is a 10-fold change. Two steps = 10 × 10 = 100 times."),
  q("TEAS 7", "Science", "In an experiment, the variable the researcher deliberately changes is the:", ["Dependent variable", "Independent variable", "Controlled variable", "Confounding variable"], 1,
    "The independent variable is manipulated; the dependent variable is measured; controlled variables are kept the same."),
  q("TEAS 7", "English & Language Usage", "Which word in this sentence is an adverb? \"She quickly finished the difficult exam.\"", ["She", "quickly", "difficult", "exam"], 1,
    "\"Quickly\" describes how she finished (modifies the verb). \"Difficult\" is an adjective describing the noun \"exam.\""),
  q("TEAS 7", "English & Language Usage", "Choose the word that correctly completes the sentence: \"The clinic changed ___ visiting hours.\"", ["it's", "its", "its'", "it is"], 1,
    "\"Its\" is the possessive form. \"It's\" means \"it is,\" and \"its'\" is not a word."),
  q("TEAS 7", "Reading", "\"Before giving any medication, the nurse checked the patient's identification band and compared it with the medication record.\" What did the nurse do first?",
    ["Gave the medication", "Checked the identification band", "Updated the medication record", "Called the pharmacy"], 1,
    "The sentence says the nurse checked the ID band and compared it with the record before giving the medication."),

  // ---- HESI A2 ----
  q("HESI A2", "Math", "Write 0.6 as a fraction in lowest terms.", ["1/6", "3/5", "6/100", "2/3"], 1, "0.6 = 6/10, which reduces to 3/5."),
  q("HESI A2", "Math", "What is 1:30 PM in military time?", ["0130", "1130", "1330", "1530"], 2, "Add 12 to PM hours: 1 + 12 = 13, so 1:30 PM is 1330."),
  q("HESI A2", "Vocabulary", "\"Bilateral\" most nearly means:", ["Affecting one side", "Affecting both sides", "Occurring twice a day", "Below the surface"], 1,
    "\"Bi-\" means two and \"lateral\" means side, so bilateral means both sides."),
  q("HESI A2", "Vocabulary", "A patient described as \"lethargic\" is:", ["Agitated", "Sluggish and drowsy", "In severe pain", "Confused about time"], 1,
    "Lethargic means abnormally drowsy or sluggish, with reduced alertness."),
  q("HESI A2", "Vocabulary", "To \"exacerbate\" a condition is to:", ["Cure it", "Diagnose it", "Make it worse", "Prevent it"], 2, "Exacerbate means to worsen or intensify."),
  q("HESI A2", "Grammar", "Choose the correct verb: \"Neither the nurses nor the doctor ___ available.\"", ["were", "was", "are", "be"], 1,
    "With \"neither…nor,\" the verb agrees with the nearer subject. \"Doctor\" is singular, so \"was\" is correct."),
  q("HESI A2", "Biology", "In DNA, adenine pairs with:", ["Cytosine", "Guanine", "Thymine", "Uracil"], 2,
    "In DNA, adenine pairs with thymine and cytosine pairs with guanine. Uracil replaces thymine in RNA."),
  q("HESI A2", "Chemistry", "An element's atomic number equals its number of:", ["Neutrons", "Protons", "Electron shells", "Protons plus neutrons"], 1,
    "The atomic number is the number of protons. Protons plus neutrons is the mass number."),
  q("HESI A2", "Anatomy & Physiology", "What is the functional unit of the kidney?", ["Alveolus", "Nephron", "Neuron", "Glomerulus"], 1,
    "The nephron filters blood and forms urine. The glomerulus is one part of the nephron."),
  q("HESI A2", "Anatomy & Physiology", "Which cells produce insulin?", ["Alpha cells of the pancreas", "Beta cells of the pancreas", "Hepatocytes", "Adrenal cortex cells"], 1,
    "Beta cells in the pancreatic islets secrete insulin; alpha cells secrete glucagon."),
  q("HESI A2", "Physics", "What is the SI unit of force?", ["Joule", "Watt", "Newton", "Pascal"], 2,
    "Force is measured in newtons (kg·m/s²). Joules measure energy, watts measure power, and pascals measure pressure."),
  q("HESI A2", "Reading Comprehension", "\"Handwashing remains the single most effective way to prevent the spread of infection in healthcare settings.\" What is the main idea?",
    ["Healthcare settings are dangerous", "Handwashing is the most effective infection-prevention measure", "Infections cannot be prevented", "Gloves replace handwashing"], 1,
    "The sentence's central claim is that handwashing is the most effective way to prevent infection spread."),
];

export function bankFor(exam, subject) {
  const base = exam === "NCLEX-PN" ? RN : exam;
  const subj = ALIAS[subject] || subject;
  return BANK.filter((x) => x.exam === base && (!subject || x.subject === subj)).map((x) => ({ ...x, exam, subject: subject || x.subject }));
}

export function questionOfTheDay(exam) {
  const pool = bankFor(exam || RN);
  const list = pool.length ? pool : BANK;
  const day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
}

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
