import mockResponses from './responses';
import { RequestOptions, Response, Nullable, InstanceProperties } from '../../types';import Throttler from '../../lib/Throttler';
import EventEmitter from "events";

const mockThrottler = (key: string = 'success'): Throttler => {

  type Request = {id: string, url: string, options: RequestOptions};
  
  type ThrottlerConfig = InstanceProperties<MockThrottler>;

  class MockThrottler {

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
    }

    async test() {
      return 'mock';
    }

    async run() {}
  
    async stop() {}
  
    async exec(url: string, options: RequestOptions): Promise<Response> {
      const response = {
        err: null,
        response: mockResponses[key],
        body: mockResponses[key].body,
      } as Response;
      return Promise.resolve(response);
    }
  
    async queue(url: string, options: RequestOptions): Promise<Response> {
      const response = {
        err: null,
        response: mockResponses[key],
        body: mockResponses[key].body,
      } as Response;
      return Promise.resolve(response);
    }
  }

  const throttler = new MockThrottler(); 
  
  return throttler as Throttler; 

}

export default mockThrottler; 

