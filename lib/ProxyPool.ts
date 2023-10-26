class ProxyPool {

  private message: string; 

  constructor() {
    this.message = 'Be discreet!'
  }

  log () {
    console.log(this.message);
  }

}

export default ProxyPool; 