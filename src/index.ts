import { AccountAmount, CryptoTransferTransactionBody, NftTransfer, Signature, SignatureMap, SignaturePair, SignedTransaction, TokenTransferList, Transaction, TransactionBody, TransactionID, TransferList } from "@bugbytes/hapi-proto";
import { createTimestampFromNow, EntityIdKeyString, keyString_to_accountID, keyString_to_tokenID, transactionID_to_keyString } from "./utils.js";
import { PrivateKey } from '@hashgraph/sdk'
import * as dotenv from 'dotenv'
dotenv.config()

const buyerId = '0.0.xxx'
const sellerId = '0.0.xxx'
const amount = 10
const nftId = '0.0.xxx'
const nftSerial = 4
const startDelay = 30

const url = 'https://hashpooltest.azurewebsites.net'


const main = async () => {
  // create base transaction with no signatures
  const emptySignedTxBytes = createSignedTransferTransaction(
    buyerId,
    sellerId,
    amount,
    nftId,
    nftSerial,
    startDelay
  )


  const bodyBytes = getBodyBytesFromSignedTransaction(emptySignedTxBytes)
  const txId = transactionID_to_keyString(TransactionBody.decode(bodyBytes).transactionID!)

  console.log('txid', txId)

  // add tx to hashpool
  const addTxRes = await fetch(`${url}/Transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: emptySignedTxBytes,
  });

  console.log('addTxRes', addTxRes.ok);

  // get signed tx bytes from hashpool
  const getTxBytesRes = await fetch(`${url}/Transactions/${txId}/protobuf`, {
    headers: {
      "Content-Type": "application/octet-stream",
    },
  })
  const emptySignedTxBytesFromHashpool = await getTxBytesRes.arrayBuffer()



  // add seller signature to tx
  const privateKey = PrivateKey.fromStringED25519(process.env.SELLER_KEY!)
  const txBodyBytesFromHashpool = getBodyBytesFromSignedTransaction(new Uint8Array(emptySignedTxBytesFromHashpool))
  const sigMapBytes = createSigMapBytes(privateKey, txBodyBytesFromHashpool)
  // upload signature to tx
  const addSignatureToHashpoolRes = await fetch(`${url}/Transactions/${txId}/signatures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: sigMapBytes,
  })

  console.log("addSignatureToHashpool", addSignatureToHashpoolRes.ok)

}

main()
  .then(() => {
    console.log("Success!")
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

function createSigMapBytes(privateKey: PrivateKey, txBodyBytes: Uint8Array) {
  console.log('txbody bytes from hashpool ', Buffer.from(txBodyBytes).toString('hex'))

  const signature = privateKey.sign(txBodyBytes)
  return SignatureMap.encode(SignatureMap.fromPartial(
    {
      sigPair: [
        SignaturePair.fromPartial({
          pubKeyPrefix: privateKey.publicKey.toBytes(),
          signature: {
            $case: 'ed25519',
            ed25519: signature
          }
        })
      ]
    }
  )).finish()
}

function getBodyBytesFromSignedTransaction(signedTx: Uint8Array) {
  const bodyBytes = SignedTransaction.decode(signedTx).bodyBytes
  return bodyBytes
}


function createSignedTransferTransaction(
  buyerId: EntityIdKeyString,
  sellerId: EntityIdKeyString,
  amount: number, // AMOUNT IN TINY BAR
  nftId: EntityIdKeyString,
  nftSerial: number,
  startDelay: number
): Uint8Array {
  const transactionID = TransactionID.fromPartial({
    accountID: keyString_to_accountID(buyerId),
    transactionValidStart: createTimestampFromNow(startDelay || 0),
  });

  const txBodyBytes = TransactionBody.encode(
    TransactionBody.fromPartial({
      data: {
        $case: "cryptoTransfer",
        cryptoTransfer: CryptoTransferTransactionBody.fromPartial({
          transfers: TransferList.fromPartial({
            accountAmounts: [
              AccountAmount.fromPartial({
                accountID: keyString_to_accountID(buyerId),
                amount: -amount
              }),
              AccountAmount.fromPartial({
                accountID: keyString_to_accountID(sellerId),
                amount
              })
            ]
          }),
          tokenTransfers: [
            TokenTransferList.fromPartial({
              token: keyString_to_tokenID(nftId),
              nftTransfers: [
                NftTransfer.fromPartial({
                  senderAccountID: keyString_to_accountID(sellerId),
                  receiverAccountID: keyString_to_accountID(buyerId),
                  serialNumber: nftSerial
                })
              ]
            })
          ]
        })
      },
      transactionFee: 5_00_000_000,
      nodeAccountID: keyString_to_accountID('0.0.3'),
      transactionValidDuration: { seconds: 180 },
      transactionID,
    })
  ).finish();


  const privateKey = PrivateKey.fromStringED25519(process.env.BUYER_KEY!)
  const signedTransactionBytes = SignedTransaction.encode({
    bodyBytes: txBodyBytes,

    // add buyer key when creating the transaction
    sigMap: SignatureMap.decode(createSigMapBytes(privateKey, txBodyBytes)),
  }).finish()

  return signedTransactionBytes
}
