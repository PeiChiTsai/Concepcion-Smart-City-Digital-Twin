import { FormEvent, useEffect, useRef, useState } from 'react'
import './CitizenReport_Chat.css'

type ChatMessage = {
  id: number
  sender: 'assistant' | 'citizen'
  text: string
}

type ConversationStep = 'chat' | 'complete'

type APIResult = {
  category?: string
  department?: string

  location_description?: string

  latitude?: number | null
  longitude?: number | null

  missing_information?: string

  follow_up_question?: string

  incident_time?: string

  additional_detail?: string
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'assistant',
    text:
      "Hello! I'm here to help you report an issue to the City of Concepción. Please describe what is happening in your own words.",
  },
]

export default function CitizenReportChat() {
  // ==========================================
  // Chat state
  // ==========================================

  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages)

  const [step, setStep] =
    useState<ConversationStep>('chat')

  const [input, setInput] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)


  // ==========================================
  // Report state
  // ==========================================

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


  // ==========================================
  // Conversation state
  // ==========================================

  const [conversationHistory, setConversationHistory] =
    useState<any[]>([])

  const [currentResult, setCurrentResult] =
    useState<APIResult | null>(null)


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
  ) => {
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
  }


  // ==========================================
  // Send message to FastAPI
  // ==========================================

  const handleSend = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const answer =
      input.trim()

    if (!answer || isLoading) {
      return
    }


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

      // --------------------------------------
      // Call FastAPI
      // --------------------------------------

      const response =
        await fetch(
          'http://127.0.0.1:8000/api/chat',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({

              message: answer,

              conversation_history:
                conversationHistory,

              current_result:
                currentResult,

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


      console.log(
        'AI RESULT:',
        result
      )


      // ======================================
      // Update report information
      // ======================================

      if (result.category) {

        setCategory(
          result.category
        )

      }


      if (result.department) {

        setDepartment(
          result.department
        )

      }


      if (
        result.location_description
      ) {

        setLocation(
          result.location_description
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


      if (
        result.incident_time
      ) {

        setIncidentTime(
          result.incident_time
        )

      }


      if (
        result.additional_detail
      ) {

        setAdditionalDetail(
          result.additional_detail
        )

      }


      // ======================================
      // Add AI response
      // ======================================

      if (
        result.follow_up_question
      ) {

        addMessage(
          'assistant',
          result.follow_up_question
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

        ...(result.follow_up_question
          ? [
              {
                role: 'assistant',
                content:
                  result.follow_up_question,
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

      const isComplete =
        !result.missing_information &&
        !result.follow_up_question


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

      addMessage(
        'assistant',
        'Sorry, I could not process your report right now. Please try again.'
      )

    } finally {

      setIsLoading(false)

    }
  }


  // ==========================================
  // Start a new report
  // ==========================================

  const startNewReport = () => {

    setMessages(
      initialMessages
    )

    nextMessageId.current = 1

    setStep(
      'chat'
    )

    setInput('')

    setIsLoading(false)


    // Report information

    setCategory('')

    setDepartment('')

    setDescription('')

    setLocation('')

    setLatitude(null)

    setLongitude(null)

    setMissingInformation('')

    setIncidentTime('')

    setAdditionalDetail('')


    // Conversation

    setConversationHistory([])

    setCurrentResult(null)
  }


  // ==========================================
  // Input placeholder
  // ==========================================

  const prompt =
    step === 'complete'
      ? 'Your report is ready'
      : isLoading
        ? 'AI is processing...'
        : 'Describe the issue or answer the question...'


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

  ]


  const completedCount =
    completedItems.filter(
      Boolean
    ).length


  const totalDetails =
    completedItems.length


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

              CONCEPCIÓN · CITIZEN SERVICES

            </div>


            <h1>
              Let’s make your city better.
            </h1>


            <p>
              Tell us what’s happening and
              we’ll help prepare your report.
            </p>

          </div>


          <div className="citizen-chat-demo-badge">

            <span />

            Demo · Nothing is submitted

          </div>

        </header>



        {/* =====================================
            MAIN LAYOUT
        ====================================== */}

        <div className="citizen-chat-layout">


          {/* ===================================
              CHAT CARD
          ==================================== */}

          <section
            className="citizen-chat-card"
            aria-label="Citizen report conversation"
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
                  Concepción City Assistant
                </strong>


                <span>

                  <i />

                  {isLoading
                    ? 'Processing...'
                    : 'Ready to help'}

                </span>

              </div>


              <div
                className="citizen-chat-secure-label"
              >

                <span aria-hidden="true">
                  ●
                </span>

                Preview conversation

              </div>

            </div>



            {/* ---------------------------------
                PROGRESS
            ---------------------------------- */}

            <div
              className="citizen-chat-progress"
              aria-label={`Report progress: ${completedCount} of ${totalDetails} details`}
            >

              <div
                className="citizen-chat-progress-label"
              >

                <span>
                  REPORT DETAILS
                </span>


                <span>
                  {completedCount} OF {totalDetails}
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
                  TODAY
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
                        {message.text}
                      </div>


                      <span
                        className="citizen-chat-message-time"
                      >

                        {message.sender ===
                          'assistant'
                          ? 'City Assistant'
                          : 'You'}

                        {' · just now'}

                      </span>

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
                      Thinking...
                    </div>


                    <span
                      className="citizen-chat-message-time"
                    >
                      City Assistant · just now
                    </span>

                  </div>

                </div>

              )}



              {/* ---------------------------------
                  COMPLETE
              ---------------------------------- */}

              {step === 'complete' && (

                <button
                  type="button"
                  className="citizen-chat-new-report"
                  onClick={
                    startNewReport
                  }
                >

                  Start a new report

                </button>

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
                Your message
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
                aria-label="Send message"
              >

                <span>
                  Send
                </span>

                <span aria-hidden="true">
                  ↑
                </span>

              </button>

            </form>


            <div
              className="citizen-chat-composer-note"
            >
              Please don’t include sensitive
              personal information in this demo.
            </div>

          </section>



          {/* ===================================
              REPORT SUMMARY
          ==================================== */}

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
                  Your report
                </h2>

                <p>
                  Draft summary
                </p>

              </div>


              <span
                className="citizen-chat-draft-badge"
              >
                DRAFT
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
                    CATEGORY
                  </span>


                  <p>
                    {category ||
                      'Waiting for classification'}
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
                      ? 'Provided'
                      : 'Not provided'
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
                    DEPARTMENT
                  </span>


                  <p>
                    {department ||
                      'Waiting for routing'}
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
                      ? 'Provided'
                      : 'Not provided'
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
                    WHAT HAPPENED
                  </span>


                  <p>
                    {description ||
                      'Waiting for details'}
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
                      ? 'Provided'
                      : 'Not provided'
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
                    LOCATION
                  </span>


                  <p>
                    {location ||
                      'Waiting for location'}
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
                      ? 'Provided'
                      : 'Not provided'
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
                    COORDINATES
                  </span>


                  <p>

                    {latitude !== null &&
                      longitude !== null

                      ? `${latitude.toFixed(
                          6
                        )}, ${longitude.toFixed(
                          6
                        )}`

                      : 'Waiting for geolocation'}

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
                      ? 'Provided'
                      : 'Not provided'
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
                    EVENT TIME
                  </span>


                  <p>
                    {incidentTime ||
                      'Waiting for event time'}
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
                      ? 'Provided'
                      : 'Not provided'
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
                    ADDITIONAL DETAIL
                  </span>


                  <p>
                    {additionalDetail ||
                      'None provided'}
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
                      ? 'Provided'
                      : 'None provided'
                  }
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
                    ? 'Location added'
                    : 'Location helps us respond'}

                </strong>


                <p>

                  {latitude !== null &&
                    longitude !== null

                    ? 'The location has been geocoded and coordinates are available.'

                    : location

                      ? 'The reported location has been identified. Waiting for coordinates.'

                      : 'Share an address or nearby landmark in the chat.'}

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
                This is an interface preview.
                Your conversation is not saved
                or sent to city services.
              </p>

            </div>

          </aside>

        </div>



        {/* =====================================
            FOOTER
        ====================================== */}

        <footer
          className="citizen-chat-footer"
        >

          <span>
            For emergencies requiring immediate
            assistance, contact local emergency
            services directly.
          </span>


          <span>
            City of Concepción
            <b> · </b>
            Citizen Reporting
          </span>

        </footer>

      </div>

    </main>
  )
}