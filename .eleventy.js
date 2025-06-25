module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({"public/css": "css"});
  eleventyConfig.addPassthroughCopy({"public/img": "img"});
  eleventyConfig.addPassthroughCopy({"public/js": "js"});
  return {
    dir: {
      input: "src",
      includes: ".",
      output: "_site"
    }
  };
};
