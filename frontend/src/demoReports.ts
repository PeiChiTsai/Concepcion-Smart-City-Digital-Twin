export type DemoReport = {
  id: number
  name: string
  phone: string
  email: string
  category: string
  emergency_notification_needed: boolean
  text: string
  lat: number
  lon: number
  status: 'pending' | 'in-progress' | 'resolved'
  time: string
}

export const demoReports: DemoReport[] = [
  {
    id: -1,
    name: 'Demo resident',
    phone: '—',
    email: '—',
    category: 'Roads & Infrastructure',
    emergency_notification_needed: false,
    text: 'Demonstration report: a streetlight needs inspection near Plaza Independencia.',
    lat: -36.8272,
    lon: -73.0501,
    status: 'pending',
    time: 'Demo · Today, 09:20',
  },
  {
    id: -2,
    name: 'Demo resident',
    phone: '—',
    email: '—',
    category: 'Waste Management',
    emergency_notification_needed: false,
    text: 'Demonstration report: a public recycling station is ready for collection.',
    lat: -36.8248,
    lon: -73.0448,
    status: 'in-progress',
    time: 'Demo · Today, 08:45',
  },
  {
    id: -3,
    name: 'Demo resident',
    phone: '—',
    email: '—',
    category: 'Roads & Infrastructure',
    emergency_notification_needed: false,
    text: 'Demonstration report: sidewalk maintenance requested near Parque Ecuador.',
    lat: -36.8334,
    lon: -73.0464,
    status: 'resolved',
    time: 'Demo · Yesterday, 16:10',
  },
]
