module.exports = function(eleventyConfig) {
  const passthrough = [
    "build",
    "build_fe",
    "assets",
    "images",
    "js",
    "resources"
  ];

  passthrough.forEach(dir => {
    eleventyConfig.addPassthroughCopy({ [`src/${dir}`]: dir });
  });

  return {
    dir: {
      input: "src",
      includes: ".",    // để đọc head.njk, footer.njk,... trong src
      output: "_site"
    }
  };
};
