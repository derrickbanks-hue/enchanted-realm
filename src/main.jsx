import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Parent from './Parent.jsx'

const isParent = window.location.pathname.startsWith('/parent')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isParent ? <Parent /> : <App />}
  </React.StrictMode>
)
