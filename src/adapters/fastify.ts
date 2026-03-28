import { FastifyPluginCallback } from 'fastify';
import Inspekt from '../core.js';
import fp from 'fastify-plugin'

const inspektFastify = (inspekt: Inspekt): FastifyPluginCallback => {
    return fp((fastify, _, done) => {
        fastify.addHook('preSerialization', async (request, _, payload) => {
            (request as any)._inspektBody = payload;
            return payload;
        });

        fastify.addHook("onResponse", async (request, reply) => {
            console.log("Received a new response!");
            await inspekt.backgroundAnalysis(request, reply, (request as any)._inspektBody)
                .catch((err) => console.error('[Inspekt] Fastify background analysis failed:', err));
        });

        done();
    });
};


export default inspektFastify