/**
 * Custom Error classes
 */

 export class ErrorBase extends Error {
   constructor(message: string) {
     super();
     this.message = message;
     this.stack = (new Error()).stack;
     this.name = this.constructor.name;
   }
 }

 export class RequestError extends ErrorBase {
  constructor(m: string) {
    super(m);
    this.name = this.constructor.name;
  }
 }

export class NetworkError extends ErrorBase {
 constructor(m: string) {
   super(m);
   this.name = this.constructor.name;
 }
}

export class ProxyError extends ErrorBase {
 constructor(m: string) {
   super(m);
   this.name = this.constructor.name;
 }
}

export class RedisError extends ErrorBase {
 constructor(m: string) {
   super(m);
   this.name = this.constructor.name;
 }
}