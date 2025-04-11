// TODO: re-enable this test once the CDN builder can reliably build these
// packages. At the moment this fails constantly from build errors.

// import { Generator } from "@jspm/generator";
// import { strictEqual } from "assert";

// const BASE_CONFIG = {
//   mapUrl: "about:blank",
//   ignore: [
//     "react",
//     "react/jsx-runtime",
//     "react-dom",
//     "react-dom/server",
//     "framer",
//     "framer-motion",
//     "framer-motion/three",
//   ],
//   env: ["production", "browser", "module"],
//   resolutions: {
//     three: "0.142.0",
//     zustand: "3.7.1",
//     ethers: "5.7.2", // workaround for incorrect version pin in @wagmi/core
//   },
// };
//
// const generatorOne = new Generator({
//   ...BASE_CONFIG,
// });
// await generatorOne.install("@react-three/fiber");
// const mapOne = generatorOne.getMap();
//
// strictEqual(
//   mapOne.scopes["https://ga.jspm.io/"].zustand,
//   "https://ga.jspm.io/npm:zustand@3.7.1/esm/index.js"
// );
//
// const generatorTwo = new Generator({
//   ...BASE_CONFIG,
//   inputMap: mapOne,
// });
// await generatorTwo.install("wagmi");
// const mapTwo = generatorTwo.getMap();
//
// strictEqual(
//   mapTwo.scopes["https://ga.jspm.io/"].zustand,
//   "https://ga.jspm.io/npm:zustand@3.7.1/esm/index.js"
// );
//
// const generatorThree = new Generator({
//   ...BASE_CONFIG,
//   inputMap: mapTwo,
// });
// await generatorThree.install("connectkit");
// const mapThree = generatorThree.getMap();
//
// strictEqual(
//   mapThree.scopes["https://ga.jspm.io/"].zustand,
//   "https://ga.jspm.io/npm:zustand@3.7.1/esm/index.js"
// );
//
// const generatorFour = new Generator({
//   ...BASE_CONFIG,
//   inputMap: mapThree,
// });
// await generatorFour.reinstall();
// const mapFour = generatorFour.getMap();
//
// strictEqual(
//   mapFour.scopes["https://ga.jspm.io/"].zustand,
//   "https://ga.jspm.io/npm:zustand@3.7.1/esm/index.js"
// );
// strictEqual(
//   mapFour.scopes["https://ga.jspm.io/"].three,
//   "https://ga.jspm.io/npm:three@0.142.0/build/three.module.js"
// );
