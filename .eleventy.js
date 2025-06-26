const path = require("path");
const { renderString } = require("nunjucks");

module.exports = function (eleventyConfig) {
  const passthrough = [
    "build",
    "assets",
    "images",
    "js",
    "resources"
  ];

  passthrough.forEach(dir => {
    eleventyConfig.addPassthroughCopy({ [`src/${dir}`]: dir });
  });

  // ⚠️ Không copy nguyên build_fe nếu có .js.njk bên trong
  // eleventyConfig.addPassthroughCopy({ "src/build_fe": "build_fe" }); ← loại bỏ dòng này

  // ✅ Chỉ copy các file KHÔNG phải .njk trong build_fe
  eleventyConfig.on("beforeBuild", () => {
    const fs = require("fs");
    const fse = require("fs-extra");
    const dirPath = "src/build_fe";
    const targetPath = "_site/build_fe";

    fs.readdirSync(dirPath).forEach(file => {
      if (!file.endsWith(".njk")) {
        fse.copySync(`${dirPath}/${file}`, `${targetPath}/${file}`);
      }
    });
  });

  // ✅ Cho phép xử lý .js.njk → .js
  eleventyConfig.addTemplateFormats("js");

  eleventyConfig.addExtension("js", {
    outputFileExtension: "js",
    compile(inputContent, inputPath) {
      if (inputPath.endsWith(".js.njk")) {
        return async (data) => renderString(inputContent, data);
      }
      return async () => inputContent;
    },
    getData(inputPath) {
      // Lấy dữ liệu từ _data
      return {};
    }
  });

  return {
    dir: {
      input: "src",
      includes: ".",
      output: "_site"
    }
  };
};
