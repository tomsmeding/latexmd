# latexmd

A simple program to write (simple) latex documents in markdown. Use `latexmd test.md` to generate `test.pdf`.

Most of the work is done in `htmltotex.js`, which is designed to be run after `markdown` and before `pdflatex`. It includes its own html parser, because that's what you want. It's written to run using NodeJS and uses some ES6 syntax.

Tested using NodeJS version 6.2.0 and pdflatex version 3.14159265-2.6-1.40.16 (TeX Live 2015). YMMV.
