import execa from 'execa';
import fs from 'fs-extra';
import globby from 'globby';
import path from 'path';
import { Doc, Options, Pipe, difference } from 'pipedoc';

export interface SphinxPipeConfig {}

export default class SphinxPipe extends Pipe<SphinxPipeConfig> {
  ignoreGlobs = ['conf.py', 'requirements.txt', 'env/**/*'];

  constructor(
    config: SphinxPipeConfig = {},
    options: Options,
    parent: Pipe | null
  ) {
    super(config, options, parent);
  }

  async createVirtualenv(doc: Doc) {
    const p = execa('virtualenv', ['env'], { cwd: doc.rootPath });
    p?.stdout?.pipe(process.stdout);
    await p;
  }

  async installRequirements(doc: Doc) {
    const requirementsPath = path.resolve(doc.rootPath, 'requirements.txt');
    const pip = path.resolve(doc.rootPath, 'env/bin/pip');
    const p = execa(pip, ['install', '-r', requirementsPath], {
      cwd: doc.rootPath
    });
    p?.stdout?.pipe(process.stdout);
    await p;
  }

  async setup(doc: Doc) {
    if (!(await fs.pathExists(path.resolve(doc.rootPath, 'env')))) {
      await this.createVirtualenv(doc);
      await this.installRequirements(doc);
    }
  }

  async build(doc: Doc, outputFormat = 'html') {
    const sphinxBuild = path.resolve(doc.rootPath, 'env/bin/sphinx-build');
    const p = execa(
      sphinxBuild,
      ['-M', outputFormat, doc.rootPath, this.paths.tmp],
      { cwd: doc.rootPath }
    );
    p?.stdout?.pipe(process.stdout);
    await p;
  }

  async pipe(doc: Doc): Promise<string[]> {
    await this.setup(doc);
    const ignorePaths = this.ignoreGlobs.reduce(
      (ignorePaths: Set<string>, ignoreGlob: string) => {
        return new Set([
          ...ignorePaths,
          ...globby.sync(`${doc.rootPath}/${ignoreGlob}`)
        ]);
      },
      new Set()
    );
    const filePaths = [
      ...difference(
        new Set(await globby(`${doc.rootPath}/${doc.glob}`)),
        ignorePaths
      )
    ];
    await fs.mkdirp(path.resolve(doc.rootPath, '_static'));
    await fs.mkdirp(path.resolve(doc.rootPath, '_templates'));
    // await Promise.all(
    //   filePaths.map(async (filePath: string) => {
    //     const fileName = filePath.substr(doc.rootPath.length + 1);
    //     await fs.copyFile(filePath, path.resolve(this.paths.tmp, fileName));
    //   })
    // );
    await this.build(doc);
    return filePaths;
  }
}
