import * as functions from 'firebase-functions';

import * as cors from 'cors';

import {Owlly} from '../../types/owlly';
import {RequestError} from '../../types/request.error';

export function getOwlly(request: functions.Request, response: functions.Response<Owlly | RequestError>) {
    const corsHandler = cors({origin: true});

    corsHandler(request, response, () => {
        try {
            response.json({
                id: `mkro4noxKW9CNGE7mGFE`,
                title: 'Sichere Velorouten für Zürich',
                description: 'Mehr als die Hälfte der Velofahrenden gibt an, dass sie sich im Strassenverkehr häufig unsicher fühlen.',
                link: `/initiative/sichere-velorouten-fuer-zuerich`,
                organisation: 'Initiativkomitee «Sichere Velorouten für Zürich»'
            });
        } catch (err) {
            response.status(500).json({
                error: err,
            });
        }
    });
}
