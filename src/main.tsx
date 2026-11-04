import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import '@fontsource/ibm-plex-sans-devanagari/400.css'
import '@fontsource/ibm-plex-sans-devanagari/500.css'
import '@fontsource/ibm-plex-sans-devanagari/600.css'
import '@fontsource/ibm-plex-sans-devanagari/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import './index.css'

import { LangProvider } from './lib/i18n'
import { SessionProvider } from './lib/session'
import { ToastProvider } from './components/Toast'
import App from './App'

registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <BrowserRouter>
          <SessionProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SessionProvider>
        </BrowserRouter>
      </LangProvider>
    </QueryClientProvider>
  </StrictMode>,
)
