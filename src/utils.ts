import { AccountID, Timestamp, TransactionID } from "@bugbytes/hapi-proto";

export type EntityIdKeyString = `${number}.${number}.${number}` | `${number}.${number}.${string}`

export function createTimestampFromNow(delayInSeconds: number) {
  const miliseconds = Date.now() + delayInSeconds * 1000;
  const seconds = ~~(miliseconds / 1_000);
  const nanos = (miliseconds % 1000) * 1_000_000;
  return { seconds, nanos };
}

export function keyString_to_tokenID(address: EntityIdKeyString) {
  const [shard, realm, num] = address.split('.');
  const shardNum = parseInt(shard, 10);
  const realmNum = parseInt(realm, 10);
  const tokenNum = parseInt(num, 10);
  return { shardNum, realmNum, tokenNum };
}

export function keyString_to_accountID(address: EntityIdKeyString): AccountID {
  const [shard, realm, num] = address.split('.');
  const shardNum = parseInt(shard, 10);
  const realmNum = parseInt(realm, 10);
  const accountNum = parseInt(num, 10);
  return { shardNum, realmNum, account: { $case: 'accountNum', accountNum } };
}
export function accountID_to_keyString(account: AccountID) {
  switch (account.account?.$case) {
    case 'accountNum':
      return `${account.shardNum}.${account.realmNum}.${account.account.accountNum}`;
    default:
      throw Error(`Entity type not supported yet.`);
  }
}

function timestamp_to_keyString(timestamp: Timestamp) {
  if (timestamp) {
    const seconds = timestamp.seconds || 0;
    const nanos = timestamp.nanos || 0;
    /* @ts-ignore */
    return `${seconds.toFixed(0)}.${nanos.toFixed(0).padStart(9, '0')}`;
  }
  return exports.EmptyTimestampKeyString;
}


export function transactionID_to_keyString(transactionID: TransactionID) {
  if (transactionID && transactionID.accountID && transactionID.transactionValidStart) {
    let value = `${accountID_to_keyString(transactionID.accountID)}@${timestamp_to_keyString(transactionID.transactionValidStart)}`;
    if (transactionID.nonce) {
      value = value + `:${transactionID.nonce}`;
    }
    if (transactionID.scheduled) {
      value = value + "+scheduled";
    }
    /* @ts-ignore */
    return value;
  }
  return exports.EmptyTransactionIdKeyString;
}
