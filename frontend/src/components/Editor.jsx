import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, onChange, disabled }) => {
  const handleEditorWillMount = (monaco) => {
    // Register completion provider for C/C++ in the simulator
    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          // Basic registers
          ...['TRISA', 'TRISB', 'TRISC', 'TRISD', 'TRISE', 'PORTA', 'PORTB', 'PORTC', 'PORTD', 'PORTE', 'ANSELA', 'ANSELB', 'ANSELC', 'ANSELD', 'ANSELE'].map(reg => ({
            label: reg,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: reg,
            detail: 'PIC16F1789 Register'
          })),
          // Bit access
          ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(bit => 
            ['RA', 'RB', 'RC', 'RD', 'RE'].map(port => ({
              label: `${port}${bit}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${port}${bit}`,
              detail: `Bit ${bit} of ${port}`
            }))
          ),
          // Common functions
          {
            label: 'while(1)',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'while(1) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Infinite Loop'
          },
          {
            label: 'seg(val)',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'seg(${1:0})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Convert to 7-Segment Pattern'
          }
        ];
        return { suggestions };
      }
    });
  };

  return (
    <div className="flex-1 h-full border-r border-white/5 flex flex-col min-w-0 bg-[#1e1e1e]">
      <div className="bg-[#1e1e1e] h-10 flex items-center px-4 border-b border-white/5 flex-shrink-0 text-white/40 font-mono text-[11px] tracking-widest uppercase font-black">
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
            <span>main.c</span>
        </div>
      </div>
      <Editor
        height="100%"
        defaultLanguage="cpp"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        beforeMount={handleEditorWillMount}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 20 },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          cursorSmoothCaretAnimation: 'on',
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
