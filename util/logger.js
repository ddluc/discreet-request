var colors = require('colors/safe');

const debug = true;

module.exports = {


  /**
   * info
   * @description standard log for production and security
   * @param {string} prefix - prefix the log with context (i.e. Database, Network)
   * @param {string} msg - the message to log
   */
  'info': function(msg='') {
    console.log(colors.cyan(msg));
  },

  /**
   * warn
   * @description standard log for dev and production
   * @param {string} msg - the message to log
   */
  'warn': function(msg='') {
    console.log(colors.yellow(msg));
  },

  /**
   * error
   * @description error logs for development and production
   * @param {string} msg - the message to log
   */
  'error': function(msg='') {
    console.log(colors.red.bold(msg));
  },

  /**
   * dev
   * @description development specific logs for
   * @param {string} msg - the message to log
   */
  'dev': function(msg='') {
    if (process.env.NODE_ENV == 'development') {
      console.log(colors.green(msg));
    }
  }

}
