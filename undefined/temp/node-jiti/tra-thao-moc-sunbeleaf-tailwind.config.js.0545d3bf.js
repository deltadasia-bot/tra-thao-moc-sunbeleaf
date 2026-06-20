"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _tokens = require('./src/tokens'); var _tokens2 = _interopRequireDefault(_tokens);

module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./index.html",
  ],
  theme: {
    extend: {
      ..._tokens2.default,
    },
  },
};
 /* v7-22517d842bb953dd */