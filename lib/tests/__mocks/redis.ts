
const mockClient = { 
  end: (flush?: boolean): void => {},
  quit: (): void => {},
  set: (key: string, value: string, mode: 'EX' | 'PX', time: number, callback: (err: Error | null, reply: string) => void): void => { callback(null, '') }, 
  get: (key: string, callback: (err: Error | null, reply: string) => void): void => { callback(null, 'cached-data')},
  del: (keys: string | string[], callback?: (err: Error | null, reply: number) => void): void => {}
}

export default mockClient;