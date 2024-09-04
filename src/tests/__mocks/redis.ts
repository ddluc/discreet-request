
const mockClient = { 
  end: (flush?: boolean): void => {},
  quit: (): void => {},
  set: async (key: string, value: string, mode: 'EX' | 'PX', time: number): Promise<null | string> =>  '', 
  get: async (key: string): Promise<null | string> =>  'cached-data',
  del: (keys: string | string[], callback?: (err: Error | null, reply: number) => void): void => {}
}

export default mockClient;