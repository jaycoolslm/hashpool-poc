"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const hapi_proto_1 = require("@bugbytes/hapi-proto");
const utils_js_1 = require("./utils.js");
const sdk_1 = require("@hashgraph/sdk");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const buyerId = '0.0.2665255';
const sellerId = '0.0.2599594';
const amount = 10;
const nftId = '0.0.4299280';
const nftSerial = 4;
const startDelay = 30;
const url = 'https://hashpooltest.azurewebsites.net';
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    // create base transaction with no signatures
    const emptySignedTxBytes = createSignedTransferTransaction(buyerId, sellerId, amount, nftId, nftSerial, startDelay);
    const bodyBytes = getBodyBytesFromSignedTransaction(emptySignedTxBytes);
    const txId = (0, utils_js_1.transactionID_to_keyString)(hapi_proto_1.TransactionBody.decode(bodyBytes).transactionID);
    console.log('txid', txId);
    // add tx to hashpool
    const addTxRes = yield fetch(`${url}/Transactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
        },
        body: emptySignedTxBytes,
    });
    console.log('addTxRes', addTxRes.ok);
    // get signed tx bytes from hashpool
    const getTxBytesRes = yield fetch(`${url}/Transactions/${txId}/protobuf`, {
        headers: {
            "Content-Type": "application/octet-stream",
        },
    });
    const emptySignedTxBytesFromHashpool = yield getTxBytesRes.arrayBuffer();
    // add seller signature to tx
    const privateKey = sdk_1.PrivateKey.fromStringED25519(process.env.SELLER_KEY);
    const txBodyBytesFromHashpool = getBodyBytesFromSignedTransaction(new Uint8Array(emptySignedTxBytesFromHashpool));
    const sigMapBytes = createSigMapBytes(privateKey, txBodyBytesFromHashpool);
    // upload signature to tx
    const addSignatureToHashpoolRes = yield fetch(`${url}/Transactions/${txId}/signatures`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
        },
        body: sigMapBytes,
    });
    console.log("addSignatureToHashpool", addSignatureToHashpoolRes.ok);
    console.log(yield addSignatureToHashpoolRes.json());
});
main()
    .then(() => {
    console.log("Success!");
    process.exit(0);
})
    .catch((err) => {
    console.error(err);
    process.exit(1);
});
function createSigMapBytes(privateKey, txBodyBytes) {
    console.log('txbody bytes from hashpool ', Buffer.from(txBodyBytes).toString('hex'));
    const signature = privateKey.sign(txBodyBytes);
    return hapi_proto_1.SignatureMap.encode(hapi_proto_1.SignatureMap.fromPartial({
        sigPair: [
            hapi_proto_1.SignaturePair.fromPartial({
                pubKeyPrefix: privateKey.publicKey.toBytes(),
                signature: {
                    $case: 'ed25519',
                    ed25519: signature
                }
            })
        ]
    })).finish();
}
function getBodyBytesFromSignedTransaction(signedTx) {
    const bodyBytes = hapi_proto_1.SignedTransaction.decode(signedTx).bodyBytes;
    return bodyBytes;
}
function createSignedTransferTransaction(buyerId, sellerId, amount, // AMOUNT IN TINY BAR
nftId, nftSerial, startDelay) {
    const transactionID = hapi_proto_1.TransactionID.fromPartial({
        accountID: (0, utils_js_1.keyString_to_accountID)(buyerId),
        transactionValidStart: (0, utils_js_1.createTimestampFromNow)(startDelay || 0),
    });
    const txBodyBytes = hapi_proto_1.TransactionBody.encode(hapi_proto_1.TransactionBody.fromPartial({
        data: {
            $case: "cryptoTransfer",
            cryptoTransfer: hapi_proto_1.CryptoTransferTransactionBody.fromPartial({
                transfers: hapi_proto_1.TransferList.fromPartial({
                    accountAmounts: [
                        hapi_proto_1.AccountAmount.fromPartial({
                            accountID: (0, utils_js_1.keyString_to_accountID)(buyerId),
                            amount: -amount
                        }),
                        hapi_proto_1.AccountAmount.fromPartial({
                            accountID: (0, utils_js_1.keyString_to_accountID)(sellerId),
                            amount
                        })
                    ]
                }),
                tokenTransfers: [
                    hapi_proto_1.TokenTransferList.fromPartial({
                        token: (0, utils_js_1.keyString_to_tokenID)(nftId),
                        nftTransfers: [
                            hapi_proto_1.NftTransfer.fromPartial({
                                senderAccountID: (0, utils_js_1.keyString_to_accountID)(sellerId),
                                receiverAccountID: (0, utils_js_1.keyString_to_accountID)(buyerId),
                                serialNumber: nftSerial
                            })
                        ]
                    })
                ]
            })
        },
        transactionFee: 500000000,
        nodeAccountID: (0, utils_js_1.keyString_to_accountID)('0.0.3'),
        transactionValidDuration: { seconds: 180 },
        transactionID,
    })).finish();
    const privateKey = sdk_1.PrivateKey.fromStringED25519(process.env.BUYER_KEY);
    const signedTransactionBytes = hapi_proto_1.SignedTransaction.encode({
        bodyBytes: txBodyBytes,
        // add buyer key when creating the transaction
        sigMap: hapi_proto_1.SignatureMap.decode(createSigMapBytes(privateKey, txBodyBytes)),
    }).finish();
    return signedTransactionBytes;
}
