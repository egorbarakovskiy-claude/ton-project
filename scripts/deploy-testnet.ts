import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { TonClient } from '@ton/ton';
import { toNano, beginCell, Dictionary, Cell, internal } from '@ton/core';
import { JettonMinter } from '../build/JettonMinter/JettonMinter_JettonMinter';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const TOTAL_SUPPLY = 1_000_000n;

function buildOnchainMetadata(data: Record<string, string>): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    for (const [key, value] of Object.entries(data)) {
        const hash = BigInt('0x' + createHash('sha256').update(key).digest('hex'));
        const cell = beginCell()
            .storeUint(0, 8)
            .storeStringTail(value)
            .endCell();
        dict.set(hash, cell);
    }
    return beginCell()
        .storeUint(0, 8)
        .storeDict(dict)
        .endCell();
}

async function main() {
    // Load wallet
    const walletData = JSON.parse(readFileSync('.testnet-wallet.json', 'utf8'));
    const mnemonic = walletData.mnemonic.split(' ');
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    // Connect to testnet via decentralized RPC (no rate limits)
    const endpoint = await getHttpEndpoint({ network: 'testnet' });
    console.log('Using endpoint:', endpoint);

    const client = new TonClient({ endpoint });

    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });

    const walletContract = client.open(wallet);
    const balance = await walletContract.getBalance();
    console.log('Wallet address:', wallet.address.toString({ testOnly: true, bounceable: false }));
    console.log('Balance:', Number(balance) / 1e9, 'TON');

    if (balance < toNano('0.5')) {
        console.error('\n❌ Not enough balance. Need at least 0.5 TON.');
        console.error('Send test TON via @testgiver_ton_bot to:', walletData.address);
        process.exit(1);
    }

    // Build metadata
    const content = buildOnchainMetadata({
        name: 'BOTKKas',
        symbol: 'BOTKKas',
        decimals: '0',
        description: 'Bootcamp internal currency',
    });

    // Create minter contract
    const minter = client.open(
        await JettonMinter.fromInit(0n, wallet.address, content, true)
    );

    console.log('\nDeploying JettonMinter to:', minter.address.toString({ testOnly: true }));

    // Deploy + Mint all tokens in one transaction
    const seqno = await walletContract.getSeqno();

    // Build Mint message body
    const mintBody = beginCell()
        .storeUint(0x642b7d07, 32) // Mint opcode
        .storeUint(0, 64) // queryId
        .storeAddress(wallet.address) // receiver
        .storeRef(
            beginCell()
                .storeUint(0x178d4519, 32) // JettonTransferInternal opcode
                .storeUint(0, 64) // queryId
                .storeCoins(TOTAL_SUPPLY) // amount
                .storeAddress(wallet.address) // sender
                .storeAddress(wallet.address) // responseDestination
                .storeCoins(0) // forwardTonAmount
                .storeUint(0, 1) // forwardPayload (empty)
                .endCell()
        )
        .endCell();

    await walletContract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: minter.address,
                value: toNano('0.25'),
                init: minter.init,
                body: mintBody,
            }),
        ],
    });

    console.log('\n⏳ Waiting for deployment...');

    // Wait for deployment
    let deployed = false;
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const newSeqno = await walletContract.getSeqno();
            if (newSeqno > seqno) {
                deployed = true;
                break;
            }
        } catch {
            // Ignore transient errors during polling
        }
    }

    if (!deployed) {
        console.error('❌ Deployment timeout. Check manually on explorer.');
        process.exit(1);
    }

    // Wait a bit more for the contract to be fully deployed
    await new Promise(r => setTimeout(r, 5000));

    const minterAddress = minter.address.toString({ testOnly: true });
    const explorerUrl = `https://testnet.tonviewer.com/${minterAddress}`;

    console.log('\n✅ DEPLOYED SUCCESSFULLY!');
    console.log('=========================');
    console.log('Minter address:', minterAddress);
    console.log('Explorer:', explorerUrl);
    console.log('Admin wallet:', walletData.address);
    console.log('Total supply:', TOTAL_SUPPLY.toString(), 'BOTKKas');

    // Save deployment info
    const deployInfo = {
        network: 'testnet',
        minterAddress,
        adminAddress: walletData.address,
        totalSupply: TOTAL_SUPPLY.toString(),
        explorerUrl,
        deployedAt: new Date().toISOString(),
    };

    writeFileSync('docs/DEPLOYMENT-TESTNET.md', `# Testnet Deployment

## Contract Addresses

| Parameter | Value |
|-----------|-------|
| Network | TON Testnet |
| Minter Address | \`${minterAddress}\` |
| Admin Wallet | \`${walletData.address}\` |
| Total Supply | ${TOTAL_SUPPLY.toLocaleString()} BOTKKas |
| Deployed At | ${deployInfo.deployedAt} |

## Explorer

[View on Tonviewer](${explorerUrl})

## Verification Steps

1. Open the explorer link above
2. Check \`get_jetton_data\` — should show totalSupply = ${TOTAL_SUPPLY.toLocaleString()}
3. Try sending BOTKKas to another testnet wallet
`);

    console.log('\nDeployment info saved to docs/DEPLOYMENT-TESTNET.md');
}

main().catch(console.error);
