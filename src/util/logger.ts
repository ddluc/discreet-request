import { Logger } from "../types";

var colors = require('colors/safe');


const logger = (enabled: boolean = true, level: number = 2): Logger => ({

  /**
   * dev
   * @description development specific logs for
   * @param {string} msg - the message to log
   */
  'dev': function(msg='') {
    if (!enabled) return;
    if (level >= 4) console.log(colors.green(`[DISCREET] ${msg}`));
  },

  /**
   * info
   * @description standard log for production and security
   * @param {string} prefix - prefix the log with context (i.e. Database, Network)
   * @param {string} msg - the message to log
   */
  'info': function(msg='') {
    if (!enabled) return;
    if (level >= 3) console.log(colors.cyan(`[DISCREET] ${msg}`));
  },

  /**
   * warn
   * @description standard log for dev and production
   * @param {string} msg - the message to log
   */
  'warn': function(msg='') {
    if (!enabled) return;
    if (level >= 2) console.log(colors.yellow(`[DISCREET] ${msg}`));
  },

  /**
   * error
   * @description error logs for development and production
   * @param {string} msg - the message to log
   */
  'error': function(msg='') {
    if (!enabled) return;
    if (level >= 1) console.log(colors.red.bold(`[DISCREET] ${msg}`));
  }

}); 

export default logger;