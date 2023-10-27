declare module 'redis' {
  export interface RedisClient {
    
    end(flush?: boolean): void;
    quit(): void;

    set(key: string, value: string, mode: 'EX' | 'PX', time: number, callback?: (err: Error | null, reply: string) => void): void;
    get(key: string, callback: (err: Error | null, reply: string) => void): void;
    del(keys: string | string[], callback?: (err: Error | null, reply: number) => void): void;
    
  }
}