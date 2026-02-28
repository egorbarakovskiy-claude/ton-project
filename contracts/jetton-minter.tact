import "./messages";
import "./jetton-wallet";

contract JettonMinter(
    totalSupply: Int as coins,
    owner: Address,
    jettonContent: Cell,
    mintable: Bool,
) {

    // ===== Mint: only owner, only when mintable =====
    receive(msg: Mint) {
        require(sender() == self.owner, "Incorrect sender");
        require(self.mintable, "Minting is closed");
        self.totalSupply += msg.mintMessage.amount;

        deploy(DeployParameters{
            value: 0,
            mode: SendRemainingValue | SendBounceIfActionFail,
            bounce: true,
            body: msg.mintMessage.toCell(),
            init: initOf JettonWallet(msg.receiver, myAddress(), 0),
        });
    }

    // ===== Burn notification from wallet =====
    receive(msg: JettonBurnNotification) {
        // Validate: sender must be the wallet of the burning user
        let wallet: StateInit = initOf JettonWallet(msg.sender, myAddress(), 0);
        require(wallet.hasSameBasechainAddress(sender()), "Unauthorized burn notification");

        self.totalSupply -= msg.amount;

        if (msg.responseDestination != null) {
            message(MessageParameters{
                to: msg.responseDestination!!,
                value: 0,
                mode: SendRemainingValue | SendIgnoreErrors,
                bounce: false,
                body: JettonExcesses{
                    queryId: msg.queryId,
                }.toCell(),
            });
        }
    }

    // ===== Close minting forever =====
    receive(msg: CloseMinting) {
        require(sender() == self.owner, "Incorrect sender");
        self.mintable = false;
        cashback(sender());
    }

    // ===== Change owner (revoke = set to burn address) =====
    receive(msg: ChangeOwner) {
        require(sender() == self.owner, "Incorrect sender");
        self.owner = msg.newOwner;
        cashback(sender());
    }

    // ===== Update metadata =====
    receive(msg: JettonUpdateContent) {
        require(sender() == self.owner, "Incorrect sender");
        self.jettonContent = msg.content;
        cashback(sender());
    }

    // ===== TEP-89: Wallet address discovery =====
    receive(msg: ProvideWalletAddress) {
        let walletInit: StateInit = initOf JettonWallet(msg.ownerAddress, myAddress(), 0);
        let walletAddress: Address = contractAddress(walletInit);

        let ownerCell: Cell? = null;
        if (msg.includeAddress) {
            ownerCell = beginCell().storeAddress(msg.ownerAddress).endCell();
        }

        message(MessageParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue | SendIgnoreErrors,
            bounce: true,
            body: TakeWalletAddress{
                queryId: msg.queryId,
                walletAddress: walletAddress,
                ownerAddress: ownerCell,
            }.toCell(),
        });
    }

    // ===== Bounced: rollback totalSupply if mint fails =====
    bounced(msg: bounced<JettonTransferInternal>) {
        self.totalSupply -= msg.amount;
    }

    // ===== Getters =====

    get fun get_jetton_data(): JettonMinterState {
        return JettonMinterState{
            totalSupply: self.totalSupply,
            mintable: self.mintable,
            adminAddress: self.owner,
            jettonContent: self.jettonContent,
            jettonWalletCode: codeOf JettonWallet,
        };
    }

    get fun get_wallet_address(ownerAddress: Address): Address {
        return contractAddress(initOf JettonWallet(ownerAddress, myAddress(), 0));
    }
}
