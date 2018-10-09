/**
 * Custom Error classes
 */

 class ErrorBase extends Error {
   constructor(message) {
     super();
     this.message = message;
     this.stack = (new Error()).stack;
     this.name = this.constructor.name;
   }
 }

class NetworkError extends ErrorBase {
 constructor(m) {
   super(m);
 }
}

class ProxyError extends ErrorBase {
 constructor(m) {
   super(m);
 }
}

module.exports = {
  NetworkError,
  ProxyError
};
