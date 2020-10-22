import * as functions from 'firebase-functions';

import {readMailboxPdfs} from '../../utils/mailbox/mailbox.utils';

export async function mailboxGet(request: functions.Request, response: functions.Response<any>): Promise<void> {
  try {
    const owllyIds: string[] = await readMailboxPdfs();

    response.json({result: `${owllyIds.length}`});
  } catch (err) {
    response.status(500).json({
      error: err,
    });
  }
}
