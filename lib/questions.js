// Sample practice questions. Replace / extend these with your own question bank.
// Fields: id, subject, chapter, q, options (4), answer (0-based index of correct option), explanation.

import { pyqTests, pyqQuestionsForTest } from "./pyq";

export const questions = [
  // ---------- PHYSICS ----------
  {
    id: "p1", subject: "Physics", chapter: "Electromagnetic Induction",
    q: "The SI unit of magnetic flux is:",
    options: ["Tesla", "Weber", "Henry", "Gauss"],
    answer: 1,
    explanation: "Magnetic flux = B × A, measured in weber (Wb). Tesla is the unit of magnetic field.",
  },
  {
    id: "p2", subject: "Physics", chapter: "Work, Energy and Power",
    q: "A body of mass 2 kg moves with a speed of 3 m/s. Its kinetic energy is:",
    options: ["3 J", "6 J", "9 J", "18 J"],
    answer: 2,
    explanation: "KE = ½mv² = ½ × 2 × 9 = 9 J.",
  },
  {
    id: "p3", subject: "Physics", chapter: "Ray Optics",
    q: "Which mirror is commonly used as a rear-view mirror in vehicles?",
    options: ["Plane mirror", "Concave mirror", "Convex mirror", "Cylindrical mirror"],
    answer: 2,
    explanation: "A convex mirror always forms a virtual, erect, diminished image and gives a wider field of view.",
  },
  {
    id: "p4", subject: "Physics", chapter: "Units and Dimensions",
    q: "The dimensional formula of force is:",
    options: ["[M L T⁻¹]", "[M L² T⁻²]", "[M L T⁻²]", "[M L⁻¹ T⁻²]"],
    answer: 2,
    explanation: "Force = mass × acceleration = M × L T⁻² = [M L T⁻²].",
  },
  {
    id: "p5", subject: "Physics", chapter: "Current Electricity",
    q: "The SI unit of resistivity is:",
    options: ["ohm", "ohm per metre", "ohm metre", "siemens"],
    answer: 2,
    explanation: "ρ = RA/L, so unit = Ω·m² / m = Ω·m.",
  },

  // ---------- CHEMISTRY ----------
  {
    id: "c1", subject: "Chemistry", chapter: "Chemical Bonding",
    q: "The hybridisation of carbon atoms in ethene (C₂H₄) is:",
    options: ["sp", "sp²", "sp³", "sp³d"],
    answer: 1,
    explanation: "Each carbon in ethene forms three sigma bonds and one pi bond, so it is sp² hybridised.",
  },
  {
    id: "c2", subject: "Chemistry", chapter: "Equilibrium",
    q: "The pH of a 0.01 M HCl solution is:",
    options: ["1", "2", "12", "0.01"],
    answer: 1,
    explanation: "HCl is a strong acid: [H⁺] = 10⁻² M, so pH = 2.",
  },
  {
    id: "c3", subject: "Chemistry", chapter: "Periodic Table",
    q: "Which of the following is a noble gas?",
    options: ["Nitrogen", "Argon", "Chlorine", "Hydrogen"],
    answer: 1,
    explanation: "Argon (Group 18) is a noble gas.",
  },
  {
    id: "c4", subject: "Chemistry", chapter: "Organic Chemistry – Nomenclature",
    q: "The IUPAC name of CH₃–CH₂–OH is:",
    options: ["Methanol", "Ethanol", "Propanol", "Ethanal"],
    answer: 1,
    explanation: "Two carbons with an –OH group: ethanol.",
  },
  {
    id: "c5", subject: "Chemistry", chapter: "Some Basic Concepts of Chemistry",
    q: "The value of Avogadro's number is approximately:",
    options: ["6.022 × 10²³", "6.022 × 10²⁰", "6.626 × 10⁻³⁴", "1.602 × 10⁻¹⁹"],
    answer: 0,
    explanation: "One mole contains 6.022 × 10²³ particles.",
  },

  // ---------- BIOLOGY ----------
  {
    id: "b1", subject: "Biology", chapter: "Cell: The Unit of Life",
    q: "Which cell organelle is known as the powerhouse of the cell?",
    options: ["Ribosome", "Golgi apparatus", "Mitochondria", "Lysosome"],
    answer: 2,
    explanation: "Mitochondria produce most of the cell's ATP through oxidative phosphorylation.",
  },
  {
    id: "b2", subject: "Biology", chapter: "Body Fluids and Circulation",
    q: "Which blood group is called the universal donor (for red cells)?",
    options: ["AB positive", "A negative", "B positive", "O negative"],
    answer: 3,
    explanation: "O negative red cells carry neither A, B nor Rh antigens.",
  },
  {
    id: "b3", subject: "Biology", chapter: "Photosynthesis",
    q: "The site of photosynthesis in a plant cell is the:",
    options: ["Mitochondrion", "Chloroplast", "Nucleus", "Vacuole"],
    answer: 1,
    explanation: "Chloroplasts contain chlorophyll and carry out the light and dark reactions.",
  },
  {
    id: "b4", subject: "Biology", chapter: "Molecular Basis of Inheritance",
    q: "The double-helix model of DNA was proposed by:",
    options: ["Meselson and Stahl", "Watson and Crick", "Hershey and Chase", "Griffith"],
    answer: 1,
    explanation: "Watson and Crick proposed the double-helix model in 1953.",
  },
  {
    id: "b5", subject: "Biology", chapter: "Molecular Basis of Inheritance",
    q: "Which enzyme unwinds the DNA double helix during replication?",
    options: ["DNA ligase", "DNA polymerase", "Helicase", "Primase"],
    answer: 2,
    explanation: "Helicase breaks hydrogen bonds between base pairs at the replication fork.",
  },
];

const baseTests = [
  { id: "full-mock-1", title: "Full Mock Test 1", type: "Full Length", subjects: ["Physics", "Chemistry", "Biology"], minutes: 30 },
  { id: "physics-quick", title: "Physics Quick Test", type: "Subject-wise", subjects: ["Physics"], minutes: 10 },
  { id: "chemistry-quick", title: "Chemistry Quick Test", type: "Subject-wise", subjects: ["Chemistry"], minutes: 10 },
  { id: "biology-quick", title: "Biology Quick Test", type: "Subject-wise", subjects: ["Biology"], minutes: 10 },
];

// practice tests + any previous-year papers that have been loaded into data/pyq
export const tests = [...baseTests, ...pyqTests];

export function getTest(id) {
  return tests.find((t) => t.id === id);
}

export function getQuestionsFor(test) {
  const pyq = pyqQuestionsForTest(test);
  if (pyq) return pyq;
  return questions.filter((q) => test.subjects.includes(q.subject));
}
