const fs = require("fs");
const fse = require("fs-extra");

module.exports = function (eleventyConfig) {
  // Copy toàn bộ thư mục cần thiết
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

  // Xử lý riêng build_fe: chỉ copy file KHÔNG phải .js.njk
  eleventyConfig.on("afterBuild", () => {
    const srcDir = "src/build_fe";
    const destDir = "_site/build_fe";

    if (fs.existsSync(srcDir)) {
      fs.readdirSync(srcDir).forEach(file => {
        const srcPath = `${srcDir}/${file}`;
        const destPath = `${destDir}/${file}`;
        if (!file.endsWith(".js.njk")) {
          fse.copySync(srcPath, destPath);
        }
      });
    }
  });

  return {
    dir: {
      input: "src",
      includes: ".",   // để đọc head.njk, footer.njk,... trong src
      output: "_site"
    }
  };
};
