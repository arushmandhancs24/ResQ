import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace all malformed equalities
    new_content = content.replace('=====', '===')
    new_content = new_content.replace('====', '===')
    new_content = new_content.replace('!==!', '!==')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

def main():
    root = "."
    for dirpath, dirnames, filenames in os.walk(root):
        if 'node_modules' in dirpath or '.git' in dirpath:
            continue
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx', '.js', '.jsx')):
                fix_file(os.path.join(dirpath, filename))

if __name__ == "__main__":
    main()
