export const colors = {
  bg:          '#0a0f1e',
  surface:     '#161c2d',
  surfaceAlt:  '#1c253d',
  border:      '#2d3748',
  
  sos:         '#e63946',
  sosPulse:    '#ffb4ab',
  
  statusGreen: '#2ec4b6',
  statusOrange:'#f4a261',
  statusBlue:  '#4fdbcc',
  statusPurple:'#ff535b',
  statusAmber: '#f4a261',
  statusGray:  '#2f3445',
  
  textPrimary:  '#dee1f7',
  textSecondary:'#e4bebc',
  textMuted:    '#ab8987',
  
  mapPin:      '#e63946',
  mapAmbulance:'#2ec4b6',
  mapHospital: '#f4a261',
}

export const severity = {
  1: { color: '#A0AEC0', label: 'Stable' },
  2: { color: '#68D391', label: 'Minor' },
  3: { color: '#F6AD55', label: 'Serious' },
  4: { color: '#FC8181', label: 'Severe' },
  5: { color: '#C53030', label: 'Critical' },
}

export const typography = {
  // Large display for ETA countdown, SOS
  display: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  // Screen titles
  heading: { fontSize: 24, fontWeight: '700' },
  // Card titles
  subheading: { fontSize: 18, fontWeight: '600' },
  // Body text
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  // Labels, badges
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
}
