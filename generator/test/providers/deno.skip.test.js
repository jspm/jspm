import { Generator, lookup } from '@jspm/generator';
import assert from 'assert';

{
  const generator = new Generator({
    defaultProvider: 'deno'
  });

  await generator.install('denoland:fresh@1.1.5/runtime.ts');
  const json = generator.getMap();

  assert.strictEqual(
    json.imports['fresh/runtime.ts'],
    'https://deno.land/x/fresh@1.1.5/runtime.ts'
  );
  assert.ok(json.scopes['https://deno.land/']['preact']);
}

// const denoStdVersion = (await lookup("deno:path")).resolved.version;
// const oakVersion = (await lookup("denoland:oak")).resolved.version;

{
  // TESTS DISABLED SINCE OAK USES JSR NOW, PENDING JSR SUPPORT
  // const generator = new Generator({
  //   mapUrl: new URL("../../", import.meta.url),
  //   inputMap: {
  //     imports: {
  //       "testing/asserts": "https://deno.land/std@0.151.0/testing/asserts.ts",
  //     },
  //   },
  // });
  // await generator.install("denoland:oak/body.ts");
  // const json = generator.getMap();
  // assert.strictEqual(
  //   json.imports["oak/body.ts"],
  //   `https://deno.land/x/oak@v${oakVersion}/body.ts`
  // );
  // assert.strictEqual(
  //   json.imports["testing/asserts"],
  //   "https://deno.land/std@0.151.0/testing/asserts.ts"
  // );
  // await generator.update();
  // {
  //   const json = generator.getMap();
  //   assert.strictEqual(
  //     json.imports["oak/body.ts"],
  //     `https://deno.land/x/oak@v${oakVersion}/body.ts`
  //   );
  //   assert.strictEqual(
  //     json.imports["testing/asserts"],
  //     `https://deno.land/std@${denoStdVersion}/testing/asserts.ts`
  //   );
  //}
}

// {
//   const generator = new Generator({
//     mapUrl: new URL("../../", import.meta.url),
//     defaultRegistry: "denoland",
//   });

//   await generator.install("oak@10.6.0");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["oak"],
//     "https://deno.land/x/oak@v10.6.0/mod.ts"
//   );
// }

// {
//   const generator = new Generator({
//     mapUrl: new URL("../../", import.meta.url),
//     defaultRegistry: "denoland",
//   });

//   await generator.install("oak@10.6.0/body.ts");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["oak/body.ts"],
//     "https://deno.land/x/oak@v10.6.0/body.ts"
//   );
// }

// {
//   const generator = new Generator();

//   await generator.install("denoland:oak");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["oak"],
//     `https://deno.land/x/oak@v${oakVersion}/mod.ts`
//   );
// }

// {
//   const generator = new Generator();

//   await generator.install("deno:path");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["path"],
//     `https://deno.land/std@${denoStdVersion}/path/mod.ts`
//   );
// }

// {
//   const generator = new Generator({
//     inputMap: {
//       imports: {
//         fs: "https://deno.land/std@0.148.0/fs/mod.ts",
//       },
//     },
//   });

//   await generator.link("deno:path");
//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["fs"],
//     `https://deno.land/std@0.148.0/fs/mod.ts`
//   );
//   assert.strictEqual(
//     json.imports["deno:path"],
//     `https://deno.land/std@0.148.0/path/mod.ts`
//   );
// }

// {
//   const generator = new Generator({
//     inputMap: {
//       imports: {
//         fs: "https://deno.land/std@0.148.0/fs/mod.ts",
//       },
//     },
//   });

//   await generator.install("deno:path");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["fs"],
//     `https://deno.land/std@0.148.0/fs/mod.ts`
//   );
//   assert.strictEqual(
//     json.imports["path"],
//     `https://deno.land/std@${denoStdVersion}/path/mod.ts`
//   );

//   await generator.update();

//   {
//     const json = generator.getMap();

//     assert.strictEqual(
//       json.imports["fs"],
//       `https://deno.land/std@${denoStdVersion}/fs/mod.ts`
//     );
//     assert.strictEqual(
//       json.imports["path"],
//       `https://deno.land/std@${denoStdVersion}/path/mod.ts`
//     );
//   }
// }

// {
//   const generator = new Generator({
//     inputMap: {
//       imports: {
//         fs: "https://deno.land/std@0.148.0/fs/mod.ts",
//       },
//     },
//   });

//   await generator.link("deno:testing/asserts");
//   await generator.link("deno:async/abortable.ts");

//   const json = generator.getMap();

//   assert.strictEqual(
//     json.imports["fs"],
//     `https://deno.land/std@0.148.0/fs/mod.ts`
//   );
//   assert.strictEqual(
//     json.imports["deno:async/abortable.ts"],
//     `https://deno.land/std@0.148.0/async/abortable.ts`
//   );
//   assert.strictEqual(
//     json.imports["deno:testing/asserts"],
//     `https://deno.land/std@0.148.0/testing/asserts.ts`
//   );
// }
