import * as functions from 'firebase-functions';

import * as cors from 'cors';

export function getOwlly(request: functions.Request, response: functions.Response<any>) {
    const corsHandler = cors({origin: true});

    corsHandler(request, response, () => {
        try {
            // TODO
            response.json({
                todo: 'todo'
            });
        } catch (err) {
            response.status(500).json({
                error: err,
            });
        }
    });
}
