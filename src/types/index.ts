import { 
  CoreOptions, Response as CoreResponse
} from "request";


/**
 * Redis Client
 */

export interface RedisClient {
  set(key: string, value: string, mode: 'EX' | 'PX', time: number): string;
  get(key: string): string;
}


/**
 * Utility Types
 */
export type Nullable<T> = T | null;

export type Dictionary<T> = { [key: string]: T };

export type ClassDefinition<C> = new (...args: any[]) => C;

export type AnonymousFunc = (...args: any[]) => any;

export type InstanceProperties<T> = {
  [K in keyof T]?: T[K] extends Function ? never : T[K];
};

/**
 * Core Types
 */

export type MainConfig = {
  proxies?: Proxy[]; 
  proxyAuth?: Nullable<{ username: string, password: string }>
  failureCases?: number[]
  maxRetries?: number
  protocol?: RequestProtocol
  throttle?: {
    count?: number
    milliseconds?: number
  }
  userAgents?: string[]
  redis?: Nullable<any>
  cache?: boolean
  cacheTTL?: number
}

export type RequestOptions = CoreOptions; 

export type Response = {
  id?: string,
  err: any, 
  response: CoreResponse, 
  body: string
}

export type Proxy = string; 

export type RequestProtocol = 'http' | 'https'; 

export type StatusCode = number;

export type DiscreetResponse = {
  body: any,
  statusCode: Nullable<number>,
  cached: boolean,
  raw: Nullable<CoreResponse>
}


