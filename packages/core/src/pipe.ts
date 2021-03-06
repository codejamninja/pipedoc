import Doc from './doc';
import defaultOptions from './defaultOptions';
import { Paths } from './types';

export interface PipeConfig {}

export default abstract class Pipe<Config = PipeConfig> {
  abstract ignoreGlobs?: string[];
  debug: boolean;
  paths: Paths;

  constructor(
    public config: Config,
    options = defaultOptions,
    public parent: Pipe<Config> | null = null
  ) {
    options = { ...options };
    this.debug = options.debug;
    this.paths = options.paths;
  }

  async pipe(_doc: Doc): Promise<string[]> {
    return [];
  }
}
