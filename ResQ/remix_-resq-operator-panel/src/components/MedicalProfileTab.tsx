import { useState } from 'react';

interface Patient {
  name: string;
  dob: string;
  sex: string;
  bloodType: string;
  height: string;
  weight: string;
  policyId: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

interface MedicalProfileTabProps {
  addLog: (msg: string) => void;
}

export default function MedicalProfileTab({ addLog }: MedicalProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [patient, setPatient] = useState<Patient>({
    name: 'John Doe',
    dob: '09/14/1984',
    sex: 'Male',
    bloodType: 'O-',
    height: '182 cm',
    weight: '79 kg',
    policyId: 'BCS-994-82A-X',
    allergies: ['Penicillin', 'Latex', 'Peanuts'],
    conditions: ['Type 1 Diabetes', 'Hypertension', 'Asthma'],
    medications: ['Lisinopril (20mg QD)', 'Lantus (24 Units QHS)', 'Albuterol (HFA MDI PRN)'],
  });

  const [newAllergen, setNewAllergen] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  const handleEditToggle = () => {
    if (isEditing) {
      addLog(`DOSSIER: Patient clinical profile for [John Doe] updated on local emergency cache.`);
      alert('Patient dossier successfully updated and pushed.');
    }
    setIsEditing(!isEditing);
  };

  const removeItem = (type: 'allergies' | 'conditions' | 'medications', index: number) => {
    setPatient((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const addItem = (type: 'allergies' | 'conditions' | 'medications', val: string, setter: (v: string) => void) => {
    if (!val.trim()) return;
    setPatient((prev) => ({
      ...prev,
      [type]: [...prev[type], val.trim()],
    }));
    setter('');
  };

  const handleInitiateComms = () => {
    addLog(`COMMS: Paging telemetry cell of primary physician Dr. Dyson...`);
    alert('Simulated Outbound Link Protocol Active:\nDossier shared with responding physician Dr. Miles Dyson via secure clinician portal.');
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 overflow-y-auto text-on-surface">
      {/* Dossier Header Banner */}
      <div className="flex justify-between items-center border-l-4 border-[#4fdbcc] pl-3 mb-4 shrink-0">
        <div>
          <h1 className="font-display text-lg font-black uppercase tracking-tight text-white leading-none">MEDICAL PROFILE</h1>
          <span className="font-mono text-[9px] text-[#4fdbcc] font-bold uppercase tracking-widest mt-1 inline-block">
            DOSSIER STATUS: VERIFIED SHIELDED
          </span>
        </div>
        <button
          onClick={handleEditToggle}
          className="bg-[#161b2b] hover:bg-surface-bright border border-surface-variant text-[10px] font-mono font-bold uppercase px-3 py-1.5 text-[#4fdbcc] cursor-pointer"
        >
          {isEditing ? 'COMMIT RECORDS' : 'EDIT DOSSIER'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Grid: Demographic Data Dossier Sheet */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3">
            <span className="font-display text-xs font-bold text-[#4fdbcc] uppercase tracking-wider border-b border-surface-variant pb-2">
              Clinical Physical Parameters
            </span>

            {isEditing ? (
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-on-surface-variant">FULL NAME</label>
                    <input
                      type="text"
                      value={patient.name}
                      onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-on-surface-variant">DOB (MM/DD/YYYY)</label>
                    <input
                      type="text"
                      value={patient.dob}
                      onChange={(e) => setPatient({ ...patient, dob: e.target.value })}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-on-surface-variant">SEX</label>
                    <input
                      type="text"
                      value={patient.sex}
                      onChange={(e) => setPatient({ ...patient, sex: e.target.value })}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-on-surface-variant">HEIGHT</label>
                    <input
                      type="text"
                      value={patient.height}
                      onChange={(e) => setPatient({ ...patient, height: e.target.value })}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-on-surface-variant">WEIGHT</label>
                    <input
                      type="text"
                      value={patient.weight}
                      onChange={(e) => setPatient({ ...patient, weight: e.target.value })}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[11px] bg-[#090e1c] p-3 border border-surface-variant/40">
                <div>
                  <span className="text-on-surface-variant uppercase font-bold text-[9px] block">SUBJECT NAME</span>
                  <span className="text-white text-sm font-bold mt-1 block uppercase">{patient.name}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase font-bold text-[9px] block">DOB (MM/DD/YYYY)</span>
                  <span className="text-white text-sm font-bold mt-1 block">{patient.dob}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase font-bold text-[9px] block">SEX CODE</span>
                  <span className="text-white text-xs font-bold mt-1 block uppercase">{patient.sex}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant uppercase font-bold text-[9px] block">PHYSICAL STATS</span>
                  <span className="text-white text-xs font-bold mt-1 block uppercase">
                    H: {patient.height} | W: {patient.weight}
                  </span>
                </div>
              </div>
            )}

            {/* Giant Blood Type Badge Mockup */}
            <div className="bg-[#090e1c] border border-surface-variant p-4 flex gap-4 items-center mt-1">
              <div className="w-16 h-16 bg-[#ff535b]/10 border border-[#ff535b]/50 text-headline-lg flex items-center justify-center font-display font-extrabold text-[#ff535b] text-4xl shrink-0">
                {patient.bloodType}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display font-black text-white text-xs uppercase tracking-wide">
                  BLOOD GROUP OUTLINE
                </span>
                <span className="font-mono text-[10px] text-[#ff535b] font-bold mt-0.5">
                  UNIVERSAL DONOR MATCH AVAILABLE
                </span>
                <span className="font-sans text-[10px] text-on-surface-variant mt-1">
                  Critical priority flags set for immediate clinical transfusion on route index.
                </span>
              </div>
            </div>

            {/* Billing Insurance Code block */}
            <div className="bg-[#090e1c] border border-surface-variant p-3 font-mono text-[10.5px]">
              <div className="flex justify-between items-center border-b border-surface-variant/30 pb-1 mb-2">
                <span className="text-[#4fdbcc] font-bold uppercase text-[9px]">INSURANCE LEDGER</span>
                <span className="text-secondary font-bold text-[8px] animate-pulse">VALIDATED ACTIVE</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-on-surface-variant">BILLING PROVIDER:</span>
                <span className="text-white font-bold uppercase">BlueCross Shield</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-on-surface-variant">POLICY CODE:</span>
                <span className="text-white font-bold">{patient.policyId}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-on-surface-variant">ROUTING GROUP:</span>
                <span className="text-white font-bold">BC-99-L // CLINIC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Grid: Allergies, Conditions & Meds */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3">
            {/* Allergies list section */}
            <div className="border-b border-surface-variant/40 pb-2.5">
              <span className="font-display text-xs font-bold text-[#4fdbcc] uppercase tracking-wider block mb-2">
                Critical Clinical Allergies
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {patient.allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="bg-[#2a0e10] text-[#ff535b] border border-[#ff535b]/30 px-2 py-1 uppercase font-bold flex items-center gap-1"
                  >
                    <span>{allergy}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeItem('allergies', i)}
                        className="text-[#ff535b] hover:text-white font-bold ml-1"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-2 font-mono text-[11px]">
                  <input
                    type="text"
                    placeholder="New Allergen..."
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    className="bg-[#090e1c] border border-surface-variant px-2 py-1 flex-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => addItem('allergies', newAllergen, setNewAllergen)}
                    className="bg-[#4fdbcc] text-black px-2 py-1 font-bold"
                  >
                    ADD
                  </button>
                </div>
              )}
            </div>

            {/* Chronic Conditions list section */}
            <div className="border-b border-surface-variant/40 pb-2.5">
              <span className="font-display text-xs font-bold text-[#4fdbcc] uppercase tracking-wider block mb-2">
                Diagnosed Chronic Conditions
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                {patient.conditions.map((cond, i) => (
                  <span
                    key={i}
                    className="bg-surface/60 border border-surface-variant px-2 py-1 text-on-surface uppercase font-bold flex items-center gap-1"
                  >
                    <span>{cond}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeItem('conditions', i)}
                        className="text-red-400 hover:text-white font-bold ml-1"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-2 font-mono text-[11px]">
                  <input
                    type="text"
                    placeholder="New Condition..."
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="bg-[#090e1c] border border-surface-variant px-2 py-1 flex-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => addItem('conditions', newCondition, setNewCondition)}
                    className="bg-[#4fdbcc] text-black px-2 py-1 font-bold"
                  >
                    ADD
                  </button>
                </div>
              )}
            </div>

            {/* Active Medications list section */}
            <div>
              <span className="font-display text-xs font-bold text-[#4fdbcc] uppercase tracking-wider block mb-2">
                Active Clinician Prescriptions
              </span>
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                {patient.medications.map((med, i) => (
                  <div
                    key={i}
                    className="bg-[#090e1c] border border-surface-variant/50 p-2 text-on-surface uppercase font-semibold flex justify-between items-center"
                  >
                    <span>{med}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => removeItem('medications', i)}
                        className="text-red-400 hover:text-white font-extrabold text-sm px-1.5 font-mono"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2 mt-2 font-mono text-[11px]">
                  <input
                    type="text"
                    placeholder="New Prescription/Dosage..."
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    className="bg-[#090e1c] border border-surface-variant px-2 py-1 flex-1 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => addItem('medications', newMedication, setNewMedication)}
                    className="bg-[#4fdbcc] text-black px-2 py-1 font-bold"
                  >
                    ADD
                  </button>
                </div>
              )}
            </div>

            {/* Initiate Comms outbound sharing button */}
            <button
              onClick={handleInitiateComms}
              className="mt-3 w-full bg-surface-container-high hover:bg-[#4fdbcc]/10 hover:text-[#4fdbcc] hover:border-[#4fdbcc] border border-surface-variant py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              INITIATE SECURE CLINICIAN ROUTE SHARE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
