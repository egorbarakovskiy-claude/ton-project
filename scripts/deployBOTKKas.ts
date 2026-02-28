import { toNano } from '@ton/core';
import { BOTKKas } from '../build/BOTKKas/BOTKKas_BOTKKas';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const bOTKKas = provider.open(await BOTKKas.fromInit());

    await bOTKKas.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(bOTKKas.address);

    // run methods on `bOTKKas`
}
