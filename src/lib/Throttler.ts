import request from "request";
import { RequestOptions, Response, InstanceProperties } from "../types";

export type ThrottlerConfig = InstanceProperties<Throttler>;

class Throttler {

  requests: number; 

  milliseconds: number

  constructor(config: ThrottlerConfig = {}) {
    const { requests = 1, milliseconds = 360000 } = config;
    this.requests = requests;
    this.milliseconds = milliseconds;
  }

  async exec (url: string, options: RequestOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      request(url, options, (err, response, body) => {
        resolve({err, response, body});
      });
    }); 
  }

  /**
   * TODO: Implement custom rate limiting
   */
  async queue(url: string, options: RequestOptions): Promise<Response> {
    return this.exec(url, options);
  }

}

export default Throttler;