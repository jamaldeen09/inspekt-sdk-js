import Inspekt from "./core.js"
import inspektFastify from './adapters/fastify.js';
import fastifyFormBody from '@fastify/formbody';
import Fastify from "fastify"

const fastify = Fastify({ logger: true });

// 1. Initialize Core SDK
const inspekt = new Inspekt({
    apiKey: "ins_live_ttjthtjhthhtththhtjtjthnnjjjjjjj",
    analysisMode: "always"
});

fastify.register(fastifyFormBody);

// 2. Register the Inspekt Plugin
// This attaches the hooks (preSerialization & onResponse) automatically
fastify.register(inspektFastify(inspekt));

// 3. Define a Test Route
fastify.post('/test', async (request, reply) => {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
        const data = await response.json();

        // In Fastify, you just return the object or use reply.send()
        return data; 
    } catch (err) {
        reply.status(500).send({ error: "External API Failed" });
    }
});

// 4. Start the Engine
const start = async () => {
    try {
        await fastify.listen({ port: 4000 });
        console.log("⚡ Fastify is screaming on port 4000");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();