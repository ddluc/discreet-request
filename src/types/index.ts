import { 
  CoreOptions, Response as CoreResponse
} from "request";

/**
 * Redis Client
 */

export interface RedisClient {
    
  end(flush?: boolean): void;
  quit(): void;

  set(key: string, value: string, mode: 'EX' | 'PX', time: number, callback?: (err: Error | null, reply: string) => void): void;
  get(key: string, callback: (err: Error | null, reply: string) => void): void;
  del(keys: string | string[], callback?: (err: Error | null, reply: number) => void): void;
  
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
  pool?: {
    proxies?: Proxy[]; 
    proxyAuth?: Nullable<{ username: string, password: string }>;
    targetEndpoint?: string,
    failureCases?: number[]
    protocol?: RequestProtocol;
    refreshProxies?: boolean; 
    refreshRate?: number;
    refreshInterval?: number
  }
  throttle?: {
    count?: number
    milliseconds?: number
  }
  userAgents?: string[]
  redis?: Nullable<RedisClient>
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
  body: string
  statusCode: Nullable<number>,
  cached: boolean,
  raw: Nullable<CoreResponse>
}


