import { 
  CoreOptions, Response as CoreResponse
} from "request";

import { RedisClient } from "redis";


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
  pool: {
    proxies: Proxy[]; 
    proxyAuth: Nullable<{ username: string, password: string }>;
    targetEndpoint: string,
    failureCases: string
    protocol: RequestProtocol;
    refreshProxies: boolean; 
    refreshRate: number;
    refreshInterval: Nullable<NodeJS.Timeout>;
  }
  thottle: {
    requests: number
    milliseconds: number
  }
  userAgents: string[]
  redis: Nullable<RedisClient>
  cacheTTL: number
}

export type RequestOptions = CoreOptions; 

export type Response = {
  err: any, 
  response: CoreResponse, 
  body: string
}

export type Proxy = string; 

export type RequestProtocol = 'http' | 'https'; 

export type StatusCode = number;

export type DiscreetResponse = {
  body: string
  statusCode: number,
  cached: boolean,
  raw: CoreResponse
}


