// WalletSetup.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Replaces @reown/appkit-adapter-tron with the official Tron wallet stack.
//
// WHY:
//   @reown/appkit-adapter-tron filters wallets by Tron namespace (only ~20 wallets).
//   @tronweb3/tronwallet-adapter-react-hooks + WalletConnectAdapter shows ALL 100+
//   wallets AND connects Trust Wallet via its injected provider (window.trustwallet),
//   fixing the "Failed to publish custom payload" WalletConnect relay error.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  WalletProvider as TronWalletProvider,
  useWallet,
} from '@tronweb3/tronwallet-adapter-react-hooks'
import { TronLinkAdapter }   from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter }       from '@tronweb3/tronwallet-adapter-trust'
import { MetaMaskAdapter }    from '@tronweb3/tronwallet-adapter-metamask-tron'
import { OkxWalletAdapter }   from '@tronweb3/tronwallet-adapter-okxwallet'
import {
  WalletConnectAdapter,
} from '@tronweb3/tronwallet-adapter-walletconnect'

const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'

// Re-export useWallet so App.tsx doesn't need to import it separately
export { useWallet }

export function WalletProvider({ children }: { children: ReactNode }) {
  const adapters = useMemo(() => [
    // ── Injected wallets (detected automatically when extension/in-app browser is present) ──
    new TronLinkAdapter({
      openUrlWhenWalletNotFound: false,
      checkTimeout: 3_000,
    }),
    new TrustAdapter({
      // When inside Trust Wallet's browser, uses window.trustwallet (injected) directly.
      // This is why the WalletConnect relay error goes away.
      openUrlWhenWalletNotFound: false,
    }),
    new MetaMaskAdapter(),
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),

    // ── WalletConnect ─────────────────────────────────────────────────────────
    // Shows ALL 100+ wallets because it doesn't filter by Tron namespace.
    // This is the key difference from @reown/appkit-adapter-tron.
    new WalletConnectAdapter({
      network: 'Mainnet',
      options: {
        projectId: WC_PROJECT_ID,
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: 'USDT Collector',
          description: 'Collect USDT from multiple wallets to one main wallet',
          url: window.location.origin,
          icons: ['https://cryptologos.cc/logos/tether-usdt-logo.png'],
        },
      },
      themeMode: 'dark',
      allWallets: 'SHOW',        // ← Shows ALL wallets, not just Tron-declared ones
    }),
 ] as any, [])

  const onError = (error: Error) => {
    // Swallow "wallet not found" noise — user just doesn't have that extension installed
    if (error.message?.includes('not found') || error.message?.includes('not installed')) return
    console.error('[Wallet error]', error)
  }

  return (
    <TronWalletProvider adapters={adapters} onError={onError} autoConnect>
      {children}
    </TronWalletProvider>
  )
}