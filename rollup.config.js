// see https://github.com/rozek/build-configuration-study

import commonjs   from '@rollup/plugin-commonjs'
import resolve    from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser'

export default {
  input: './src/reusable-flows.ts',
  output: [
    {
      file:     './reusable-flows/reusable-flows.js',
      format:    'cjs',
      name:      'reusable-flows',
      noConflict:true,
      sourcemap: true,
      exports:   'auto',
      plugins:   [terser({ format:{ comments:false, safari10:true } })],
    }
  ],
  plugins: [
    resolve(), commonjs(), typescript()
  ],
};