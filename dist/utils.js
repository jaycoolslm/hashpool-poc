"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimestampFromNow = createTimestampFromNow;
exports.keyString_to_tokenID = keyString_to_tokenID;
exports.keyString_to_accountID = keyString_to_accountID;
exports.accountID_to_keyString = accountID_to_keyString;
exports.transactionID_to_keyString = transactionID_to_keyString;
function createTimestampFromNow(delayInSeconds) {
    const miliseconds = Date.now() + delayInSeconds * 1000;
    const seconds = ~~(miliseconds / 1000);
    const nanos = (miliseconds % 1000) * 1000000;
    return { seconds, nanos };
}
function keyString_to_tokenID(address) {
    const [shard, realm, num] = address.split('.');
    const shardNum = parseInt(shard, 10);
    const realmNum = parseInt(realm, 10);
    const tokenNum = parseInt(num, 10);
    return { shardNum, realmNum, tokenNum };
}
function keyString_to_accountID(address) {
    const [shard, realm, num] = address.split('.');
    const shardNum = parseInt(shard, 10);
    const realmNum = parseInt(realm, 10);
    const accountNum = parseInt(num, 10);
    return { shardNum, realmNum, account: { $case: 'accountNum', accountNum } };
}
function accountID_to_keyString(account) {
    var _a;
    switch ((_a = account.account) === null || _a === void 0 ? void 0 : _a.$case) {
        case 'accountNum':
            return `${account.shardNum}.${account.realmNum}.${account.account.accountNum}`;
        default:
            throw Error(`Entity type not supported yet.`);
    }
}
function timestamp_to_keyString(timestamp) {
    if (timestamp) {
        const seconds = timestamp.seconds || 0;
        const nanos = timestamp.nanos || 0;
        /* @ts-ignore */
        return `${seconds.toFixed(0)}.${nanos.toFixed(0).padStart(9, '0')}`;
    }
    return exports.EmptyTimestampKeyString;
}
function transactionID_to_keyString(transactionID) {
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
