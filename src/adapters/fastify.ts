import { FastifyPluginCallback } from 'fastify';
import Inspekt from '../core.js';
import fp from 'fastify-plugin'

const inspektFastify = (inspekt: Inspekt): FastifyPluginCallback => {
    return fp((fastify, _, done) => {
        fastify.addHook('preSerialization', async (request, _, payload) => {
            (request as any)._inspektBody = payload;
            return payload;
        });

        fastify.addHook("onResponse", async (request, reply) => 
            await inspekt.backgroundAnalysis(request, reply, (request as any)._inspektBody));

        done();
    });
};


export default inspektFastify