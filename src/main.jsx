import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode make the app to run twice in development mode to detect side effects
  // For our case, it will affect the image generation endpoint which will be called twice
  // and will delay the inference time
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)
