import { createApp } from './app.js';
import { env } from './config/env.js';
import { createIntelligenceContainer } from './config/intelligence-container.js';
const intelligence = createIntelligenceContainer();
const server = createApp(intelligence).listen(env.PORT, () => console.info(`INFVER API: http://localhost:${env.PORT}/api/v1`));
const stopFeeds = intelligence.start();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stopFeeds(); server.close(() => process.exit(0)); });
