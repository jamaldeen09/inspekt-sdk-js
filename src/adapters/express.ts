import { RequestHandler } from 'express';
import Inspekt from "../core.js"

const inspektExpress = (inspekt: Inspekt): RequestHandler => {
    return (req, res, next) => {
        const originalJson = res.json;
        let capturedBody: any = null;

        res.json = function (body: any) {
            capturedBody = body;
            return originalJson.call(this, body);
        };

        res.on('finish', () => inspekt.backgroundAnalysis(req, res, capturedBody)
            .catch((err) => console.error('[Inspekt] ExpressJS background analysis failed:', err)));
        next();
    };
};


export default inspektExpress