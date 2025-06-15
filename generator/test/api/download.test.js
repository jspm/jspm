import { Generator } from '@jspm/generator';

const generator = new Generator();
await generator.install('react');
await generator.install('dayjs');
await generator.install('rxjs');

await generator.downloadAll();
