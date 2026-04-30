import { Navigate, Route, Routes } from 'react-router-dom'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import OrbScreen from './screens/OrbScreen.jsx'
import DemoScreen from './screens/DemoScreen.jsx'
import QuickActionsScreen from './screens/QuickActionsScreen.jsx'
import CaregiverScreen from './screens/CaregiverScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OnboardingScreen />} />
      <Route path="/app" element={<OrbScreen />} />
      <Route path="/demo" element={<DemoScreen />} />
      <Route path="/actions" element={<QuickActionsScreen />} />
      <Route path="/caregiver" element={<CaregiverScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
