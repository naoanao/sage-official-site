import os
import shutil

def main():
    src_dir = "notion_lectures"
    flat_dir = "notion_lectures_flat"
    combined_file = "NotebookLM_全講座まとめ.md"
    
    if os.path.exists(flat_dir):
        shutil.rmtree(flat_dir)
    os.makedirs(flat_dir)
    
    combined_content = "# 全講座まとめ\n\n"
    
    # Walk through the directory
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                
                # Create a prefix based on the folder name if it's not the root
                rel_dir = os.path.relpath(root, src_dir)
                if rel_dir == ".":
                    prefix = ""
                else:
                    prefix = rel_dir.replace(os.sep, "_") + "_"
                    
                new_filename = f"{prefix}{file}"
                
                # If file is Index.md, rename it to the folder name
                if file.lower() == "index.md":
                    if rel_dir != ".":
                        new_filename = f"{rel_dir.replace(os.sep, '_')}.md"
                    else:
                        new_filename = "トップページ.md"
                
                flat_file_path = os.path.join(flat_dir, new_filename)
                
                # Copy the file to the flat directory
                shutil.copy2(file_path, flat_file_path)
                
                # Append to the combined file
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                combined_content += f"\n\n---\n\n## {new_filename.replace('.md', '')}\n\n"
                combined_content += content

    # Write the combined file
    with open(combined_file, "w", encoding="utf-8") as f:
        f.write(combined_content)
        
    print(f"Created flat directory: {flat_dir}")
    print(f"Created combined file: {combined_file}")

if __name__ == "__main__":
    main()
