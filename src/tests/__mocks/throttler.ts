import mockResponses from './responses';
import { RequestOptions, Response, Nullable, InstanceProperties, Logger } from '../../types';import Throttler from '../../lib/Throttler';
import EventEmitter from "events";
import logger from '../../util/logger';

const mockThrottler = (key: string = 'success'): Throttler => {

  type Request = {id: string, url: string, options: RequestOptions};
  
  type ThrottlerConfig = InstanceProperties<MockThrottler>;

  class MockThrottler {

    emitter: EventEmitter; 
    requests: Request[];
    count: number; 
    milliseconds: number; 
    interval: Nullable<NodeJS.Timeout>;
    debug: boolean;
    logger: Logger;

    constructor(config: ThrottlerConfig = {}) {
      const { count = 1, milliseconds = 1000 } = config;
      this.emitter = new EventEmitter(); 
      this.requests = [];
      this.count = count;
      this.milliseconds = milliseconds;
      this.debug = false;
      this.logger = logger(false, 0);
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

