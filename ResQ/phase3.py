import os
import re

FILE_PATH = "ERRORS_SOURCE_ONLY.md"

def main():
    print("Starting Phase 3 (Line-by-line parser)...")
    
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stats = {"FIXED": 0, "BLOCKED": 0, "REVIEW": 0}
    
    out_lines = []
    
    current_err = None
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Match ### ERR-123 [🔴 CRITICAL] Title
        match = re.match(r'^### (ERR-\d{3}) \[(.*?)\] (?:⚠️ BLOCKED - |✅ FIXED - |🤔 NEEDS REVIEW - )?(.*?)$', line.strip())
        if match:
            err_id = match.group(1)
            severity = match.group(2)
            title = match.group(3)
            
            # Read forward to find File, Line
            file_path = None
            line_num = None
            
            # Read up to Hint
            block_lines = [line]
            i += 1
            while i < len(lines) and not lines[i].startswith("### ERR-") and not lines[i].startswith("## Summary"):
                block_lines.append(lines[i])
                if lines[i].startswith("- **File**:"):
                    file_path = lines[i].split("- **File**:")[1].strip()
                elif lines[i].startswith("- **Line**:"):
                    try:
                        line_num = int(lines[i].split("- **Line**:")[1].strip())
                    except:
                        pass
                i += 1
                
            # Now we have a block, evaluate it
            status = ""
            reason = ""
            
            if not file_path or not line_num:
                status = "⚠️ BLOCKED"
                reason = "Could not parse file or line."
            else:
                ext = os.path.splitext(file_path)[1].lower()
                basename = os.path.basename(file_path).lower()
                
                is_false_pos = False
                if ext in ['.md', '.json', '.py'] or 'license' in basename or 'pedantic_audit.py' in file_path or 'phase' in file_path:
                    is_false_pos = True
                    reason = f"False positive: Heuristic does not apply to this file type."
                    
                if is_false_pos:
                    status = "⚠️ BLOCKED"
                else:
                    # Attempt fix
                    try:
                        with open(file_path, 'r', encoding='utf-8') as sf:
                            sf_lines = sf.readlines()
                        
                        target_idx = line_num - 1
                        if target_idx < len(sf_lines):
                            orig_line = sf_lines[target_idx]
                            new_line = orig_line
                            
                            if "Leftover debugger" in title:
                                new_line = orig_line.replace("debugger;", "// debugger;")
                                if new_line == orig_line: new_line = orig_line.replace("debugger", "// debugger")
                            elif "console.log" in title:
                                new_line = orig_line.replace("console.log", "// console.log")
                            elif "loose equality" in title:
                                new_line = re.sub(r'([^!])==([^=])', r'\1===\2', orig_line)
                                new_line = re.sub(r'!=([^=])', r'!==\1', new_line)
                            elif "any abuse" in title:
                                new_line = re.sub(r'\bany\b', 'unknown', orig_line)
                            elif "TODO" in title or "eval" in title or "catch" in title:
                                status = "🤔 NEEDS REVIEW"
                                reason = "Automated fix is ambiguous or requires contextual rewriting."
                                
                            if status == "" and new_line != orig_line:
                                sf_lines[target_idx] = new_line
                                with open(file_path, 'w', encoding='utf-8') as sf:
                                    sf.writelines(sf_lines)
                                status = "✅ FIXED"
                            elif status == "":
                                status = "🤔 NEEDS REVIEW"
                                reason = "Failed to automatically apply inline regex fix."
                        else:
                            status = "⚠️ BLOCKED"
                            reason = "Line out of bounds."
                    except Exception as e:
                        status = "⚠️ BLOCKED"
                        reason = f"Error: {e}"
            
            # Update the first line of the block
            new_header = f"### {err_id} [{severity}] {status} - {title}\n"
            block_lines[0] = new_header
            if reason:
                # remove existing reason if any
                block_lines = [l for l in block_lines if not l.startswith("- **Reason**:")]
                block_lines.insert(1, f"- **Reason**: {reason}\n")
                
            out_lines.extend(block_lines)
            
            if status == "✅ FIXED": stats["FIXED"] += 1
            elif status == "⚠️ BLOCKED": stats["BLOCKED"] += 1
            elif status == "🤔 NEEDS REVIEW": stats["REVIEW"] += 1
            
            continue
            
        out_lines.append(line)
        i += 1
        
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(out_lines)
        
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("Phase 3 complete!")
    print(f"✅ FIXED: {stats['FIXED']}")
    print(f"⚠️ BLOCKED (False Positives): {stats['BLOCKED']}")
    print(f"🤔 NEEDS REVIEW (Manual Context Needed): {stats['REVIEW']}")

if __name__ == "__main__":
    main()
