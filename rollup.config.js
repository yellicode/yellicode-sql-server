export default {
  input: 'dist/es6/sql-server.js', // rollup requires ES input
  output: {
    format: 'umd',
    name: '@yellicode/sql-server',
    file: 'dist/bundles/sql-server.umd.js'
  },
  external: ['@yellicode/core', '@yellicode/elements'] // https://github.com/rollup/rollup/wiki/Troubleshooting#treating-module-as-external-dependency
}
