export interface LanguageDefinition {
  key: string;
  name: string;
  fileExtensions: string[];
  snippets: LanguageSnippets;
  sequences: Record<string, string[]>;
  syntax: LanguageSyntax;
}

export interface LanguageSnippets {
  basic: SnippetItem[];
  controlFlow: SnippetItem[];
  functions: SnippetItem[];
  dataTypes: SnippetItem[];
  collections?: SnippetItem[];
}

export interface SnippetItem {
  id: string;
  label: string;
  text: string;
}

export interface LanguageSyntax {
  keywords: string[];
  builtins: string[];
  operators: string[];
  stringDelimiters: string[];
  commentStart: string;
  blockComment?: { start: string; end: string };
}

// Python Language Definition
export const pythonLanguage: LanguageDefinition = {
  key: 'python',
  name: 'Python',
  fileExtensions: ['py', 'pyw', 'pyi'],
  snippets: {
    basic: [
      { id: 'py_1', label: '=', text: '= ' },
      { id: 'py_2', label: '+=', text: '+= ' },
      { id: 'py_3', label: 'var', text: 'var' },
      { id: 'py_4', label: ':', text: ':' },
      { id: 'py_5', label: '0', text: '0' },
      { id: 'py_6', label: '1', text: '1' },
      { id: 'py_7', label: '10', text: '10' },
      { id: 'py_8', label: "''", text: "''" },
      { id: 'py_9', label: 'i', text: 'i' },
      { id: 'py_10', label: 'x', text: 'x' },
    ],
    controlFlow: [
      { id: 'py_11', label: 'if', text: 'if condition:\n    ' },
      { id: 'py_12', label: 'else', text: 'else:\n    ' },
      { id: 'py_13', label: 'elif', text: 'elif condition:\n    ' },
      { id: 'py_14', label: 'for', text: 'for var in range(var):\n    ' },
      { id: 'py_15', label: 'while', text: 'while condition:\n    ' },
      { id: 'py_16', label: 'try', text: 'try:\n    \nexcept Exception as var:\n    ' },
      { id: 'py_17', label: 'def', text: 'def function(var):\n    ' },
      { id: 'py_18', label: 'class', text: 'class ClassName:\n    def __init__(self, var):\n        ' },
      { id: 'py_19', label: 'in', text: 'in ' },
      { id: 'py_20', label: 'return', text: 'return ' },
    ],
    functions: [
      { id: 'py_21', label: 'print', text: 'print(' },
      { id: 'py_22', label: 'input', text: 'input(' },
      { id: 'py_23', label: 'len', text: 'len(' },
      { id: 'py_24', label: 'range', text: 'range(' },
      { id: 'py_25', label: 'enumerate', text: 'enumerate(' },
      { id: 'py_26', label: 'zip', text: 'zip(' },
      { id: 'py_27', label: 'open', text: 'open(' },
      { id: 'py_28', label: ')', text: ')' },
      { id: 'py_29', label: 'import', text: 'import ' },
      { id: 'py_30', label: 'from', text: 'from module import ' },
    ],
    dataTypes: [
      { id: 'py_31', label: 'type', text: 'type(' },
      { id: 'py_39', label: '[]', text: '[]' },
      { id: 'py_40', label: '{}', text: '{}' },
    ],
    collections: [
      { id: 'py_41', label: 'defaultdict', text: 'collections.defaultdict(' },
      { id: 'py_42', label: 'Counter', text: 'collections.Counter(' },
      { id: 'py_43', label: 'OrderedDict', text: 'collections.OrderedDict(' },
      { id: 'py_44', label: 'deque', text: 'collections.deque(' },
      { id: 'py_45', label: 'heappush', text: 'heapq.heappush(' },
      { id: 'py_46', label: 'heappop', text: 'heapq.heappop(' },
      { id: 'py_47', label: 'namedtuple', text: 'collections.namedtuple(' },
    ],
  },
  sequences: {
    // Control flow
    'for': ['i', 'var'],
    'i': ['in'],
    'var': ['in', '=', '+', '-', '*', '/', '%', '<', '>', '<=', '>='],
    'if': ['condition', 'var'],
    'elif': ['condition', 'var'],
    'else': [':'],
    'while': ['condition', 'var'],
    'condition': [':', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
    
    // Functions and iterables
    'in': ['range', 'enumerate', 'zip', '[]', '{}', 'var'],
    'range': ['('],
    'enumerate': ['('],
    'zip': ['('],
    'len': ['('],
    'print': ['('],
    'input': ['('],
    
    // Operators
    '=': ['var', '0', '1', '[', '{', '(', 'input', 'int', 'str', 'float', 'bool', '"', "'", 'None', 'True', 'False'],
  },
  syntax: {
    keywords: [
      'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
      'import', 'from', 'as', 'return', 'yield', 'break', 'continue', 'pass', 'lambda',
      'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'with', 'async', 'await'
    ],
    builtins: [
      'print', 'input', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'reduce',
      'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance'
    ],
    operators: ['=', '+=', '-=', '*=', '/=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
    stringDelimiters: ['"', "'"],
    commentStart: '#',
  },
};

// JavaScript Language Definition
export const javascriptLanguage: LanguageDefinition = {
  key: 'javascript',
  name: 'JavaScript',
  fileExtensions: ['js', 'jsx', 'mjs'],
  snippets: {
    basic: [
      { id: 'js_1', label: 'let', text: 'let ' },
      { id: 'js_2', label: 'const', text: 'const ' },
      { id: 'js_3', label: 'var', text: 'var ' },
      { id: 'js_4', label: 'var', text: 'var' },
      { id: 'js_5', label: 'name', text: 'name' },
      { id: 'js_6', label: '=', text: ' = ' },
      { id: 'js_7', label: '0', text: '0' },
      { id: 'js_8', label: 'true', text: 'true' },
      { id: 'js_9', label: 'false', text: 'false' },
      { id: 'js_10', label: ';', text: ';' },
    ],
    controlFlow: [
      { id: 'js_11', label: 'if', text: 'if (condition) {\n    \n}' },
      { id: 'js_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'js_13', label: 'for', text: 'for (let var = 0; var < var; var++) {\n    \n}' },
      { id: 'js_14', label: 'while', text: 'while (condition) {\n    \n}' },
      { id: 'js_15', label: 'switch', text: 'switch (var) {\n    case var:\n        break;\n    default:\n        break;\n}' },
      { id: 'js_16', label: 'try', text: 'try {\n    \n} catch (var) {\n    \n}' },
      { id: 'js_17', label: 'function', text: 'function function(var) {\n    \n}' },
      { id: 'js_18', label: '=>', text: '=> ' },
      { id: 'js_19', label: 'return', text: 'return ' },
      { id: 'js_20', label: 'break', text: 'break;' },
    ],
    functions: [
      { id: 'js_21', label: 'console.log', text: 'console.log(' },
      { id: 'js_22', label: 'alert', text: 'alert(' },
      { id: 'js_23', label: 'prompt', text: 'prompt(' },
      { id: 'js_24', label: 'parseInt', text: 'parseInt(' },
      { id: 'js_25', label: 'parseFloat', text: 'parseFloat(' },
      { id: 'js_26', label: 'JSON.parse', text: 'JSON.parse(' },
      { id: 'js_27', label: 'JSON.stringify', text: 'JSON.stringify(' },
      { id: 'js_28', label: ')', text: ')' },
      { id: 'js_29', label: 'import', text: 'import { } from "";' },
      { id: 'js_30', label: 'export', text: 'export ' },
    ],
    dataTypes: [
      { id: 'js_31', label: 'let', text: 'let ' },
      { id: 'js_32', label: 'const', text: 'const ' },
      { id: 'js_33', label: 'var', text: 'var ' },
      { id: 'js_34', label: 'null', text: 'null' },
      { id: 'js_35', label: 'undefined', text: 'undefined' },
      { id: 'js_36', label: '[]', text: '[]' },
      { id: 'js_37', label: '{}', text: '{}' },
      { id: 'js_38', label: 'new', text: 'new ' },
      { id: 'js_39', label: 'Array', text: 'Array(' },
      { id: 'js_40', label: 'Object', text: 'Object(' },
    ],
  },
  sequences: {
    // Control flow
    'if': ['(', 'condition'],
    'else': ['{', 'if'],
    'for': ['('],
    'while': ['(', 'condition'],
    'switch': ['(', 'var'],
    
    // Variable declarations
    'let': ['var'],
    'const': ['var'],
    'var': ['var'],
    
    // Functions
    'function': ['name'],
    'console.log': ['('],
    'alert': ['('],
    'parseInt': ['('],
    
    // Operators
    '=': ['var', '0', '1', '[', '{', 'null', 'undefined', 'true', 'false', '"', "'"],
    '=>': ['{'],
  },
  syntax: {
    keywords: [
      'function', 'let', 'const', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
      'try', 'catch', 'finally', 'throw', 'return', 'break', 'continue', 'true', 'false', 'null', 'undefined',
      'class', 'extends', 'import', 'export', 'from', 'as', 'async', 'await', 'yield', 'new', 'this', 'super'
    ],
    builtins: [
      'console', 'alert', 'prompt', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Array', 'Object', 'String',
      'Number', 'Boolean', 'Date', 'Math', 'JSON', 'RegExp', 'Error', 'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap'
    ],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!'],
    stringDelimiters: ['"', "'", '`'],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// TypeScript Language Definition
export const typescriptLanguage: LanguageDefinition = {
  key: 'typescript',
  name: 'TypeScript',
  fileExtensions: ['ts', 'tsx'],
  snippets: {
    basic: [
      { id: 'ts_1', label: 'let', text: 'let ' },
      { id: 'ts_2', label: 'const', text: 'const ' },
      { id: 'ts_3', label: 'var', text: 'var ' },
      { id: 'ts_4', label: 'var', text: 'var' },
      { id: 'ts_5', label: 'name', text: 'name' },
      { id: 'ts_6', label: ':', text: ': ' },
      { id: 'ts_9', label: '=', text: ' = ' },
      { id: 'ts_10', label: '0', text: '0' },
    ],
    controlFlow: javascriptLanguage.snippets.controlFlow,
    functions: javascriptLanguage.snippets.functions,
    dataTypes: [
      ...javascriptLanguage.snippets.dataTypes,
      { id: 'ts_41', label: 'interface', text: 'interface Name {\n    \n}' },
      { id: 'ts_42', label: 'type alias', text: 'type Name = ' },
      { id: 'ts_43', label: 'enum', text: 'enum Name {\n    \n}' },
      { id: 'ts_44', label: 'type', text: 'type' },
    ],
  },
  sequences: {
    ...javascriptLanguage.sequences,
    'interface': ['Name'],
    'type': ['Name'],
    'enum': ['Name'],
    ':': ['string', 'number', 'boolean', 'any', 'void'],
  },
  syntax: {
    ...javascriptLanguage.syntax,
    keywords: [
      ...javascriptLanguage.syntax.keywords,
      'interface', 'type', 'enum', 'public', 'private', 'protected', 'readonly', 'static',
      'abstract', 'implements', 'namespace', 'module', 'declare', 'keyof', 'typeof'
    ],
    builtins: [
      ...javascriptLanguage.syntax.builtins,
      'string', 'number', 'boolean', 'any', 'void', 'never', 'unknown'
    ],
  },
};

// Java Language Definition
export const javaLanguage: LanguageDefinition = {
  key: 'java',
  name: 'Java',
  fileExtensions: ['java'],
  snippets: {
    basic: [
      { id: 'java_1', label: 'public', text: 'public ' },
      { id: 'java_2', label: 'private', text: 'private ' },
      { id: 'java_5', label: 'var', text: 'var' },
      { id: 'java_6', label: 'name', text: 'name' },
      { id: 'java_7', label: 'i', text: 'i' },
      { id: 'java_8', label: '=', text: ' = ' },
      { id: 'java_9', label: '0', text: '0' },
      { id: 'java_10', label: ';', text: ';' },
    ],
    controlFlow: [
      { id: 'java_11', label: 'if', text: 'if (condition) {\n    \n}' },
      { id: 'java_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'java_13', label: 'for', text: 'for (int var = 0; var < var; var++) {\n    \n}' },
      { id: 'java_14', label: 'while', text: 'while (condition) {\n    \n}' },
      { id: 'java_15', label: 'switch', text: 'switch (var) {\n    case var:\n        break;\n    default:\n        break;\n}' },
      { id: 'java_16', label: 'try', text: 'try {\n    \n} catch (Exception var) {\n    \n}' },
      { id: 'java_17', label: 'method', text: 'public type function(var) {\n    \n}' },
      { id: 'java_18', label: 'class', text: 'public class ClassName {\n    \n}' },
      { id: 'java_19', label: 'return', text: 'return ' },
      { id: 'java_20', label: 'break', text: 'break;' },
    ],
    functions: [
      { id: 'java_21', label: 'System.out.println', text: 'System.out.println(' },
      { id: 'java_22', label: 'System.out.print', text: 'System.out.print(' },
      { id: 'java_23', label: 'Scanner', text: 'Scanner(' },
      { id: 'java_24', label: 'Integer.parseInt', text: 'Integer.parseInt(' },
      { id: 'java_25', label: 'Double.parseDouble', text: 'Double.parseDouble(' },
      { id: 'java_26', label: 'String.valueOf', text: 'String.valueOf(' },
      { id: 'java_27', label: 'Arrays.toString', text: 'Arrays.toString(' },
      { id: 'java_28', label: ')', text: ')' },
      { id: 'java_29', label: 'import', text: 'import ' },
      { id: 'java_30', label: 'package', text: 'package ' },
    ],
    dataTypes: [
      { id: 'java_3', label: 'type', text: 'type ' },
      { id: 'java_39', label: 'ArrayList', text: 'ArrayList<>(' },
      { id: 'java_40', label: 'HashMap', text: 'HashMap<>(' },
    ],
  },
  sequences: {
    // Control flow
    'if': ['(', 'condition'],
    'else': ['{', 'if'],
    'for': ['('],
    'while': ['(', 'condition'],
    
    // Data types
    'int': ['var'],
    'String': ['var'],
    'double': ['var'],
    'boolean': ['var'],
    
    // Functions
    'System.out.println': ['('],
    'System.out.print': ['('],
    'Integer.parseInt': ['('],
    
    // Operators
    '=': ['var', '0', '1', 'new', 'null', 'true', 'false', '"'],
    
    // Type template
    'type': [' ', 'var'],
  },
  syntax: {
    keywords: [
      'public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw', 'throws',
      'return', 'break', 'continue', 'new', 'this', 'super', 'null', 'true', 'false', 'import', 'package',
      'synchronized', 'volatile', 'transient', 'native', 'strictfp', 'enum', 'assert'
    ],
    builtins: [
      'int', 'double', 'float', 'long', 'short', 'byte', 'char', 'boolean', 'void', 'String', 'Object',
      'System', 'Math', 'Arrays', 'Collections', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet'
    ],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// C++ Language Definition
export const cppLanguage: LanguageDefinition = {
  key: 'cpp',
  name: 'C++',
  fileExtensions: ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'h++'],
  snippets: {
    basic: [
      { id: 'cpp_1', label: '#include', text: '#include <>' },
      { id: 'cpp_4', label: 'var', text: 'var' },
      { id: 'cpp_5', label: 'i', text: 'i' },
      { id: 'cpp_6', label: 'j', text: 'j' },
      { id: 'cpp_7', label: '=', text: ' = ' },
      { id: 'cpp_8', label: '0', text: '0' },
      { id: 'cpp_9', label: '.size()', text: '.size()' },
      { id: 'cpp_10', label: ';', text: ';' },
      { id: 'cpp_11', label: 'cout', text: 'cout << ' },
      { id: 'cpp_12', label: 'endl', text: 'endl' },
    ],
    controlFlow: [
      { id: 'cpp_13', label: 'if', text: 'if (condition) {\n    \n}' },
      { id: 'cpp_14', label: 'else', text: 'else {\n    \n}' },
      { id: 'cpp_15', label: 'for', text: 'for (int var = 0; var < var; var++) {\n    \n}' },
      { id: 'cpp_16', label: 'for-each', text: 'for (auto& var : var) {\n    \n}' },
      { id: 'cpp_17', label: 'while', text: 'while (condition) {\n    \n}' },
      { id: 'cpp_18', label: 'switch', text: 'switch (var) {\ncase var:\n    break;\ndefault:\n    break;\n}' },
    ],
    functions: [
      { id: 'cpp_19', label: 'main', text: 'int main(var) {\n    \n    return 0;\n}' },
      { id: 'cpp_20', label: 'function', text: 'type function(var) {\n    \n}' },
      { id: 'cpp_21', label: 'return', text: 'return ' },
      { id: 'cpp_22', label: 'class', text: 'class ClassName {\npublic:\n    \nprivate:\n    \n};' },
    ],
    dataTypes: [
      { id: 'cpp_2', label: 'type', text: 'type ' },
      { id: 'cpp_26', label: 'const', text: 'const ' },
    ],
  },
  sequences: {
    // Preprocessor
    '#include': ['<iostream>', '<vector>', '<string>', '<algorithm>'],
    
    // I/O operations
    'cout': ['<<'],
    'std::cout': ['<<'],
    'cin': ['>>'],
    'std::cin': ['>>'],
    
    // Control flow
    'if': ['('],
    'for': ['('],
    'while': ['('],
    
    // Data types
    'int': ['var'],
    'string': ['var'],
    'double': ['var'],
    'bool': ['var'],
    'auto': ['var'],
    'vector<int>': ['var'],
    'map<int, int>': ['var'],
    
    // Assignment and values
    '=': ['0', '1', 'true', 'false', '"', 'new', 'var'],
    'var': ['=', '[', '.'],
    
    // Type template
    'type': [' ', 'var'],
    
    // Common operations
    '.size': ['()'],
    '.push_back': ['('],
    '.begin': ['()'],
    '.end': ['()'],
  },
  syntax: {
    keywords: [
      'int', 'double', 'float', 'char', 'bool', 'void', 'auto', 'const', 'static', 'class', 'struct',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'return', 'try', 'catch', 'throw', 'public', 'private', 'protected', 'virtual', 'override',
      'namespace', 'using', 'template', 'typename', 'new', 'delete', 'true', 'false', 'nullptr'
    ],
    builtins: ['std', 'cout', 'cin', 'endl', 'vector', 'map', 'string', 'pair', 'make_pair'],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--', '<<', '>>'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// C Language Definition
export const cLanguage: LanguageDefinition = {
  key: 'c',
  name: 'C',
  fileExtensions: ['c', 'h'],
  snippets: {
    basic: [
      { id: 'c_1', label: '#include', text: '#include <>' },
      { id: 'c_2', label: 'int', text: 'int ' },
      { id: 'c_3', label: 'double', text: 'double ' },
      { id: 'c_4', label: 'char', text: 'char ' },
      { id: 'c_5', label: 'var', text: 'var' },
      { id: 'c_6', label: 'name', text: 'name' },
      { id: 'c_7', label: 'i', text: 'i' },
      { id: 'c_8', label: '=', text: ' = ' },
      { id: 'c_9', label: '0', text: '0' },
      { id: 'c_10', label: ';', text: ';' },
    ],
    controlFlow: [
      { id: 'c_11', label: 'if', text: 'if (condition) {\n    \n}' },
      { id: 'c_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'c_13', label: 'for', text: 'for (int var = 0; var < var; var++) {\n    \n}' },
      { id: 'c_14', label: 'while', text: 'while (condition) {\n    \n}' },
      { id: 'c_15', label: 'switch', text: 'switch (var) {\ncase var:\n    break;\ndefault:\n    break;\n}' },
    ],
    functions: [
      { id: 'c_16', label: 'main', text: 'int main(var) {\n    \n    return 0;\n}' },
      { id: 'c_17', label: 'function', text: 'type function(var) {\n    \n}' },
      { id: 'c_18', label: 'return', text: 'return ' },
      { id: 'c_19', label: 'malloc', text: 'malloc(' },
      { id: 'c_20', label: 'free', text: 'free(' },
    ],
    dataTypes: [
      { id: 'c_2', label: 'type', text: 'type ' },
      { id: 'c_21', label: 'struct', text: 'struct ' },
      { id: 'c_22', label: 'typedef', text: 'typedef ' },
      { id: 'c_23', label: 'const', text: 'const ' },
      { id: 'c_24', label: 'static', text: 'static ' },
      { id: 'c_26', label: 'NULL', text: 'NULL' },
    ],
  },
  sequences: {
    '#include': ['<stdio.h>', '<stdlib.h>', '<string.h>'],
    'printf': ['('],
    'scanf': ['('],
    'for': ['('],
    'if': ['('],
    'while': ['('],
  },
  syntax: {
    keywords: [
      'int', 'double', 'float', 'char', 'void', 'const', 'static', 'struct', 'typedef', 'enum',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'return', 'goto', 'sizeof', 'auto', 'register', 'extern', 'volatile', 'signed', 'unsigned'
    ],
    builtins: ['printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcmp', 'NULL'],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// Go Language Definition
export const goLanguage: LanguageDefinition = {
  key: 'go',
  name: 'Go',
  fileExtensions: ['go'],
  snippets: {
    basic: [
      { id: 'go_1', label: 'package', text: 'package ' },
      { id: 'go_2', label: 'var', text: 'var ' },
      { id: 'go_3', label: 'name', text: 'name' },
      { id: 'go_4', label: 'string', text: 'string' },
      { id: 'go_5', label: 'int', text: 'int' },
      { id: 'go_6', label: ':=', text: ' := ' },
      { id: 'go_7', label: '=', text: ' = ' },
      { id: 'go_8', label: '0', text: '0' },
      { id: 'go_9', label: 'true', text: 'true' },
      { id: 'go_10', label: 'false', text: 'false' },
    ],
    controlFlow: [
      { id: 'go_11', label: 'if', text: 'if condition {\n    \n}' },
      { id: 'go_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'go_13', label: 'for', text: 'for var := 0; var < var; var++ {\n    \n}' },
      { id: 'go_14', label: 'range', text: 'for var, var := range var {\n    \n}' },
      { id: 'go_15', label: 'switch', text: 'switch var {\ncase var:\n    \ndefault:\n    \n}' },
      { id: 'go_16', label: 'defer', text: 'defer ' },
    ],
    functions: [
      { id: 'go_17', label: 'main', text: 'func main(var) {\n    \n}' },
      { id: 'go_18', label: 'return', text: 'return ' },
      { id: 'go_19', label: 'make', text: 'make(' },
      { id: 'go_20', label: 'append', text: 'append(' },
    ],
    dataTypes: [
      { id: 'go_5', label: 'type', text: 'type' },
      { id: 'go_23', label: 'map', text: 'map[string]int' },
      { id: 'go_24', label: 'struct', text: 'struct {\n    \n}' },
      { id: 'go_25', label: 'interface', text: 'interface {\n    \n}' },
      { id: 'go_26', label: 'chan', text: 'chan ' },
    ],
  },
  sequences: {
    'package': ['main'],
    'import': ['fmt', '"fmt"'],
    'func': ['main'],
    'fmt.Println': ['('],
    'fmt.Printf': ['('],
    'for': ['i', 'range'],
    'if': ['err'],
  },
  syntax: {
    keywords: [
      'package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'chan', 'map',
      'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'fallthrough',
      'return', 'go', 'defer', 'select', 'true', 'false', 'nil', 'make', 'new', 'len', 'cap'
    ],
    builtins: ['fmt', 'append', 'make', 'len', 'cap', 'new', 'delete', 'panic', 'recover'],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--', ':=', '<-'],
    stringDelimiters: ['"', '`'],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// Rust Language Definition
export const rustLanguage: LanguageDefinition = {
  key: 'rust',
  name: 'Rust',
  fileExtensions: ['rs'],
  snippets: {
    basic: [
      { id: 'rust_1', label: 'let', text: 'let ' },
      { id: 'rust_2', label: 'mut', text: 'mut ' },
      { id: 'rust_3', label: 'name', text: 'name' },
      { id: 'rust_4', label: ':', text: ': ' },
      { id: 'rust_5', label: 'i32', text: 'i32' },
      { id: 'rust_6', label: 'String', text: 'String' },
      { id: 'rust_7', label: '=', text: ' = ' },
      { id: 'rust_8', label: '0', text: '0' },
      { id: 'rust_9', label: 'true', text: 'true' },
      { id: 'rust_10', label: 'false', text: 'false' },
    ],
    controlFlow: [
      { id: 'rust_11', label: 'if', text: 'if condition {\n    \n}' },
      { id: 'rust_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'rust_13', label: 'for', text: 'for var in 0..var {\n    \n}' },
      { id: 'rust_14', label: 'while', text: 'while condition {\n    \n}' },
      { id: 'rust_15', label: 'match', text: 'match var {\n    var => var,\n    _ => var,\n}' },
      { id: 'rust_16', label: 'loop', text: 'loop {\n    \n}' },
    ],
    functions: [
      { id: 'rust_17', label: 'main', text: 'fn main(var) {\n    \n}' },
      { id: 'rust_18', label: 'return', text: 'return ' },
      { id: 'rust_19', label: 'impl', text: 'impl ' },
      { id: 'rust_20', label: 'use', text: 'use ' },
    ],
    dataTypes: [
      { id: 'rust_21', label: 'type', text: 'type' },
      { id: 'rust_22', label: 'Vec', text: 'Vec<>' },
      { id: 'rust_23', label: 'HashMap', text: 'HashMap<String, i32>' },
      { id: 'rust_24', label: 'Option', text: 'Option<>' },
      { id: 'rust_25', label: 'Result', text: 'Result<>' },
      { id: 'rust_26', label: 'struct', text: 'struct ' },
      { id: 'rust_27', label: 'enum', text: 'enum ' },
    ],
  },
  sequences: {
    'let': ['mut'],
    'fn': ['main'],
    'println!': ['('],
    'use': ['std'],
    'match': ['value'],
    'for': ['i'],
  },
  syntax: {
    keywords: [
      'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'type', 'mod', 'use', 'pub',
      'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'yield',
      'true', 'false', 'Some', 'None', 'Ok', 'Err', 'self', 'Self', 'super', 'crate', 'where'
    ],
    builtins: ['println', 'print', 'vec', 'format', 'panic', 'assert', 'Vec', 'HashMap', 'Option', 'Result'],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '->', '=>'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// C# Language Definition
export const csharpLanguage: LanguageDefinition = {
  key: 'csharp',
  name: 'C#',
  fileExtensions: ['cs'],
  snippets: {
    basic: [
      { id: 'cs_1', label: 'public', text: 'public ' },
      { id: 'cs_2', label: 'private', text: 'private ' },
      { id: 'cs_3', label: 'int', text: 'int ' },
      { id: 'cs_4', label: 'string', text: 'string ' },
      { id: 'cs_5', label: 'var', text: 'var ' },
      { id: 'cs_6', label: 'name', text: 'name' },
      { id: 'cs_7', label: '=', text: ' = ' },
      { id: 'cs_8', label: '0', text: '0' },
      { id: 'cs_9', label: 'true', text: 'true' },
      { id: 'cs_10', label: ';', text: ';' },
    ],
    controlFlow: [
      { id: 'cs_11', label: 'if', text: 'if (condition)\n{\n    \n}' },
      { id: 'cs_12', label: 'else', text: 'else\n{\n    \n}' },
      { id: 'cs_13', label: 'for', text: 'for (int var = 0; var < var; var++)\n{\n    \n}' },
      { id: 'cs_14', label: 'foreach', text: 'foreach (var var in var)\n{\n    \n}' },
      { id: 'cs_15', label: 'while', text: 'while (condition)\n{\n    \n}' },
      { id: 'cs_16', label: 'try', text: 'try\n{\n    \n}\ncatch (Exception var)\n{\n    \n}' },
    ],
    functions: [
      { id: 'cs_17', label: 'Main', text: 'static void Main(var[] var)\n{\n    \n}' },
      { id: 'cs_18', label: 'method', text: 'public type function(var)\n{\n    \n}' },
      { id: 'cs_19', label: 'return', text: 'return ' },
      { id: 'cs_20', label: 'namespace', text: 'namespace ' },
    ],
    dataTypes: [
      { id: 'cs_3', label: 'type', text: 'type ' },
      { id: 'cs_21', label: 'List', text: 'List<>' },
      { id: 'cs_22', label: 'Dictionary', text: 'Dictionary<string, int>' },
      { id: 'cs_23', label: 'Array', text: 'int[] ' },
    ],
  },
  sequences: {
    'using': ['System', 'System.Collections.Generic'],
    'Console.WriteLine': ['('],
    'for': ['('],
    'if': ['('],
    'while': ['('],
    'public': ['class', 'void', 'int', 'string'],
  },
  syntax: {
    keywords: [
      'using', 'namespace', 'class', 'struct', 'interface', 'enum', 'public', 'private', 'protected', 'internal',
      'static', 'readonly', 'const', 'virtual', 'override', 'abstract', 'sealed', 'partial',
      'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'try', 'catch', 'finally', 'throw', 'return', 'yield', 'true', 'false', 'null', 'new', 'this', 'base'
    ],
    builtins: ['Console', 'string', 'int', 'double', 'bool', 'var', 'object', 'List', 'Dictionary', 'Array'],
    operators: ['=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--', '=>'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// PHP Language Definition  
export const phpLanguage: LanguageDefinition = {
  key: 'php',
  name: 'PHP',
  fileExtensions: ['php'],
  snippets: {
    basic: [
      { id: 'php_1', label: '$', text: '$' },
      { id: 'php_2', label: 'name', text: 'name' },
      { id: 'php_3', label: '=', text: ' = ' },
      { id: 'php_4', label: '0', text: '0' },
      { id: 'php_5', label: 'true', text: 'true' },
      { id: 'php_6', label: 'false', text: 'false' },
      { id: 'php_7', label: 'null', text: 'null' },
      { id: 'php_8', label: ';', text: ';' },
      { id: 'php_9', label: '"', text: '""' },
      { id: 'php_10', label: "'", text: "''" },
    ],
    controlFlow: [
      { id: 'php_11', label: 'if', text: 'if (condition) {\n    \n}' },
      { id: 'php_12', label: 'else', text: 'else {\n    \n}' },
      { id: 'php_13', label: 'for', text: 'for ($var = 0; $var < $var; $var++) {\n    \n}' },
      { id: 'php_14', label: 'foreach', text: 'foreach ($var as $var) {\n    \n}' },
      { id: 'php_15', label: 'while', text: 'while (condition) {\n    \n}' },
      { id: 'php_16', label: 'try', text: 'try {\n    \n} catch (Exception $var) {\n    \n}' },
    ],
    functions: [
      { id: 'php_17', label: 'function', text: 'function function($var) {\n    \n}' },
      { id: 'php_18', label: 'return', text: 'return ' },
      { id: 'php_19', label: 'class', text: 'class ClassName {\n    \n}' },
      { id: 'php_20', label: 'public', text: 'public function ' },
    ],
    dataTypes: [
      { id: 'php_21', label: 'type', text: 'type' },
      { id: 'php_22', label: '[]', text: '[]' },
      { id: 'php_23', label: 'null', text: 'null' },
      { id: 'php_24', label: 'isset', text: 'isset(' },
      { id: 'php_25', label: 'empty', text: 'empty(' },
      { id: 'php_26', label: 'count', text: 'count(' },
    ],
  },
  sequences: {
    '$': ['variable'],
    'echo': ['"'],
    'if': ['('],
    'for': ['('],
    'while': ['('],
    'foreach': ['('],
  },
  syntax: {
    keywords: [
      'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'function', 'class', 'interface', 'trait', 'extends', 'implements', 'public', 'private', 'protected',
      'static', 'final', 'abstract', 'const', 'var', 'global', 'return', 'yield', 'try', 'catch', 'finally',
      'throw', 'new', 'clone', 'instanceof', 'true', 'false', 'null', 'self', 'parent', 'this'
    ],
    builtins: ['echo', 'print', 'var_dump', 'print_r', 'isset', 'empty', 'count', 'strlen', 'array', 'unset'],
    operators: ['=', '.=', '+=', '-=', '*=', '/=', '%=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--', '->', '=>'],
    stringDelimiters: ['"', "'"],
    commentStart: '//',
    blockComment: { start: '/*', end: '*/' },
  },
};

// All supported languages
export const supportedLanguages: LanguageDefinition[] = [
  pythonLanguage,
  javascriptLanguage,
  typescriptLanguage,
  javaLanguage,
  cppLanguage,
  cLanguage,
  goLanguage,
  rustLanguage,
  csharpLanguage,
  phpLanguage,
];

// Helper function to get language by file extension
export function getLanguageByExtension(extension: string): LanguageDefinition {
  const cleanExt = extension.toLowerCase().replace('.', '');
  return supportedLanguages.find(lang => 
    lang.fileExtensions.includes(cleanExt)
  ) || pythonLanguage; // Default to Python
}

// Helper function to get language by key
export function getLanguageByKey(key: string): LanguageDefinition {
  return supportedLanguages.find(lang => lang.key === key) || pythonLanguage;
}