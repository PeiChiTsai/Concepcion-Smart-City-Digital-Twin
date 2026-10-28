import { Link } from 'react-router-dom'
import './AboutPage.css'
import { useI18n } from '../i18n'

const features = [
  {
    number: '01',
    title: 'AI citizen assistant',
    description:
      'Describe a public-service issue in your own words. The assistant classifies it, asks for a confirmable address and event time, gathers useful details, and estimates whether urgent attention may be needed.',
    link: '/report-chat',
    action: 'Start a report',
  },
  {
    number: '02',
    title: '3D digital twin',
    description:
      'Explore the city in a 3D map and view report locations and their current status. Report markers are organized by status, with urgent-assessment reports highlighted.',
    link: '/dashboard',
    action: 'Explore the map',
  },
  {
    number: '03',
    title: 'City operations',
    description:
      'Municipal staff can review incoming reports, change their status, and remove records. Accounts without approved municipal access see sample data in read-only mode.',
    link: '/admin',
    action: 'Open city operations',
  },
]

const steps = [
  {
    number: '1',
    title: 'Create or sign in to an account',
    description:
      'Citizens can start with a citizen account. Municipal users can create a municipal account and use the read-only sample view while access is reviewed.',
  },
  {
    number: '2',
    title: 'Describe the issue',
    description:
      'Enter the initial description, then answer the assistant’s follow-up questions about the location, event time, and any additional details.',
  },
  {
    number: '3',
    title: 'Review and submit',
    description:
      'Check the report summary and map coordinates. Select Submit report to save the completed report for authorized city staff to review.',
  },
]

export default function AboutPage() {
  const { t } = useI18n()

  return (
    <main className="about-page">
      <div className="about-shell">
        <header className="about-hero">
          <p className="about-eyebrow"><span /> {t('PROJECT GUIDE · CONCEPCIÓN')}</p>
          <h1>{t('A practical demo for a more connected city.')}</h1>
          <p className="about-intro">
            {t('Concepción Smart City demonstrates how citizen reports, AI-assisted intake, and a 3D city view can work together in one civic-service workflow.')}
          </p>
          <div className="about-hero-actions">
            <Link className="about-primary-link" to="/report-chat">{t('Try the AI assistant')} <span>↗</span></Link>
            <Link className="about-secondary-link" to="/">{t('Back to home')}</Link>
          </div>
        </header>

        <section className="about-section" aria-labelledby="about-features-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">{t('EXPLORE THE DEMO')}</p>
            <h2 id="about-features-title">{t('What each page does')}</h2>
          </div>
          <div className="about-feature-grid">
            {features.map((feature) => (
              <article className="about-feature-card" key={feature.number}>
                <span className="about-card-number">{feature.number}</span>
                <h3>{t(feature.title)}</h3>
                <p>{t(feature.description)}</p>
                <Link to={feature.link}>{t(feature.action)} <span>→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="about-workflow" aria-labelledby="about-workflow-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">{t('HOW TO USE IT')}</p>
            <h2 id="about-workflow-title">{t('From a local issue to a city report')}</h2>
          </div>
          <ol className="about-steps">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="about-step-number">{step.number}</span>
                <div>
                  <h3>{t(step.title)}</h3>
                  <p>{t(step.description)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-access" aria-labelledby="about-access-title">
          <div>
            <p className="about-eyebrow">{t('ACCOUNT ACCESS')}</p>
            <h2 id="about-access-title">{t('Different roles, clear permissions.')}</h2>
            <p>
              {t('Citizen accounts can prepare and submit reports. Municipal accounts can explore sample operations data; full access to real reports requires administrator approval.')}
            </p>
          </div>
          <Link to="/municipal-access">{t('Municipal access')} <span>↗</span></Link>
        </section>

        <aside className="about-notice">
          <span aria-hidden="true">i</span>
          <p>
            {t('This is a demonstration platform, not an emergency-response service. Reports are saved only after you choose to submit them. The AI’s emergency assessment is informational and does not notify police or other agencies. For an emergency, contact local emergency services directly.')}
          </p>
        </aside>
      </div>
    </main>
  )
}
