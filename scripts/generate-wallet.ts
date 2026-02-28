import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { writeFileSync, existsSync } from 'fs';

async function main() {
    const walletFile = '.testnet-wallet.json';

    if (existsSync(walletFile)) {
        console.log('Wallet already exists in', walletFile);
        const data = JSON.parse(require('fs').readFileSync(walletFile, 'utf8'));
        console.log('\nTestnet address:', data.address);
        console.log('\nSend test TON to this address via @testgiver_ton_bot in Telegram');
        return;
    }

    console.log('Generating new testnet wallet...\n');

    const mnemonic = await mnemonicNew(24);
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });

    const address = wallet.address.toString({ testOnly: true, bounceable: false });

    const walletData = {
        mnemonic: mnemonic.join(' '),
        address: address,
        publicKey: keyPair.publicKey.toString('hex'),
    };

    writeFileSync(walletFile, JSON.stringify(walletData, null, 2));

    console.log('=== NEW TESTNET WALLET ===');
    console.log('Address:', address);
    console.log('Mnemonic saved to:', walletFile);
    console.log('\n--- NEXT STEPS ---');
    console.log('1. Open Telegram bot: @testgiver_ton_bot');
    console.log('2. Send this address to the bot:', address);
    console.log('3. Wait for test TON to arrive (~10 seconds)');
    console.log('4. Then run: npx ts-node scripts/deploy-testnet.ts');
    console.log('\n⚠️  KEEP .testnet-wallet.json SECRET — it contains your mnemonic!');
}

main().catch(console.error);
