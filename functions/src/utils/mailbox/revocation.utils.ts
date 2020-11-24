import axios from 'axios';
import {configuration} from '../../config/oidc/schaffhausen';
import {defineMessages} from 'react-intl';

const messages = defineMessages({
  signatureRevoked: {
    id: 'revocation.signatureRevoked',
    defaultMessage: 'Signature is revoked',
  },
  issuerNotTrusted: {
    id: 'revocation.issuerNotTrusted',
    defaultMessage: 'Issuer of the identity is not trusted',
  },
});

export async function checkRevocation(sig: any) {
  const url = configuration.issuer + '/api/internal/revocations';

  if (!sig.hasOwnProperty('claims')) {
    console.error('Missing claims property, skipping revocation');
    return sig;
  }

  // We do serial approach and timeout not to get 502 from the gateway.
  for (const claimKey of Object.keys(sig.claims)) {
    const claim = sig.claims[claimKey];
    const sigHex = claim.signature;
    const issuer = claim.issuer;

    // wait for 200ms
    await new Promise((resolve) => setTimeout(resolve, 200));

    const r = await axios.post(url, {sig: sigHex, issuer});

    const data = r.data;

    console.log('Revocation status:', data);

    if (data === true || data.revoked) {
      return {
        sig,
        err: messages.signatureRevoked,
      };
    }

    if (data === false || data.trusted !== true) {
      return {
        sig,
        err: messages.issuerNotTrusted,
      };
    }
  }

  return sig;
}
