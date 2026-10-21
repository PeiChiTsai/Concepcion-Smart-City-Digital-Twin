import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // 引入 App 取代原本的 TelluxMap

const rootElement = document.getElementById('viewer')
if (!rootElement) throw new Error('failed to find the root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)