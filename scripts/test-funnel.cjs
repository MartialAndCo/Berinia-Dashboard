const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const { Module } = require("node:module");
// Exercise the shared validation code without requiring a running Next.js server.
const filename = require("node:path").resolve(
  __dirname,
  "../src/lib/funnel.ts",
);
const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(code, filename);
const { validateConfig, defaultFunnel, calPath, videoEmbed } = loaded.exports;

assert.doesNotThrow(() => validateConfig(structuredClone(defaultFunnel)));
for (const url of [
  "javascript:alert(1)",
  "https://cal.com.evil.test/user/event",
  "http://cal.com/user/event",
  "https://user:password@cal.com/user/event",
])
  assert.equal(calPath(url), null);
assert.equal(calPath("https://cal.com/team/strategy"), "team/strategy");
assert.equal(
  videoEmbed("https://youtu.be/dQw4w9WgXcQ"),
  "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
);
assert.equal(videoEmbed("https://example.com/embed/video"), null);
assert.equal(videoEmbed("javascript:alert(1)"), null);
const invalid = structuredClone(defaultFunnel);
invalid.questions.push(invalid.questions[0]);
assert.throws(() => validateConfig(invalid), /unique IDs/);
const invalidQuote = structuredClone(defaultFunnel);
invalidQuote.testimonials.push({ quote: "", name: "", company: "" });
assert.throws(() => validateConfig(invalidQuote), /quote and a name/);
const invalidSize = structuredClone(defaultFunnel);
invalidSize.copy.headline.size = "999px";
assert.throws(() => validateConfig(invalidSize), /formatting/);
console.log(
  "PASS: default configuration, URL restrictions, video embedding, duplicate questions, testimonial and formatting validation",
);
