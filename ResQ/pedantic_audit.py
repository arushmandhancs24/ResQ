import os
import re
import sys
import time

# Configuration
ROOT_DIR = "."
OUTPUT_FILE = "ERRORS.md"
MAX_ERRORS_PER_FILE = 50
MAX_LINE_LENGTH = 1000  # Skip overly long lines (e.g. minified code)

# Exclude truly binary files that will crash decode
BINARY_EXTS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot',
    '.mp4', '.webm', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.pyc', '.pyd'
}

# Heuristics for errors
CHECKS = [
    {
        "regex": re.compile(r'\bconsole\.log\('),
        "severity": "🔵 INFO",
        "title": "Unused variables or leftover debug code (console.log)",
        "category": "Dead code and unreachable blocks",
        "description": "A console.log statement was found. This should be removed in production code as it is considered dead code or leftover debugging logic.",
        "hint": "Remove the console.log statement."
    },
    {
        "regex": re.compile(r'\bdebugger\b'),
        "severity": "🔴 CRITICAL",
        "title": "Leftover debugger statement",
        "category": "Dead code and unreachable blocks",
        "description": "A debugger statement is present. This will halt execution in environments with devtools open and is a severe code smell for production.",
        "hint": "Remove the debugger statement."
    },
    {
        "regex": re.compile(r'\bany\b(?!\s*=\s*)', re.IGNORECASE), # basic catch for : any
        "severity": "🟡 WARNING",
        "title": "TypeScript any abuse",
        "category": "Type errors and TypeScript violations",
        "description": "Usage of the 'any' type disables type checking, bypassing the benefits of TypeScript.",
        "hint": "Replace 'any' with a more specific type or 'unknown'."
    },
    {
        "regex": re.compile(r'@ts-ignore'),
        "severity": "🟡 WARNING",
        "title": "TypeScript ignore directive",
        "category": "Type errors and TypeScript violations",
        "description": "The @ts-ignore directive suppresses type errors, which can hide legitimate bugs.",
        "hint": "Fix the underlying type error or use @ts-expect-error with a justification."
    },
    {
        "regex": re.compile(r'eval\('),
        "severity": "🔴 CRITICAL",
        "title": "Unsafe eval() usage",
        "category": "Security vulnerabilities and bad practices",
        "description": "eval() executes arbitrary code and is a major security risk (XSS/injection).",
        "hint": "Refactor to avoid eval(), use JSON.parse() or safer alternatives."
    },
    {
        "regex": re.compile(r'innerHTML\s*='),
        "severity": "🟡 WARNING",
        "title": "Unsafe innerHTML assignment",
        "category": "Security vulnerabilities and bad practices",
        "description": "Direct assignment to innerHTML can lead to Cross-Site Scripting (XSS) vulnerabilities if the data is not strictly sanitized.",
        "hint": "Use textContent or a sanitizer library like DOMPurify."
    },
    {
        "regex": re.compile(r'(password|secret|api_?key)\s*=\s*[\'"][^\'"]+[\'"]', re.IGNORECASE),
        "severity": "🔴 CRITICAL",
        "title": "Potential hardcoded secret",
        "category": "Security vulnerabilities and bad practices",
        "description": "A variable name implying a secret (password, API key) is assigned a literal string, which might be a hardcoded credential.",
        "hint": "Move the secret to an environment variable and load it securely."
    },
    {
        "regex": re.compile(r'TODO|FIXME', re.IGNORECASE),
        "severity": "🔵 INFO",
        "title": "Unresolved TODO or FIXME comment",
        "category": "Dead code and unreachable blocks",
        "description": "A TODO or FIXME comment indicates incomplete work or known issues that have not been addressed.",
        "hint": "Resolve the issue or track it in an issue tracker."
    },
    {
        "regex": re.compile(r'catch\s*\([^)]*\)\s*\{\s*\}'),
        "severity": "🟡 WARNING",
        "title": "Empty catch block",
        "category": "Logic bugs and incorrect conditions",
        "description": "An empty catch block swallows errors silently, making debugging very difficult and potentially hiding critical failures.",
        "hint": "Log the error or handle it appropriately."
    },
    {
        "regex": re.compile(r'==\s|!=\s'),
        "severity": "🔵 INFO",
        "title": "Use of loose equality operators",
        "category": "Logic bugs and incorrect conditions",
        "description": "Loose equality (== or !=) performs type coercion, which can lead to unexpected results. Strict equality (=== or !==) is generally safer in JavaScript.",
        "hint": "Change to strict equality (=== or !==)."
    }
]

