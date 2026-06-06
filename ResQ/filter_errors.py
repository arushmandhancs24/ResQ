import os
import re

INPUT_FILE = "ERRORS.md"
OUTPUT_FILE = "ERRORS_SOURCE_ONLY.md"

IGNORE_PATTERNS = [
    r'node_modules[\\/]',
    r'\.vite[\\/]',
    r'dist[\\/]',
    r'build[\\/]',
    r'\.cache[\\/]',
    r'site-packages[\\/]',
    r'venv[\\/]',
    r'\.git[\\/]'
]

def main():
    print(f"Reading {INPUT_FILE} and filtering...")
    
    ignore_regex = re.compile('|'.join(IGNORE_PATTERNS), re.IGNORECASE)
    
    filtered_blocks = []
    current_block = []
    keep_current_block = True
    in_issues_section = False
    
    stats = {
        "CRITICAL": 0,
        "WARNING": 0,
        "INFO": 0,
    }
    
    with open(INPUT_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if line.startswith("## Issues"):
                in_issues_section = True
                continue
            
            if line.startswith("## Summary"):
                break
                
            if in_issues_section:
                if line.startswith("### ["):
                    # Process previous block
                    if current_block and keep_current_block:
                        filtered_blocks.append("".join(current_block))
                        
                        header = current_block[0]
                        if "CRITICAL" in header: stats["CRITICAL"] += 1
                        elif "WARNING" in header: stats["WARNING"] += 1
                        elif "INFO" in header: stats["INFO"] += 1

                    # Start new block
                    current_block = [line]
                    keep_current_block = True
                else:
                    if current_block:
                        current_block.append(line)
                        if line.startswith("- **File**:"):
                            filepath = line.split("- **File**:")[1].strip()
                            if ignore_regex.search(filepath):
                                keep_current_block = False
                                
        # Don't forget the last block
        if current_block and keep_current_block:
            filtered_blocks.append("".join(current_block))
            header = current_block[0]
            if "CRITICAL" in header: stats["CRITICAL"] += 1
            elif "WARNING" in header: stats["WARNING"] += 1
            elif "INFO" in header: stats["INFO"] += 1

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
        out_f.write("# Project Error Audit - SOURCE ONLY\n\n")
        out_f.write("## Issues\n")
        for block in filtered_blocks:
            out_f.write(block)
            out_f.write("\n")
            
        out_f.write("\n## Summary\n")
        out_f.write(f"- Total source issues found: {len(filtered_blocks)}\n")
        out_f.write(f"  - 🔴 Critical: {stats['CRITICAL']}\n")
        out_f.write(f"  - 🟡 Warnings: {stats['WARNING']}\n")
        out_f.write(f"  - 🔵 Info: {stats['INFO']}\n")

    print(f"Filtered down to {len(filtered_blocks)} source code issues.")
    print(f"Output written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
