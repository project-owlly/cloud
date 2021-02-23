import {EventContext} from 'firebase-functions';

import {readMailboxPdfs} from './utils/mailbox.utils';

export async function readMailbox(context: EventContext) {
  try {
    await readMailboxPdfs();

    //TODO: Read all Temp Files and Send reminder E-Mail

    // TODO: function does nothing more than reading the mailbox, findings PDF and their related owllyIds
  } catch (err) {
    console.error(err);
  }
}
