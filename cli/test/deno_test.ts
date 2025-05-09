// @ts-expect-error it's Deno
Deno.test("import from import map", async () => {
  await import("@jspm/generator");
});
