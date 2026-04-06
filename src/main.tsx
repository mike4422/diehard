// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import App from './App'
// import { WalletProvider } from './WalletSetup'
// import './index.css'

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <WalletProvider>
//       <App />
//     </WalletProvider>
//   </React.StrictMode>
// )

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ✅ IMPORTANT: AppKit provider is auto-created via createAppKit()
// DO NOT wrap with WalletProvider anymore

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)