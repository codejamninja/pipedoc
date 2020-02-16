import path from 'path';
import Doc from './doc';
import Pipe from './pipe';
import defaultConfig from './defaultConfig';
import defaultOptions from './defaultOptions';
import { Config, Options, PipelineItem } from './types';
import { CopyPipe } from './pipes';
import { getPlugin } from './plugin';
import { mapSeries } from './helpers';

const logger = console;

export default class PipeDoc {
  constructor(
    public config: Config = defaultConfig as Config,
    public options: Options = defaultOptions
  ) {}

  async run(): Promise<Doc | null> {
    if (
      this.config.pipeline.length < 2 ||
      typeof this.config.pipeline[0] !== 'string' ||
      typeof this.config.pipeline[this.config.pipeline.length - 1] !== 'string'
    ) {
      return null;
    }
    let previous = this.config.pipeline.shift() as string;
    const doc = new Doc(
      path.resolve(this.config.rootPath, previous),
      this.config.type
    );
    const to = this.config.pipeline.pop() as string;
    await mapSeries(
      this.config.pipeline,
      async (pipelineItem: PipelineItem) => {
        const plugin = getPlugin(
          typeof pipelineItem === 'string' ? pipelineItem : pipelineItem.name,
          typeof pipelineItem === 'string' ? {} : pipelineItem.config
        );
        if (!plugin?.pipe) return doc;
        const PluginPipe = plugin.pipe;
        const pipe = new PluginPipe(plugin.config);
        logger.info(`${previous} -> ${plugin?.name}`);
        const result = await pipe.pipe(doc);
        previous = plugin.name;
        return result;
      }
    );
    const copyPipe = new CopyPipe({ to });
    logger.info(`${previous} -> ${to}`);
    return copyPipe.pipe(doc);
  }
}

export { defaultConfig, defaultOptions, Doc, Pipe };
export * from './config';
export * from './doc';
export * from './pipe';
export * from './plugin';
export * from './types';
