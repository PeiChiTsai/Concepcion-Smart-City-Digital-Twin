import { FormEvent, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import ReportLocationMap from './ReportLocationMap'
import { useI18n } from '../i18n'
import './CitizenReport_Chat.css'

const backendUrl =
  (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

type ChatMessage = {
  id: number
  sender: 'assistant' | 'citizen'
  text: string
}

type RetryRequest = {
  messageId: number
}

type ConversationStep = 'chat' | 'complete'

type APIResult = {
  theme?: string
  category?: string
  department?: string

  address?: string
  location_description?: string // internal UI state only; not stored
  geocoded_address?: string
  coordinates?: {
    latitude: number
    longitude: number
  } | null

  latitude?: number | null
  longitude?: number | null

  event_time?: string
  additional_detail?: string
  emergency_notification_needed?: boolean
  emergency_notification_reason?: string

  missing_information?: string

  follow_up_question?: string
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    text:
      "Hello! I'll help you prepare your report and gather any details still needed.",
  },
]

export default function CitizenReportChat() {
  const { t, language } = useI18n()
  // ==========================================
  // Chat state
  // ==========================================

  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages)

  const [retryRequest, setRetryRequest] =
    useState<RetryRequest | null>(null)

  const [step, setStep] =
    useState<ConversationStep>('chat')

  const [input, setInput] =
    useState('')

  const [issueDraft, setIssueDraft] =
    useState('')

  const [hasStartedConversation, setHasStartedConversation] =
    useState(false)

  const [contactName, setContactName] =
    useState('')

  const [contactPhone, setContactPhone] =
    useState('')

  const [contactEmail, setContactEmail] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)

  const [isSubmittingReport, setIsSubmittingReport] =
    useState(false)

  const [submissionError, setSubmissionError] =
    useState('')

  const [submittedReportId, setSubmittedReportId] =
    useState<number | null>(null)


  // ==========================================
  // Report state
  // ==========================================

  const [theme, setTheme] =
    useState('')

  const [category, setCategory] =
    useState('')

  const [department, setDepartment] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [location, setLocation] =
    useState('')

  const [latitude, setLatitude] =
    useState<number | null>(null)

  const [longitude, setLongitude] =
    useState<number | null>(null)

  const [missingInformation, setMissingInformation] =
    useState('')

  const [incidentTime, setIncidentTime] =
    useState('')

  const [additionalDetail, setAdditionalDetail] =
    useState('')

  const [emergencyNotificationNeeded, setEmergencyNotificationNeeded] =
    useState(false)

  const [emergencyAssessmentComplete, setEmergencyAssessmentComplete] =
    useState(false)

  const [emergencyNotificationReason, setEmergencyNotificationReason] =
    useState('')


  // ==========================================
  // Conversation state
  // ==========================================

  const [conversationHistory, setConversationHistory] =
    useState<any[]>([])

  const languageReferenceRef = useRef('')

  const [currentResult, setCurrentResult] =
    useState<APIResult | null>(null)

  const handleMapLocationSelect = (selectedLatitude: number, selectedLongitude: number) => {
    setLatitude(selectedLatitude)
    setLongitude(selectedLongitude)
    setLocation('')
    setCurrentResult((current) => ({
      ...current,
      address: '',
      location_description: 'Selected on map',
      latitude: selectedLatitude,
      longitude: selectedLongitude,
    }))
  }

  const handleDeviceLocationSelect = (
    selectedLatitude: number,
    selectedLongitude: number,
    isInitialLocation: boolean,
  ) => {
    if (isInitialLocation && latitude !== null && longitude !== null) return

    setLatitude(selectedLatitude)
    setLongitude(selectedLongitude)
    setLocation('')
    setCurrentResult((current) => ({
      ...current,
      address: '',
      location_description: 'Current device location',
      latitude: selectedLatitude,
      longitude: selectedLongitude,
    }))
  }


  // ==========================================
  // Refs
  // ==========================================

  const messageListRef =
    useRef<HTMLDivElement>(null)

  const nextMessageId =
    useRef(1)


  // ==========================================
  // Auto-scroll
  // ==========================================

  useEffect(() => {
    const messageList =
      messageListRef.current

    if (messageList) {
      messageList.scrollTop =
        messageList.scrollHeight
    }
  }, [messages, isLoading])


  // ==========================================
  // Add chat message
  // ==========================================

  const addMessage = (
    sender: ChatMessage['sender'],
    text: string
  ): number => {
    const id =
      ++nextMessageId.current

    setMessages((current) => [
      ...current,
      {
        id,
        sender,
        text,
      },
    ])

    return id
  }


  // ==========================================
  // Send message to FastAPI
  // ==========================================

  const sendMessage = async (answer: string, restartConversation = false) => {
    if (!answer || isLoading) {
      return
    }

    setRetryRequest(null)

    // ----------------------------------------
    // Show citizen message immediately
    // ----------------------------------------

    addMessage(
      'citizen',
      answer
    )

    setInput('')

    setIsLoading(true)


    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Add the project URL and anon key to frontend/.env.')
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) throw new Error('Please sign in again to use the citizen assistant.')

      // --------------------------------------
      // Call FastAPI
      // --------------------------------------

      const response =
        await fetch(
          `${backendUrl}/api/chat`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({

              message: answer,

              conversation_history:
                restartConversation
                  ? []
                  : conversationHistory,

              language_reference:
                languageReferenceRef.current || answer,

              ui_language: language,

              current_result:
                restartConversation
                  ? null
                  : currentResult,

            }),
          }
        )


      // --------------------------------------
      // Check HTTP response
      // --------------------------------------

        console.log(
          'API STATUS:',
          response.status
        )

        const responseText =
          await response.text()

        console.log(
          'API RAW RESPONSE:',
          responseText
        )

        if (!response.ok) {

          throw new Error(
            `API request failed: ${response.status} - ${responseText}`
          )
        }

        const result: APIResult =
          JSON.parse(responseText)

      setRetryRequest(null)

      console.log(
        'AI RESULT:',
        result
      )


      // ======================================
      // Update report information
      // ======================================

      if (result.theme) {

        setTheme(
          result.theme
        )

      }


      if (result.category) {

        setCategory(
          result.category
        )

      }


      if (result.responsible_department || result.department) {

        setDepartment(
          result.department || ''
        )

      }


      if (result.address || result.location_description) {

        setLocation(
          result.address || result.location_description || ''
        )

      }


      if (
        result.latitude !== undefined
      ) {

        setLatitude(
          result.latitude ?? null
        )

      }


      if (
        result.longitude !== undefined
      ) {

        setLongitude(
          result.longitude ?? null
        )

      }


      if (
        result.missing_information !== undefined
      ) {

        setMissingInformation(
          result.missing_information || ''
        )

      }


      if (result.event_time) {

        setIncidentTime(
          result.event_time
        )

      }


      if (
        result.additional_detail
      ) {

        setAdditionalDetail(
          result.additional_detail
        )

      }

      if (result.emergency_notification_needed !== undefined) {
        setEmergencyNotificationNeeded(result.emergency_notification_needed)
        setEmergencyAssessmentComplete(true)
      }

      if (result.emergency_notification_reason !== undefined) {
        setEmergencyNotificationReason(result.emergency_notification_reason)
      }


      // ======================================
      // Add AI response
      // ======================================

      const isComplete =
        !result.missing_information &&
        !result.follow_up_question

      const completionMessage =
        'Thank you for the information. Please submit your report using the button in the panel to the right.'

      const assistantResponse =
        result.follow_up_question ||
        (isComplete ? completionMessage : '')

      if (assistantResponse) {
        addMessage(
          'assistant',
          assistantResponse
        )
      }


      // ======================================
      // Update conversation history
      // ======================================

      const updatedHistory = [

        ...conversationHistory,

        {
          role: 'citizen',
          content: answer,
        },

        ...(assistantResponse
          ? [
              {
                role: 'assistant',
                content: assistantResponse,
              },
            ]
          : []),

      ]


      setConversationHistory(
        updatedHistory
      )


      // ======================================
      // Save current AI result
      // ======================================

      setCurrentResult(
        result
      )


      // ======================================
      // Check whether report is complete
      // ======================================

      if (isComplete) {

        setStep(
          'complete'
        )

      } else {

        setStep(
          'chat'
        )

      }


    } catch (error) {

      console.error(
        'Citizen AI API error:',
        error
      )

      if (error instanceof Error) {
        console.error(
          'ERROR MESSAGE:',
          error.message
        )
      }

      const errorMessageId = addMessage(
        'assistant',
        'Sorry, I could not process your report right now. Please try again.'
      )
      setRetryRequest({
        messageId: errorMessageId,
      })

    } finally {

      setIsLoading(false)

    }
  }

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input.trim())
  }

  const handleInitialDescriptionSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    const initialDescription = issueDraft.trim()
    if (!initialDescription || isLoading) return

    languageReferenceRef.current = initialDescription
    setDescription(initialDescription)
    setHasStartedConversation(true)
    void sendMessage(initialDescription)
  }

  const handleSubmitReport = async () => {
    if (isSubmittingReport || submittedReportId !== null) return
    setSubmissionError('')

    if (!supabase) {
      setSubmissionError('Supabase is not configured. Please contact the site administrator.')
      return
    }
    if (!category) {
      setSubmissionError('The report is missing a category. Please restart the conversation and try again.')
      return
    }
    if (!location.trim()) {
      setSubmissionError('Confirm a street address or nearby landmark in the conversation before submitting.')
      return
    }
    if (latitude === null || longitude === null) {
      setSubmissionError('Select a location on the map before submitting your report.')
      return
    }
    if (!incidentTime.trim()) {
      setSubmissionError('Confirm when the event happened or when you first noticed it before submitting.')
      return
    }
    if (!emergencyAssessmentComplete) {
      setSubmissionError('The emergency assessment is not complete. Continue the AI conversation before submitting.')
      return
    }

    setIsSubmittingReport(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) throw new Error('Please sign in again before submitting your report.')

      // Only the initial description; address, time and extra details have their own columns.
      const reportText = description.trim()
      const address = location.trim()
      const reporterInfo = {
        name: contactName.trim() || 'Anonymous',
        phone: contactPhone.trim() || null,
        email: contactEmail.trim() || session.user.email || null,
      }

      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: session.user.id,
          ...reporterInfo,
          theme: theme || null,
          category,
          department: department ? [department] : [],
          emergency_notification_needed: emergencyNotificationNeeded,
          emergency_notification_reason: emergencyNotificationReason || null,
          text: reportText,
          address,
          geocoded_address: currentResult?.geocoded_address || null,
          event_time: incidentTime || null,
          additional_detail: additionalDetail || null,
          lat: latitude,
          lon: longitude,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw error
      setSubmittedReportId(data.id)
    } catch (error) {
      console.error('Failed to submit citizen chat report:', error)
      setSubmissionError(error instanceof Error
        ? error.message
        : 'Unable to submit the report. Please try again.')
    } finally {
      setIsSubmittingReport(false)
    }
  }


  // ==========================================
  // Start a new report
  // ==========================================

  const startNewReport = (initialDescription = '') => {

    setMessages(
      initialMessages
    )

    setRetryRequest(null)

    nextMessageId.current = 1

    setStep(
      'chat'
    )

    setInput('')

    setIssueDraft('')

    setHasStartedConversation(false)

    setIsLoading(false)
    setIsSubmittingReport(false)
    setSubmissionError('')
    setSubmittedReportId(null)


    // Report information

    setTheme('')

    setCategory('')

    setDepartment('')

    setDescription('')

    setLocation('')

    setLatitude(null)

    setLongitude(null)

    setMissingInformation('')

    setIncidentTime('')

    setAdditionalDetail('')

    setEmergencyNotificationNeeded(false)
    setEmergencyAssessmentComplete(false)
    setEmergencyNotificationReason('')


    // Conversation

    setConversationHistory([])
    languageReferenceRef.current = ''

    setCurrentResult(null)

    if (initialDescription) {
      languageReferenceRef.current = initialDescription
      setIssueDraft(initialDescription)
      setDescription(initialDescription)
      setHasStartedConversation(true)
      void sendMessage(initialDescription, true)
    }
  }

  const handleRetry = () => {
    const initialDescription = issueDraft.trim()
    if (!retryRequest || isLoading || !initialDescription) return

    startNewReport(initialDescription)
  }


  // ==========================================
  // Input placeholder
  // ==========================================

  const prompt =
    step === 'complete'
      ? t('Your report is ready')
      : isLoading
        ? t('AI is processing...')
        : t('Describe the issue or answer the question...')


  // ==========================================
  // Report progress
  // ==========================================

  const completedItems = [

    Boolean(category),

    Boolean(description),

    Boolean(location),

    latitude !== null &&
      longitude !== null,

    Boolean(incidentTime),

    Boolean(additionalDetail),

    emergencyAssessmentComplete,

  ]


  const completedCount =
    completedItems.filter(
      Boolean
    ).length


  const totalDetails =
    completedItems.length


  const canSubmitReport =
    Boolean(category) &&
    Boolean(location.trim()) &&
    latitude !== null &&
    longitude !== null &&
    Boolean(incidentTime.trim()) &&
    emergencyAssessmentComplete


  const progress =
    Math.round(
      (completedCount /
        totalDetails) *
        100
    )


  // ==========================================
  // Render
  // ==========================================

  return (

    <main className="citizen-chat-page">

      <div className="citizen-chat-shell">


        {/* =====================================
            HEADER
        ====================================== */}

        <header className="citizen-chat-heading">

          <div>

            <div className="citizen-chat-eyebrow">

              <span
                className="citizen-chat-eyebrow-dot"
              />

              {t('CONCEPCIÓN · CITIZEN SERVICES')}

            </div>


            <h1>
              {t('Let’s make your city better.')}
            </h1>


            <p>
              {t('Tell us what’s happening and we’ll help prepare your report.')}
            </p>

          </div>


          <div className="citizen-chat-demo-badge">

            <span />

            {t('Submit completed reports to city services')}

          </div>

        </header>



        {/* =====================================
            MAIN LAYOUT
        ====================================== */}

        <div className="citizen-chat-layout">


          {/* ===================================
              CONTACT DETAILS AND CHAT
          ==================================== */}

          <div className="citizen-chat-main-column">
            <section
              className="citizen-chat-contact-card"
              aria-labelledby="citizen-chat-contact-title"
            >
              <div className="citizen-chat-contact-heading">
                <div>
                  <h2 id="citizen-chat-contact-title">{t('Contact details')}</h2>
                  <p>{t('Optional · Saved with your report and not sent to the AI assistant.')}</p>
                </div>
              </div>
              <div className="citizen-chat-contact-fields">
                <label>
                  <span>{t('NAME')}</span>
                  <input
                    autoComplete="name"
                    name="contact-name"
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder={t('Your name')}
                    value={contactName}
                  />
                </label>
                <label>
                  <span>{t('PHONE')}</span>
                  <input
                    autoComplete="tel"
                    name="contact-phone"
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder={t('Your phone number')}
                    type="tel"
                    value={contactPhone}
                  />
                </label>
                <label>
                  <span>{t('EMAIL')}</span>
                  <input
                    autoComplete="email"
                    name="contact-email"
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={contactEmail}
                  />
                </label>
              </div>
            </section>

            {!hasStartedConversation && (
              <form
                className="citizen-chat-issue-form"
                onSubmit={handleInitialDescriptionSubmit}
              >
                <label htmlFor="citizen-chat-initial-description">
                  <span>{t('WHAT WOULD YOU LIKE TO REPORT?')}</span>
                  <textarea
                    id="citizen-chat-initial-description"
                    maxLength={2000}
                    onChange={(event) => setIssueDraft(event.target.value)}
                    placeholder={t('Describe the issue, including what happened and where, if you know.')}
                    required
                    rows={4}
                    value={issueDraft}
                  />
                </label>
                <button
                  disabled={!issueDraft.trim() || isLoading}
                  type="submit"
                >
                  {isLoading ? t('Starting conversation...') : t('Start conversation')}
                  <span aria-hidden="true">↑</span>
                </button>
              </form>
            )}

            {hasStartedConversation && (
            <section
              className="citizen-chat-card"
              aria-label={t('Citizen report conversation')}
            >


            {/* ---------------------------------
                CHAT HEADER
            ---------------------------------- */}

            <div className="citizen-chat-card-header">

              <div
                className="citizen-chat-assistant-avatar"
                aria-hidden="true"
              >
                C
              </div>


              <div
                className="citizen-chat-assistant-title"
              >

                <strong>
                  {t('Concepción City Assistant')}
                </strong>


                <span>

                  <i />

                  {isLoading
                    ? t('Processing...')
                    : t('Ready to help')}

                </span>

              </div>


              <div
                className="citizen-chat-secure-label"
              >

                <span aria-hidden="true">
                  ●
                </span>

                {t('Preview conversation')}

              </div>

            </div>



            {/* ---------------------------------
                PROGRESS
            ---------------------------------- */}

            <div
              className="citizen-chat-progress"
              aria-label={t('Report progress: {completed} of {total} details', { completed: completedCount, total: totalDetails })}

            >

              <div
                className="citizen-chat-progress-label"
              >

                <span>
                  {t('REPORT DETAILS')}
                </span>


                <span>
                  {t('{completed} OF {total}', { completed: completedCount, total: totalDetails })}
                </span>

              </div>


              <div
                className="citizen-chat-progress-track"
              >

                <div
                  style={{
                    width: `${progress}%`,
                  }}
                />

              </div>

            </div>



            {/* ---------------------------------
                MESSAGE LIST
            ---------------------------------- */}

            <div
              className="citizen-chat-messages"
              ref={messageListRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >

              <div
                className="citizen-chat-date-divider"
              >

                <span>
                  {t('TODAY')}
                </span>

              </div>


              {messages.map(
                (message) => (

                  <div
                    className={`citizen-chat-message citizen-chat-message-${message.sender}`}
                    key={message.id}
                  >

                    {message.sender ===
                      'assistant' && (

                      <div
                        className="citizen-chat-message-avatar"
                        aria-hidden="true"
                      >
                        C
                      </div>

                    )}


                    <div>

                      <div
                        className="citizen-chat-bubble"
                      >
                        {message.sender === 'assistant' ? t(message.text) : message.text}
                      </div>


                      <span
                        className="citizen-chat-message-time"
                      >

                        {message.sender ===
                          'assistant'
                          ? t('City Assistant')
                          : t('You')}

                        {' · '}{t('just now')}

                      </span>

                      {retryRequest?.messageId === message.id && (
                        <button
                          type="button"
                          className="citizen-chat-retry-button"
                          disabled={isLoading}
                          onClick={handleRetry}
                        >
                          {isLoading ? t('Retrying...') : t('Retry')}
                        </button>
                      )}

                    </div>

                  </div>

                )
              )}



              {/* ---------------------------------
                  LOADING MESSAGE
              ---------------------------------- */}

              {isLoading && (

                <div
                  className="citizen-chat-message citizen-chat-message-assistant"
                >

                  <div
                    className="citizen-chat-message-avatar"
                    aria-hidden="true"
                  >
                    C
                  </div>


                  <div>

                    <div
                      className="citizen-chat-bubble"
                    >
                      {t('Thinking...')}
                    </div>


                    <span
                      className="citizen-chat-message-time"
                    >
                      {t('City Assistant')} · {t('just now')}
                    </span>

                  </div>

                </div>

              )}



            </div>



            {/* ---------------------------------
                COMPOSER
            ---------------------------------- */}

            <form
              className="citizen-chat-composer"
              onSubmit={handleSend}
            >

              <label
                className="citizen-chat-sr-only"
                htmlFor="citizen-chat-input"
              >
                {t('Your message')}
              </label>


              <input
                id="citizen-chat-input"
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                placeholder={prompt}
                disabled={
                  step === 'complete' ||
                  isLoading
                }
                autoComplete="off"
              />


              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  step === 'complete' ||
                  isLoading
                }
                aria-label={t('Send message')}

              >

                <span>
                  {t('Send')}
                </span>

                <span aria-hidden="true">
                  ↑
                </span>

              </button>

            </form>


            <div
              className="citizen-chat-composer-note"
            >
              {t('Please don’t include sensitive personal information in this demo.')}
            </div>

            </section>
            )}
          </div>



          {/* ===================================
              REPORT SUMMARY
          ==================================== */}

          <div className="citizen-chat-summary-column">
            <section className="citizen-chat-map-card" aria-labelledby="citizen-chat-map-title">
              <div className="citizen-chat-map-heading">
                <div>
                  <h2 id="citizen-chat-map-title">{t('Select a location')}</h2>
                  <p>
                    {latitude !== null && longitude !== null
                      ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                      : t('AI will focus the map when it finds a location. You can also click the map.')}
                  </p>
                </div>
                {latitude !== null && longitude !== null && (
                  <span className="citizen-chat-map-selected">{t('PIN SET')}</span>
                )}
              </div>
              <ReportLocationMap
                latitude={latitude}
                longitude={longitude}
                onDeviceLocation={handleDeviceLocationSelect}
                onLocationSelect={handleMapLocationSelect}
              />
            </section>

          <aside
            className="citizen-chat-summary"
          >


            {/* ---------------------------------
                SUMMARY HEADER
            ---------------------------------- */}

            <div
              className="citizen-chat-summary-heading"
            >

              <div
                className="citizen-chat-summary-icon"
                aria-hidden="true"
              >
                ▤
              </div>


              <div>

                <h2>
                  {t('Your report')}
                </h2>

                <p>
                  {t('Draft summary')}
                </p>

              </div>


              <span
                className="citizen-chat-draft-badge"
              >
                {t('DRAFT')}
              </span>

            </div>



            {/* ---------------------------------
                SUMMARY FIELDS
            ---------------------------------- */}

            <div
              className="citizen-chat-summary-fields"
            >


              {/* CATEGORY */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ⌘
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('CATEGORY')}
                  </span>


                  <p>
                    {category ||
                      t('Waiting for classification')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    category
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    category
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* DEPARTMENT */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('RESPONSIBLE DEPARTMENT')}
                  </span>


                  <p>
                    {department ||
                      t('Waiting for routing')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    department
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    department
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* WHAT HAPPENED */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('WHAT HAPPENED')}
                  </span>


                  <p>
                    {description ||
                      t('Waiting for details')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    description
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    description
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* LOCATION */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ⌖
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('ADDRESS')}
                  </span>


                  <p>
                    {location ||
                      t('Waiting for location')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    location
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    location
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* COORDINATES */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ◎
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('COORDINATES')}
                  </span>


                  <p>

                    {latitude !== null &&
                      longitude !== null

                      ? `${latitude.toFixed(
                          6
                        )}, ${longitude.toFixed(
                          6
                        )}`

                      : t('Waiting for geolocation')}

                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    latitude !== null &&
                    longitude !== null
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    latitude !== null &&
                    longitude !== null
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* INCIDENT TIME */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  ◷
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('EVENT TIME')}
                  </span>


                  <p>
                    {incidentTime ||
                      t('Waiting for event time')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    incidentTime
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    incidentTime
                      ? t('Provided')
                      : t('Not provided')
                  }
                />

              </div>



              {/* ADDITIONAL DETAIL */}

              <div
                className="citizen-chat-summary-field"
              >

                <span
                  className="citizen-chat-field-icon"
                  aria-hidden="true"
                >
                  +
                </span>


                <div>

                  <span
                    className="citizen-chat-field-label"
                  >
                    {t('ADDITIONAL DETAIL')}
                  </span>


                  <p>
                    {additionalDetail ||
                      t('None provided')}
                  </p>

                </div>


                <span
                  className={`citizen-chat-field-status ${
                    additionalDetail
                      ? 'is-filled'
                      : ''
                  }`}
                  aria-label={
                    additionalDetail
                      ? t('Provided')
                      : t('None provided')
                  }
                />

              </div>

              <div className="citizen-chat-summary-field">
                <span className="citizen-chat-field-icon" aria-hidden="true">!</span>
                <div>
                  <span className="citizen-chat-field-label">{t('EMERGENCY NOTIFICATION')}</span>
                  <p>
                    {!emergencyAssessmentComplete
                      ? t('Waiting for assessment')
                      : emergencyNotificationNeeded
                        ? `${t(emergencyNotificationReason || 'Immediate notification recommended')} · ${t('not sent')}`
                        : t('Not required')}
                  </p>
                </div>
                <span
                  className={`citizen-chat-field-status ${emergencyAssessmentComplete ? 'is-filled' : ''}`}
                  aria-label={emergencyAssessmentComplete ? t('Assessed') : t('Not assessed')}
                />
              </div>

            </div>



            {/* ---------------------------------
                LOCATION CARD
            ---------------------------------- */}

            <div
              className="citizen-chat-location-card"
            >

              <div
                className="citizen-chat-map-illustration"
                aria-hidden="true"
              >

                <span
                  className="citizen-chat-map-road citizen-chat-map-road-one"
                />

                <span
                  className="citizen-chat-map-road citizen-chat-map-road-two"
                />

                <span
                  className="citizen-chat-map-road citizen-chat-map-road-three"
                />

                <span
                  className="citizen-chat-map-pin"
                >
                  ●
                </span>

              </div>


              <div>

                <strong>

                  {location
                    ? t('Location added')
                    : t('Location helps us respond')}

                </strong>


                <p>

                  {latitude !== null &&
                    longitude !== null

                  ? t('Coordinates are set and marked on the map.')

                    : location

                      ? t('The reported location has been identified. Waiting for coordinates.')

                      : t('Share an address or nearby landmark in the chat.')}

                </p>

              </div>

            </div>



            {/* ---------------------------------
                NOTICE
            ---------------------------------- */}

            <div
              className="citizen-chat-notice"
            >

              <span aria-hidden="true">
                i
              </span>


              <p>
                {t('Your report details and answers are saved only after you select Submit report. AI assistant messages are not stored. Emergency notifications are not sent automatically.')}
              </p>

            </div>

            <div className="citizen-chat-completion-actions">
              {submittedReportId !== null ? (
                <p className="citizen-chat-submit-success" role="status">
                  {t('Report #{id} was submitted successfully.', { id: submittedReportId })}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="citizen-chat-submit-report"
                    disabled={!canSubmitReport || isSubmittingReport}
                    onClick={handleSubmitReport}
                  >
                    {isSubmittingReport ? t('Submitting...') : t('Submit report')}
                  </button>
                  {!canSubmitReport && (
                    <p className="citizen-chat-submit-hint">
                      {t('Complete the basic details above to enable submitting.')}
                    </p>
                  )}
                  {submissionError && (
                    <p className="citizen-chat-submit-error" role="alert">
                      {t(submissionError)}
                    </p>
                  )}
                </>
              )}
              <button
                type="button"
                className="citizen-chat-new-report"
                onClick={() => startNewReport()}
              >
                {t('Start a new report')}
              </button>
            </div>

          </aside>
          </div>

        </div>



        {/* =====================================
            FOOTER
        ====================================== */}

        <footer
          className="citizen-chat-footer"
        >

          <span>
            {t('For emergencies requiring immediate assistance, contact local emergency services directly.')}
          </span>


          <span>
            {t('City of Concepción')}
            <b> · </b>
            {t('Citizen Reporting')}
          </span>

        </footer>

      </div>

    </main>
  )
}