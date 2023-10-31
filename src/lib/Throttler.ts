import { v4 } from 'uuid';
import request from "request";
import { RequestOptions, Response, InstanceProperties, Nullable } from "../types";
import EventEmitter from "events";

type Request = {id: string, url: string, options: RequestOptions};

export type ThrottlerConfig = InstanceProperties<Throttler>;

class Throttler {

  emitter: EventEmitter; 

  requests: Request[];

  count: number; 

  milliseconds: number; 

  interval: Nullable<NodeJS.Timeout>;

  constructor(config: ThrottlerConfig = {}) {
    const { count = 1, milliseconds = 1000 } = config;
    this.emitter = new EventEmitter(); 
    this.requests = [];
    this.count = count;
    this.milliseconds = milliseconds;
    this.interval = null; 
    this.run(); 
  }

  async run() { 
    const interval = setInterval(async () => {
      const requests = this.requests.splice(0, this.count);
      for (const request of requests) {
        const response = await this.exec(request.url, request.options);
        this.emitter.emit(`request-${request.id}`, response);
      }
    }, this.milliseconds);
    this.interval = interval;
  }

  async stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async exec (url: string, options: RequestOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      request(url, options, (err, response, body) => {
        resolve({err, response, body});
      });
    }); 
  }

  async queue(url: string, options: RequestOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      const request = { url, options, id: v4() }
      this.emitter.on(`request-${request.id}`, (response) => {
        resolve({ ...response, id: request.id});
        this.emitter.removeAllListeners(`request-${request.id}`)
      });
      this.requests.push(request); 
    });
  }

}

export default Throttler;