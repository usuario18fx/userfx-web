import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const ROOT = process.cwd();
const BASE_INDENT = "          ";
const CODE_EXTENSIONS = new Set([".tsx", ".jsx"]);
const CSS_EXTENSIONS = new Set([".css"]);
const SKIP_DIRS = new Set([".git", ".vercel", "dist", "node_modules"]);

function walk(dir, out = []) {
          for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
                    if (SKIP_DIRS.has(entry.name)) continue;
                    const full = path.join(dir,entry.name);
                    if (entry.isDirectory()) walk(full,out);
                    else out.push(full);
          }
          return out;
}

function parserFor(file) {
          const ext = path.extname(file).toLowerCase();
          if (ext === ".tsx") return "typescript";
          if (ext === ".jsx") return "babel";
          if (ext === ".css") return "css";
          return null;
}

function isSectionComment(line) {
          const trimmed = line.trim();
          if (!trimmed) return false;
          if (trimmed.startsWith("//")) return true;
          if (trimmed.startsWith("/*")) return true;
          if (trimmed.startsWith("*")) return true;
          if (trimmed === "*/") return true;
          return false;
}

function splitSimpleJsxChildren(source) {
          let next = source;
          let previous = "";
          const plainText = /^(\s*)<([A-Za-z][\w.:-]*)([^>\n]*)>([^<>{}\n]+)<\/\2>\s*$/gm;
          const expression = /^(\s*)<([A-Za-z][\w.:-]*)([^>\n]*)>\{([^{}\n]+)\}<\/\2>\s*$/gm;
          while (previous !== next) {
                    previous = next;
                    next = next.replace(plainText,(_,indent,tag,attrs,text) => {
                              const value = String(text).trim();
                              if (!value) return _;
                              return `${indent}<${tag}${attrs}>\n${indent}${value}\n${indent}</${tag}>`;
                    });
                    next = next.replace(expression,(_,indent,tag,attrs,expr) => {
                              const value = String(expr).trim();
                              if (!value) return _;
                              return `${indent}<${tag}${attrs}>\n${indent}{${value}}\n${indent}</${tag}>`;
                    });
          }
          return next;
}

function addBaseIndent(source) {
          let inTemplate = false;
          return source.split("\n").map((line) => {
                    if (!line.trim()) return "";
                    if (isSectionComment(line)) return line.trimStart();
                    let escaped = false;
                    let toggles = 0;
                    for (const char of line) {
                              if (char === "\\" && !escaped) {
                                        escaped = true;
                                        continue;
                              }
                              if (char === "`" && !escaped) toggles += 1;
                              escaped = false;
                    }
                    const shouldIndent = !inTemplate;
                    if (toggles % 2 === 1) inTemplate = !inTemplate;
                    return shouldIndent ? `${BASE_INDENT}${line}` : line;
          }).join("\n");
}

function formatJsx(source) {
          let next = splitSimpleJsxChildren(source);
          next = next.replace(/\n{3,}/g,"\n\n");
          return addBaseIndent(next).trimEnd() + "\n";
}

function formatCss(source) {
          let next = source
                    .split("\n")
                    .map((line) => {
                              const trimmed = line.trim();
                              if (!trimmed) return "";
                              if (trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed === "*/") return trimmed;
                              let value = line.replace(/\s+$/g,"");
                              value = value.replace(/\s+\{$/,"{");
                              value = value.replace(/^(\s*)(--?[A-Za-z][A-Za-z0-9-]*|[A-Za-z][A-Za-z0-9-]*):\s+(.+);$/,(_,indent,property,rest) => `${indent}${property}:${rest};`);
                              return `${BASE_INDENT}${value}`;
                    })
                    .filter((line,index,lines) => line !== "" || (index > 0 && lines[index - 1] !== ""))
                    .join("\n")
                    .replace(/\n{2,}/g,"\n");
          return next.trimEnd() + "\n";
}

async function formatFile(file) {
          const parser = parserFor(file);
          if (!parser) return;
          const original = fs.readFileSync(file,"utf8").replace(/^\uFEFF/,"");
          const pretty = await prettier.format(original,{
                    parser,
                    printWidth:1000,
                    tabWidth:2,
                    useTabs:false,
                    semi:true,
                    singleQuote:false,
                    trailingComma:"all",
                    bracketSameLine:true,
                    singleAttributePerLine:false,
          });
          const ext = path.extname(file).toLowerCase();
          const output = CODE_EXTENSIONS.has(ext) ? formatJsx(pretty) : formatCss(pretty);
          fs.writeFileSync(file,output,"utf8");
}

const files = walk(ROOT).filter((file) => CODE_EXTENSIONS.has(path.extname(file).toLowerCase()) || CSS_EXTENSIONS.has(path.extname(file).toLowerCase()));
for (const file of files) {
          await formatFile(file);
}
console.log(`USER FX · formatted ${files.length} TSX/JSX/CSS files`);
