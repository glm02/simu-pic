import re


# ──────────────────────────────────────────────────────────────────────────────
#  PIC16F1789 Simulator Engine — v4.0  (Comprehensive C subset interpreter)
# ──────────────────────────────────────────────────────────────────────────────
#  Supported C features:
#    - Variable declarations (char, int, unsigned, const, static, volatile…)
#    - Multi-variable declarations:  int a = 1, b = 2;
#    - All PIC SFRs (PORTA–E, TRISA–E, ANSELA–E, ADRESH/L, TMR, T2CON, …)
#    - Bit-field access:  PORTAbits.RA0,  RA0, LATAbits.LATA0, TRISAbits.TRISA0
#    - Arithmetic:  +  -  *  /  %  <<  >>  &  |  ^  ~  !
#    - Compound ops: +=  -=  |=  &=  ^=  <<=  >>=  *=  /=  %=
#    - Increment / Decrement: x++  x--  ++x  --x
#    - Comparisons:  ==  !=  <  >  <=  >=
#    - Logical ops:  &&  ||  !
#    - Ternary operator:  cond ? a : b
#    - Casts:  (unsigned char)val
#    - sizeof() — returns 1 for char, 2 for int
#    - if / else if / else  (braced or brace-less)
#    - for loops
#    - while loops (non-infinite)
#    - do { … } while (cond);
#    - switch / case / default / break
#    - break / continue (raises control exceptions caught by loops)
#    - User-defined void functions (no arguments)
#    - printf / sprintf  → LCD_LINE1
#    - lcd_write / lcd_putrs / lcd_puts / lcd_print  → LCD_LINE1/2
#    - lcd_clear
#    - seg(n)  → 7-segment lookup
#    - #define macros (simple value substitution)
#    - #include / #pragma / __delay_ms / __delay_us / NOP → stripped
# ──────────────────────────────────────────────────────────────────────────────


class _Break(Exception):
    """Raised by `break;` to exit loops / switch."""
    pass


class _Continue(Exception):
    """Raised by `continue;` to skip to next loop iteration."""
    pass


