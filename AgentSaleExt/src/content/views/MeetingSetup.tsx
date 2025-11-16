import { useState, useEffect } from 'react';
import './MeetingSetup.css';

interface MeetingSetupProps {
  onComplete: (data: {
    name: string;
    email: string;
    agenda?: string;
    callType?: string;
  }) => void;
}

function MeetingSetup({ onComplete }: MeetingSetupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agenda, setAgenda] = useState('');
  const [callType, setCallType] = useState('sales');
  const [showForm, setShowForm] = useState(true);
  const [isLoadingHubSpot, setIsLoadingHubSpot] = useState(true);

  // Simulate fetching from HubSpot
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock data - replace with actual HubSpot fetch
      setName('Nitish Chowdary');
      setEmail('nitsancs@gmail.com');
      setIsLoadingHubSpot(false);
    }, 2000); // 2 second fake delay

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      alert('Please enter the participant name and email');
      return;
    }

    // Save to Chrome storage
    const userProfile = {
      name: name.trim(),
      email: email.trim(),
    };

    const meetingContext = {
      agenda: agenda.trim() || undefined,
      callType: callType as any,
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ userProfile, meetingContext }).then(() => {
        console.log('[MeetingSetup] Configuration saved');
      });
    }

    onComplete({
      name: name.trim(),
      email: email.trim(),
      agenda: agenda.trim() || undefined,
      callType: callType || undefined,
    });

    setShowForm(false);
  };

  const handleSkip = () => {
    // Skip without saving participant info
    onComplete({
      name: '',
      email: '',
    });
    setShowForm(false);
  };

  if (!showForm) {
    return null;
  }

  return (
    <div className="meeting-setup-overlay">
      <div className="meeting-setup-modal">
        <h2>AgentSale</h2>
        <p className="meeting-setup-subtitle">
          Who will you be meeting with on this call?
        </p>

        {isLoadingHubSpot ? (
          <div className="hubspot-loading">
            <div className="hubspot-spinner"></div>
            <p>Fetching client details from HubSpot...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="meeting-setup-field">
              <label htmlFor="name">Participant Name *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="meeting-setup-field">
              <label htmlFor="email">Participant Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@theircompany.com"
                required
              />
            </div>

            <div className="meeting-setup-field">
              <label htmlFor="agenda">Meeting Agenda (Optional)</label>
              <input
                id="agenda"
                type="text"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="Product demo and pricing discussion"
              />
            </div>

            <div className="meeting-setup-field">
              <label htmlFor="callType">Call Type</label>
              <select
                id="callType"
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
              >
                <option value="sales">Sales Call</option>
                <option value="demo">Product Demo</option>
                <option value="discovery">Discovery Call</option>
                <option value="followup">Follow-up</option>
                <option value="support">Support</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="meeting-setup-actions">
              <button type="submit" className="meeting-setup-btn-primary">
                Save & Continue
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="meeting-setup-btn-secondary"
              >
                Skip
              </button>
            </div>
          </form>
        )}

        {!isLoadingHubSpot && (
          <p className="meeting-setup-note">
            This information helps the AI provide personalized suggestions during your call
          </p>
        )}
      </div>
    </div>
  );
}

export default MeetingSetup;
