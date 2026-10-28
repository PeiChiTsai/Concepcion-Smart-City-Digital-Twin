import React from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'
import { useI18n } from '../i18n'

function CityIllustration() {
  const { t } = useI18n()

  return (
    <Link
      className="city-visual city-visual-link"
      to="/dashboard"
      aria-label={t('Open the 3D digital twin of Concepción')}
    >
      <img
        className="city-visual-image"
        src={`${import.meta.env.BASE_URL}images/concepcion-digital-twin.png`}
        alt=""
      />
      <div className="city-visual-shade" />
      <div className="city-visual-topline">
        <span className="city-live-dot" />
        <span>{t('LIVE CITY OVERVIEW')}</span>
        <span className="city-coordinate">36°49' S · 73°03' W</span>
      </div>
      <span className="city-model-badge">{t('3D DIGITAL TWIN')}</span>
      <div className="city-visual-caption">
        <span className="city-caption-copy">
          <strong>{t('Concepción, in a new dimension')}</strong>
          <small>{t('Explore the city model and its urban landscape')}</small>
        </span>
        <span className="city-visual-cta">{t('EXPLORE CITY')} <span aria-hidden="true">↗</span></span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { t } = useI18n()

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span /> {t('BIOBÍO, CHILE')}</div>
          <h1>{t('A clearer view')}<br />{t('of our city.')}<br /><em>{t('A better way')}</em><br /><em>{t('forward.')}</em></h1>
          <p className="hero-description">
            {t('A smarter connection between the people who call Concepción home and the city working to serve them.')}
          </p>
          <div className="hero-actions">
            <Link className="role-button" to="/report-chat">
              <span className="role-button-label">{t('PUBLIC ACCESS · 01')}</span>
              <span className="role-button-main">{t('View as a citizen')} <span>↗</span></span>
            </Link>
            <Link className="role-button" to="/admin">
              <span className="role-button-label">{t('MUNICIPAL ACCESS · 02')}</span>
              <span className="role-button-main">{t('View as city staff')} <span>↗</span></span>
            </Link>
          </div>
          <div className="hero-footnote">
            {/* <span className="footnote-line" /> */}
            {/* <span>LOCAL KNOWLEDGE.<br /><strong>SHARED PROGRESS.</strong></span> */}
          </div>
        </div>
        <CityIllustration />

      </section>

    </div>
  )
}
