/*
 * Browser entry point: sets the document title and language from the configuration
 * and mounts the App component.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { configResult, DEFAULT_APP_TITLE } from './config/env'
import { locale } from './i18n'
import './app/global.css'

document.title = configResult.ok ? configResult.config.appTitle : DEFAULT_APP_TITLE
document.documentElement.lang = locale

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
