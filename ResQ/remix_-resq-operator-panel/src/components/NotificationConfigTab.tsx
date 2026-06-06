import React, { useState } from 'react';

interface Contact {
  name: string;
  role: string;
  phone: string;
  type: string;
  enabled: boolean;
}

interface NotificationConfigTabProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  severity: string;
  incidentType: string;
  hospital: string;
  addLog: (msg: string) => void;
}

export default function NotificationConfigTab({
  contacts,
  setContacts,
  severity,
  incidentType,
  hospital,
  addLog,
}: NotificationConfigTabProps) {
  // Local state for sending pings
  const [isSending, setIsSending] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Primary');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Toggle contact configuration
  const handleToggleContact = (index: number) => {
    setContacts((prev) =>
      prev.map((c, idx) => {
        if (idx === index) {
          addLog(
            `CONFIG: Modified notification filter for [${c.name}]. Active: [${!c.enabled}]`
          );
          return { ...c, enabled: !c.enabled };
        }
        return c;
      })
    );
  };

  // Add new emergency contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert('Please fill out Name and Phone number.');
      return;
    }

    const item: Contact = {
      name: newContactName,
      role: newContactRole,
      phone: newContactPhone,
      type: 'Immediate SMS',
      enabled: true,
    };

    setContacts((prev) => [...prev, item]);
    addLog(`CONFIG: Registered new emergency trusted receiver: ${newContactName} (${newContactRole})`);
    setNewContactName('');
    setNewContactPhone('');
    setShowAddForm(false);
  };

  // Simulate test broadcast SMS ping
  const handleSendTestPing = () => {
    setIsSending(true);
    addLog('TEST_PING: Connecting to tactical cellular gateways...');
    
    setTimeout(() => {
      setIsSending(false);
      addLog(`TEST_PING: Broadcast payload delivered successfully to (${contacts.filter(c => c.enabled).length}) active receivers.`);
      alert('Success: Test SMS packet dispatched.\nAll active contacts received cellular confirmation.');
    }, 1200);
  };

  // Format message payload template dynamically based on global values
  const payloadFormat = {
    MSG: `EMERGENCY ALERT: MEDICAL DISPATCH ACTIVE IN YOUR ZONE. CASE SEVERITY: ${severity} [${incidentType}]`,
    LOC: `LAT: 34.0522 LON: -118.2437 (Ward 162 - Shivajinagar Core)`,
    STS: `AMBULANCE EN ROUTE | LIVE ETA SECS | HEADING TO ${hospital.toUpperCase()}`,
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 overflow-y-auto text-on-surface">
      {/* Tab Header Banner */}
      <div className="border-l-4 border-[#ffb780] pl-3 mb-4 shrink-0">
        <h1 className="font-display text-lg font-black uppercase tracking-tight text-white leading-none">NOTIFICATION CONFIG</h1>
        <span className="font-mono text-[9px] text-[#ffb780] font-bold uppercase tracking-widest">
          Manage automated emergency alerts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Trusted Contacts Bento Panel */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-surface-variant pb-2">
              <span className="font-display text-xs font-bold text-[#ffb780] uppercase tracking-wider">Trusted Contacts</span>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#2f3445] hover:bg-surface-bright border border-surface-variant text-[10px] font-mono font-bold uppercase px-2 py-1 text-on-surface select-none cursor-pointer"
              >
                {showAddForm ? 'Hide Form' : 'REGISTER NEW'}
              </button>
            </div>

            {/* Quick Registration Form */}
            {showAddForm && (
              <form onSubmit={handleAddContact} className="bg-surface p-3 border border-[#ffb780]/30 flex flex-col gap-2 animate-fade-in mb-1">
                <span className="font-mono text-[9px] text-white font-bold uppercase tracking-wider">Add Connection</span>
                <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                  <input
                    type="text"
                    placeholder="CONTACT NAME"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="bg-[#090e1c] border border-surface-variant p-1.5 focus:outline-none focus:border-[#ffb780]"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={newContactRole}
                      onChange={(e) => setNewContactRole(e.target.value)}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 text-on-surface-variant"
                    >
                      <option value="Primary/Sister">SISTER</option>
                      <option value="Primary/Physician">PHYSICIAN</option>
                      <option value="Son">SON</option>
                      <option value="Spouse">SPOUSE</option>
                      <option value="Parent">PARENT</option>
                      <option value="Neighbor">NEIGHBOR</option>
                    </select>
                    <input
                      type="text"
                      placeholder="PHONE / SMS TARGET"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className="bg-[#090e1c] border border-surface-variant p-1.5 focus:outline-none focus:border-[#ffb780]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#ffb780] text-black font-mono font-bold text-[10px] uppercase py-1.5 hover:bg-[#ffd2b3] cursor-pointer"
                >
                  SAVE RECORD
                </button>
              </form>
            )}

            {/* Contacts Switchboard List */}
            <div className="flex flex-col gap-2">
              {contacts.map((contact, idx) => (
                <div key={idx} className="bg-[#090e1c] border border-surface-variant p-3 flex items-center justify-between transition-colors hover:border-surface-bright">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-none flex items-center justify-center border ${
                      contact.enabled ? 'border-[#ffb780]/30 bg-[#ffb780]/5' : 'border-surface-variant bg-surface/30'
                    }`}>
                      <span className={`material-symbols-outlined text-[18px] ${
                        contact.enabled ? 'text-[#ffb780]' : 'text-on-surface-variant'
                      }`}>
                        {contact.role.toLowerCase().includes('physician') ? 'medical_services' : 'family_history'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-display text-sm font-bold text-white capitalize leading-none">{contact.name}</span>
                      <span className="font-mono text-[9px] text-on-surface-variant mt-1">
                        {contact.role.toUpperCase()} • {contact.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 font-mono">
                    <button
                      onClick={() => handleToggleContact(idx)}
                      className={`px-3 py-1 text-[9px] font-bold border cursor-pointer ${
                        contact.enabled
                          ? 'bg-[#ffb780]/10 text-[#ffb780] border-[#ffb780]'
                          : 'bg-surface-variant/20 text-on-surface-variant border-surface-variant hover:border-on-surface-variant'
                      }`}
                    >
                      {contact.enabled ? 'AUTO-ALERT ACTIVE' : 'MUTED'}
                    </button>
                    <span className="text-[7.5px] text-on-surface-variant/70 tracking-tight uppercase">SMS ENVELOPE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Payload & Live Satellite Thumbnail */}
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-low border border-surface-variant p-4 flex flex-col gap-3">
            <span className="font-display text-xs font-bold text-[#ffb780] uppercase tracking-wider border-b border-surface-variant pb-2 block">
              Live alert transmission format
            </span>

            {/* Payload Template Code block */}
            <div className="bg-[#090e1c] border border-surface-variant/80 p-3 relative font-mono text-[10px] text-[#4fdbcc] overflow-x-auto min-h-[145px]">
              <span className="absolute top-1.5 right-2 font-bold text-[8px] text-on-surface-variant">JSON TEMPLATE</span>
              <pre className="whitespace-pre-wrap whitespace-normal break-word mt-1.5">
                {JSON.stringify(payloadFormat, null, 2)}
              </pre>
            </div>

            {/* Map overhead thumbnail coordinate display */}
            <div className="relative border border-surface-variant h-36 overflow-hidden block select-none">
              <img
                alt="High-density target coordinate terrain overlay"
                className="w-full h-full object-cover filter brightness-75 contrast-125 saturate-50 opacity-40 grayscale"
                src="https://lh3.googleusercontent.com/aida/ADBb0ujRHYrRxiHQrI-TxLrtH3T6SsYDnTdjKtuuL_BZgr5lvzYd-qYqiNZrskEMrTrBoGh61D0TWpo_pGeaxML2qU9SiJ_o9f-4bqIcs6hTOMXkDpHpL8aQqgWY59D3oi1aXYNStXWvAp-Us9ESKN686HesFWwM1TTIKyYUUYdwYVSufvALucR1SA_vDTjaTl1ubqQ8iDZ5pRSb_N4egSUyuk2iz1cCTnw5L6M5f7SYgfkp2wbh9hbvQ5Z_NqoG"
              />
              <div className="absolute inset-0 bg-[#090e1c]/40"></div>
              {/* Overlay Crosshairs */}
              <div className="absolute inset-0 border border-secondary/25 flex items-center justify-center">
                <div className="w-16 h-16 border border-dashed border-secondary/40 rounded-full flex items-center justify-center animate-spin">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
                </div>
              </div>
              {/* Tactical overlay indicators */}
              <div className="absolute bottom-2 left-3 font-mono text-[9px] text-[#4fdbcc] flex flex-col">
                <span className="font-bold underline">TACTICAL TELEMETRY LOCK:</span>
                <span className="mt-0.5 font-bold leading-none">LAT:34.0522 LON:-118.2437</span>
                <span className="text-[7.5px] text-on-surface-variant/70 italic mt-0.5">Cell Tower Ingress Vector Ready</span>
              </div>
            </div>

            {/* Send test SMS packet ping trigger */}
            <button
              onClick={handleSendTestPing}
              disabled={isSending}
              className={`w-full py-3 font-display text-sm font-bold uppercase transition-transform cursor-pointer text-center outline-none border ${
                isSending
                  ? 'bg-surface-variant/40 text-on-surface-variant border-surface-variant animate-pulse'
                  : 'bg-[#ffb780] hover:bg-[#ffd2b3] text-black border-transparent font-black shadow-[0_4px_12px_rgba(255,183,128,0.25)] hover:-translate-y-[1px] active:translate-y-[1px]'
              }`}
            >
              {isSending ? 'DISPATCHING TEST PING...' : 'SEND TEST PING (LOCAL PACKET BROADCAST)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
