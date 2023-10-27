import Discreet from "./lib/DiscreetRequest";

const discreet = new Discreet();
discreet.init({ throttle:  { count: 3, milliseconds: 5000  } });

const endpoint = 'https://api.ipify.org'; 

const startTime = Date.now();

const promises = Array.from({ length: 12}).map(() => {
  return discreet.request(endpoint, { method: 'GET' });
})

promises.forEach((promise) => {
  promise.then((response) => {
    const elapsedTime = Date.now() - startTime;
    console.log(`REQUEST: [${elapsedTime}] ${endpoint} ==> ${response.body}`);
  });
})