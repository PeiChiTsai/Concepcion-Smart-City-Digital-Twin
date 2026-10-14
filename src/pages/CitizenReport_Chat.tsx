import { FormEvent, useEffect, useRef, useState } from 'react'
import './CitizenReport_Chat.css'

type ChatMessage = {
  id: number
  sender: 'assistant' | 'citizen'
  text: string
}

type ConversationStep = 'category' | 'description' | 'location' | 'urgency' | 'contact' | 'complete'

const categories = [
  'Roads & Infrastructure',
  'Lighting & Utilities',
  'Environment & Sanitation',
  'Public Safety',
  'Fire & Disaster Prevention',
  'Other',
]

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    text: "Hello! I'm here to help make a report to the City of Concepción. First, what kind of issue would you like to report?",
  },
]

export default function CitizenReportChat() {
  const [messages, setMessages] = useState(initialMessages)
  const [step, setStep] = useState<ConversationStep>('category')
  const [input, setInput] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [isUrgent, setIsUrgent] = useState<boolean | null>(null)
  const [contact, setContact] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)
  const nextMessageId = useRef(1)

  useEffect(() => {
    const messageList = messageListRef.current
    if (messageList) messageList.scrollTop = messageList.scrollHeight
  }, [messages])

  const addMessage = (sender: ChatMessage['sender'], text: string) => {
    const id = ++nextMessageId.current
    setMessages((current) => [...current, { id, sender, text }])
  }

  const selectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory)
    addMessage('citizen', selectedCategory)
    addMessage('assistant', 'Got it. Could you describe what happened? Include any details that might help the city understand the issue.')
    setStep('description')
  }

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const answer = input.trim()
    if (!answer) return

    addMessage('citizen', answer)
    setInput('')

    if (step === 'category') {
      setDescription(answer)
      setCategory('Other')
      addMessage('assistant', 'Thanks for letting us know. Where is this happening? An address, nearby landmark, or intersection is helpful.')
      setStep('location')
    } else if (step === 'description') {
      setDescription(answer)
      addMessage('assistant', 'Where is this happening? An address, nearby landmark, or intersection is helpful.')
      setStep('location')
    } else if (step === 'location') {
      setLocation(answer)
      addMessage('assistant', 'Is anyone in immediate danger, or does this need an urgent response?')
      setStep('urgency')
    } else if (step === 'contact') {
      setContact(answer)
      addMessage('assistant', 'Thank you. Your report draft is ready to review. It has not been sent.')
      setStep('complete')
    }
  }

  const selectUrgency = (urgent: boolean) => {
    const answer = urgent ? 'Yes, this is urgent' : 'No, it is not urgent'
    setIsUrgent(urgent)
    addMessage('citizen', answer)
    addMessage('assistant', 'Would you like to leave a name, phone number, or email so the city can follow up? This is optional.')
    setStep('contact')
  }

  const skipContact = () => {
    addMessage('citizen', 'Skip contact details')
    addMessage('assistant', 'Thank you. Your report draft is ready to review. It has not been sent.')
    setStep('complete')
  }

  const startNewReport = () => {
    setMessages(initialMessages)
    nextMessageId.current = 1
    setStep('category')
    setInput('')
    setCategory('')
    setDescription('')
    setLocation('')
    setIsUrgent(null)
    setContact('')
  }

  const prompt = {
    category: 'Choose a category to get started, or tell us what happened.',
    description: 'Describe the issue...',
    location: 'Enter an address, intersection, or nearby landmark...',
    contact: 'Your contact details (optional)...',
    urgency: 'Choose an option above',
    complete: 'Your draft is ready',
  }[step]

  const completedCount = [category, description, location, isUrgent !== null, contact || step === 'complete']
    .filter(Boolean).length

  return (
    <main className="citizen-chat-page">
      <div className="citizen-chat-shell">
        <header className="citizen-chat-heading">
          <div>
            <div className="citizen-chat-eyebrow"><span className="citizen-chat-eyebrow-dot" /> CONCEPCIÓN · CITIZEN SERVICES</div>
            <h1>Let’s make your city better.</h1>
            <p>Tell us what’s happening and we’ll help prepare your report.</p>
          </div>
          <div className="citizen-chat-demo-badge"><span /> Demo · Nothing is submitted</div>
        </header>

        <div className="citizen-chat-layout">
          <section className="citizen-chat-card" aria-label="Citizen report conversation">
            <div className="citizen-chat-card-header">
              <div className="citizen-chat-assistant-avatar" aria-hidden="true">C</div>
              <div className="citizen-chat-assistant-title">
                <strong>Concepción City Assistant</strong>
                <span><i /> Ready to help</span>
              </div>
              <div className="citizen-chat-secure-label"><span aria-hidden="true">●</span> Preview conversation</div>
            </div>

            <div className="citizen-chat-progress" aria-label={`Report progress: ${completedCount} of 5 details`}>
              <div className="citizen-chat-progress-label"><span>REPORT DETAILS</span><span>{completedCount} OF 5</span></div>
              <div className="citizen-chat-progress-track"><div style={{ width: `${(completedCount / 5) * 100}%` }} /></div>
            </div>

            <div className="citizen-chat-messages" ref={messageListRef} role="log" aria-live="polite" aria-relevant="additions">
              <div className="citizen-chat-date-divider"><span>TODAY</span></div>
              {messages.map((message) => (
                <div className={`citizen-chat-message citizen-chat-message-${message.sender}`} key={message.id}>
                  {message.sender === 'assistant' && <div className="citizen-chat-message-avatar" aria-hidden="true">C</div>}
                  <div>
                    <div className="citizen-chat-bubble">{message.text}</div>
                    <span className="citizen-chat-message-time">{message.sender === 'assistant' ? 'City Assistant' : 'You'} · just now</span>
                  </div>
                </div>
              ))}

              {step === 'category' && (
                <div className="citizen-chat-category-options" aria-label="Report categories">
                  {categories.map((item) => (
                    <button type="button" key={item} onClick={() => selectCategory(item)}>{item}</button>
                  ))}
                </div>
              )}

              {step === 'urgency' && (
                <div className="citizen-chat-choice-options">
                  <button type="button" className="citizen-chat-urgent-choice" onClick={() => selectUrgency(true)}>Yes, it’s urgent</button>
                  <button type="button" onClick={() => selectUrgency(false)}>No, not urgent</button>
                </div>
              )}

              {step === 'contact' && (
                <button type="button" className="citizen-chat-skip-button" onClick={skipContact}>Skip, stay anonymous</button>
              )}

              {step === 'complete' && (
                <button type="button" className="citizen-chat-new-report" onClick={startNewReport}>Start a new report</button>
              )}
            </div>

            <form className="citizen-chat-composer" onSubmit={handleSend}>
              <label className="citizen-chat-sr-only" htmlFor="citizen-chat-input">Your message</label>
              <input
                id="citizen-chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={prompt}
                disabled={step === 'urgency' || step === 'complete'}
                autoComplete="off"
              />
              <button type="submit" disabled={!input.trim() || step === 'urgency' || step === 'complete'} aria-label="Send message">
                <span>Send</span><span aria-hidden="true">↑</span>
              </button>
            </form>
            <div className="citizen-chat-composer-note">Please don’t include sensitive personal information in this demo.</div>
          </section>

          <aside className="citizen-chat-summary">
            <div className="citizen-chat-summary-heading">
              <div className="citizen-chat-summary-icon" aria-hidden="true">▤</div>
              <div><h2>Your report</h2><p>Draft summary</p></div>
              <span className="citizen-chat-draft-badge">DRAFT</span>
            </div>

            <div className="citizen-chat-summary-fields">
              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon" aria-hidden="true">⌘</span>
                <div><span className="citizen-chat-field-label">CATEGORY</span><p>{category || 'Not selected yet'}</p></div>
                <span className={`citizen-chat-field-status ${category ? 'is-filled' : ''}`} aria-label={category ? 'Provided' : 'Not provided'} />
              </div>
              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon" aria-hidden="true">▤</span>
                <div><span className="citizen-chat-field-label">WHAT HAPPENED</span><p>{description || 'Waiting for details'}</p></div>
                <span className={`citizen-chat-field-status ${description ? 'is-filled' : ''}`} aria-label={description ? 'Provided' : 'Not provided'} />
              </div>
              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon" aria-hidden="true">⌖</span>
                <div><span className="citizen-chat-field-label">LOCATION</span><p>{location || 'Waiting for location'}</p></div>
                <span className={`citizen-chat-field-status ${location ? 'is-filled' : ''}`} aria-label={location ? 'Provided' : 'Not provided'} />
              </div>
              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon citizen-chat-alert-icon" aria-hidden="true">!</span>
                <div><span className="citizen-chat-field-label">PRIORITY</span><p>{isUrgent === null ? 'Not specified' : isUrgent ? 'Urgent' : 'Not urgent'}</p></div>
                <span className={`citizen-chat-field-status ${isUrgent !== null ? 'is-filled' : ''}`} aria-label={isUrgent !== null ? 'Provided' : 'Not provided'} />
              </div>
              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon" aria-hidden="true">♙</span>
                <div><span className="citizen-chat-field-label">CONTACT</span><p>{contact || (step === 'complete' ? 'Anonymous' : 'Optional')}</p></div>
                <span className={`citizen-chat-field-status ${contact || step === 'complete' ? 'is-filled' : ''}`} aria-label={contact || step === 'complete' ? 'Provided or skipped' : 'Optional'} />
              </div>
            </div>

            <div className="citizen-chat-location-card">
              <div className="citizen-chat-map-illustration" aria-hidden="true">
                <span className="citizen-chat-map-road citizen-chat-map-road-one" />
                <span className="citizen-chat-map-road citizen-chat-map-road-two" />
                <span className="citizen-chat-map-road citizen-chat-map-road-three" />
                <span className="citizen-chat-map-pin">●</span>
              </div>
              <div><strong>{location ? 'Location added' : 'Location helps us respond'}</strong><p>{location ? 'Your reported location is in the draft.' : 'Share an address or nearby landmark in the chat.'}</p></div>
            </div>

            <div className="citizen-chat-notice">
              <span aria-hidden="true">i</span>
              <p>This is an interface preview. Your conversation is not saved or sent to city services.</p>
            </div>
          </aside>
        </div>

        <footer className="citizen-chat-footer">
          <span>For emergencies requiring immediate assistance, contact local emergency services directly.</span>
          <span>City of Concepción <b>·</b> Citizen Reporting</span>
        </footer>
      </div>
    </main>
  )
}