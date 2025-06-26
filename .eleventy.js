module.exports = function(eleventyConfig) {
  // Copy toàn bộ build_fe sang build_fe (gốc)
  eleventyConfig.addPassthroughCopy({ "build_fe": "build_fe" });
  // Copy assets/img sang assets/img
  eleventyConfig.addPassthroughCopy({ "assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "assets/img/favicon": "assets/img/favicon" });
  // Copy build sang build
  eleventyConfig.addPassthroughCopy({ "build": "build" });
  // Copy resources/assets/js sang resources/assets/js
  eleventyConfig.addPassthroughCopy({ "resources/assets/js": "resources/assets/js" });

  return {
    dir: {
      input: "src",
      includes: ".",
      output: "_site"
    }
  };
};
