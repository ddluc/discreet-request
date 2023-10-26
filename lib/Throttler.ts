import request from "request";
import { RequestOptions, Response } from "./types";

class Throttler {

  private requests: number; 

  private milliseconds: number

  constructor(requests = 1, milliseconds = 500) {
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