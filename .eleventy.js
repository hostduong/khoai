module.exports = function (eleventyConfig) {
  // --- Copy các thư mục tĩnh từ src → _site ---
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

  // --- Cho phép Eleventy xử lý file .js.njk → .js ---
  eleventyConfig.addTemplateFormats("js");

  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile: function (inputContent, inputPath) {
      if (inputPath && inputPath.endsWith(".js.njk")) {
        return async function (data) {
          // Render với Nunjucks (Eleventy sẽ tự xử lý biến {{ domain }}, ...)
          return this.config.javascriptFunctions.nunjucksRenderString(inputContent, data);
        };
      } else {
        return async () => inputContent;
      }
    }
  });

  return {
    dir: {
      input: "src",     // thư mục gốc
      includes: ".",    // dùng luôn file .njk trong src/
      output: "_site"   // thư mục xuất
    }
  };
};
