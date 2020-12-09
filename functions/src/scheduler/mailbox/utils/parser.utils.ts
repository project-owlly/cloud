import {sha256} from 'js-sha256';

import Accounts from 'web3-eth-accounts';

import {defineMessages} from 'react-intl';

const messages = defineMessages({
  parsingFail: {
    id: 'parser.parsingFail',
    defaultMessage: 'error parsing signature',
  },
  signatureIncomplete: {
    id: 'parser.signatureIncomplete',
    defaultMessage: 'signature incomplete',
  },
  signatureCheckFailed: {
    id: 'parser.signatureCheckFailed',
    defaultMessage: 'signature check failed',
  },
  hashMismatch: {
    id: 'parser.hashMismatch',
    defaultMessage: 'document hash mismatch',
  },
  subjectDoesNotMatchClaims: {
    id: 'parser.subjectDoesNotMatchClaims',
    defaultMessage: 'subject does not match claims',
  },
});

export function getSignatures(data: ArrayBuffer) {
  const signature = getSignature(data);

  if (signature === null) {
    return [];
  }

  if (signature.err) {
    return [signature];
  }

  const checkedSignature = checkSignature(data, signature);
  if (checkedSignature.err) {
    return [checkedSignature];
  }

  const signatures = [signature.data];

  // parse and check additional signatures (if any)
  let lastSignature: any = signature;
  let currentData = data;
  while (true) {
    currentData = currentData.slice(0, currentData.byteLength - lastSignature.length);

    const sig = getSignature(currentData);
    if (sig === null || sig.err) {
      // error parsing signature -> end of signatures
      break;
    }

    const check = checkSignature(currentData, sig);
    if (check !== true && check.err) {
      // error checking signature -> not sure what to do, but stop parsing additional ones
      console.log('invalid signature found in chain', sig);
      break;
    }

    signatures.push(sig.data);
    lastSignature = sig;
  }

  return signatures;
}

function makeErr(msg: any) {
  return {
    err: msg,
  };
}

/**
 * Look for a signature (with marker at the end of the provided data. Parse
 * JSON and return if successfull.
 */
export function getSignature(data: ArrayBuffer): any {
  const marker = '_SIGv1_PROCIVIS';
  const buffer: any = data.slice(data.byteLength - marker.length);
  if (data.byteLength <= marker.length || Buffer.from(buffer, 'utf8').toString() !== marker) {
    // no marker found
    return null;
  }

  const view = new Uint8Array(data);
  const openBrace = 123; // '{'
  const closingBrace = 125; // '}'
  if (view[view.length - marker.length - 1] !== closingBrace) {
    return makeErr(messages.parsingFail);
  }

  // find starting index
  let levels = 0;
  let startIndex = -1;
  for (let i = view.length - marker.length - 1; i >= 0; i--) {
    const c = view[i];

    if (c === closingBrace) {
      levels++;
    } else if (c === openBrace) {
      levels--;

      if (levels < 0) {
        return makeErr(messages.parsingFail);
      }

      if (levels === 0) {
        // end of object reached
        startIndex = i;
        break;
      }
    }
  }

  if (startIndex < 0) {
    return makeErr(messages.parsingFail);
  }

  const sigBuffer: any = data.slice(startIndex, data.byteLength - marker.length);
  const sigString = Buffer.from(sigBuffer, 'utf8').toString();
  const parsedSig = JSON.parse(sigString);
  return {
    sig: parsedSig.sig,
    rawData: parsedSig.data,
    data: JSON.parse(parsedSig.data),
    length: view.length - startIndex,
  };
}

function checkSignature(data: ArrayBuffer, sig: any): any {
  // step zero: check for required fields in signature data
  function checkClaim(claim: any) {
    return claim.data && claim.issuer && claim.subject && claim.ts && claim.type;
  }
  if (
    !sig.data ||
    !sig.data.sub ||
    !sig.data.hash ||
    !sig.data.claims ||
    !sig.data.claims.firstName ||
    !sig.data.claims.lastName ||
    !checkClaim(sig.data.claims.firstName) ||
    !checkClaim(sig.data.claims.lastName)
  ) {
    return makeErr(messages.signatureIncomplete);
  }

  // step one: check signature of data
  const accounts = new Accounts();
  const recovered = accounts.recover(sig.rawData, sig.sig);

  if (recovered !== sig.data.sub) {
    return makeErr(messages.signatureCheckFailed);
  }

  // step two: check if document hash matches signed hash
  const dataHash = sha256(data.slice(0, data.byteLength - sig.length));
  if (dataHash !== sig.data.hash) {
    return makeErr(messages.hashMismatch);
  }

  // step three: check if used key corresponds to subject in claim
  for (const claimType in sig.data.claims) {
    if (sig.data.claims[claimType].subject !== sig.data.sub) {
      return makeErr(messages.subjectDoesNotMatchClaims);
    }
  }

  // checking for revocation of the signature is handled externally
  return true;
}
