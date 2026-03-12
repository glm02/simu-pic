import re

class PICSimulator:
    def __init__(self):
        self.registers = {
            "TRISA": 0xFF, "PORTA": 0x00, "ANSELA": 0xFF,
            "TRISB": 0xFF, "PORTB": 0x00, "ANSELB": 0xFF,
            "TRISC": 0xFF, "PORTC": 0x00, "ANSELC": 0xFF,
            "TRISD": 0xFF, "PORTD": 0x00, "ANSELD": 0xFF,
            "TRISE": 0xFF, "PORTE": 0x00, "ANSELE": 0xFF,
            "T2CON": 0x00, "PR2": 0xFF, "TMR2": 0x00,
            "ADRESH": 0x00, "LCD_LINE1": "", "LCD_LINE2": ""
        }
        self.code_lines = []
        self.vars = {}  # Track local variables
        self.SEG_MAP = {
            0: 0x3F, 1: 0x06, 2: 0x5B, 3: 0x4F, 4: 0x66,
            5: 0x6D, 6: 0x7D, 7: 0x07, 8: 0x7F, 9: 0x6F,
            10: 0x77, 11: 0x7C, 12: 0x39, 13: 0x5E, 14: 0x79, 15: 0x71
        }

    def set_code(self, code: str):
        # 1. Clean code: Remove comments and preprocessor/XC8 headers
        code = re.sub(r"//.*", "", code)
        code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
        code = re.sub(r"#include.*", "", code)
        code = re.sub(r"#pragma.*", "", code)
        code = re.sub(r"#define.*", "", code)
        # Handle delays: just strip them for now as they are handled by the frontend tick
        code = re.sub(r"__(delay|delay_ms|delay_us)\(.*?\);?", "", code)
        
        # 2. Extract parts
        # Identify main block
        main_match = re.search(r"void\s+main\s*\(\s*(?:void)?\s*\)\s*\{(.*)\}", code, re.DOTALL)
        main_content = main_match.group(1) if main_match else code
        
        # Extract while(1) loop
        while_match = re.search(r"while\s*\(\s*(1|true)\s*\)\s*\{(.*)\}", main_content, re.DOTALL)
        if while_match:
            loop_content = while_match.group(2)
            self.code_lines = self.tokenize_blocks(loop_content)
            # Init part is everything before the loop
            init_part = main_content[:while_match.start()]
        else:
            self.code_lines = []
            init_part = main_content
            
        # 3. Initializations
        self.vars = {}
        for line in self.tokenize_blocks(init_part):
            self.execute_block(line)

    def tokenize_blocks(self, code: str):
        blocks = []
        current = ""
        depth = 0
        i = 0
        while i < len(code):
            char = code[i]
            current += char
            if char == "{": depth += 1
            elif char == "}": depth -= 1
            
            # End of statement or block
            if depth == 0:
                if char == ";":
                    blocks.append(current.strip())
                    current = ""
                elif current.strip().endswith("}"):
                    # Check if it's an if/for/while that just ended
                    blocks.append(current.strip())
                    current = ""
            i += 1
        if current.strip(): blocks.append(current.strip())
        return [b for b in blocks if b]

    def execute_block(self, block: str):
        if not block: return
        
        # Handle FOR loops (simplistic: for(i=0; i<8; i++) { ... })
        for_match = re.match(r"^for\s*\((.*?);(.*?);(.*?)\)\s*\{(.*?)\}", block, re.DOTALL)
        if for_match:
            init, cond, post, body = for_match.groups()
            self.execute_block(init + ";")
            while self.evaluate_condition(cond):
                for sub in self.tokenize_blocks(body):
                    self.execute_block(sub)
                self.execute_block(post + ";")
            return

        # Handle printf / lcd_write for LCD
        printf_match = re.search(r'printf\s*\(\s*"(.*?)"\s*\)', block)
        if printf_match:
            self.registers["LCD_LINE1"] = printf_match.group(1)[:16]
            return

        lcd_write_match = re.search(r'lcd_write\s*\(\s*(\d)\s*,\s*"(.*?)"\s*\)', block)
        if lcd_write_match:
            line_num = lcd_write_match.group(1)
            text = lcd_write_match.group(2)[:16]
            self.registers[f"LCD_LINE{line_num}"] = text
            return

        # Handle IF / ELSE
        if_match = re.match(r"^if\s*\((.*?)\)\s*\{(.*?)\}(?:\s*else\s*\{(.*?)\})?", block, re.DOTALL)
        if if_match:
            condition, then_branch, else_branch = if_match.groups()
            if self.evaluate_condition(condition):
                for sub in self.tokenize_blocks(then_branch):
                    self.execute_block(sub)
            elif else_branch:
                for sub in self.tokenize_blocks(else_branch):
                    self.execute_block(sub)
            return

        # Handle Assignments
        assign_match = re.match(r"^(?:unsigned\s+char|char|int|unsigned\s+int|void)?\s*([\w.]+)\s*=\s*(.*?);?$", block)
        if assign_match:
            target = assign_match.group(1)
            expr = assign_match.group(2).rstrip(";")
            val = self.evaluate_expression(expr)
            
            # Bitwise direct: RD0 = 1 or PORTDbits.RD0 = 1
            bit_match = re.match(r"^(?:PORT[ABCDE]bits\.)?(R[ABCDE][0-7])$", target, re.I)
            if bit_match:
                bit_id = bit_match.group(1).upper()
                reg_name = "PORT" + bit_id[1]
                bit_index = int(bit_id[2])
                if val: self.registers[reg_name] |= (1 << bit_index)
                else: self.registers[reg_name] &= ~(1 << bit_index)
                return

            target_upper = target.upper()
            if target_upper in self.registers:
                self.registers[target_upper] = val & 0xFF
            else:
                self.vars[target] = val
            return

    def evaluate_expression(self, expr: str):
        # Replace XC8 bit names: RD0, RA5...
        for r in "ABCDE":
            for b in range(8):
                # Replace RA0, PORTAbits.RA0, etc.
                expr = re.sub(rf"\b(?:PORT{r}bits\.)?R{r}{b}\b", f"((PORT{r} >> {b}) & 1)", expr, flags=re.I)
        
        # Merge vars and registers for evaluation
        context = {**self.registers, **self.vars}
        # Sort keys to replace longer names first
        for sym in sorted(context.keys(), key=len, reverse=True):
            expr = re.sub(rf"\b{sym}\b", str(context[sym]), expr, flags=re.I)
        
        # Clean expression for Python eval
        expr = expr.replace("!", " not ").replace("&&", " and ").replace("||", " or ")
        
        try:
            # Allow basic operators and the seg function
            safe_context = {"seg": lambda x: self.SEG_MAP.get(x & 0xF, 0)}
            return int(eval(expr, {"__builtins__": {}}, safe_context))
        except:
            return 0

    def evaluate_condition(self, condition: str):
        return bool(self.evaluate_expression(condition))

    def step(self, inputs: dict):
        if inputs.get("type") == "RESET":
            self.__init__()
            return self.registers

        for reg, val in inputs.items():
            reg_up = reg.upper()
            if reg_up in self.registers:
                self.registers[reg_up] = val & 0xFF
        
        for block in self.code_lines:
            self.execute_block(block)
        
        return self.registers
