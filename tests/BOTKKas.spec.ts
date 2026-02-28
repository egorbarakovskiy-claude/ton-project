import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { BOTKKas } from '../build/BOTKKas/BOTKKas_BOTKKas';
import '@ton/test-utils';

describe('BOTKKas', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bOTKKas: SandboxContract<BOTKKas>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        bOTKKas = blockchain.openContract(await BOTKKas.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await bOTKKas.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bOTKKas.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bOTKKas are ready to use
    });
});
