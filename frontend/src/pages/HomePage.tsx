import React from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'

function CityIllustration() {
  return (
    <div className="city-visual" aria-label="Illustrated 3D map of Concepción">
      <div className="city-visual-topline">
        <span className="city-live-dot" />
        <span>LIVE CITY OVERVIEW</span>
        <span className="city-coordinate">36°49' S · 73°03' W</span>
      </div>
      <svg className="city-map" viewBox="0 0 660 520" role="img" aria-labelledby="city-map-title">
        <title id="city-map-title">A stylized digital twin of Concepción</title>
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="skewY(-28)">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#1c5261" strokeWidth="1" />
          </pattern>
          <linearGradient id="map-ground" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#163445" />
            <stop offset="1" stopColor="#0b1928" />
          </linearGradient>
          <filter id="building-shadow" x="-40%" y="-40%" width="180%" height="190%">
            <feDropShadow dx="0" dy="11" stdDeviation="7" floodColor="#000916" floodOpacity=".65" />
          </filter>
        </defs>
        <path d="M74 105 398 13l190 109-324 188L74 105Z" fill="url(#map-ground)" />
        <path d="M74 105 398 13l190 109-324 188L74 105Z" fill="url(#map-grid)" />
        <path d="m126 101 278-79 157 90-279 81-156-92Z" fill="none" stroke="#38a6b6" strokeWidth="7" opacity=".42" />
        <path d="m158 226 282-83 129 75-281 82-130-74Z" fill="none" stroke="#38a6b6" strokeWidth="7" opacity=".42" />
        <path d="m280 45 4 274M431 34l4 271M105 164l471-137M139 274l461-133" fill="none" stroke="#2a6571" strokeWidth="7" opacity=".8" />
        <path d="m163 94 278 81-148 86-279-81 149-86Z" fill="#143646" opacity=".85" />
        <g filter="url(#building-shadow)">
          <g>
            <path d="m205 107 39-12 24 14-39 12-24-14Z" fill="#48b6c2" />
            <path d="m205 107 39-12v27l-39 12v-27Z" fill="#24758b" />
            <path d="m244 95 24 14v27l-24-14V95Z" fill="#18546c" />
          </g>
          <g>
            <path d="m304 88 28-9 18 10-28 9-18-10Z" fill="#73d6d5" />
            <path d="m304 88 28-9v34l-28 9V88Z" fill="#286f86" />
            <path d="m332 79 18 10v34l-18-10V79Z" fill="#1b5067" />
          </g>
          <g>
            <path d="m389 117 43-13 27 15-43 13-27-15Z" fill="#5fc4ce" />
            <path d="m389 117 43-13v32l-43 13v-32Z" fill="#246a82" />
            <path d="m432 104 27 15v32l-27-15v-32Z" fill="#174b63" />
          </g>
          <g>
            <path d="m157 155 31-9 20 11-31 9-20-11Z" fill="#438f9e" />
            <path d="m157 155 31-9v25l-31 9v-25Z" fill="#205f76" />
            <path d="m188 146 20 11v25l-20-11v-25Z" fill="#17485d" />
          </g>
          <g>
            <path d="m264 161 37-11 23 13-37 11-23-13Z" fill="#71d5d6" />
            <path d="m264 161 37-11v37l-37 11v-37Z" fill="#267389" />
            <path d="m301 150 23 13v37l-23-13v-37Z" fill="#194c63" />
          </g>
          <g>
            <path d="m364 184 31-9 20 12-31 9-20-12Z" fill="#4aa9b7" />
            <path d="m364 184 31-9v29l-31 9v-29Z" fill="#22677e" />
            <path d="m395 175 20 12v29l-20-12v-29Z" fill="#174b61" />
          </g>
          <g>
            <path d="m447 69 34-10 21 12-34 10-21-12Z" fill="#69d2d0" />
            <path d="m447 69 34-10v30l-34 10V69Z" fill="#286e84" />
            <path d="m481 59 21 12v30l-21-12V59Z" fill="#1b5065" />
          </g>
          <g>
            <path d="m231 211 24-7 16 9-24 7-16-9Z" fill="#55bac5" />
            <path d="m231 211 24-7v24l-24 7v-24Z" fill="#236b82" />
            <path d="m255 204 16 9v24l-16-9v-24Z" fill="#184a61" />
          </g>
        </g>
        <g fill="#36c6ce">
          <circle cx="190" cy="122" r="5" /><circle cx="349" cy="145" r="6" />
          <circle cx="463" cy="167" r="5" /><circle cx="229" cy="181" r="5" />
          <circle cx="385" cy="78" r="5" /><circle cx="319" cy="226" r="6" />
          <circle cx="492" cy="116" r="5" />
        </g>
        <path d="M145 220c56-27 91 5 133-18 44-24 69-54 114-42 28 7 54 23 81 14" fill="none" stroke="#ff4f9a" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
        <g transform="translate(350 155)">
          <circle r="23" fill="#ff4f9a" opacity=".18" />
          <circle r="13" fill="#ff4f9a" stroke="#e8ffff" strokeWidth="3" />
          <circle r="4" fill="#fff" />
        </g>
        <g transform="translate(478 172)">
          <circle r="20" fill="#38d8e2" opacity=".2" />
          <circle r="11" fill="#38d8e2" stroke="#e8ffff" strokeWidth="3" />
          <circle r="3" fill="#fff" />
        </g>
        <path d="M80 333h490" stroke="#286371" strokeWidth="1" strokeDasharray="3 8" />
        <text x="84" y="356" fill="#82b8bd" fontSize="12" fontFamily="sans-serif" letterSpacing="2">CENTRO · CONCEPCIÓN</text>
      </svg>
      <div className="map-float-card map-float-report">
        <span className="map-float-icon">↗</span>
        <span><strong>New report</strong><small>Streetlight · 2 min ago</small></span>
        <span className="map-float-status">NEW</span>
      </div>
      <div className="map-float-card map-float-health">
        <span className="health-ring">86</span>
        <span><strong>City pulse</strong><small>Service activity today</small></span>
      </div>
      <div className="city-visual-caption">A city in focus <span>→</span></div>
    </div>
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
            <Link className="role-button" to="/municipal-access">
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
