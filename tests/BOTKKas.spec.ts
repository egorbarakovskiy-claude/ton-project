import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Address, Dictionary, Cell } from '@ton/core';
import { JettonMinter } from '../build/JettonMinter/JettonMinter_JettonMinter';
import { JettonWallet } from '../build/JettonMinter/JettonMinter_JettonWallet';
import '@ton/test-utils';
import { createHash } from 'crypto';

// ===== Helper: build on-chain metadata =====
function buildOnchainMetadata(data: Record<string, string>): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    for (const [key, value] of Object.entries(data)) {
        const hash = BigInt('0x' + createHash('sha256').update(key).digest('hex'));
        const cell = beginCell()
            .storeUint(0, 8) // snake prefix
            .storeStringTail(value)
            .endCell();
        dict.set(hash, cell);
    }
    return beginCell()
        .storeUint(0, 8) // on-chain prefix
        .storeDict(dict)
        .endCell();
}

const TOTAL_SUPPLY = 1_000_000n;
const TOKEN_NAME = 'BOTKKas';
const TOKEN_SYMBOL = 'BOTKKas';
const TOKEN_DECIMALS = '0';
const TOKEN_DESCRIPTION = 'Bootcamp internal currency';

describe('BOTKKas Jetton', () => {
    let blockchain: Blockchain;
    let admin: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let jettonMinter: SandboxContract<JettonMinter>;
    let content: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');

        content = buildOnchainMetadata({
            name: TOKEN_NAME,
            symbol: TOKEN_SYMBOL,
            decimals: TOKEN_DECIMALS,
            description: TOKEN_DESCRIPTION,
        });

        // Deploy minter with totalSupply=0, mintable=true
        jettonMinter = blockchain.openContract(
            await JettonMinter.fromInit(0n, admin.address, content, true)
        );

        const deployResult = await jettonMinter.send(
            admin.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'Mint',
                queryId: 0n,
                receiver: admin.address,
                mintMessage: {
                    $$type: 'JettonTransferInternal',
                    queryId: 0n,
                    amount: TOTAL_SUPPLY,
                    sender: admin.address,
                    responseDestination: admin.address,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                },
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: jettonMinter.address,
            deploy: true,
            success: true,
        });
    });

    // ===== Helper: get admin's jetton wallet =====
    async function getJettonWallet(ownerAddress: Address): Promise<SandboxContract<JettonWallet>> {
        const walletAddress = await jettonMinter.getGetWalletAddress(ownerAddress);
        return blockchain.openContract(JettonWallet.fromAddress(walletAddress));
    }

    // ==========================================
    // M2: Jetton Master — Deploy & Metadata
    // ==========================================

    describe('Deployment & Metadata', () => {
        it('should deploy and mint all tokens to admin', async () => {
            const data = await jettonMinter.getGetJettonData();
            expect(data.totalSupply).toBe(TOTAL_SUPPLY);
        });

        it('should return correct admin address', async () => {
            const data = await jettonMinter.getGetJettonData();
            expect(data.adminAddress.equals(admin.address)).toBe(true);
        });

        it('should be mintable after initial deploy', async () => {
            const data = await jettonMinter.getGetJettonData();
            expect(data.mintable).toBe(true);
        });

        it('should store correct metadata content', async () => {
            const data = await jettonMinter.getGetJettonData();
            expect(data.jettonContent.toBoc().toString('base64')).toBe(
                content.toBoc().toString('base64')
            );
        });

        it('should have admin wallet with full supply', async () => {
            const adminWallet = await getJettonWallet(admin.address);
            const walletData = await adminWallet.getGetWalletData();
            expect(walletData.balance).toBe(TOTAL_SUPPLY);
        });

        it('should return correct wallet address via getter', async () => {
            const walletAddress = await jettonMinter.getGetWalletAddress(admin.address);
            const adminWallet = await getJettonWallet(admin.address);
            expect(walletAddress.equals(adminWallet.address)).toBe(true);
        });
    });

    // ==========================================
    // M2: Minting Controls
    // ==========================================

    describe('Minting Controls', () => {
        it('should reject mint from non-admin', async () => {
            const mintResult = await jettonMinter.send(
                user1.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'Mint',
                    queryId: 1n,
                    receiver: user1.address,
                    mintMessage: {
                        $$type: 'JettonTransferInternal',
                        queryId: 1n,
                        amount: 100n,
                        sender: user1.address,
                        responseDestination: user1.address,
                        forwardTonAmount: 0n,
                        forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                    },
                }
            );

            expect(mintResult.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMinter.address,
                success: false,
            });
        });

        it('should close minting and reject further mints', async () => {
            // Close minting
            const closeResult = await jettonMinter.send(
                admin.getSender(),
                { value: toNano('0.05') },
                { $$type: 'CloseMinting' }
            );

            expect(closeResult.transactions).toHaveTransaction({
                from: admin.address,
                to: jettonMinter.address,
                success: true,
            });

            // Verify mintable is false
            const data = await jettonMinter.getGetJettonData();
            expect(data.mintable).toBe(false);

            // Try to mint — should fail
            const mintResult = await jettonMinter.send(
                admin.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'Mint',
                    queryId: 2n,
                    receiver: admin.address,
                    mintMessage: {
                        $$type: 'JettonTransferInternal',
                        queryId: 2n,
                        amount: 100n,
                        sender: admin.address,
                        responseDestination: admin.address,
                        forwardTonAmount: 0n,
                        forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                    },
                }
            );

            expect(mintResult.transactions).toHaveTransaction({
                from: admin.address,
                to: jettonMinter.address,
                success: false,
            });

            // Total supply unchanged
            const dataAfter = await jettonMinter.getGetJettonData();
            expect(dataAfter.totalSupply).toBe(TOTAL_SUPPLY);
        });

        it('should reject close minting from non-admin', async () => {
            const closeResult = await jettonMinter.send(
                user1.getSender(),
                { value: toNano('0.05') },
                { $$type: 'CloseMinting' }
            );

            expect(closeResult.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMinter.address,
                success: false,
            });
        });
    });

    // ==========================================
    // M2: Admin Controls
    // ==========================================

    describe('Admin Controls', () => {
        it('should change owner', async () => {
            const result = await jettonMinter.send(
                admin.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'ChangeOwner',
                    queryId: 0n,
                    newOwner: user1.address,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: jettonMinter.address,
                success: true,
            });

            const data = await jettonMinter.getGetJettonData();
            expect(data.adminAddress.equals(user1.address)).toBe(true);
        });

        it('should reject change owner from non-admin', async () => {
            const result = await jettonMinter.send(
                user1.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'ChangeOwner',
                    queryId: 0n,
                    newOwner: user1.address,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMinter.address,
                success: false,
            });
        });

        it('should update content', async () => {
            const newContent = buildOnchainMetadata({
                name: 'BOTKKas v2',
                symbol: 'BOTKKas',
                decimals: '0',
                description: 'Updated description',
            });

            const result = await jettonMinter.send(
                admin.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'JettonUpdateContent',
                    queryId: 0n,
                    content: newContent,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: jettonMinter.address,
                success: true,
            });

            const data = await jettonMinter.getGetJettonData();
            expect(data.jettonContent.toBoc().toString('base64')).toBe(
                newContent.toBoc().toString('base64')
            );
        });
    });

    // ==========================================
    // M3: Jetton Wallet — Transfers
    // ==========================================

    describe('Transfers', () => {
        it('should transfer tokens from admin to user1', async () => {
            const adminWallet = await getJettonWallet(admin.address);
            const transferAmount = 1000n;

            const result = await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 0n,
                    amount: transferAmount,
                    destination: user1.address,
                    responseDestination: admin.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: adminWallet.address,
                success: true,
            });

            // Check balances
            const adminWalletData = await adminWallet.getGetWalletData();
            expect(adminWalletData.balance).toBe(TOTAL_SUPPLY - transferAmount);

            const user1Wallet = await getJettonWallet(user1.address);
            const user1WalletData = await user1Wallet.getGetWalletData();
            expect(user1WalletData.balance).toBe(transferAmount);
        });

        it('should transfer tokens between participants', async () => {
            // Admin -> user1
            const adminWallet = await getJettonWallet(admin.address);
            await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 0n,
                    amount: 500n,
                    destination: user1.address,
                    responseDestination: admin.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            // User1 -> user2
            const user1Wallet = await getJettonWallet(user1.address);
            const result = await user1Wallet.send(
                user1.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 1n,
                    amount: 200n,
                    destination: user2.address,
                    responseDestination: user1.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: user1Wallet.address,
                success: true,
            });

            // Check all balances
            const user1Data = await user1Wallet.getGetWalletData();
            expect(user1Data.balance).toBe(300n); // 500 - 200

            const user2Wallet = await getJettonWallet(user2.address);
            const user2Data = await user2Wallet.getGetWalletData();
            expect(user2Data.balance).toBe(200n);

            const adminData = await adminWallet.getGetWalletData();
            expect(adminData.balance).toBe(TOTAL_SUPPLY - 500n);
        });

        it('should reject transfer with insufficient balance', async () => {
            const adminWallet = await getJettonWallet(admin.address);

            const result = await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 0n,
                    amount: TOTAL_SUPPLY + 1n, // more than balance
                    destination: user1.address,
                    responseDestination: admin.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: adminWallet.address,
                success: false,
            });

            // Balance unchanged
            const data = await adminWallet.getGetWalletData();
            expect(data.balance).toBe(TOTAL_SUPPLY);
        });

        it('should reject transfer from non-owner', async () => {
            const adminWallet = await getJettonWallet(admin.address);

            // user1 tries to send tokens from admin's wallet
            const result = await adminWallet.send(
                user1.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 0n,
                    amount: 100n,
                    destination: user1.address,
                    responseDestination: user1.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: adminWallet.address,
                success: false,
            });
        });
    });

    // ==========================================
    // M3: Jetton Wallet — Burn
    // ==========================================

    describe('Burn', () => {
        it('should burn tokens and reduce total supply', async () => {
            const adminWallet = await getJettonWallet(admin.address);
            const burnAmount = 100n;

            const result = await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonBurn',
                    queryId: 0n,
                    amount: burnAmount,
                    responseDestination: admin.address,
                    customPayload: null,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: adminWallet.address,
                success: true,
            });

            // Wallet balance decreased
            const walletData = await adminWallet.getGetWalletData();
            expect(walletData.balance).toBe(TOTAL_SUPPLY - burnAmount);

            // Total supply decreased
            const minterData = await jettonMinter.getGetJettonData();
            expect(minterData.totalSupply).toBe(TOTAL_SUPPLY - burnAmount);
        });

        it('should reject burn with insufficient balance', async () => {
            const adminWallet = await getJettonWallet(admin.address);

            const result = await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonBurn',
                    queryId: 0n,
                    amount: TOTAL_SUPPLY + 1n,
                    responseDestination: admin.address,
                    customPayload: null,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: adminWallet.address,
                success: false,
            });
        });

        it('should reject burn from non-owner', async () => {
            const adminWallet = await getJettonWallet(admin.address);

            const result = await adminWallet.send(
                user1.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonBurn',
                    queryId: 0n,
                    amount: 100n,
                    responseDestination: user1.address,
                    customPayload: null,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: adminWallet.address,
                success: false,
            });
        });
    });

    // ==========================================
    // TEP-89: Wallet Discovery
    // ==========================================

    describe('Wallet Discovery (TEP-89)', () => {
        it('should provide wallet address on request', async () => {
            const result = await jettonMinter.send(
                user1.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'ProvideWalletAddress',
                    queryId: 0n,
                    ownerAddress: user1.address,
                    includeAddress: true,
                }
            );

            expect(result.transactions).toHaveTransaction({
                from: jettonMinter.address,
                to: user1.address,
                success: true,
            });
        });
    });

    // ==========================================
    // Full Lifecycle: deploy -> mint -> close -> transfer -> burn
    // ==========================================

    describe('Full Lifecycle', () => {
        it('should handle: mint -> close minting -> transfer -> burn', async () => {
            // 1. Close minting
            await jettonMinter.send(
                admin.getSender(),
                { value: toNano('0.05') },
                { $$type: 'CloseMinting' }
            );

            const minterData = await jettonMinter.getGetJettonData();
            expect(minterData.mintable).toBe(false);
            expect(minterData.totalSupply).toBe(TOTAL_SUPPLY);

            // 2. Transfer to user1
            const adminWallet = await getJettonWallet(admin.address);
            await adminWallet.send(
                admin.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonTransfer',
                    queryId: 1n,
                    amount: 5000n,
                    destination: user1.address,
                    responseDestination: admin.address,
                    customPayload: null,
                    forwardTonAmount: 0n,
                    forwardPayload: beginCell().storeUint(0, 1).asSlice(),
                }
            );

            // 3. User1 burns some tokens
            const user1Wallet = await getJettonWallet(user1.address);
            await user1Wallet.send(
                user1.getSender(),
                { value: toNano('0.1') },
                {
                    $$type: 'JettonBurn',
                    queryId: 2n,
                    amount: 1000n,
                    responseDestination: user1.address,
                    customPayload: null,
                }
            );

            // 4. Verify final state
            const finalMinterData = await jettonMinter.getGetJettonData();
            expect(finalMinterData.totalSupply).toBe(TOTAL_SUPPLY - 1000n); // 999,000
            expect(finalMinterData.mintable).toBe(false);

            const adminData = await adminWallet.getGetWalletData();
            expect(adminData.balance).toBe(TOTAL_SUPPLY - 5000n); // 995,000

            const user1Data = await user1Wallet.getGetWalletData();
            expect(user1Data.balance).toBe(4000n); // 5000 - 1000
        });
    });
});
