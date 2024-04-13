// @ts-nocheck
import { ethers } from 'ethers';
import { WebSocket } from 'ws';

const WEBSOCKET_BACKOFF_BASE = 50;
const WEBSOCKET_BACKOFF_CAP = 30000;
const WEBSOCKET_PING_INTERVAL = 10000;
const WEBSOCKET_PONG_TIMEOUT = 5000;

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const WebSocketProviderClass = (): new () => ethers.providers.WebSocketProvider => (class { } as never);

export class WebSocketProvider extends WebSocketProviderClass() {
    private attempts = 0;
    private destroyed = false;
    private timeout?: NodeJS.Timeout;
    private static instances: Map<string, WebSocketProvider> = new Map();

    private events: ethers.providers.WebSocketProvider['_events'] = [];
    private requests: ethers.providers.WebSocketProvider['_requests'] = {};
    private provider?: ethers.providers.WebSocketProvider;
    private currentEndpointIndex = 0;
    private maxAttemptsBeforeThrow = 20;

    private handler = {
        get(target: WebSocketProvider, prop: keyof WebSocketProvider, receiver: unknown) {
            if (target[prop]) return target[prop];

            const value = target.provider && Reflect.get(target.provider, prop, receiver);

            return value instanceof Function ? value.bind(target.provider) : value;
        },
    };

    constructor(private providerUrls: string[]) {
        super();
        // Get a random index to start
        this.currentEndpointIndex = getRandomInt(0, this.providerUrls.length - 1);
        this.create(this.providerUrls[this.currentEndpointIndex]);

        return new Proxy(this, this.handler);
    }

    public static getInstance(
        id: string,
        urls: string[]
    ): WebSocketProvider | undefined {
        if (!this.instances.get(id)) {
            this.instances.set(id, new WebSocketProvider(urls))
        }
        return this.instances.get(id)
    }

    private create(currentUrl: string) {
        if (this.provider) {
            this.events = [...this.events, ...this.provider._events];
            this.requests = { ...this.requests, ...this.provider._requests };
        }
        console.log('Creating WebSocketProvider: %s', currentUrl)

        let webSocket: WebSocket;
        let provider: ethers.providers.WebSocketProvider;
        try {
            webSocket = new WebSocket(currentUrl);
            provider = new ethers.providers.WebSocketProvider(webSocket, this.provider?.network?.chainId);
        } catch (error) {
            // Increment the attempt counter and check if it exceeds the maximum allowed attempts
            if (++this.attempts > this.maxAttemptsBeforeThrow) {
                throw new Error(`Max attempts of ${this.maxAttemptsBeforeThrow} reached. Unable to establish a WebSocket connection.`);
            }

            const sleep = getRandomInt(0, Math.min(WEBSOCKET_BACKOFF_CAP, WEBSOCKET_BACKOFF_BASE * 2 ** (this.attempts - 1)));
            this.timeout = setTimeout(() => {
                if (this.timeout) clearTimeout(this.timeout);
                this.create(this.getNextRpcUrl());
            }, sleep);
        }

        let pingInterval: NodeJS.Timer | undefined;
        let pongTimeout: NodeJS.Timeout | undefined;

        webSocket.on('open', () => {
            this.attempts = 0;
            console.log('WebSocket open: %s - attempt: %s', currentUrl, this.attempts);

            pingInterval = setInterval(() => {
                webSocket.ping();
                // console.debug(`WebSocket ping: ${currentUrl}`)
                pongTimeout = setTimeout(() => {
                    webSocket.terminate();
                }, WEBSOCKET_PONG_TIMEOUT);
            }, WEBSOCKET_PING_INTERVAL);

            let event;
            while ((event = this.events.pop())) {
                provider._events.push(event);
                provider._startEvent(event);
            }

            for (const key in this.requests) {
                provider._requests[key] = this.requests[key];
                webSocket.send(this.requests[key].payload);
                delete this.requests[key];
            }
        });

        webSocket.on('error', (err) => {
            console.info(`WebSocket error, current url is ${currentUrl} - ERR: ${err.message}`,);
        });

        webSocket.on('pong', () => {
            if (pongTimeout) clearTimeout(pongTimeout);
            // console.debug(`WebSocket pong: ${currentUrl}`);
        });

        webSocket.on('close', () => {
            provider._wsReady = false;

            console.log(`WebSocket was closed: ${currentUrl}`);
            if (pingInterval) clearInterval(pingInterval as NodeJS.Timeout);
            if (pongTimeout) clearTimeout(pongTimeout as NodeJS.Timeout);

            if (!this.destroyed) {
                let sleep = 0;
                if (this.providerUrls.length === 1) {
                    // If we will be reconnecting to the same target, we want to sleep for a bit
                    sleep = getRandomInt(0, Math.min(WEBSOCKET_BACKOFF_CAP, WEBSOCKET_BACKOFF_BASE * 2 ** this.attempts++));
                }
                this.timeout = setTimeout(() => this.create(this.getNextRpcUrl()), sleep);
            }
        });

        this.provider = provider;
    }

    private getNextRpcUrl(): string {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.providerUrls.length;
        const url = this.providerUrls[this.currentEndpointIndex];
        console.log('Switching to next WebSocketProvider: %s', url);
        return url;
    }

    public async destroy() {
        this.destroyed = true;
        console.log('Destroying WebSocketProvider: %s', this.provider?.connection.url);
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        if (this.provider) {
            await this.provider.destroy();
        }
    }

    public static async deleteInstance(id: string) {
        const instance = this.instances.get(id);
        if (instance) {
            console.log('Deleting instance: %s', id);
            await instance.destroy();
            this.instances.delete(id);
        }
    }
}