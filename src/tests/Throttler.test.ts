import request from 'request';
import Throttler from '../lib/Throttler';
import mockResponses from './__mocks/responses'

jest.useFakeTimers();

jest.mock('request', () => {
  return jest.fn((url, options, cb) => {
    cb(null, mockResponses.success.response, mockResponses.success.body);
  });
});

describe('Throttler', () => {

  afterEach(() => {
    jest.clearAllTimers();
  })
  
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should process requests within concurrency limit', (done) => {
    const throttler = new Throttler({ count: 2, milliseconds: 1000 });
    const url1 = 'http://example.com/1';
    const url2 = 'http://example.com/2';

    const promise1 = throttler.queue(url1, {});
    const promise2 = throttler.queue(url2, {});

    const startTime = Date.now();
    
    jest.advanceTimersByTime(1000); 

    Promise.all([promise1, promise2]).then(([res1, res2]) => {
      // Expect both requests to be processed within a reasonable time frame
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toEqual(1000);
      expect(res1.body).toEqual(mockResponses.success.body);
      expect(res2.body).toEqual(mockResponses.success.body);
      throttler.stop(); 
      done();
    }); 

  });

  it('should not exceed the concurrency limit', (done) => {
    const throttler = new Throttler({ count: 2, milliseconds: 1000 });

    const url1 = 'http://example.com/1';
    const url2 = 'http://example.com/2';
    const url3 = 'http://example.com/3';

    const promise1 = throttler.queue(url1, {});
    const promise2 = throttler.queue(url2, {});
    const promise3 = throttler.queue(url3, {});

    const startTime = Date.now();
    
    jest.advanceTimersByTime(1000); 

    Promise.all([promise1, promise2]).then(([res1, res2]) => {
      jest.advanceTimersByTime(1000); 
    }); 

    promise3.then((res ) => {
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toEqual(2000);
      expect(res.body).toEqual(mockResponses.success.body);
      throttler.stop(); 
      done(); 
    }); 

  });

  it('should automatically close all active event listeners', (done) => {
    const throttler = new Throttler({ count: 2, milliseconds: 1000 });

    const url1 = 'http://example.com/1';
    const url2 = 'http://example.com/2';
    const url3 = 'http://example.com/3';

    const promise = throttler.queue(url1, {});

    const startTime = Date.now();
    
    jest.advanceTimersByTime(2000); 

    promise.then((res) => {
      const event = `request-${res.id}`; 
      expect(throttler.emitter.listenerCount(event)).toEqual(0);
      throttler.stop(); 
      done(); 
    }); 

  });

});


  
