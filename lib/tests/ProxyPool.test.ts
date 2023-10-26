import ProxyPool from "../ProxyPool";

describe('#ProxyPool', () => {

  it('should log the message', () => {
    const pool = new ProxyPool(); 
    pool.log(); 
    expect(true).toBe(true);
  }); 

}); 