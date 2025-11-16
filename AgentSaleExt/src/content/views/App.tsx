import FloatingCaptions from './FloatingCaptions'

function App() {
  // Check if we're on Google Meet
  const isGoogleMeet = window.location.hostname === 'meet.google.com'

  if (!isGoogleMeet) {
    return null
  }

  return <FloatingCaptions />
}

export default App
