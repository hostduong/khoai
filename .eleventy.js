module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("public/css");
  eleventyConfig.addPassthroughCopy("public/img");
  eleventyConfig.addPassthroughCopy("public/js");
  return {
    dir: {
      input: "src",
      includes: ".",
      output: "_site"
    }
  };
};
