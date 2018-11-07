const sinon = require('sinon');
const DiscreetRequestTest = require('./DiscreetRequestTest'),
      ProxyPoolTest = require('./ProxyPoolTest');

DiscreetRequestTest();
ProxyPoolTest(); 

afterEach(() => {
  sinon.restore();
});
