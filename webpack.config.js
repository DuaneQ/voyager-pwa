const path = require('path');

const resolve = {
  extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
};

// Add alias for Cypress/component tests
if (process.env.CYPRESS_COMPONENT_TEST) {
  resolve.alias = {
    'react-google-places-autocomplete': path.resolve(__dirname, '__mocks__/react-google-places-autocomplete.js'),
  };
}

module.exports = {
  resolve,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
      },
    ],
  },
};