class PICSimulator:
    def __init__(self):
        self.registers = {
            # I/O Ports
            "TRISA": 0xFF, "PORTA": 0x00, "LATA": 0x00, "ANSELA": 0xFF,
            "TRISB": 0xFF, "PORTB": 0x00, "LATB": 0x00, "ANSELB": 0xFF,
            "TRISC": 0xFF, "PORTC": 0x00, "LATC": 0x00, "ANSELC": 0xFF,
            "TRISD": 0xFF, "PORTD": 0x00, "LATD": 0x00, "ANSELD": 0xFF,
            "TRISE": 0xFF, "PORTE": 0x00, "LATE": 0x00, "ANSELE": 0xFF,
            # Timers
            "T1CON": 0x00, "T2CON": 0x00, "PR2": 0xFF,
            "TMR0": 0x00, "TMR1H": 0x00, "TMR1L": 0x00, "TMR2": 0x00,
            # ADC
            "ADCON0": 0x00, "ADCON1": 0x00, "ADRESH": 0x00, "ADRESL": 0x00,
            # CPU core
            "W": 0x00, "STATUS": 0x00, "BSR": 0x00, "PCL": 0x00,
            "INTCON": 0x00, "OPTION_REG": 0xFF,
            # PWM
            "CCP1CON": 0x00, "CCPR1L": 0x00, "CCPR1H": 0x00,
            "CCP2CON": 0x00, "CCPR2L": 0x00, "CCPR2H": 0x00,
            # LCD virtual lines
            "LCD_LINE1": "",
            "LCD_LINE2": "",
        }

        self.code_lines = []       # Tokenised loop body blocks
        self.vars = {}             # User variables
        self.defines = {}          # #define macros
        self.functions = {}        # User-defined void functions: name → body_str
        self.error_log = []

        self.SEG_MAP = {
            0: 0x3F, 1: 0x06, 2: 0x5B, 3: 0x4F,
            4: 0x66, 5: 0x6D, 6: 0x7D, 7: 0x07,
            8: 0x7F, 9: 0x6F, 10: 0x77, 11: 0x7C,
            12: 0x39, 13: 0x5E, 14: 0x79, 15: 0x71,
        }

    # ──────────────────────────────────────────────────────────────────────────
    #  PUBLIC API
    # ──────────────────────────────────────────────────────────────────────────

    def set_code(self, code: str):
        """Parse C source into an executable form."""
        self.error_log = []

        # 1) Strip comments
        code = re.sub(r"//.*", "", code)
        code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)

        # 2) Capture #define macros
        self.defines = {}
        for dm in re.finditer(r"#define\s+(\w+)\s+(.+)", code):
            name, value = dm.group(1).strip(), dm.group(2).strip()
            if name.upper() not in ("_XTAL_FREQ",):
                self.defines[name] = value

        # 3) Strip preprocessor noise
        code = re.sub(r"#include\s*[<\"].*?[>\"]", "", code)
        code = re.sub(r"#pragma\s+.*", "", code)
        code = re.sub(r"#define\s+\w+.*", "", code)
        code = re.sub(r"#ifdef\b.*?#endif", "", code, flags=re.DOTALL)
        code = re.sub(r"#ifndef\b.*?#endif", "", code, flags=re.DOTALL)
        code = re.sub(r"#if\b.*?#endif", "", code, flags=re.DOTALL)

        # 4) Strip delay / nop
        code = re.sub(r"\b__delay_ms\s*\([^)]*\)\s*;?", "", code)
        code = re.sub(r"\b__delay_us\s*\([^)]*\)\s*;?", "", code)
        code = re.sub(r"\b__delay\s*\([^)]*\)\s*;?", "", code)
        code = re.sub(r"\bNOP\s*\(\s*\)\s*;?", "", code, flags=re.I)
        code = re.sub(r"\b_nop\s*\(\s*\)\s*;?", "", code, flags=re.I)

        # 5) Substitute #define macros (longest-first)
        for name in sorted(self.defines.keys(), key=len, reverse=True):
            code = re.sub(rf"\b{re.escape(name)}\b", self.defines[name], code)

        # 6) Strip C-style casts
        code = re.sub(
            r"\(\s*(?:(?:unsigned|signed|const|volatile|static)\s+)*"
            r"(?:char|int|long|short|float|double|uint8_t|uint16_t|uint32_t"
            r"|int8_t|int16_t|int32_t|void|size_t)\s*\*?\s*\)",
            "", code
        )

        # 7) Replace sizeof
        code = re.sub(r"\bsizeof\s*\(\s*(?:unsigned\s+)?char\s*\)", "1", code)
        code = re.sub(r"\bsizeof\s*\(\s*(?:unsigned\s+)?int\s*\)", "2", code)
        code = re.sub(r"\bsizeof\s*\(\s*(?:unsigned\s+)?long\s*\)", "4", code)
        code = re.sub(r"\bsizeof\s*\([^)]*\)", "1", code)  # fallback

        # 8) Extract user-defined functions (before main)
        self.functions = {}
        func_pattern = re.compile(
            r"\bvoid\s+(\w+)\s*\(\s*(?:void)?\s*\)\s*\{",
            re.DOTALL
        )
        for m in func_pattern.finditer(code):
            fname = m.group(1)
            if fname == "main":
                continue
            # find matching closing brace
            body, end = self._extract_braces(code, m.end() - 1)
            self.functions[fname] = body
        # Strip function definitions (except main)
        for fname in self.functions:
            code = re.sub(
                rf"\bvoid\s+{re.escape(fname)}\s*\(\s*(?:void)?\s*\)\s*\{{.*?\}}",
                "", code, count=1, flags=re.DOTALL
            )
        # Also strip function prototypes
        code = re.sub(r"\bvoid\s+\w+\s*\([^)]*\)\s*;", "", code)

        # 9) Extract void main(…) { … }
        main_match = re.search(
            r"void\s+main\s*\(\s*(?:void)?\s*\)\s*\{", code, re.DOTALL
        )
        if main_match:
            main_body, _ = self._extract_braces(code, main_match.end() - 1)
            main_content = main_body
        else:
            main_content = code

        # 10) Split into init + while(1) loop body
        while_match = re.search(
            r"while\s*\(\s*(1|true)\s*\)\s*\{", main_content, re.DOTALL
        )
        if while_match:
            loop_body, loop_end = self._extract_braces(
                main_content, while_match.end() - 1
            )
            self.code_lines = self.tokenize_blocks(loop_body)
            init_part = main_content[: while_match.start()]
        else:
            # Try for(;;)
            for_inf = re.search(
                r"for\s*\(\s*;\s*;\s*\)\s*\{", main_content, re.DOTALL
            )
            if for_inf:
                loop_body, _ = self._extract_braces(
                    main_content, for_inf.end() - 1
                )
                self.code_lines = self.tokenize_blocks(loop_body)
                init_part = main_content[: for_inf.start()]
            else:
                self.code_lines = self.tokenize_blocks(main_content)
                init_part = ""

        # 11) Run init
        self.vars = {}
        for line in self.tokenize_blocks(init_part):
            try:
                self.execute_block(line)
            except (_Break, _Continue):
                pass
            except Exception as e:
                self.error_log.append(f"Init error: {e}")

    def step(self, inputs: dict) -> dict:
        """Execute one full pass of the main loop with optional input changes."""
        if inputs.get("type") == "RESET":
            self.__init__()
            return self.get_state()

        # Apply external input changes
        for reg, val in inputs.items():
            if reg == "type":
                continue
            reg_up = reg.upper()
            if reg_up in self.registers and isinstance(self.registers[reg_up], int):
                self.registers[reg_up] = int(val) & 0xFF

        # Execute one full pass of the loop body
        for block in self.code_lines:
            try:
                self.execute_block(block)
            except (_Break, _Continue):
                pass
            except Exception as e:
                self.error_log.append(f"Runtime error: {e}")

        return self.get_state()

    def get_state(self) -> dict:
        state = {k: v for k, v in self.registers.items()}
        state["errors"] = self.error_log.copy()
        self.error_log = []
        return state

    # ──────────────────────────────────────────────────────────────────────────
    #  TOKENISER — splits code into top-level statement blocks
    # ──────────────────────────────────────────────────────────────────────────

    def tokenize_blocks(self, code: str):
        blocks = []
        current = ""
        depth = 0
        i = 0
        while i < len(code):
            char = code[i]
            current += char
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1

            if depth == 0:
                emit = False
                if char == ";":
                    stripped = current.strip()
                    if stripped and stripped != ";":
                        emit = True
                elif current.strip().endswith("}"):
                    stripped = current.strip()
                    if stripped:
                        emit = True

                if emit:
                    # Peek ahead: if 'else' follows, keep collecting
                    j = i + 1
                    while j < len(code) and code[j] in " \t\n\r":
                        j += 1
                    if j < len(code) and code[j: j + 4] == "else":
                        pass  # don't emit — else belongs to this chain
                    else:
                        blocks.append(current.strip())
                        current = ""
            i += 1

        if current.strip():
            blocks.append(current.strip())
        return [b for b in blocks if b]

    # ──────────────────────────────────────────────────────────────────────────
    #  EXECUTOR — executes a single block of C code
    # ──────────────────────────────────────────────────────────────────────────

    def execute_block(self, block: str):
        if not block:
            return
        block = block.strip()
        if block in (";", ""):
            return

        # Skip bare flow-control
        if re.match(r"^break\s*;?$", block):
            raise _Break()
        if re.match(r"^continue\s*;?$", block):
            raise _Continue()
        if re.match(r"^return\b.*?;?$", block):
            return

        # Skip orphaned 'else' blocks
        if re.match(r"^else\b", block):
            return

        # ── FOR loop ──────────────────────────────────────────────────
        for_match = re.match(
            r"^for\s*\(([^;]*);([^;]*);([^)]*)\)\s*\{(.*)\}$", block, re.DOTALL
        )
        if for_match:
            init_s, cond, post, body = for_match.groups()
            init_s = init_s.strip()
            if init_s:
                self.execute_block(init_s + (";") if not init_s.endswith(";") else init_s)
            safety = 0
            while self.evaluate_condition(cond.strip()) and safety < 10000:
                try:
                    for sub in self.tokenize_blocks(body):
                        self.execute_block(sub)
                except _Break:
                    break
                except _Continue:
                    pass
                # post step
                post_s = post.strip()
                if post_s:
                    self.execute_block(post_s + ";" if not post_s.endswith(";") else post_s)
                safety += 1
            return

        # ── FOR loop (brace-less single statement) ────────────────────
        for_nob = re.match(
            r"^for\s*\(([^;]*);([^;]*);([^)]*)\)\s+(.+;)$", block, re.DOTALL
        )
        if for_nob:
            init_s, cond, post, body_stmt = for_nob.groups()
            init_s = init_s.strip()
            if init_s:
                self.execute_block(init_s + ";" if not init_s.endswith(";") else init_s)
            safety = 0
            while self.evaluate_condition(cond.strip()) and safety < 10000:
                try:
                    self.execute_block(body_stmt.strip())
                except _Break:
                    break
                except _Continue:
                    pass
                post_s = post.strip()
                if post_s:
                    self.execute_block(post_s + ";" if not post_s.endswith(";") else post_s)
                safety += 1
            return

        # ── DO-WHILE loop ─────────────────────────────────────────────
        do_match = re.match(
            r"^do\s*\{(.*)\}\s*while\s*\((.+?)\)\s*;?$", block, re.DOTALL
        )
        if do_match:
            body, cond = do_match.groups()
            safety = 0
            while True:
                try:
                    for sub in self.tokenize_blocks(body):
                        self.execute_block(sub)
                except _Break:
                    break
                except _Continue:
                    pass
                safety += 1
                if not self.evaluate_condition(cond) or safety >= 10000:
                    break
            return

        # ── WHILE loop (non-infinite) ─────────────────────────────────
        while_match = re.match(r"^while\s*\((.+?)\)\s*\{(.*)\}$", block, re.DOTALL)
        if while_match and not re.match(r"^while\s*\(\s*(1|true)\s*\)", block):
            cond, body = while_match.groups()
            safety = 0
            while self.evaluate_condition(cond) and safety < 10000:
                try:
                    for sub in self.tokenize_blocks(body):
                        self.execute_block(sub)
                except _Break:
                    break
                except _Continue:
                    pass
                safety += 1
            return

        # ── printf / sprintf (LCD line 1) ─────────────────────────────
        printf_match = re.search(
            r'(?:s?printf)\s*\(\s*"(.*?)"((?:\s*,\s*[^)]+)*)\s*\)', block
        )
        if printf_match:
            self._handle_printf(printf_match.group(1), printf_match.group(2))
            return

        # ── lcd_write / lcd_putrs / lcd_puts / lcd_print ──────────────
        lcd_match = re.search(
            r'lcd_(?:write|putrs|puts|print)\s*\(\s*(\d)\s*,\s*"(.*?)"\s*\)', block
        )
        if lcd_match:
            line_num = lcd_match.group(1)
            self.registers[f"LCD_LINE{line_num}"] = lcd_match.group(2)[:16]
            return

        # ── lcd_clear ─────────────────────────────────────────────────
        if re.match(r"^lcd_clear\s*\(\s*\)\s*;?$", block):
            self.registers["LCD_LINE1"] = ""
            self.registers["LCD_LINE2"] = ""
            return

        # ── User-defined function call ────────────────────────────────
        func_call = re.match(r"^(\w+)\s*\(\s*\)\s*;?$", block)
        if func_call and func_call.group(1) in self.functions:
            fname = func_call.group(1)
            for sub in self.tokenize_blocks(self.functions[fname]):
                self.execute_block(sub)
            return

        # ── IF / ELSE-IF / ELSE chain ─────────────────────────────────
        if re.match(r"^if\s*\(", block):
            self._execute_if_chain(block)
            return

        # ── SWITCH / CASE ─────────────────────────────────────────────
        switch_match = re.match(r"^switch\s*\((.+?)\)\s*\{(.*)\}$", block, re.DOTALL)
        if switch_match:
            self._execute_switch(switch_match.group(1), switch_match.group(2))
            return

        # ── Multi-variable declaration:  int a = 1, b = 2; ───────────
        multi_decl = re.match(
            r"^(?:(?:unsigned|signed|const|volatile|static)\s+)*"
            r"(?:char|int|long|short|float|double|uint8_t|uint16_t)\s+"
            r"(\w+\s*(?:=\s*[^,;]+)?\s*(?:,\s*\w+\s*(?:=\s*[^,;]+)?)*)\s*;?$",
            block
        )
        if multi_decl:
            decl_body = multi_decl.group(1)
            # Split by comma, respecting parentheses
            parts = self._split_comma(decl_body)
            for part in parts:
                part = part.strip()
                m = re.match(r"(\w+)\s*=\s*(.+)", part)
                if m:
                    self.set_value(m.group(1).strip(), self.evaluate_expression(m.group(2).strip()))
                else:
                    name = part.strip()
                    if name and re.match(r"^\w+$", name):
                        self.vars.setdefault(name, 0)
            return

        # ── Increment / Decrement  (x++, x--, ++x, --x) ──────────────
        inc_match = re.match(r"^(\+\+|--)?\s*([\w.]+)\s*(\+\+|--)?;?$", block)
        if inc_match and (inc_match.group(1) or inc_match.group(3)):
            target = inc_match.group(2)
            is_inc = inc_match.group(1) == "++" or inc_match.group(3) == "++"
            self.set_value(target, self.get_value(target) + (1 if is_inc else -1))
            return

        # ── Compound assignment  (+=  -=  |=  &=  ^=  <<=  >>=) ──────
        compound_match = re.match(
            r"^([\w.]+)\s*(\+=|-=|\|=|&=|\^=|<<=|>>=|\*=|/=|%=)\s*(.*?);?$", block
        )
        if compound_match:
            target = compound_match.group(1)
            op = compound_match.group(2)
            rhs = self.evaluate_expression(compound_match.group(3).rstrip(";"))
            cur = self.get_value(target)
            result = {
                "+=": cur + rhs,
                "-=": cur - rhs,
                "|=": cur | rhs,
                "&=": cur & rhs,
                "^=": cur ^ rhs,
                "<<=": (cur << rhs) & 0xFFFF,
                ">>=": cur >> max(rhs, 0),
                "*=": cur * rhs,
                "/=": cur // rhs if rhs != 0 else 0,
                "%=": cur % rhs if rhs != 0 else 0,
            }.get(op, cur)
            self.set_value(target, result)
            return

        # ── Simple / Declared assignment ──────────────────────────────
        assign_match = re.match(
            r"^(?:(?:unsigned\s+|signed\s+|const\s+|volatile\s+|static\s+)*"
            r"(?:char|int|long|short|float|double|uint8_t|uint16_t|uint32_t)\s+)?"
            r"([\w.]+)\s*=\s*(.*?);?$",
            block,
        )
        if assign_match:
            target = assign_match.group(1).strip()
            expr = assign_match.group(2).strip().rstrip(";")
            if target and target not in ("if", "for", "while", "return", "else", "switch", "do"):
                self.set_value(target, self.evaluate_expression(expr))
            return

    # ──────────────────────────────────────────────────────────────────────────
    #  PRINTF HANDLER
    # ──────────────────────────────────────────────────────────────────────────

    def _handle_printf(self, fmt: str, args_raw: str):
        args_raw = args_raw.strip().lstrip(",").strip()
        if args_raw:
            args = self._split_comma(args_raw)
            try:
                vals = [self.evaluate_expression(a.strip()) for a in args]
                result = fmt
                for v in vals:
                    iv = int(v) & 0xFF
                    # Handle various format specifiers
                    result = re.sub(r"%\d*[diu]", str(iv), result, count=1)
                    result = re.sub(r"%\d*[xX]", f"{iv:02X}", result, count=1)
                    result = re.sub(r"%\d*[bB]", f"{iv:08b}", result, count=1)
                    result = re.sub(r"%\d*[oO]", f"{iv:o}", result, count=1)
                    result = re.sub(r"%c", chr(iv) if 32 <= iv < 127 else "?", result, count=1)
                    result = re.sub(r"%\d*s", str(iv), result, count=1)
                self.registers["LCD_LINE1"] = result[:16]
            except Exception:
                self.registers["LCD_LINE1"] = fmt[:16]
        else:
            # Handle escape sequences
            display = fmt.replace("\\n", "").replace("\\t", " ")
            self.registers["LCD_LINE1"] = display[:16]

    # ──────────────────────────────────────────────────────────────────────────
    #  IF-CHAIN
    # ──────────────────────────────────────────────────────────────────────────

    def _execute_if_chain(self, block: str):
        pos = 0
        n = len(block)

        while pos < n:
            rest = block[pos:].lstrip()
            if not rest:
                break

            # Match 'if' or 'else if'
            head = re.match(r"(?:else\s+)?if\s*\(", rest)
            if not head:
                # Plain 'else'
                else_m = re.match(r"else\s+(.*)", rest, re.DOTALL)
                if else_m:
                    else_body_raw = else_m.group(1).strip()
                    body, _ = self._extract_body_at(
                        rest, len(rest) - len(else_m.group(1))
                    )
                    for sub in self.tokenize_blocks(body):
                        self.execute_block(sub)
                return

            abs_kw = pos + (len(block[pos:]) - len(rest))
            paren_open = block.index("(", abs_kw)
            cond, cond_end = self._extract_parens(block, paren_open)
            body, body_end = self._extract_body_at(block, cond_end)
            pos = body_end

            if self.evaluate_condition(cond):
                for sub in self.tokenize_blocks(body):
                    self.execute_block(sub)
                return

    # ──────────────────────────────────────────────────────────────────────────
    #  SWITCH / CASE
    # ──────────────────────────────────────────────────────────────────────────

    def _execute_switch(self, expr_str: str, body: str):
        val = self.evaluate_expression(expr_str)

        # Parse cases more robustly
        cases = re.findall(
            r"case\s+(.+?)\s*:(.*?)(?=case\s+.+?\s*:|default\s*:|$)", body, re.DOTALL
        )
        default = re.search(r"default\s*:(.*?)$", body, re.DOTALL)

        matched = False
        for case_val_str, case_body in cases:
            case_val_str = case_val_str.strip()
            # Handle character literals in case: case 'A':
            char_lit = re.match(r"^'(.)'$", case_val_str)
            if char_lit:
                case_val = ord(char_lit.group(1))
            else:
                try:
                    case_val = int(case_val_str, 0)
                except ValueError:
                    case_val = self.evaluate_expression(case_val_str)

            if val == case_val or matched:
                matched = True
                clean_body = re.sub(r"\bbreak\s*;?", "", case_body)
                try:
                    for sub in self.tokenize_blocks(clean_body):
                        self.execute_block(sub)
                except _Break:
                    return
                if re.search(r"\bbreak\b", case_body):
                    return

        if not matched and default:
            clean_body = re.sub(r"\bbreak\s*;?", "", default.group(1))
            for sub in self.tokenize_blocks(clean_body):
                self.execute_block(sub)

    # ──────────────────────────────────────────────────────────────────────────
    #  VALUE HELPERS — get / set registers and variables
    # ──────────────────────────────────────────────────────────────────────────

    def get_value(self, target: str) -> int:
        target = target.strip()

        # PORTxbits.Rxy  or  Rxy  or  LATxbits.LATxy  or  TRISxbits.TRISxy
        bit_match = re.match(
            r"^(?:PORT([A-E])bits\.)?R([A-E])([0-7])$", target, re.I
        )
        if bit_match:
            port_letter = (bit_match.group(1) or bit_match.group(2)).upper()
            bit_index = int(bit_match.group(3))
            return (self.registers.get(f"PORT{port_letter}", 0) >> bit_index) & 1

        lat_match = re.match(
            r"^(?:LAT([A-E])bits\.)?LAT([A-E])([0-7])$", target, re.I
        )
        if lat_match:
            port_letter = (lat_match.group(1) or lat_match.group(2)).upper()
            bit_index = int(lat_match.group(3))
            return (self.registers.get(f"LAT{port_letter}", 0) >> bit_index) & 1

        tris_match = re.match(
            r"^(?:TRIS([A-E])bits\.)?TRIS([A-E])([0-7])$", target, re.I
        )
        if tris_match:
            port_letter = (tris_match.group(1) or tris_match.group(2)).upper()
            bit_index = int(tris_match.group(3))
            return (self.registers.get(f"TRIS{port_letter}", 0) >> bit_index) & 1

        t_upper = target.upper()
        if t_upper in self.registers and isinstance(self.registers[t_upper], int):
            return self.registers[t_upper]
        return self.vars.get(target, 0)

    def set_value(self, target: str, val: int):
        target = target.strip()
        val = int(val)

        # PORTxbits.Rxy  or  Rxy
        bit_match = re.match(
            r"^(?:PORT([A-E])bits\.)?R([A-E])([0-7])$", target, re.I
        )
        if bit_match:
            port_letter = (bit_match.group(1) or bit_match.group(2)).upper()
            bit_index = int(bit_match.group(3))
            reg_name = f"PORT{port_letter}"
            cur = self.registers.get(reg_name, 0)
            if val:
                self.registers[reg_name] = (cur | (1 << bit_index)) & 0xFF
            else:
                self.registers[reg_name] = (cur & ~(1 << bit_index)) & 0xFF
            # Also update LAT
            self.registers[f"LAT{port_letter}"] = self.registers[reg_name]
            return

        # LATxbits.LATxy
        lat_match = re.match(
            r"^(?:LAT([A-E])bits\.)?LAT([A-E])([0-7])$", target, re.I
        )
        if lat_match:
            port_letter = (lat_match.group(1) or lat_match.group(2)).upper()
            bit_index = int(lat_match.group(3))
            reg_name = f"LAT{port_letter}"
            cur = self.registers.get(reg_name, 0)
            if val:
                self.registers[reg_name] = (cur | (1 << bit_index)) & 0xFF
            else:
                self.registers[reg_name] = (cur & ~(1 << bit_index)) & 0xFF
            # Sync PORT
            self.registers[f"PORT{port_letter}"] = self.registers[reg_name]
            return

        # TRISxbits.TRISxy
        tris_match = re.match(
            r"^(?:TRIS([A-E])bits\.)?TRIS([A-E])([0-7])$", target, re.I
        )
        if tris_match:
            port_letter = (tris_match.group(1) or tris_match.group(2)).upper()
            bit_index = int(tris_match.group(3))
            reg_name = f"TRIS{port_letter}"
            cur = self.registers.get(reg_name, 0)
            if val:
                self.registers[reg_name] = (cur | (1 << bit_index)) & 0xFF
            else:
                self.registers[reg_name] = (cur & ~(1 << bit_index)) & 0xFF
            return

        t_upper = target.upper()
        if t_upper in self.registers and isinstance(self.registers[t_upper], int):
            self.registers[t_upper] = val & 0xFF
            # If writing PORTx, also sync LATx, and vice versa
            if t_upper.startswith("PORT") and len(t_upper) == 5:
                letter = t_upper[4]
                self.registers[f"LAT{letter}"] = val & 0xFF
            elif t_upper.startswith("LAT") and len(t_upper) == 4:
                letter = t_upper[3]
                self.registers[f"PORT{letter}"] = val & 0xFF
        else:
            self.vars[target] = val & 0xFFFF

    # ──────────────────────────────────────────────────────────────────────────
    #  EXPRESSION EVALUATOR
    # ──────────────────────────────────────────────────────────────────────────

    def evaluate_expression(self, expr: str) -> int:
        if not expr or not expr.strip():
            return 0
        expr = expr.strip().rstrip(";")

        # Handle ternary operator:  cond ? val_true : val_false
        ternary = self._split_ternary(expr)
        if ternary:
            cond_str, true_str, false_str = ternary
            if self.evaluate_condition(cond_str):
                return self.evaluate_expression(true_str)
            else:
                return self.evaluate_expression(false_str)

        # Handle character literals: 'A' → 65
        expr = re.sub(r"'\\n'", "10", expr)
        expr = re.sub(r"'\\r'", "13", expr)
        expr = re.sub(r"'\\t'", "9", expr)
        expr = re.sub(r"'\\0'", "0", expr)
        expr = re.sub(r"'\\\\'" , str(ord("\\")), expr)
        expr = re.sub(r"'(.)'", lambda m: str(ord(m.group(1))), expr)

        # Handle hex/binary/octal literals as-is (Python eval handles 0x, 0b, 0o)

        # Replace bit-field access before anything else
        for r in "ABCDE":
            for b in range(8):
                # PORTxbits.Rxy and Rxy
                bit_val = (self.registers.get(f"PORT{r}", 0) >> b) & 1
                expr = re.sub(
                    rf"\bPORT{r}bits\.R{r}{b}\b", str(bit_val), expr, flags=re.I
                )
                # LATxbits.LATxy
                lat_val = (self.registers.get(f"LAT{r}", 0) >> b) & 1
                expr = re.sub(
                    rf"\bLAT{r}bits\.LAT{r}{b}\b", str(lat_val), expr, flags=re.I
                )
                # TRISxbits.TRISxy
                tris_val = (self.registers.get(f"TRIS{r}", 0) >> b) & 1
                expr = re.sub(
                    rf"\bTRIS{r}bits\.TRIS{r}{b}\b", str(tris_val), expr, flags=re.I
                )
                # Bare Rxy
                expr = re.sub(rf"\bR{r}{b}\b", str(bit_val), expr, flags=re.I)

        # Build symbol table (registers + user vars)
        context = {}
        for k, v in self.registers.items():
            if isinstance(v, int):
                context[k] = v
                context[k.lower()] = v
        for k, v in self.vars.items():
            context[k] = v

        # Replace symbols longest-first
        for sym in sorted(context.keys(), key=len, reverse=True):
            expr = re.sub(rf"\b{re.escape(sym)}\b", str(context[sym]), expr)

        # Translate C operators to Python
        expr = re.sub(r"!(?!=)", " not ", expr)   # !  →  not  (but not !=)
        expr = expr.replace("&&", " and ").replace("||", " or ")
        expr = re.sub(r"\bnot\s+not\b", "", expr)  # clean double-neg

        # Handle seg() function
        expr = re.sub(r"\bseg\s*\(", "_seg_(", expr)

        try:
            safe_ns = {
                "__builtins__": {},
                "_seg_": lambda x: self.SEG_MAP.get(int(x) & 0xF, 0),
                "abs": abs,
                "min": min,
                "max": max,
            }
            result = eval(expr, safe_ns)
            return int(result) & 0xFFFF
        except Exception:
            return 0

    def evaluate_condition(self, condition: str) -> bool:
        return bool(self.evaluate_expression(condition))

    # ──────────────────────────────────────────────────────────────────────────
    #  TERNARY OPERATOR PARSER
    # ──────────────────────────────────────────────────────────────────────────

    def _split_ternary(self, expr: str):
        """Split `cond ? true_expr : false_expr` respecting nested parens."""
        depth_p = 0  # parentheses
        depth_t = 0  # ternary nesting
        q_pos = -1

        for i, ch in enumerate(expr):
            if ch == "(":
                depth_p += 1
            elif ch == ")":
                depth_p -= 1
            elif ch == "?" and depth_p == 0 and depth_t == 0:
                q_pos = i
                depth_t += 1
            elif ch == ":" and depth_p == 0 and depth_t == 1:
                return (
                    expr[:q_pos].strip(),
                    expr[q_pos + 1: i].strip(),
                    expr[i + 1:].strip(),
                )
        return None

    # ──────────────────────────────────────────────────────────────────────────
    #  BRACE / PAREN / BODY EXTRACTION HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_parens(self, text: str, open_pos: int):
        """Return (inner_text, end_pos) for balanced (...) starting at open_pos."""
        depth = 0
        i = open_pos
        start = open_pos + 1
        while i < len(text):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
                if depth == 0:
                    return text[start:i], i + 1
            i += 1
        return text[start:], len(text)

    def _extract_braces(self, text: str, open_pos: int):
        """Return (inner_text, end_pos) for balanced {...} starting at open_pos."""
        depth = 0
        i = open_pos
        start = open_pos + 1
        while i < len(text):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    return text[start:i], i + 1
            i += 1
        return text[start:], len(text)

    def _extract_body_at(self, text: str, from_pos: int):
        """Return (body_text, end_pos) for the body starting at or after from_pos."""
        i = from_pos
        while i < len(text) and text[i] in " \t\n\r":
            i += 1

        if i >= len(text):
            return "", len(text)

        if text[i] == "{":
            return self._extract_braces(text, i)

        # Brace-less: read until ';' at paren-depth 0
        depth = 0
        start = i
        while i < len(text):
            ch = text[i]
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == ";" and depth == 0:
                return text[start:i].strip(), i + 1
            i += 1

        return text[start:].strip().rstrip(";"), len(text)

    def _split_comma(self, text: str):
        """Split text by commas, respecting parentheses."""
        parts = []
        current = ""
        depth = 0
        for ch in text:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch == "," and depth == 0:
                parts.append(current.strip())
                current = ""
                continue
            current += ch
        if current.strip():
            parts.append(current.strip())
        return parts
