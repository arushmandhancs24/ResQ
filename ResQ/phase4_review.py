import os
import re

FILE_PATH = "ERRORS_SOURCE_ONLY.md"

def main():
    print("Fixing remaining NEEDS REVIEW items...")
    
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out_lines = []
    i = 0
    
    fixed_count = 0
    resolved_count = 0
    
    while i < len(lines):
        line = lines[i]
        
        match = re.match(r'^### (ERR-\d{3}) \[(.*?)\] 🤔 NEEDS REVIEW - (.*?)$', line.strip())
        if match:
            err_id = match.group(1)
            severity = match.group(2)
            title = match.group(3)
            
            block_lines = [line]
            file_path = None
            line_num = None
            
            i += 1
            while i < len(lines) and not lines[i].startswith("### ERR-") and not lines[i].startswith("## Summary"):
                block_lines.append(lines[i])
                if lines[i].startswith("- **File**:"):
                    file_path = lines[i].split("- **File**:")[1].strip()
                elif lines[i].startswith("- **Line**:"):
                    try: line_num = int(lines[i].split("- **Line**:")[1].strip())
                    except: pass
                i += 1
                
            status = "🤔 NEEDS REVIEW"
            reason = "Failed to fix."
            
            if file_path and line_num:
                try:
                    with open(file_path, 'r', encoding='utf-8') as sf:
                        sf_lines = sf.readlines()
                    
                    target_idx = line_num - 1
                    if target_idx < len(sf_lines):
                        orig_line = sf_lines[target_idx]
                        new_line = orig_line
                        
                        if "loose equality" in title:
                            if "===" in orig_line or "!==" in orig_line:
                                status = "✅ AUTO-RESOLVED"
                                reason = "Already strictly equal. The original audit script incorrectly matched ===."
                                resolved_count += 1
                        
                        elif "Empty catch block" in title:
                            # match catch(...) { } or catch { }
                            new_line = re.sub(r'catch\s*\((.*?)\)\s*\{\s*\}', r'catch (\1) { console.error(\1); }', orig_line)
                            new_line = re.sub(r'catch\s*\{\s*\}', r'catch { console.error("Error caught"); }', new_line)
                            if new_line != orig_line:
                                status = "✅ FIXED"
                        
                        elif "any abuse" in title:
                            # aggressively replace any with unknown
                            new_line = re.sub(r'\bany\b', 'unknown', orig_line, flags=re.IGNORECASE)
                            if new_line != orig_line:
                                status = "✅ FIXED"
                            else:
                                status = "⚠️ BLOCKED"
                                reason = "Regex could not find 'any' boundary to replace."
                                
                        if status == "✅ FIXED":
                            sf_lines[target_idx] = new_line
                            with open(file_path, 'w', encoding='utf-8') as sf:
                                sf.writelines(sf_lines)
                            fixed_count += 1
                except Exception as e:
                    pass
            
            new_header = f"### {err_id} [{severity}] {status} - {title}\n"
            block_lines[0] = new_header
            
            # Update reason
            if status != "🤔 NEEDS REVIEW":
                block_lines = [l for l in block_lines if not l.startswith("- **Reason**:")]
                if reason:
                    block_lines.insert(1, f"- **Reason**: {reason}\n")
                    
            out_lines.extend(block_lines)
            continue
            
        out_lines.append(line)
        i += 1
        
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(out_lines)
        
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print(f"Fixed: {fixed_count}")
    print(f"Auto-Resolved (False Positives): {resolved_count}")

if __name__ == "__main__":
    main()
