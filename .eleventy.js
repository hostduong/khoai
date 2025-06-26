module.exports = function(eleventyConfig) {
  // Copy toàn bộ build_fe sang build_fe (gốc)
  eleventyConfig.addPassthroughCopy({ "build_fe": "build_fe" });
  // Copy assets/img sang assets/img
  eleventyConfig.addPassthroughCopy({ "assets/img": "assets/img" });
  // Copy build sang build
  eleventyConfig.addPassthroughCopy({ "build": "build" });
  // Copy resources/assets/js sang resources/assets/js
  eleventyConfig.addPassthroughCopy({ "resources/assets/js": "resources/assets/js" });
  // Bổ sung dòng này để copy js từ src/js → /js
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  
  return {
    dir: {
      input: "src",
      includes: ".",
      output: "_site"
    }
  };
};
