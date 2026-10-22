import React from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'

function CityIllustration() {
  return (
    <Link
      className="city-visual city-visual-link"
      to="/dashboard"
      aria-label="Open the 3D digital twin of Concepción"
    >
      <img
        className="city-visual-image"
        src={`${import.meta.env.BASE_URL}images/concepcion-digital-twin.png`}
        alt=""
      />
      <div className="city-visual-shade" />
      <div className="city-visual-topline">
        <span className="city-live-dot" />
        <span>LIVE CITY OVERVIEW</span>
        <span className="city-coordinate">36°49' S · 73°03' W</span>
      </div>
      <span className="city-model-badge">3D DIGITAL TWIN</span>
      <div className="city-visual-caption">
        <span className="city-caption-copy">
          <strong>Concepción, in a new dimension</strong>
          <small>Explore the city model and its urban landscape</small>
        </span>
        <span className="city-visual-cta">EXPLORE CITY <span aria-hidden="true">↗</span></span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span /> BIOBÍO, CHILE</div>
          <h1>A clearer view<br />of our city.<br /><em>A better way</em><br /><em>forward.</em></h1>
          <p className="hero-description">
            A smarter connection between the people who call Concepción home and the city working to serve them.
          </p>
          <div className="hero-actions">
            <Link className="role-button" to="/report-chat">
              <span className="role-button-label">PUBLIC ACCESS · 01</span>
              <span className="role-button-main">View as a citizen <span>↗</span></span>
            </Link>
            <Link className="role-button" to="/admin">
              <span className="role-button-label">MUNICIPAL ACCESS · 02</span>
              <span className="role-button-main">View as city staff <span>↗</span></span>
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
