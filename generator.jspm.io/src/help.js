import { popup } from './popup.js';

document.querySelector('.help').addEventListener('click', () => {
  popup(`
    <p>For full example workflows, see the <a href="https://jspm.org/docs/workflows" target="_blank">JSPM Workflows documentation</a>.</p>
    <p>To load an example import map, have a look at the <a href="#U2VgYGBiDkpNTC5RCC5JLCpJLWIoAvF0U/JzHQzN9Qz0DCECUA4AS5lz8DEA" onclick="import('./src/popup.js').then(popup => popup.close())">React Import Map Example</a>.</p>
    <p>For information on the output options, see the <a href="https://jspm.org/docs/cdn#jspm-generator" target="_blank">JSPM Generator documentation</a>.</p>
    <p>The animation below demonstrates how dependencies can be added and managed, "Add Dependency" supports versions and subpaths. Each dependencies line corresponds to a package version and exports subpath which directly corresponds to an entry in the import map.</p>
    <img src="jspm-generator.gif" style="margin-left: auto; margin-right: auto; display: block; box-shadow: 0px 0px 10px rgb(0 0 0 / 10%); border-radius: 2px; height: 350px;"/>
  `, 800, 600);
});
