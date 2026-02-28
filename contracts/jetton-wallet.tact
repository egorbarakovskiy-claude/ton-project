import "./messages";

const minTonsForStorage: Int = ton("0.01");
const gasForTransfer: Int = ton("0.015");

contract JettonWallet(
    owner: Address,
    minter: Address,
    balance: Int as coins,
) {

    // ===== Transfer: owner sends tokens to another address =====
    receive(msg: JettonTransfer) {
        require(sender() == self.owner, "Incorrect sender");
        require(self.balance >= msg.amount, "Insufficient balance");
        self.balance -= msg.amount;

        deploy(DeployParameters{
            value: 0,
            mode: SendRemainingValue | SendBounceIfActionFail,
            bounce: true,
            body: JettonTransferInternal{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination,
                forwardTonAmount: msg.forwardTonAmount,
                forwardPayload: msg.forwardPayload,
            }.toCell(),
            init: initOf JettonWallet(msg.destination, self.minter, 0),
        });
    }

    // ===== Receive transfer from another wallet or minter =====
    receive(msg: JettonTransferInternal) {
        // Validate sender: must be either the minter or the sender's wallet
        let senderWallet: StateInit = initOf JettonWallet(msg.sender, self.minter, 0);
        if (!senderWallet.hasSameBasechainAddress(sender())) {
            require(self.minter == sender(), "Incorrect sender");
        }

        self.balance += msg.amount;

        // Forward notification to owner if requested
        if (msg.forwardTonAmount > 0) {
            message(MessageParameters{
                to: self.owner,
                value: msg.forwardTonAmount,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                bounce: false,
                body: JettonNotification{
                    queryId: msg.queryId,
                    amount: msg.amount,
                    sender: msg.sender,
                    forwardPayload: msg.forwardPayload,
                }.toCell(),
            });
        }

        // Return excess gas to response destination
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

    // ===== Burn: owner destroys tokens =====
    receive(msg: JettonBurn) {
        require(sender() == self.owner, "Incorrect sender");
        require(self.balance >= msg.amount, "Insufficient balance");
        self.balance -= msg.amount;

        message(MessageParameters{
            to: self.minter,
            value: 0,
            mode: SendRemainingValue | SendBounceIfActionFail,
            bounce: true,
            body: JettonBurnNotification{
                queryId: msg.queryId,
                amount: msg.amount,
                sender: self.owner,
                responseDestination: msg.responseDestination,
            }.toCell(),
        });
    }

    // ===== Bounced handlers: rollback on failure =====
    bounced(msg: bounced<JettonTransferInternal>) {
        self.balance += msg.amount;
    }

    bounced(msg: bounced<JettonBurnNotification>) {
        self.balance += msg.amount;
    }

    // ===== Getter: wallet data =====
    get fun get_wallet_data(): JettonWalletData {
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            minter: self.minter,
            code: myCode(),
        };
    }
}