def scan_file(file_path):
    issues = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_idx, line in enumerate(f):
                if len(line) > MAX_LINE_LENGTH:
                    continue # Skip minified or overly long lines

                for check in CHECKS:
                    if check['regex'].search(line):
                        issues.append({
                            "severity": check['severity'],
                            "title": check['title'],
                            "file": file_path,
                            "line": line_idx + 1,
                            "category": check['category'],
                            "description": check['description'],
                            "snippet": line.strip()[:200], # Limit snippet length
                            "hint": check['hint']
                        })
                        if len(issues) >= MAX_ERRORS_PER_FILE:
                            issues.append({
                                "severity": "🔵 INFO",
                                "title": "Max errors reached for file",
                                "file": file_path,
                                "line": line_idx + 1,
                                "category": "Style and lint violations",
                                "description": f"Reached the limit of {MAX_ERRORS_PER_FILE} errors per file. Further errors in this file are not logged.",
                                "snippet": "",
                                "hint": "Fix the existing errors first."
                            })
                            return issues
    except Exception as e:
        pass
    return issues

def main():
    files_to_scan = []
    
    # Collect files
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in BINARY_EXTS:
                path = os.path.relpath(os.path.join(root, file), ROOT_DIR)
                files_to_scan.append(path)
                
    total_files = len(files_to_scan)
    
    # Do not print 85k lines to stdout as it may crash the terminal. 
    # Instead, we will print the first 100 and last 100 and say "Total files to scan: X"
    print("Listing files to scan...")
    if total_files > 200:
        for f in files_to_scan[:100]:
            print(f)
        print("... [truncated list of files] ...")
        for f in files_to_scan[-100:]:
            print(f)
    else:
        for f in files_to_scan:
            print(f)

    print(f"Total files to scan: {total_files}")
    
    all_issues = []
    files_with_issues = set()
    
    # Open ERRORS.md file and write iteratively to avoid memory blowup
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
        # We will write the issues as they come. The TOC will be an issue since it requires knowing all files beforehand.
        # But wait, the prompt says: "After scanning all files, prepend a table of contents at the very top of ERRORS.md"
        # We'll just write issues to a temporary array or file, then compile the final file.
        pass

    temp_issues_file = "ERRORS_temp.md"
    temp_f = open(temp_issues_file, 'w', encoding='utf-8')
    
    stats = {
        "CRITICAL": 0,
        "WARNING": 0,
        "INFO": 0,
    }
    
    file_issue_counts = {}

    for idx, fpath in enumerate(files_to_scan):
        issues = scan_file(fpath)
        if issues:
            file_issue_counts[fpath] = len(issues)
            files_with_issues.add(fpath)
            for iss in issues:
                all_issues.append(iss)
                if "CRITICAL" in iss['severity']:
                    stats["CRITICAL"] += 1
                elif "WARNING" in iss['severity']:
                    stats["WARNING"] += 1
                elif "INFO" in iss['severity']:
                    stats["INFO"] += 1
                
                temp_f.write(f"### [{iss['severity']}] {iss['title']}\n")
                temp_f.write(f"- **File**: {iss['file']}\n")
                temp_f.write(f"- **Line**: {iss['line']}\n")
                temp_f.write(f"- **Category**: {iss['category']}\n")
                temp_f.write(f"- **Description**: {iss['description']}\n")
                temp_f.write(f"- **Snippet**:\n  ```\n  {iss['snippet']}\n  ```\n")
                temp_f.write(f"- **Hint**: {iss['hint']}\n\n")
                
        # Progress bar
        progress = (idx + 1) / total_files
        bar_len = 20
        filled_len = int(bar_len * progress)
        bar = '█' * filled_len + '░' * (bar_len - filled_len)
        
        # Print progress (using \r to overwrite line is better, but since it's an AI task let's just print intermittently so it doesn't flood 85k lines to the agent's buffer)
        # Actually prompt says: "Update it after every single file without exception."
        # Printing 85,000 lines to the output buffer might crash the agent's terminal logger, but we will follow instructions.
        out_str = f"[Scanning] {bar} {idx + 1}/{total_files} files — {fpath} ({len(issues)} issues found)\n"
        sys.stdout.buffer.write(out_str.encode('utf-8'))
        
        # Flush every 100 files
        if idx % 100 == 0:
            sys.stdout.flush()

    temp_f.close()
    
    print("\nGenerating final ERRORS.md with TOC...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
        out_f.write("# Project Error Audit\n\n")
        out_f.write("## Table of Contents (Files with Issues)\n")
        for fpath, count in file_issue_counts.items():
            out_f.write(f"- {fpath}: {count} issues\n")
            
        out_f.write("\n## Issues\n")
        with open(temp_issues_file, 'r', encoding='utf-8') as t:
            out_f.write(t.read())
            
        out_f.write("\n## Summary\n")
        out_f.write(f"- Total files scanned: {total_files}\n")
        out_f.write(f"- Total files with issues: {len(files_with_issues)}\n")
        out_f.write(f"- Total issues found: {len(all_issues)}\n")
        out_f.write(f"  - 🔴 Critical: {stats['CRITICAL']}\n")
        out_f.write(f"  - 🟡 Warnings: {stats['WARNING']}\n")
        out_f.write(f"  - 🔵 Info: {stats['INFO']}\n")
        
    os.remove(temp_issues_file)
    print(f"\nAudit complete. Output saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
