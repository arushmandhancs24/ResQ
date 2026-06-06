import re

FILE_PATH = "ERRORS_SOURCE_ONLY.md"

def main():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    out_lines = []
    err_counter = 1
    
    stats = {
        "CRITICAL": 0,
        "WARNING": 0,
        "INFO": 0,
    }

    for line in lines:
        if line.startswith("### ["):
            # It's an error block. e.g. ### [🟡 WARNING] TypeScript any abuse
            # We want: ### ERR-001 [🟡 WARNING] TypeScript any abuse
            # Check if it already has an ID
            if not re.match(r'^### ERR-\d{3}', line):
                err_id = f"ERR-{err_counter:03d}"
                err_counter += 1
                new_line = line.replace("### [", f"### {err_id} [")
                out_lines.append(new_line)
                
                if "CRITICAL" in new_line: stats["CRITICAL"] += 1
                elif "WARNING" in new_line: stats["WARNING"] += 1
                elif "INFO" in new_line: stats["INFO"] += 1
            else:
                out_lines.append(line)
                if "CRITICAL" in line: stats["CRITICAL"] += 1
                elif "WARNING" in line: stats["WARNING"] += 1
                elif "INFO" in line: stats["INFO"] += 1
        else:
            out_lines.append(line)

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(out_lines)

    total = err_counter - 1
    import sys
    out_str = f"Parsed {total} errors: 🔴 critical: {stats['CRITICAL']} | 🟡 warnings: {stats['WARNING']} | 🔵 info: {stats['INFO']}\n"
    sys.stdout.buffer.write(out_str.encode('utf-8'))

if __name__ == "__main__":
    main()
